// 存储服务 - 支持Neutralino和localStorage双模式

import CryptoJS from 'crypto-js';
import { AppConfig, TodoItem, NoteItem, PasswordItem, PromptItem } from '@/types';

const ENCRYPT_KEY = 'boost-tools-secret-key-2026';

// 检测是否在Neutralino环境中
const isNeutralinoEnv = (): boolean => {
  return typeof window !== 'undefined' && window.Neutralino !== undefined;
};

// 等待Neutralino初始化
const waitForNeutralino = async (): Promise<boolean> => {
  if (!isNeutralinoEnv()) return false;

  return new Promise((resolve) => {
    if (window.Neutralino?.init) {
      window.Neutralino.init();
      window.Neutralino.on('ready', () => resolve(true));
      window.Neutralino.on('error', () => resolve(false));
    } else {
      resolve(false);
    }
  });
};

let neutralinoReady = false;

export const initStorage = async () => {
  neutralinoReady = await waitForNeutralino();
  if (neutralinoReady) {
    console.log('Neutralino storage initialized');
  } else {
    console.log('Using localStorage fallback');
  }
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
    try {
      if (neutralinoReady && window.Neutralino?.storage) {
        const data = await window.Neutralino.storage.getData(key);
        const content = encrypted ? decrypt(data) : data;
        return JSON.parse(content) as T;
      } else {
        // localStorage后备
        const data = localStorage.getItem(key);
        if (!data) return {} as T;
        const content = encrypted ? decrypt(data) : data;
        return JSON.parse(content) as T;
      }
    } catch {
      return {} as T;
    }
  },

  async write<T>(key: string, data: T, encrypted: boolean = false) {
    try {
      const content = JSON.stringify(data);
      const output = encrypted ? encrypt(content) : content;

      if (neutralinoReady && window.Neutralino?.storage) {
        await window.Neutralino.storage.setData(key, output);
      } else {
        localStorage.setItem(key, output);
      }
    } catch (error) {
      console.error('Storage write error:', error);
    }
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