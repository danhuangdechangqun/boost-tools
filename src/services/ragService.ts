// RAG 核心服务 - 知识库检索问答的核心逻辑
// 供知识库页面和智能助手共用

import { Document, SmallChunk, RAGConfig, SearchResult } from '@/views/ai/KnowledgeBasePage/types';
import { getSingleEmbedding, getBatchEmbeddings, callLlm } from '@/services/api';
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
    normB += a[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// RAG 查询结果
export interface RAGResult {
  success: boolean;
  answer?: string;
  error?: string;
  sources?: SearchResult[];
  stage?: 'embedding' | 'search' | 'llm';  // 错误发生阶段
}

/**
 * 执行 RAG 检索和问答
 * @param query 用户问题
 * @param documents 所有文档（包含 bigChunks 和 smallChunks）
 * @param config RAG 配置
 * @returns RAG 查询结果
 */
export async function executeRAG(
  query: string,
  documents: Document[],
  config: RAGConfig
): Promise<RAGResult> {
  console.log('[RAG] 开始处理问题:', query);
  const startTime = Date.now();

  try {
    // 1. 检查是否有就绪的文档
    const readyDocs = documents.filter(d => d.status === 'ready');
    if (readyDocs.length === 0) {
      return {
        success: false,
        error: '📚 当前知识库暂无文档，请先导入文档后再提问。',
        stage: 'search'
      };
    }

    // 2. 获取所有 SmallChunks
    const smallChunks: SmallChunk[] = documents.flatMap(doc =>
      (doc.bigChunks || []).flatMap(bc => bc.smallChunks || [])
    );

    console.log('[RAG] SmallChunks 数:', smallChunks.length);

    if (smallChunks.length === 0) {
      return {
        success: false,
        error: '📚 知识库中没有可检索的内容片段。',
        stage: 'search'
      };
    }

    // 3. 获取查询向量
    console.log('[RAG] 开始向量检索...');
    const searchStartTime = Date.now();

    let queryEmbedding: number[];
    try {
      queryEmbedding = await getSingleEmbedding(query);
    } catch (e: any) {
      return {
        success: false,
        error: `向量检索阶段失败: ${e.message}`,
        stage: 'embedding'
      };
    }

    // 4. 为没有 embedding 的 chunks 获取向量
    const chunksWithoutEmbedding = smallChunks.filter(c => !c.embedding);
    console.log('[RAG] 需要获取向量的 chunks:', chunksWithoutEmbedding.length);

    if (chunksWithoutEmbedding.length > 0) {
      const contentsWithoutEmbedding = chunksWithoutEmbedding.map(c => c.content);

      try {
        const newEmbeddings = await getBatchEmbeddings(contentsWithoutEmbedding);

        // 将向量分配给 chunks
        chunksWithoutEmbedding.forEach((chunk, i) => {
          chunk.embedding = newEmbeddings[i];
        });
      } catch (e: any) {
        return {
          success: false,
          error: `向量检索阶段失败: ${e.message}`,
          stage: 'embedding'
        };
      }
    }

    // 5. 计算相似度并筛选
    const allScores: { index: number; score: number; preview: string }[] = [];
    const results: SearchResult[] = [];
    const getDocument = (id: string) => documents.find(d => d.id === id);

    for (const smallChunk of smallChunks) {
      if (!smallChunk.embedding) continue;

      const score = cosineSimilarity(queryEmbedding, smallChunk.embedding);
      allScores.push({
        index: smallChunk.position.index,
        score,
        preview: smallChunk.content.slice(0, 50)
      });

      if (score >= config.scoreThreshold) {
        const doc = getDocument(smallChunk.documentId);
        if (doc) {
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

    console.log('[RAG] 检索调试 - 查询:', query);
    console.log('[RAG] 所有片段相似度:', allScores.sort((a, b) => b.score - a.score).slice(0, 5));
    console.log(`[RAG] 检索完成，找到 ${results.length} 个相关片段，耗时 ${Date.now() - searchStartTime}ms`);

    // 6. 按分数排序，取 Top K
    const topResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, config.topK);

    if (topResults.length === 0) {
      return {
        success: false,
        error: `📚 知识库中没有找到与问题相关的内容（相似度阈值: ${config.scoreThreshold}）。请尝试换一种方式提问。`,
        stage: 'search'
      };
    }

    // 7. 构建上下文
    const contextParts = topResults.map((result, i) => {
      const bigChunkContent = (result.chunk as any).bigChunkContent || result.chunk.content;
      return `[片段${i + 1}] (来源: ${result.document.name})\n${bigChunkContent}`;
    });
    const context = contextParts.join('\n\n---\n\n');

    // 8. 获取提示词模板并构建 prompt
    let prompt: string;
    try {
      const promptTemplate = await promptService.get('rag_answer');
      if (promptTemplate?.template) {
        prompt = promptService.render(promptTemplate.template, {
          context: context || '（没有找到相关知识片段）',
          query
        });
      } else {
        throw new Error('No template');
      }
    } catch {
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

    // 9. 调用 LLM 生成回答
    console.log('[RAG] 开始调用 LLM...');
    const llmStartTime = Date.now();

    let response: string;
    try {
      response = await callLlm(prompt);
    } catch (e: any) {
      return {
        success: false,
        error: `答案生成阶段失败: ${e.message}`,
        stage: 'llm'
      };
    }

    console.log(`[RAG] LLM 响应完成，耗时 ${Date.now() - llmStartTime}ms`);
    console.log(`[RAG] 处理完成，总耗时 ${Date.now() - startTime}ms`);

    // 10. 返回结果
    return {
      success: true,
      answer: response,
      sources: topResults
    };

  } catch (error: any) {
    console.error('[RAG] 处理失败:', error);

    // 根据错误信息判断失败阶段
    let errorMessage = error.message || '未知错误';
    let stage: 'embedding' | 'search' | 'llm' = 'llm';

    if (errorMessage.includes('向量') ||
        errorMessage.includes('Embedding') ||
        errorMessage.includes('embedding') ||
        errorMessage.includes('API Key')) {
      stage = 'embedding';
    } else if (errorMessage.includes('LLM') ||
               errorMessage.includes('API') ||
               errorMessage.includes('fetch') ||
               errorMessage.includes('网络') ||
               errorMessage.includes('超时') ||
               errorMessage.includes('CORS')) {
      stage = 'llm';
    }

    return {
      success: false,
      error: `${stage === 'embedding' ? '向量检索阶段' : '答案生成阶段'}失败: ${errorMessage}`,
      stage
    };
  }
}