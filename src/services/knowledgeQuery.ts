// 知识库查询服务 - 供智能助手调用
// 复用知识库页面的 RAG 逻辑

import { storage } from '@/services/storage';
import { Document, SmallChunk, RAGConfig, DEFAULT_RAG_CONFIG } from '@/views/ai/KnowledgeBasePage/types';
import { getSingleEmbedding, getBatchEmbeddings, callLlm } from '@/services/api';
import { promptService } from '@/services/promptService';

const DOCUMENTS_KEY = 'knowledge_documents';
const RAG_CONFIG_KEY = 'rag_config';

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

// 知识库查询结果
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

// 查询知识库
export async function queryKnowledge(userQuery: string): Promise<KnowledgeQueryResult> {
  try {
    // 1. 加载知识库数据
    const documents = await storage.read<Document[]>(DOCUMENTS_KEY) || [];
    const config = await storage.read<RAGConfig>(RAG_CONFIG_KEY) || DEFAULT_RAG_CONFIG;

    console.log('📚 知识库查询 - 文档数:', documents.length);

    // 2. 检查是否有就绪的文档
    const readyDocs = documents.filter(d => d.status === 'ready');
    if (readyDocs.length === 0) {
      return {
        success: false,
        error: '📚 当前知识库暂无文档，请先导入文档后再提问。'
      };
    }

    // 3. 获取所有 SmallChunks（复用知识库页面的逻辑）
    const smallChunks: SmallChunk[] = documents.flatMap(doc =>
      (doc.bigChunks || []).flatMap(bc => bc.smallChunks || [])
    );

    console.log('📚 知识库查询 - SmallChunks 数:', smallChunks.length);

    if (smallChunks.length === 0) {
      return {
        success: false,
        error: '📚 知识库中没有可检索的内容片段。'
      };
    }

    // 4. 获取查询向量
    const queryEmbedding = await getSingleEmbedding(userQuery);

    // 5. 为没有 embedding 的 chunks 获取向量（关键！复用 RAG 的逻辑）
    const chunksWithoutEmbedding = smallChunks.filter(c => !c.embedding);
    console.log('📚 知识库查询 - 需要获取向量的 chunks:', chunksWithoutEmbedding.length);

    if (chunksWithoutEmbedding.length > 0) {
      const contentsWithoutEmbedding = chunksWithoutEmbedding.map(c => c.content);
      const newEmbeddings = await getBatchEmbeddings(contentsWithoutEmbedding);

      // 将向量分配给 chunks
      chunksWithoutEmbedding.forEach((chunk, i) => {
        chunk.embedding = newEmbeddings[i];
      });
    }

    // 6. 计算相似度
    const allScores: { score: number; preview: string }[] = [];
    const results: Array<{
      chunk: SmallChunk;
      document: Document;
      score: number;
      bigChunkContent?: string;
    }> = [];

    for (const smallChunk of smallChunks) {
      if (!smallChunk.embedding) continue;

      const score = cosineSimilarity(queryEmbedding, smallChunk.embedding);
      allScores.push({
        score,
        preview: smallChunk.content.slice(0, 50)
      });

      if (score >= config.scoreThreshold) {
        const doc = documents.find(d => d.id === smallChunk.documentId);
        if (doc) {
          const bigChunk = doc.bigChunks?.find(bc => bc.id === smallChunk.bigChunkId);
          results.push({
            chunk: smallChunk,
            document: doc,
            score,
            bigChunkContent: bigChunk?.content
          });
        }
      }
    }

    console.log('🔍 知识库查询 - 相似度 Top5:', allScores.sort((a, b) => b.score - a.score).slice(0, 5));
    console.log('✅ 知识库查询 - 命中阈值(>=', config.scoreThreshold, ')的片段数:', results.length);

    // 7. 按分数排序，取 Top K
    const topResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, config.topK);

    if (topResults.length === 0) {
      return {
        success: false,
        error: `📚 知识库中没有找到与问题相关的内容（相似度阈值: ${config.scoreThreshold}）。请尝试换一种方式提问。`
      };
    }

    // 8. 构建上下文
    const contextParts = topResults.map((result, i) => {
      const content = result.bigChunkContent || result.chunk.content;
      return `[片段${i + 1}] (来源: ${result.document.name})\n${content}`;
    });
    const context = contextParts.join('\n\n---\n\n');

    // 9. 获取提示词模板
    let prompt: string;
    try {
      const promptTemplate = await promptService.get('rag_answer');
      if (promptTemplate?.template) {
        prompt = promptService.render(promptTemplate.template, {
          context: context || '（没有找到相关知识片段）',
          query: userQuery
        });
      } else {
        throw new Error('No template');
      }
    } catch {
      // 默认提示词
      prompt = `你是一个智能助手，需要基于知识库回答用户问题。

以下是与问题相关的知识片段：
${context || '（没有找到相关知识片段）'}

用户问题：${userQuery}

请基于以上知识片段回答问题。如果知识库中没有相关信息，请诚实告知"知识库中没有找到相关信息"。

回答格式要求：
1. 直接回答问题，简洁清晰
2. 如果引用了知识库内容，标注来源
3. 如果信息不足，说明还需要什么信息`;
    }

    // 10. 调用 LLM 生成回答
    const response = await callLlm(prompt);

    // 11. 返回结果
    return {
      success: true,
      answer: response,
      sources: topResults.map(r => ({
        documentName: r.document.name,
        content: (r.bigChunkContent || r.chunk.content).substring(0, 200),
        score: r.score
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