// 类型定义文件

export interface AppConfig {
  llm: {
    apiUrl: string;
    apiKey: string;
    model: string;
    format: 'openai';
  };
  embedding: {
    apiKey: string;
    model: string;
  };
  shortcut: {
    key: string;
    enabled: boolean;
  };
  weeklyReport: {
    enabled: boolean;
    time: string;
    format: 'text' | 'markdown';
  };
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  group: 'today' | 'tomorrow' | 'nextWeek' | 'overdue' | 'incomplete' | 'completed';
  status: 'pending' | 'completed';
  dueDate?: string;
  createTime: string;
  completeTime?: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  mode?: 'text' | 'markdown';
  category?: string;
  createTime: string;
  updateTime: string;
}

export interface PasswordItem {
  id: string;
  name: string;
  username?: string;
  password: string;
  url?: string;
  notes?: string;
  createTime: string;
  updateTime: string;
}

export interface PromptItem {
  id: string;
  name: string;
  template: string;
  content?: string;
  category?: string;
  placeholders?: string[];
  createTime: string;
}

export interface LLMResponse {
  success: boolean;
  content?: string;
  error?: string;
}

// Neutralino 类型声明（保留兼容）
declare global {
  interface Window {
    Neutralino?: {
      init: () => void;
      on: (event: string, callback: () => void) => void;
      storage: {
        getData: (key: string) => Promise<string>;
        setData: (key: string, value: string) => Promise<void>;
      };
    };
    // Tauri 类型声明
    __TAURI__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
  }
}