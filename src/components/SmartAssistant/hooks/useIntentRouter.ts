// 意图路由Hook - 入口拦截层，判断用户意图

import { useState, useCallback } from 'react';
import { IntentRouterResult, IntentType, IntentRouterConfig, DEFAULT_INTENT_ROUTER_CONFIG } from '../types';
import { matchToolKeywords, detectExplicitIntent, ALL_TOOL_NAMES } from '../config/toolKeywords';
import { callLlm, getSingleEmbedding } from '@/services/api';

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
    knowledgeContext?: KnowledgeBaseContext
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

      // 3. 知识库相似度检测（如果有知识库上下文）
      if (knowledgeContext && knowledgeContext.smallChunks.length > 0) {
        try {
          const queryEmbedding = await getSingleEmbedding(userInput);

          let maxScore = 0;
          for (const chunk of knowledgeContext.smallChunks) {
            if (chunk.embedding) {
              const score = cosineSimilarity(queryEmbedding, chunk.embedding);
              if (score > maxScore) {
                maxScore = score;
              }
            }
          }

          console.log('🔍 意图路由 - 知识库最大相似度:', maxScore, '阈值:', knowledgeContext.scoreThreshold);

          if (maxScore >= knowledgeContext.scoreThreshold) {
            return { type: 'knowledge', knowledgeScore: maxScore };
          }
        } catch (e) {
          console.warn('知识库相似度检测失败:', e);
          // 继续后续判断
        }
      }

      // 4. LLM语义判断
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
    // 构建简单的判断提示词
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
- knowledge: 查询知识库文档
- feedback: 分析用户反馈
- ticket: 分析工单数据
- todo: 添加待办任务

用户输入：${userInput}

请以JSON格式返回结果：
{
  "tool": "工具名（如果不匹配任何工具，填null）",
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