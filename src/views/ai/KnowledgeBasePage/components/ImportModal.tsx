// 文档导入弹窗组件

import React, { useState, useRef } from 'react';
import { Modal, Upload, Input, Select, message, Button, Space } from 'antd';
import { UploadOutlined, FileAddOutlined } from '@ant-design/icons';
import { DocumentType, SUPPORTED_FILE_TYPES } from '../types';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// 设置PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (name: string, type: DocumentType, content: string) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({
  visible,
  onClose,
  onImport
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentType>('txt');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 解析文件
  const parseFile = async (file: File): Promise<string> => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
      case '.txt':
      case '.md':
      case '.json':
        return await file.text();

      case '.docx':
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;

      case '.pdf':
        const pdfArrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
        let pdfText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          pdfText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
        return pdfText;

      default:
        throw new Error('不支持的文件类型');
    }
  };

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      const text = await parseFile(file);
      setContent(text);
      setName(file.name);
      setType(file.name.split('.').pop() as DocumentType);
      message.success('文件解析成功');
    } catch (e: any) {
      message.error('文件解析失败: ' + e.message);
    } finally {
      setLoading(false);
      // 清空 input value，允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 提交导入
  const handleSubmit = () => {
    if (!name.trim()) {
      message.warning('请输入文档名称');
      return;
    }
    if (!content.trim()) {
      message.warning('文档内容不能为空');
      return;
    }

    onImport(name.trim(), type, content);

    // 重置
    setName('');
    setType('txt');
    setContent('');
    onClose();
  };

  // 取消
  const handleCancel = () => {
    setName('');
    setType('txt');
    setContent('');
    onClose();
  };

  return (
    <Modal
      title="导入文档"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      width={600}
      confirmLoading={loading}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 文件上传 */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>上传文件</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.docx,.pdf,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <Button
            icon={<UploadOutlined />}
            onClick={() => fileInputRef.current?.click()}
            loading={loading}
          >
            选择文件
          </Button>
          <div style={{ marginTop: 8, fontSize: 12, color: '#6B7280' }}>
            支持格式: TXT, Markdown, Word (docx), PDF, JSON
          </div>
        </div>

        {/* 文档名称 */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>文档名称</div>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="输入文档名称"
          />
        </div>

        {/* 文档类型 */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>文档类型</div>
          <Select
            value={type}
            onChange={setType}
            style={{ width: '100%' }}
            options={SUPPORTED_FILE_TYPES.map(ft => ({
              value: ft.type,
              label: `${ft.extension} - ${ft.name}`
            }))}
          />
        </div>

        {/* 文档内容 */}
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>
            文档内容
            {content && (
              <span style={{ marginLeft: 8, fontSize: 12, color: '#6B7280' }}>
                ({content.length} 字符)
              </span>
            )}
          </div>
          <Input.TextArea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="直接粘贴内容或上传文件..."
            rows={8}
            style={{ fontFamily: 'monospace' }}
          />
        </div>
      </Space>
    </Modal>
  );
};

export default ImportModal;