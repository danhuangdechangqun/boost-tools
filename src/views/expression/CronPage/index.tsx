import React, { useState, useMemo } from 'react';
import { Button, Select, Card, message } from 'antd';
import { ArrowLeft, Copy } from 'lucide-react';

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

const CronPage: React.FC<CronPageProps> = ({ onBack }) => {
  const [second, setSecond] = useState('0');
  const [minute, setMinute] = useState('*');
  const [hour, setHour] = useState('*');
  const [day, setDay] = useState('*');
  const [month, setMonth] = useState('*');
  const [week, setWeek] = useState('?');

  const expression = useMemo(() => `${second} ${minute} ${hour} ${day} ${month} ${week}`, [second, minute, hour, day, month, week]);

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>Cron表达式生成器</h3>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
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

        <Card title="自定义">
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
      </div>

      <div style={{ padding: 16, borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 18, marginBottom: 8 }}>{expression}</div>
            <div style={{ color: '#6B7280' }}>{getDescription()}</div>
          </div>
          <Button type="primary" icon={<Copy size={16} />} onClick={() => { navigator.clipboard.writeText(expression); message.success('已复制'); }}>复制</Button>
        </div>
      </div>
    </div>
  );
};

export default CronPage;