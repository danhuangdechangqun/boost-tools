// 存储服务 - 使用 Tauri 文件存储

import CryptoJS from 'crypto-js';
import { AppConfig, TodoItem, NoteItem, PasswordItem, PromptItem } from '@/types';

const ENCRYPT_KEY = 'boost-tools-secret-key-2026';

// Tauri invoke 辅助函数
let tauriInvoke: ((cmd: string, args?: Record<string, unknown>) => Promise<any>) | null = null;

const getTauriInvoke = async () => {
  if (!tauriInvoke) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      tauriInvoke = invoke;
    } catch {
      // 非 Tauri 环境，使用 localStorage 后备
      console.log('Using localStorage fallback');
    }
  }
  return tauriInvoke;
};

// 加密函数
export const encrypt = (data: string): string => {
  return CryptoJS.AES.encrypt(data, ENCRYPT_KEY).toString();
};

// 解密函数
export const decrypt = (data: string): string => {
  const bytes = CryptoJS.AES.decrypt(data, ENCRYPT_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// 通用存储方法
export const storage = {
  async read<T>(key: string, encrypted: boolean = false): Promise<T> {
    const invoke = await getTauriInvoke();
    const filename = `${key}.json`;

    try {
      if (invoke) {
        // Tauri 环境：读取文件
        const content = await invoke('read_json_file', { filename });
        if (!content || content === '{}') {
          return {} as T;
        }
        const data = encrypted ? decrypt(content) : content;
        return JSON.parse(data) as T;
      } else {
        // localStorage 后备
        const data = localStorage.getItem(key);
        if (!data) return {} as T;
        const content = encrypted ? decrypt(data) : data;
        return JSON.parse(content) as T;
      }
    } catch (error) {
      console.error('Storage read error:', error);
      return {} as T;
    }
  },

  async write<T>(key: string, data: T, encrypted: boolean = false) {
    const invoke = await getTauriInvoke();
    const filename = `${key}.json`;

    try {
      const content = JSON.stringify(data, null, 2);
      const output = encrypted ? encrypt(content) : content;

      if (invoke) {
        // Tauri 环境：写入文件
        await invoke('write_json_file', { filename, content: output });
      } else {
        // localStorage 后备
        localStorage.setItem(key, output);
      }
    } catch (error) {
      console.error('Storage write error:', error);
    }
  }
};

// 初始化存储（确保目录存在）
export const initStorage = async () => {
  const invoke = await getTauriInvoke();
  if (invoke) {
    console.log('Tauri file storage initialized');
  } else {
    console.log('Using localStorage fallback');
  }
};

// 快捷方法
export const getConfig = () => storage.read<AppConfig>('config');
export const setConfig = (config: AppConfig) => storage.write('config', config);

export const getTodos = () => storage.read<{ todos: TodoItem[] }>('todos');
export const setTodos = (data: { todos: TodoItem[] }) => storage.write('todos', data);

export const getNotes = () => storage.read<{ notes: NoteItem[] }>('notes');
export const setNotes = (data: { notes: NoteItem[] }) => storage.write('notes', data);

export const getPasswords = () => storage.read<{ passwords: PasswordItem[] }>('passwords', true);
export const setPasswords = (data: { passwords: PasswordItem[] }) => storage.write('passwords', data, true);

export const getPrompts = () => storage.read<{ prompts: PromptItem[] }>('prompts');
export const setPrompts = (data: { prompts: PromptItem[] }) => storage.write('prompts', data);