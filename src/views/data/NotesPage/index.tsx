import React, { useState, useEffect } from 'react';
import { Button, Input, Card, List, Modal, Form, message, Empty } from 'antd';
import { ArrowLeft, Plus, Edit, Trash2, Search } from 'lucide-react';
import dayjs from 'dayjs';
import { getNotes, addNote, updateNote, deleteNote, NoteItem } from '@/services/api';

interface NotesPageProps {
  onBack: () => void;
}

const NotesPage: React.FC<NotesPageProps> = ({ onBack }) => {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const data = await getNotes();
      setNotes(data.notes || []);
    } catch (e) {
      message.error('加载失败');
    }
  };

  const selectedNote = notes.find(n => n.id === selectedId);

  const handleSave = async (values: any) => {
    try {
      if (values.id) {
        await updateNote(values.id, values as Partial<NoteItem>);
      } else {
        await addNote(values as Omit<NoteItem, 'id' | 'createTime' | 'updateTime'>);
      }
      message.success('保存成功');
      setModalOpen(false);
      form.resetFields();
      loadNotes();
    } catch (e) {
      message.error('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    if (selectedId === id) setSelectedId(null);
    message.success('删除成功');
    loadNotes();
  };

  const handleContentChange = async (content: string) => {
    if (selectedNote) {
      await updateNote(selectedNote.id, { content });
      loadNotes();
    }
  };

  const filteredNotes = notes.filter(n =>
    n.title.includes(searchKeyword) || n.content.includes(searchKeyword)
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>笔记</h3>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => { form.resetFields(); setModalOpen(true); }}>新建笔记</Button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 280, borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 12 }}>
            <Input prefix={<Search size={14} />} placeholder="搜索笔记" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
          </div>
          <List
            style={{ flex: 1, overflow: 'auto' }}
            dataSource={filteredNotes}
            renderItem={(item) => (
              <List.Item
                onClick={() => setSelectedId(item.id)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: selectedId === item.id ? '#EFF6FF' : 'transparent',
                  borderLeft: selectedId === item.id ? '3px solid #3B82F6' : '3px solid transparent'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{dayjs(item.updateTime).format('MM-DD HH:mm')}</div>
                </div>
                <Button size="small" danger icon={<Trash2 size={12} />} onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} />
              </List.Item>
            )}
          />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedNote ? (
            <>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
                <h4 style={{ flex: 1, margin: 0 }}>{selectedNote.title}</h4>
                <Button icon={<Edit size={14} />} onClick={() => { form.setFieldsValue(selectedNote); setModalOpen(true); }}>编辑</Button>
              </div>
              <Input.TextArea
                style={{ flex: 1, border: 'none', resize: 'none', padding: 16 }}
                value={selectedNote.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="开始输入..."
              />
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="选择或创建一个笔记" />
            </div>
          )}
        </div>
      </div>

      <Modal title="编辑笔记" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input placeholder="笔记标题" />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input placeholder="分类（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NotesPage;