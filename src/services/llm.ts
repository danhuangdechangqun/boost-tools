// LLM服务 - 通过Tauri后端调用API（绕过CORS）

import { AppConfig, LLMResponse } from '@/types';
import { getConfig } from './storage';

// 检测并缓存 Tauri invoke 函数
let _invoke: ((cmd: string, args?: Record<string, unknown>) => Promise<any>) | null = null;
let _tauriDetected: boolean | null = null;

const detectTauri = async (): Promise<boolean> => {
  if (_tauriDetected !== null) return _tauriDetected;
  try {
    // 动态导入 Tauri API
    const { invoke } = await import('@tauri-apps/api/core');
    _invoke = invoke;
    _tauriDetected = true;
    console.log('Tauri environment detected, invoke:', typeof invoke);
    return true;
  } catch (e) {
    _tauriDetected = false;
    console.log('Not in Tauri environment, using fallback:', e);
    return false;
  }
};

const getInvoke = () => _invoke;

let cachedConfig: AppConfig['llm'] | null = null;

export const initLLM = async () => {
  const config = await getConfig();
  cachedConfig = config?.llm || null;
};

export const callLlm = async (prompt: string, options?: { maxTokens?: number }): Promise<LLMResponse> => {
  if (!cachedConfig?.apiUrl || !cachedConfig?.apiKey) {
    return { success: false, error: '请先在设置中配置LLM API' };
  }

  if (!cachedConfig.model) {
    return { success: false, error: '请配置模型名称' };
  }

  // Tauri环境：通过后端调用
  if (await detectTauri()) {
    try {
      const invoke = getInvoke();
      if (!invoke) {
        throw new Error('Tauri invoke not available');
      }
      const result = await invoke('call_llm', {
        config: {
          apiUrl: cachedConfig.apiUrl,
          apiKey: cachedConfig.apiKey,
          model: cachedConfig.model,
          format: cachedConfig.format || 'anthropic'
        },
        prompt: prompt,
        maxTokens: options?.maxTokens || 4096
      });
      return result as LLMResponse;
    } catch (error: any) {
      console.error('Tauri LLM Error:', error);
      return { success: false, error: error.message || '调用失败' };
    }
  }

  // 非Tauri环境：使用原有fetch方式（开发环境通过Vite代理）
  return callLlmFallback(prompt, options);
};

// 非Tauri环境的后备方案
const callLlmFallback = async (prompt: string, options?: { maxTokens?: number }): Promise<LLMResponse> => {
  const isDev = typeof window !== 'undefined' &&
    (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1');

  try {
    const format = cachedConfig?.format || 'anthropic';
    let endpoint = buildEndpoint(cachedConfig!.apiUrl, format);

    // 开发环境使用代理绕过CORS
    if (isDev) {
      if (cachedConfig!.apiUrl.includes('dashscope.aliyuncs.com')) {
        endpoint = endpoint.replace('https://coding.dashscope.aliyuncs.com', '/api/anthropic-coding');
        endpoint = endpoint.replace('https://dashscope.aliyuncs.com', '/api/anthropic');
      } else if (cachedConfig!.apiUrl.includes('openai.com')) {
        endpoint = endpoint.replace('https://api.openai.com', '/api/openai');
      } else {
        endpoint = `/api/llm${endpoint.replace(cachedConfig!.apiUrl, '')}`;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let body: any;

    if (format === 'openai') {
      headers['Authorization'] = `Bearer ${cachedConfig!.apiKey}`;
      body = {
        model: cachedConfig!.model,
        max_tokens: options?.maxTokens || 4096,
        messages: [{ role: 'user', content: prompt }]
      };
    } else {
      headers['x-api-key'] = cachedConfig!.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model: cachedConfig!.model,
        max_tokens: options?.maxTokens || 4096,
        messages: [{ role: 'user', content: prompt }]
      };
    }

    console.log('LLM Request:', { endpoint, model: cachedConfig!.model, format });

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

const buildEndpoint = (baseUrl: string, format: string): string => {
  let url = baseUrl.replace(/\/+$/, '');

  if (format === 'openai') {
    if (!url.includes('/v1')) {
      url = `${url}/v1`;
    }
    return `${url}/chat/completions`;
  } else {
    if (url.includes('/apps/anthropic')) {
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

const extractContent = (data: any, format?: string): string => {
  if (format === 'openai') {
    return data.choices?.[0]?.message?.content || '';
  }
  return data.content?.[0]?.text || '';
};

export const testLlmConnection = async (): Promise<LLMResponse> => {
  if (!cachedConfig?.apiUrl || !cachedConfig?.apiKey || !cachedConfig?.model) {
    return { success: false, error: '请先填写完整的API配置（地址、密钥、模型）' };
  }

  // Tauri环境：通过后端调用
  if (await detectTauri()) {
    try {
      const invoke = getInvoke();
      if (!invoke) {
        throw new Error('Tauri invoke not available');
      }
      console.log('Using Tauri backend for test connection');
      const result = await invoke('test_llm_connection', {
        config: {
          apiUrl: cachedConfig.apiUrl,
          apiKey: cachedConfig.apiKey,
          model: cachedConfig.model,
          format: cachedConfig.format || 'anthropic'
        }
      });
      console.log('Tauri result:', result);
      return result as LLMResponse;
    } catch (error: any) {
      console.error('Tauri Test Error:', error);
      return { success: false, error: error.message || '测试失败' };
    }
  }

  // 非Tauri环境：使用后备方案
  console.log('Using fallback for test connection');
  return callLlmFallback('请回复"连接成功"三个字', { maxTokens: 50 });
};

export const updateLLMConfig = (config: AppConfig['llm']) => {
  cachedConfig = config;
};