// 阿里云 DashScope Embedding 服务
// API Key 和模型名从配置中读取

import { getConfig } from './api';

// 默认模型名（配置为空时使用）
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-v3';

// 缓存配置，避免频繁读取
let cachedConfig: { apiKey: string; model: string } | null = null;

/**
 * 获取 Embedding 配置
 */
async function getEmbeddingConfig(): Promise<{ apiKey: string; model: string }> {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const config = await getConfig();
    cachedConfig = {
      apiKey: config.embedding?.apiKey || '',
      model: config.embedding?.model || DEFAULT_EMBEDDING_MODEL
    };
    return cachedConfig;
  } catch (e) {
    console.error('获取 Embedding 配置失败:', e);
    return { apiKey: '', model: DEFAULT_EMBEDDING_MODEL };
  }
}

/**
 * 清除配置缓存（配置更新后调用）
 */
export function clearEmbeddingConfigCache() {
  cachedConfig = null;
}

interface DashScopeEmbeddingResponse {
  output: {
    embeddings: {
      text_index: number;
      embedding: number[];
    }[];
  };
  usage: {
    total_tokens: number;
  };
  code?: string;
  message?: string;
}

/**
 * 调用阿里云 DashScope Embedding API 获取文本向量
 * @param texts 文本数组（单条或多条）
 * @returns 向量数组
 */
export async function getEmbedding(texts: string | string[]): Promise<number[][]> {
  // 确保输入是数组
  const input = Array.isArray(texts) ? texts : [texts];

  // 从配置获取 API Key 和模型
  const { apiKey, model } = await getEmbeddingConfig();

  if (!apiKey) {
    throw new Error('未配置向量模型 API Key，请在设置中配置');
  }

  // 创建超时控制器（30秒超时）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('[Embedding] 请求超时，正在中止...');
    controller.abort();
  }, 30000);

  // 开发环境通过 Vite 代理，生产环境直接调用
  const isDev = import.meta.env.DEV;
  const apiUrl = isDev
    ? '/api/dashscope/api/v1/services/embeddings/text-embedding/text-embedding'
    : 'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding';

  try {
    console.log('[Embedding] 开始请求:', { model, textCount: input.length });
    const startTime = Date.now();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        input: {
          texts: input
        },
        parameters: {
          text_type: 'query'  // query 用于检索，document 用于入库
        }
      }),
      signal: controller.signal  // 添加超时信号
    });

    clearTimeout(timeoutId);  // 清除超时计时器

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding API 调用失败: ${response.status} ${errorText}`);
    }

    const data: DashScopeEmbeddingResponse = await response.json();

    // 检查是否有错误
    if (data.code && data.code !== 'Success') {
      throw new Error(`Embedding API 错误: ${data.message}`);
    }

    // 按 text_index 排序返回向量
    const embeddings = data.output.embeddings
      .sort((a, b) => a.text_index - b.text_index)
      .map(item => item.embedding);

    console.log(`[Embedding] 请求完成，耗时 ${Date.now() - startTime}ms`);
    return embeddings;
  } catch (error: any) {
    clearTimeout(timeoutId);  // 清除超时计时器

    // 区分不同类型的错误
    let errorMessage = error.message || '未知错误';

    if (error.name === 'AbortError' || errorMessage.includes('abort')) {
      errorMessage = 'Embedding API 请求超时（30秒），请检查网络状况';
    } else if (errorMessage === 'Failed to fetch') {
      errorMessage = 'Embedding API 网络连接失败，请检查网络和 API 配置';
    }

    console.error('[Embedding] 调用错误:', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * 获取单个文本的向量
 */
export async function getSingleEmbedding(text: string): Promise<number[]> {
  const embeddings = await getEmbedding(text);
  return embeddings[0];
}

/**
 * 批量获取向量（支持分批处理，避免单次请求过大）
 * @param texts 文本数组
 * @param batchSize 每批数量（默认4）
 */
export async function getBatchEmbeddings(
  texts: string[],
  batchSize = 4
): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await getEmbedding(batch);
    results.push(...embeddings);
  }

  return results;
}