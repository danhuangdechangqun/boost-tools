// 思考状态指示组件 - 显示"正在思考中..."和展开按钮

import React from 'react';
import { Spin, Button, Typography } from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ThinkingIndicatorProps {
  phase: 'planning' | 'executing' | 'reflecting' | 'completed' | 'idle';
  expanded: boolean;
  onToggle: () => void;
}

const phaseTextMap = {
  planning: '正在思考中...',
  executing: '正在思考中...',
  reflecting: '正在思考中...',
  completed: '已完成',
  idle: ''
};

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  phase,
  expanded,
  onToggle
}) => {
  if (phase === 'idle' || phase === 'completed') {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      background: '#F3F4F6',
      borderRadius: 8,
      marginBottom: 12
    }}>
      <Spin size="small" />
      <Text style={{ color: '#6B7280' }}>
        {phaseTextMap[phase]}
      </Text>
      <Button
        type="text"
        size="small"
        icon={expanded ? <UpOutlined /> : <DownOutlined />}
        onClick={onToggle}
        style={{ marginLeft: 'auto' }}
      >
        {expanded ? '收起' : '详情'}
      </Button>
    </div>
  );
};

export default ThinkingIndicator;