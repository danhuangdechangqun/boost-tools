// 工具关键词配置 - 用于快速匹配用户意图

export const TOOL_KEYWORDS: Record<string, {
  keywords: string[];
  patterns: RegExp[];
}> = {
  uuid: {
    keywords: ['uuid', '唯一id', '生成id', '随机id', 'guid', '唯一标识'],
    patterns: [/生成.*uuid/i, /uuid.*生成/i, /给我.*uuid/i]
  },
  json_format: {
    keywords: ['json格式化', '格式化json', 'json美化', 'json整理', '美化json'],
    patterns: [/格式化.*json/i, /美化.*json/i, /整理.*json/i]
  },
  xml_format: {
    keywords: ['xml格式化', '格式化xml', 'xml美化', 'xml整理'],
    patterns: [/格式化.*xml/i, /美化.*xml/i, /整理.*xml/i]
  },
  crypto: {
    keywords: ['加密', 'md5', 'sha', 'hash', '哈希', '密码', '摘要', 'sha256', 'sha1'],
    patterns: [/计算.*md5/i, /md5.*计算/i, /计算.*哈希/i, /sha\d+/i]
  },
  regex: {
    keywords: ['正则', '正则表达式', '匹配规则', 'regex', '表达式'],
    patterns: [/生成.*正则/i, /正则.*生成/i, /写个.*正则/i]
  },
  cron: {
    keywords: ['cron', '定时表达式', '调度表达式', '定时任务', '周期'],
    patterns: [/cron.*表达式/i, /定时.*表达式/i, /生成.*cron/i]
  },
  sql_in: {
    keywords: ['sql in', 'sql转换', 'in语句', 'sql格式'],
    patterns: [/sql\s*in/i, /转.*sql\s*in/i]
  },
  text_diff: {
    keywords: ['文本对比', '文本比较', 'diff', '差异对比', '文本差异'],
    patterns: [/对比.*文本/i, /比较.*文本/i]
  },
  knowledge: {
    keywords: ['知识库', '查文档', '问知识库', '文档查询', '根据文档'],
    patterns: [/查.*知识库/i, /知识库.*查/i, /问.*知识库/i]
  },
  feedback: {
    keywords: ['反馈', '反馈分析', '用户反馈', '分析反馈'],
    patterns: [/分析.*反馈/i, /反馈.*分析/i]
  },
  ticket: {
    // 只有明确要"分析工单数据"才匹配，单纯提到工单不匹配（可能是查询知识库）
    keywords: ['工单分析', '分析工单数据', 'ticket分析'],
    patterns: [/分析.*工单数据/i, /工单数据.*分析/i]
  },
  todo: {
    keywords: ['待办', 'todo', '任务', '今日待办', '明日待办', '下周计划'],
    patterns: [/添加.*待办/i, /加.*待办/i, /开.*待办/i]
  }
};

// 从关键词配置中提取所有工具名
export const ALL_TOOL_NAMES = Object.keys(TOOL_KEYWORDS);

// 匹配工具关键词
export function matchToolKeywords(input: string): string | null {
  const lowerInput = input.toLowerCase();
  const trimmedInput = input.trim();

  // 先检测直接输入的数据格式（高置信度）
  // JSON 格式
  if (trimmedInput.startsWith('{') || trimmedInput.startsWith('[')) {
    try {
      JSON.parse(trimmedInput);
      return 'json_format';
    } catch {}
  }

  // XML 格式
  if (trimmedInput.startsWith('<') && trimmedInput.includes('>')) {
    return 'xml_format';
  }

  // 遍历关键词配置
  for (const [toolName, config] of Object.entries(TOOL_KEYWORDS)) {
    // 检查关键词
    for (const keyword of config.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        return toolName;
      }
    }

    // 检查正则模式
    for (const pattern of config.patterns) {
      if (pattern.test(input)) {
        return toolName;
      }
    }
  }

  return null;
}

// 检测用户是否明确指定了意图
export function detectExplicitIntent(input: string): {
  explicitIntent?: 'tool' | 'knowledge';
  explicitTool?: string;
} | null {
  const lowerInput = input.toLowerCase();

  // 明确指定知识库
  if (lowerInput.includes('查知识库') ||
      lowerInput.includes('问知识库') ||
      lowerInput.startsWith('知识库:') ||
      lowerInput.startsWith('知识库：')) {
    return { explicitIntent: 'knowledge' };
  }

  // 明确指定工具调用
  const toolCallPatterns = [
    /调用\s*(\w+)\s*工具/i,
    /用\s*(\w+)\s*工具/i,
    /执行\s*(\w+)/i,
    /帮我\s*(\w+)/i
  ];

  for (const pattern of toolCallPatterns) {
    const match = input.match(pattern);
    if (match) {
      const toolName = match[1].toLowerCase();
      // 尝试匹配到已知工具
      for (const knownTool of ALL_TOOL_NAMES) {
        if (toolName.includes(knownTool) || knownTool.includes(toolName)) {
          return { explicitIntent: 'tool', explicitTool: knownTool };
        }
      }
      // 未匹配到已知工具，返回用户指定的工具名
      return { explicitIntent: 'tool', explicitTool: toolName };
    }
  }

  return null;
}