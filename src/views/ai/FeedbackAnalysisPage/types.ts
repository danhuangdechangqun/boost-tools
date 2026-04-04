// 用户反馈智能分析 - 类型定义

export type FeedbackType = 'Bug' | '功能建议' | '体验问题' | '咨询求助' | '正面评价';
export type EmotionType = '负面' | '中性' | '正面';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export interface Feedback {
  id: string;                    // 需求编号 REQ-001
  originalContent: string;       // 原始反馈内容
  type: FeedbackType;            // 类型
  emotion: EmotionType;          // 情感
  coreNeed: string;              // 核心诉求
  productRequirement: string;    // 产品需求描述
  priority: Priority;            // 优先级
  priorityReason: string;        // 优先级理由
  suggestedSolution: string;     // 建议方案
  groupId?: string;              // 相似分组ID
  groupName?: string;            // 相似分组名称
  groupCount?: number;           // 相似反馈数量
}

export interface FeedbackGroup {
  id: string;
  name: string;
  feedbackIds: string[];
  mergedRequirement: string;
  totalCount: number;
  combinedPriority: Priority;
}

export interface AnalysisResult {
  feedbacks: Feedback[];
  groups: FeedbackGroup[];
  typeStats: Record<FeedbackType, number>;
  emotionStats: Record<EmotionType, number>;
  priorityStats: Record<Priority, number>;
}

export interface ExportField {
  key: string;           // 字段标识
  label: string;         // 显示名称
  description: string;   // 字段描述
  example: string;       // 示例值
  enabled: boolean;      // 是否导出
  isCustom: boolean;     // 是否自定义字段
  customValue?: string;  // 自定义字段默认值
}

export interface ExportConfig {
  fields: ExportField[];
  savedAt: string;
}

// 系统预设字段
export const DEFAULT_EXPORT_FIELDS: ExportField[] = [
  { key: 'id', label: '需求编号', description: '需求唯一标识', example: 'REQ-001', enabled: true, isCustom: false },
  { key: 'originalContent', label: '原始反馈', description: '用户原始描述', example: '登录按钮点不了', enabled: true, isCustom: false },
  { key: 'type', label: '类型', description: '反馈类型分类', example: 'Bug', enabled: true, isCustom: false },
  { key: 'emotion', label: '情感', description: '用户情感倾向', example: '负面', enabled: true, isCustom: false },
  { key: 'coreNeed', label: '核心诉求', description: '用户核心诉求', example: '需要修复登录功能', enabled: true, isCustom: false },
  { key: 'productRequirement', label: '产品需求', description: '转化的产品需求描述', example: '排查登录流程异常', enabled: true, isCustom: false },
  { key: 'priority', label: '优先级', description: '处理优先级', example: 'P0', enabled: true, isCustom: false },
  { key: 'priorityReason', label: '优先级理由', description: '优先级判断理由', example: '影响核心功能', enabled: false, isCustom: false },
  { key: 'suggestedSolution', label: '建议方案', description: '建议解决方案', example: '检查按钮事件绑定', enabled: false, isCustom: false },
  { key: 'groupName', label: '相似分组', description: '相似反馈归类', example: '登录问题', enabled: false, isCustom: false },
  { key: 'groupCount', label: '频次', description: '相似反馈数量', example: '3', enabled: false, isCustom: false },
];