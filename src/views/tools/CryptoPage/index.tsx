import React, { useState } from 'react';
import { Button, Input, Card, message } from 'antd';
import { ArrowLeft, Copy } from 'lucide-react';
import CryptoJS from 'crypto-js';

interface CryptoPageProps {
  onBack: () => void;
}

const CryptoPage: React.FC<CryptoPageProps> = ({ onBack }) => {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<{ algo: string; hash: string }[]>([]);

  const calculate = () => {
    if (!input) {
      message.warning('请输入文本');
      return;
    }
    setResults([
      { algo: 'MD5', hash: CryptoJS.MD5(input).toString() },
      { algo: 'SHA-1', hash: CryptoJS.SHA1(input).toString() },
      { algo: 'SHA-256', hash: CryptoJS.SHA256(input).toString() },
      { algo: 'SHA-512', hash: CryptoJS.SHA512(input).toString() },
    ]);
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>加密工具</h3>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        <Card style={{ marginBottom: 16 }}>
          <Input.TextArea rows={4} value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入待加密文本" />
          <Button type="primary" style={{ marginTop: 8 }} onClick={calculate}>计算哈希</Button>
        </Card>

        {results.map(({ algo, hash }) => (
          <Card key={algo} title={algo} style={{ marginBottom: 8 }} extra={<Button icon={<Copy size={14} />} onClick={() => { navigator.clipboard.writeText(hash); message.success('已复制'); }}>复制</Button>}>
            <code style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{hash}</code>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CryptoPage;