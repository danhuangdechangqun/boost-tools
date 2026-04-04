// 导出选项弹窗

import React, { useState } from 'react';
import { Modal, Button, Checkbox, Input, Divider, message, Space } from 'antd';
import { Download, Plus, Trash2 } from 'lucide-react';
import { Feedback, ExportField } from '../types';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  feedbacks: Feedback[];
  fields: ExportField[];
  onUpdateField: (key: string, updates: Partial<ExportField>) => void;
  onAddCustomField: (field: Omit<ExportField, 'isCustom' | 'enabled'>) => void;
  onRemoveCustomField: (key: string) => void;
  onExportExcel: (feedbacks: Feedback[]) => void;
  onExportMarkdown: (feedbacks: Feedback[]) => void;
  onExportCards: (feedbacks: Feedback[]) => void;
}

const ExportModal: React.FC<ExportModalProps> = ({
  open,
  onClose,
  feedbacks,
  fields,
  onUpdateField,
  onAddCustomField,
  onRemoveCustomField,
  onExportExcel,
  onExportMarkdown,
  onExportCards,
}) => {
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldDesc, setNewFieldDesc] = useState('');
  const [newFieldExample, setNewFieldExample] = useState('');

  const handleAddField = () => {
    if (!newFieldName.trim()) {
      message.warning('请输入字段名称');
      return;
    }

    onAddCustomField({
      key: `custom_${Date.now()}`,
      label: newFieldName.trim(),
      description: newFieldDesc.trim(),
      example: newFieldExample.trim(),
      customValue: '',
    });

    setNewFieldName('');
    setNewFieldDesc('');
    setNewFieldExample('');
    setShowAddField(false);
    message.success('字段添加成功');
  };

  const systemFields = fields.filter(f => !f.isCustom);
  const customFields = fields.filter(f => f.isCustom);

  return (
    <Modal
      title="导出设置"
      open={open}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="close" onClick={onClose}>关闭</Button>,
      ]}
    >
      {/* 字段配置 */}
      <div style={{ marginBottom: 16 }}>
        <h4 style={{ marginBottom: 12 }}>系统预设字段</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {systemFields.map(field => (
            <div
              key={field.key}
              style={{
                padding: '8px 12px',
                background: field.enabled ? '#EFF6FF' : '#F3F4F6',
                borderRadius: 6,
                border: `1px solid ${field.enabled ? '#3B82F6' : '#E5E7EB'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Checkbox
                checked={field.enabled}
                onChange={(e) => onUpdateField(field.key, { enabled: e.target.checked })}
              />
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{field.label}</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{field.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 自定义字段 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>自定义字段</h4>
          <Button
            size="small"
            icon={<Plus size={14} />}
            onClick={() => setShowAddField(!showAddField)}
          >
            添加字段
          </Button>
        </div>

        {showAddField && (
          <div style={{ padding: 12, background: '#F9FAFB', borderRadius: 8, marginBottom: 12 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                placeholder="字段名称（如：负责人）"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
              />
              <Input
                placeholder="字段描述（如：需求负责人名称）"
                value={newFieldDesc}
                onChange={(e) => setNewFieldDesc(e.target.value)}
              />
              <Input
                placeholder="示例值（如：张三）"
                value={newFieldExample}
                onChange={(e) => setNewFieldExample(e.target.value)}
              />
              <Space>
                <Button size="small" onClick={() => setShowAddField(false)}>取消</Button>
                <Button size="small" type="primary" onClick={handleAddField}>确认添加</Button>
              </Space>
            </Space>
          </div>
        )}

        {customFields.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {customFields.map(field => (
              <div
                key={field.key}
                style={{
                  padding: '8px 12px',
                  background: field.enabled ? '#F0FDF4' : '#F3F4F6',
                  borderRadius: 6,
                  border: `1px solid ${field.enabled ? '#10B981' : '#E5E7EB'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Checkbox
                  checked={field.enabled}
                  onChange={(e) => onUpdateField(field.key, { enabled: e.target.checked })}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{field.label}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{field.description}</div>
                </div>
                <Button
                  size="small"
                  danger
                  icon={<Trash2 size={12} />}
                  onClick={() => onRemoveCustomField(field.key)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#9CA3AF', fontSize: 13 }}>暂无自定义字段</div>
        )}
      </div>

      <Divider />

      {/* 导出按钮 */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Button
          icon={<Download size={16} />}
          onClick={() => { onExportExcel(feedbacks); onClose(); }}
        >
          导出Excel
        </Button>
        <Button
          icon={<Download size={16} />}
          onClick={() => { onExportMarkdown(feedbacks); onClose(); }}
        >
          导出Markdown
        </Button>
        <Button
          type="primary"
          icon={<Download size={16} />}
          onClick={() => { onExportCards(feedbacks); onClose(); }}
        >
          导出需求卡片
        </Button>
      </div>
    </Modal>
  );
};

export default ExportModal;