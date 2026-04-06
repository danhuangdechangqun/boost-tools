// 知识库管理Hook

import { useState, useCallback } from 'react';
import { Document, Chunk, BigChunk, KnowledgeStats, RAGConfig, DEFAULT_RAG_CONFIG } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/services/storage';

const DOCUMENTS_KEY = 'knowledge_documents';
const RAG_CONFIG_KEY = 'rag_config';

// 临时切片结果（用于创建BigChunk）
interface TempChunk {
  content: string;
  position: {
    start: number;
    end: number;
    index: number;
  };
}

// 文本切片函数
function chunkText(text: string, chunkSize: number, overlap: number): TempChunk[] {
  const chunks: TempChunk[] = [];

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
      bigChunks: [],
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
  // 可以传入文档对象，避免状态更新延迟导致找不到文档
  const processDocument = useCallback(async (docId: string, docInput?: Document): Promise<void> => {
    // 优先使用传入的文档对象，否则从状态中查找
    const doc = docInput || documents.find(d => d.id === docId);
    if (!doc) {
      console.error('找不到文档:', docId);
      return;
    }

    // 更新状态为处理中（使用函数式更新）
    setDocuments(prevDocs => {
      const exists = prevDocs.find(d => d.id === docId);
      if (exists) {
        const updatedDocs = prevDocs.map(d =>
          d.id === docId ? { ...d, status: 'processing' as const } : d
        );
        saveDocuments(updatedDocs);
        return updatedDocs;
      }
      // 如果文档不在列表中（新导入），先添加进去
      const newDocs = [...prevDocs, { ...doc, status: 'processing' as const }];
      saveDocuments(newDocs);
      return newDocs;
    });

    try {
      // 切片 - 暂时创建简单的BigChunk结构
      // TODO: Task 2 将实现真正的语义边界识别切分
      const rawChunks = chunkText(doc.content, config.chunkSize, config.chunkOverlap);

      // 创建临时的BigChunk结构（每个chunk作为一个BigChunk，包含一个SmallChunk）
      const bigChunks: BigChunk[] = rawChunks.map((rc, idx) => {
        const bigChunkId = uuidv4();
        return {
          id: bigChunkId,
          documentId: docId,
          content: rc.content,
          smallChunks: [{
            id: uuidv4(),
            documentId: docId,
            bigChunkId,
            content: rc.content,
            position: {
              start: 0,
              end: rc.content.length,
              index: 0
            }
          }],
          position: rc.position,
          boundaryType: 'paragraph' as const
        };
      });

      // 使用函数式更新避免闭包问题
      setDocuments(prevDocs => {
        const finalDocs = prevDocs.map(d =>
          d.id === docId ? {
            ...d,
            bigChunks,
            status: 'ready' as const,
            updatedAt: new Date().toISOString()
          } : d
        );
        saveDocuments(finalDocs);
        return finalDocs;
      });

    } catch (e: any) {
      // 处理失败
      setDocuments(prevDocs => {
        const errorDocs = prevDocs.map(d =>
          d.id === docId ? {
            ...d,
            status: 'error' as const,
            error: e.message || '处理失败'
          } : d
        );
        saveDocuments(errorDocs);
        return errorDocs;
      });
    }
  }, [config, saveDocuments]);

  // 删除文档
  const deleteDocument = useCallback(async (docId: string) => {
    const newDocs = documents.filter(d => d.id !== docId);
    setDocuments(newDocs);
    await saveDocuments(newDocs);
  }, [documents, saveDocuments]);

  // 获取统计信息
  const getStats = useCallback((): KnowledgeStats => {
    const chunkCount = documents.reduce((sum, doc) =>
      sum + doc.bigChunks.reduce((s, bc) => s + bc.smallChunks.length, 0), 0);
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
    return documents.flatMap(doc =>
      doc.bigChunks.flatMap(bc => bc.smallChunks)
    );
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