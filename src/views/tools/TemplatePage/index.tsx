import React, { useState } from 'react';
import { Button, Input, Card, message, Select } from 'antd';
import { ArrowLeft, Copy } from 'lucide-react';

interface TemplatePageProps {
  onBack: () => void;
}

const modes = [
  { value: 'sql', label: 'SQL IN格式' },
  { value: 'prefix', label: '添加前缀/后缀' },
  { value: 'number', label: '编号添加' },
];

const TemplatePage: React.FC<TemplatePageProps> = ({ onBack }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState('sql');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');

  const transform = () => {
    const lines = input.split('\n').filter(l => l.trim());
    let result = '';

    switch (mode) {
      case 'sql':
        result = lines.map(l => `'${l.trim()}'`).join(',');
        break;
      case 'prefix':
        result = lines.map(l => `${prefix}${l.trim()}${suffix}`).join('\n');
        break;
      case 'number':
        result = lines.map((l, i) => `${i + 1}. ${l.trim()}`).join('\n');
        break;
    }

    setOutput(result);
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>数据填充模板</h3>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto', display: 'flex', gap: 16 }}>
        <Card title="输入" style={{ flex: 1 }}>
          <Input.TextArea rows={10} value={input} onChange={(e) => setInput(e.target.value)} placeholder="每行一条数据" />
        </Card>

        <Card title="选项" style={{ width: 250 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>转换模式</label>
            <Select value={mode} onChange={setMode} options={modes} style={{ width: '100%' }} />
          </div>
          {mode === 'prefix' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>前缀</label>
                <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>后缀</label>
                <Input value={suffix} onChange={(e) => setSuffix(e.target.value)} />
              </div>
            </>
          )}
          <Button type="primary" block onClick={transform}>转换</Button>
        </Card>

        <Card title="输出" style={{ flex: 1 }} extra={<Button icon={<Copy size={14} />} onClick={() => { navigator.clipboard.writeText(output); message.success('已复制'); }}>复制</Button>}>
          <Input.TextArea rows={10} value={output} readOnly style={{ fontFamily: 'monospace' }} />
        </Card>
      </div>
    </div>
  );
};

export default TemplatePage;