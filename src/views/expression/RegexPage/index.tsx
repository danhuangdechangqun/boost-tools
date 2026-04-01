import React, { useState } from 'react';
import { Button, Card, Input, message } from 'antd';
import { ArrowLeft, Copy } from 'lucide-react';

interface RegexPageProps {
  onBack: () => void;
}

const presets = [
  { name: '中文字符', pattern: '[\\u4e00-\\u9fa5]' },
  { name: '双字节字符', pattern: '[^\\x00-\\xff]' },
  { name: '空白行', pattern: '\\n\\s*\\r' },
  { name: 'Email地址', pattern: '\\w+([-+.\\w+)*@\\w+([-.\\w+)*\\.\\w+([-.\\w+)*' },
  { name: '网址URL', pattern: '[a-zA-z]+://[^\\s]*' },
  { name: '国内电话', pattern: '\\d{3}-\\d{8}|\\d{4}-\\d{7}' },
  { name: 'QQ号', pattern: '[1-9][0-9]{4,}' },
  { name: '邮政编码', pattern: '[1-9]\\d{5}(?!\\d)' },
  { name: '身份证号', pattern: '\\d{17}[\\d|x|X]' },
  { name: '日期(年-月-日)', pattern: '\\d{4}-\\d{1,2}-\\d{1,2}' },
  { name: '正整数', pattern: '[1-9]\\d*' },
  { name: '负整数', pattern: '-[1-9]\\d*' },
  { name: '整数', pattern: '-?[1-9]\\d*' },
  { name: '非负整数', pattern: '[1-9]\\d*|0' },
  { name: '正浮点数', pattern: '[1-9]\\d*\\.\\d*|0\\.\\d*[1-9]\\d*' },
  { name: '负浮点数', pattern: '-[1-9]\\d*\\.\\d*|-0\\.\\d*[1-9]\\d*' },
  { name: 'IP地址', pattern: '\\d+\\.\\d+\\.\\d+\\.\\d+' },
];

const RegexPage: React.FC<RegexPageProps> = ({ onBack }) => {
  const [pattern, setPattern] = useState('');
  const [testText, setTestText] = useState('');
  const [matchResult, setMatchResult] = useState<string[]>([]);

  const testPattern = () => {
    try {
      const regex = new RegExp(pattern, 'g');
      const matches = testText.match(regex) || [];
      setMatchResult(matches);
      message.success(`匹配到 ${matches.length} 个结果`);
    } catch (e: any) {
      message.error('正则表达式语法错误');
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>正则表达式生成器</h3>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        <Card title="常用预设" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {presets.map(p => (
              <Button key={p.name} onClick={() => setPattern(p.pattern)}>{p.name}</Button>
            ))}
          </div>
        </Card>

        <Card title="表达式">
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="选择预设或手动输入正则表达式"
              style={{ fontFamily: 'monospace' }}
            />
            <Button type="primary" icon={<Copy size={14} />} onClick={() => { navigator.clipboard.writeText(pattern); message.success('已复制'); }}>复制</Button>
          </div>
        </Card>

        <Card title="测试" style={{ marginTop: 16 }}>
          <Input.TextArea
            rows={4}
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="输入测试文本"
          />
          <Button type="primary" style={{ marginTop: 8 }} onClick={testPattern}>测试匹配</Button>
          {matchResult.length > 0 && (
            <div style={{ marginTop: 8, padding: 8, background: '#D4EDDA', borderRadius: 4 }}>
              匹配结果: {matchResult.map((m, i) => <span key={i} style={{ margin: '0 4px', padding: '2px 6px', background: '#28A745', color: 'white', borderRadius: 4 }}>{m}</span>)}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default RegexPage;