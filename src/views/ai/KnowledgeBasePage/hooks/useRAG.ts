// RAG检索问答Hook - 使用动态提示词

import { useState, useCallback, useEffect } from 'react';
import { ChatMessage, SearchResult, SmallChunk, Document, RAGConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { callLlm, getSingleEmbedding, getBatchEmbeddings } from '@/services/api';
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

  // 检索相关片段（异步，使用真实 Embedding API）
  const search = useCallback(async (
    query: string,
    smallChunks: SmallChunk[],
    getDocument: (id: string) => Document | undefined,
    config: RAGConfig
  ): Promise<SearchResult[]> => {
    if (smallChunks.length === 0) return [];

    // 生成查询向量（使用 Doubao Embedding）
    const queryEmbedding = await getSingleEmbedding(query);

    // 批量获取所有 chunk 的向量（只处理没有 embedding 的）
    const chunksWithoutEmbedding = smallChunks.filter(c => !c.embedding);
    const contentsWithoutEmbedding = chunksWithoutEmbedding.map(c => c.content);

    // 批量获取向量
    const newEmbeddings = contentsWithoutEmbedding.length > 0
      ? await getBatchEmbeddings(contentsWithoutEmbedding)
      : [];

    // 将新向量分配给对应 chunk
    chunksWithoutEmbedding.forEach((chunk, i) => {
      chunk.embedding = newEmbeddings[i];
    });

    // 计算每个 chunk 的相似度
    const results: SearchResult[] = [];

    for (const smallChunk of smallChunks) {
      if (!smallChunk.embedding) continue;

      const score = cosineSimilarity(queryEmbedding, smallChunk.embedding);

      if (score >= config.scoreThreshold) {
        const doc = getDocument(smallChunk.documentId);
        if (doc) {
          // 查找关联的 BigChunk
          const bigChunk = doc.bigChunks?.find(bc => bc.id === smallChunk.bigChunkId);

          results.push({
            chunk: {
              ...smallChunk,
              bigChunkContent: bigChunk?.content
            } as any,
            document: doc,
            score
          });
        }
      }
    }

    // 按分数排序，返回 Top K
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, config.topK);
  }, []);

  // 生成回答
  const answer = useCallback(async (
    query: string,
    smallChunks: SmallChunk[],
    getDocument: (id: string) => Document | undefined,
    config: RAGConfig
  ): Promise<ChatMessage> => {
    setLoading(true);

    try {
      // 检索相关片段（异步）
      const searchResults = await search(query, smallChunks, getDocument, config);

      // 构建上下文 - 使用 BigChunk 内容
      const contextParts = searchResults.map((result, i) => {
        const bigChunkContent = (result.chunk as any).bigChunkContent || result.chunk.content;
        return `[片段${i + 1}] (来源: ${result.document.name})\n${bigChunkContent}`;
      });
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