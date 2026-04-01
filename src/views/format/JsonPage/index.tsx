import React, { useState } from 'react';
import { Button, Input, Card, message, Select } from 'antd';
import { ArrowLeft, Copy, Check, Minimize2 } from 'lucide-react';

interface JsonPageProps {
  onBack: () => void;
}

const JsonPage: React.FC<JsonPageProps> = ({ onBack }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [indent, setIndent] = useState(2);

  const format = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
      setError('');
      message.success('格式化成功');
    } catch (e: any) {
      setError('JSON语法错误: ' + e.message);
      setOutput('');
    }
  };

  const compress = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError('');
      message.success('压缩成功');
    } catch (e: any) {
      setError('JSON语法错误: ' + e.message);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>JSON美化</h3>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto', display: 'flex', gap: 16 }}>
        <Card title="输入" style={{ flex: 1 }}>
          <Input.TextArea
            rows={15}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='{"name": "value"}'
            style={{ fontFamily: 'monospace' }}
          />
        </Card>

        <Card title="输出" style={{ flex: 1 }} extra={
          <Button icon={<Copy size={14} />} onClick={() => { navigator.clipboard.writeText(output); message.success('已复制'); }}>复制</Button>
        }>
          {error ? (
            <div style={{ color: '#DC2626', padding: 16, background: '#FEF2F2', borderRadius: 8 }}>{error}</div>
          ) : (
            <pre style={{ background: '#F9FAFB', padding: 12, borderRadius: 8, maxHeight: 400, overflow: 'auto', fontFamily: 'monospace' }}>
              {output || '输出结果'}
            </pre>
          )}
        </Card>
      </div>

      <div style={{ padding: 16, borderTop: '1px solid #E5E7EB', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>缩进:</span>
        <Select value={indent} onChange={setIndent} style={{ width: 100 }}>
          <Select.Option value={2}>2空格</Select.Option>
          <Select.Option value={4}>4空格</Select.Option>
          <Select.Option value={'\t'}>Tab</Select.Option>
        </Select>
        <Button type="primary" icon={<Check size={14} />} onClick={format}>格式化</Button>
        <Button icon={<Minimize2 size={14} />} onClick={compress}>压缩</Button>
      </div>
    </div>
  );
};

export default JsonPage;