import React, { useState } from 'react';
import { Button, Input, Select, message, Spin, Card } from 'antd';
import { ArrowLeft, Plus, Trash2, Copy, Play } from 'lucide-react';
import { callLlm } from '@/services/api';

interface FakeDataPageProps {
  onBack: () => void;
}

interface Field {
  name: string;
  description: string;
}

const FakeDataPage: React.FC<FakeDataPageProps> = ({ onBack }) => {
  const [fields, setFields] = useState<Field[]>([{ name: '', description: '' }]);
  const [count, setCount] = useState(5);
  const [format, setFormat] = useState<'json' | 'tsv'>('json');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const addField = () => {
    setFields([...fields, { name: '', description: '' }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: 'name' | 'description', value: string) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    setFields(newFields);
  };

  const generate = async () => {
    const validFields = fields.filter(f => f.name && f.description);
    if (validFields.length === 0) {
      message.error('请至少添加一个字段');
      return;
    }

    setLoading(true);
    const prompt = `请生成${count}条测试数据，字段如下：
${validFields.map(f => `- ${f.name}: ${f.description}`).join('\n')}
输出格式：${format === 'json' ? 'JSON数组' : '制表符分隔的表格（每行一条数据，列名在第一行，使用真实Tab字符分隔列）'}
要求：直接输出数据，不要额外的说明文字。`;

    try {
      const content = await callLlm(prompt);
      setResult(content);
    } catch (e: any) {
      message.error(e?.message || '生成失败');
    }
    setLoading(false);
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>假数据生成</h3>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto', display: 'flex', gap: 16 }}>
        <div style={{ width: 400 }}>
          <Card title="字段定义" style={{ marginBottom: 16 }}>
            {fields.map((field, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Input
                  placeholder="字段名"
                  value={field.name}
                  onChange={(e) => updateField(index, 'name', e.target.value)}
                  style={{ width: 100 }}
                />
                <Input
                  placeholder="描述（如：中文姓名）"
                  value={field.description}
                  onChange={(e) => updateField(index, 'description', e.target.value)}
                  style={{ flex: 1 }}
                />
                {fields.length > 1 && (
                  <Button danger icon={<Trash2 size={14} />} onClick={() => removeField(index)} />
                )}
              </div>
            ))}
            <Button icon={<Plus size={14} />} onClick={addField} style={{ marginTop: 8 }}>添加字段</Button>
          </Card>

          <Card title="选项">
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>生成条数</label>
              <Input type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 100 }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>输出格式</label>
              <Select value={format} onChange={setFormat} style={{ width: 200 }}>
                <Select.Option value="json">JSON</Select.Option>
                <Select.Option value="tsv">TSV表格（可粘贴Excel）</Select.Option>
              </Select>
            </div>
            <Button type="primary" icon={<Play size={14} />} onClick={generate} loading={loading}>生成数据</Button>
          </Card>
        </div>

        <div style={{ flex: 1 }}>
          <Card
            title="生成结果"
            extra={<Button icon={<Copy size={14} />} onClick={() => { navigator.clipboard.writeText(result); message.success('已复制'); }}>复制</Button>}
          >
            {loading ? <Spin /> : (
              <pre style={{ background: '#F9FAFB', padding: 16, borderRadius: 8, maxHeight: 500, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                {result || '点击"生成数据"按钮生成假数据'}
              </pre>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FakeDataPage;