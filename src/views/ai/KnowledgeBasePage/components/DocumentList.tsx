// 文档列表组件

import React from 'react';
import { Card, Button, List, Tag, Progress, Popconfirm, Empty, Spin } from 'antd';
import { DeleteOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Document, DocumentStatus } from '../types';

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  onDelete: (id: string) => void;
  onSelect: (doc: Document) => void;
  selectedId?: string;
}

const STATUS_CONFIG: Record<DocumentStatus, { color: string; text: string; icon: React.ReactNode }> = {
  pending: { color: 'default', text: '待处理', icon: <ClockCircleOutlined /> },
  processing: { color: 'processing', text: '处理中', icon: <Spin size="small" /> },
  ready: { color: 'success', text: '就绪', icon: <CheckCircleOutlined /> },
  error: { color: 'error', text: '错误', icon: <CloseCircleOutlined /> }
};

const TYPE_ICONS: Record<string, string> = {
  docx: '📄',
  pdf: '📕',
  md: '📝',
  txt: '📃',
  json: '{ }'
};

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  loading,
  onDelete,
  onSelect,
  selectedId
}) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Empty
        description="暂无文档，点击上方按钮导入"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <List
      dataSource={documents}
      renderItem={doc => {
        const status = STATUS_CONFIG[doc.status];

        return (
          <List.Item
            onClick={() => onSelect(doc)}
            style={{
              cursor: 'pointer',
              background: selectedId === doc.id ? '#EFF6FF' : 'transparent',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 8,
              border: '1px solid #E5E7EB',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
              <span style={{ fontSize: 24 }}>
                {TYPE_ICONS[doc.type] || '📄'}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 500,
                  color: '#1F2937',
                  marginBottom: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {doc.name}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <Tag color={status.color} style={{ margin: 0 }}>
                    {status.icon} {status.text}
                  </Tag>

                  {doc.status === 'ready' && (
                    <span style={{ color: '#6B7280' }}>
                      {doc.chunks.length} 个片段
                    </span>
                  )}

                  {doc.status === 'error' && doc.error && (
                    <span style={{ color: '#EF4444' }}>
                      {doc.error}
                    </span>
                  )}

                  <span style={{ color: '#9CA3AF' }}>
                    {(doc.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              <Popconfirm
                title="确定删除此文档？"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  onDelete(doc.id);
                }}
                onCancel={(e) => e?.stopPropagation()}
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </div>
          </List.Item>
        );
      }}
    />
  );
};

export default DocumentList;