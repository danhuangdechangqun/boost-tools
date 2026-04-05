// 规划器 Hook - 分解复杂任务为步骤列表

import { useState, useCallback } from 'react';
import { callLlm } from '@/services/api';
import { promptService } from '@/services/promptService';
import { IntentType, TOOL_REGISTRY } from '../types';
import {
  ExecutionStep,
  PlanningDecision,
  PlanningResult,
  AgentConfig,
  DEFAULT_AGENT_CONFIG
} from '../agentTypes';

// 生成步骤ID
function generateStepId(index: number): string {
  return `step_${index + 1}`;
}

export function usePlanner(config: AgentConfig = DEFAULT_AGENT_CONFIG) {
  const [loading, setLoading] = useState(false);

  // 判断是否需要规划
  const shouldPlan = useCallback(async (userInput: string): Promise<PlanningDecision> => {
    // 快速判断规则（不调用LLM）
    const quickDecision = quickShouldPlan(userInput);
    if (quickDecision.needsPlanning === false) {
      return quickDecision;
    }

    // 调用LLM判断
    try {
      const promptTemplate = await promptService.get('agent_should_plan');
      if (!promptTemplate) {
        return quickDecision;
      }

      const toolList = Object.entries(TOOL_REGISTRY)
        .filter(([key]) => key !== 'unknown')
        .map(([key, val]) => `- ${key}: ${val.name}`)
        .join('\n');

      const prompt = promptService.render(promptTemplate.template, {
        user_input: userInput,
        tool_list: toolList
      });

      const response = await callLlm(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as PlanningDecision;
        return result;
      }

      return quickDecision;
    } catch (error) {
      console.error('规划判断失败:', error);
      return quickDecision;
    }
  }, []);

  // 执行规划
  const plan = useCallback(async (
    userInput: string,
    existingParams?: Record<string, any>
  ): Promise<PlanningResult> => {
    setLoading(true);

    try {
      const promptTemplate = await promptService.get('agent_planning');
      if (!promptTemplate) {
        // 无提示词，返回简单计划
        return createSimplePlan(userInput, existingParams);
      }

      const toolList = Object.entries(TOOL_REGISTRY)
        .filter(([key]) => key !== 'unknown')
        .map(([key, val]) => `- ${key}: ${val.name} (${val.keywords.join(', ')})`)
        .join('\n');

      const prompt = promptService.render(promptTemplate.template, {
        user_query: userInput,
        tool_list: toolList
      });

      const response = await callLlm(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const rawResult = JSON.parse(jsonMatch[0]);

        // 转换为标准格式
        const steps: ExecutionStep[] = rawResult.steps.map((s: any, i: number) => ({
          id: generateStepId(i),
          description: s.description,
          intent: s.tool as IntentType || undefined,
          toolCall: s.tool ? {
            tool: s.tool as IntentType,
            params: s.params || {}
          } : undefined,
          retryCount: 0,
          status: 'pending'
        }));

        return {
          steps,
          estimatedComplexity: rawResult.estimatedComplexity || 'medium',
          requiresReflection: rawResult.requiresReflection ?? true
        };
      }

      return createSimplePlan(userInput, existingParams);
    } catch (error) {
      console.error('规划失败:', error);
      return createSimplePlan(userInput, existingParams);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    shouldPlan,
    plan
  };
}

// 快速判断是否需要规划（不调用LLM）
function quickShouldPlan(input: string): PlanningDecision {
  const lowerInput = input.toLowerCase();

  // 检测多行待办任务
  const lines = input.split('\n').filter(l => l.trim());
  const todoKeywords = ['待办', '今日待办', '明日待办', '明天待办', '下周计划', '下周待办', 'todo'];

  if (lines.length >= 2) {
    // 统计有多少行包含待办关键词
    const todoLines = lines.filter(line =>
      todoKeywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()))
    );

    if (todoLines.length >= 2) {
      return {
        needsPlanning: true,
        reason: `用户输入包含${todoLines.length}个待办任务`,
        estimatedSteps: todoLines.length
      };
    }
  }

  // 多任务关键词
  const multiTaskKeywords = [
    '然后', '之后', '接着', '并且', '同时', '还要',
    '分析并', '处理后', '整理并', '转换后',
    '先', '再', '最后', '第一步', '第二步'
  ];

  // 检查是否包含多任务关键词
  const hasMultiTaskKeyword = multiTaskKeywords.some(kw => lowerInput.includes(kw));

  if (hasMultiTaskKeyword) {
    return {
      needsPlanning: true,
      reason: '用户输入包含多任务关键词',
      estimatedSteps: 2
    };
  }

  // 检查是否包含多个不同意图的关键词
  const matchedIntents = Object.entries(TOOL_REGISTRY)
    .filter(([key]) => key !== 'unknown')
    .filter(([_, val]) => val.keywords.some(kw => lowerInput.includes(kw.toLowerCase())));

  // 只有匹配了多个不同的意图才需要规划
  if (matchedIntents.length >= 2) {
    return {
      needsPlanning: true,
      reason: '用户输入包含多个不同意图的关键词',
      estimatedSteps: matchedIntents.length
    };
  }

  // 简单任务
  return {
    needsPlanning: false,
    reason: '单一意图任务，无需规划',
    estimatedSteps: 1
  };
}

// 创建简单计划
function createSimplePlan(
  userInput: string,
  existingParams?: Record<string, any>
): PlanningResult {
  return {
    steps: [{
      id: generateStepId(0),
      description: userInput,
      retryCount: 0,
      status: 'pending',
      toolCall: existingParams ? {
        tool: 'unknown' as IntentType,
        params: existingParams
      } : undefined
    }],
    estimatedComplexity: 'simple',
    requiresReflection: false
  };
}