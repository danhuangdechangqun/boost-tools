// 用户反馈分析逻辑Hook - 使用动态提示词

import { useState, useCallback, useEffect } from 'react';
import { callLlm } from '@/services/llm';
import { Feedback, FeedbackGroup, AnalysisResult, FeedbackType, EmotionType, Priority } from '../types';
import { promptService } from '@/services/promptService';
import { v4 as uuidv4 } from 'uuid';

export function useAnalysis() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Record<string, string>>({});

  // 加载提示词
  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const analysisPrompt = await promptService.get('feedback_analysis');
      const mergePrompt = await promptService.get('feedback_merge');
      setPrompts({
        analysis: analysisPrompt?.template || '',
        merge: mergePrompt?.template || ''
      });
    } catch (e) {
      console.error('加载提示词失败:', e);
    }
  };

  // 分析单条反馈
  const analyzeSingleFeedback = useCallback(async (content: string): Promise<Partial<Feedback>> => {
    if (!prompts.analysis) {
      throw new Error('提示词未加载');
    }

    const prompt = promptService.render(prompts.analysis, { content });
    const response = await callLlm(prompt);

    if (!response.success || !response.content) {
      throw new Error(response.error || '分析失败');
    }

    // 提取JSON
    let jsonStr = response.content;
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('JSON解析失败:', jsonStr);
      throw new Error('AI返回格式错误');
    }
  }, [prompts.analysis]);

  // 分析多条反馈
  const analyzeFeedbacks = useCallback(async (contents: string[]): Promise<Feedback[]> => {
    const feedbacks: Feedback[] = [];
    const total = contents.length;

    for (let i = 0; i < contents.length; i++) {
      setProgress({ current: i + 1, total });

      const content = contents[i].trim();
      if (!content) continue;

      try {
        const analysis = await analyzeSingleFeedback(content);

        feedbacks.push({
          id: `REQ-${String(i + 1).padStart(3, '0')}`,
          originalContent: content,
          type: (analysis.type || '功能建议') as FeedbackType,
          emotion: (analysis.emotion || '中性') as EmotionType,
          coreNeed: analysis.coreNeed || '',
          productRequirement: analysis.productRequirement || '',
          priority: (analysis.priority || 'P2') as Priority,
          priorityReason: analysis.priorityReason || '',
          suggestedSolution: analysis.suggestedSolution || '',
        });
      } catch (e: any) {
        console.error(`分析第${i + 1}条反馈失败:`, e);
        // 失败时添加原始数据
        feedbacks.push({
          id: `REQ-${String(i + 1).padStart(3, '0')}`,
          originalContent: content,
          type: '功能建议',
          emotion: '中性',
          coreNeed: '分析失败',
          productRequirement: '',
          priority: 'P3',
          priorityReason: 'AI分析失败',
          suggestedSolution: '',
        });
      }
    }

    return feedbacks;
  }, [analyzeSingleFeedback]);

  // 合并相似反馈
  const mergeSimilarFeedbacks = useCallback(async (feedbacks: Feedback[]): Promise<FeedbackGroup[]> => {
    if (feedbacks.length < 2 || !prompts.merge) return [];

    const feedbackListStr = JSON.stringify(feedbacks.map(f => ({
      id: f.id,
      content: f.originalContent,
      type: f.type
    })));

    const prompt = promptService.render(prompts.merge, { feedbackList: feedbackListStr });
    const response = await callLlm(prompt);

    if (!response.success || !response.content) {
      return [];
    }

    try {
      let jsonStr = response.content;
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      const result = JSON.parse(jsonStr);

      return (result.groups || []).map((g: any, index: number) => ({
        id: `group-${index}`,
        name: g.groupName,
        feedbackIds: g.feedbackIds || [],
        mergedRequirement: g.mergedRequirement || '',
        totalCount: (g.feedbackIds || []).length,
        combinedPriority: g.combinedPriority || 'P2',
      }));
    } catch (e) {
      console.error('合并分析JSON解析失败:', e);
      return [];
    }
  }, [prompts.merge]);

  // 完整分析流程
  const analyze = useCallback(async (contents: string[]) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress({ current: 0, total: contents.length });

    try {
      // 1. 分析每条反馈
      const feedbacks = await analyzeFeedbacks(contents);

      // 2. 合并相似反馈
      const groups = await mergeSimilarFeedbacks(feedbacks);

      // 3. 更新反馈的分组信息
      const updatedFeedbacks = feedbacks.map(f => {
        const group = groups.find(g => g.feedbackIds.includes(f.id));
        if (group) {
          return {
            ...f,
            groupId: group.id,
            groupName: group.name,
            groupCount: group.totalCount,
          };
        }
        return f;
      });

      // 4. 统计
      const typeStats = {} as Record<FeedbackType, number>;
      const emotionStats = {} as Record<EmotionType, number>;
      const priorityStats = {} as Record<Priority, number>;

      updatedFeedbacks.forEach(f => {
        typeStats[f.type] = (typeStats[f.type] || 0) + 1;
        emotionStats[f.emotion] = (emotionStats[f.emotion] || 0) + 1;
        priorityStats[f.priority] = (priorityStats[f.priority] || 0) + 1;
      });

      setResult({
        feedbacks: updatedFeedbacks,
        groups,
        typeStats,
        emotionStats,
        priorityStats,
      });
    } catch (e: any) {
      setError(e.message || '分析失败');
    } finally {
      setLoading(false);
    }
  }, [analyzeFeedbacks, mergeSimilarFeedbacks]);

  // 重置
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress({ current: 0, total: 0 });
  }, []);

  return {
    loading,
    progress,
    result,
    error,
    analyze,
    reset,
    reloadPrompts: loadPrompts,
  };
}