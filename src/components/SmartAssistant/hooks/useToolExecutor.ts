// 工具执行Hook

import { useState, useCallback } from 'react';
import { ToolResult, IntentType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

// 格式化JSON
function formatJSON(data: string): { success: boolean; result?: string; error?: string } {
  try {
    const parsed = JSON.parse(data);
    return { success: true, result: JSON.stringify(parsed, null, 2) };
  } catch (e: any) {
    return { success: false, error: 'JSON格式错误: ' + e.message };
  }
}

// 格式化XML
function formatXML(data: string): { success: boolean; result?: string; error?: string } {
  try {
    // 简单的XML格式化
    let formatted = data.trim();
    let indent = 0;
    const lines: string[] = [];

    // 在标签之间添加换行
    formatted = formatted.replace(/>\s*</g, '>\n<');

    const parts = formatted.split('\n');
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // 闭合标签减少缩进
      if (trimmed.startsWith('</')) {
        indent = Math.max(0, indent - 1);
      }

      lines.push('  '.repeat(indent) + trimmed);

      // 开始标签增加缩进（非自闭合）
      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
        indent++;
      }
    }

    return { success: true, result: lines.join('\n') };
  } catch (e: any) {
    return { success: false, error: 'XML格式错误' };
  }
}

// 生成SQL IN格式
function generateSQLIn(data: string): { success: boolean; result?: string; error?: string } {
  try {
    // 分割数据（支持逗号、换行、空格分隔）
    const items = data
      .split(/[,\n\s]+/)
      .map(s => s.trim())
      .filter(s => s);

    if (items.length === 0) {
      return { success: false, error: '未找到有效数据' };
    }

    // 所有值都加引号，统一格式
    return { success: true, result: `('${items.join("','")}')` };
  } catch (e: any) {
    return { success: false, error: '转换失败: ' + e.message };
  }
}

// 生成UUID
function generateUUID(count: number = 1, prefix: string = ''): string[] {
  const uuids: string[] = [];
  for (let i = 0; i < Math.min(count, 100); i++) {
    const uuid = uuidv4();
    uuids.push(prefix ? `${prefix}${uuid}` : uuid);
  }
  return uuids;
}

// 计算哈希
function calculateHash(data: string, algorithm: string): string {
  const trimmed = data.trim();
  switch (algorithm.toLowerCase()) {
    case 'md5':
      return CryptoJS.MD5(trimmed).toString();
    case 'sha1':
      return CryptoJS.SHA1(trimmed).toString();
    case 'sha256':
      return CryptoJS.SHA256(trimmed).toString();
    case 'sha512':
      return CryptoJS.SHA512(trimmed).toString();
    default:
      return CryptoJS.MD5(trimmed).toString();
  }
}

// 预设正则表达式
const REGEX_PRESETS: Record<string, { name: string; pattern: string; desc: string }> = {
  email: { name: '邮箱', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', desc: '匹配邮箱地址' },
  phone: { name: '手机号', pattern: '^1[3-9]\\d{9}$', desc: '匹配中国大陆手机号' },
  idcard: { name: '身份证', pattern: '^[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$', desc: '匹配18位身份证号' },
  url: { name: 'URL', pattern: '^https?:\\/\\/[\\w\\-]+(\\.[\\w\\-]+)+[\\w\\-.,@?^=%&:\\/~+#]*$', desc: '匹配URL地址' },
  ip: { name: 'IP地址', pattern: '^((25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$', desc: '匹配IPv4地址' },
  date: { name: '日期', pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$', desc: '匹配YYYY-MM-DD格式日期' },
  time: { name: '时间', pattern: '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$', desc: '匹配HH:mm:ss格式时间' },
  chinese: { name: '中文', pattern: '^[\\u4e00-\\u9fa5]+$', desc: '匹配中文字符' },
  number: { name: '数字', pattern: '^-?\\d+(\\.\\d+)?$', desc: '匹配整数或小数' },
  username: { name: '用户名', pattern: '^[a-zA-Z][a-zA-Z0-9_]{2,15}$', desc: '匹配字母开头的用户名' },
  password: { name: '密码强度', pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$', desc: '至少8位，包含大小写字母和数字' }
};

export function useToolExecutor() {
  const [loading, setLoading] = useState(false);

  // 执行工具
  const execute = useCallback(async (
    intent: IntentType,
    params: any,
    knowledgeBaseReady: boolean = true
  ): Promise<ToolResult> => {
    setLoading(true);

    try {
      switch (intent) {
        case 'json_format':
          return handleJsonFormat(params.data);

        case 'xml_format':
          return handleXmlFormat(params.data);

        case 'sql_in':
          return handleSqlIn(params.data);

        case 'uuid':
          return handleUuid(params.count, params.prefix);

        case 'crypto':
          return handleCrypto(params.data, params.algorithm);

        case 'regex':
          return handleRegex(params.pattern || params.data);

        case 'knowledge':
          return handleKnowledge(knowledgeBaseReady);

        case 'text_diff':
          return handleTextDiff();

        case 'cron':
          return handleCron();

        case 'feedback':
          return handleFeedback();

        case 'ticket':
          return handleTicket();

        default:
          return { success: false, error: '未知工具' };
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, execute };
}

// 各工具处理函数
function handleJsonFormat(data?: string): ToolResult {
  if (!data) {
    return { success: false, needData: true, dataPrompt: '请粘贴需要格式化的JSON数据' };
  }

  const result = formatJSON(data);
  if (result.success) {
    return {
      success: true,
      data: result.result,
      showInDialog: true,
      actions: [{ type: 'copy', label: '复制结果', data: result.result }]
    };
  }
  return { success: false, error: result.error };
}

function handleXmlFormat(data?: string): ToolResult {
  if (!data) {
    return { success: false, needData: true, dataPrompt: '请粘贴需要格式化的XML数据' };
  }

  const result = formatXML(data);
  if (result.success) {
    return {
      success: true,
      data: result.result,
      showInDialog: true,
      actions: [{ type: 'copy', label: '复制结果', data: result.result }]
    };
  }
  return { success: false, error: result.error };
}

function handleSqlIn(data?: string): ToolResult {
  if (!data) {
    return { success: false, needData: true, dataPrompt: '请粘贴需要转换的数据（支持逗号、换行分隔）' };
  }

  const result = generateSQLIn(data);
  if (result.success) {
    return {
      success: true,
      data: result.result,
      showInDialog: true,
      actions: [{ type: 'copy', label: '复制结果', data: result.result }]
    };
  }
  return { success: false, error: result.error };
}

function handleUuid(count?: number, prefix?: string): ToolResult {
  const uuids = generateUUID(count || 1, prefix || '');
  const result = uuids.join('\n');
  return {
    success: true,
    data: result,
    showInDialog: true,
    actions: [{ type: 'copy', label: '复制结果', data: result }]
  };
}

function handleCrypto(data?: string, algorithm?: string): ToolResult {
  if (!data) {
    return { success: false, needData: true, dataPrompt: '请输入需要计算哈希的内容' };
  }

  const hash = calculateHash(data, algorithm || 'md5');
  const result = `${algorithm?.toUpperCase() || 'MD5'}: ${hash}`;
  return {
    success: true,
    data: result,
    showInDialog: true,
    actions: [{ type: 'copy', label: '复制哈希值', data: hash }]
  };
}

function handleRegex(pattern?: string): ToolResult {
  if (!pattern) {
    // 列出可用的预设正则
    const presets = Object.entries(REGEX_PRESETS)
      .map(([key, val]) => `- **${val.name}**: \`${val.pattern}\` (${val.desc})`)
      .join('\n');
    return {
      success: true,
      data: `我可为您生成以下正则表达式：\n\n${presets}\n\n请告诉我您需要哪种类型，或描述您的需求。`,
      showInDialog: true
    };
  }

  // 尝试匹配预设
  const lowerPattern = pattern.toLowerCase();
  for (const [key, preset] of Object.entries(REGEX_PRESETS)) {
    if (lowerPattern.includes(key) || lowerPattern.includes(preset.name)) {
      return {
        success: true,
        data: `**${preset.name}** 正则表达式：\n\`\`\`\n${preset.pattern}\n\`\`\`\n\n说明：${preset.desc}`,
        showInDialog: true,
        actions: [{ type: 'copy', label: '复制正则', data: preset.pattern }]
      };
    }
  }

  // 未找到预设
  return {
    success: true,
    data: `暂无"${pattern}"的预设正则。您可以描述具体需求，我会帮您生成。`,
    showInDialog: true
  };
}

function handleKnowledge(ready: boolean): ToolResult {
  if (!ready) {
    return {
      success: false,
      error: '📚 当前知识库暂无文档，请先导入文档后再提问。',
      linkTo: 'knowledge-base',
      linkText: '前往导入文档'
    };
  }
  return {
    success: true,
    needData: true,
    dataPrompt: '请输入您的问题，我将根据知识库回答'
  };
}

function handleTextDiff(): ToolResult {
  return {
    success: true,
    needData: true,
    dataPrompt: '请提供两段需要比较的文本（用 --- 分隔）',
    linkTo: 'diff',
    linkText: '打开文本比较工具'
  };
}

function handleCron(): ToolResult {
  return {
    success: true,
    needData: true,
    dataPrompt: '请描述定时任务的执行周期（如：每天早上8点、每周一上午10点）',
    linkTo: 'cron',
    linkText: '打开Cron工具'
  };
}

function handleFeedback(): ToolResult {
  return {
    success: true,
    needData: true,
    dataPrompt: '请粘贴用户反馈数据',
    linkTo: 'feedback-analysis',
    linkText: '打开反馈分析工具'
  };
}

function handleTicket(): ToolResult {
  return {
    success: true,
    needData: true,
    dataPrompt: '请粘贴工单数据',
    linkTo: 'ticket-analysis',
    linkText: '打开工单分析工具'
  };
}