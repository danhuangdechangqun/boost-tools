import React, { useState, useMemo } from 'react';
import { Button, Input, Card } from 'antd';
import { ArrowLeft } from 'lucide-react';

interface TextComparePageProps {
  onBack: () => void;
}

const TextComparePage: React.FC<TextComparePageProps> = ({ onBack }) => {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');

  const diff = useMemo(() => {
    const leftLines = leftText.split('\n');
    const rightLines = rightText.split('\n');
    const maxLen = Math.max(leftLines.length, rightLines.length);
    const result: { left: { num: number; content: string; type: string }[]; right: { num: number; content: string; type: string }[] } = { left: [], right: [] };

    for (let i = 0; i < maxLen; i++) {
      const leftLine = leftLines[i] || '';
      const rightLine = rightLines[i] || '';
      const type = leftLine === rightLine ? 'equal' : leftLines[i] === undefined ? 'add' : rightLines[i] === undefined ? 'delete' : 'modify';

      result.left.push({ num: i + 1, content: leftLine, type: leftLines[i] === undefined ? '' : type });
      result.right.push({ num: i + 1, content: rightLine, type: rightLines[i] === undefined ? '' : type === 'equal' ? 'equal' : 'modify' });
    }

    return result;
  }, [leftText, rightText]);

  const getBgColor = (type: string) => {
    switch (type) {
      case 'add': return '#D4EDDA';
      case 'delete': return '#F8D7DA';
      case 'modify': return '#FFF3CD';
      default: return 'transparent';
    }
  };

  const renderLines = (lines: { num: number; content: string; type: string }[]) => (
    <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
      {lines.map((line, i) => (
        <div key={i} style={{ display: 'flex', background: getBgColor(line.type), borderBottom: '1px solid #E5E7EB' }}>
          <span style={{ width: 40, color: '#9CA3AF', padding: '2px 8px', background: '#F9FAFB', textAlign: 'right' }}>{line.num}</span>
          <span style={{ padding: '2px 8px', whiteSpace: 'pre', flex: 1 }}>{line.content}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>文本比较</h3>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <Input.TextArea rows={6} value={leftText} onChange={(e) => setLeftText(e.target.value)} placeholder="左侧文本" />
          <Input.TextArea rows={6} value={rightText} onChange={(e) => setRightText(e.target.value)} placeholder="右侧文本" />
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <Card title="左侧" style={{ flex: 1 }} styles={{ body: { padding: 0 } }}>
            {renderLines(diff.left)}
          </Card>
          <Card title="右侧" style={{ flex: 1 }} styles={{ body: { padding: 0 } }}>
            {renderLines(diff.right)}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TextComparePage;