# 智能助手意图路由设计

> 设计日期：2026-04-06
> 目标：限制智能助手只能做两件事（调用工具 / 查知识库），禁止发散

## 1. 核心需求

智能助手必须严格限制行为范围：
- **只能调用工具**：UUID生成、JSON/XML格式化、加密计算、正则生成等
- **只能查询知识库**：返回知识库文档中的内容
- **禁止发散**：不能作为通用大模型回答任意问题

当用户意图不明确时，引导用户澄清。

## 2. 意图判断流程

```
用户输入
    ↓
[入口拦截层] intentRouter()
    ↓
用户明确指定意图？ ──是──→ 直接执行（跳过置信度判断）
    ↓ 否
[关键词快速匹配]
    ↓
命中工具关键词？ ──是──→ 直接调用工具
    ↓ 否
[知识库相似度检测]
    ↓
相似度 >= 阈值？ ──是──→ 返回知识库答案
    ↓ 否
[LLM语义判断]
    ↓
LLM判断为工具？ + 置信度 >= 0.8？ ──是──→ 调用工具
    ↓ 否
置信度不足 ──→ 引导用户澄清
    ↓
用户澄清/纠错 ──→ 重新进入流程（明确指定意图）
```

## 3. 优先级规则

| 场景 | 判断条件 | 系统行为 |
|------|----------|----------|
| 用户明确指定工具 | "调用XX工具" | 直接调用指定工具 |
| 用户明确指定知识库 | "查知识库" | 直接查知识库（仍受相似度阈值约束） |
| 工具关键词匹配 | 关键词命中 | 直接调用工具 |
| 知识库相似度达标 | >= 阈值（默认0.5） | 返回知识库答案 |
| LLM判断为工具 | 置信度 >= 0.8 | 调用工具 |
| 用户纠错 | "不对，我要调用XX" | 直接调用用户指定的工具 |
| 两者都不匹配 | 置信度不足 | 引导用户澄清 |

## 4. 用户引导提示语

| 场景 | 系统提示 |
|------|----------|
| 工具不存在 | "未找到 '{工具名}' 工具，可用工具：UUID生成、JSON格式化、加密计算等。请确认你要调用的工具。" |
| 知识库无答案 | "知识库中未找到相关内容，相似度过低。你可以：\n1. 明确指定要调用的工具\n2. 补充更多问题细节" |
| 两者都不匹配 | "我不太确定你的意图。你可以告诉我：\n- 要调用什么工具？（如：生成UUID、格式化JSON）\n- 还是查询知识库？" |

## 5. 模块设计

### 5.1 新增模块

| 模块 | 文件位置 | 功能 |
|------|----------|------|
| `useIntentRouter.ts` | `src/components/SmartAssistant/hooks/` | 入口拦截层，协调整个意图判断流程 |
| `toolKeywords.ts` | `src/components/SmartAssistant/config/` | 工具关键词配置表 |

### 5.2 改动模块

| 模块 | 改动内容 |
|------|----------|
| `useAgentOrchestrator.ts` | 入口处调用 `useIntentRouter` 拦截 |
| `SettingsPage.tsx` | 新增置信度配置区域（开发模式可见） |
| `types.ts` | 新增 `IntentResult` 类型 |

### 5.3 保留模块

| 模块 | 说明 |
|------|------|
| `useIntent.ts` | LLM判断逻辑被 `useIntentRouter` 调用，保留 |
| `useRAG.ts` | 知识库查询被 `useIntentRouter` 调用，保留 |

## 6. 工具关键词配置

```typescript
const TOOL_KEYWORDS = {
  uuid: ['uuid', '唯一id', '生成id', '随机id', 'guid'],
  json_format: ['json格式化', '格式化json', 'json美化'],
  xml_format: ['xml格式化', '格式化xml', 'xml美化'],
  crypto: ['加密', 'md5', 'sha', 'hash', '哈希'],
  regex: ['正则', '正则表达式', '匹配规则'],
  cron: ['cron', '定时表达式', '调度表达式'],
  sql_in: ['sql in', 'sql转换', 'in语句'],
  text_diff: ['文本对比', '文本比较', 'diff'],
  knowledge: ['知识库', '查文档', '问知识库'],
  feedback: ['反馈', '反馈分析', '用户反馈'],
  ticket: ['工单', 'ticket', '工单分析'],
  todo: ['待办', 'todo', '任务']
};
```

## 7. 置信度配置（开发模式）

**位置**：设置页面，与提示词管理同级
**可见条件**：`import.meta.env.DEV`（仅开发模式）

**配置项**：
- `toolConfidenceThreshold`：工具匹配阈值，默认 0.8

**知识库阈值**：复用 `RAGConfig.scoreThreshold`，不单独配置

**UI布局**：
```
┌─────────────────────────────────────┐
│ 智能助手设置                          │
├─────────────────────────────────────┤
│ [提示词管理 - 仅开发模式可见]          │
│                                     │
│ [置信度配置 - 仅开发模式可见]          │
│   工具匹配阈值: 0.8  [调整]           │
│   (低于此阈值的工具匹配需用户确认)      │
│                                     │
│ [向量模型配置 - 现有]                  │
└─────────────────────────────────────┘
```

## 8. 核心逻辑实现

```typescript
interface IntentResult {
  type: 'tool' | 'knowledge' | 'clarify';
  tool?: string;
  confidence?: number;
  needConfirm?: boolean;
  message?: string;
}

async function routeIntent(userInput: string, context?: {
  explicitIntent?: 'tool' | 'knowledge';
  explicitTool?: string;
}): IntentResult {

  // 1. 明确指定 → 直接返回
  if (context?.explicitIntent === 'tool' && context?.explicitTool) {
    return { type: 'tool', tool: context.explicitTool };
  }
  if (context?.explicitIntent === 'knowledge') {
    return { type: 'knowledge' };
  }

  // 2. 关键词匹配
  const keywordMatch = matchToolKeywords(userInput);
  if (keywordMatch) {
    return { type: 'tool', tool: keywordMatch, confidence: 1.0 };
  }

  // 3. 知识库检测
  const knowledgeResult = await queryKnowledge(userInput);
  if (knowledgeResult.score >= scoreThreshold) {
    return { type: 'knowledge' };
  }

  // 4. LLM判断
  const llmResult = await classifyIntentWithLLM(userInput);
  if (llmResult.tool && llmResult.confidence >= toolConfidenceThreshold) {
    return { type: 'tool', tool: llmResult.tool, confidence: llmResult.confidence };
  }

  // 5. 引导澄清
  return { type: 'clarify', message: generateClarifyMessage(userInput, llmResult) };
}
```

## 9. useAgentOrchestrator 集成

```typescript
// 原流程
async execute(userInput: string) {
  const plan = await planner.createPlan(userInput);
  // ...执行
}

// 新流程
async execute(userInput: string, context?: { explicitIntent, explicitTool }) {
  const intent = await intentRouter.routeIntent(userInput, context);

  if (intent.type === 'clarify') {
    return { status: 'clarify', message: intent.message };
  }

  const plan = await planner.createPlan(userInput, intent);
  // ...执行
}
```

## 10. 确认记录

| 问题 | 决策 |
|------|------|
| 意图优先级 | 工具优先 |
| 工具模糊匹配阈值 | 0.8（可配置，仅开发模式可见） |
| 知识库阈值 | 复用 RAGConfig.scoreThreshold |
| 架构位置 | 方案A：入口拦截层 |
| knowledge工具 | 作为知识库查询的工具化入口 |