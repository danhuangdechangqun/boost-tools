import React, { useState, useMemo } from 'react';
import { Button, Select, Card, message, List, Tag, Input } from 'antd';
import { ArrowLeft, Copy, Clock, Sparkles } from 'lucide-react';
import { callLlm } from '@/services/llm';

interface CronPageProps {
  onBack: () => void;
}

const presets = [
  { label: '每分钟', value: '0 * * * * ?' },
  { label: '每小时', value: '0 0 * * * ?' },
  { label: '每天0点', value: '0 0 0 * * ?' },
  { label: '每天9点', value: '0 0 9 * * ?' },
  { label: '每周一9点', value: '0 0 9 ? * MON' },
  { label: '每月1号', value: '0 0 0 1 * ?' },
  { label: '工作日9点', value: '0 0 9 ? * MON-FRI' },
];

// 解析单个字段值（支持数字、*、?）
const parseField = (field: string, current: number): boolean => {
  if (field === '*' || field === '?') return true;
  const num = parseInt(field);
  if (isNaN(num)) return false;
  return num === current;
};

// 解析周字段（支持MON、MON-FRI等）
const parseWeek = (week: string, currentDay: number): boolean => {
  if (week === '*' || week === '?') return true;
  const weekMap: Record<string, number> = {
    'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6
  };
  // 支持范围如 MON-FRI
  if (week.includes('-')) {
    const [start, end] = week.split('-');
    const startVal = weekMap[start] ?? 1;
    const endVal = weekMap[end] ?? 5;
    return currentDay >= startVal && currentDay <= endVal;
  }
  return weekMap[week] === currentDay;
};

// 计算下N次执行时间（优化算法，按时间单位跳跃）
const getNextRunTimes = (expression: string, count: number = 5): Date[] => {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 6) return [];

  const [second, minute, hour, day, month, week] = parts;
  const results: Date[] = [];
  let current = new Date();
  current.setMilliseconds(0);

  // 从下一个匹配的秒开始
  if (second !== '*' && second !== '?') {
    const targetSecond = parseInt(second);
    if (!isNaN(targetSecond)) {
      if (current.getSeconds() >= targetSecond) {
        current.setMinutes(current.getMinutes() + 1);
      }
      current.setSeconds(targetSecond);
    }
  } else {
    current.setSeconds(current.getSeconds() + 1);
  }

  // 最大尝试次数（约365天的秒数）
  const maxAttempts = 365 * 24 * 60 * 60;

  for (let i = 0; i < maxAttempts && results.length < count; i++) {
    // 根据表达式特点跳跃，而不是逐秒检查
    const s = current.getSeconds();
    const m = current.getMinutes();
    const h = current.getHours();
    const d = current.getDate();
    const mo = current.getMonth() + 1;
    const w = current.getDay();

    // 检查是否匹配
    const secondMatch = parseField(second, s);
    const minuteMatch = parseField(minute, m);
    const hourMatch = parseField(hour, h);
    const dayMatch = parseField(day, d);
    const monthMatch = parseField(month, mo);
    const weekMatch = parseWeek(week, w);

    if (secondMatch && minuteMatch && hourMatch && dayMatch && monthMatch && weekMatch) {
      results.push(new Date(current));
    }

    // 智能跳跃：根据哪些字段是固定值决定跳跃步长
    if (!secondMatch) {
      // 秒不匹配，跳到下一个可能的秒
      if (second !== '*' && second !== '?') {
        current.setSeconds(parseInt(second));
      } else {
        current.setSeconds(s + 1);
      }
    } else if (!minuteMatch) {
      // 秒匹配但分不匹配，跳到下一分钟
      current.setMinutes(m + 1);
      if (second !== '*' && second !== '?') {
        current.setSeconds(parseInt(second));
      } else {
        current.setSeconds(0);
      }
    } else if (!hourMatch) {
      // 分秒匹配但时不匹配，跳到下一小时
      current.setHours(h + 1);
      current.setMinutes(0);
      if (second !== '*' && second !== '?') {
        current.setSeconds(parseInt(second));
      } else {
        current.setSeconds(0);
      }
    } else if (!dayMatch || !monthMatch) {
      // 时匹配但日/月不匹配，跳到下一天
      current.setDate(d + 1);
      current.setHours(0);
      current.setMinutes(0);
      if (second !== '*' && second !== '?') {
        current.setSeconds(parseInt(second));
      } else {
        current.setSeconds(0);
      }
    } else if (!weekMatch) {
      // 日月匹配但周不匹配，跳到下一天
      current.setDate(d + 1);
      current.setHours(0);
      current.setMinutes(0);
      if (second !== '*' && second !== '?') {
        current.setSeconds(parseInt(second));
      } else {
        current.setSeconds(0);
      }
    } else {
      // 全匹配，但已添加结果，跳到下一秒继续找下一个
      current.setSeconds(s + 1);
    }
  }

  return results;
};

const formatDateTime = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const CronPage: React.FC<CronPageProps> = ({ onBack }) => {
  const [second, setSecond] = useState('0');
  const [minute, setMinute] = useState('*');
  const [hour, setHour] = useState('*');
  const [day, setDay] = useState('*');
  const [month, setMonth] = useState('*');
  const [week, setWeek] = useState('?');
  const [naturalLanguage, setNaturalLanguage] = useState('');
  const [generating, setGenerating] = useState(false);

  const expression = useMemo(() => `${second} ${minute} ${hour} ${day} ${month} ${week}`, [second, minute, hour, day, month, week]);

  // 计算下5次执行时间
  const nextTimes = useMemo(() => getNextRunTimes(expression, 5), [expression]);

  const generateOptions = (max: number) =>
    Array.from({ length: max + 1 }, (_, i) => ({ label: String(i), value: String(i) }));

  const allOption = [{ label: '*', value: '*' }, { label: '?', value: '?' }];

  const getDescription = () => {
    const parts = [];
    if (second !== '*' && second !== '?') parts.push(`每分钟的${second}秒`);
    if (minute !== '*' && minute !== '?') parts.push(`每小时的${minute}分`);
    if (hour !== '*' && hour !== '?') parts.push(`每天的${hour}点`);
    if (day !== '*' && day !== '?') parts.push(`每月的${day}日`);
    if (month !== '*' && month !== '?') parts.push(`${month}月`);
    if (week !== '?' && week !== '*') parts.push(`每${week}`);
    return parts.length > 0 ? parts.join('，') : '每一秒';
  };

  // 自然语言生成Cron表达式
  const handleNaturalLanguageGenerate = async () => {
    if (!naturalLanguage.trim()) {
      message.warning('请输入自然语言描述');
      return;
    }

    setGenerating(true);
    try {
      const prompt = `你是一个Cron表达式专家。请根据用户的自然语言描述生成一个标准的6位Cron表达式（格式：秒 分 时 日 月 周）。

用户描述：${naturalLanguage}

请直接返回Cron表达式，格式为6个字段用空格分隔。例如：
- 每分钟执行：0 * * * * ?
- 每小时执行：0 0 * * * ?
- 每天凌晨1点执行：0 0 1 * * ?
- 每周一上午9点执行：0 0 9 ? * MON
- 每月1号凌晨0点执行：0 0 0 1 * ?
- 工作日（周一到周五）上午9点执行：0 0 9 ? * MON-FRI

注意：
- 秒字段通常是0（表示整秒）
- 日和周字段不能同时为有效值，其中一个必须用?表示"不指定"
- 周字段使用英文缩写：SUN, MON, TUE, WED, THU, FRI, SAT
- 范围用-连接，如MON-FRI表示周一到周五

只返回Cron表达式本身，不要其他解释。`;

      const result = await callLlm(prompt, { maxTokens: 100 });
      if (result.success && result.content) {
        // 提取Cron表达式（可能包含markdown代码块）
        let cronExpr = result.content.trim();
        // 去除可能的markdown格式
        cronExpr = cronExpr.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim();
        // 验证格式
        const parts = cronExpr.split(/\s+/);
        if (parts.length === 6) {
          const [s, m, h, d, mo, w] = parts;
          setSecond(s); setMinute(m); setHour(h); setDay(d); setMonth(mo); setWeek(w);
          message.success('生成成功');
        } else {
          message.error('生成的表达式格式不正确');
        }
      } else {
        message.error(result.error || '生成失败');
      }
    } catch (e: any) {
      message.error(e.message || '生成失败');
    }
    setGenerating(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>Cron表达式生成器</h3>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {/* 自然语言生成 */}
        <Card title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} />
            <span>自然语言生成</span>
          </div>
        } style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              placeholder="例如：每月凌晨1点整执行、每周三下午3点半执行..."
              value={naturalLanguage}
              onChange={(e) => setNaturalLanguage(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              loading={generating}
              onClick={handleNaturalLanguageGenerate}
            >
              AI生成
            </Button>
          </div>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
            用自然语言描述执行时间，AI会自动生成对应的Cron表达式
          </p>
        </Card>

        <Card title="预设" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {presets.map(p => (
              <Button key={p.label} onClick={() => {
                const [s, m, h, d, mo, w] = p.value.split(' ');
                setSecond(s); setMinute(m); setHour(h); setDay(d); setMonth(mo); setWeek(w);
              }}>{p.label}</Button>
            ))}
          </div>
        </Card>

        <Card title="自定义" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>秒</label>
              <Select value={second} onChange={setSecond} style={{ width: 80 }} options={[...allOption, ...generateOptions(59)]} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>分</label>
              <Select value={minute} onChange={setMinute} style={{ width: 80 }} options={[...allOption, ...generateOptions(59)]} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>时</label>
              <Select value={hour} onChange={setHour} style={{ width: 80 }} options={[...allOption, ...generateOptions(23)]} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>日</label>
              <Select value={day} onChange={setDay} style={{ width: 80 }} options={[...allOption, ...generateOptions(31)]} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>月</label>
              <Select value={month} onChange={setMonth} style={{ width: 80 }} options={[...allOption, ...generateOptions(12)]} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>周</label>
              <Select value={week} onChange={setWeek} style={{ width: 80 }} options={[
                { label: '?', value: '?' },
                { label: '周一', value: 'MON' },
                { label: '周二', value: 'TUE' },
                { label: '周三', value: 'WED' },
                { label: '周四', value: 'THU' },
                { label: '周五', value: 'FRI' },
                { label: '周六', value: 'SAT' },
                { label: '周日', value: 'SUN' },
              ]} />
            </div>
          </div>
        </Card>

        {/* 下五次执行时间 */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} />
              <span>下5次执行时间</span>
            </div>
          }
          style={{ marginBottom: 16 }}
        >
          <List
            dataSource={nextTimes}
            renderItem={(date, index) => (
              <List.Item>
                <Tag color="blue">第{index + 1}次</Tag>
                <span style={{ fontFamily: 'monospace', marginLeft: 8 }}>{formatDateTime(date)}</span>
              </List.Item>
            )}
          />
          {nextTimes.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>
              无效的Cron表达式
            </div>
          )}
        </Card>
      </div>

      <div style={{ padding: 16, borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 18, marginBottom: 8 }}>{expression}</div>
            <div style={{ color: '#6B7280' }}>{getDescription()}</div>
          </div>
          <Button type="primary" icon={<Copy size={16} />} onClick={() => { navigator.clipboard.writeText(expression); message.success('已复制'); }}>生成Cron表达式</Button>
        </div>
      </div>
    </div>
  );
};

export default CronPage;