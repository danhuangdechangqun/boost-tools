// 输入区组件

import React, { useState, useRef } from 'react';
import { Button, Input, Upload, message, Card } from 'antd';
import { FileSpreadsheet, FileText, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InputAreaProps {
  onSubmit: (contents: string[]) => void;
  loading: boolean;
  progress: { current: number; total: number };
}

const InputArea: React.FC<InputAreaProps> = ({ onSubmit, loading, progress }) => {
  const [textInput, setTextInput] = useState('');
  const [importedData, setImportedData] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 解析Excel文件
  const parseExcel = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];

          // 获取所有文本内容
          const contents: string[] = [];
          jsonData.forEach((row, rowIndex) => {
            row.forEach((cell) => {
              if (cell && typeof cell === 'string' && cell.trim()) {
                contents.push(cell.trim());
              }
            });
          });

          resolve(contents);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  };

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');
    const isText = file.name.endsWith('.txt');

    if (!isExcel && !isText) {
      message.error('只支持 Excel 和 TXT 文件');
      return false;
    }

    try {
      let contents: string[] = [];

      if (isExcel) {
        contents = await parseExcel(file);
      } else {
        // 处理TXT文件
        const text = await file.text();
        contents = text.split('\n').filter(line => line.trim());
      }

      if (contents.length === 0) {
        message.warning('文件中没有找到有效内容');
        return false;
      }

      setImportedData(contents);
      message.success(`已导入 ${contents.length} 条数据`);
    } catch (err: any) {
      message.error(`文件解析失败: ${err.message}`);
    }

    return false;
  };

  // 处理文本粘贴
  const handleTextSubmit = () => {
    const lines = textInput.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      message.warning('请输入反馈内容');
      return;
    }
    onSubmit(lines);
  };

  // 处理导入数据提交
  const handleImportSubmit = () => {
    if (importedData.length === 0) {
      message.warning('请先导入数据');
      return;
    }
    onSubmit(importedData);
  };

  // 清空导入数据
  const clearImportedData = () => {
    setImportedData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {/* 导入方式 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <Upload
          accept=".xlsx,.xls,.csv,.txt"
          beforeUpload={handleFileUpload}
          showUploadList={false}
        >
          <Button icon={<FileSpreadsheet size={16} />}>导入Excel/TXT</Button>
        </Upload>
      </div>

      {/* 导入预览 */}
      {importedData.length > 0 && (
        <Card
          size="small"
          style={{ marginBottom: 12, background: '#F9FAFB' }}
          title={`已导入 ${importedData.length} 条数据`}
          extra={
            <Button size="small" onClick={clearImportedData}>清空</Button>
          }
        >
          <div style={{ maxHeight: 150, overflow: 'auto' }}>
            {importedData.slice(0, 10).map((item, index) => (
              <div key={index} style={{ padding: '4px 0', fontSize: 13, color: '#4B5563' }}>
                {index + 1}. {item.length > 100 ? item.slice(0, 100) + '...' : item}
              </div>
            ))}
            {importedData.length > 10 && (
              <div style={{ color: '#9CA3AF', fontSize: 12 }}>... 还有 {importedData.length - 10} 条</div>
            )}
          </div>
          <Button
            type="primary"
            style={{ marginTop: 12 }}
            onClick={handleImportSubmit}
            loading={loading}
            block
          >
            开始分析
          </Button>
        </Card>
      )}

      {/* 文本输入 */}
      <Input.TextArea
        placeholder="粘贴用户反馈内容，每行一条..."
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        rows={4}
        style={{ marginBottom: 12 }}
      />

      {/* 分析进度 */}
      {loading && (
        <div style={{ marginBottom: 12, padding: 12, background: '#EFF6FF', borderRadius: 8 }}>
          <div style={{ color: '#3B82F6', fontWeight: 500 }}>
            正在分析第 {progress.current}/{progress.total} 条...
          </div>
          <div style={{
            height: 4,
            background: '#DBEAFE',
            borderRadius: 2,
            marginTop: 8,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${(progress.current / progress.total) * 100}%`,
              background: '#3B82F6',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      )}

      {/* 分析按钮 */}
      <Button
        type="primary"
        icon={<FileText size={16} />}
        onClick={handleTextSubmit}
        loading={loading}
        disabled={importedData.length > 0}
      >
        分析文本内容
      </Button>
    </div>
  );
};

export default InputArea;