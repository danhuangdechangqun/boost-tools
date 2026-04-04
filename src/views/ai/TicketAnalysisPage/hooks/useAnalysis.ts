// 工单数据分析逻辑Hook - 使用动态提示词

import { useState, useCallback, useEffect } from 'react';
import { callLlm } from '@/services/api';
import { Ticket, NormalizationMap, AnalysisResult, FieldMapping, STANDARD_FIELDS } from '../types';
import { promptService } from '@/services/promptService';
import { v4 as uuidv4 } from 'uuid';

export function useAnalysis() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping[]>([]);
  const [prompts, setPrompts] = useState<Record<string, string>>({});

  // 加载提示词
  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const cleanPrompt = await promptService.get('ticket_clean');
      const rootCausePrompt = await promptService.get('ticket_root_cause');
      setPrompts({
        clean: cleanPrompt?.template || '',
        rootCause: rootCausePrompt?.template || ''
      });
    } catch (e) {
      console.error('加载提示词失败:', e);
    }
  };

  // 自动识别字段映射
  const autoDetectFields = useCallback((headers: string[], sampleData: Record<string, any>[]): FieldMapping[] => {
    const mappings: FieldMapping[] = [];

    headers.forEach(header => {
      const lowerHeader = header.toLowerCase();
      let bestMatch: string | null = null;
      let bestScore = 0;

      STANDARD_FIELDS.forEach(field => {
        const score = field.keywords.reduce((acc, keyword) => {
          if (lowerHeader.includes(keyword.toLowerCase())) {
            return acc + 1;
          }
          return acc;
        }, 0);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = field.key;
        }
      });

      // 获取示例值
      const sampleValues = sampleData
        .slice(0, 3)
        .map(row => String(row[header] || '').slice(0, 50))
        .filter(v => v);

      mappings.push({
        originalKey: header,
        mappedTo: bestMatch || header,
        sampleValues,
      });
    });

    return mappings;
  }, []);

  // 清洗数据
  const cleanData = useCallback(async (tickets: Ticket[]): Promise<{ cleanedData: Ticket[], normalizationMap: NormalizationMap }> => {
    if (tickets.length === 0 || !prompts.clean) {
      return { cleanedData: [], normalizationMap: {} };
    }

    // 准备数据给AI
    const ticketData = tickets.slice(0, 50).map(t => ({
      id: t.id,
      reason: t.originalReason,
      note: t.note,
    }));

    const prompt = promptService.render(prompts.clean, { ticketData: JSON.stringify(ticketData, null, 2) });

    try {
      const response = await callLlm(prompt);

      let jsonStr = response;
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      const aiResult = JSON.parse(jsonStr);

      // 合并AI结果到tickets
      const cleanedData = tickets.map((ticket, index) => {
        const aiData = aiResult.cleanedData?.find((d: any) => d.id === ticket.id) || aiResult.cleanedData?.[index];
        return {
          ...ticket,
          normalizedReason: aiData?.normalizedReason || ticket.originalReason,
          keyInfo: aiData?.keyInfoFromNote || '',
          category: aiData?.category || '',
        };
      });

      return {
        cleanedData,
        normalizationMap: aiResult.normalizationMap || {},
      };
    } catch (e) {
      console.error('数据清洗失败:', e);
      return { cleanedData: tickets, normalizationMap: {} };
    }
  }, [prompts.clean]);

  // 计算统计数据
  const calculateStatistics = useCallback((tickets: Ticket[]) => {
    const reasonDistribution: Record<string, number> = {};
    const businessDistribution: Record<string, number> = {};
    const trendMap: Record<string, number> = {};

    tickets.forEach(ticket => {
      // 故障原因分布
      const reason = ticket.normalizedReason || ticket.originalReason || '未知';
      reasonDistribution[reason] = (reasonDistribution[reason] || 0) + 1;

      // 业务分布
      if (ticket.businessType) {
        businessDistribution[ticket.businessType] = (businessDistribution[ticket.businessType] || 0) + 1;
      }

      // 时间趋势
      if (ticket.timestamp) {
        const date = ticket.timestamp.split(' ')[0] || ticket.timestamp;
        trendMap[date] = (trendMap[date] || 0) + 1;
      }
    });

    const trendData = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return { reasonDistribution, businessDistribution, trendData };
  }, []);

  // 根因分析
  const analyzeRootCause = useCallback(async (statistics: {
    reasonDistribution: Record<string, number>;
    businessDistribution: Record<string, number>;
  }): Promise<{ coreFindings: string[]; rootCauses: string[]; suggestions: string[]; actionPlan: string[] }> => {
    if (!prompts.rootCause) {
      return {
        coreFindings: ['提示词未加载'],
        rootCauses: [],
        suggestions: [],
        actionPlan: [],
      };
    }

    const prompt = promptService.render(prompts.rootCause, { statistics: JSON.stringify(statistics, null, 2) });

    try {
      const response = await callLlm(prompt);

      let jsonStr = response;
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('根因分析失败:', e);
      return {
        coreFindings: ['分析失败'],
        rootCauses: [],
        suggestions: [],
        actionPlan: [],
      };
    }
  }, [prompts.rootCause]);

  // 完整分析流程
  const analyze = useCallback(async (rawData: Record<string, any>[], mapping: FieldMapping[]) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress({ current: 0, total: 3, stage: '准备数据' });

    try {
      // 1. 转换数据格式
      setProgress({ current: 1, total: 3, stage: '转换数据格式' });
      const tickets: Ticket[] = rawData.map((row, index) => {
        const ticket: Ticket = {
          id: String(row['id'] || row['工单号'] || row['编号'] || index + 1),
          originalData: row,
        };

        mapping.forEach(m => {
          const value = row[m.originalKey];
          if (value !== undefined && value !== null) {
            switch (m.mappedTo) {
              case 'businessType':
                ticket.businessType = String(value);
                break;
              case 'reason':
                ticket.originalReason = String(value);
                break;
              case 'note':
                ticket.note = String(value);
                break;
              case 'timestamp':
                ticket.timestamp = String(value);
                break;
            }
          }
        });

        return ticket;
      });

      // 2. 数据清洗
      setProgress({ current: 2, total: 3, stage: 'AI数据清洗' });
      const { cleanedData, normalizationMap } = await cleanData(tickets);

      // 3. 统计分析
      setProgress({ current: 3, total: 3, stage: '统计分析和根因分析' });
      const { reasonDistribution, businessDistribution, trendData } = calculateStatistics(cleanedData);

      // 4. 根因分析
      const { coreFindings, rootCauses, suggestions, actionPlan } = await analyzeRootCause({
        reasonDistribution,
        businessDistribution,
      });

      setResult({
        tickets: cleanedData,
        normalizationMap,
        reasonDistribution,
        businessDistribution,
        trendData,
        coreFindings,
        rootCauses,
        suggestions,
        actionPlan,
      });
    } catch (e: any) {
      setError(e.message || '分析失败');
    } finally {
      setLoading(false);
    }
  }, [cleanData, calculateStatistics, analyzeRootCause]);

  // 重置
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress({ current: 0, total: 0, stage: '' });
    setFieldMapping([]);
  }, []);

  return {
    loading,
    progress,
    result,
    error,
    fieldMapping,
    autoDetectFields,
    setFieldMapping,
    analyze,
    reset,
    reloadPrompts: loadPrompts,
  };
}