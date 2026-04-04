// 提示词管理服务

import { storage } from './storage';

// 提示词定义
export interface PromptDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  template: string;
  variables: string[]; // 模板中的变量，如 {content}, {ticketData}
}

// 默认提示词模板
export const DEFAULT_PROMPTS: PromptDefinition[] = [
  // 智能助手
  {
    id: 'intent_recognition',
    name: '意图识别',
    description: '智能助手的意图识别提示词，用于判断用户输入属于哪个功能',
    category: '智能助手',
    template: `你是一个意图识别助手，需要判断用户的输入属于哪个意图。

## 可用意图

| 意图ID | 名称 | 触发条件 |
|--------|------|---------|
| knowledge | 知识库问答 | 用户提到"知识库"、"文档"、"根据文档"、要查询已有知识 |
| json_format | JSON格式化 | 用户要格式化、美化、整理JSON数据 |
| xml_format | XML格式化 | 用户要格式化、美化、整理XML数据 |
| text_diff | 文本比较 | 用户要比较两段文本的差异、对比文本 |
| regex | 正则表达式 | 用户要生成正则表达式、匹配某种格式 |
| cron | Cron表达式 | 用户要生成定时任务表达式、Cron |
| sql_in | SQL IN转换 | 用户要把数据转成SQL IN格式 |
| uuid | UUID生成 | 用户要生成UUID、唯一标识 |
| crypto | 加密计算 | 用户要计算MD5、SHA等哈希值 |
| feedback | 反馈分析 | 用户要分析用户反馈、评价、评论 |
| ticket | 工单分析 | 用户要分析工单数据、故障数据 |
| unknown | 无法识别 | 不属于以上任何意图 |

## 输出格式

只输出JSON，不要其他任何内容：
{
  "intent": "意图ID",
  "confidence": 0.95,
  "params": {
    "data": "如果用户已提供数据，提取到这里",
    "algorithm": "加密算法，如md5/sha256",
    "pattern": "正则匹配的类型，如email/phone"
  },
  "reason": "判断理由"
}

## 重要规则

1. 如果用户只说"格式化"没说是什么格式，intent为unknown
2. 如果用户提供了数据但没说做什么，intent为unknown
3. confidence低于0.7时，intent应为unknown
4. 只输出JSON，不要任何其他文字

## 用户输入
{user_input}`,
    variables: ['user_input']
  },

  // 用户反馈分析
  {
    id: 'feedback_analysis',
    name: '反馈分析',
    description: '分析单条用户反馈，提取类型、情感、需求等',
    category: '用户反馈分析',
    template: `你是一个专业的产品经理助手，需要分析用户反馈并转化为产品需求。

请分析以下用户反馈：
"""
{content}
"""

请输出JSON格式的分析结果：
{
  "type": "Bug/功能建议/体验问题/咨询求助/正面评价",
  "emotion": "负面/中性/正面",
  "coreNeed": "用户核心诉求（一句话）",
  "productRequirement": "转化为产品需求描述",
  "priority": "P0/P1/P2/P3",
  "priorityReason": "优先级判断理由",
  "suggestedSolution": "建议解决方案方向"
}

判断优先级时考虑：
- Bug问题优先级高于建议
- 负面情感优先级高于正面
- 影响核心功能的优先级更高`,
    variables: ['content']
  },
  {
    id: 'feedback_merge',
    name: '相似反馈合并',
    description: '识别并合并相似的用户反馈',
    category: '用户反馈分析',
    template: `你是一个专业的产品经理助手，需要识别相似的用户反馈。

以下是一组用户反馈（JSON格式）：
{feedbackList}

请判断哪些反馈属于同一类问题，并输出JSON格式结果：
{
  "groups": [
    {
      "groupName": "问题分类名称",
      "feedbackIds": ["REQ-001", "REQ-002"],
      "mergedRequirement": "合并后的产品需求描述",
      "totalCount": 2,
      "combinedPriority": "P0"
    }
  ],
  "ungrouped": ["REQ-003"]
}`,
    variables: ['feedbackList']
  },

  // 工单数据分析
  {
    id: 'ticket_clean',
    name: '数据清洗',
    description: '清洗和归一化工单数据',
    category: '工单数据分析',
    template: `你是一个专业的数据分析助手，需要对工单数据进行清洗和归一化。

以下是工单数据（JSON格式）：
{ticketData}

请进行以下处理并输出JSON格式结果（只输出JSON，不要其他内容）：
{
  "cleanedData": [
    {
      "id": "工单编号",
      "normalizedReason": "归一化后的故障原因",
      "keyInfoFromNote": "从备注中提取的关键信息",
      "category": "故障分类（如：设备故障、线路问题、系统问题、用户操作等）"
    }
  ],
  "normalizationMap": {
    "原始原因1": "归一化原因",
    "原始原因2": "归一化原因"
  }
}

归一化规则：
1. 将相同含义的不同表述统一（如"光缆断"、"光纤断"、"光纤故障"统一为"光纤故障"）
2. 提取备注中的关键信息（如位置、原因、处理方式等）
3. 对故障原因进行分类`,
    variables: ['ticketData']
  },
  {
    id: 'ticket_root_cause',
    name: '根因分析',
    description: '对工单数据进行根因分析',
    category: '工单数据分析',
    template: `你是一个专业的业务分析助手，需要对故障数据进行根因分析。

以下是统计数据：
{statistics}

请输出根因分析报告（JSON格式，只输出JSON不要其他内容）：
{
  "coreFindings": [
    "核心发现1：具体描述",
    "核心发现2：具体描述"
  ],
  "rootCauseAnalysis": [
    "根因1：分析说明",
    "根因2：分析说明"
  ],
  "preventionSuggestions": [
    "建议1：具体措施",
    "建议2：具体措施"
  ],
  "actionPlan": [
    "行动项1：具体步骤",
    "行动项2：具体步骤"
  ]
}

分析要求：
1. 找出故障占比最高的类型和业务
2. 分析故障的根本原因
3. 给出可执行的预防建议
4. 制定具体的行动计划`,
    variables: ['statistics']
  },

  // 知识库RAG
  {
    id: 'rag_answer',
    name: 'RAG问答',
    description: '基于知识库回答用户问题',
    category: '知识库+RAG',
    template: `你是一个智能助手，需要基于知识库回答用户问题。

以下是与问题相关的知识片段：
{context}

用户问题：{query}

请基于以上知识片段回答问题。如果知识库中没有相关信息，请诚实告知"知识库中没有找到相关信息"。

回答格式要求：
1. 直接回答问题，简洁清晰
2. 如果引用了知识库内容，标注来源
3. 如果信息不足，说明还需要什么信息`,
    variables: ['context', 'query']
  },

  // 假数据生成
  {
    id: 'fake_data',
    name: '假数据生成',
    description: '生成测试数据',
    category: '其他',
    template: `请生成{count}条测试数据，字段如下：
{fields}

输出格式：{format}
要求：直接输出数据，不要额外的说明文字。`,
    variables: ['count', 'fields', 'format']
  },

  // 文件解读
  {
    id: 'file_read',
    name: '文件解读',
    description: '从文档中提取关键重点',
    category: '其他',
    template: `请从以下文档中提取关键重点，每条重点需标注来源位置。
输出格式：【重点N】内容描述（来源：章节/页码/段落）

---
{content}`,
    variables: ['content']
  }
];

const PROMPTS_STORAGE_KEY = 'prompt_templates';

// 提示词管理服务
export const promptService = {
  // 获取所有提示词
  async getAll(): Promise<PromptDefinition[]> {
    try {
      const data = await storage.read(PROMPTS_STORAGE_KEY);
      if (data) {
        const saved = JSON.parse(data);
        // 合并默认提示词和保存的提示词（保存的覆盖默认的）
        const merged = DEFAULT_PROMPTS.map(def => {
          const savedItem = saved.find((s: PromptDefinition) => s.id === def.id);
          return savedItem || def;
        });
        return merged;
      }
      return DEFAULT_PROMPTS;
    } catch {
      return DEFAULT_PROMPTS;
    }
  },

  // 获取单个提示词
  async get(id: string): Promise<PromptDefinition | undefined> {
    const all = await this.getAll();
    return all.find(p => p.id === id);
  },

  // 更新提示词
  async update(id: string, template: string): Promise<void> {
    const all = await this.getAll();
    const index = all.findIndex(p => p.id === id);
    if (index >= 0) {
      all[index] = { ...all[index], template };
      await storage.write(PROMPTS_STORAGE_KEY, JSON.stringify(all));
    }
  },

  // 重置单个提示词
  async reset(id: string): Promise<void> {
    const all = await this.getAll();
    const defaultPrompt = DEFAULT_PROMPTS.find(p => p.id === id);
    if (defaultPrompt) {
      const index = all.findIndex(p => p.id === id);
      if (index >= 0) {
        all[index] = defaultPrompt;
      }
      await storage.write(PROMPTS_STORAGE_KEY, JSON.stringify(all));
    }
  },

  // 重置所有提示词
  async resetAll(): Promise<void> {
    await storage.write(PROMPTS_STORAGE_KEY, JSON.stringify(DEFAULT_PROMPTS));
  },

  // 渲染提示词（替换变量）
  render(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }
};