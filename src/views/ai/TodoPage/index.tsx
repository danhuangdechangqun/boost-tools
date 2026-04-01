import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Modal, Form, message, Spin, Tag } from 'antd';
import { ArrowLeft, Plus, Trash2, Check, Calendar, GripVertical } from 'lucide-react';
import dayjs from 'dayjs';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { getTodos, addTodo, updateTodo, deleteTodo, callLlm, TodoItem, shouldGenerateWeeklyReport } from '@/services/api';

interface TodoPageProps {
  onBack: () => void;
}

type TodoGroup = 'today' | 'tomorrow' | 'nextWeek' | 'overdue';

const TodoPage: React.FC<TodoPageProps> = ({ onBack }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [form] = Form.useForm();
  const [isWeeklyReportTime, setIsWeeklyReportTime] = useState(false);

  // 自动迁移：将过期的"tomorrow"任务迁移到"today"
  const autoMigrateTodos = async (todoList: TodoItem[]) => {
    const today = dayjs().format('YYYY-MM-DD');
    const needsMigration = todoList.filter(t =>
      t.group === 'tomorrow' && t.status === 'pending' && t.dueDate && t.dueDate <= today
    );

    if (needsMigration.length > 0) {
      for (const todo of needsMigration) {
        await updateTodo(todo.id, { group: 'today' });
      }
      message.info(`${needsMigration.length}个任务已自动迁移到今日待办`);
      return true;
    }
    return false;
  };

  const loadTodos = async () => {
    setLoading(true);
    try {
      const data = await getTodos();
      const todoList = data.todos || [];
      // 自动迁移过期任务
      const migrated = await autoMigrateTodos(todoList);
      if (migrated) {
        // 重新加载迁移后的数据
        const newData = await getTodos();
        setTodos(newData.todos || []);
      } else {
        setTodos(todoList);
      }
      // 检查是否是周报生成时间
      setIsWeeklyReportTime(shouldGenerateWeeklyReport());
    } catch (e) {
      message.error('加载失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const handleAdd = async (values: any) => {
    const todo: Omit<TodoItem, 'id' | 'createTime'> = {
      title: values.title,
      description: values.description,
      status: 'pending',
      dueDate: values.dueDate || dayjs().format('YYYY-MM-DD'),
      group: values.group || 'today',
    };
    await addTodo(todo);
    message.success('添加成功');
    setModalOpen(false);
    form.resetFields();
    loadTodos();
  };

  const handleComplete = async (id: string) => {
    await updateTodo(id, { status: 'completed', group: 'completed' });
    message.success('任务完成');
    loadTodos();
  };

  const handleDelete = async (id: string) => {
    await deleteTodo(id);
    message.success('删除成功');
    loadTodos();
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // 没有目的地或原地不动
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // 只处理分组间的拖拽
    const newGroup = destination.droppableId as TodoGroup;
    const todo = todos.find(t => t.id === draggableId);

    if (todo && newGroup !== source.droppableId) {
      // 更新分组
      await updateTodo(draggableId, { group: newGroup });
      loadTodos();
    }
  };

  const generateWeeklyReport = async () => {
    setReportLoading(true);
    try {
      const completedTodos = todos.filter(t => t.status === 'completed' && t.completeTime);
      if (completedTodos.length === 0) {
        message.warning('没有已完成的任务');
        setReportContent('本周暂无已完成任务。');
      } else {
        const prompt = `请根据以下本周已完成的任务，生成一份周报摘要：
${completedTodos.map(t => `- [${t.completeTime?.split('T')[0]}] ${t.title}`).join('\n')}
要求：简洁、突出成果、可复制使用，Markdown格式。`;
        const content = await callLlm(prompt);
        setReportContent(content);
      }
    } catch (e: any) {
      message.error(e?.message || '生成失败');
    }
    setReportLoading(false);
  };

  const getGroupTodos = (group: TodoGroup) => todos.filter(t => t.group === group && t.status === 'pending');
  const completedTodos = todos.filter(t => t.status === 'completed');

  const renderTodoCard = (item: TodoItem) => (
    <Draggable key={item.id} draggableId={item.id} index={0}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            ...provided.draggableProps.style,
            marginBottom: 8,
          }}
        >
          <Card
            size="small"
            style={{
              border: '1px solid #E5E7EB',
              background: snapshot.isDragging ? '#EFF6FF' : '#FFFFFF',
              boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
            }}
            styles={{ body: { padding: 12 } }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div {...provided.dragHandleProps} style={{ cursor: 'grab', color: '#9CA3AF', marginTop: 2 }}>
                <GripVertical size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                {item.description && (
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.description}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <Button size="small" icon={<Check size={14} />} onClick={() => handleComplete(item.id)} title="标记完成" />
                <Button size="small" danger icon={<Trash2 size={14} />} onClick={() => handleDelete(item.id)} title="删除" />
              </div>
            </div>
          </Card>
        </div>
      )}
    </Draggable>
  );

  const renderDroppableColumn = (title: string, groupId: TodoGroup, bgColor: string) => {
    const items = getGroupTodos(groupId);
    return (
      <div style={{ flex: 1, background: bgColor, borderRadius: 8, padding: 12, minHeight: 200 }}>
        <h4 style={{ marginBottom: 12, color: '#1F2937' }}>{title} ({items.length})</h4>
        <Droppable droppableId={groupId}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                minHeight: 100,
                background: snapshot.isDraggingOver ? '#EFF6FF' : 'transparent',
                borderRadius: 8,
                transition: 'background 0.2s ease',
              }}
            >
              {items.map((item) => renderTodoCard(item))}
              {provided.placeholder}
              {items.length === 0 && !snapshot.isDraggingOver && (
                <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 20, border: '2px dashed #E5E7EB', borderRadius: 8 }}>
                  拖拽任务到此处
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>TodoList周报</h3>
        <Button
          type={isWeeklyReportTime ? 'primary' : 'default'}
          icon={<Calendar size={16} />}
          onClick={() => { setReportModalOpen(true); generateWeeklyReport(); }}
          style={isWeeklyReportTime ? { background: '#16A34A', borderColor: '#16A34A' } : {}}
        >
          {isWeeklyReportTime ? '生成周报 (今日推荐)' : '生成周报'}
        </Button>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>添加任务</Button>
      </div>

      <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
        {loading ? (
          <Spin />
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div style={{ display: 'flex', gap: 16 }}>
              {renderDroppableColumn('今日待办', 'today', '#FFFFFF')}
              {renderDroppableColumn('明日待办', 'tomorrow', '#FFFFFF')}
              {renderDroppableColumn('下周计划', 'nextWeek', '#FFFFFF')}
            </div>
          </DragDropContext>
        )}

        {completedTodos.length > 0 && (
          <div style={{ marginTop: 16, padding: 12, background: '#F0FDF4', borderRadius: 8 }}>
            <h4 style={{ marginBottom: 12, color: '#16A34A' }}>本周已完成 ({completedTodos.length})</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {completedTodos.map(item => (
                <Tag key={item.id} color="green" style={{ margin: 0 }}>{item.title}</Tag>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal title="添加任务" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="title" label="任务标题" rules={[{ required: true }]}>
            <Input placeholder="输入任务标题" />
          </Form.Item>
          <Form.Item name="description" label="任务描述">
            <Input.TextArea rows={3} placeholder="输入任务描述（可选）" />
          </Form.Item>
          <Form.Item name="group" label="分组" initialValue="today">
            <select style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #D9D9D9' }}>
              <option value="today">今日待办</option>
              <option value="tomorrow">明日待办</option>
              <option value="nextWeek">下周计划</option>
            </select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="周报"
        open={reportModalOpen}
        onCancel={() => setReportModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setReportModalOpen(false)}>关闭</Button>,
          <Button key="copy" type="primary" onClick={() => { navigator.clipboard.writeText(reportContent); message.success('已复制'); }}>复制</Button>
        ]}
        width={600}
      >
        {reportLoading ? <Spin /> : <pre style={{ whiteSpace: 'pre-wrap', background: '#F9FAFB', padding: 16, borderRadius: 8, maxHeight: 400, overflow: 'auto' }}>{reportContent}</pre>}
      </Modal>
    </div>
  );
};

export default TodoPage;