// 导出逻辑Hook

import { useState, useCallback, useEffect } from 'react';
import { Feedback, ExportField, ExportConfig, DEFAULT_EXPORT_FIELDS } from '../types';
import { storage } from '@/services/storage';

const EXPORT_CONFIG_KEY = 'feedback-export-config';

export function useExport() {
  const [fields, setFields] = useState<ExportField[]>(DEFAULT_EXPORT_FIELDS);

  // 加载保存的配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig = await storage.read<ExportConfig>(EXPORT_CONFIG_KEY);
        if (savedConfig?.fields) {
          // 合并保存的字段和默认字段（处理新增的默认字段）
          const savedKeys = new Set(savedConfig.fields.map(f => f.key));
          const newDefaultFields = DEFAULT_EXPORT_FIELDS.filter(f => !savedKeys.has(f.key));
          setFields([...savedConfig.fields, ...newDefaultFields]);
        }
      } catch (e) {
        console.error('加载导出配置失败:', e);
      }
    };
    loadConfig();
  }, []);

  // 保存配置
  const saveExportConfig = useCallback(async (newFields: ExportField[]) => {
    try {
      await storage.write(EXPORT_CONFIG_KEY, {
        fields: newFields,
        savedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('保存导出配置失败:', e);
    }
  }, []);

  // 更新字段配置
  const updateField = useCallback((key: string, updates: Partial<ExportField>) => {
    setFields(prev => {
      const newFields = prev.map(f => f.key === key ? { ...f, ...updates } : f);
      saveExportConfig(newFields);
      return newFields;
    });
  }, [saveExportConfig]);

  // 添加自定义字段
  const addCustomField = useCallback((field: Omit<ExportField, 'isCustom' | 'enabled'>) => {
    const newField: ExportField = {
      ...field,
      isCustom: true,
      enabled: true,
    };
    setFields(prev => {
      const newFields = [...prev, newField];
      saveExportConfig(newFields);
      return newFields;
    });
  }, [saveExportConfig]);

  // 删除自定义字段
  const removeCustomField = useCallback((key: string) => {
    setFields(prev => {
      const newFields = prev.filter(f => f.key !== key);
      saveExportConfig(newFields);
      return newFields;
    });
  }, [saveExportConfig]);

  // 获取字段值
  const getFieldValue = useCallback((feedback: Feedback, key: string): string => {
    const value = (feedback as any)[key];
    if (value !== undefined && value !== null) {
      return String(value);
    }
    // 查找自定义字段的默认值
    const field = fields.find(f => f.key === key);
    return field?.customValue || '';
  }, [fields]);

  // 导出为Excel格式（CSV）
  const exportToCSV = useCallback((feedbacks: Feedback[]): string => {
    const enabledFields = fields.filter(f => f.enabled);

    // 表头
    const headers = enabledFields.map(f => f.label).join(',');

    // 数据行
    const rows = feedbacks.map(f => {
      return enabledFields.map(field => {
        const value = getFieldValue(f, field.key);
        // 处理包含逗号或换行的值
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    return [headers, ...rows].join('\n');
  }, [fields, getFieldValue]);

  // 导出为Markdown格式
  const exportToMarkdown = useCallback((feedbacks: Feedback[]): string => {
    const enabledFields = fields.filter(f => f.enabled);

    let md = '# 用户反馈分析报告\n\n';
    md += `生成时间：${new Date().toLocaleString()}\n\n`;
    md += `---\n\n`;

    // 按优先级分组
    const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const sortedFeedbacks = [...feedbacks].sort((a, b) =>
      (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99)
    );

    sortedFeedbacks.forEach(f => {
      md += `## ${f.id}: ${f.coreNeed || f.originalContent.slice(0, 30)}\n\n`;
      enabledFields.forEach(field => {
        if (field.key !== 'id') {
          const value = getFieldValue(f, field.key);
          if (value) {
            md += `**${field.label}**：${value}\n\n`;
          }
        }
      });
      md += '---\n\n';
    });

    return md;
  }, [fields, getFieldValue]);

  // 导出为需求卡片格式
  const exportToCards = useCallback((feedbacks: Feedback[]): string => {
    let md = '# 需求卡片\n\n';
    md += `生成时间：${new Date().toLocaleString()}\n\n`;
    md += '---\n\n';

    // 按分组输出
    const groupedFeedbacks = new Map<string, Feedback[]>();
    const ungroupedFeedbacks: Feedback[] = [];

    feedbacks.forEach(f => {
      if (f.groupId && f.groupName) {
        if (!groupedFeedbacks.has(f.groupId)) {
          groupedFeedbacks.set(f.groupId, []);
        }
        groupedFeedbacks.get(f.groupId)!.push(f);
      } else {
        ungroupedFeedbacks.push(f);
      }
    });

    // 输出分组卡片
    groupedFeedbacks.forEach((groupFeedbacks, groupId) => {
      const first = groupFeedbacks[0];
      md += `## 【需求卡片】${first.groupName}\n\n`;
      md += `**需求类型**：${first.type}\n\n`;
      md += `**优先级**：${first.priority}\n\n`;
      md += `**来源**：用户反馈（${groupFeedbacks.length}条相似）\n\n`;
      md += `**用户原文**：\n`;
      groupFeedbacks.forEach(f => {
        md += `- ${f.id}: "${f.originalContent}"\n`;
      });
      md += '\n';
      md += `**产品需求描述**：\n${first.productRequirement}\n\n`;
      md += `**建议方案**：\n${first.suggestedSolution}\n\n`;
      md += '---\n\n';
    });

    // 输出未分组卡片
    ungroupedFeedbacks.forEach(f => {
      md += `## 【需求卡片】${f.coreNeed || f.originalContent.slice(0, 20)}\n\n`;
      md += `**需求类型**：${f.type}\n\n`;
      md += `**优先级**：${f.priority}\n\n`;
      md += `**来源**：用户反馈\n\n`;
      md += `**用户原文**："${f.originalContent}"\n\n`;
      md += `**产品需求描述**：\n${f.productRequirement}\n\n`;
      if (f.suggestedSolution) {
        md += `**建议方案**：\n${f.suggestedSolution}\n\n`;
      }
      md += '---\n\n';
    });

    return md;
  }, []);

  // 下载文件
  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // 导出Excel
  const exportExcel = useCallback((feedbacks: Feedback[], filename?: string) => {
    const csv = exportToCSV(feedbacks);
    // 添加BOM以支持中文
    const bom = '\uFEFF';
    downloadFile(bom + csv, filename || `反馈分析_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8');
  }, [exportToCSV, downloadFile]);

  // 导出Markdown
  const exportMarkdown = useCallback((feedbacks: Feedback[], filename?: string) => {
    const md = exportToMarkdown(feedbacks);
    downloadFile(md, filename || `反馈分析_${new Date().toISOString().slice(0,10)}.md`, 'text/markdown;charset=utf-8');
  }, [exportToMarkdown, downloadFile]);

  // 导出需求卡片
  const exportCards = useCallback((feedbacks: Feedback[], filename?: string) => {
    const md = exportToCards(feedbacks);
    downloadFile(md, filename || `需求卡片_${new Date().toISOString().slice(0,10)}.md`, 'text/markdown;charset=utf-8');
  }, [exportToCards, downloadFile]);

  return {
    fields,
    updateField,
    addCustomField,
    removeCustomField,
    getFieldValue,
    exportExcel,
    exportMarkdown,
    exportCards,
  };
}