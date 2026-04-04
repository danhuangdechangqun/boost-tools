// 使用动态提示词的Hook

import { useState, useEffect, useCallback } from 'react';
import { promptService, PromptDefinition } from '@/services/promptService';

export function usePrompt(promptId: string) {
  const [prompt, setPrompt] = useState<PromptDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrompt();
  }, [promptId]);

  const loadPrompt = async () => {
    setLoading(true);
    try {
      const data = await promptService.get(promptId);
      setPrompt(data || null);
    } catch (e) {
      console.error('加载提示词失败:', e);
    } finally {
      setLoading(false);
    }
  };

  // 渲染提示词（替换变量）
  const render = useCallback((variables: Record<string, string>): string => {
    if (!prompt) return '';
    return promptService.render(prompt.template, variables);
  }, [prompt]);

  return {
    prompt,
    loading,
    render,
    reload: loadPrompt
  };
}