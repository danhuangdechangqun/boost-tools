// 片段列表组件 - 显示文档切分后的知识片段

import React, { useState } from 'react';
import { List, Tag, Empty, Modal, Button, message } from 'antd';
import { Copy } from 'lucide-react';
import { SmallChunk, BigChunk } from '../types';

interface ChunkListProps {
  chunks: SmallChunk[];
  bigChunks?: BigChunk[];
  selectedId?: string;
  onSelect?: (chunk: SmallChunk) => void;
}

const ChunkList: React.FC<ChunkListProps> = ({
  chunks,
  bigChunks,
  selectedId,
  onSelect
}) => {
  // 弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState<SmallChunk | BigChunk | null>(null);

  // 双击打开弹窗
  const handleDoubleClick = (chunk: SmallChunk | BigChunk) => {
    setSelectedChunk(chunk);
    setModalVisible(true);
  };

  // 复制内容
  const handleCopy = () => {
    if (selectedChunk) {
      navigator.clipboard.writeText(selectedChunk.content);
      message.success('内容已复制');
    }
  };

  // 判断是否是 BigChunk
  const isBigChunk = (chunk: SmallChunk | BigChunk): chunk is BigChunk => {
    return 'smallChunks' in chunk;
  };

  if (chunks.length === 0) {
    return (
      <Empty
        description="暂无片段"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <>
      <List
        dataSource={chunks}
        renderItem={(chunk, index) => (
          <List.Item
            onClick={() => onSelect?.(chunk)}
            onDoubleClick={() => handleDoubleClick(chunk)}
            style={{
              cursor: 'pointer',
              background: selectedId === chunk.id ? '#EFF6FF' : 'transparent',
              borderRadius: 8,
              padding: '8px 12px',
              marginBottom: 8,
              border: '1px solid #E5E7EB',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ width: '100%' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6
              }}>
                <Tag color="blue">片段 {index + 1}</Tag>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {chunk.content.length} 字符
                </span>
                {chunk.embedding && (
                  <Tag color="green" style={{ fontSize: 10 }}>已向量化</Tag>
                )}
                <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>
                  双击查看完整
                </span>
              </div>

              <div style={{
                fontSize: 13,
                color: '#374151',
                lineHeight: 1.6,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'pre-wrap',
                background: '#F9FAFB',
                padding: 8,
                borderRadius: 4,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical'
              }}>
                {chunk.content}
              </div>
            </div>
          </List.Item>
        )}
      />

      {/* 完整内容弹窗 */}
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        title={
          selectedChunk && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag color={isBigChunk(selectedChunk) ? 'purple' : 'blue'}>
                {isBigChunk(selectedChunk) ? '大片段' : '小片段'}
              </Tag>
              <span>
                {isBigChunk(selectedChunk)
                  ? `片段 ${selectedChunk.position.index + 1}`
                  : `片段 ${(selectedChunk as SmallChunk).position.index + 1}`}
              </span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                ({selectedChunk.content.length} 字符)
              </span>
            </div>
          )
        }
        footer={[
          <Button key="copy" icon={<Copy size={14} />} onClick={handleCopy}>
            复制内容
          </Button>,
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {selectedChunk && (
          <div>
            {/* 位置信息 */}
            <div style={{
              marginBottom: 12,
              padding: '8px 12px',
              background: '#F3F4F6',
              borderRadius: 6,
              fontSize: 12,
              color: '#6B7280'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                <span>
                  位置: 第 {selectedChunk.position.start} - {selectedChunk.position.end} 字符
                </span>
                <span>
                  片段序号: 第 {selectedChunk.position.index + 1} 个
                </span>
                {!isBigChunk(selectedChunk) && (selectedChunk as SmallChunk).bigChunkId && (
                  <span>
                    关联大片段: {(selectedChunk as SmallChunk).bigChunkId.slice(0, 8)}...
                  </span>
                )}
              </div>
            </div>

            {/* 完整内容 */}
            <div style={{
              maxHeight: 400,
              overflow: 'auto',
              background: '#F9FAFB',
              padding: 16,
              borderRadius: 8,
              border: '1px solid #E5E7EB'
            }}>
              <pre style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'inherit',
                fontSize: 13,
                lineHeight: 1.6,
                color: '#374151'
              }}>
                {selectedChunk.content}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default ChunkList;