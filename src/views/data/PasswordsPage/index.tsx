import React, { useState, useEffect } from 'react';
import { Button, Input, Card, List, Modal, Form, message, Empty } from 'antd';
import { ArrowLeft, Plus, Edit, Trash2, Eye, EyeOff, Copy, Search } from 'lucide-react';
import dayjs from 'dayjs';
import { getPasswords, addPassword, updatePassword, deletePassword, PasswordItem } from '@/services/api';

interface PasswordsPageProps {
  onBack: () => void;
}

const PasswordsPage: React.FC<PasswordsPageProps> = ({ onBack }) => {
  const [passwords, setPasswords] = useState<PasswordItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [form] = Form.useForm();

  useEffect(() => {
    loadPasswords();
  }, []);

  const loadPasswords = async () => {
    try {
      const data = await getPasswords();
      setPasswords(data.passwords || []);
    } catch (e) {
      message.error('加载失败');
    }
  };

  const handleSave = async (values: any) => {
    try {
      if (values.id) {
        await updatePassword(values.id, values as Partial<PasswordItem>);
      } else {
        await addPassword(values as Omit<PasswordItem, 'id' | 'createTime' | 'updateTime'>);
      }
      message.success('保存成功');
      setModalOpen(false);
      form.resetFields();
      loadPasswords();
    } catch (e) {
      message.error('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    await deletePassword(id);
    message.success('删除成功');
    loadPasswords();
  };

  const togglePasswordVisibility = (id: string) => {
    const newSet = new Set(visiblePasswords);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setVisiblePasswords(newSet);
  };

  const filteredPasswords = passwords.filter(p =>
    p.name.includes(searchKeyword) || (p.username?.includes(searchKeyword) ?? false)
  );

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>账号密码</h3>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => { form.resetFields(); setModalOpen(true); }}>添加账号</Button>
      </div>

      <div style={{ padding: 16 }}>
        <Input prefix={<Search size={14} />} placeholder="搜索账号" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} style={{ marginBottom: 16 }} />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
        {filteredPasswords.length === 0 ? (
          <Empty description="暂无账号，点击右上角添加" />
        ) : (
          <List
            grid={{ gutter: 16, column: 2 }}
            dataSource={filteredPasswords}
            renderItem={(item) => (
              <List.Item>
                <Card
                  title={item.name}
                  extra={
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button size="small" icon={<Edit size={12} />} onClick={() => { form.setFieldsValue(item); setModalOpen(true); }} />
                      <Button size="small" danger icon={<Trash2 size={12} />} onClick={() => handleDelete(item.id)} />
                    </div>
                  }
                >
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#6B7280' }}>账号: </span>
                    <span>{item.username || '-'}</span>
                    {item.username && <Button size="small" icon={<Copy size={10} />} style={{ marginLeft: 8 }} onClick={() => { navigator.clipboard.writeText(item.username!); message.success('已复制'); }} />}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#6B7280' }}>密码: </span>
                    <span>{visiblePasswords.has(item.id) ? item.password : '••••••••'}</span>
                    <Button size="small" icon={visiblePasswords.has(item.id) ? <EyeOff size={10} /> : <Eye size={10} />} style={{ marginLeft: 8 }} onClick={() => togglePasswordVisibility(item.id)} />
                    <Button size="small" icon={<Copy size={10} />} style={{ marginLeft: 4 }} onClick={() => { navigator.clipboard.writeText(item.password); message.success('已复制'); }} />
                  </div>
                  {item.notes && (
                    <div>
                      <span style={{ color: '#6B7280' }}>备注: </span>
                      <span>{item.notes}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
                    创建于 {dayjs(item.createTime).format('YYYY-MM-DD')}
                  </div>
                </Card>
              </List.Item>
            )}
          />
        )}
      </div>

      <Modal title="编辑账号" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="如：GitHub" />
          </Form.Item>
          <Form.Item name="username" label="账号">
            <Input placeholder="登录账号" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }]}>
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PasswordsPage;