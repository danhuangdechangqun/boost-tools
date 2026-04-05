// 智能体主控制器 - 协调规划、执行、反思各阶段

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { IntentResult, IntentType } from '../types';
import { usePlanner } from './usePlanner';
import { useStepReflector } from './useStepReflector';
import { useTaskReflector } from './useTaskReflector';
import { useToolExecutor } from './useToolExecutor';
import { useIntent } from './useIntent';
import {
  TaskPlan,
  ExecutionStep,
  ExecutionLogEntry,
  StepReflection,
  TaskReflection,
  AgentConfig,
  DEFAULT_AGENT_CONFIG,
  StepResult
} from '../agentTypes';

// 判断是否需要从用户输入中提取参数
function checkNeedsParamExtraction(intent: string, params: Record<string, any>): boolean {
  switch (intent) {
    case 'json_format':
    case 'xml_format':
    case 'sql_in':
    case 'crypto':
    case 'regex':
    case 'cron':
    case 'knowledge':
    case 'feedback':
    case 'ticket':
    case 'text_diff':
      // 这些工具需要 data 参数
      return !params.data;
    case 'uuid':
      // UUID 不需要 data，只需要 count 和 prefix
      return !params.count && !params.prefix;
    case 'todo':
      // todo 需要 title 参数，如果已有 title 则不需要提取
      return !params.title;
    case 'unknown':
      return false;
    default:
      return !params.data;
  }
}

// 从用户输入中提取各种格式的数据
function extractDataFromInput(input: string, tool: IntentType): Record<string, any> {
  const result: Record<string, any> = {};

  switch (tool) {
    case 'json_format': {
      // 提取JSON对象或数组
      const jsonMatch = input.match(/\{[\s\S]*?\}|\[[\s\S]*?\]/);
      if (jsonMatch) {
        result.data = jsonMatch[0];
      }
      break;
    }
    case 'xml_format': {
      // 提取XML
      const xmlMatch = input.match(/<[^>]+>[\s\S]*?<\/[^>]+>/);
      if (xmlMatch) {
        result.data = xmlMatch[0];
      }
      break;
    }
    case 'sql_in': {
      // 提取数字列表或数据列表
      // 尝试匹配连续的数字或ID列表
      const numberLines = input.match(/\b\d+\b/g);
      if (numberLines && numberLines.length >= 2) {
        result.data = numberLines.join('\n');
      } else {
        // 尝试匹配换行分隔的数据
        const lines = input.split('\n').filter(l => {
          const trimmed = l.trim();
          return trimmed && (
            /^\d+$/.test(trimmed) ||
            /^[a-zA-Z0-9_-]+$/.test(trimmed)
          );
        });
        if (lines.length >= 2) {
          result.data = lines.map(l => l.trim()).join('\n');
        }
      }
      break;
    }
    case 'uuid': {
      // 提取数量
      const countMatch = input.match(/(\d+)\s*(?:条|个)/);
      if (countMatch) {
        result.count = parseInt(countMatch[1], 10);
      }
      // 提取前缀
      const prefixMatch = input.match(/前缀(?:为)?["']?([A-Za-z0-9_]+)["']?/);
      if (prefixMatch) {
        result.prefix = prefixMatch[1];
      }
      // 也支持直接写前缀如 T_FLOW_
      const directPrefixMatch = input.match(/前缀[是为]?\s*([A-Z][A-Z0-9_]+)/i);
      if (directPrefixMatch && !result.prefix) {
        result.prefix = directPrefixMatch[1];
      }
      break;
    }
    case 'crypto': {
      // 提取要计算哈希的内容
      // 匹配 "密码为XXX"、"密码XXX"、"sdqwe" 等
      const cryptoPatterns = [
        /密码(?:为|是)?["']?([^"'\s,，]+)["']?/,
        /内容(?:为|是)?["']?([^"'\s,，]+)["']?/,
        /字符串["']?([^"'\s,，]+)["']?/,
        /计算["']?([^"'\s,，]+)["']?的/
      ];

      for (const pattern of cryptoPatterns) {
        const match = input.match(pattern);
        if (match) {
          result.data = match[1];
          break;
        }
      }

      // 提取算法
      if (input.toLowerCase().includes('md5')) {
        result.algorithm = 'md5';
      } else if (input.toLowerCase().includes('sha256') || input.toLowerCase().includes('sha-256')) {
        result.algorithm = 'sha256';
      } else if (input.toLowerCase().includes('sha1') || input.toLowerCase().includes('sha-1')) {
        result.algorithm = 'sha1';
      }
      break;
    }
    case 'regex': {
      // 提取正则类型
      const regexTypes: Record<string, string[]> = {
        'email': ['邮箱', 'email'],
        'phone': ['手机', 'phone', '电话'],
        'idcard': ['身份证', 'idcard'],
        'url': ['url', '网址', '链接'],
        'ip': ['ip', 'ip地址'],
        'date': ['日期', 'date'],
        'chinese': ['中文', '汉字'],
        'number': ['数字', 'number']
      };

      const lowerInput = input.toLowerCase();
      for (const [type, keywords] of Object.entries(regexTypes)) {
        if (keywords.some(kw => lowerInput.includes(kw))) {
          result.pattern = type;
          break;
        }
      }
      break;
    }
    case 'knowledge': {
      // 提取问题
      result.data = input;
      break;
    }
    case 'todo': {
      // 提取待办任务信息
      // 提取分组
      if (input.includes('今日待办') || input.includes('今天待办')) {
        result.group = 'today';
      } else if (input.includes('明日待办') || input.includes('明天待办')) {
        result.group = 'tomorrow';
      } else if (input.includes('下周计划') || input.includes('下周待办')) {
        result.group = 'nextWeek';
      }

      // 提取任务标题 - 多种模式匹配
      const titlePatterns = [
        /任务(?:是|为)?["']?([^"',，。\n]+)["']?/,
        /任务是["']?([^"',，。\n]+)["']?/,
        /加个?["']?([^"',，。\n]+)["']?/,
        /添加["']?([^"',，。\n]+)["']?/,
        /开个?["']?([^"',，。\n]+)["']?/
      ];

      for (const pattern of titlePatterns) {
        const match = input.match(pattern);
        if (match) {
          result.title = match[1].trim();
          break;
        }
      }

      // 提取描述
      const descPatterns = [
        /描述(?:是|为)?["']?([^"',，。\n]+)["']?/,
        /描述是["']?([^"',，。\n]+)["']?/
      ];

      for (const pattern of descPatterns) {
        const match = input.match(pattern);
        if (match) {
          result.description = match[1].trim();
          break;
        }
      }

      // 如果没有匹配到标题，尝试从分组关键词后面提取
      if (!result.title) {
        const groupKeywords = ['今日待办', '明天待办', '明日待办', '下周计划', '待办'];
        for (const kw of groupKeywords) {
          if (input.includes(kw)) {
            const idx = input.indexOf(kw);
            const afterKw = input.substring(idx + kw.length).trim();
            // 提取第一个词作为标题
            const firstWord = afterKw.match(/^["']?([^"',，。\n]+)["']?/);
            if (firstWord) {
              result.title = firstWord[1].trim();
              break;
            }
          }
        }
      }

      break;
    }
    case 'cron': {
      // 提取时间描述作为 data
      result.data = input;
      break;
    }
  }

  return result;
}

export function useAgentOrchestrator(config: AgentConfig = DEFAULT_AGENT_CONFIG) {
  const [plan, setPlan] = useState<TaskPlan | null>(null);
  const [executionLog, setExecutionLog] = useState<ExecutionLogEntry[]>([]);
  const [reflection, setReflection] = useState<TaskReflection | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'planning' | 'executing' | 'reflecting' | 'completed'>('idle');

  const planner = usePlanner(config);
  const stepReflector = useStepReflector(config);
  const taskReflector = useTaskReflector(config);
  const toolExecutor = useToolExecutor();
  const intentRecognizer = useIntent();

  // 添加执行日志
  const addLog = useCallback((entry: Omit<ExecutionLogEntry, 'timestamp'>) => {
    const logEntry: ExecutionLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };
    setExecutionLog(prev => [...prev, logEntry]);
  }, []);

  // 执行完整智能体流程
  const execute = useCallback(async (
    userInput: string,
    knowledgeBaseReady: boolean = false
  ): Promise<{
    success: boolean;
    result?: string;
    plan?: TaskPlan;
    reflection?: TaskReflection;
    executionLog: ExecutionLogEntry[];
  }> => {
    setLoading(true);
    setExecutionLog([]);
    setReflection(null);

    // 本地日志数组（同步更新，用于返回值）
    const localExecutionLog: ExecutionLogEntry[] = [];

    // 本地添加日志函数（同时更新 state 和本地数组）
    const localAddLog = (entry: Omit<ExecutionLogEntry, 'timestamp'>) => {
      const logEntry: ExecutionLogEntry = {
        ...entry,
        timestamp: new Date().toISOString()
      };
      localExecutionLog.push(logEntry);
      setExecutionLog(prev => [...prev, logEntry]);
    };

    try {
      // ===== 规划阶段 =====
      setPhase('planning');
      localAddLog({ phase: 'planning', action: '开始规划任务' });

      // 判断是否需要规划
      const planningDecision = await planner.shouldPlan(userInput);
      localAddLog({
        phase: 'planning',
        action: '规划判断完成',
        details: `needsPlanning: ${planningDecision.needsPlanning}, reason: ${planningDecision.reason}`
      });

      let taskPlan: TaskPlan;

      if (planningDecision.needsPlanning) {
        // 复杂任务：需要规划
        const planningResult = await planner.plan(userInput);
        taskPlan = {
          id: uuidv4(),
          originalQuery: userInput,
          steps: planningResult.steps,
          currentStepIndex: 0,
          status: 'planning',
          startTime: new Date().toISOString(),
          shouldReflect: planningResult.requiresReflection
        };

        localAddLog({
          phase: 'planning',
          action: '规划完成',
          details: `共 ${taskPlan.steps.length} 个步骤`
        });
      } else {
        // 简单任务：直接意图识别
        const intentResult = await intentRecognizer.recognizeIntent(userInput);

        if (intentResult.intent === 'unknown') {
          localAddLog({
            phase: 'planning',
            action: '意图识别失败',
            details: '无法识别用户意图'
          });

          setLoading(false);
          setPhase('idle');
          return {
            success: false,
            result: '抱歉，我不太确定您想要做什么。您可以尝试描述您的需求，或者直接粘贴数据。',
            executionLog: localExecutionLog
          };
        }

        taskPlan = {
          id: uuidv4(),
          originalQuery: userInput,
          steps: [{
            id: 'step_1',
            description: `执行${intentResult.intent}任务`,
            intent: intentResult.intent,
            toolCall: {
              tool: intentResult.intent,
              params: intentResult.params || {}
            },
            retryCount: 0,
            status: 'pending'
          }],
          currentStepIndex: 0,
          status: 'planning',
          startTime: new Date().toISOString(),
          shouldReflect: false
        };

        localAddLog({
          phase: 'planning',
          action: '简单任务规划完成',
          details: `意图: ${intentResult.intent}`
        });
      }

      setPlan(taskPlan);
      taskPlan.status = 'executing';

      // ===== 执行阶段 =====
      setPhase('executing');
      localAddLog({ phase: 'executing', action: '开始执行任务' });

      const finalResults: string[] = [];

      for (let i = 0; i < taskPlan.steps.length; i++) {
        const step = taskPlan.steps[i];
        taskPlan.currentStepIndex = i;

        localAddLog({
          phase: 'executing',
          stepId: step.id,
          action: `开始执行步骤 ${i + 1}`,
          details: step.description
        });

        // 执行步骤
        const stepResult = await executeStep(
          step,
          taskPlan,
          toolExecutor,
          stepReflector,
          knowledgeBaseReady,
          config,
          localAddLog
        );

        // 更新步骤状态
        taskPlan.steps[i] = stepResult.updatedStep;

        if (stepResult.success && stepResult.output) {
          finalResults.push(stepResult.output);
        }

        // 更新计划状态
        setPlan({ ...taskPlan });
      }

      // ===== 反思阶段 =====
      // 只有复杂任务才进行反思（简单任务跳过）
      if (taskPlan.shouldReflect && taskPlan.steps.length > 1) {
        setPhase('reflecting');
        localAddLog({ phase: 'reflecting', action: '开始任务反思' });

        taskPlan.status = 'reflecting';
        setPlan({ ...taskPlan });

        const taskReflection = await taskReflector.reflect(taskPlan);
        setReflection(taskReflection);

        localAddLog({
          phase: 'reflecting',
          action: '反思完成',
          details: `成功率: ${taskReflection.successRate}`
        });
      }

      // ===== 完成阶段 =====
      setPhase('completed');
      taskPlan.status = 'completed';
      taskPlan.endTime = new Date().toISOString();
      setPlan({ ...taskPlan });

      localAddLog({
        phase: 'completed',
        action: '任务完成'
      });

      setLoading(false);

      // 构建最终输出
      const finalOutput = buildFinalOutput(finalResults);

      return {
        success: true,
        result: finalOutput,
        plan: taskPlan,
        reflection,
        executionLog: localExecutionLog
      };

    } catch (error: any) {
      console.error('智能体执行失败:', error);

      localAddLog({
        phase: 'completed',
        action: '执行出错',
        details: error.message
      });

      setLoading(false);
      setPhase('idle');

      return {
        success: false,
        result: `执行出错: ${error.message}`,
        executionLog: localExecutionLog
      };
    }
  }, [config, planner, stepReflector, taskReflector, toolExecutor, intentRecognizer]);

  // 获取当前状态
  const getStatus = useCallback(() => {
    return {
      loading,
      phase,
      plan,
      reflection,
      executionLog
    };
  }, [loading, phase, plan, reflection, executionLog]);

  // 重置状态
  const reset = useCallback(() => {
    setPlan(null);
    setExecutionLog([]);
    setReflection(null);
    setLoading(false);
    setPhase('idle');
  }, []);

  return {
    loading,
    phase,
    plan,
    reflection,
    executionLog,
    execute,
    getStatus,
    reset
  };
}

// 执行单个步骤
async function executeStep(
  step: ExecutionStep,
  plan: TaskPlan,
  toolExecutor: ReturnType<typeof useToolExecutor>,
  stepReflector: ReturnType<typeof useStepReflector>,
  knowledgeBaseReady: boolean,
  config: AgentConfig,
  addLog: (entry: Omit<ExecutionLogEntry, 'timestamp'>) => void
): Promise<{
  success: boolean;
  output?: string;
  updatedStep: ExecutionStep;
}> {
  step.status = 'running';
  step.startTime = new Date().toISOString();

  let lastResult: StepResult | null = null;
  const intent = step.intent || step.toolCall?.tool || 'unknown';

  // 获取初始参数
  let params = { ...(step.toolCall?.params || {}) };

  // 如果参数不完整，从原始用户输入中提取补充参数
  // 注意：只有当步骤缺少必要参数时才提取，避免覆盖已有的正确参数
  const needsExtraction = checkNeedsParamExtraction(intent, params);
  if (needsExtraction) {
    const extractedParams = extractDataFromInput(plan.originalQuery, intent as IntentType);
    // 只合并缺失的参数，不覆盖已有的参数
    for (const [key, value] of Object.entries(extractedParams)) {
      if (!params[key] && value) {
        params[key] = value;
      }
    }
  }

  // 执行（可能重试）
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (attempt > 0) {
      addLog({
        phase: 'executing',
        stepId: step.id,
        action: `重试步骤 (${attempt}/${config.maxRetries})`
      });
    }

    // 调用工具执行
    const toolResult = await toolExecutor.execute(intent as IntentType, params, knowledgeBaseReady);

    lastResult = {
      success: toolResult.success,
      data: toolResult.data,
      error: toolResult.error
    };

    // 如果需要更多数据，让用户提供
    if (toolResult.needData) {
      addLog({
        phase: 'executing',
        stepId: step.id,
        action: '等待用户提供数据',
        details: toolResult.dataPrompt
      });

      return {
        success: false,
        output: toolResult.dataPrompt || '请提供数据',
        updatedStep: {
          ...step,
          status: 'pending',
          result: lastResult
        }
      };
    }

    // 反思检查结果（只在失败时才调用反思，成功则跳过）
    if (config.enableReflection && !toolResult.success) {
      const stepReflection = await stepReflector.reflect(step, lastResult);
      step.reflection = stepReflection;

      if (stepReflection.shouldRetry && attempt < config.maxRetries) {
        // 调整参数后重试
        if (stepReflection.adjustedParams) {
          step.toolCall = {
            ...step.toolCall,
            params: { ...step.toolCall?.params, ...stepReflection.adjustedParams }
          } as any;
        }
        step.retryCount++;
        continue;
      }
    }

    // 执行完成（成功或失败不重试）
    break;
  }

  step.endTime = new Date().toISOString();
  step.result = lastResult;

  if (lastResult?.success) {
    step.status = 'success';
    addLog({
      phase: 'executing',
      stepId: step.id,
      action: '步骤执行成功'
    });

    return {
      success: true,
      output: typeof lastResult.data === 'string' ? lastResult.data : JSON.stringify(lastResult.data, null, 2),
      updatedStep: step
    };
  } else {
    step.status = 'failed';
    addLog({
      phase: 'executing',
      stepId: step.id,
      action: '步骤执行失败',
      details: lastResult?.error
    });

    return {
      success: false,
      output: lastResult?.error || '执行失败',
      updatedStep: step
    };
  }
}

// 构建最终输出（不包含反思，反思只在详情中显示）
function buildFinalOutput(results: string[]): string {
  return results.filter(r => r).join('\n\n');
}