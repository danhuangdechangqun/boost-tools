// LLM服务 - 支持Anthropic和OpenAI API格式

import { AppConfig, LLMResponse } from '@/types';
import { getConfig } from './storage';

let cachedConfig: AppConfig['llm'] | null = null;

// 检测是否在开发环境（使用Vite代理）
const isDev = typeof window !== 'undefined' &&
  (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1');

export const initLLM = async () => {
  const config = await getConfig();
  cachedConfig = config?.llm || null;
};

// 构建完整的API端点URL
const buildEndpoint = (baseUrl: string, format: string): string => {
  // 移除末尾斜杠
  let url = baseUrl.replace(/\/+$/, '');

  // 根据API格式添加路径
  if (format === 'openai') {
    // OpenAI格式: /v1/chat/completions
    if (!url.includes('/v1')) {
      url = `${url}/v1`;
    }
    return `${url}/chat/completions`;
  } else {
    // Anthropic格式: /v1/messages
    // 检查URL是否已包含完整路径
    if (url.includes('/apps/anthropic')) {
      // 阿里百炼等特殊路径
      return `${url}/v1/messages`;
    }
    if (url.endsWith('/v1')) {
      return `${url}/messages`;
    }
    if (!url.includes('/v1')) {
      url = `${url}/v1`;
    }
    return `${url}/messages`;
  }
};

export const callLlm = async (prompt: string, options?: { maxTokens?: number }): Promise<LLMResponse> => {
  if (!cachedConfig?.apiUrl || !cachedConfig?.apiKey) {
    return { success: false, error: '请先在设置中配置LLM API' };
  }

  if (!cachedConfig.model) {
    return { success: false, error: '请配置模型名称' };
  }

  try {
    const format = cachedConfig.format || 'claude';
    let endpoint = buildEndpoint(cachedConfig.apiUrl, format);

    // 开发环境使用代理绕过CORS
    if (isDev) {
      if (cachedConfig.apiUrl.includes('dashscope.aliyuncs.com')) {
        endpoint = endpoint.replace('https://coding.dashscope.aliyuncs.com', '/api/anthropic-coding');
        endpoint = endpoint.replace('https://dashscope.aliyuncs.com', '/api/anthropic');
      } else if (cachedConfig.apiUrl.includes('openai.com')) {
        endpoint = endpoint.replace('https://api.openai.com', '/api/openai');
      } else {
        // 通用代理 - 需要在vite.config.ts中配置
        endpoint = `/api/llm${endpoint.replace(cachedConfig.apiUrl, '')}`;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let body: any;

    if (format === 'openai') {
      headers['Authorization'] = `Bearer ${cachedConfig.apiKey}`;
      body = {
        model: cachedConfig.model,
        max_tokens: options?.maxTokens || 4096,
        messages: [{ role: 'user', content: prompt }]
      };
    } else {
      // Anthropic格式
      headers['x-api-key'] = cachedConfig.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model: cachedConfig.model,
        max_tokens: options?.maxTokens || 4096,
        messages: [{ role: 'user', content: prompt }]
      };
    }

    console.log('LLM Request:', { endpoint, model: cachedConfig.model, format });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM Error Response:', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return {
          success: false,
          error: errorJson.error?.message || errorJson.message || `API错误: ${response.status}`
        };
      } catch {
        return { success: false, error: `API错误: ${response.status} - ${errorText.slice(0, 200)}` };
      }
    }

    const data = await response.json();
    const content = extractContent(data, format);
    console.log('LLM Response:', { success: true, contentLength: content.length });
    return { success: true, content };
  } catch (error: any) {
    console.error('LLM Fetch Error:', error);
    return { success: false, error: `网络错误: ${error.message}` };
  }
};

const extractContent = (data: any, format?: string): string => {
  if (format === 'openai') {
    return data.choices?.[0]?.message?.content || '';
  }
  // Anthropic格式
  return data.content?.[0]?.text || '';
};

export const testLlmConnection = async (): Promise<LLMResponse> => {
  return callLlm('请回复"连接成功"三个字', { maxTokens: 50 });
};

export const updateLLMConfig = (config: AppConfig['llm']) => {
  cachedConfig = config;
};