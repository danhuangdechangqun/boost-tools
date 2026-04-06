// 片段列表组件 - 显示 BigChunk/SmallChunk 层级结构

import React, { useState } from 'react';
import { List, Tag, Empty, Modal, Button, message, Collapse } from 'antd';
import { Copy, ChevronDown } from 'lucide-react';
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
  const [selectedChunk, setSelectedChunk] = useState<SmallChunk | null>(null);
  const [selectedBigChunkIndex, setSelectedBigChunkIndex] = useState<number>(0);

  // 双击打开弹窗
  const handleDoubleClick = (chunk: SmallChunk, bigChunkIndex: number) => {
    setSelectedChunk(chunk);
    setSelectedBigChunkIndex(bigChunkIndex);
    setModalVisible(true);
  };

  // 复制内容
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    message.success('内容已复制');
  };

  // 根据 bigChunks 分组展示
  const groupedChunks = bigChunks?.map((bigChunk, bigIndex) => ({
    bigChunk,
    bigIndex,
    smallChunks: bigChunk.smallChunks
  })) || [];

  if (!bigChunks || bigChunks.length === 0) {
    return (
      <Empty
        description="暂无片段"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <>
      <Collapse
        defaultActiveKey={bigChunks.map((_, i) => `big-${i}`)}
        items={groupedChunks.map(({ bigChunk, bigIndex, smallChunks }) => ({
          key: `big-${bigIndex}`,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag color="purple">大片段 {bigIndex + 1}</Tag>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                {smallChunks.length} 个小片段 · {bigChunk.content.length} 字符
              </span>
              <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>
                边界: {bigChunk.boundaryType}
              </span>
            </div>
          ),
          children: (
            <List
              dataSource={smallChunks}
              renderItem={(chunk, smallIndex) => (
                <List.Item
                  onClick={() => onSelect?.(chunk)}
                  onDoubleClick={() => handleDoubleClick(chunk, bigIndex)}
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
                      <Tag color="blue">小片段 {smallIndex + 1}</Tag>
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                        {chunk.content.length} 字符
                      </span>
                      {chunk.embedding && (
                        <Tag color="green" style={{ fontSize: 10 }}>已向量化</Tag>
                      )}
                      <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>
                        双击查看完整
                      </span>
                      <Button
                        size="small"
                        icon={<Copy size={12} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(chunk.content);
                        }}
                      />
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
          )
        }))}
      />

      {/* 完整内容弹窗 */}
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        title={
          selectedChunk && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag color="purple">大片段 {selectedBigChunkIndex + 1}</Tag>
              <Tag color="blue">小片段 {selectedChunk.position.index + 1}</Tag>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                ({selectedChunk.content.length} 字符)
              </span>
            </div>
          )
        }
        footer={[
          <Button key="copy" icon={<Copy size={14} />} onClick={() => handleCopy(selectedChunk?.content || '')}>
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
                  在大片段中位置: 第 {selectedChunk.position.start} - {selectedChunk.position.end} 字符
                </span>
                <span>
                  序号: 大片段{selectedBigChunkIndex + 1}-小片段{selectedChunk.position.index + 1}
                </span>
                <span>
                  所属大片段: 第 {selectedBigChunkIndex + 1} 个 ({bigChunks?.[selectedBigChunkIndex]?.content.length || 0} 字符)
                </span>
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