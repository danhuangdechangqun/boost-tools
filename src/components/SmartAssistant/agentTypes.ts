// 智能体类型定义

import { IntentType, Message, ToolResult } from './types';

// 工具调用信息
export interface ToolCall {
  tool: IntentType;
  params: Record<string, any>;
}

// 步骤执行结果
export interface StepResult {
  success: boolean;
  data?: any;
  error?: string;
}

// 单步反思结果
export interface StepReflection {
  stepId: string;
  isSuccess: boolean;
  issues: string[];
  suggestion: string;
  shouldRetry: boolean;
  adjustedParams?: Record<string, any>;
}

// 执行步骤
export interface ExecutionStep {
  id: string;
  description: string;
  intent?: IntentType;
  toolCall?: ToolCall;
  result?: StepResult;
  retryCount: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  reflection?: StepReflection;
  startTime?: string;
  endTime?: string;
}

// 任务计划
export interface TaskPlan {
  id: string;
  originalQuery: string;
  steps: ExecutionStep[];
  currentStepIndex: number;
  status: 'planning' | 'executing' | 'reflecting' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  shouldReflect: boolean;
}

// 任务反思结果
export interface TaskReflection {
  taskId: string;
  summary: string;
  successRate: number;
  improvements: string[];
  lessonsLearned: string[];
}

// 执行日志条目
export interface ExecutionLogEntry {
  timestamp: string;
  phase: 'planning' | 'executing' | 'reflecting' | 'completed';
  stepId?: string;
  action: string;
  details?: string;
}

// Agent消息扩展
export interface AgentMessage extends Message {
  agentPhase?: 'planning' | 'executing' | 'reflecting' | 'completed';
  plan?: TaskPlan;
  reflection?: TaskReflection;
  executionLog?: ExecutionLogEntry[];
  isThinking?: boolean;
}

// Agent配置
export interface AgentConfig {
  maxSteps: number;          // 最大步骤数
  maxRetries: number;        // 每步最大重试次数
  timeout: number;           // 超时时间(ms)
  enableReflection: boolean; // 是否启用反思
}

// 默认配置
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  maxSteps: 5,
  maxRetries: 3,
  timeout: 60000,
  enableReflection: true
};

// 规划判断结果
export interface PlanningDecision {
  needsPlanning: boolean;
  reason: string;
  estimatedSteps: number;
}

// 规划结果
export interface PlanningResult {
  steps: ExecutionStep[];
  estimatedComplexity: 'simple' | 'medium' | 'complex';
  requiresReflection: boolean;
}