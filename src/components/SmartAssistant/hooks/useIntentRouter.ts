// 意图路由Hook - 入口拦截层，判断用户意图

import { useState, useCallback } from 'react';
import { IntentRouterResult, IntentType, IntentRouterConfig, DEFAULT_INTENT_ROUTER_CONFIG } from '../types';
import { matchToolKeywords, detectExplicitIntent, ALL_TOOL_NAMES } from '../config/toolKeywords';
import { callLlm, getSingleEmbedding, getBatchEmbeddings } from '@/services/api';
import { storage } from '@/services/storage';
import { Document, RAGConfig, DEFAULT_RAG_CONFIG, SmallChunk } from '@/views/ai/KnowledgeBasePage/types';

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
    normB += a[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 从 storage 加载知识库数据（用于自动检测）
async function loadKnowledgeData(): Promise<{
  documents: Document[];
  config: RAGConfig;
  smallChunks: SmallChunk[];
}> {
  try {
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

    const smallChunks = documents.flatMap(doc =>
      (doc.bigChunks || []).flatMap(bc => bc.smallChunks || [])
    );
    return { documents, config, smallChunks };
  } catch {
    return { documents: [], config: DEFAULT_RAG_CONFIG, smallChunks: [] };
  }
}

// 工具名到IntentType的映射
const TOOL_NAME_TO_INTENT: Record<string, IntentType> = {
  uuid: 'uuid',
  json_format: 'json_format',
  xml_format: 'xml_format',
  crypto: 'crypto',
  regex: 'regex',
  cron: 'cron',
  sql_in: 'sql_in',
  text_diff: 'text_diff',
  knowledge: 'knowledge',
  feedback: 'feedback',
  ticket: 'ticket',
  todo: 'todo'
};

// 生成引导提示语
function generateClarifyMessage(input: string, suggestedTool?: string, toolNotFound?: string): string {
  if (toolNotFound) {
    return `未找到 '${toolNotFound}' 工具。\n\n可用工具：UUID生成、JSON格式化、XML格式化、加密计算(MD5/SHA)、正则生成、Cron表达式、SQL IN转换、文本对比、知识库查询等。\n\n请确认你要调用的工具。`;
  }

  if (suggestedTool) {
    return `我不太确定你的意图。你是要调用 '${suggestedTool}' 工具吗？\n\n请明确告诉我：\n- 调用 ${suggestedTool} 工具\n- 或者查知识库`;
  }

  return `我不太确定你的意图。\n\n你可以告诉我：\n- 要调用什么工具？（如：生成UUID、格式化JSON、计算MD5）\n- 还是查询知识库？`;
}

interface KnowledgeBaseContext {
  smallChunks: any[];
  getDocument: (id: string) => any;
  scoreThreshold: number;
}

export function useIntentRouter(config: IntentRouterConfig = DEFAULT_INTENT_ROUTER_CONFIG) {
  const [loading, setLoading] = useState(false);

  // 路由意图
  const routeIntent = useCallback(async (
    userInput: string,
    knowledgeContext?: KnowledgeBaseContext,
    knowledgeBaseReady?: boolean  // 新增：知识库是否就绪标志
  ): Promise<IntentRouterResult> => {
    setLoading(true);

    try {
      // 1. 检测用户是否明确指定意图
      const explicitIntent = detectExplicitIntent(userInput);

      if (explicitIntent?.explicitIntent === 'knowledge') {
        // 明确指定查知识库
        return { type: 'knowledge' };
      }

      if (explicitIntent?.explicitIntent === 'tool') {
        const toolName = explicitIntent.explicitTool!;
        const intentType = TOOL_NAME_TO_INTENT[toolName];

        if (intentType) {
          // 明确指定且工具存在
          return { type: 'tool', tool: intentType, confidence: 1.0 };
        } else {
          // 明确指定但工具不存在
          return {
            type: 'clarify',
            message: generateClarifyMessage(userInput, undefined, toolName)
          };
        }
      }

      // 2. 关键词快速匹配
      const keywordMatch = matchToolKeywords(userInput);
      if (keywordMatch) {
        const intentType = TOOL_NAME_TO_INTENT[keywordMatch];
        if (intentType) {
          return { type: 'tool', tool: intentType, confidence: 1.0 };
        }
      }

      // 3. 知识库相似度检测（优先级最高）
      // 如果知识库就绪，自动获取知识库数据进行相似度检测
      let localKnowledgeContext: KnowledgeBaseContext | null = knowledgeContext || null;

      if (!localKnowledgeContext && knowledgeBaseReady) {
        // 没有传入上下文，但知识库就绪，自动加载
        const { documents, config: ragConfig, smallChunks } = await loadKnowledgeData();
        const getDocument = (id: string) => documents.find(d => d.id === id);

        if (smallChunks.length > 0) {
          localKnowledgeContext = {
            smallChunks,
            getDocument,
            scoreThreshold: ragConfig.scoreThreshold
          };
        }
      }

      if (localKnowledgeContext && localKnowledgeContext.smallChunks.length > 0) {
        try {
          console.log('[意图路由] 开始知识库相似度检测...');
          const queryEmbedding = await getSingleEmbedding(userInput);

          // 为没有 embedding 的 chunks 获取向量
          const chunksWithoutEmbedding = localKnowledgeContext.smallChunks.filter(c => !c.embedding);
          if (chunksWithoutEmbedding.length > 0) {
            const contentsWithoutEmbedding = chunksWithoutEmbedding.map(c => c.content);
            const newEmbeddings = await getBatchEmbeddings(contentsWithoutEmbedding);
            chunksWithoutEmbedding.forEach((chunk, i) => {
              chunk.embedding = newEmbeddings[i];
            });
          }

          let maxScore = 0;
          for (const chunk of localKnowledgeContext.smallChunks) {
            if (chunk.embedding) {
              const score = cosineSimilarity(queryEmbedding, chunk.embedding);
              if (score > maxScore) {
                maxScore = score;
              }
            }
          }

          console.log('[意图路由] 知识库最大相似度:', maxScore, '阈值:', localKnowledgeContext.scoreThreshold);

          // 如果相似度超过阈值，优先返回知识库查询
          if (maxScore >= localKnowledgeContext.scoreThreshold) {
            return { type: 'knowledge', knowledgeScore: maxScore };
          }
        } catch (e) {
          console.warn('[意图路由] 知识库相似度检测失败:', e);
          // 继续后续判断
        }
      }

      // 4. LLM语义判断（作为后备）
      const llmResult = await classifyIntentWithLLM(userInput);

      if (llmResult.tool && llmResult.confidence >= config.toolConfidenceThreshold) {
        const intentType = TOOL_NAME_TO_INTENT[llmResult.tool];
        if (intentType) {
          return { type: 'tool', tool: intentType, confidence: llmResult.confidence };
        }
      }

      // 5. 置信度不足，引导澄清
      return {
        type: 'clarify',
        message: generateClarifyMessage(userInput, llmResult.tool)
      };

    } catch (error) {
      console.error('意图路由失败:', error);
      return {
        type: 'clarify',
        message: '意图判断出错，请明确告诉我你要做什么。'
      };
    } finally {
      setLoading(false);
    }
  }, [config]);

  return {
    loading,
    routeIntent
  };
}

// 使用LLM判断意图
async function classifyIntentWithLLM(userInput: string): Promise<{ tool?: string; confidence: number }> {
  try {
    // 构建更精确的判断提示词
    const prompt = `分析以下用户输入，判断用户想要调用哪个工具。

可用工具列表：
- uuid: 生成唯一标识符UUID
- json_format: 格式化JSON数据
- xml_format: 格式化XML数据
- crypto: 计算MD5/SHA哈希值
- regex: 生成正则表达式
- cron: 生成定时任务表达式
- sql_in: 将数据转换为SQL IN格式
- text_diff: 对比两段文本差异
- knowledge: 查询知识库文档（如果用户在提问问题，很可能是要查询知识库）
- feedback: 分析用户反馈数据（需要用户提供反馈数据）
- ticket: 分析工单数据（需要用户提供工单数据表格）
- todo: 添加待办任务

重要区分：
- "工单分析"工具是用于分析用户提供的数据表格，不是回答工单相关问题
- 如果用户只是提问问题（如"为什么工单看不到"），这是知识库查询，不是工单分析
- "反馈分析"工具是用于分析用户反馈数据，不是回答反馈相关问题

用户输入：${userInput}

请以JSON格式返回结果：
{
  "tool": "工具名（如果是提问问题，优先判断为knowledge；如果不确定，填null）",
  "confidence": 0.0-1.0之间的置信度
}

只返回JSON，不要其他内容。`;

    const response = await callLlm(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        tool: result.tool || undefined,
        confidence: result.confidence || 0
      };
    }

    return { confidence: 0 };

  } catch (error) {
    console.error('LLM意图判断失败:', error);
    return { confidence: 0 };
  }
}