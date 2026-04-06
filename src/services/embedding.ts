// Doubao Embedding 服务

const DOUBAO_EMBEDDING_API = 'https://ark.cn-beijing.volces.com/api/v3/embeddings';
const DOUBAO_API_KEY = '3cedbda2-bb5b-4ffc-b49a-19afdf86d8f9';
const DOUBAO_EMBEDDING_MODEL = 'doubao-embedding-text-240715';

interface EmbeddingResponse {
  id: string;
  model: string;
  object: string;
  data: {
    embedding: number[];
    index: number;
    object: string;
  }[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * 调用 Doubao Embedding API 获取文本向量
 * @param texts 文本数组（单条或多条）
 * @returns 向量数组
 */
export async function getEmbedding(texts: string | string[]): Promise<number[][]> {
  // 确保输入是数组
  const input = Array.isArray(texts) ? texts : [texts];

  try {
    const response = await fetch(DOUBAO_EMBEDDING_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DOUBAO_API_KEY}`
      },
      body: JSON.stringify({
        model: DOUBAO_EMBEDDING_MODEL,
        input,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding API 调用失败: ${response.status} ${errorText}`);
    }

    const data: EmbeddingResponse = await response.json();

    // 按 index 排序返回向量
    return data.data
      .sort((a, b) => a.index - b.index)
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
 * @param batchSize 每批数量（默认4，Doubao建议不超过4条）
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