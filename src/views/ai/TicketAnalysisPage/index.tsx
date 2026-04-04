// 工单数据智能分析 - 主页面

import React, { useState } from 'react';
import { Button, Tabs, Card, Spin, message } from 'antd';
import { ArrowLeft } from 'lucide-react';
import ImportArea from './components/ImportArea';
import ChartView from './components/ChartView';
import AnalysisReport from './components/AnalysisReport';
import { useAnalysis } from './hooks/useAnalysis';
import { FieldMapping } from './types';

interface TicketAnalysisPageProps {
  onBack: () => void;
}

const TicketAnalysisPage: React.FC<TicketAnalysisPageProps> = ({ onBack }) => {
  const {
    loading,
    progress,
    result,
    error,
    fieldMapping,
    autoDetectFields,
    setFieldMapping,
    analyze,
    reset,
  } = useAnalysis();
  const [activeTab, setActiveTab] = useState('import');

  const handleImport = async (data: Record<string, any>[], mapping: FieldMapping[]) => {
    await analyze(data, mapping);
    if (!error) {
      setActiveTab('chart');
    }
  };

  const handleAutoDetect = (headers: string[], sampleData: Record<string, any>[]) => {
    const mapping = autoDetectFields(headers, sampleData);
    setFieldMapping(mapping);
  };

  const handleReset = () => {
    reset();
    setActiveTab('import');
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      {/* 头部 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>工单数据智能分析</h3>
        {result && (
          <Button onClick={handleReset}>重新分析</Button>
        )}
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {error && (
          <Card style={{ marginBottom: 16, borderColor: '#EF4444' }}>
            <div style={{ color: '#EF4444' }}>分析出错：{error}</div>
          </Card>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#3B82F6', fontWeight: 500 }}>
              {progress.stage}...
            </div>
            <div style={{ marginTop: 8, color: '#6B7280' }}>
              步骤 {progress.current}/{progress.total}
            </div>
          </div>
        )}

        {!loading && !result ? (
          <Card title="导入工单数据">
            <ImportArea
              onImport={handleImport}
              fieldMapping={fieldMapping}
              onFieldMappingChange={setFieldMapping}
              onAutoDetect={handleAutoDetect}
              loading={loading}
            />
          </Card>
        ) : !loading && result ? (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'chart',
                label: '可视化图表',
                children: <ChartView result={result} />,
              },
              {
                key: 'report',
                label: '根因分析报告',
                children: <AnalysisReport result={result} />,
              },
            ]}
          />
        ) : null}
      </div>
    </div>
  );
};

export default TicketAnalysisPage;