import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Card, List, Modal, Form, message, Empty, Image } from 'antd';
import { ArrowLeft, Plus, Edit, Trash2, Search, ImageIcon } from 'lucide-react';
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
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  // 当选中笔记变化时，确保光标在末尾
  useEffect(() => {
    if (selectedNote && editorRef.current) {
      // 将光标移动到内容末尾
      const range = document.createRange();
      const selection = window.getSelection();
      if (editorRef.current.lastChild) {
        range.selectNodeContents(editorRef.current);
        range.collapse(false); // 移到末尾
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }, [selectedId]);

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
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个笔记吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await deleteNote(id);
        if (selectedId === id) setSelectedId(null);
        message.success('删除成功');
        loadNotes();
      }
    });
  };

  // 处理键盘事件（Backspace删除选中图片）
  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection && selection.anchorNode) {
        // 检查是否选中了图片元素
        let node = selection.anchorNode as Node;
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.tagName === 'IMG') {
            e.preventDefault();
            element.remove();
            await handleContentChange();
            message.success('图片已删除');
            return;
          }
        }
        // 检查父元素是否是图片
        if (node.parentElement?.tagName === 'IMG') {
          e.preventDefault();
          node.parentElement.remove();
          await handleContentChange();
          message.success('图片已删除');
          return;
        }
      }
    }
  };

  // 处理内容变化（包括文本和图片）
  const handleContentChange = async () => {
    if (selectedNote && editorRef.current) {
      const content = editorRef.current.innerHTML;
      await updateNote(selectedNote.id, { content });
      loadNotes();
    }
  };

  // 处理粘贴事件（支持图片）
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await insertImage(file);
        }
        return;
      }
    }
  };

  // 插入图片
  const insertImage = async (file: File) => {
    if (!editorRef.current) return;

    // 转换为 base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imgHtml = `<img src="${e.target?.result}" style="max-width: 100%; margin: 8px 0; border-radius: 4px;" alt="粘贴的图片" />`;

      // 在光标位置插入图片
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const div = document.createElement('div');
        div.innerHTML = imgHtml;
        const img = div.firstChild as Node;
        range.insertNode(img);
        range.setStartAfter(img);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else if (editorRef.current) {
        editorRef.current.innerHTML += imgHtml;
      }

      await handleContentChange();
      message.success('图片已插入');
    };
    reader.readAsDataURL(file);
  };

  // 上传图片
  const handleUploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        insertImage(file);
      }
    };
    input.click();
  };

  const filteredNotes = notes.filter(n =>
    n.title.includes(searchKeyword) || (n.content && n.content.includes(searchKeyword))
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>笔记</h3>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => { form.resetFields(); setModalOpen(true); }}>新建笔记</Button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 左侧列表 */}
        <div style={{ width: 300, borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
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

        {/* 右侧详情/编辑区 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
          {selectedNote ? (
            <>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
                <h4 style={{ flex: 1, margin: 0 }}>{selectedNote.title}</h4>
                <Button icon={<ImageIcon size={14} />} onClick={handleUploadImage}>插入图片</Button>
                <Button icon={<Edit size={14} />} onClick={() => { form.setFieldsValue(selectedNote); setModalOpen(true); }}>编辑标题</Button>
              </div>
              <div
                ref={editorRef}
                contentEditable
                onPaste={handlePaste}
                onInput={handleContentChange}
                onBlur={handleContentChange}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  padding: 16,
                  overflow: 'auto',
                  outline: 'none',
                  lineHeight: 1.8,
                  fontSize: 14,
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                dangerouslySetInnerHTML={{ __html: selectedNote.content || '' }}
                data-placeholder="开始输入...支持粘贴图片"
              />
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
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

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
        }
        [contenteditable] img {
          max-width: 100%;
          margin: 8px 0;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default NotesPage;