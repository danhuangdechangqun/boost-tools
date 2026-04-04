// 反馈表格组件

import React, { useState, useMemo } from 'react';
import { Table, Tag, Input, Select, Button, Space, Tooltip } from 'antd';
import { Search, Filter } from 'lucide-react';
import { Feedback, FeedbackType, EmotionType, Priority } from '../types';

interface FeedbackTableProps {
  feedbacks: Feedback[];
  onExport?: () => void;
}

const TYPE_COLORS: Record<FeedbackType, string> = {
  'Bug': 'red',
  '功能建议': 'blue',
  '体验问题': 'orange',
  '咨询求助': 'purple',
  '正面评价': 'green',
};

const EMOTION_COLORS: Record<EmotionType, string> = {
  '负面': 'red',
  '中性': 'default',
  '正面': 'green',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  'P0': 'red',
  'P1': 'orange',
  'P2': 'blue',
  'P3': 'default',
};

const FeedbackTable: React.FC<FeedbackTableProps> = ({ feedbacks, onExport }) => {
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [emotionFilter, setEmotionFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  // 过滤数据
  const filteredData = useMemo(() => {
    return feedbacks.filter(f => {
      const matchSearch = !searchText ||
        f.originalContent.includes(searchText) ||
        f.productRequirement.includes(searchText) ||
        f.coreNeed.includes(searchText);
      const matchType = !typeFilter || f.type === typeFilter;
      const matchEmotion = !emotionFilter || f.emotion === emotionFilter;
      const matchPriority = !priorityFilter || f.priority === priorityFilter;

      return matchSearch && matchType && matchEmotion && matchPriority;
    });
  }, [feedbacks, searchText, typeFilter, emotionFilter, priorityFilter]);

  const columns = [
    {
      title: '编号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      fixed: 'left' as const,
    },
    {
      title: '原始反馈',
      dataIndex: 'originalContent',
      key: 'originalContent',
      width: 200,
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            maxWidth: 180
          }}>
            {text}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: FeedbackType) => (
        <Tag color={TYPE_COLORS[type]}>{type}</Tag>
      ),
    },
    {
      title: '情感',
      dataIndex: 'emotion',
      key: 'emotion',
      width: 80,
      render: (emotion: EmotionType) => (
        <Tag color={EMOTION_COLORS[emotion]}>{emotion}</Tag>
      ),
    },
    {
      title: '核心诉求',
      dataIndex: 'coreNeed',
      key: 'coreNeed',
      width: 150,
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            maxWidth: 130
          }}>
            {text || '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '产品需求',
      dataIndex: 'productRequirement',
      key: 'productRequirement',
      width: 200,
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            maxWidth: 180
          }}>
            {text || '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 70,
      render: (priority: Priority) => (
        <Tag color={PRIORITY_COLORS[priority]}>{priority}</Tag>
      ),
    },
    {
      title: '相似分组',
      dataIndex: 'groupName',
      key: 'groupName',
      width: 100,
      render: (name: string, record: Feedback) => (
        name ? (
          <Tooltip title={`${record.groupCount}条相似反馈`}>
            <Tag color="purple">{name}</Tag>
          </Tooltip>
        ) : '-'
      ),
    },
    {
      title: '建议方案',
      dataIndex: 'suggestedSolution',
      key: 'suggestedSolution',
      width: 150,
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            maxWidth: 130,
            color: text ? '#4B5563' : '#9CA3AF'
          }}>
            {text || '-'}
          </span>
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      {/* 过滤器 */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input
          placeholder="搜索反馈内容..."
          prefix={<Search size={14} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <Select
          placeholder="类型"
          value={typeFilter}
          onChange={setTypeFilter}
          style={{ width: 120 }}
          allowClear
          options={[
            { value: 'Bug', label: 'Bug' },
            { value: '功能建议', label: '功能建议' },
            { value: '体验问题', label: '体验问题' },
            { value: '咨询求助', label: '咨询求助' },
            { value: '正面评价', label: '正面评价' },
          ]}
        />
        <Select
          placeholder="情感"
          value={emotionFilter}
          onChange={setEmotionFilter}
          style={{ width: 100 }}
          allowClear
          options={[
            { value: '负面', label: '负面' },
            { value: '中性', label: '中性' },
            { value: '正面', label: '正面' },
          ]}
        />
        <Select
          placeholder="优先级"
          value={priorityFilter}
          onChange={setPriorityFilter}
          style={{ width: 100 }}
          allowClear
          options={[
            { value: 'P0', label: 'P0' },
            { value: 'P1', label: 'P1' },
            { value: 'P2', label: 'P2' },
            { value: 'P3', label: 'P3' },
          ]}
        />
        <span style={{ color: '#6B7280', fontSize: 13 }}>
          共 {filteredData.length} 条
        </span>
      </div>

      {/* 表格 */}
      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        size="small"
        scroll={{ x: 1200, y: 400 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
    </div>
  );
};

export default FeedbackTable;