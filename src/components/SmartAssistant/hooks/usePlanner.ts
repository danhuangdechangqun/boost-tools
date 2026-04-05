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

    // 不需要规划，或者已有快速计划，直接返回
    if (quickDecision.needsPlanning === false || quickDecision.quickPlan) {
      return quickDecision;
    }

    // 只有复杂任务才调用LLM判断
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

        // 多步骤任务强制启用反思（不依赖LLM判断）
        const requiresReflection = steps.length > 1;

        return {
          steps,
          estimatedComplexity: rawResult.estimatedComplexity || 'medium',
          requiresReflection
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

  // 简单工具列表（不需要LLM理解）
  const simpleTools: IntentType[] = ['uuid', 'crypto', 'json_format', 'xml_format', 'sql_in', 'regex', 'cron'];

  // 检测多行待办任务
  const lines = input.split('\n').filter(l => l.trim());
  const todoKeywords = ['待办', '今日待办', '明日待办', '明天待办', '下周计划', '下周待办', 'todo'];

  if (lines.length >= 2) {
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

  // 检查是否包含多个不同意图的关键词
  const matchedIntents = Object.entries(TOOL_REGISTRY)
    .filter(([key]) => key !== 'unknown')
    .filter(([_, val]) => val.keywords.some(kw => lowerInput.includes(kw.toLowerCase())));

  console.log('=== DEBUG: matchedIntents ===');
  console.log('input:', input);
  console.log('matchedIntents:', matchedIntents.map(([key]) => key));

  // 多任务关键词
  const multiTaskKeywords = [
    '然后', '之后', '接着', '并且', '同时', '还要',
    '分析并', '处理后', '整理并', '转换后',
    '先', '再', '最后', '第一步', '第二步'
  ];

  const hasMultiTaskKeyword = multiTaskKeywords.some(kw => lowerInput.includes(kw));

  if (matchedIntents.length >= 2 || hasMultiTaskKeyword) {
    // 判断是否都是简单工具
    const matchedToolKeys = matchedIntents.map(([key]) => key as IntentType);
    const allSimpleTools = matchedToolKeys.every(tool => simpleTools.includes(tool));

    console.log('=== DEBUG: 简单工具判断 ===');
    console.log('matchedToolKeys:', matchedToolKeys);
    console.log('allSimpleTools:', allSimpleTools);

    if (allSimpleTools && matchedToolKeys.length >= 2) {
      // 都是简单工具，直接生成计划，跳过LLM
      const steps: ExecutionStep[] = matchedToolKeys.map((tool, i) => ({
        id: generateStepId(i),
        description: TOOL_REGISTRY[tool].name,
        intent: tool,
        toolCall: {
          tool,
          params: extractParamsFromInput(input, tool)
        },
        retryCount: 0,
        status: 'pending' as const
      }));

      console.log('=== DEBUG: quickPlan generated ===');
      console.log('steps:', steps);

      return {
        needsPlanning: true,
        reason: '简单工具组合，直接生成计划',
        estimatedSteps: steps.length,
        quickPlan: steps
      };
    }

    // 包含复杂工具，需要LLM规划
    return {
      needsPlanning: true,
      reason: hasMultiTaskKeyword ? '用户输入包含多任务关键词' : '用户输入包含多个不同意图的关键词',
      estimatedSteps: matchedIntents.length || 2
    };
  }

  // 简单任务
  return {
    needsPlanning: false,
    reason: '单一意图任务，无需规划',
    estimatedSteps: 1
  };
}

// 从输入中提取工具参数
function extractParamsFromInput(input: string, tool: IntentType): Record<string, any> {
  const params: Record<string, any> = {};

  switch (tool) {
    case 'uuid': {
      const countMatch = input.match(/(\d+)\s*(?:条|个)/);
      if (countMatch) {
        params.count = parseInt(countMatch[1], 10);
      }
      const prefixMatch = input.match(/前缀(?:为|是)?["']?([A-Za-z0-9_]+)["']?/);
      if (prefixMatch) {
        params.prefix = prefixMatch[1];
      }
      break;
    }
    case 'crypto': {
      if (input.toLowerCase().includes('md5')) {
        params.algorithm = 'md5';
      } else if (input.toLowerCase().includes('sha256') || input.toLowerCase().includes('sha-256')) {
        params.algorithm = 'sha256';
      } else if (input.toLowerCase().includes('sha1') || input.toLowerCase().includes('sha-1')) {
        params.algorithm = 'sha1';
      }
      // 提取要计算哈希的内容
      const cryptoPatterns = [
        /字符串["']?([^"'\s,，]+)["']?/,
        /计算["']?([^"'\s,，]+)["']?的/,
        /["']([^"']+)["']\s*(?:的)?(?:md5|sha)/i
      ];
      for (const pattern of cryptoPatterns) {
        const match = input.match(pattern);
        if (match) {
          params.data = match[1];
          break;
        }
      }
      break;
    }
    case 'json_format': {
      const jsonMatch = input.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        params.data = jsonMatch[0];
      }
      break;
    }
    case 'xml_format': {
      const xmlMatch = input.match(/<[^>]+>[\s\S]*?<\/[^>]+>/);
      if (xmlMatch) {
        params.data = xmlMatch[0];
      }
      break;
    }
  }

  return params;
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