import React from 'react';
import { Card } from 'antd';
import {
  ListChecks, FileText, Table2, MessageSquare,
  Calculator, Clock, Regex,
  FileJson, FileCode, Diff,
  Fingerprint, Hash, FileSpreadsheet,
  StickyNote, KeyRound, MessageCircleQuestion, ClipboardList, Database
} from 'lucide-react';

interface GroupViewProps {
  group: string;
  onPageChange: (page: string) => void;
}

interface Feature {
  id: string;
  icon: any;
  name: string;
  desc: string;
}

const groupFeatures: Record<string, Feature[]> = {
  ai: [
    { id: 'knowledge-base', icon: Database, name: '知识库', desc: '导入文档建立知识库，AI智能问答' },
    { id: 'feedback-analysis', icon: MessageCircleQuestion, name: '用户反馈分析', desc: 'AI分类+需求转化+优先级建议' },
    { id: 'ticket-analysis', icon: ClipboardList, name: '工单数据分析', desc: '数据清洗+统计+根因分析' },
    { id: 'todo', icon: ListChecks, name: 'TodoList周报', desc: '待办任务管理 + 自动生成周报' },
    { id: 'file-read', icon: FileText, name: '文件解读', desc: '上传Word/PDF，AI解读重点' },
    { id: 'fake-data', icon: Table2, name: '假数据生成', desc: 'AI生成JSON或表格格式数据' },
    { id: 'prompts', icon: MessageSquare, name: '提示词模板', desc: '自定义提示词模板复用' }
  ],
  expr: [
    { id: 'aviator', icon: Calculator, name: 'Aviator表达式', desc: '可视化拼接Aviator表达式' },
    { id: 'cron', icon: Clock, name: 'Cron表达式', desc: '生成Cron表达式' },
    { id: 'regex', icon: Regex, name: '正则表达式', desc: '17种常用正则预设' }
  ],
  fmt: [
    { id: 'json', icon: FileJson, name: 'JSON美化', desc: '格式化、压缩、校验JSON' },
    { id: 'xml', icon: FileCode, name: 'XML美化', desc: '格式化、压缩、校验XML' },
    { id: 'diff', icon: Diff, name: '文本比较', desc: '逐行对比高亮差异' }
  ],
  tools: [
    { id: 'uuid', icon: Fingerprint, name: 'UUID生成', desc: '批量生成UUID' },
    { id: 'crypto', icon: Hash, name: '加密工具', desc: 'MD5/SHA系列哈希计算' },
    { id: 'template', icon: FileSpreadsheet, name: '数据填充模板', desc: 'SQL IN/编号/前缀后缀' }
  ],
  data: [
    { id: 'notes', icon: StickyNote, name: '笔记', desc: '本地笔记管理' },
    { id: 'passwords', icon: KeyRound, name: '账号密码', desc: '账号密码管理' }
  ]
};

const groupNames: Record<string, string> = {
  ai: 'AI辅助',
  expr: '表达式生成',
  fmt: '格式化',
  tools: '工具',
  data: '数据管理'
};

const GroupView: React.FC<GroupViewProps> = ({ group, onPageChange }) => {
  const features = groupFeatures[group] || [];
  const groupName = groupNames[group] || group;

  return (
    <div style={{ padding: 24, width: '100%', height: '100%', overflow: 'auto', background: '#FFFFFF' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: '#1F2937' }}>
        {groupName}
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: group === 'ai' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        gap: 16
      }}>
        {features.map(f => (
          <Card
            key={f.id}
            hoverable
            onClick={() => onPageChange(f.id)}
            style={{ borderRadius: 12, border: '1px solid #E5E7EB' }}
            styles={{ body: { padding: 20 } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <f.icon size={24} color="#3B82F6" />
              <span style={{ fontWeight: 600, color: '#1F2937' }}>{f.name}</span>
            </div>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>{f.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GroupView;