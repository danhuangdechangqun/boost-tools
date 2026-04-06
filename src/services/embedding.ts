// 阿里云 DashScope Embedding 服务

const DASHSCOPE_EMBEDDING_API = 'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding';
const DASHSCOPE_API_KEY = 'sk-c0971e3f52ab4981bcbc5385192999e9';
const DASHSCOPE_EMBEDDING_MODEL = 'text-embedding-v3';

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

  try {
    const response = await fetch(DASHSCOPE_EMBEDDING_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
      },
      body: JSON.stringify({
        model: DASHSCOPE_EMBEDDING_MODEL,
        input: {
          texts: input
        },
        parameters: {
          text_type: 'query'  // query 用于检索，document 用于入库
        }
      })
    });

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
    return data.output.embeddings
      .sort((a, b) => a.text_index - b.text_index)
      .map(item => item.embedding);
  } catch (error) {
    console.error('Embedding 调用错误:', error);
    throw error;
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