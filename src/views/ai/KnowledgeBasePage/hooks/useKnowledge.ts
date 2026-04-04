// 知识库管理Hook

import { useState, useCallback } from 'react';
import { Document, Chunk, KnowledgeStats, RAGConfig, DEFAULT_RAG_CONFIG } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/services/storage';

const DOCUMENTS_KEY = 'knowledge_documents';
const RAG_CONFIG_KEY = 'rag_config';

// 文本切片函数
function chunkText(text: string, chunkSize: number, overlap: number): Omit<Chunk, 'id' | 'documentId' | 'embedding'>[] {
  const chunks: Omit<Chunk, 'id' | 'documentId' | 'embedding'>[] = [];

  // 按段落分割
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());

  let currentChunk = '';
  let position = 0;

  for (const paragraph of paragraphs) {
    // 如果当前块加上新段落不超过大小限制，添加到当前块
    if (currentChunk.length + paragraph.length + 2 <= chunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      // 保存当前块
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          position: {
            start: position,
            end: position + currentChunk.length,
            index: chunks.length
          }
        });
        position += currentChunk.length;
      }

      // 开始新块
      currentChunk = paragraph;

      // 如果段落本身超过大小限制，需要分割
      if (paragraph.length > chunkSize) {
        const sentences = paragraph.match(/[^。！？.!?]+[。！？.!?]+/g) || [paragraph];
        for (const sentence of sentences) {
          if (sentence.length <= chunkSize) {
            if (currentChunk.length + sentence.length > chunkSize) {
              if (currentChunk.trim()) {
                chunks.push({
                  content: currentChunk.trim(),
                  position: {
                    start: position,
                    end: position + currentChunk.length,
                    index: chunks.length
                  }
                });
                position += currentChunk.length;
              }
              currentChunk = sentence;
            } else {
              currentChunk += sentence;
            }
          } else {
            // 句子太长，强制分割
            for (let i = 0; i < sentence.length; i += chunkSize - overlap) {
              const piece = sentence.slice(i, i + chunkSize);
              if (piece.trim()) {
                chunks.push({
                  content: piece.trim(),
                  position: {
                    start: position + i,
                    end: position + i + piece.length,
                    index: chunks.length
                  }
                });
              }
            }
          }
        }
      }
    }
  }

  // 保存最后一块
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      position: {
        start: position,
        end: position + currentChunk.length,
        index: chunks.length
      }
    });
  }

  return chunks;
}

export function useKnowledge() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<RAGConfig>(DEFAULT_RAG_CONFIG);

  // 加载文档列表
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await storage.read(DOCUMENTS_KEY);
      if (data) {
        const saved = JSON.parse(data);
        setDocuments(saved);
      }

      const configData = await storage.read(RAG_CONFIG_KEY);
      if (configData) {
        setConfig(JSON.parse(configData));
      }
    } catch (e) {
      console.error('加载文档失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 保存文档列表
  const saveDocuments = useCallback(async (docs: Document[]) => {
    try {
      await storage.write(DOCUMENTS_KEY, JSON.stringify(docs));
    } catch (e) {
      console.error('保存文档失败:', e);
    }
  }, []);

  // 保存配置
  const saveConfig = useCallback(async (newConfig: RAGConfig) => {
    try {
      await storage.write(RAG_CONFIG_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
    } catch (e) {
      console.error('保存配置失败:', e);
    }
  }, []);

  // 添加文档
  const addDocument = useCallback(async (
    name: string,
    type: Document['type'],
    content: string
  ): Promise<Document> => {
    // 创建文档
    const doc: Document = {
      id: uuidv4(),
      name,
      type,
      size: content.length,
      content,
      chunks: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newDocs = [...documents, doc];
    setDocuments(newDocs);
    await saveDocuments(newDocs);

    return doc;
  }, [documents, saveDocuments]);

  // 处理文档（切片）
  const processDocument = useCallback(async (docId: string): Promise<void> => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    // 更新状态为处理中
    const updatedDocs = documents.map(d =>
      d.id === docId ? { ...d, status: 'processing' as const } : d
    );
    setDocuments(updatedDocs);
    await saveDocuments(updatedDocs);

    try {
      // 切片
      const rawChunks = chunkText(doc.content, config.chunkSize, config.chunkOverlap);

      // 创建Chunk对象
      const chunks: Chunk[] = rawChunks.map(rc => ({
        id: uuidv4(),
        documentId: docId,
        content: rc.content,
        position: rc.position
      }));

      // 更新文档
      const finalDocs = documents.map(d =>
        d.id === docId ? {
          ...d,
          chunks,
          status: 'ready' as const,
          updatedAt: new Date().toISOString()
        } : d
      );

      setDocuments(finalDocs);
      await saveDocuments(finalDocs);

    } catch (e: any) {
      // 处理失败
      const errorDocs = documents.map(d =>
        d.id === docId ? {
          ...d,
          status: 'error' as const,
          error: e.message || '处理失败'
        } : d
      );

      setDocuments(errorDocs);
      await saveDocuments(errorDocs);
    }
  }, [documents, config, saveDocuments]);

  // 删除文档
  const deleteDocument = useCallback(async (docId: string) => {
    const newDocs = documents.filter(d => d.id !== docId);
    setDocuments(newDocs);
    await saveDocuments(newDocs);
  }, [documents, saveDocuments]);

  // 获取统计信息
  const getStats = useCallback((): KnowledgeStats => {
    const chunkCount = documents.reduce((sum, doc) => sum + doc.chunks.length, 0);
    const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);

    return {
      documentCount: documents.length,
      chunkCount,
      totalSize,
      lastUpdated: documents.length > 0
        ? documents.reduce((latest, doc) =>
          doc.updatedAt > latest ? doc.updatedAt : latest,
          documents[0].updatedAt
        )
        : new Date().toISOString()
    };
  }, [documents]);

  // 获取所有chunks（用于检索）
  const getAllChunks = useCallback((): Chunk[] => {
    return documents.flatMap(doc => doc.chunks);
  }, [documents]);

  // 获取文档内容
  const getDocument = useCallback((docId: string): Document | undefined => {
    return documents.find(d => d.id === docId);
  }, [documents]);

  return {
    documents,
    loading,
    config,
    loadDocuments,
    saveConfig,
    addDocument,
    processDocument,
    deleteDocument,
    getStats,
    getAllChunks,
    getDocument
  };
}