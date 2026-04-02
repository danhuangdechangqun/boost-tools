import React, { useState } from 'react';
import { Button, Input, Card, message, InputNumber, Switch, List } from 'antd';
import { ArrowLeft, Copy, RefreshCw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface UuidPageProps {
  onBack: () => void;
}

const UuidPage: React.FC<UuidPageProps> = ({ onBack }) => {
  const [count, setCount] = useState(1);
  const [uppercase, setUppercase] = useState(false);
  const [keepHyphen, setKeepHyphen] = useState(true);
  const [prefix, setPrefix] = useState('');
  const [uuids, setUuids] = useState<string[]>([]);

  const generate = () => {
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      let uuid = uuidv4();
      if (!keepHyphen) uuid = uuid.replace(/-/g, '');
      if (uppercase) uuid = uuid.toUpperCase();
      // 添加前缀
      if (prefix) {
        uuid = prefix + uuid;
      }
      results.push(uuid);
    }
    setUuids(results);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(uuids.join('\n'));
    message.success('已复制全部');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>UUID生成器</h3>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto', display: 'flex', gap: 16 }}>
        <Card title="选项" style={{ width: 320 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>生成条数</label>
            <InputNumber min={1} max={100} value={count} onChange={(v) => setCount(v || 1)} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>自定义前缀</label>
            <Input
              placeholder="如 user_、order- 等"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>大写</label>
            <Switch checked={uppercase} onChange={setUppercase} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>保留横线</label>
            <Switch checked={keepHyphen} onChange={setKeepHyphen} />
          </div>
          <Button type="primary" icon={<RefreshCw size={14} />} onClick={generate} block>生成</Button>
        </Card>

        <Card title="结果" style={{ flex: 1 }} extra={uuids.length > 0 && <Button icon={<Copy size={14} />} onClick={copyAll}>复制全部</Button>}>
          <List
            dataSource={uuids}
            renderItem={(item) => (
              <List.Item extra={<Button size="small" icon={<Copy size={12} />} onClick={() => { navigator.clipboard.writeText(item); message.success('已复制'); }} />}>
                <code style={{ fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all' }}>{item}</code>
              </List.Item>
            )}
          />
          {uuids.length === 0 && <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>点击生成按钮生成UUID</div>}
        </Card>
      </div>
    </div>
  );
};

export default UuidPage;