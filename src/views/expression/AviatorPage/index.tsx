import React, { useState } from 'react';
import { Button, Input, Card, message, Spin, Divider } from 'antd';
import { ArrowLeft, Copy, Sparkles, Wand2 } from 'lucide-react';
import { callLlm } from '@/services/api';

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
  { label: 'string.contains', value: 'string.contains(str, substr)' },
  { label: 'string.length', value: 'string.length(str)' },
  { label: 'string.startsWith', value: 'string.startsWith(str, prefix)' },
  { label: 'string.endsWith', value: 'string.endsWith(str, suffix)' },
  { label: 'math.abs', value: 'math.abs(num)' },
  { label: 'math.round', value: 'math.round(num)' },
  { label: 'seq.contains', value: 'seq.contains(list, item)' },
  { label: 'date.now', value: 'date.now()' },
];

const examples = [
  '当用户年龄大于18且状态为激活时返回true',
  '判断字符串是否包含"error"关键字',
  '当金额大于1000且小于10000时，或者VIP等级为3时返回true',
  '判断邮箱是否以"@company.com"结尾',
  '当订单状态为"paid"且支付金额大于0时返回true',
];

const AviatorPage: React.FC<AviatorPageProps> = ({ onBack }) => {
  const [expression, setExpression] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [naturalInput, setNaturalInput] = useState('');
  const [llmLoading, setLlmLoading] = useState(false);

  const appendOperator = (value: string) => {
    setExpression(expression + value);
  };

  const appendField = () => {
    if (fieldName) {
      setExpression(expression + fieldName);
      setFieldName('');
    }
  };

  // LLM生成表达式
  const generateByLLM = async () => {
    if (!naturalInput.trim()) {
      message.warning('请输入自然语言描述');
      return;
    }

    setLlmLoading(true);
    try {
      const prompt = `你是一个Aviator表达式专家。请根据用户的自然语言描述，生成对应的Aviator表达式。

规则：
1. 只输出表达式本身，不要解释
2. 使用常见的字段名如 age, status, amount, name, type 等
3. 字符串使用双引号
4. 布尔值使用 true/false

用户描述：${naturalInput}

请输出Aviator表达式：`;

      const result = await callLlm(prompt);
      const generated = result.trim();
      // 如果表达式包含markdown代码块，提取其中的内容
      const match = generated.match(/```(?:aviator)?\s*([\s\S]*?)```/);
      const finalExpr = match ? match[1].trim() : generated;
      setExpression(finalExpr);
      message.success('表达式生成成功');
    } catch (e: any) {
      message.error('生成失败: ' + (e?.message || e));
    }
    setLlmLoading(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>Aviator表达式生成器</h3>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {/* LLM自然语言生成区域 */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wand2 size={16} color="#8B5CF6" />
              <span>AI智能生成</span>
            </div>
          }
          style={{ marginBottom: 16 }}
          extra={
            <Spin spinning={llmLoading} size="small" />
          }
        >
          <Input.TextArea
            rows={3}
            value={naturalInput}
            onChange={(e) => setNaturalInput(e.target.value)}
            placeholder="用自然语言描述你想要的表达式，例如：当用户年龄大于18且状态为激活时返回true"
            style={{ marginBottom: 12 }}
          />
          <Button
            type="primary"
            icon={<Sparkles size={14} />}
            onClick={generateByLLM}
            loading={llmLoading}
          >
            AI生成表达式
          </Button>
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>示例：</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {examples.map((ex, i) => (
                <Button
                  key={i}
                  size="small"
                  onClick={() => setNaturalInput(ex)}
                  style={{ fontSize: 11 }}
                >
                  {ex.substring(0, 20)}...
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <Divider>或手动拼接</Divider>

        {/* 手动拼接区域 */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <Card title="字段" style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input placeholder="字段名" value={fieldName} onChange={(e) => setFieldName(e.target.value)} style={{ flex: 1 }} />
              <Button type="primary" onClick={appendField}>添加</Button>
            </div>
          </Card>

          <Card title="运算符" style={{ flex: 2 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {operators.map(op => (
                <Button key={op.label} size="small" onClick={() => appendOperator(op.value)}>{op.label}</Button>
              ))}
            </div>
          </Card>
        </div>

        <Card title="常用函数" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {functions.map(fn => (
              <Button key={fn.label} size="small" onClick={() => setExpression(expression + fn.value)}>{fn.label}</Button>
            ))}
          </div>
        </Card>

        {/* 表达式结果区域 */}
        <Card title="生成的表达式">
          <Input.TextArea
            rows={4}
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="点击上方按钮拼接表达式，或使用AI生成..."
            style={{ fontFamily: 'monospace', fontSize: 14 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button
              type="primary"
              icon={<Copy size={14} />}
              onClick={() => {
                if (!expression) {
                  message.warning('表达式为空');
                  return;
                }
                navigator.clipboard.writeText(expression);
                message.success('已复制');
              }}
            >
              复制表达式
            </Button>
            <Button onClick={() => setExpression('')}>清空</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AviatorPage;