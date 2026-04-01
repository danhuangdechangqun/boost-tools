import React, { useState } from 'react';
import { Button, Upload, message, Spin, Card, List } from 'antd';
import { ArrowLeft, Upload as UploadIcon, Copy } from 'lucide-react';
import { callLlm } from '@/services/api';

interface FileReadPageProps {
  onBack: () => void;
}

const FileReadPage: React.FC<FileReadPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<string[]>([]);
  const [content, setContent] = useState('');

  const handleUpload = async (file: File) => {
    setLoading(true);
    setPoints([]);
    setContent('');

    try {
      const text = await file.text();
      setContent(text.substring(0, 10000));

      const prompt = `请从以下文档中提取关键重点，每条重点需标注来源位置。
输出格式：【重点N】内容描述（来源：章节/页码）

---
${text.substring(0, 8000)}`;

      const result = await callLlm(prompt);
      const lines = result.split('\n').filter((l: string) => l.trim());
      setPoints(lines);
    } catch (e: any) {
      message.error('文件读取失败: ' + (e?.message || e));
    }

    setLoading(false);
    return false;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>文件解读</h3>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        <Upload.Dragger
          accept=".txt,.md,.json,.csv"
          beforeUpload={handleUpload}
          showUploadList={false}
          style={{ marginBottom: 16 }}
        >
          <div style={{ padding: 40, textAlign: 'center' }}>
            <UploadIcon size={48} color="#3B82F6" />
            <p style={{ marginTop: 16, color: '#6B7280' }}>点击或拖拽文件到此区域</p>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>支持 TXT、MD、JSON、CSV 文件</p>
          </div>
        </Upload.Dragger>

        {loading && <Spin tip="AI正在解读文档..." />}

        {points.length > 0 && (
          <Card title="解读重点" style={{ marginTop: 16 }}>
            <List
              dataSource={points}
              renderItem={(item) => (
                <List.Item>
                  <div style={{ flex: 1 }}>
                    {item}
                    <Button
                      size="small"
                      icon={<Copy size={12} />}
                      style={{ marginLeft: 8 }}
                      onClick={() => { navigator.clipboard.writeText(item); message.success('已复制'); }}
                    />
                  </div>
                </List.Item>
              )}
            />
          </Card>
        )}
      </div>
    </div>
  );
};

export default FileReadPage;