import React, { useState } from 'react';
import { Button, Upload, message, Spin, Card, List, Progress } from 'antd';
import { ArrowLeft, Upload as UploadIcon, Copy, FileText } from 'lucide-react';
import { callLlm } from '@/services/api';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface FileReadPageProps {
  onBack: () => void;
}

const FileReadPage: React.FC<FileReadPageProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);

  // 解析PDF文件
  const parsePdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
      setProgress(Math.round((i / pdf.numPages) * 50));
    }

    return fullText;
  };

  // 解析Word文件
  const parseWord = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    setProgress(50);
    return result.value;
  };

  // 解析文本文件
  const parseText = async (file: File): Promise<string> => {
    const text = await file.text();
    setProgress(50);
    return text;
  };

  const handleUpload = async (file: File) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      message.error('文件大小超过限制（50MB）');
      return false;
    }

    setLoading(true);
    setPoints([]);
    setContent('');
    setFileName(file.name);
    setProgress(0);

    try {
      let text = '';
      const ext = file.name.split('.').pop()?.toLowerCase();

      // 根据文件类型解析
      if (ext === 'pdf') {
        message.info('正在解析PDF文件...');
        text = await parsePdf(file);
      } else if (ext === 'doc' || ext === 'docx') {
        message.info('正在解析Word文件...');
        text = await parseWord(file);
      } else if (['txt', 'md', 'json', 'csv'].includes(ext || '')) {
        text = await parseText(file);
      } else {
        message.error('不支持的文件格式，仅支持 PDF、Word、TXT、MD、JSON、CSV');
        setLoading(false);
        return false;
      }

      // 限制文本长度
      const maxLen = 12000;
      const truncatedText = text.length > maxLen ? text.substring(0, maxLen) + '\n...(内容已截断)' : text;
      setContent(truncatedText);

      setProgress(60);
      message.info('正在调用AI解读...');

      const prompt = `请从以下文档中提取关键重点，每条重点需标注来源位置。
输出格式：【重点N】内容描述（来源：章节/页码/段落）

---
${truncatedText.substring(0, 10000)}`;

      const result = await callLlm(prompt);
      setProgress(100);

      const lines = result.split('\n').filter((l: string) => l.trim());
      setPoints(lines);
      message.success('文件解读完成');
    } catch (e: any) {
      console.error('文件解读错误:', e);
      message.error('文件解读失败: ' + (e?.message || e));
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
          accept=".txt,.md,.json,.csv,.pdf,.doc,.docx"
          beforeUpload={handleUpload}
          showUploadList={false}
          style={{ marginBottom: 16 }}
        >
          <div style={{ padding: 40, textAlign: 'center' }}>
            <UploadIcon size={48} color="#3B82F6" />
            <p style={{ marginTop: 16, color: '#6B7280' }}>点击或拖拽文件到此区域</p>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>支持 PDF、Word、TXT、MD、JSON、CSV 文件，最大 50MB</p>
          </div>
        </Upload.Dragger>

        {loading && (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <Spin tip="AI正在解读文档..." />
              <Progress percent={progress} status="active" style={{ marginTop: 16 }} />
            </div>
          </Card>
        )}

        {fileName && !loading && (
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} />
                <span>{fileName}</span>
              </div>
            }
            style={{ marginBottom: 16 }}
          >
            <pre style={{ maxHeight: 200, overflow: 'auto', fontSize: 12, background: '#F9FAFB', padding: 12, borderRadius: 4, whiteSpace: 'pre-wrap' }}>
              {content.substring(0, 2000)}{content.length > 2000 ? '\n...(更多内容)' : ''}
            </pre>
          </Card>
        )}

        {points.length > 0 && (
          <Card title="解读重点" extra={
            <Button
              icon={<Copy size={14} />}
              onClick={() => {
                navigator.clipboard.writeText(points.join('\n'));
                message.success('已复制全部重点');
              }}
            >
              复制全部
            </Button>
          }>
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