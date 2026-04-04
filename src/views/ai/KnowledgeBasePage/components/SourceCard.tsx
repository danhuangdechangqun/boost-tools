// 来源卡片组件

import React from 'react';
import { Card, Tag, Button } from 'antd';
import { Document, SearchResult } from '../types';

interface SourceCardProps {
  result: SearchResult;
  onClose?: () => void;
}

const SourceCard: React.FC<SourceCardProps> = ({ result, onClose }) => {
  const { chunk, document, score } = result;

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📎 来源详情</span>
          <Tag color="blue">{document.type.toUpperCase()}</Tag>
        </div>
      }
      extra={onClose && (
        <Button size="small" onClick={onClose}>
          关闭
        </Button>
      )}
      style={{ marginBottom: 16 }}
    >
      {/* 文档信息 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>{document.name}</div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>
          相关度: <Tag color={score > 0.8 ? 'green' : score > 0.6 ? 'blue' : 'orange'}>
            {(score * 100).toFixed(1)}%
          </Tag>
        </div>
      </div>

      {/* 片段内容 */}
      <div style={{
        background: '#F9FAFB',
        padding: 12,
        borderRadius: 6,
        border: '1px solid #E5E7EB'
      }}>
        <div style={{
          fontSize: 12,
          color: '#6B7280',
          marginBottom: 8
        }}>
          片段 #{chunk.position.index + 1}
        </div>
        <div style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          fontSize: 13,
          color: '#374151',
          maxHeight: 200,
          overflow: 'auto'
        }}>
          {chunk.content}
        </div>
      </div>

      {/* 元数据 */}
      {chunk.metadata && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#6B7280' }}>
          {chunk.metadata.pageNumber && (
            <span style={{ marginRight: 16 }}>页码: {chunk.metadata.pageNumber}</span>
          )}
          {chunk.metadata.heading && (
            <span>标题: {chunk.metadata.heading}</span>
          )}
        </div>
      )}
    </Card>
  );
};

export default SourceCard;