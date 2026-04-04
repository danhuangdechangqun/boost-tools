// 导入区组件

import React, { useState } from 'react';
import { Button, Upload, Card, Table, message, Select } from 'antd';
import { FileSpreadsheet, Play } from 'lucide-react';
import * as XLSX from 'xlsx';
import { FieldMapping } from '../types';

interface ImportAreaProps {
  onImport: (data: Record<string, any>[], mapping: FieldMapping[]) => void;
  fieldMapping: FieldMapping[];
  onFieldMappingChange: (mapping: FieldMapping[]) => void;
  onAutoDetect: (headers: string[], sampleData: Record<string, any>[]) => void;
  loading: boolean;
}

const ImportArea: React.FC<ImportAreaProps> = ({
  onImport,
  fieldMapping,
  onFieldMappingChange,
  onAutoDetect,
  loading,
}) => {
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // 解析Excel文件
  const parseExcel = async (file: File): Promise<{ headers: string[], data: Record<string, any>[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet) as Record<string, any>[];

          if (jsonData.length === 0) {
            reject(new Error('文件中没有数据'));
            return;
          }

          const headers = Object.keys(jsonData[0]);
          resolve({ headers, data: jsonData });
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

    if (!isExcel) {
      message.error('只支持 Excel 文件');
      return false;
    }

    try {
      const { headers: fileHeaders, data } = await parseExcel(file);
      setHeaders(fileHeaders);
      setRawData(data);

      // 自动识别字段映射
      onAutoDetect(fileHeaders, data);

      message.success(`已导入 ${data.length} 条数据`);
    } catch (err: any) {
      message.error(`文件解析失败: ${err.message}`);
    }

    return false;
  };

  // 更新字段映射
  const handleMappingChange = (originalKey: string, mappedTo: string) => {
    const newMapping = fieldMapping.map(m =>
      m.originalKey === originalKey ? { ...m, mappedTo } : m
    );
    onFieldMappingChange(newMapping);
  };

  // 开始分析
  const handleAnalyze = () => {
    if (rawData.length === 0) {
      message.warning('请先导入数据');
      return;
    }
    onImport(rawData, fieldMapping);
  };

  const mappingOptions = [
    { value: 'id', label: '工单编号' },
    { value: 'businessType', label: '业务类型' },
    { value: 'reason', label: '故障原因' },
    { value: 'note', label: '备注说明' },
    { value: 'timestamp', label: '时间日期' },
    { value: '', label: '不映射' },
  ];

  return (
    <div>
      {/* 文件上传 */}
      <div style={{ marginBottom: 16 }}>
        <Upload
          accept=".xlsx,.xls,.csv"
          beforeUpload={handleFileUpload}
          showUploadList={false}
        >
          <Button icon={<FileSpreadsheet size={16} />}>导入Excel文件</Button>
        </Upload>
      </div>

      {/* 字段映射配置 */}
      {rawData.length > 0 && (
        <Card
          size="small"
          title="字段映射配置"
          style={{ marginBottom: 16 }}
          extra={
            <Button
              type="primary"
              icon={<Play size={16} />}
              onClick={handleAnalyze}
              loading={loading}
            >
              开始分析
            </Button>
          }
        >
          <div style={{ marginBottom: 8, color: '#6B7280', fontSize: 13 }}>
            共 {rawData.length} 条数据，请确认字段映射是否正确
          </div>
          <Table
            size="small"
            dataSource={fieldMapping}
            rowKey="originalKey"
            pagination={false}
            columns={[
              {
                title: '原始字段',
                dataIndex: 'originalKey',
                width: 150,
              },
              {
                title: '映射到',
                dataIndex: 'mappedTo',
                width: 150,
                render: (value: string, record) => (
                  <Select
                    value={value || undefined}
                    onChange={(v) => handleMappingChange(record.originalKey, v)}
                    options={mappingOptions}
                    style={{ width: '100%' }}
                    placeholder="选择映射"
                    allowClear
                  />
                ),
              },
              {
                title: '示例值',
                dataIndex: 'sampleValues',
                render: (values: string[]) => (
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    {values?.slice(0, 2).map((v, i) => (
                      <div key={i} style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 200
                      }}>
                        {v}
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
};

export default ImportArea;