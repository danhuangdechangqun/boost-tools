// 单步反思 Hook - 检查每步执行结果

import { useState, useCallback } from 'react';
import { callLlm } from '@/services/api';
import { promptService } from '@/services/promptService';
import {
  ExecutionStep,
  StepResult,
  StepReflection,
  AgentConfig,
  DEFAULT_AGENT_CONFIG
} from '../agentTypes';

export function useStepReflector(config: AgentConfig = DEFAULT_AGENT_CONFIG) {
  const [loading, setLoading] = useState(false);

  // 反思单步执行结果
  const reflect = useCallback(async (
    step: ExecutionStep,
    result: StepResult
  ): Promise<StepReflection> => {
    setLoading(true);

    try {
      const promptTemplate = await promptService.get('agent_step_reflect');
      if (!promptTemplate) {
        // 无提示词，使用默认反思逻辑
        return defaultReflect(step, result);
      }

      // 构建执行结果描述
      const resultDescription = result.success
        ? `执行成功，返回数据: ${JSON.stringify(result.data).substring(0, 500)}`
        : `执行失败，错误: ${result.error}`;

      const prompt = promptService.render(promptTemplate.template, {
        step_description: step.description,
        execution_result: resultDescription
      });

      const response = await callLlm(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const rawResult = JSON.parse(jsonMatch[0]);

        // 安全检查：如果工具执行成功且没有发现具体问题，强制禁止重试
        // 这样可以防止 LLM 反思结果错误判断导致的重复执行
        const forceNoRetry = result.success && !(rawResult.issues?.length > 0);

        return {
          stepId: step.id,
          isSuccess: rawResult.isSuccess ?? result.success,
          issues: rawResult.issues || [],
          suggestion: rawResult.suggestion || '',
          shouldRetry: forceNoRetry ? false : (rawResult.shouldRetry && step.retryCount < config.maxRetries),
          adjustedParams: rawResult.adjustedParams
        };
      }

      return defaultReflect(step, result);
    } catch (error) {
      console.error('单步反思失败:', error);
      return defaultReflect(step, result);
    } finally {
      setLoading(false);
    }
  }, [config.maxRetries]);

  return {
    loading,
    reflect
  };
}

// 默认反思逻辑（不调用LLM）
function defaultReflect(step: ExecutionStep, result: StepResult): StepReflection {
  // 如果执行成功，不需要重试
  if (result.success) {
    return {
      stepId: step.id,
      isSuccess: true,
      issues: [],
      suggestion: '',
      shouldRetry: false
    };
  }

  // 如果执行失败且重试次数未达上限
  const canRetry = step.retryCount < 3;
  const errorType = categorizeError(result.error || '');

  return {
    stepId: step.id,
    isSuccess: false,
    issues: [result.error || '执行失败'],
    suggestion: canRetry ? '建议重试' : '已达最大重试次数',
    shouldRetry: canRetry && errorType.canRetry,
    adjustedParams: errorType.suggestedFix ? { fix: errorType.suggestedFix } : undefined
  };
}

// 错误分类
interface ErrorCategory {
  type: string;
  canRetry: boolean;
  suggestedFix?: string;
}

function categorizeError(error: string): ErrorCategory {
  const lowerError = error.toLowerCase();

  // 数据格式错误
  if (lowerError.includes('格式') || lowerError.includes('parse') || lowerError.includes('json')) {
    return {
      type: 'data_format',
      canRetry: true,
      suggestedFix: '检查数据格式是否正确'
    };
  }

  // 参数缺失
  if (lowerError.includes('缺少') || lowerError.includes('missing') || lowerError.includes('未提供')) {
    return {
      type: 'missing_params',
      canRetry: false,
      suggestedFix: '需要用户提供更多数据'
    };
  }

  // 网络或系统错误
  if (lowerError.includes('网络') || lowerError.includes('timeout') || lowerError.includes('超时')) {
    return {
      type: 'system_error',
      canRetry: true,
      suggestedFix: '等待后重试'
    };
  }

  // 其他错误
  return {
    type: 'unknown',
    canRetry: true
  };
}