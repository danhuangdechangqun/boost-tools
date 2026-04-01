import React, { useState } from 'react';
import { Button, Input, Card, message } from 'antd';
import { ArrowLeft, Copy } from 'lucide-react';

interface AviatorPageProps {
  onBack: () => void;
}

const operators = [
  { label: '>', value: ' > ' },
  { label: '>=', value: ' >= ' },
  { label: '<', value: ' < ' },
  { label: '<=', value: ' <= ' },
  { label: '==', value: ' == ' },
  { label: '!=', value: ' != ' },
  { label: '&&', value: ' && ' },
  { label: '||', value: ' || ' },
  { label: '!', value: '!' },
  { label: '+', value: ' + ' },
  { label: '-', value: ' - ' },
  { label: '*', value: ' * ' },
  { label: '/', value: ' / ' },
  { label: '(', value: '(' },
  { label: ')', value: ')' },
];

const functions = [
  { label: 'string.contains', value: 'string.contains(, )' },
  { label: 'string.length', value: 'string.length()' },
  { label: 'string.startsWith', value: 'string.startsWith(, )' },
  { label: 'string.endsWith', value: 'string.endsWith(, )' },
];

const AviatorPage: React.FC<AviatorPageProps> = ({ onBack }) => {
  const [expression, setExpression] = useState('');
  const [fieldName, setFieldName] = useState('');

  const appendOperator = (value: string) => {
    setExpression(expression + value);
  };

  const appendField = () => {
    if (fieldName) {
      setExpression(expression + fieldName);
      setFieldName('');
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>Aviator表达式生成器</h3>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto', display: 'flex', gap: 16 }}>
        <Card title="字段" style={{ width: 200 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Input placeholder="字段名" value={fieldName} onChange={(e) => setFieldName(e.target.value)} />
            <Button type="primary" onClick={appendField}>添加</Button>
          </div>
        </Card>

        <Card title="运算符" style={{ width: 300 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {operators.map(op => (
              <Button key={op.label} onClick={() => appendOperator(op.value)}>{op.label}</Button>
            ))}
          </div>
        </Card>

        <Card title="常用函数" style={{ width: 250 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {functions.map(fn => (
              <Button key={fn.label} onClick={() => setExpression(expression + fn.value)}>{fn.label}</Button>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ padding: 16, borderTop: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input.TextArea
            rows={3}
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="点击上方按钮拼接表达式..."
          />
          <Button type="primary" icon={<Copy size={16} />} onClick={() => { navigator.clipboard.writeText(expression); message.success('已复制'); }}>复制</Button>
          <Button onClick={() => setExpression('')}>清空</Button>
        </div>
      </div>
    </div>
  );
};

export default AviatorPage;