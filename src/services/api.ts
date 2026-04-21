// API入口文件 - 替代原tauri.ts
// 统一导出所有服务和类型

import { v4 as uuidv4 } from 'uuid';
import { TodoItem, NoteItem, PasswordItem, PromptItem, AppConfig, LLMResponse } from '@/types';
import { initStorage as initStorageService, getConfig as storageGetConfig, setConfig as storageSetConfig, getTodos as storageGetTodos, setTodos as storageSetTodos, getNotes as storageGetNotes, setNotes as storageSetNotes, getPasswords as storageGetPasswords, setPasswords as storageSetPasswords, getPrompts as storageGetPrompts, setPrompts as storageSetPrompts } from './storage';
import { callLlm as llmCall, testLlmConnection as llmTestConnection, initLLM as llmInit, updateLLMConfig } from './llm';
import { clearEmbeddingConfigCache } from './embedding';
import { getRecentWeeksWorkdays } from './holiday';

// 类型导出
export type { AppConfig, TodoItem, NoteItem, PasswordItem, PromptItem, LLMResponse } from '@/types';

// 存储服务初始化
export const initStorage = initStorageService;

// LLM服务
export const initLLM = llmInit;

// 配置操作
export const getConfig = storageGetConfig;

export const setConfig = async (config: AppConfig) => {
  await storageSetConfig(config);
  // 更新LLM缓存
  if (config.llm) {
    updateLLMConfig(config.llm);
  }
  // 清除 Embedding 配置缓存
  clearEmbeddingConfigCache();
};

// Todo操作
export const getTodos = storageGetTodos;

export const addTodo = async (todo: Omit<TodoItem, 'id' | 'createTime'>): Promise<{ success: boolean; id?: string }> => {
  try {
    const data = await storageGetTodos();
    const newTodo: TodoItem = {
      ...todo,
      id: uuidv4(),
      createTime: new Date().toISOString()
    };
    data.todos = data.todos || [];
    data.todos.push(newTodo);
    await storageSetTodos(data);
    return { success: true, id: newTodo.id };
  } catch {
    return { success: false };
  }
};

export const updateTodo = async (id: string, updates: Partial<TodoItem>): Promise<{ success: boolean }> => {
  try {
    const data = await storageGetTodos();
    const idx = (data.todos || []).findIndex(t => t.id === id);
    if (idx >= 0) {
      data.todos[idx] = { ...data.todos[idx], ...updates };
      if (updates.status === 'completed') {
        data.todos[idx].completeTime = new Date().toISOString();
      }
      await storageSetTodos(data);
      return { success: true };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
};

export const deleteTodo = async (id: string): Promise<{ success: boolean }> => {
  try {
    const data = await storageGetTodos();
    data.todos = (data.todos || []).filter(t => t.id !== id);
    await storageSetTodos(data);
    return { success: true };
  } catch {
    return { success: false };
  }
};

// 清理指定周的已完成任务
export const clearCompletedByWeek = async (weekStart: string): Promise<{ success: boolean; count: number }> => {
  try {
    const weeks = getRecentWeeksWorkdays(8);

    // 使用 label 匹配（label 格式为 "2026-04-20 周"）
    // 兼容两种格式：纯日期 "2026-04-20" 或带周 "2026-04-20 周"
    const week = weeks.find(w =>
      w.label === weekStart ||
      w.label.startsWith(weekStart) ||
      w.start === weekStart
    );

    if (!week) {
      console.warn('clearCompletedByWeek: week not found for', weekStart);
      return { success: false, count: 0 };
    }

    const data = await storageGetTodos();
    const originalLength = (data.todos || []).length;

    data.todos = (data.todos || []).filter(t => {
      if (t.status !== 'completed' || !t.completeTime) return true;
      const completeDate = t.completeTime.split('T')[0];
      return completeDate < week.start || completeDate > week.end;
    });

    const count = originalLength - data.todos.length;
    await storageSetTodos(data);
    return { success: true, count };
  } catch (error) {
    console.error('clearCompletedByWeek failed:', error);
    return { success: false, count: 0 };
  }
};

// 清理本月的已完成任务
export const clearCompletedByMonth = async (): Promise<{ success: boolean; count: number }> => {
  try {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

    const data = await storageGetTodos();
    const originalLength = (data.todos || []).length;

    data.todos = (data.todos || []).filter(t => {
      if (t.status !== 'completed' || !t.completeTime) return true;
      const completeDate = t.completeTime.split('T')[0];
      return completeDate < monthStart || completeDate > monthEnd;
    });

    const count = originalLength - data.todos.length;
    await storageSetTodos(data);
    return { success: true, count };
  } catch {
    return { success: false, count: 0 };
  }
};

// 清理全部已完成任务
export const clearAllCompleted = async (): Promise<{ success: boolean; count: number }> => {
  try {
    const data = await storageGetTodos();
    const originalLength = (data.todos || []).length;

    data.todos = (data.todos || []).filter(t => t.status !== 'completed');

    const count = originalLength - data.todos.length;
    await storageSetTodos(data);
    return { success: true, count };
  } catch {
    return { success: false, count: 0 };
  }
};

// Note操作
export const getNotes = storageGetNotes;

export const addNote = async (note: Omit<NoteItem, 'id' | 'createTime' | 'updateTime'>): Promise<{ success: boolean; id?: string }> => {
  try {
    const data = await storageGetNotes();
    const now = new Date().toISOString();
    const newNote: NoteItem = {
      ...note,
      id: uuidv4(),
      createTime: now,
      updateTime: now
    };
    data.notes = data.notes || [];
    data.notes.push(newNote);
    await storageSetNotes(data);
    return { success: true, id: newNote.id };
  } catch {
    return { success: false };
  }
};

export const updateNote = async (id: string, updates: Partial<NoteItem>): Promise<{ success: boolean }> => {
  try {
    const data = await storageGetNotes();
    const idx = (data.notes || []).findIndex(n => n.id === id);
    if (idx >= 0) {
      data.notes[idx] = { ...data.notes[idx], ...updates, updateTime: new Date().toISOString() };
      await storageSetNotes(data);
      return { success: true };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
};

export const deleteNote = async (id: string): Promise<{ success: boolean }> => {
  try {
    const data = await storageGetNotes();
    data.notes = (data.notes || []).filter(n => n.id !== id);
    await storageSetNotes(data);
    return { success: true };
  } catch {
    return { success: false };
  }
};

// Password操作
export const getPasswords = storageGetPasswords;

export const addPassword = async (pwd: Omit<PasswordItem, 'id' | 'createTime' | 'updateTime'>): Promise<{ success: boolean; id?: string }> => {
  try {
    const data = await storageGetPasswords();
    const now = new Date().toISOString();
    const newPwd: PasswordItem = {
      ...pwd,
      id: uuidv4(),
      createTime: now,
      updateTime: now
    };
    data.passwords = data.passwords || [];
    data.passwords.push(newPwd);
    await storageSetPasswords(data);
    return { success: true, id: newPwd.id };
  } catch {
    return { success: false };
  }
};

export const updatePassword = async (id: string, updates: Partial<PasswordItem>): Promise<{ success: boolean }> => {
  try {
    const data = await storageGetPasswords();
    const idx = (data.passwords || []).findIndex(p => p.id === id);
    if (idx >= 0) {
      data.passwords[idx] = { ...data.passwords[idx], ...updates, updateTime: new Date().toISOString() };
      await storageSetPasswords(data);
      return { success: true };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
};

export const deletePassword = async (id: string): Promise<{ success: boolean }> => {
  try {
    const data = await storageGetPasswords();
    data.passwords = (data.passwords || []).filter(p => p.id !== id);
    await storageSetPasswords(data);
    return { success: true };
  } catch {
    return { success: false };
  }
};

// Prompt操作
export const getPrompts = storageGetPrompts;

export const addPrompt = async (prompt: Omit<PromptItem, 'id' | 'createTime'>): Promise<{ success: boolean; id?: string }> => {
  try {
    const data = await storageGetPrompts();
    const newPrompt: PromptItem = {
      ...prompt,
      id: uuidv4(),
      createTime: new Date().toISOString()
    };
    data.prompts = data.prompts || [];
    data.prompts.push(newPrompt);
    await storageSetPrompts(data);
    return { success: true, id: newPrompt.id };
  } catch {
    return { success: false };
  }
};

export const updatePrompt = async (id: string, updates: Partial<PromptItem>): Promise<{ success: boolean }> => {
  try {
    const data = await storageGetPrompts();
    const idx = (data.prompts || []).findIndex(p => p.id === id);
    if (idx >= 0) {
      data.prompts[idx] = { ...data.prompts[idx], ...updates };
      await storageSetPrompts(data);
      return { success: true };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
};

export const deletePrompt = async (id: string): Promise<{ success: boolean }> => {
  try {
    const data = await storageGetPrompts();
    data.prompts = (data.prompts || []).filter(p => p.id !== id);
    await storageSetPrompts(data);
    return { success: true };
  } catch {
    return { success: false };
  }
};

// LLM调用
export const callLlm = async (prompt: string, options?: { maxTokens?: number }): Promise<string> => {
  const result = await llmCall(prompt, options);
  if (result.success && result.content) {
    return result.content;
  }
  throw new Error(result.error || 'LLM调用失败');
};

export const testLlmConnection = llmTestConnection;

// Embedding服务
export { getEmbedding, getSingleEmbedding, getBatchEmbeddings } from './embedding';

// 节假日服务
export { initHolidays, isHoliday, isWorkday, getNextWorkday, getFridayOrLastWorkday, shouldGenerateWeeklyReport, getRecentWeeksWorkdays, isInCurrentWeek } from './holiday';