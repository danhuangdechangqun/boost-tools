// 分析结果展示组件

import React from 'react';
import { Card, Tag, Empty } from 'antd';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Feedback, AnalysisResult, FeedbackType, EmotionType, Priority } from '../types';

interface AnalysisResultProps {
  result: AnalysisResult | null;
  onFeedbackClick?: (feedback: Feedback) => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const TYPE_COLORS: Record<FeedbackType, string> = {
  'Bug': '#EF4444',
  '功能建议': '#3B82F6',
  '体验问题': '#F59E0B',
  '咨询求助': '#8B5CF6',
  '正面评价': '#10B981',
};

const EMOTION_COLORS: Record<EmotionType, string> = {
  '负面': '#EF4444',
  '中性': '#6B7280',
  '正面': '#10B981',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  'P0': '#EF4444',
  'P1': '#F59E0B',
  'P2': '#3B82F6',
  'P3': '#6B7280',
};

const AnalysisResultView: React.FC<AnalysisResultProps> = ({ result, onFeedbackClick }) => {
  if (!result) {
    return <Empty description="暂无分析结果" />;
  }

  const { feedbacks, groups, typeStats, emotionStats, priorityStats } = result;

  // 准备图表数据
  const typeChartData = Object.entries(typeStats).map(([name, value]) => ({
    name,
    value,
    fill: TYPE_COLORS[name as FeedbackType] || COLORS[0],
  }));

  const emotionChartData = Object.entries(emotionStats).map(([name, value]) => ({
    name,
    value,
    fill: EMOTION_COLORS[name as EmotionType] || COLORS[0],
  }));

  const priorityChartData = Object.entries(priorityStats)
    .sort((a, b) => {
      const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
      return (order[a[0] as Priority] ?? 99) - (order[b[0] as Priority] ?? 99);
    })
    .map(([name, value]) => ({
      name,
      value,
      fill: PRIORITY_COLORS[name as Priority] || COLORS[0],
    }));

  // 高优先级反馈
  const highPriorityFeedbacks = feedbacks
    .filter(f => f.priority === 'P0' || f.priority === 'P1')
    .sort((a, b) => {
      const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
      return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
    });

  return (
    <div>
      {/* 统计卡片 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Card size="small" style={{ minWidth: 120 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#1F2937' }}>{feedbacks.length}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>总反馈数</div>
          </div>
        </Card>
        <Card size="small" style={{ minWidth: 120 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#EF4444' }}>{priorityStats.P0 || 0}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>P0紧急</div>
          </div>
        </Card>
        <Card size="small" style={{ minWidth: 120 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#F59E0B' }}>{priorityStats.P1 || 0}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>P1重要</div>
          </div>
        </Card>
        <Card size="small" style={{ minWidth: 120 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#10B981' }}>{emotionStats['正面'] || 0}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>正面评价</div>
          </div>
        </Card>
        <Card size="small" style={{ minWidth: 120 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#3B82F6' }}>{groups.length}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>相似分组</div>
          </div>
        </Card>
      </div>

      {/* 图表区 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* 类型分布 */}
        <Card size="small" title="类型分布" style={{ flex: 1, minWidth: 200 }}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={typeChartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {typeChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* 情感分布 */}
        <Card size="small" title="情感分布" style={{ flex: 1, minWidth: 200 }}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={emotionChartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {emotionChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* 优先级分布 */}
        <Card size="small" title="优先级分布" style={{ flex: 1, minWidth: 200 }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priorityChartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {priorityChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* 高优先级问题列表 */}
      {highPriorityFeedbacks.length > 0 && (
        <Card size="small" title={`高优先级问题 (${highPriorityFeedbacks.length})`} style={{ marginBottom: 16 }}>
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            {highPriorityFeedbacks.map((f, index) => (
              <div
                key={f.id}
                style={{
                  padding: '12px 0',
                  borderBottom: index < highPriorityFeedbacks.length - 1 ? '1px solid #E5E7EB' : 'none',
                  cursor: onFeedbackClick ? 'pointer' : 'default',
                }}
                onClick={() => onFeedbackClick?.(f)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Tag color={PRIORITY_COLORS[f.priority]}>{f.priority}</Tag>
                  <Tag color={TYPE_COLORS[f.type]}>{f.type}</Tag>
                  {f.groupCount && f.groupCount > 1 && (
                    <Tag color="#8B5CF6">{f.groupCount}条相似</Tag>
                  )}
                  <span style={{ fontWeight: 500 }}>{f.id}</span>
                </div>
                <div style={{ color: '#4B5563', fontSize: 13, marginBottom: 4 }}>
                  原文：{f.originalContent.length > 80 ? f.originalContent.slice(0, 80) + '...' : f.originalContent}
                </div>
                <div style={{ color: '#1F2937', fontSize: 13 }}>
                  产品需求：{f.productRequirement}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AnalysisResultView;