// 知识库管理Hook

import { useState, useCallback } from 'react';
import { Document, SmallChunk, KnowledgeStats, RAGConfig, DEFAULT_RAG_CONFIG } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/services/storage';
import { chunkDocument } from '@/utils/chunking';

const DOCUMENTS_KEY = 'knowledge_documents';
const RAG_CONFIG_KEY = 'rag_config';

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
      // 使用新的切分架构：Big Chunk -> Small Chunk
      const bigChunks = chunkDocument(doc.content, doc.type, docId, {
        bigChunkMaxSize: config.bigChunkMaxSize,
        smallChunkSize: config.chunkSize,
        smallChunkOverlap: config.chunkOverlap
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
    const smallChunkCount = documents.reduce(
      (sum, doc) => sum + (doc.bigChunks || []).reduce(
        (s, bc) => s + bc.smallChunks.length, 0
      ), 0
    );
    const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);

    return {
      documentCount: documents.length,
      chunkCount: smallChunkCount,
      totalSize,
      lastUpdated: documents.length > 0
        ? documents.reduce((latest, doc) =>
          doc.updatedAt > latest ? doc.updatedAt : latest,
          documents[0].updatedAt
        )
        : new Date().toISOString()
    };
  }, [documents]);

  // 获取所有SmallChunks（用于向量检索）
  const getAllChunks = useCallback((): SmallChunk[] => {
    return documents.flatMap(doc =>
      (doc.bigChunks || []).flatMap(bc => bc.smallChunks)
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