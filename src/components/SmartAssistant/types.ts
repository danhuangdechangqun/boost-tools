// 智能助手 - 类型定义

// 意图类型
export type IntentType =
  | 'knowledge'      // 知识库问答
  | 'json_format'    // JSON格式化
  | 'xml_format'     // XML格式化
  | 'text_diff'      // 文本比较
  | 'regex'          // 正则生成
  | 'cron'           // Cron生成
  | 'sql_in'         // SQL IN转换
  | 'uuid'           // UUID生成
  | 'crypto'         // 加密计算
  | 'feedback'       // 反馈分析
  | 'ticket'         // 工单分析
  | 'todo'           // 待办管理
  | 'unknown';       // 无法识别

// 意图识别结果
export interface IntentResult {
  intent: IntentType;
  confidence: number;
  params?: {
    data?: string;
    format?: string;
    count?: number;
    prefix?: string;
    algorithm?: string;
    pattern?: string;
  };
  reason?: string; // 判断理由
}

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system';

// 消息
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  intent?: IntentType;
  toolResult?: ToolResult;
  actions?: MessageAction[];
}

// 消息操作按钮
export interface MessageAction {
  type: 'copy' | 'link' | 'clarify';
  label: string;
  data?: any;
  linkTo?: string;
}

// 工具执行结果
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  needData?: boolean;
  dataPrompt?: string;
  showInDialog?: boolean; // 是否在对话框内展示
  summary?: string;       // 摘要（复杂结果）
  linkTo?: string;        // 跳转页面
  linkText?: string;      // 跳转按钮文字
}

// 会话上下文
export interface SessionContext {
  messages: Message[];
  lastIntent: IntentType;
  pendingData: any;
  createdAt: string;
}

// 工具定义
export interface ToolDefinition {
  id: IntentType;
  name: string;
  keywords: string[];
  matchMode: 'precise' | 'fuzzy';
  needsData: boolean;
  dataPrompt?: string;
  handler: string; // 处理函数名
}

// 工具注册表
export const TOOL_REGISTRY: Record<IntentType, ToolDefinition> = {
  knowledge: {
    id: 'knowledge',
    name: '知识库问答',
    keywords: ['知识库', '文档', '根据文档', '参考资料'],
    matchMode: 'fuzzy',
    needsData: true,
    dataPrompt: '请输入您的问题',
    handler: 'handleKnowledge'
  },
  json_format: {
    id: 'json_format',
    name: 'JSON格式化',
    keywords: ['格式化json', '美化json', 'json格式', '整理json'],
    matchMode: 'precise',
    needsData: true,
    dataPrompt: '请粘贴需要格式化的JSON',
    handler: 'handleJsonFormat'
  },
  xml_format: {
    id: 'xml_format',
    name: 'XML格式化',
    keywords: ['格式化xml', '美化xml', 'xml格式', '整理xml'],
    matchMode: 'precise',
    needsData: true,
    dataPrompt: '请粘贴需要格式化的XML',
    handler: 'handleXmlFormat'
  },
  text_diff: {
    id: 'text_diff',
    name: '文本比较',
    keywords: ['比较文本', '对比文本', '文本差异', '比较差异', '对比差异'],
    matchMode: 'precise',
    needsData: true,
    dataPrompt: '请提供两段需要比较的文本（用---分隔）',
    handler: 'handleTextDiff'
  },
  regex: {
    id: 'regex',
    name: '正则表达式',
    keywords: ['正则', '匹配', '表达式'],
    matchMode: 'precise',
    needsData: true,
    dataPrompt: '请描述您需要匹配的内容类型（如：邮箱、手机号、身份证等）',
    handler: 'handleRegex'
  },
  cron: {
    id: 'cron',
    name: 'Cron表达式',
    keywords: ['cron', '定时', '定时任务', '周期'],
    matchMode: 'precise',
    needsData: true,
    dataPrompt: '请描述定时任务的执行周期（如：每天早上8点）',
    handler: 'handleCron'
  },
  sql_in: {
    id: 'sql_in',
    name: 'SQL IN转换',
    keywords: ['sql in', 'in格式', 'sql格式'],
    matchMode: 'precise',
    needsData: true,
    dataPrompt: '请粘贴需要转换的数据',
    handler: 'handleSqlIn'
  },
  uuid: {
    id: 'uuid',
    name: 'UUID生成',
    keywords: ['uuid', 'guid', '唯一id'],
    matchMode: 'precise',
    needsData: false,
    handler: 'handleUuid'
  },
  crypto: {
    id: 'crypto',
    name: '加密计算',
    keywords: ['md5', 'sha', '哈希', '加密', 'hash'],
    matchMode: 'precise',
    needsData: true,
    dataPrompt: '请输入需要计算哈希的内容',
    handler: 'handleCrypto'
  },
  feedback: {
    id: 'feedback',
    name: '反馈分析',
    keywords: ['用户反馈', '反馈分析', '分析反馈'],
    matchMode: 'fuzzy',
    needsData: true,
    dataPrompt: '请粘贴用户反馈数据',
    handler: 'handleFeedback'
  },
  ticket: {
    id: 'ticket',
    name: '工单分析',
    keywords: ['工单', '数据分析', '故障分析'],
    matchMode: 'fuzzy',
    needsData: true,
    dataPrompt: '请粘贴工单数据',
    handler: 'handleTicket'
  },
  todo: {
    id: 'todo',
    name: '待办管理',
    keywords: ['待办', 'todo', '任务', '今日待办', '明日待办', '下周计划', '周报'],
    matchMode: 'fuzzy',
    needsData: true,
    dataPrompt: '请描述要添加的待办任务',
    handler: 'handleTodo'
  },
  unknown: {
    id: 'unknown',
    name: '未知意图',
    keywords: [],
    matchMode: 'fuzzy',
    needsData: false,
    handler: 'handleUnknown'
  }
};

// 意图路由结果 - 用于入口拦截判断
export interface IntentRouterResult {
  type: 'tool' | 'knowledge' | 'clarify';
  tool?: IntentType;           // 工具名（type='tool'时有效）
  confidence?: number;         // 置信度
  needConfirm?: boolean;       // 是否需要用户确认
  message?: string;            // 引导提示语（type='clarify'时有效）
  knowledgeScore?: number;     // 知识库相似度分数（type='knowledge'时有效）
  extractedData?: string;      // 从数据模式识别中提取的数据
}

// 意图路由配置 - 开发模式可调整
export interface IntentRouterConfig {
  toolConfidenceThreshold: number;  // 工具匹配阈值，默认 0.8
}

export const DEFAULT_INTENT_ROUTER_CONFIG: IntentRouterConfig = {
  toolConfidenceThreshold: 0.8
};