// 知识库查询服务 - 供智能助手调用
// 直接复用 RAG 核心服务

import { storage } from '@/services/storage';
import { Document, RAGConfig, DEFAULT_RAG_CONFIG } from '@/views/ai/KnowledgeBasePage/types';
import { executeRAG } from '@/services/ragService';

const DOCUMENTS_KEY = 'knowledge_documents';
const RAG_CONFIG_KEY = 'rag_config';

// 知识库查询结果（简化版，供智能助手使用）
export interface KnowledgeQueryResult {
  success: boolean;
  answer?: string;
  error?: string;
  sources?: Array<{
    documentName: string;
    content: string;
    score: number;
  }>;
}

// 查询知识库 - 直接调用 RAG 核心服务
export async function queryKnowledge(userQuery: string): Promise<KnowledgeQueryResult> {
  try {
    // 1. 加载知识库数据
    const documents = await storage.read<Document[]>(DOCUMENTS_KEY) || [];

    // 加载配置，确保有默认值
    const savedConfig = await storage.read<RAGConfig>(RAG_CONFIG_KEY);
    const config: RAGConfig = {
      chunkSize: savedConfig?.chunkSize ?? DEFAULT_RAG_CONFIG.chunkSize,
      chunkOverlap: savedConfig?.chunkOverlap ?? DEFAULT_RAG_CONFIG.chunkOverlap,
      bigChunkMaxSize: savedConfig?.bigChunkMaxSize ?? DEFAULT_RAG_CONFIG.bigChunkMaxSize,
      topK: savedConfig?.topK ?? DEFAULT_RAG_CONFIG.topK,
      scoreThreshold: savedConfig?.scoreThreshold ?? DEFAULT_RAG_CONFIG.scoreThreshold
    };

    console.log('📚 知识库查询 - 文档数:', documents.length, '配置:', config);

    // 2. 直接调用 RAG 核心服务
    const ragResult = await executeRAG(userQuery, documents, config);

    // 3. 转换结果格式
    if (!ragResult.success) {
      return {
        success: false,
        error: ragResult.error
      };
    }

    return {
      success: true,
      answer: ragResult.answer,
      sources: ragResult.sources?.map(s => ({
        documentName: s.document.name,
        content: ((s.chunk as any).bigChunkContent || s.chunk.content).substring(0, 200),
        score: s.score
      }))
    };

  } catch (error: any) {
    console.error('知识库查询失败:', error);
    return {
      success: false,
      error: `查询失败: ${error.message}`
    };
  }
}