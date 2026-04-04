// 根因分析报告组件

import React from 'react';
import { Card, List, Tag, Button, Empty } from 'antd';
import { Download, AlertTriangle, Lightbulb, CheckCircle } from 'lucide-react';
import { AnalysisResult } from '../types';

interface AnalysisReportProps {
  result: AnalysisResult | null;
}

const AnalysisReport: React.FC<AnalysisReportProps> = ({ result }) => {
  if (!result) {
    return <Empty description="暂无分析结果" />;
  }

  const { coreFindings, rootCauses, suggestions, actionPlan, reasonDistribution, tickets } = result;

  // 导出报告
  const exportReport = () => {
    let report = `# 工单数据分析报告\n\n`;
    report += `生成时间：${new Date().toLocaleString()}\n\n`;
    report += `---\n\n`;

    // 统计概览
    report += `## 数据概览\n\n`;
    report += `- 总工单数：${tickets.length}\n`;
    report += `- 故障类型数：${Object.keys(reasonDistribution).length}\n\n`;

    // 核心发现
    if (coreFindings.length > 0) {
      report += `## 核心发现\n\n`;
      coreFindings.forEach((finding, index) => {
        report += `${index + 1}. ${finding}\n`;
      });
      report += '\n';
    }

    // 根因分析
    if (rootCauses.length > 0) {
      report += `## 根因分析\n\n`;
      rootCauses.forEach((cause, index) => {
        report += `${index + 1}. ${cause}\n`;
      });
      report += '\n';
    }

    // 预防建议
    if (suggestions.length > 0) {
      report += `## 预防建议\n\n`;
      suggestions.forEach((suggestion, index) => {
        report += `${index + 1}. ${suggestion}\n`;
      });
      report += '\n';
    }

    // 行动计划
    if (actionPlan.length > 0) {
      report += `## 行动计划\n\n`;
      actionPlan.forEach((action, index) => {
        report += `${index + 1}. ${action}\n`;
      });
      report += '\n';
    }

    // 下载
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `工单分析报告_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* 导出按钮 */}
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button icon={<Download size={16} />} onClick={exportReport}>
          导出报告
        </Button>
      </div>

      {/* 核心发现 */}
      <Card
        size="small"
        title={
          <span>
            <AlertTriangle size={16} style={{ marginRight: 8, color: '#EF4444' }} />
            核心发现
          </span>
        }
        style={{ marginBottom: 16 }}
      >
        <List
          dataSource={coreFindings}
          renderItem={(item) => (
            <List.Item style={{ border: 'none', padding: '8px 0' }}>
              <Tag color="red">发现</Tag> {item}
            </List.Item>
          )}
          locale={{ emptyText: '暂无核心发现' }}
        />
      </Card>

      {/* 根因分析 */}
      <Card
        size="small"
        title={
          <span>
            <Lightbulb size={16} style={{ marginRight: 8, color: '#F59E0B' }} />
            根因分析
          </span>
        }
        style={{ marginBottom: 16 }}
      >
        <List
          dataSource={rootCauses}
          renderItem={(item) => (
            <List.Item style={{ border: 'none', padding: '8px 0' }}>
              <Tag color="orange">根因</Tag> {item}
            </List.Item>
          )}
          locale={{ emptyText: '暂无根因分析' }}
        />
      </Card>

      {/* 预防建议 */}
      <Card
        size="small"
        title={
          <span>
            <CheckCircle size={16} style={{ marginRight: 8, color: '#10B981' }} />
            预防建议
          </span>
        }
        style={{ marginBottom: 16 }}
      >
        <List
          dataSource={suggestions}
          renderItem={(item) => (
            <List.Item style={{ border: 'none', padding: '8px 0' }}>
              <Tag color="green">建议</Tag> {item}
            </List.Item>
          )}
          locale={{ emptyText: '暂无预防建议' }}
        />
      </Card>

      {/* 行动计划 */}
      {actionPlan.length > 0 && (
        <Card
          size="small"
          title={
            <span>
              <CheckCircle size={16} style={{ marginRight: 8, color: '#3B82F6' }} />
              行动计划
            </span>
          }
        >
          <List
            dataSource={actionPlan}
            renderItem={(item) => (
              <List.Item style={{ border: 'none', padding: '8px 0' }}>
                <Tag color="blue">行动</Tag> {item}
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};

export default AnalysisReport;