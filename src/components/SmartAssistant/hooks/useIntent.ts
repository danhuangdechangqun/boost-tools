// 意图识别Hook - 使用动态提示词

import { useState, useCallback, useEffect } from 'react';
import { callLlm } from '@/services/api';
import { IntentResult, IntentType, TOOL_REGISTRY } from '../types';
import { promptService } from '@/services/promptService';

export function useIntent() {
  const [loading, setLoading] = useState(false);
  const [promptTemplate, setPromptTemplate] = useState<string>('');

  // 加载提示词
  useEffect(() => {
    loadPrompt();
  }, []);

  const loadPrompt = async () => {
    try {
      const prompt = await promptService.get('intent_recognition');
      setPromptTemplate(prompt?.template || '');
    } catch (e) {
      console.error('加载意图识别提示词失败:', e);
    }
  };

  // 使用LLM识别意图
  const recognizeIntent = useCallback(async (userInput: string): Promise<IntentResult> => {
    setLoading(true);

    try {
      // 先尝试规则匹配（快速路径）
      const quickResult = quickMatch(userInput);
      if (quickResult && quickResult.confidence > 0.9) {
        return quickResult;
      }

      // 使用LLM识别
      if (!promptTemplate) {
        // 如果提示词未加载，使用默认规则匹配
        return quickResult || { intent: 'unknown', confidence: 0 };
      }

      const prompt = promptService.render(promptTemplate, { user_input: userInput });
      const response = await callLlm(prompt);

      // 解析结果
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as IntentResult;

        // 验证意图是否有效
        if (!TOOL_REGISTRY[result.intent]) {
          result.intent = 'unknown';
        }

        return result;
      }

      return { intent: 'unknown', confidence: 0 };

    } catch (error) {
      console.error('意图识别失败:', error);
      return { intent: 'unknown', confidence: 0 };
    } finally {
      setLoading(false);
    }
  }, [promptTemplate]);

  return {
    loading,
    recognizeIntent,
    reloadPrompt: loadPrompt
  };
}

// 快速规则匹配
function quickMatch(input: string): IntentResult | null {
  const lowerInput = input.toLowerCase();
  const trimmedInput = input.trim();

  // 优先检测：用户直接输入数据格式（没有说意图关键词）
  // 检测JSON格式
  if (trimmedInput.startsWith('{') || trimmedInput.startsWith('[')) {
    try {
      JSON.parse(trimmedInput);
      return {
        intent: 'json_format',
        confidence: 0.99,
        params: { data: trimmedInput }
      };
    } catch {
      // 不是有效JSON，继续其他检测
    }
  }

  // 检测XML格式
  if (trimmedInput.startsWith('<') && trimmedInput.includes('>')) {
    return {
      intent: 'xml_format',
      confidence: 0.99,
      params: { data: trimmedInput }
    };
  }

  // 检测数据列表（适合SQL IN转换）
  // 多行数据、空格分隔的数字/文本列表
  const lines = trimmedInput.split(/\n/).filter(l => l.trim());
  const spaceSeparated = trimmedInput.split(/[\s,]+/).filter(s => s.trim());

  // 如果有多行数据（至少2行），或者多个空格/逗号分隔的项目（至少3个）
  if (lines.length >= 2 || spaceSeparated.length >= 3) {
    // 判断是否看起来像数据列表（不是句子）
    const isDataList = lines.length >= 2
      || (spaceSeparated.length >= 3 && !trimmedInput.match(/[a-zA-Z]{10,}/)); // 不是长句子

    if (isDataList && !lowerInput.match(/格式化|美化|比较|生成|计算|分析|知识库/)) {
      return {
        intent: 'sql_in',
        confidence: 0.95,
        params: { data: trimmedInput }
      };
    }
  }

  // 精准匹配规则
  const preciseRules: { patterns: RegExp[]; intent: IntentType; params?: any }[] = [
    {
      patterns: [/格式化.*json/, /美化.*json/, /json.*格式/, /整理.*json/],
      intent: 'json_format'
    },
    {
      patterns: [/格式化.*xml/, /美化.*xml/, /xml.*格式/, /整理.*xml/],
      intent: 'xml_format'
    },
    {
      patterns: [/比较.*文本/, /对比.*文本/, /文本.*差异/, /比较.*差异/],
      intent: 'text_diff'
    },
    {
      patterns: [/生成.*uuid/, /uuid/, /唯一.*id/],
      intent: 'uuid'
    },
    {
      patterns: [/sql\s*in/, /in.*格式/, /转.*sql/],
      intent: 'sql_in'
    },
    {
      patterns: [/生成.*cron/, /cron.*表达式/, /定时.*表达式/],
      intent: 'cron'
    },
    {
      patterns: [/计算.*md5/, /md5.*哈希/, /md5.*值/],
      intent: 'crypto',
      params: { algorithm: 'md5' }
    },
    {
      patterns: [/计算.*sha/, /sha.*哈希/, /sha256/],
      intent: 'crypto',
      params: { algorithm: 'sha256' }
    }
  ];

  for (const rule of preciseRules) {
    for (const pattern of rule.patterns) {
      if (pattern.test(lowerInput)) {
        // 特殊处理：根据意图类型提取不同参数
        let params: any = { ...rule.params };

        if (rule.intent === 'uuid') {
          // UUID：提取数量和前缀
          params = { ...params, ...extractUuidParams(input) };
        } else if (rule.intent === 'crypto') {
          // 加密：提取要计算的内容
          params = { ...params, data: extractCryptoData(input) };
        } else {
          // 其他：提取数据
          params = { ...params, data: extractData(input) };
        }

        return {
          intent: rule.intent,
          confidence: 0.95,
          params
        };
      }
    }
  }

  // 模糊匹配规则
  const fuzzyRules: { keywords: string[]; intent: IntentType }[] = [
    { keywords: ['知识库', '文档', '根据文档'], intent: 'knowledge' },
    { keywords: ['用户反馈', '反馈分析'], intent: 'feedback' },
    { keywords: ['工单', '故障分析'], intent: 'ticket' }
  ];

  for (const rule of fuzzyRules) {
    for (const keyword of rule.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        const dataMatch = extractData(input);
        return {
          intent: rule.intent,
          confidence: 0.85,
          params: { data: dataMatch }
        };
      }
    }
  }

  return null;
}

// 提取用户输入中的数据
function extractData(input: string): string | undefined {
  // 尝试提取JSON
  const jsonMatch = input.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  // 尝试提取代码块内容
  const codeBlockMatch = input.match(/```[\s\S]*?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[0].replace(/```/g, '').trim();
  }

  return undefined;
}

// 提取UUID参数（数量和前缀）
function extractUuidParams(input: string): { count?: number; prefix?: string } {
  const result: { count?: number; prefix?: string } = {};

  // 提取数量：匹配"X条"、"X个"、"生成X"等
  const countMatch = input.match(/(?:要|生成|生成\s*)(\d+)(?:条|个)/i);
  if (countMatch) {
    result.count = parseInt(countMatch[1], 10);
  }

  // 提取前缀：匹配"前缀为XXX"、"前缀XXX"、"加前缀XXX"等
  const prefixMatch = input.match(/(?:前缀(?:为)?|加前缀)\s*([A-Za-z0-9_-]+)/i);
  if (prefixMatch) {
    result.prefix = prefixMatch[1];
  }

  return result;
}

// 提取加密参数（要计算的内容）
function extractCryptoData(input: string): string | undefined {
  // 匹配 "密码为XXX"、"内容为XXX"、"字符串XXX"、"文本XXX"
  const namedMatch = input.match(/(?:密码|内容|字符串|文本|值)(?:为|是)?\s*([^\s,，]+)/i);
  if (namedMatch) {
    return namedMatch[1];
  }

  // 匹配 "计算XXX的MD5"、"XXX的哈希"、"对XXX计算"
  const hashMatch = input.match(/(?:计算|算|求)\s*([^\s,，]+)\s*(?:的|的)?(?:md5|sha|哈希|hash)/i);
  if (hashMatch) {
    return hashMatch[1];
  }

  // 匹配引号内的内容
  const quoteMatch = input.match(/["'']([^"'"'']+)["'']/);
  if (quoteMatch) {
    return quoteMatch[1];
  }

  return undefined;
}