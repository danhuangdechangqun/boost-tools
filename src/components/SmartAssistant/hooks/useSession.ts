// 会话管理Hook

import { useState, useCallback, useRef } from 'react';
import { Message, SessionContext, IntentType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useSession() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastIntent, setLastIntent] = useState<IntentType>('unknown');
  const [pendingData, setPendingData] = useState<any>(null);
  const createdAtRef = useRef<string>(new Date().toISOString());

  // 添加用户消息
  const addUserMessage = useCallback((content: string): Message => {
    const message: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, message]);
    return message;
  }, []);

  // 添加助手消息
  const addAssistantMessage = useCallback((
    content: string,
    options?: {
      intent?: IntentType;
      toolResult?: any;
      actions?: Message['actions'];
    }
  ): Message => {
    const message: Message = {
      id: uuidv4(),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      ...options
    };

    setMessages(prev => [...prev, message]);
    return message;
  }, []);

  // 更新最后的意图
  const updateLastIntent = useCallback((intent: IntentType) => {
    setLastIntent(intent);
  }, []);

  // 设置等待数据
  const setWaitingData = useCallback((prompt: string, intent: IntentType) => {
    setPendingData({ prompt, intent });
    setLastIntent(intent);
  }, []);

  // 清除等待数据
  const clearWaitingData = useCallback(() => {
    setPendingData(null);
  }, []);

  // 获取会话上下文
  const getContext = useCallback((): SessionContext => {
    return {
      messages,
      lastIntent,
      pendingData,
      createdAt: createdAtRef.current
    };
  }, [messages, lastIntent, pendingData]);

  // 清空会话
  const clearSession = useCallback(() => {
    setMessages([]);
    setLastIntent('unknown');
    setPendingData(null);
    createdAtRef.current = new Date().toISOString();
  }, []);

  // 获取对话历史（用于LLM上下文）
  const getHistoryForLLM = useCallback((): string => {
    return messages
      .slice(-10) // 最近10条
      .map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
      .join('\n');
  }, [messages]);

  return {
    messages,
    lastIntent,
    pendingData,
    addUserMessage,
    addAssistantMessage,
    updateLastIntent,
    setWaitingData,
    clearWaitingData,
    getContext,
    clearSession,
    getHistoryForLLM
  };
}