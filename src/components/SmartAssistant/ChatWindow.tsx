// 对话窗口组件

import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Spin, Card, Tag, Space, Typography } from 'antd';
import { SendOutlined, CopyOutlined, LinkOutlined, ClearOutlined, BulbOutlined } from '@ant-design/icons';
import { Message, ToolResult, IntentType } from './types';
import { useIntent } from './hooks/useIntent';
import { useSession } from './hooks/useSession';
import { useToolExecutor } from './hooks/useToolExecutor';
import { message as antMessage } from 'antd';

const { Paragraph } = Typography;

interface ChatWindowProps {
  onClose: () => void;
  onNavigate: (page: string) => void;
  knowledgeBaseReady?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  onClose,
  onNavigate,
  knowledgeBaseReady = false
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { recognizeIntent, loading: intentLoading } = useIntent();
  const {
    messages,
    lastIntent,
    pendingData,
    addUserMessage,
    addAssistantMessage,
    setWaitingData,
    clearWaitingData,
    clearSession
  } = useSession();
  const { execute, loading: toolLoading } = useToolExecutor();

  const loading = intentLoading || toolLoading;

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    addUserMessage(text);

    // 如果在等待数据
    if (pendingData) {
      await handlePendingData(text);
      return;
    }

    // 识别意图
    const intentResult = await recognizeIntent(text);

    if (intentResult.intent === 'unknown') {
      // 无法识别，反问澄清
      addAssistantMessage(
        '抱歉，我不太确定您想要做什么。您可以尝试：\n\n' +
        '• "格式化JSON" - 格式化JSON数据\n' +
        '• "生成UUID" - 生成唯一标识\n' +
        '• "转成SQL IN" - 转换数据格式\n' +
        '• "比较文本差异" - 对比两段文本\n' +
        '• "知识库问答" - 基于知识库回答问题\n\n' +
        '请告诉我您具体需要什么帮助？'
      );
      return;
    }

    // 执行工具
    await executeTool(intentResult.intent, {
      ...intentResult.params
      // 注意：不再把用户输入当作默认数据，只有明确提取的数据才传递
    });
  };

  // 处理等待数据的情况
  const handlePendingData = async (data: string) => {
    const result = await execute(pendingData.intent, { data }, knowledgeBaseReady);
    handleToolResult(result, pendingData.intent);
    clearWaitingData();
  };

  // 执行工具
  const executeTool = async (intent: IntentType, params: any) => {
    const result = await execute(intent, params, knowledgeBaseReady);
    handleToolResult(result, intent);
  };

  // 处理工具结果
  const handleToolResult = (result: ToolResult, intent: IntentType) => {
    if (result.needData) {
      // 需要用户提供数据
      setWaitingData(result.dataPrompt || '请提供数据', intent);
      addAssistantMessage(result.dataPrompt || '请提供数据');
      return;
    }

    if (!result.success) {
      // 执行失败
      let content = result.error || '操作失败';
      if (result.linkTo) {
        content += `\n\n[前往工具] →`;
      }
      addAssistantMessage(content, {
        intent,
        toolResult: result
      });
      return;
    }

    // 成功
    addAssistantMessage(formatResult(result.data), {
      intent,
      toolResult: result
    });
  };

  // 格式化结果
  const formatResult = (data: any): string => {
    if (typeof data === 'string') {
      return data;
    }
    return JSON.stringify(data, null, 2);
  };

  // 复制内容
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    antMessage.success('已复制');
  };

  // 快捷提示
  const suggestions = [
    '格式化JSON',
    '生成UUID',
    '转成SQL IN格式',
    '计算MD5',
    '生成邮箱正则'
  ];

  return (
    <div style={{
      width: 480,
      height: '100vh',
      background: '#FFFFFF',
      borderLeft: '1px solid #E5E7EB',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-4px 0 12px rgba(0,0,0,0.1)'
    }}>
      {/* 头部 */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <span style={{ fontWeight: 600, fontSize: 16 }}>智能助手</span>
        </div>
        <Button
          icon={<ClearOutlined />}
          size="small"
          onClick={clearSession}
          disabled={messages.length === 0}
        >
          清空
        </Button>
      </div>

      {/* 消息区域 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 16
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280' }}>
            <BulbOutlined style={{ fontSize: 32, marginBottom: 16, color: '#F59E0B' }} />
            <div style={{ fontWeight: 500, marginBottom: 8 }}>您好！我是智能助手</div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              您可以用自然语言告诉我需要什么，我会自动帮您处理。
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>试试这些：</div>
              {suggestions.map((s, i) => (
                <Tag
                  key={i}
                  style={{ cursor: 'pointer', marginBottom: 4 }}
                  onClick={() => {
                    setInput(s);
                  }}
                >
                  {s}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              marginBottom: 16,
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
            }}
          >
            <div style={{
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user'
                ? '16px 4px 16px 16px'
                : '4px 16px 16px 16px',
              background: msg.role === 'user' ? '#3B82F6' : '#F3F4F6',
              color: msg.role === 'user' ? '#FFFFFF' : '#1F2937'
            }}>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 14 }}>{msg.content}</div>

              {/* 操作按钮 */}
              {msg.role === 'assistant' && msg.toolResult?.success && msg.toolResult.data && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopy(msg.toolResult.data)}
                  >
                    复制
                  </Button>
                  {msg.toolResult.linkTo && (
                    <Button
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={() => onNavigate(msg.toolResult.linkTo!)}
                    >
                      {msg.toolResult.linkText || '打开工具'}
                    </Button>
                  )}
                </div>
              )}

              {/* 跳转按钮 */}
              {msg.role === 'assistant' && msg.toolResult?.linkTo && !msg.toolResult.success && (
                <div style={{ marginTop: 8 }}>
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => onNavigate(msg.toolResult.linkTo!)}
                  >
                    {msg.toolResult.linkText || '前往'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin tip="思考中..." />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div style={{
        padding: 16,
        borderTop: '1px solid #E5E7EB',
        background: '#FAFAFA'
      }}>
        <Input.TextArea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter 发送消息（非 Shift/Ctrl 组合时）
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
              e.preventDefault();
              handleSend();
            }
            // Ctrl+Enter 手动插入换行
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault();
              const textarea = e.currentTarget;
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const newInput = input.substring(0, start) + '\n' + input.substring(end);
              setInput(newInput);
              // 恢复光标位置
              setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 1;
              }, 0);
            }
          }}
          placeholder="输入您需要... (Shift/Ctrl+Enter 换行)"
          disabled={loading}
          autoSize={{ minRows: 1, maxRows: 6 }}
          style={{ borderRadius: 8, marginBottom: 8 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={loading}
          disabled={!input.trim()}
          style={{ borderRadius: 8 }}
        >
          发送
        </Button>
      </div>
    </div>
  );
};

export default ChatWindow;