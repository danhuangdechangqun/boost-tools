// 知识库+RAG系统 - 主页面

import React, { useEffect, useState } from 'react';
import { Button, Tabs, Card, Statistic, Row, Col, Empty, Spin, message, Divider } from 'antd';
import { ArrowLeft, BookOpen, MessageCircle, Settings, Upload } from 'lucide-react';
import { useKnowledge } from './hooks/useKnowledge';
import { useRAG } from './hooks/useRAG';
import DocumentList from './components/DocumentList';
import ImportModal from './components/ImportModal';
import ChatPanel from './components/ChatPanel';
import SourceCard from './components/SourceCard';
import ConfigPanel from './components/ConfigPanel';
import ChunkList from './components/ChunkList';
import { Document, SearchResult, DocumentType, Chunk } from './types';

interface KnowledgeBasePageProps {
  onBack: () => void;
}

const KnowledgeBasePage: React.FC<KnowledgeBasePageProps> = ({ onBack }) => {
  const {
    documents,
    loading,
    config,
    loadDocuments,
    saveConfig,
    addDocument,
    processDocument,
    deleteDocument,
    getStats,
    getAllChunks,
    getDocument
  } = useKnowledge();

  const {
    messages,
    loading: ragLoading,
    answer,
    addUserMessage,
    addAssistantMessage,
    clearMessages
  } = useRAG();

  const [showImport, setShowImport] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedSource, setSelectedSource] = useState<SearchResult | null>(null);
  const [activeTab, setActiveTab] = useState('documents');
  const [processing, setProcessing] = useState(false);

  // 初始化
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 导入文档
  const handleImport = async (name: string, type: DocumentType, content: string) => {
    try {
      const doc = await addDocument(name, type, content);
      message.success('文档已添加，正在处理...');

      // 自动处理文档，传入文档对象避免状态延迟
      setProcessing(true);
      await processDocument(doc.id, doc);
      setProcessing(false);
      message.success('文档处理完成');
    } catch (e: any) {
      message.error('导入失败: ' + e.message);
    }
  };

  // 发送问题
  const handleSendQuestion = async (question: string) => {
    // 检查是否有可用文档
    const readyDocs = documents.filter(d => d.status === 'ready');
    if (readyDocs.length === 0) {
      message.warning('请先导入并处理文档');
      return;
    }

    // 添加用户消息
    addUserMessage(question);

    // 生成回答
    const chunks = getAllChunks();
    const answerMsg = await answer(question, chunks, getDocument, config);

    // 添加助手消息
    addAssistantMessage(answerMsg);
  };

  // 处理文档（切片）
  const handleProcess = async (docId: string) => {
    setProcessing(true);
    try {
      await processDocument(docId);
      message.success('文档处理完成');
    } catch (e: any) {
      message.error('处理失败: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  // 删除文档
  const handleDeleteDoc = async (id: string) => {
    await deleteDocument(id);
    if (selectedDoc?.id === id) {
      setSelectedDoc(null);
    }
    message.success('文档已删除');
  };

  // 统计信息
  const stats = getStats();

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#FFFFFF'
    }}>
      {/* 头部 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>
          返回
        </Button>

        <h3 style={{ flex: 1, margin: 0, fontWeight: 600 }}>
          知识库 + RAG系统
        </h3>

        <Button
          type="primary"
          icon={<Upload size={16} />}
          onClick={() => setShowImport(true)}
        >
          导入文档
        </Button>
      </div>

      {/* 主内容 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ padding: '0 16px' }}
          items={[
            {
              key: 'documents',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={16} /> 文档管理
                </span>
              ),
              children: (
                <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 180px)' }}>
                  {/* 左侧：文档列表 */}
                  <div style={{ flex: 1 }}>
                    <Card
                      title="文档列表"
                      style={{ height: '100%' }}
                      styles={{ body: { padding: 12, overflow: 'auto' } }}
                    >
                      {processing && (
                        <div style={{
                          padding: 12,
                          background: '#FEF3C7',
                          borderRadius: 6,
                          marginBottom: 12
                        }}>
                          <Spin size="small" /> 正在处理文档...
                        </div>
                      )}
                      <DocumentList
                        documents={documents}
                        loading={loading}
                        onDelete={handleDeleteDoc}
                        onProcess={handleProcess}
                        onSelect={setSelectedDoc}
                        selectedId={selectedDoc?.id}
                      />
                    </Card>
                  </div>

                  {/* 右侧：详情和配置 */}
                  <div style={{ width: 320 }}>
                    {/* 统计信息 */}
                    <Card size="small" style={{ marginBottom: 16 }}>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic
                            title="文档数量"
                            value={stats.documentCount}
                            suffix="个"
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="知识片段"
                            value={stats.chunkCount}
                            suffix="条"
                          />
                        </Col>
                      </Row>
                    </Card>

                    {/* 配置 */}
                    <ConfigPanel config={config} onUpdate={saveConfig} />

                    {/* 文档详情 */}
                    {selectedDoc && (
                      <Card size="small" title="文档详情" style={{ maxHeight: 400, overflow: 'auto' }}>
                        <div style={{ marginBottom: 8 }}>
                          <strong>{selectedDoc.name}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                          <div>类型: {selectedDoc.type.toUpperCase()}</div>
                          <div>大小: {(selectedDoc.size / 1024).toFixed(1)} KB</div>
                          <div>片段: {selectedDoc.bigChunks.reduce((sum, bc) => sum + bc.smallChunks.length, 0)} 条</div>
                          <div>创建: {new Date(selectedDoc.createdAt).toLocaleString()}</div>
                        </div>

                        {selectedDoc.bigChunks.length > 0 && (
                          <>
                            <Divider style={{ margin: '12px 0' }}>知识片段</Divider>
                            <ChunkList
                              chunks={selectedDoc.bigChunks.flatMap(bc => bc.smallChunks)}
                              onSelect={(chunk) => {
                                // 点击片段可以复制内容
                                navigator.clipboard.writeText(chunk.content);
                                message.success('片段内容已复制');
                              }}
                            />
                          </>
                        )}

                        {selectedDoc.bigChunks.length === 0 && selectedDoc.status === 'ready' && (
                          <Empty
                            description="文档尚未切片"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                        )}
                      </Card>
                    )}
                  </div>
                </div>
              )
            },
            {
              key: 'chat',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageCircle size={16} /> 智能问答
                </span>
              ),
              children: (
                <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 180px)' }}>
                  {/* 左侧：聊天 */}
                  <div style={{ flex: 1 }}>
                    <ChatPanel
                      messages={messages}
                      loading={ragLoading}
                      onSend={handleSendQuestion}
                      onClear={clearMessages}
                      onSourceClick={setSelectedSource}
                    />
                  </div>

                  {/* 右侧：来源详情 */}
                  <div style={{ width: 320 }}>
                    {selectedSource ? (
                      <SourceCard
                        result={selectedSource}
                        onClose={() => setSelectedSource(null)}
                      />
                    ) : (
                      <Card style={{ height: '100%' }}>
                        <Empty
                          description="点击回答中的来源标签查看详情"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      </Card>
                    )}

                    {/* 快速提示 */}
                    <Card size="small" title="使用提示" style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>
                        <p>• 先在"文档管理"中导入文档</p>
                        <p>• 文档处理完成后即可问答</p>
                        <p>• 点击来源标签可查看原文</p>
                        <p>• 支持多文档混合检索</p>
                      </div>
                    </Card>
                  </div>
                </div>
              )
            },
            {
              key: 'settings',
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Settings size={16} /> 高级设置
                </span>
              ),
              children: (
                <div style={{ maxWidth: 600, padding: 20 }}>
                  <Card title="RAG参数配置">
                    <p style={{ color: '#6B7280', marginBottom: 16 }}>
                      调整这些参数可以影响检索质量和回答效果
                    </p>
                    <ConfigPanel config={config} onUpdate={saveConfig} />
                  </Card>

                  <Card title="关于知识库" style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 14, color: '#374151' }}>
                      <p><strong>知识库</strong>允许您导入个人文档，建立本地知识索引。</p>
                      <p><strong>RAG (检索增强生成)</strong>会在回答问题时，自动检索相关文档片段，让AI回答更有依据。</p>
                      <p>所有数据存储在本地，保护您的隐私。</p>
                    </div>
                  </Card>
                </div>
              )
            }
          ]}
        />
      </div>

      {/* 导入弹窗 */}
      <ImportModal
        visible={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
      />
    </div>
  );
};

export default KnowledgeBasePage;