// 执行详情展开面板 - 显示规划、执行、反思的详细过程

import React from 'react';
import { Card, Typography, Tag, Collapse, Timeline } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  RightOutlined,
  BulbOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

import {
  TaskPlan,
  TaskReflection,
  ExecutionLogEntry
} from '../agentTypes';

interface ExecutionDetailDrawerProps {
  plan?: TaskPlan;
  reflection?: TaskReflection;
  executionLog?: ExecutionLogEntry[];
}

const ExecutionDetailDrawer: React.FC<ExecutionDetailDrawerProps> = ({
  plan,
  reflection,
  executionLog
}) => {
  if (!plan) {
    return null;
  }

  // 步骤状态图标
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#10B981' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#EF4444' }} />;
      case 'running':
        return <LoadingOutlined style={{ color: '#3B82F6' }} />;
      case 'skipped':
        return <RightOutlined style={{ color: '#9CA3AF' }} />;
      default:
        return <RightOutlined style={{ color: '#9CA3AF' }} />;
    }
  };

  // 步骤状态颜色
  const getStepColor = (status: string): string => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'processing';
      case 'skipped':
        return 'default';
      default:
        return 'default';
    }
  };

  // 规划阶段
  const planningSection = (
    <Card size="small" style={{ marginBottom: 8 }}>
      <Title level={5} style={{ marginBottom: 8 }}>📋 规划阶段</Title>
      <div style={{ paddingLeft: 8 }}>
        {plan.steps.map((step, index) => (
          <div key={step.id} style={{ marginBottom: 4 }}>
            <Tag color="blue">{index + 1}</Tag>
            <Text>{step.description}</Text>
            {step.intent && (
              <Tag style={{ marginLeft: 4 }}>{step.intent}</Tag>
            )}
          </div>
        ))}
      </div>
    </Card>
  );

  // 执行阶段
  const executionSection = (
    <Card size="small" style={{ marginBottom: 8 }}>
      <Title level={5} style={{ marginBottom: 8 }}>⚡ 执行阶段</Title>
      <div style={{ paddingLeft: 8 }}>
        {plan.steps.map((step) => (
          <div key={step.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            {getStepIcon(step.status)}
            <Text>{step.description}</Text>
            <Tag color={getStepColor(step.status)}>
              {step.status === 'success' ? '完成' :
               step.status === 'failed' ? '失败' :
               step.status === 'running' ? '执行中' :
               step.status === 'skipped' ? '跳过' : '待执行'}
            </Tag>
            {step.retryCount > 0 && (
              <Text type="secondary">(重试{step.retryCount}次)</Text>
            )}
          </div>
        ))}
      </div>
    </Card>
  );

  // 反思阶段
  const reflectionSection = reflection ? (
    <Card size="small">
      <Title level={5} style={{ marginBottom: 8 }}>
        <BulbOutlined style={{ marginRight: 4, color: '#F59E0B' }} />
        反思阶段
      </Title>
      <div style={{ paddingLeft: 8 }}>
        <div style={{ marginBottom: 8 }}>
          <Text strong>成功率: </Text>
          <Tag color={reflection.successRate >= 0.8 ? 'success' : reflection.successRate >= 0.5 ? 'warning' : 'error'}>
            {(reflection.successRate * 100).toFixed(0)}%
          </Tag>
        </div>
        <div style={{ marginBottom: 8 }}>
          <Text strong>总结: </Text>
          <Text>{reflection.summary}</Text>
        </div>
        {reflection.improvements.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <Text strong>改进建议:</Text>
            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
              {reflection.improvements.map((imp, i) => (
                <li key={i}><Text type="secondary">{imp}</Text></li>
              ))}
            </ul>
          </div>
        )}
        {reflection.lessonsLearned.length > 0 && (
          <div>
            <Text strong>经验教训:</Text>
            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
              {reflection.lessonsLearned.map((lesson, i) => (
                <li key={i}><Text type="secondary">{lesson}</Text></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  ) : null;

  return (
    <div style={{
      padding: '8px 0',
      maxHeight: 400,
      overflow: 'auto'
    }}>
      {planningSection}
      {executionSection}
      {reflectionSection}

      {/* 执行日志 */}
      {executionLog && executionLog.length > 0 && (
        <Collapse
          ghost
          items={[{
            key: 'log',
            label: <Text type="secondary">执行日志 ({executionLog.length}条)</Text>,
            children: (
              <Timeline
                items={executionLog.slice(-20).map(log => ({
                  color: log.phase === 'completed' ? 'green' : 'blue',
                  children: (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </Text>
                      <br />
                      <Text>{log.action}</Text>
                      {log.details && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {' - ' + log.details.substring(0, 100)}
                        </Text>
                      )}
                    </div>
                  )
                }))}
              />
            )
          }]}
        />
      )}
    </div>
  );
};

export default ExecutionDetailDrawer;