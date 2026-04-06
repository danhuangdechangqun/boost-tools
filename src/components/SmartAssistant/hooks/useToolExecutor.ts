// 工具执行Hook

import { useState, useCallback } from 'react';
import { ToolResult, IntentType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import { addTodo, TodoItem } from '@/services/api';
import { queryKnowledge } from '@/services/knowledgeQuery';

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

// 解析时间描述为Cron表达式
function parseTimeToCron(desc: string): string | null {
  const lower = desc.toLowerCase().trim();

  // 每年每月凌晨1点0分0秒 -> 0 1 1 * ?
  if (lower.includes('每年') && lower.includes('每月') && lower.includes('凌晨')) {
    const hourMatch = lower.match(/凌晨(\d+)点/);
    const hour = hourMatch ? parseInt(hourMatch[1]) : 1;
    return `0 ${hour} 1 * ?`;
  }

  // 每年每月某日
  if (lower.includes('每年') && lower.includes('每月')) {
    const dayMatch = lower.match(/(\d+)日/);
    const hourMatch = lower.match(/(\d+)点/);
    const minMatch = lower.match(/(\d+)分/);
    const day = dayMatch ? parseInt(dayMatch[1]) : 1;
    const hour = hourMatch ? parseInt(hourMatch[1]) : 0;
    const min = minMatch ? parseInt(minMatch[1]) : 0;
    return `${min} ${hour} ${day} * ?`;
  }

  // 每年某月
  if (lower.includes('每年')) {
    const monthMatch = lower.match(/(\d+)月/);
    const dayMatch = lower.match(/(\d+)日/);
    const hourMatch = lower.match(/(\d+)点/);
    const minMatch = lower.match(/(\d+)分/);
    const month = monthMatch ? parseInt(monthMatch[1]) : 1;
    const day = dayMatch ? parseInt(dayMatch[1]) : 1;
    const hour = hourMatch ? parseInt(hourMatch[1]) : 0;
    const min = minMatch ? parseInt(minMatch[1]) : 0;
    return `${min} ${hour} ${day} ${month} ?`;
  }

  // 每月某日
  if (lower.includes('每月')) {
    const dayMatch = lower.match(/(\d+)日/);
    const hourMatch = lower.match(/(\d+)点/);
    const minMatch = lower.match(/(\d+)分/);
    const day = dayMatch ? parseInt(dayMatch[1]) : 1;
    const hour = hourMatch ? parseInt(hourMatch[1]) : 0;
    const min = minMatch ? parseInt(minMatch[1]) : 0;
    return `${min} ${hour} ${day} * ?`;
  }

  // 每天/每日
  if (lower.includes('每天') || lower.includes('每日')) {
    const hourMatch = lower.match(/(\d+)点/);
    const minMatch = lower.match(/(\d+)分/);
    const hour = hourMatch ? parseInt(hourMatch[1]) : 0;
    const min = minMatch ? parseInt(minMatch[1]) : 0;

    // 早上/上午
    if (lower.includes('早上') || lower.includes('上午')) {
      return `${min} ${hour} * * ?`;
    }
    // 下午/晚上
    if (lower.includes('下午') || lower.includes('晚上') || lower.includes('傍晚')) {
      return `${min} ${hour + 12} * * ?`;
    }
    // 凌晨
    if (lower.includes('凌晨')) {
      return `${min} ${hour} * * ?`;
    }
    return `${min} ${hour} * * ?`;
  }

  // 每周几
  const weekDays: Record<string, number> = {
    '日': 1, '天': 1, '一': 2, '二': 3, '三': 4, '四': 5, '五': 6, '六': 7
  };
  for (const [day, cronDay] of Object.entries(weekDays)) {
    if (lower.includes(`每周${day}`) || lower.includes(`每周天`)) {
      const hourMatch = lower.match(/(\d+)点/);
      const minMatch = lower.match(/(\d+)分/);
      const hour = hourMatch ? parseInt(hourMatch[1]) : 0;
      const min = minMatch ? parseInt(minMatch[1]) : 0;

      if (lower.includes('下午') || lower.includes('晚上')) {
        return `${min} ${hour + 12} ? * ${cronDay}`;
      }
      return `${min} ${hour} ? * ${cronDay}`;
    }
  }

  // 每小时
  if (lower.includes('每小时')) {
    const minMatch = lower.match(/(\d+)分/);
    const min = minMatch ? parseInt(minMatch[1]) : 0;
    return `${min} * * * ?`;
  }

  // 每隔X分钟/小时
  const intervalMinMatch = lower.match(/每隔(\d+)分钟/);
  if (intervalMinMatch) {
    const interval = parseInt(intervalMinMatch[1]);
    return `0 */${interval} * * ?`;
  }

  const intervalHourMatch = lower.match(/每隔(\d+)小时/);
  if (intervalHourMatch) {
    const interval = parseInt(intervalHourMatch[1]);
    return `0 0 */${interval} * ?`;
  }

  // 工作日（周一到周五）
  if (lower.includes('工作日') || lower.includes('每工作日')) {
    const hourMatch = lower.match(/(\d+)点/);
    const minMatch = lower.match(/(\d+)分/);
    const hour = hourMatch ? parseInt(hourMatch[1]) : 9;
    const min = minMatch ? parseInt(minMatch[1]) : 0;
    return `${min} ${hour} ? * 2-6`;
  }

  return null;
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
          return handleKnowledge(params.data);

        case 'text_diff':
          return handleTextDiff();

        case 'cron':
          return handleCron(params.data || params.timeDesc);

        case 'feedback':
          return handleFeedback();

        case 'ticket':
          return handleTicket();

        case 'todo': {
          if (!params.title) {
            return {
              success: true,
              needData: true,
              dataPrompt: '请描述要添加的待办任务（如：今日待办，任务是测试，描述是增加测试用例）',
              linkTo: 'todo',
              linkText: '打开待办管理'
            };
          }

          try {
            const todoData: Omit<TodoItem, 'id' | 'createTime'> = {
              title: params.title,
              description: params.description || '',
              status: 'pending',
              group: params.group || 'today'
            };
            await addTodo(todoData);

            const groupNames: Record<string, string> = {
              'today': '今日待办',
              'tomorrow': '明日待办',
              'nextWeek': '下周计划',
              'incomplete': '未完成'
            };

            return {
              success: true,
              data: `已添加待办任务：${params.title}\n分组：${groupNames[params.group || 'today'] || '今日待办'}${params.description ? `\n描述：${params.description}` : ''}`,
              linkTo: 'todo',
              linkText: '查看待办'
            };
          } catch (e: any) {
            return {
              success: false,
              error: `添加待办失败：${e.message}`
            };
          }
        }

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

async function handleKnowledge(query?: string): Promise<ToolResult> {
  if (!query) {
    return {
      success: true,
      needData: true,
      dataPrompt: '请输入您的问题，我将根据知识库回答',
      linkTo: 'knowledge-base',
      linkText: '打开知识库'
    };
  }

  // 执行知识库查询
  const result = await queryKnowledge(query);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      linkTo: 'knowledge-base',
      linkText: '打开知识库'
    };
  }

  return {
    success: true,
    data: result.answer,
    summary: result.sources?.length
      ? `参考了 ${result.sources.length} 个知识片段`
      : undefined
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

function handleCron(timeDesc?: string): ToolResult {
  if (!timeDesc) {
    return {
      success: true,
      needData: true,
      dataPrompt: '请描述定时任务的执行周期（如：每天早上8点、每周一上午10点）',
      linkTo: 'cron',
      linkText: '打开Cron工具'
    };
  }

  // 解析时间描述并生成cron表达式
  const cronExpr = parseTimeToCron(timeDesc);

  if (cronExpr) {
    return {
      success: true,
      data: `Cron表达式: ${cronExpr}\n\n说明: ${timeDesc}`,
      showInDialog: true
    };
  }

  return {
    success: false,
    error: `无法解析时间描述: "${timeDesc}"，请使用更清晰的描述`,
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