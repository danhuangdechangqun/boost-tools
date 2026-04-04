// 用户反馈智能分析 - 主页面

import React, { useState } from 'react';
import { Button, Card, Tabs, Empty, Spin, message } from 'antd';
import { ArrowLeft, Download } from 'lucide-react';
import InputArea from './components/InputArea';
import AnalysisResult from './components/AnalysisResult';
import FeedbackTable from './components/FeedbackTable';
import ExportModal from './components/ExportModal';
import { useAnalysis } from './hooks/useAnalysis';
import { useExport } from './hooks/useExport';
import { Feedback } from './types';

interface FeedbackAnalysisPageProps {
  onBack: () => void;
}

const FeedbackAnalysisPage: React.FC<FeedbackAnalysisPageProps> = ({ onBack }) => {
  const { loading, progress, result, error, analyze, reset } = useAnalysis();
  const {
    fields,
    updateField,
    addCustomField,
    removeCustomField,
    exportExcel,
    exportMarkdown,
    exportCards,
  } = useExport();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('result');

  const handleSubmit = async (contents: string[]) => {
    if (contents.length === 0) {
      message.warning('请输入反馈内容');
      return;
    }
    await analyze(contents);
    setActiveTab('result');
  };

  const handleReset = () => {
    reset();
    setActiveTab('input');
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
        <h3 style={{ flex: 1, margin: 0 }}>用户反馈智能分析</h3>
        {result && (
          <>
            <Button onClick={handleReset}>重新分析</Button>
            <Button
              type="primary"
              icon={<Download size={16} />}
              onClick={() => setExportModalOpen(true)}
            >
              导出报告
            </Button>
          </>
        )}
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {error && (
          <Card style={{ marginBottom: 16, borderColor: '#EF4444' }}>
            <div style={{ color: '#EF4444' }}>分析出错：{error}</div>
          </Card>
        )}

        {!result ? (
          <Card title="输入反馈数据">
            <InputArea
              onSubmit={handleSubmit}
              loading={loading}
              progress={progress}
            />
            {loading && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16, color: '#6B7280' }}>
                  正在分析中，请稍候...
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'result',
                label: '分析结果',
                children: <AnalysisResult result={result} />,
              },
              {
                key: 'table',
                label: `全量数据 (${result.feedbacks.length})`,
                children: (
                  <FeedbackTable
                    feedbacks={result.feedbacks}
                  />
                ),
              },
            ]}
          />
        )}
      </div>

      {/* 导出弹窗 */}
      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        feedbacks={result?.feedbacks || []}
        fields={fields}
        onUpdateField={updateField}
        onAddCustomField={addCustomField}
        onRemoveCustomField={removeCustomField}
        onExportExcel={exportExcel}
        onExportMarkdown={exportMarkdown}
        onExportCards={exportCards}
      />
    </div>
  );
};

export default FeedbackAnalysisPage;