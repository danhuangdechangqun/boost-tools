// 工单数据智能分析 - 类型定义

export interface Ticket {
  id: string;                    // 工单号
  originalData: Record<string, any>; // 原始数据
  businessType?: string;         // 业务类型
  originalReason?: string;       // 原始故障原因
  normalizedReason?: string;     // 归一化故障原因
  note?: string;                 // 备注
  keyInfo?: string;              // 从备注提取的关键信息
  category?: string;             // 故障分类
  timestamp?: string;            // 时间
}

export interface NormalizationMap {
  [original: string]: string;    // 原始值 -> 归一化值
}

export interface AnalysisResult {
  tickets: Ticket[];
  normalizationMap: NormalizationMap;
  reasonDistribution: Record<string, number>;
  businessDistribution: Record<string, number>;
  trendData: TrendPoint[];
  coreFindings: string[];
  rootCauses: string[];
  suggestions: string[];
  actionPlan: string[];
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface FieldMapping {
  originalKey: string;    // Excel原始列名
  mappedTo: string;       // 映射到的字段（businessType, reason, note, timestamp等）
  sampleValues: string[]; // 示例值
}

export const STANDARD_FIELDS = [
  { key: 'id', label: '工单编号', keywords: ['工单号', '编号', 'id', 'ID', '序号'] },
  { key: 'businessType', label: '业务类型', keywords: ['业务', '类型', '业务类型', 'business', 'type'] },
  { key: 'reason', label: '故障原因', keywords: ['原因', '故障原因', '故障', '问题', 'reason'] },
  { key: 'note', label: '备注', keywords: ['备注', '说明', '描述', '内容', 'note', 'remark'] },
  { key: 'timestamp', label: '时间', keywords: ['时间', '日期', 'date', 'time', '创建时间'] },
];