import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Modal, Form, message, List, Empty } from 'antd';
import { ArrowLeft, Plus, Edit, Trash2, Copy } from 'lucide-react';
import { getPrompts, addPrompt, updatePrompt, deletePrompt, PromptItem } from '@/services/api';

interface PromptsPageProps {
  onBack: () => void;
}

const PromptsPage: React.FC<PromptsPageProps> = ({ onBack }) => {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [fillModalOpen, setFillModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);
  const [filledResult, setFilledResult] = useState('');
  const [form] = Form.useForm();
  const [fillForm] = Form.useForm();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const data = await getPrompts();
      setPrompts(data.prompts || []);
    } catch (e) {
      message.error('加载失败');
    }
  };

  const handleSave = async (values: any) => {
    const template = values.template;
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    const placeholders: string[] = [];
    let match;
    while ((match = placeholderRegex.exec(template)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1]);
      }
    }

    const promptData: Omit<PromptItem, 'id' | 'createTime'> = {
      name: values.name,
      template: values.template,
      category: values.category,
      placeholders,
    };

    try {
      if (values.id) {
        await updatePrompt(values.id, promptData);
      } else {
        await addPrompt(promptData);
      }
      message.success('保存成功');
      setModalOpen(false);
      form.resetFields();
      loadPrompts();
    } catch (e) {
      message.error('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    await deletePrompt(id);
    message.success('删除成功');
    loadPrompts();
  };

  const openFillModal = (prompt: PromptItem) => {
    setSelectedPrompt(prompt);
    setFillModalOpen(true);
    fillForm.resetFields();
    setFilledResult('');
  };

  const handleFill = (values: any) => {
    let result = selectedPrompt!.template;
    Object.keys(values).forEach(key => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), values[key]);
    });
    setFilledResult(result);
  };

  // Extract placeholders from template
  const getPlaceholders = (template: string) => {
    const regex = /\{\{(\w+)\}\}/g;
    const placeholders: string[] = [];
    let match;
    while ((match = regex.exec(template)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1]);
      }
    }
    return placeholders;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>提示词模板</h3>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => { form.resetFields(); setModalOpen(true); }}>新建模板</Button>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {prompts.length === 0 ? (
          <Empty description="暂无模板，点击右上角新建" />
        ) : (
          <List
            grid={{ gutter: 16, column: 2 }}
            dataSource={prompts}
            renderItem={(item) => (
              <List.Item>
                <Card
                  title={item.name}
                  extra={
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button size="small" icon={<Edit size={12} />} onClick={() => { form.setFieldsValue({ ...item, template: item.template }); setModalOpen(true); }} />
                      <Button size="small" danger icon={<Trash2 size={12} />} onClick={() => handleDelete(item.id)} />
                    </div>
                  }
                >
                  <pre style={{ maxHeight: 100, overflow: 'auto', fontSize: 12, background: '#F9FAFB', padding: 8, borderRadius: 4 }}>
                    {item.template.substring(0, 200)}...
                  </pre>
                  <Button type="primary" block style={{ marginTop: 12 }} onClick={() => openFillModal(item)}>使用模板</Button>
                </Card>
              </List.Item>
            )}
          />
        )}
      </div>

      <Modal title="编辑模板" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="name" label="模板名称" rules={[{ required: true }]}>
            <Input placeholder="如：代码解释" />
          </Form.Item>
          <Form.Item name="template" label="模板内容" rules={[{ required: true }]} extra="使用 {{字段名}} 作为占位符">
            <Input.TextArea rows={6} placeholder="请解释以下{{language}}代码的功能：&#10;{{code}}" />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input placeholder="分类（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="填充模板" open={fillModalOpen} onCancel={() => setFillModalOpen(false)} footer={null} width={600}>
        <Form form={fillForm} layout="vertical" onFinish={handleFill}>
          {selectedPrompt && getPlaceholders(selectedPrompt.template).map(name => (
            <Form.Item key={name} name={name} label={name} rules={[{ required: true }]}>
              <Input.TextArea rows={2} placeholder={`输入${name}`} />
            </Form.Item>
          ))}
          <Button type="primary" htmlType="submit" block>生成</Button>
        </Form>
        {filledResult && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>生成结果</span>
              <Button icon={<Copy size={14} />} onClick={() => { navigator.clipboard.writeText(filledResult); message.success('已复制'); }}>复制</Button>
            </div>
            <pre style={{ background: '#F9FAFB', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap' }}>{filledResult}</pre>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PromptsPage;