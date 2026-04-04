// RAG检索问答Hook - 使用动态提示词

import { useState, useCallback, useEffect } from 'react';
import { ChatMessage, SearchResult, Chunk, Document, RAGConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { callLlm } from '@/services/api';
import { promptService } from '@/services/promptService';

// 余弦相似度计算
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 简单的文本嵌入模拟（实际应调用Embedding API）
// 这里使用简单的哈希向量作为占位符
function simpleEmbed(text: string): number[] {
  const vector: number[] = [];
  const words = text.toLowerCase().split(/\s+/);

  // 创建一个简单的词频向量
  for (let i = 0; i < 128; i++) {
    let sum = 0;
    for (const word of words) {
      sum += word.charCodeAt(i % word.length) * (i + 1);
    }
    vector.push((Math.sin(sum) + 1) / 2); // 归一化到0-1
  }

  return vector;
}

export function useRAG() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [promptTemplate, setPromptTemplate] = useState<string>('');

  // 加载提示词
  useEffect(() => {
    loadPrompt();
  }, []);

  const loadPrompt = async () => {
    try {
      const prompt = await promptService.get('rag_answer');
      setPromptTemplate(prompt?.template || '');
    } catch (e) {
      console.error('加载RAG提示词失败:', e);
    }
  };

  // 检索相关片段
  const search = useCallback((
    query: string,
    chunks: Chunk[],
    getDocument: (id: string) => Document | undefined,
    config: RAGConfig
  ): SearchResult[] => {
    if (chunks.length === 0) return [];

    // 生成查询向量
    const queryEmbedding = simpleEmbed(query);

    // 计算每个chunk的相似度
    const results: SearchResult[] = [];

    for (const chunk of chunks) {
      // 如果chunk已有embedding，使用它；否则生成
      const chunkEmbedding = chunk.embedding || simpleEmbed(chunk.content);
      const score = cosineSimilarity(queryEmbedding, chunkEmbedding);

      if (score >= config.scoreThreshold) {
        const doc = getDocument(chunk.documentId);
        if (doc) {
          results.push({ chunk, document: doc, score });
        }
      }
    }

    // 按分数排序，返回Top K
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, config.topK);
  }, []);

  // 生成回答
  const answer = useCallback(async (
    query: string,
    chunks: Chunk[],
    getDocument: (id: string) => Document | undefined,
    config: RAGConfig
  ): Promise<ChatMessage> => {
    setLoading(true);

    try {
      // 检索相关片段
      const searchResults = search(query, chunks, getDocument, config);

      // 构建上下文
      const contextParts = searchResults.map((result, i) =>
        `[片段${i + 1}] (来源: ${result.document.name})\n${result.chunk.content}`
      );
      const context = contextParts.join('\n\n---\n\n');

      // 使用动态提示词或默认提示词
      let prompt: string;
      if (promptTemplate) {
        prompt = promptService.render(promptTemplate, {
          context: context || '（没有找到相关知识片段）',
          query
        });
      } else {
        // 默认提示词
        prompt = `你是一个智能助手，需要基于知识库回答用户问题。

以下是与问题相关的知识片段：
${context || '（没有找到相关知识片段）'}

用户问题：${query}

请基于以上知识片段回答问题。如果知识库中没有相关信息，请诚实告知"知识库中没有找到相关信息"。

回答格式要求：
1. 直接回答问题，简洁清晰
2. 如果引用了知识库内容，标注来源
3. 如果信息不足，说明还需要什么信息`;
      }

      // 调用LLM
      const response = await callLlm(prompt);

      // 创建回答消息
      const answerMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        sources: searchResults,
        timestamp: new Date().toISOString()
      };

      return answerMessage;

    } catch (e: any) {
      return {
        id: uuidv4(),
        role: 'assistant',
        content: `回答生成失败: ${e.message}`,
        timestamp: new Date().toISOString()
      };
    } finally {
      setLoading(false);
    }
  }, [search, promptTemplate]);

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
    search,
    answer,
    addUserMessage,
    addAssistantMessage,
    clearMessages,
    reloadPrompt: loadPrompt
  };
}