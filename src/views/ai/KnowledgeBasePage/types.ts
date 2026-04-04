// 知识库+RAG系统 - 类型定义

// 文档类型
export type DocumentType = 'docx' | 'pdf' | 'md' | 'txt' | 'json';

// 文档状态
export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'error';

// 文档定义
export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  size: number;
  content: string;
  chunks: Chunk[];
  status: DocumentStatus;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// 文本片段
export interface Chunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  position: {
    start: number;
    end: number;
    index: number;
  };
  metadata?: {
    pageNumber?: number;
    heading?: string;
  };
}

// 搜索结果
export interface SearchResult {
  chunk: Chunk;
  document: Document;
  score: number;
}

// 问答消息
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SearchResult[];
  timestamp: string;
}

// 知识库统计
export interface KnowledgeStats {
  documentCount: number;
  chunkCount: number;
  totalSize: number;
  lastUpdated: string;
}

// RAG配置
export interface RAGConfig {
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  scoreThreshold: number;
}

// 默认RAG配置
export const DEFAULT_RAG_CONFIG: RAGConfig = {
  chunkSize: 500,
  chunkOverlap: 50,
  topK: 3,
  scoreThreshold: 0.7
};

// 支持的文件类型
export const SUPPORTED_FILE_TYPES: { extension: string; type: DocumentType; name: string }[] = [
  { extension: '.docx', type: 'docx', name: 'Word文档' },
  { extension: '.pdf', type: 'pdf', name: 'PDF文档' },
  { extension: '.md', type: 'md', name: 'Markdown' },
  { extension: '.txt', type: 'txt', name: '文本文件' },
  { extension: '.json', type: 'json', name: 'JSON文件' }
];