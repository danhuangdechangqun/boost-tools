// 数据模式识别配置 - 用于自动识别用户输入的数据格式并建议对应工具

export type DataPatternType =
  | 'multiline_number_list'    // 多行数字/编码列表
  | 'multiline_code_list'      // 多行混合编码列表
  | 'json_data'                // JSON格式数据
  | 'xml_data'                 // XML格式数据
  | 'two_text_blocks'          // 两段文本（用于对比）
  | 'crypto_data'              // 加密相关数据
  | 'table_data'               // 表格数据

export interface DataPatternResult {
  pattern: DataPatternType;
  suggestedTool: string;
  confidence: number;
  extractedData?: string;
}

// 数据模式检测配置
export const DATA_PATTERNS: Record<DataPatternType, {
  detect: (input: string) => boolean;
  extract: (input: string) => string | undefined;
  suggestedTool: string;
  confidence: number;
}> = {
  // 多行数字列表检测 - 每行是纯数字或数字编码
  multiline_number_list: {
    detect: (input: string) => {
      const lines = input.trim().split(/\n/).filter(l => l.trim());
      if (lines.length < 3) return false;

      // 检查是否每行都是数字或数字编码（可以有前导字母）
      const numberPattern = /^[a-zA-Z]*\d+$/;
      const validLines = lines.filter(l => numberPattern.test(l.trim()));

      // 至少80%的行符合数字模式
      return validLines.length >= lines.length * 0.8 && lines.length >= 3;
    },
    extract: (input: string) => {
      const lines = input.trim().split(/\n/).filter(l => l.trim());
      return lines.join('\n');
    },
    suggestedTool: 'sql_in',
    confidence: 0.85
  },

  // 多行混合编码列表检测 - 每行是字母数字混合编码
  multiline_code_list: {
    detect: (input: string) => {
      const lines = input.trim().split(/\n/).filter(l => l.trim());
      if (lines.length < 3) return false;

      // 检查是否每行是编码格式（字母、数字、下划线、短横线组合）
      const codePattern = /^[a-zA-Z0-9_-]+$/;
      const validLines = lines.filter(l => codePattern.test(l.trim()));

      // 至少80%的行符合编码模式，且不是纯数字（否则会被 multiline_number_list 捕获）
      const hasLetters = validLines.some(l => /[a-zA-Z]/.test(l));
      return validLines.length >= lines.length * 0.8 && lines.length >= 3 && hasLetters;
    },
    extract: (input: string) => {
      const lines = input.trim().split(/\n/).filter(l => l.trim());
      return lines.join('\n');
    },
    suggestedTool: 'sql_in',
    confidence: 0.80
  },

  // JSON数据检测
  json_data: {
    detect: (input: string) => {
      const trimmed = input.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
      try {
        JSON.parse(trimmed);
        return true;
      } catch {
        return false;
      }
    },
    extract: (input: string) => input.trim(),
    suggestedTool: 'json_format',
    confidence: 0.99
  },

  // XML数据检测
  xml_data: {
    detect: (input: string) => {
      const trimmed = input.trim();
      if (!trimmed.startsWith('<') || !trimmed.includes('>')) return false;
      // 简单检查是否有闭合标签结构
      return /<[a-zA-Z][^>]*>[\s\S]*<\/[a-zA-Z][^>]*>|<[a-zA-Z][^>]*\/>/i.test(trimmed);
    },
    extract: (input: string) => input.trim(),
    suggestedTool: 'xml_format',
    confidence: 0.95
  },

  // 两段文本检测（用于文本对比）
  two_text_blocks: {
    detect: (input: string) => {
      // 检查是否有明显的分隔符（如 "---" 或 "对比：" 或两个独立的段落）
      const sections = input.split(/\n---+\n|\n对比[：:]\n|\n===+\n/);
      if (sections.length === 2) {
        // 两段文本都有一定长度（>10字符）
        return sections.every(s => s.trim().length > 10);
      }
      return false;
    },
    extract: (input: string) => input.trim(),
    suggestedTool: 'text_diff',
    confidence: 0.85
  },

  // 加密数据检测（已存在字符串+加密关键词）
  crypto_data: {
    detect: (input: string) => {
      // 这里只是补充检测，主要逻辑在 useIntent.ts 的 quickMatch 中
      return false;
    },
    extract: (input: string) => undefined,
    suggestedTool: 'crypto',
    confidence: 0
  },

  // 表格数据检测（Markdown表格或CSV）
  table_data: {
    detect: (input: string) => {
      const trimmed = input.trim();
      // Markdown表格
      if (trimmed.includes('|') && trimmed.split('\n').some(l => l.trim().startsWith('|'))) {
        return true;
      }
      // CSV格式（多行，每行有逗号分隔）
      const lines = trimmed.split('\n').filter(l => l.trim());
      if (lines.length >= 2 && lines.every(l => l.includes(','))) {
        return true;
      }
      return false;
    },
    extract: (input: string) => input.trim(),
    suggestedTool: 'ticket',  // 工单分析工具处理表格数据
    confidence: 0.70
  }
};

// 检测数据模式并返回建议工具
export function detectDataPattern(input: string): DataPatternResult | null {
  const trimmedInput = input.trim();

  // 检测顺序：优先检测明确的数据格式
  const detectOrder: DataPatternType[] = [
    'json_data',            // JSON最明确
    'xml_data',             // XML也很明确
    'multiline_number_list', // 多行数字列表（如行政区划代码）
    'multiline_code_list',   // 多行编码列表
    'two_text_blocks',       // 两段文本对比
    'table_data'             // 表格数据
  ];

  for (const patternType of detectOrder) {
    const config = DATA_PATTERNS[patternType];
    if (config.detect(trimmedInput)) {
      return {
        pattern: patternType,
        suggestedTool: config.suggestedTool,
        confidence: config.confidence,
        extractedData: config.extract(trimmedInput)
      };
    }
  }

  return null;
}