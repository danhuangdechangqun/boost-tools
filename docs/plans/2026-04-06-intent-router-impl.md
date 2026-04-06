# 智能助手意图路由实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现智能助手意图路由，限制只能调用工具或查知识库，禁止发散行为。

**Architecture:** 在 useAgentOrchestrator 入口层添加 useIntentRouter 拦截，先判断用户意图（工具/知识库/澄清），不符合条件直接返回引导提示。

**Tech Stack:** React, TypeScript, Ant Design

---

## Task 1: 创建工具关键词配置表

**Files:**
- Create: `src/components/SmartAssistant/config/toolKeywords.ts`

**Step 1: 创建配置文件**

```typescript
// src/components/SmartAssistant/config/toolKeywords.ts

// 工具关键词配置 - 用于快速匹配用户意图
export const TOOL_KEYWORDS: Record<string, {
  keywords: string[];
  patterns: RegExp[];
}> = {
  uuid: {
    keywords: ['uuid', '唯一id', '生成id', '随机id', 'guid', '唯一标识'],
    patterns: [/生成.*uuid/i, /uuid.*生成/i, /给我.*uuid/i]
  },
  json_format: {
    keywords: ['json格式化', '格式化json', 'json美化', 'json整理', '美化json'],
    patterns: [/格式化.*json/i, /美化.*json/i, /整理.*json/i]
  },
  xml_format: {
    keywords: ['xml格式化', '格式化xml', 'xml美化', 'xml整理'],
    patterns: [/格式化.*xml/i, /美化.*xml/i, /整理.*xml/i]
  },
  crypto: {
    keywords: ['加密', 'md5', 'sha', 'hash', '哈希', '密码', '摘要', 'sha256', 'sha1'],
    patterns: [/计算.*md5/i, /md5.*计算/i, /计算.*哈希/i, /sha\d+/i]
  },
  regex: {
    keywords: ['正则', '正则表达式', '匹配规则', 'regex', '表达式'],
    patterns: [/生成.*正则/i, /正则.*生成/i, /写个.*正则/i]
  },
  cron: {
    keywords: ['cron', '定时表达式', '调度表达式', '定时任务', '周期'],
    patterns: [/cron.*表达式/i, /定时.*表达式/i, /生成.*cron/i]
  },
  sql_in: {
    keywords: ['sql in', 'sql转换', 'in语句', 'sql格式'],
    patterns: [/sql\s*in/i, /转.*sql\s*in/i]
  },
  text_diff: {
    keywords: ['文本对比', '文本比较', 'diff', '差异对比', '文本差异'],
    patterns: [/对比.*文本/i, /比较.*文本/i]
  },
  knowledge: {
    keywords: ['知识库', '查文档', '问知识库', '文档查询', '根据文档'],
    patterns: [/查.*知识库/i, /知识库.*查/i, /问.*知识库/i]
  },
  feedback: {
    keywords: ['反馈', '反馈分析', '用户反馈', '分析反馈'],
    patterns: [/分析.*反馈/i, /反馈.*分析/i]
  },
  ticket: {
    keywords: ['工单', 'ticket', '工单分析', '故障分析'],
    patterns: [/分析.*工单/i, /工单.*分析/i]
  },
  todo: {
    keywords: ['待办', 'todo', '任务', '今日待办', '明日待办', '下周计划'],
    patterns: [/添加.*待办/i, /加.*待办/i, /开.*待办/i]
  }
};

// 从关键词配置中提取所有工具名
export const ALL_TOOL_NAMES = Object.keys(TOOL_KEYWORDS);

// 匹配工具关键词
export function matchToolKeywords(input: string): string | null {
  const lowerInput = input.toLowerCase();
  const trimmedInput = input.trim();

  // 先检测直接输入的数据格式（高置信度）
  // JSON 格式
  if (trimmedInput.startsWith('{') || trimmedInput.startsWith('[')) {
    try {
      JSON.parse(trimmedInput);
      return 'json_format';
    } catch {}
  }

  // XML 格式
  if (trimmedInput.startsWith('<') && trimmedInput.includes('>')) {
    return 'xml_format';
  }

  // 遍历关键词配置
  for (const [toolName, config] of Object.entries(TOOL_KEYWORDS)) {
    // 检查关键词
    for (const keyword of config.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        return toolName;
      }
    }

    // 检查正则模式
    for (const pattern of config.patterns) {
      if (pattern.test(input)) {
        return toolName;
      }
    }
  }

  return null;
}

// 检测用户是否明确指定了意图
export function detectExplicitIntent(input: string): {
  explicitIntent?: 'tool' | 'knowledge';
  explicitTool?: string;
} | null {
  const lowerInput = input.toLowerCase();

  // 明确指定知识库
  if (lowerInput.includes('查知识库') ||
      lowerInput.includes('问知识库') ||
      lowerInput.startsWith('知识库:') ||
      lowerInput.startsWith('知识库：')) {
    return { explicitIntent: 'knowledge' };
  }

  // 明确指定工具调用
  const toolCallPatterns = [
    /调用\s*(\w+)\s*工具/i,
    /用\s*(\w+)\s*工具/i,
    /执行\s*(\w+)/i,
    /帮我\s*(\w+)/i
  ];

  for (const pattern of toolCallPatterns) {
    const match = input.match(pattern);
    if (match) {
      const toolName = match[1].toLowerCase();
      // 尝试匹配到已知工具
      for (const knownTool of ALL_TOOL_NAMES) {
        if (toolName.includes(knownTool) || knownTool.includes(toolName)) {
          return { explicitIntent: 'tool', explicitTool: knownTool };
        }
      }
      // 未匹配到已知工具，返回用户指定的工具名
      return { explicitIntent: 'tool', explicitTool: toolName };
    }
  }

  return null;
}
```

**Step 2: 验证文件创建成功**

Run: `ls src/components/SmartAssistant/config/`
Expected: 显示 `toolKeywords.ts`

**Step 3: Commit**

```bash
git add src/components/SmartAssistant/config/toolKeywords.ts
git commit -m "feat(intent-router): 添加工具关键词配置表"
```

---

## Task 2: 扩展类型定义

**Files:**
- Modify: `src/components/SmartAssistant/types.ts:17-32`

**Step 1: 添加 IntentRouterResult 类型**

在 `types.ts` 文件末尾添加以下类型定义：

```typescript
// 意图路由结果 - 用于入口拦截判断
export interface IntentRouterResult {
  type: 'tool' | 'knowledge' | 'clarify';
  tool?: IntentType;           // 工具名（type='tool'时有效）
  confidence?: number;         // 置信度
  needConfirm?: boolean;       // 是否需要用户确认
  message?: string;            // 引导提示语（type='clarify'时有效）
  knowledgeScore?: number;     // 知识库相似度分数（type='knowledge'时有效）
}

// 意图路由配置 - 开发模式可调整
export interface IntentRouterConfig {
  toolConfidenceThreshold: number;  // 工具匹配阈值，默认 0.8
}

export const DEFAULT_INTENT_ROUTER_CONFIG: IntentRouterConfig = {
  toolConfidenceThreshold: 0.8
};
```

**Step 2: 验证类型定义正确**

Run: `cd D:/code/AI/boost-tools && npm run type-check 2>/dev/null || echo "type-check命令不存在，跳过"`
Expected: 无类型错误

**Step 3: Commit**

```bash
git add src/components/SmartAssistant/types.ts
git commit -m "feat(intent-router): 添加IntentRouterResult类型定义"
```

---

## Task 3: 创建意图路由Hook

**Files:**
- Create: `src/components/SmartAssistant/hooks/useIntentRouter.ts`

**Step 1: 创建useIntentRouter.ts**

```typescript
// src/components/SmartAssistant/hooks/useIntentRouter.ts

// 意图路由Hook - 入口拦截层，判断用户意图

import { useState, useCallback } from 'react';
import { IntentRouterResult, IntentType, IntentRouterConfig, DEFAULT_INTENT_ROUTER_CONFIG } from '../types';
import { matchToolKeywords, detectExplicitIntent, ALL_TOOL_NAMES } from '../config/toolKeywords';
import { callLlm, getSingleEmbedding } from '@/services/api';
import { promptService } from '@/services/promptService';
import { cosineSimilarity } from '@/services/embedding';

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
```

**Step 2: 检查cosineSimilarity是否存在于embedding服务**

需要确认 `cosineSimilarity` 函数的位置。如果不在 `@/services/embedding`，需要添加或调整导入路径。

Run: `grep -r "cosineSimilarity" src/services/`
Expected: 显示函数定义位置

如果没有，在 `useIntentRouter.ts` 中添加本地实现：

```typescript
// 在文件顶部添加
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

**Step 3: Commit**

```bash
git add src/components/SmartAssistant/hooks/useIntentRouter.ts
git commit -m "feat(intent-router): 创建useIntentRouter Hook"
```

---

## Task 4: 修改useAgentOrchestrator集成意图路由

**Files:**
- Modify: `src/components/SmartAssistant/hooks/useAgentOrchestrator.ts`

**Step 1: 导入useIntentRouter**

在文件顶部添加导入：

```typescript
// 在现有导入后添加
import { useIntentRouter } from './useIntentRouter';
import { IntentRouterResult, IntentRouterConfig } from '../types';
```

**Step 2: 在useAgentOrchestrator函数内添加intentRouter**

```typescript
// 在现有 hooks 初始化后添加（约第247行）
const intentRouter = useIntentRouter();
```

**Step 3: 修改execute函数签名，添加context参数**

```typescript
// 修改 execute 函数签名（约第259行）
const execute = useCallback(async (
  userInput: string,
  knowledgeBaseReady: boolean = false,
  context?: {
    explicitIntent?: 'tool' | 'knowledge';
    explicitTool?: string;
    knowledgeContext?: {
      smallChunks: any[];
      getDocument: (id: string) => any;
      scoreThreshold: number;
    };
  }
): Promise<{
  success: boolean;
  result?: string;
  plan?: TaskPlan;
  reflection?: TaskReflection;
  executionLog: ExecutionLogEntry[];
  pendingSteps?: { stepId: string; description: string; prompt: string; intent: IntentType }[];
  intentRouterResult?: IntentRouterResult;  // 新增
}> => {
```

**Step 4: 在execute函数开头添加意图路由拦截**

```typescript
// 在 setLoading(true) 后、规划阶段前添加（约第288行后）
// ===== 意图路由拦截 =====
const intentResult = await intentRouter.routeIntent(userInput, context?.knowledgeContext);

localAddLog({
  phase: 'planning',
  action: '意图路由完成',
  details: `type: ${intentResult.type}, tool: ${intentResult.tool || 'none'}, confidence: ${intentResult.confidence || 0}`
});

// 如果需要澄清，直接返回引导提示
if (intentResult.type === 'clarify') {
  setLoading(false);
  setPhase('idle');
  return {
    success: false,
    result: intentResult.message || '请明确告诉我你要做什么。',
    executionLog: localExecutionLog,
    intentRouterResult: intentResult
  };
}

// 如果意图是知识库查询
if (intentResult.type === 'knowledge') {
  if (!knowledgeBaseReady) {
    return {
      success: false,
      result: '📚 当前知识库暂无文档，请先导入文档后再提问。',
      executionLog: localExecutionLog,
      intentRouterResult: intentResult
    };
  }
  // 继续执行，但标记为知识库意图
}

// 如果意图是工具调用，继续执行
```

**Step 5: 修改返回值，添加intentRouterResult**

```typescript
// 在每个 return 语句中添加 intentRouterResult
// 例如成功的返回：
return {
  success: true,
  result: finalOutput,
  plan: taskPlan,
  reflection: localReflection,
  executionLog: localExecutionLog,
  pendingSteps,
  intentRouterResult: intentResult  // 新增
};
```

**Step 6: 更新useCallback依赖数组**

```typescript
// 修改最后的 useCallback 依赖数组（约第504行）
}, [config, planner, stepReflector, taskReflector, toolExecutor, intentRecognizer, intentRouter]);
```

**Step 7: Commit**

```bash
git add src/components/SmartAssistant/hooks/useAgentOrchestrator.ts
git commit -m "feat(intent-router): 集成意图路由到Agent入口"
```

---

## Task 5: 修改设置页面添加置信度配置

**Files:**
- Modify: `src/views/settings/SettingsPage.tsx`

**Step 1: 添加置信度配置状态**

在文件顶部导入和状态区域添加：

```typescript
// 在现有导入后添加
import { IntentRouterConfig, DEFAULT_INTENT_ROUTER_CONFIG } from '@/components/SmartAssistant/types';

// 在 SettingsPage 组件内，form 初始化后添加配置获取
const [intentRouterConfig, setIntentRouterConfig] = useState<IntentRouterConfig>(DEFAULT_INTENT_ROUTER_CONFIG);
```

**Step 2: 在loadConfig函数中加载置信度配置**

```typescript
// 在 loadConfig 函数内添加
// 获取意图路由配置（从localStorage）
const savedRouterConfig = localStorage.getItem('intentRouterConfig');
if (savedRouterConfig) {
  try {
    setIntentRouterConfig(JSON.parse(savedRouterConfig));
    form.setFieldsValue({
      intentRouter: JSON.parse(savedRouterConfig)
    });
  } catch {}
}
```

**Step 3: 在handleSave函数中保存置信度配置**

```typescript
// 在 handleSave 函数内添加
// 保存意图路由配置
const routerConfig: IntentRouterConfig = {
  toolConfidenceThreshold: values.intentRouter?.toolConfidenceThreshold || DEFAULT_INTENT_ROUTER_CONFIG.toolConfidenceThreshold
};
localStorage.setItem('intentRouterConfig', JSON.stringify(routerConfig));
setIntentRouterConfig(routerConfig);
```

**Step 4: 在开发模式下添加置信度配置UI**

```typescript
// 在现有的 {import.meta.env.DEV && (...) 提示词管理Card后添加

{import.meta.env.DEV && (
  <Card title="置信度配置" style={{ marginBottom: 16 }}>
    <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
      仅开发模式可见，用于调整意图判断的置信度阈值
    </p>
    <Form.Item
      name={['intentRouter', 'toolConfidenceThreshold']}
      label="工具匹配阈值"
      tooltip="LLM判断为工具时，置信度需达到此阈值才会执行"
      initialValue={DEFAULT_INTENT_ROUTER_CONFIG.toolConfidenceThreshold}
    >
      <InputNumber
        min={0.5}
        max={1}
        step={0.1}
        precision={1}
        style={{ width: '100%' }}
      />
    </Form.Item>
    <p style={{ fontSize: 12, color: '#9CA3AF' }}>
      知识库阈值复用知识库页面的配置，不单独设置
    </p>
  </Card>
)}
```

**Step 5: Commit**

```bash
git add src/views/settings/SettingsPage.tsx
git commit -m "feat(intent-router): 设置页面添加置信度配置（仅开发模式）"
```

---

## Task 6: 修改ChatWindow支持用户明确指定意图

**Files:**
- Modify: `src/components/SmartAssistant/ChatWindow.tsx`

**Step 1: 修改handleSend函数，检测用户纠错**

```typescript
// 在 handleSend 函数开头添加用户纠错检测
const handleSend = async () => {
  const text = input.trim();
  if (!text || loading) return;

  setInput('');
  setThinkingDetailExpanded(false);

  // 检测用户是否在纠错（如："不对，我要调用uuid工具"）
  const isCorrection = agentMessages.length > 0 &&
    agentMessages[agentMessages.length - 1].role === 'assistant' &&
    (text.includes('不对') || text.includes('我要调用') || text.includes('查知识库'));

  // 添加用户消息
  const userMsgId = Date.now().toString();
  ...
```

**Step 2: 传递context参数给execute**

```typescript
// 修改 agent.execute 调用
// 如果是用户纠错，传递明确的意图上下文
let executionContext: any = undefined;

if (isCorrection) {
  // 解析用户纠错意图
  if (text.includes('查知识库') || text.includes('知识库')) {
    executionContext = { explicitIntent: 'knowledge' };
  } else {
    // 尝试提取工具名
    const toolMatch = text.match(/调用\s*(\w+)\s*工具/i) || text.match(/用\s*(\w+)/i);
    if (toolMatch) {
      executionContext = { explicitIntent: 'tool', explicitTool: toolMatch[1].toLowerCase() };
    }
  }
}

const agentResult = await agent.execute(text, knowledgeBaseReady, executionContext);
```

**Step 3: Commit**

```bash
git add src/components/SmartAssistant/ChatWindow.tsx
git commit -m "feat(intent-router): 支持用户纠错时明确指定意图"
```

---

## Task 7: 验证功能并提交完成

**Step 1: 启动开发服务器验证**

Run: `cd D:/code/AI/boost-tools && npm run tauri:dev`

**Step 2: 手动测试场景**

测试以下场景：
1. 输入"生成UUID" → 应直接调用uuid工具
2. 输入"查知识库：什么是XX" → 应查询知识库
3. 输入"你好" → 应返回引导提示
4. 输入"{\"a\":1}" → 应调用json_format
5. 知识库返回答案后，输入"不对，我要调用uuid工具" → 应直接调用uuid

**Step 3: 最终提交**

```bash
git add -A
git commit -m "feat(intent-router): 完成智能助手意图路由功能

- 限制智能助手只能调用工具或查知识库
- 添加关键词快速匹配和LLM语义判断
- 支持用户明确指定意图和纠错
- 置信度阈值配置（仅开发模式可见）
"
```

---

## 执行顺序

Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7

每个Task完成后立即Commit，保持原子性提交。