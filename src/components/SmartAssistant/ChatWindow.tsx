// 对话窗口组件 - 集成智能体

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input, Button, Spin, Tag, Typography } from 'antd';
import { SendOutlined, ClearOutlined, BulbOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { Message, ToolResult, IntentType } from './types';
import { useIntent } from './hooks/useIntent';
import { useSession } from './hooks/useSession';
import { useToolExecutor } from './hooks/useToolExecutor';
import { useAgentOrchestrator } from './hooks/useAgentOrchestrator';
import { message as antMessage } from 'antd';
import ExecutionDetailDrawer from './components/ExecutionDetailDrawer';
import { AgentConfig, DEFAULT_AGENT_CONFIG, TaskPlan, TaskReflection, ExecutionLogEntry } from './agentTypes';
import { storage } from '@/services/storage';
import { Document } from '@/views/ai/KnowledgeBasePage/types';

const { Paragraph, Text } = Typography;

const DOCUMENTS_KEY = 'knowledge_documents';

// 检查知识库是否有就绪的文档
async function checkKnowledgeBaseReady(): Promise<boolean> {
  try {
    const documents = await storage.read<Document[]>(DOCUMENTS_KEY);
    if (documents && Array.isArray(documents)) {
      return documents.some(doc => doc.status === 'ready');
    }
    return false;
  } catch {
    return false;
  }
}

// 扩展消息类型，包含智能体执行信息
interface AgentMessage extends Message {
  agentPhase?: 'planning' | 'executing' | 'reflecting' | 'completed';
  plan?: TaskPlan;
  reflection?: TaskReflection;
  executionLog?: ExecutionLogEntry[];
  detailExpanded?: boolean;
}

interface ChatWindowProps {
  onClose: () => void;
  onNavigate: (page: string) => void;
  knowledgeBaseReady?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  onClose,
  onNavigate,
  knowledgeBaseReady: externalKnowledgeBaseReady = false
}) => {
  const [input, setInput] = useState('');
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [thinkingDetailExpanded, setThinkingDetailExpanded] = useState(false);
  const [internalKnowledgeBaseReady, setInternalKnowledgeBaseReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 检测知识库状态
  useEffect(() => {
    const checkKB = async () => {
      const ready = await checkKnowledgeBaseReady();
      setInternalKnowledgeBaseReady(ready);
    };
    checkKB();
  }, []);

  // 使用外部传入的状态或内部检测的状态
  const knowledgeBaseReady = externalKnowledgeBaseReady || internalKnowledgeBaseReady;

  // 原有的意图识别和工具执行（用于简单任务fallback）
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

  // 智能体主控制器
  const agent = useAgentOrchestrator();

  const loading = intentLoading || toolLoading || agent.loading;

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages, agent.phase]);

  // 切换详情展开状态
  const toggleDetailExpanded = (messageId: string) => {
    setAgentMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, detailExpanded: !msg.detailExpanded } : msg
    ));
  };

  // 发送消息
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setThinkingDetailExpanded(false); // 重置详情展开状态

    // 添加用户消息
    const userMsgId = Date.now().toString();
    const userMsg: AgentMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setAgentMessages(prev => [...prev, userMsg]);

    // 如果在等待数据
    if (pendingData) {
      await handlePendingData(text);
      return;
    }

    // 检测用户是否在纠错（如："不对，我要调用uuid工具"）
    const lastAssistantMsg = agentMessages.length > 0
      ? agentMessages[agentMessages.length - 1]
      : null;
    const isCorrection = lastAssistantMsg?.role === 'assistant' &&
      (text.includes('不对') || text.includes('我要调用') || text.includes('查知识库') || text.includes('调用'));

    // 构建执行上下文
    let executionContext: any = undefined;

    if (isCorrection) {
      // 解析用户纠错意图
      if (text.includes('查知识库') || text.includes('知识库')) {
        executionContext = { explicitIntent: 'knowledge' };
      } else {
        // 尝试提取工具名
        const toolMatch = text.match(/调用\s*(\w+)\s*工具/i) ||
                         text.match(/用\s*(\w+)/i) ||
                         text.match(/我要(\w+)/i);
        if (toolMatch) {
          executionContext = { explicitIntent: 'tool', explicitTool: toolMatch[1].toLowerCase() };
        }
      }
    }

    // 使用智能体执行
    const agentResult = await agent.execute(text, knowledgeBaseReady, executionContext);

    // 添加助手消息（包含执行信息）
    const assistantMsg: AgentMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: agentResult.result || '任务完成',
      timestamp: new Date().toISOString(),
      agentPhase: agentResult.success ? 'completed' : undefined,
      plan: agentResult.plan,
      reflection: agentResult.reflection,
      executionLog: agentResult.executionLog,
      detailExpanded: false
    };
    setAgentMessages(prev => [...prev, assistantMsg]);
  };

  // 处理等待数据的情况
  const handlePendingData = async (data: string) => {
    const result = await execute(pendingData.intent, { data }, knowledgeBaseReady);
    handleToolResult(result, pendingData.intent);
    clearWaitingData();
  };

  // 执行工具（原有流程）
  const executeTool = async (intent: IntentType, params: any) => {
    const result = await execute(intent, params, knowledgeBaseReady);
    handleToolResult(result, intent);
  };

  // 处理工具结果
  const handleToolResult = (result: ToolResult, intent: IntentType) => {
    if (result.needData) {
      setWaitingData(result.dataPrompt || '请提供数据', intent);
      addAssistantMessage(result.dataPrompt || '请提供数据');
      return;
    }

    if (!result.success) {
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

  // 清空会话
  const handleClearSession = () => {
    clearSession();
    agent.reset();
    setAgentMessages([]);
    setThinkingDetailExpanded(false);
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
          <Tag color="purple" style={{ fontSize: 10 }}>Agent</Tag>
        </div>
        <Button
          icon={<ClearOutlined />}
          size="small"
          onClick={handleClearSession}
          disabled={agentMessages.length === 0 && agent.phase === 'idle'}
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
        {agentMessages.length === 0 && agent.phase === 'idle' && (
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
                  onClick={() => setInput(s)}
                >
                  {s}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {agentMessages.map((msg, index) => {
          // 在助手消息前显示"已完成思考"指示器
          const showCompletedThinking = msg.role === 'assistant' &&
            msg.agentPhase === 'completed' &&
            msg.executionLog?.length;

          return (
            <React.Fragment key={msg.id}>
              {/* 已完成思考指示器（在助手消息之前） */}
              {showCompletedThinking && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginBottom: 8
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    background: '#E8F5E9',
                    borderRadius: 8,
                  }}>
                    <span style={{ color: '#4CAF50', fontSize: 16 }}>✓</span>
                    <Text style={{ color: '#4CAF50', flex: 1 }}>已完成思考</Text>
                    <Button
                      size="small"
                      type="text"
                      icon={msg.detailExpanded ? <UpOutlined /> : <DownOutlined />}
                      onClick={() => toggleDetailExpanded(msg.id)}
                      style={{ color: '#6B7280' }}
                    >
                      {msg.detailExpanded ? '收起' : '查看详情'}
                    </Button>
                  </div>
                  {msg.detailExpanded && msg.plan && (
                    <div style={{
                      background: '#F9FAFB',
                      borderRadius: 8,
                      padding: 12,
                      maxHeight: 300,
                      overflow: 'auto',
                      border: '1px solid #E5E7EB'
                    }}>
                      <ExecutionDetailDrawer
                        plan={msg.plan}
                        reflection={msg.reflection || undefined}
                        executionLog={msg.executionLog}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 消息内容 */}
              <div style={{
                marginBottom: 16,
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
              }}>
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

                  {/* 跳转按钮（仅失败时显示） */}
                  {msg.role === 'assistant' && msg.toolResult?.linkTo && !msg.toolResult?.success && (
                    <div style={{ marginTop: 8 }}>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => onNavigate(msg.toolResult!.linkTo!)}
                      >
                        {msg.toolResult?.linkText || '前往'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* 思考状态指示器（在最后一条消息后面） */}
        {/* 正在思考 */}
        {loading && agent.phase !== 'idle' && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 16
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: '#F3F4F6',
              borderRadius: 8,
            }}>
              <Spin size="small" />
              <Text style={{ color: '#6B7280', flex: 1 }}>正在思考中...</Text>
              <Button
                size="small"
                type="text"
                icon={thinkingDetailExpanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => setThinkingDetailExpanded(!thinkingDetailExpanded)}
                style={{ color: '#6B7280' }}
              >
                {thinkingDetailExpanded ? '收起' : '查看详情'}
              </Button>
            </div>
            {thinkingDetailExpanded && agent.plan && (
              <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 12, maxHeight: 300, overflow: 'auto' }}>
                <ExecutionDetailDrawer
                  plan={agent.plan}
                  reflection={agent.reflection || undefined}
                  executionLog={agent.executionLog}
                />
              </div>
            )}
          </div>
        )}

        {loading && agent.phase === 'idle' && (
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
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
              e.preventDefault();
              handleSend();
            }
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault();
              const textarea = e.currentTarget;
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const newInput = input.substring(0, start) + '\n' + input.substring(end);
              setInput(newInput);
              setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 1;
              }, 0);
            }
          }}
          placeholder="输入您需要... (Ctrl+Enter 换行)"
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