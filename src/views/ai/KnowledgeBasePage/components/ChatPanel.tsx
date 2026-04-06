// 问答面板组件

import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Space, Avatar, Empty, Spin, Tag } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, ClearOutlined } from '@ant-design/icons';
import { ChatMessage, SearchResult } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (message: string) => void;
  onClear: () => void;
  onSourceClick?: (result: SearchResult) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  loading,
  onSend,
  onClear,
  onSourceClick
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSend(input.trim());
    setInput('');
  };

  // 渲染消息
  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'user';

    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          flexDirection: isUser ? 'row-reverse' : 'row'
        }}
      >
        <Avatar
          icon={isUser ? <UserOutlined /> : <RobotOutlined />}
          style={{
            background: isUser ? '#3B82F6' : '#8B5CF6',
            flexShrink: 0
          }}
        />

        <div style={{ maxWidth: '70%', minWidth: 0 }}>
          <div
            style={{
              padding: '12px 16px',
              borderRadius: isUser ? '12px 0 12px 12px' : '0 12px 12px 12px',
              background: isUser ? '#3B82F6' : '#F3F4F6',
              color: isUser ? 'white' : '#1F2937',
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            }}
          >
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
          </div>

          {/* 来源标签 */}
          {msg.sources && msg.sources.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                📎 知识来源
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {msg.sources.map((source, i) => (
                  <Tag
                    key={i}
                    color="blue"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSourceClick?.(source)}
                  >
                    {source.document.name} (相关度: {(source.score * 100).toFixed(0)}%)
                  </Tag>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            {new Date(msg.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', padding: 12 } }}
    >
      {/* 头部 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottom: '1px solid #E5E7EB'
      }}>
        <span style={{ fontWeight: 600 }}>智能问答</span>
        <Button
          size="small"
          icon={<ClearOutlined />}
          onClick={onClear}
          disabled={messages.length === 0}
        >
          清空对话
        </Button>
      </div>

      {/* 消息区域 */}
      <div style={{ flex: 1, overflow: 'auto', marginBottom: 12 }}>
        {messages.length === 0 ? (
          <Empty
            description="输入问题开始对话"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ marginTop: 40 }}
          />
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin tip="正在思考..." />
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onPressEnter={handleSend}
          placeholder="输入问题..."
          disabled={loading}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
          disabled={!input.trim()}
        >
          发送
        </Button>
      </Space.Compact>
    </Card>
  );
};

export default ChatPanel;