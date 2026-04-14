// 知识库+RAG系统 - 类型定义

// 文档类型
export type DocumentType = 'docx' | 'pdf' | 'md' | 'txt' | 'json';

// 文档状态
export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'error';

// 边界识别类型
export type BoundaryType = 'heading' | 'numbered' | 'newline' | 'paragraph' | 'page' | 'code' | 'table' | 'list';

// SmallChunk - 用于向量检索的小片段
export interface SmallChunk {
  id: string;
  documentId: string;
  bigChunkId: string;        // 关联的BigChunk ID
  content: string;
  embedding?: number[];       // 向量只存储在Small上
  position: {
    start: number;           // 在BigChunk中的相对位置
    end: number;
    index: number;           // 在BigChunk中的序号
  };
  metadata?: {               // 兼容旧数据
    pageNumber?: number;
    heading?: string;
  };
}

// BigChunk - 语义完整的大片段
export interface BigChunk {
  id: string;
  documentId: string;
  content: string;           // 宯整语义段落内容
  smallChunks: SmallChunk[]; // 关联的小片段数组
  position: {
    start: number;           // 在原文中的起始位置
    end: number;             // 在原文中的结束位置
    index: number;           // BigChunk 序号
  };
  boundaryType: BoundaryType; // 边界识别类型
  metadata?: {
    headingPath?: string[];      // 标题层级路径
    headingLevel?: number;       // 标题层级（1-6）
  };
}

// 保留 Chunk 作为兼容类型（指向 SmallChunk）
export type Chunk = SmallChunk;

// 文档定义
export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  size: number;
  content: string;
  html?: string;             // Word 文件的 HTML 内容
  bigChunks: BigChunk[];     // 改用 BigChunk 结构
  status: DocumentStatus;
  error?: string;
  createdAt: string;
  updatedAt: string;
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
  chunkSize: number;         // Small Chunk 大小
  chunkOverlap: number;      // Small Chunk overlap
  bigChunkMaxSize: number;   // Big Chunk 最大大小（新增）
  topK: number;
  scoreThreshold: number;
}

// 默认RAG配置
export const DEFAULT_RAG_CONFIG: RAGConfig = {
  chunkSize: 250,            // Small Chunk 大小（从500改为250）
  chunkOverlap: 50,
  bigChunkMaxSize: 800,      // 新增：Big Chunk 最大大小
  topK: 3,
  scoreThreshold: 0.5        // 降低阈值，提高召回率
};

// 支持的文件类型
export const SUPPORTED_FILE_TYPES: { extension: string; type: DocumentType; name: string }[] = [
  { extension: '.docx', type: 'docx', name: 'Word文档' },
  { extension: '.pdf', type: 'pdf', name: 'PDF文档' },
  { extension: '.md', type: 'md', name: 'Markdown' },
  { extension: '.txt', type: 'txt', name: '文本文件' },
  { extension: '.json', type: 'json', name: 'JSON文件' }
];