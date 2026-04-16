// RAG检索问答Hook - 使用 RAG 核心服务

import { useState, useCallback, useEffect } from 'react';
import { ChatMessage, SmallChunk, Document, RAGConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { executeRAG } from '@/services/ragService';

export function useRAG() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // 生成回答 - 直接调用 RAG 核心服务
  const answer = useCallback(async (
    query: string,
    smallChunks: SmallChunk[],
    getDocument: (id: string) => Document | undefined,
    config: RAGConfig
  ): Promise<ChatMessage> => {
    setLoading(true);

    // 从 smallChunks 构建 documents 数组
    const documents: Document[] = [];
    const docMap = new Map<string, Document>();

    // 通过 getDocument 获取所有相关文档
    for (const chunk of smallChunks) {
      if (!docMap.has(chunk.documentId)) {
        const doc = getDocument(chunk.documentId);
        if (doc) {
          docMap.set(chunk.documentId, doc);
          documents.push(doc);
        }
      }
    }

    // 调用 RAG 核心服务
    const ragResult = await executeRAG(query, documents, config);

    setLoading(false);

    // 构建返回消息
    if (!ragResult.success) {
      return {
        id: uuidv4(),
        role: 'assistant',
        content: ragResult.error || '回答生成失败',
        timestamp: new Date().toISOString()
      };
    }

    return {
      id: uuidv4(),
      role: 'assistant',
      content: ragResult.answer || '',
      sources: ragResult.sources || [],
      timestamp: new Date().toISOString()
    };
  }, []);

  // 添加用户消息
  const addUserMessage = useCallback((content: string): ChatMessage => {
    const message: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, message]);
    return message;
  }, []);

  // 添加助手消息
  const addAssistantMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // 清空对话
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    loading,
    answer,
    addUserMessage,
    addAssistantMessage,
    clearMessages
  };
}