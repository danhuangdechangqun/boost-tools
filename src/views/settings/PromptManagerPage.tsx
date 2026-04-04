// 提示词管理页面

import React, { useEffect, useState } from 'react';
import { Button, Card, Input, Select, Modal, message, Tabs, Tag, Empty, Spin } from 'antd';
import { ArrowLeft, Save, Undo2, Info } from 'lucide-react';
import { promptService, PromptDefinition } from '@/services/promptService';

interface PromptManagerPageProps {
  onBack: () => void;
}

const PromptManagerPage: React.FC<PromptManagerPageProps> = ({ onBack }) => {
  const [prompts, setPrompts] = useState<PromptDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');
  const [editingTemplate, setEditingTemplate] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);

  // 加载提示词
  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const data = await promptService.getAll();
      setPrompts(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
        setEditingTemplate(data[0].template);
      }
    } catch (e) {
      message.error('加载提示词失败');
    } finally {
      setLoading(false);
    }
  };

  // 选择提示词
  const handleSelect = (id: string) => {
    if (hasChanges) {
      Modal.confirm({
        title: '未保存的更改',
        content: '当前有未保存的更改，是否放弃？',
        onOk: () => {
          setSelectedId(id);
          const prompt = prompts.find(p => p.id === id);
          if (prompt) {
            setEditingTemplate(prompt.template);
            setHasChanges(false);
          }
        }
      });
    } else {
      setSelectedId(id);
      const prompt = prompts.find(p => p.id === id);
      if (prompt) {
        setEditingTemplate(prompt.template);
      }
    }
  };

  // 保存提示词
  const handleSave = async () => {
    try {
      await promptService.update(selectedId, editingTemplate);
      message.success('保存成功');
      setHasChanges(false);
      await loadPrompts();
    } catch (e) {
      message.error('保存失败');
    }
  };

  // 重置当前提示词
  const handleReset = async () => {
    try {
      await promptService.reset(selectedId);
      message.success('已重置为默认');
      setHasChanges(false);
      await loadPrompts();
      const prompt = prompts.find(p => p.id === selectedId);
      if (prompt) {
        setEditingTemplate(prompt.template);
      }
    } catch (e) {
      message.error('重置失败');
    }
    setResetModalVisible(false);
  };

  // 重置所有提示词
  const handleResetAll = async () => {
    try {
      await promptService.resetAll();
      message.success('已重置所有提示词');
      setHasChanges(false);
      await loadPrompts();
    } catch (e) {
      message.error('重置失败');
    }
    setResetModalVisible(false);
  };

  // 当前选中的提示词
  const selectedPrompt = prompts.find(p => p.id === selectedId);

  // 按分类分组
  const groupedPrompts = prompts.reduce((acc, p) => {
    if (!acc[p.category]) {
      acc[p.category] = [];
    }
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, PromptDefinition[]>);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      {/* 头部 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>提示词管理</h3>
        <Button
          icon={<Undo2 size={16} />}
          onClick={() => setResetModalVisible(true)}
        >
          重置全部
        </Button>
      </div>

      {/* 主内容 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧：提示词列表 */}
        <div style={{
          width: 280,
          borderRight: '1px solid #E5E7EB',
          overflow: 'auto',
          padding: 16
        }}>
          {Object.entries(groupedPrompts).map(([category, items]) => (
            <div key={category} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 12,
                color: '#6B7280',
                fontWeight: 500,
                marginBottom: 8,
                textTransform: 'uppercase'
              }}>
                {category}
              </div>
              {items.map(prompt => (
                <div
                  key={prompt.id}
                  onClick={() => handleSelect(prompt.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    marginBottom: 4,
                    background: selectedId === prompt.id ? '#EFF6FF' : 'transparent',
                    border: `1px solid ${selectedId === prompt.id ? '#3B82F6' : 'transparent'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 500, color: '#1F2937', fontSize: 14 }}>
                    {prompt.name}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#6B7280',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {prompt.description}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* 右侧：编辑区域 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedPrompt ? (
            <>
              {/* 提示词信息 */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <h4 style={{ margin: 0 }}>{selectedPrompt.name}</h4>
                  <Tag color="blue">{selectedPrompt.category}</Tag>
                </div>
                <div style={{ color: '#6B7280', fontSize: 13 }}>
                  {selectedPrompt.description}
                </div>
                {selectedPrompt.variables.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Info size={14} color="#9CA3AF" />
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                      变量: {selectedPrompt.variables.map(v => `{${v}}`).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* 编辑器 */}
              <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
                <Input.TextArea
                  value={editingTemplate}
                  onChange={(e) => {
                    setEditingTemplate(e.target.value);
                    setHasChanges(true);
                  }}
                  style={{
                    height: '100%',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    lineHeight: 1.6
                  }}
                  placeholder="输入提示词模板..."
                />
              </div>

              {/* 底部操作栏 */}
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  字符数: {editingTemplate.length}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    icon={<Undo2 size={16} />}
                    onClick={() => setResetModalVisible(true)}
                  >
                    重置当前
                  </Button>
                  <Button
                    type="primary"
                    icon={<Save size={16} />}
                    onClick={handleSave}
                    disabled={!hasChanges}
                  >
                    保存
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B7280'
            }}>
              <Empty description="请选择一个提示词" />
            </div>
          )}
        </div>
      </div>

      {/* 重置确认弹窗 */}
      <Modal
        title="重置提示词"
        open={resetModalVisible}
        onCancel={() => setResetModalVisible(false)}
        footer={null}
      >
        <div style={{ marginBottom: 16 }}>
          确定要重置提示词吗？这将恢复为默认模板。
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => setResetModalVisible(false)}>取消</Button>
          <Button onClick={handleReset}>重置当前</Button>
          <Button danger onClick={handleResetAll}>重置全部</Button>
        </div>
      </Modal>
    </div>
  );
};

export default PromptManagerPage;