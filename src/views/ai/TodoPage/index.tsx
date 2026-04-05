import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Modal, Form, message, Spin, Tag } from 'antd';
import { ArrowLeft, Plus, Trash2, Check, Calendar, GripVertical, RotateCcw, History, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { getTodos, addTodo, updateTodo, deleteTodo, callLlm, TodoItem, shouldGenerateWeeklyReport } from '@/services/api';

interface TodoPageProps {
  onBack: () => void;
}

type TodoGroup = 'today' | 'tomorrow' | 'nextWeek' | 'overdue' | 'incomplete';

const TodoPage: React.FC<TodoPageProps> = ({ onBack }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [completedDetailModalOpen, setCompletedDetailModalOpen] = useState(false);
  const [viewingCompletedTodo, setViewingCompletedTodo] = useState<TodoItem | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [isWeeklyReportTime, setIsWeeklyReportTime] = useState(false);

  // 自动迁移：将过期的"tomorrow"任务迁移到"incomplete"
  const autoMigrateTodos = async (todoList: TodoItem[]) => {
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    // 找出需要迁移的任务：
    // 1. 昨天的今日待办未完成 -> incomplete
    // 2. 过期的明日待办 -> today
    const needsMigrationToIncomplete = todoList.filter(t =>
      t.group === 'today' && t.status === 'pending' && t.dueDate && t.dueDate < today
    );

    const needsMigrationToToday = todoList.filter(t =>
      t.group === 'tomorrow' && t.status === 'pending' && t.dueDate && t.dueDate < today
    );

    let migratedCount = 0;

    // 昨日未完成的任务迁移到"未完成"
    for (const todo of needsMigrationToIncomplete) {
      await updateTodo(todo.id, { group: 'incomplete' });
      migratedCount++;
    }

    // 过期的明日待办迁移到今日
    for (const todo of needsMigrationToToday) {
      await updateTodo(todo.id, { group: 'today' });
      migratedCount++;
    }

    if (migratedCount > 0) {
      message.info(`${migratedCount}个任务已自动迁移`);
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

  const handleDeleteCompleted = async () => {
    const completedIds = completedTodos.map(t => t.id);
    for (const id of completedIds) {
      await deleteTodo(id);
    }
    message.success(`已删除${completedIds.length}个已完成任务`);
    loadTodos();
  };

  const handleDoubleClick = (todo: TodoItem) => {
    setEditingTodo(todo);
    editForm.setFieldsValue({
      title: todo.title,
      description: todo.description || '',
      group: todo.group,
    });
    setEditModalOpen(true);
  };

  const handleCompletedTagDoubleClick = (todo: TodoItem) => {
    setViewingCompletedTodo(todo);
    setCompletedDetailModalOpen(true);
  };

  const handleRestoreToToday = async (todo: TodoItem) => {
    await updateTodo(todo.id, { status: 'pending', group: 'today' });
    message.success('已放回今日待办');
    setCompletedDetailModalOpen(false);
    setViewingCompletedTodo(null);
    loadTodos();
  };

  const handleEditSave = async (values: any) => {
    if (!editingTodo) return;
    await updateTodo(editingTodo.id, {
      title: values.title,
      description: values.description,
      group: values.group,
    });
    message.success('修改成功');
    setEditModalOpen(false);
    setEditingTodo(null);
    editForm.resetFields();
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
      const nextWeekTodos = todos.filter(t => t.group === 'nextWeek' && t.status === 'pending');

      if (completedTodos.length === 0 && nextWeekTodos.length === 0) {
        message.warning('没有已完成的任务和下周计划');
        setReportContent('本周暂无已完成任务，也无下周计划。');
      } else {
        const completedSection = completedTodos.length > 0
          ? completedTodos.map(t => `${t.title}${t.description ? `：${t.description}` : ''}`).join('\n')
          : '无';

        const nextWeekSection = nextWeekTodos.length > 0
          ? nextWeekTodos.map(t => `${t.title}${t.description ? `：${t.description}` : ''}`).join('\n')
          : '无';

        const prompt = `请根据以下任务信息生成周报，严格按照指定格式输出：

本周已完成任务：
${completedSection}

下周计划任务：
${nextWeekSection}

输出格式要求（必须严格遵守）：
一、本周主要工作
    1、任务内容描述
    2、任务内容描述
    ...
二、下周计划工作
    1、计划内容描述
    ...

要求：
1. 直接输出纯文本，不要Markdown格式，不要加粗符号
2. 每项任务单独一行，使用"    1、"这种编号格式（前面4个空格缩进）
3. 任务描述要简明扼要，直接描述做了什么或计划做什么
4. 如果本周无已完成任务，输出"一、本周主要工作\n    无"
5. 如果下周无计划，输出"二、下周计划工作\n    无"
6. 不要添加任何额外内容（如问题/风险等），只输出以上两部分`;

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

  // 按日期分组已完成任务（用于完成历史）
  const groupedCompletedHistory = completedTodos.reduce((acc, todo) => {
    const date = todo.completeTime ? dayjs(todo.completeTime).format('YYYY-MM-DD') : '未知日期';
    if (!acc[date]) acc[date] = [];
    acc[date].push(todo);
    return acc;
  }, {} as Record<string, TodoItem[]>);

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
              cursor: 'pointer',
            }}
            styles={{ body: { padding: 12 } }}
            onDoubleClick={() => handleDoubleClick(item)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div {...provided.dragHandleProps} style={{ cursor: 'grab', color: '#9CA3AF' }}>
                <GripVertical size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.title}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <Button size="small" icon={<Check size={14} />} onClick={(e) => { e.stopPropagation(); handleComplete(item.id); }} title="标记完成" />
                <Button size="small" danger icon={<Trash2 size={14} />} onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} title="删除" />
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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回</Button>
        <h3 style={{ flex: 1, margin: 0 }}>TodoList周报</h3>
        <Button icon={<History size={16} />} onClick={() => setHistoryModalOpen(true)}>完成历史</Button>
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

        {/* 未完成待办 - 在本周已完成上面 */}
        {getGroupTodos('incomplete').length > 0 && (
          <div style={{ marginTop: 16, padding: 12, background: '#FEF3C7', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} color="#D97706" />
                <h4 style={{ margin: 0, color: '#D97706' }}>未完成待办 ({getGroupTodos('incomplete').length})</h4>
              </div>
              <Button
                size="small"
                type="primary"
                onClick={async () => {
                  const incompleteTodos = getGroupTodos('incomplete');
                  for (const todo of incompleteTodos) {
                    await updateTodo(todo.id, { group: 'today' });
                  }
                  message.success(`已将${incompleteTodos.length}个任务移至今日待办`);
                  loadTodos();
                }}
              >
                全部移至今日
              </Button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {getGroupTodos('incomplete').map(item => (
                <Tag
                  key={item.id}
                  color="warning"
                  style={{ margin: 0, cursor: 'pointer' }}
                  onDoubleClick={() => handleDoubleClick(item)}
                >
                  {item.title}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {completedTodos.length > 0 && (
          <div style={{ marginTop: 16, padding: 12, background: '#F0FDF4', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ margin: 0, color: '#16A34A' }}>本周已完成 ({completedTodos.length})</h4>
              <Button size="small" danger icon={<Trash2 size={14} />} onClick={handleDeleteCompleted}>清空已完成</Button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {completedTodos.map(item => (
                <Tag
                  key={item.id}
                  color="green"
                  style={{ margin: 0, cursor: 'pointer' }}
                  onDoubleClick={() => handleCompletedTagDoubleClick(item)}
                >
                  {item.title}
                </Tag>
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

      <Modal title="编辑任务" open={editModalOpen} onCancel={() => { setEditModalOpen(false); setEditingTodo(null); }} onOk={() => editForm.submit()}>
        <Form form={editForm} layout="vertical" onFinish={handleEditSave}>
          <Form.Item name="title" label="任务标题" rules={[{ required: true }]}>
            <Input placeholder="输入任务标题" />
          </Form.Item>
          <Form.Item name="description" label="任务描述">
            <Input.TextArea rows={3} placeholder="输入任务描述（可选）" />
          </Form.Item>
          <Form.Item name="group" label="分组">
            <select style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #D9D9D9' }}>
              <option value="today">今日待办</option>
              <option value="tomorrow">明日待办</option>
              <option value="nextWeek">下周计划</option>
            </select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="已完成任务详情"
        open={completedDetailModalOpen}
        onCancel={() => { setCompletedDetailModalOpen(false); setViewingCompletedTodo(null); }}
        footer={[
          <Button key="close" onClick={() => { setCompletedDetailModalOpen(false); setViewingCompletedTodo(null); }}>关闭</Button>,
          <Button key="restore" type="primary" icon={<RotateCcw size={14} />} onClick={() => viewingCompletedTodo && handleRestoreToToday(viewingCompletedTodo)}>放回今日待办</Button>
        ]}
        width={400}
      >
        {viewingCompletedTodo && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 500, color: '#6B7280' }}>任务标题</label>
              <div style={{ marginTop: 4 }}>{viewingCompletedTodo.title}</div>
            </div>
            {viewingCompletedTodo.description && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 500, color: '#6B7280' }}>任务描述</label>
                <div style={{ marginTop: 4 }}>{viewingCompletedTodo.description}</div>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 500, color: '#6B7280' }}>完成时间</label>
              <div style={{ marginTop: 4 }}>{viewingCompletedTodo.completeTime ? dayjs(viewingCompletedTodo.completeTime).format('YYYY-MM-DD HH:mm') : '未知'}</div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="完成历史"
        open={historyModalOpen}
        onCancel={() => setHistoryModalOpen(false)}
        footer={<Button onClick={() => setHistoryModalOpen(false)}>关闭</Button>}
        width={600}
      >
        <div style={{ maxHeight: 500, overflow: 'auto' }}>
          {Object.entries(groupedCompletedHistory).map(([date, items]) => (
            <div key={date} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, color: '#16A34A', marginBottom: 8, borderBottom: '1px solid #E5E7EB', paddingBottom: 4 }}>
                {date} ({items.length}个任务)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {items.map(item => (
                  <Tag
                    key={item.id}
                    color="green"
                    style={{ margin: 0, cursor: 'pointer' }}
                    onDoubleClick={() => { setHistoryModalOpen(false); handleCompletedTagDoubleClick(item); }}
                  >
                    {item.title}
                  </Tag>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(groupedCompletedHistory).length === 0 && (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>暂无完成历史记录</div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TodoPage;