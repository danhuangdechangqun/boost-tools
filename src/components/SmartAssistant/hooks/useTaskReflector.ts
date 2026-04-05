// 任务反思 Hook - 整体总结任务完成情况

import { useState, useCallback } from 'react';
import { callLlm } from '@/services/api';
import { promptService } from '@/services/promptService';
import {
  TaskPlan,
  ExecutionStep,
  TaskReflection,
  AgentConfig,
  DEFAULT_AGENT_CONFIG
} from '../agentTypes';

export function useTaskReflector(config: AgentConfig = DEFAULT_AGENT_CONFIG) {
  const [loading, setLoading] = useState(false);

  // 整体任务反思
  const reflect = useCallback(async (plan: TaskPlan): Promise<TaskReflection> => {
    setLoading(true);

    try {
      // 如果禁用反思，返回简单结果
      if (!config.enableReflection) {
        return createSimpleReflection(plan);
      }

      const promptTemplate = await promptService.get('agent_task_reflect');
      if (!promptTemplate) {
        return createSimpleReflection(plan);
      }

      // 构建各步骤结果描述
      const stepResults = plan.steps.map(step => {
        const statusEmoji = {
          'success': '✓',
          'failed': '✗',
          'skipped': '○',
          'pending': '·',
          'running': '⋯'
        }[step.status] || '?';

        const resultDesc = step.result?.success
          ? `成功: ${JSON.stringify(step.result.data).substring(0, 200)}`
          : step.result?.error || '无结果';

        return `${statusEmoji} ${step.description}: ${resultDesc}`;
      }).join('\n');

      const planDesc = plan.steps.map((step, i) =>
        `${i + 1}. ${step.description} (${step.status})`
      ).join('\n');

      const prompt = promptService.render(promptTemplate.template, {
        original_query: plan.originalQuery,
        task_plan: planDesc,
        step_results: stepResults
      });

      const response = await callLlm(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const rawResult = JSON.parse(jsonMatch[0]);

        // 始终使用实际计算的成功率，不依赖LLM判断
        const actualSuccessRate = calculateSuccessRate(plan);

        return {
          taskId: plan.id,
          summary: rawResult.summary || '任务完成',
          successRate: actualSuccessRate, // 使用实际计算的成功率
          improvements: rawResult.improvements || [],
          lessonsLearned: rawResult.lessonsLearned || []
        };
      }

      return createSimpleReflection(plan);
    } catch (error) {
      console.error('任务反思失败:', error);
      return createSimpleReflection(plan);
    } finally {
      setLoading(false);
    }
  }, [config.enableReflection]);

  return {
    loading,
    reflect
  };
}

// 计算成功率
function calculateSuccessRate(plan: TaskPlan): number {
  if (plan.steps.length === 0) return 0;

  const successCount = plan.steps.filter(s => s.status === 'success').length;
  // 总步骤数：只有 skipped（主动跳过）不计入，pending（等待数据）算未完成
  const totalCount = plan.steps.filter(s => s.status !== 'skipped').length;

  if (totalCount === 0) return 0;
  return successCount / totalCount;
}

// 创建简单反思结果（不调用LLM）
function createSimpleReflection(plan: TaskPlan): TaskReflection {
  const successRate = calculateSuccessRate(plan);

  const improvements: string[] = [];
  const lessonsLearned: string[] = [];

  // 基于执行情况生成简单建议
  if (successRate < 1) {
    // 失败的步骤
    const failedSteps = plan.steps.filter(s => s.status === 'failed');
    failedSteps.forEach(step => {
      if (step.result?.error) {
        improvements.push(`步骤"${step.description}"失败，原因: ${step.result.error}`);
      }
    });

    // 未完成的步骤（pending状态，等待数据）
    const pendingSteps = plan.steps.filter(s => s.status === 'pending');
    pendingSteps.forEach(step => {
      improvements.push(`步骤"${step.description}"未完成，需要用户提供数据`);
    });

    if (failedSteps.length > 0 || pendingSteps.length > 0) {
      lessonsLearned.push('建议检查输入数据是否齐全');
    }
  }

  // 生成总结
  let summary = '';
  const successCount = plan.steps.filter(s => s.status === 'success').length;
  const totalCount = plan.steps.filter(s => s.status !== 'skipped').length;
  const pendingCount = plan.steps.filter(s => s.status === 'pending').length;
  const failedCount = plan.steps.filter(s => s.status === 'failed').length;

  if (successRate === 1) {
    summary = '所有步骤成功完成';
  } else if (pendingCount > 0 && failedCount === 0) {
    summary = `${successCount}/${totalCount}个步骤完成，${pendingCount}个步骤等待数据`;
  } else if (pendingCount === 0 && failedCount > 0) {
    summary = `${successCount}/${totalCount}个步骤完成，${failedCount}个步骤失败`;
  } else {
    summary = `${successCount}/${totalCount}个步骤完成，${failedCount}个失败，${pendingCount}个未完成`;
  }

  return {
    taskId: plan.id,
    summary,
    successRate,
    improvements,
    lessonsLearned
  };
}