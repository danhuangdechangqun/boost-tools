//! LLM & Embedding API 服务模块
//!
//! 支持 Anthropic Messages 和 OpenAI Chat Completions 两种 API 格式
//! 支持阿里云 DashScope Embedding API

use serde::{Deserialize, Serialize};
use std::time::Duration;

/// LLM 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmConfig {
    pub api_url: String,
    pub api_key: String,
    pub model: String,
    #[serde(default = "default_format")]
    pub format: String, // "anthropic" 或 "openai"
}

fn default_format() -> String {
    "anthropic".to_string()
}

/// Embedding 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingConfig {
    pub api_key: String,
    #[serde(default = "default_embedding_model")]
    pub model: String,
}

fn default_embedding_model() -> String {
    "text-embedding-v3".to_string()
}

/// Embedding 请求参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingRequest {
    pub config: EmbeddingConfig,
    pub texts: Vec<String>,
}

/// Embedding 响应结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingResponse {
    pub success: bool,
    pub embeddings: Option<Vec<Vec<f64>>>,
    pub error: Option<String>,
}

/// LLM 响应结果
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmResponse {
    pub success: bool,
    pub content: Option<String>,
    pub error: Option<String>,
}

/// 构建 API 端点 URL
fn build_endpoint(base_url: &str, format: &str) -> String {
    let url = base_url.trim_end_matches('/');

    // 特殊处理：阿里百炼路径
    if url.contains("dashscope.aliyuncs.com") && url.contains("/apps/anthropic") {
        if url.ends_with("/v1") {
            return format!("{}/messages", url);
        }
        return format!("{}/v1/messages", url);
    }

    if format == "openai" {
        if url.ends_with("/v1") {
            format!("{}/chat/completions", url)
        } else if url.contains("/v1/chat/completions") {
            url.to_string()
        } else if url.contains("/v1") {
            format!("{}/chat/completions", url)
        } else {
            format!("{}/v1/chat/completions", url)
        }
    } else {
        if url.ends_with("/v1") {
            format!("{}/messages", url)
        } else if url.ends_with("/v1/messages") {
            url.to_string()
        } else if url.contains("/v1") {
            format!("{}/messages", url)
        } else {
            format!("{}/v1/messages", url)
        }
    }
}

/// 测试 LLM 连接
#[tauri::command]
pub async fn test_llm_connection(config: LlmConfig) -> Result<LlmResponse, String> {
    call_llm(config, "请回复\"连接成功\"三个字", Some(50)).await
}

/// 调用 LLM API
#[tauri::command]
pub async fn call_llm(config: LlmConfig, prompt: &str, max_tokens: Option<u32>) -> Result<LlmResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let endpoint = build_endpoint(&config.api_url, &config.format);
    let format = config.format.as_str();
    let mut request_builder = client.post(&endpoint);

    if format == "openai" {
        request_builder = request_builder
            .header("Authorization", format!("Bearer {}", config.api_key))
            .header("Content-Type", "application/json");

        let body = serde_json::json!({
            "model": config.model,
            "max_tokens": max_tokens.unwrap_or(4096),
            "messages": [{"role": "user", "content": prompt}]
        });

        request_builder = request_builder.json(&body);
    } else {
        request_builder = request_builder
            .header("x-api-key", &config.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json");

        let body = serde_json::json!({
            "model": config.model,
            "max_tokens": max_tokens.unwrap_or(4096),
            "messages": [{"role": "user", "content": prompt}]
        });

        request_builder = request_builder.json(&body);
    }

    let response = request_builder
        .send()
        .await
        .map_err(|e| format!("网络错误: {}", e))?;

    let status = response.status();

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&error_text) {
            let message = error_json["error"]["message"]
                .as_str()
                .or_else(|| error_json["message"].as_str())
                .or_else(|| error_json["error"]["type"].as_str())
                .unwrap_or(&error_text);
            return Ok(LlmResponse {
                success: false,
                content: None,
                error: Some(format!("API错误 {}: {}", status.as_u16(), message)),
            });
        }
        return Ok(LlmResponse {
            success: false,
            content: None,
            error: Some(format!("API错误 {}: {}", status.as_u16(), error_text)),
        });
    }

    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    let content = if format == "openai" {
        data["choices"][0]["message"]["content"]
            .as_str()
            .map(|s| s.to_string())
    } else {
        data["content"][0]["text"]
            .as_str()
            .map(|s| s.to_string())
    };

    Ok(LlmResponse {
        success: true,
        content,
        error: None,
    })
}

/// DashScope Embedding API 响应结构
#[derive(Debug, Deserialize)]
struct DashScopeEmbeddingOutput {
    embeddings: Vec<DashScopeEmbeddingItem>,
}

#[derive(Debug, Deserialize)]
struct DashScopeEmbeddingItem {
    text_index: u32,
    embedding: Vec<f64>,
}

#[derive(Debug, Deserialize)]
struct DashScopeEmbeddingResponse {
    output: DashScopeEmbeddingOutput,
    #[serde(default)]
    code: Option<String>,
    #[serde(default)]
    message: Option<String>,
}

/// 获取文本向量（调用阿里云 DashScope Embedding API）
#[tauri::command]
pub async fn get_embeddings(request: EmbeddingRequest) -> Result<EmbeddingResponse, String> {
    if request.config.api_key.is_empty() {
        return Ok(EmbeddingResponse {
            success: false,
            embeddings: None,
            error: Some("未配置 Embedding API Key".to_string()),
        });
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let endpoint = "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding";

    let body = serde_json::json!({
        "model": request.config.model,
        "input": {
            "texts": request.texts
        },
        "parameters": {
            "text_type": "query"
        }
    });

    let response = client
        .post(endpoint)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", request.config.api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("网络错误: {}", e))?;

    let status = response.status();

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&error_text) {
            let message = error_json["message"]
                .as_str()
                .or_else(|| error_json["code"].as_str())
                .unwrap_or(&error_text);
            return Ok(EmbeddingResponse {
                success: false,
                embeddings: None,
                error: Some(format!("API错误 {}: {}", status.as_u16(), message)),
            });
        }
        return Ok(EmbeddingResponse {
            success: false,
            embeddings: None,
            error: Some(format!("API错误 {}: {}", status.as_u16(), error_text)),
        });
    }

    let data: DashScopeEmbeddingResponse = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    // 检查错误码
    if let Some(code) = data.code {
        if code != "Success" {
            return Ok(EmbeddingResponse {
                success: false,
                embeddings: None,
                error: Some(format!("API错误: {}", data.message.unwrap_or_default())),
            });
        }
    }

    // 按 text_index 排序
    let mut embeddings_with_index: Vec<(u32, Vec<f64>)> = data
        .output
        .embeddings
        .into_iter()
        .map(|e| (e.text_index, e.embedding))
        .collect();
    embeddings_with_index.sort_by_key(|(index, _)| *index);

    let embeddings: Vec<Vec<f64>> = embeddings_with_index
        .into_iter()
        .map(|(_, emb)| emb)
        .collect();

    Ok(EmbeddingResponse {
        success: true,
        embeddings: Some(embeddings),
        error: None,
    })
}