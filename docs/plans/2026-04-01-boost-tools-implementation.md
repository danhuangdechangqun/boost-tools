# Boost Tools Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a complete Electron desktop application with 15 productivity tools, system tray integration, and AI-powered features.

**Architecture:** Electron main process handles system tray, shortcuts, IPC, and services (LLM, storage, holiday). React frontend with Ant Design UI, grouped navigation, and 15 feature modules.

**Tech Stack:** Electron, React, TypeScript, Ant Design, JSON file storage, holiday-cn submodule

---

## Phase 1: Project Initialization

### Task 1.1: Initialize Electron Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore` (update)

**Step 1: Create package.json with all dependencies**

```json
{
  "name": "boost-tools",
  "version": "1.0.0",
  "description": "效能助推器 - 本地化提效工具集",
  "main": "dist/electron/main.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:electron\"",
    "dev:renderer": "vite",
    "dev:electron": "tsc -p electron/tsconfig.json && electron .",
    "build": "npm run build:renderer && npm run build:electron",
    "build:renderer": "vite build",
    "build:electron": "tsc -p electron/tsconfig.json",
    "start": "electron ."
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "antd": "^5.12.0",
    "@ant-design/icons": "^5.2.0",
    "uuid": "^9.0.0",
    "dayjs": "^1.11.0",
    "react-beautiful-dnd": "^13.1.0",
    "diff-match-patch": "^1.0.0",
    "marked": "^9.0.0",
    "crypto-js": "^4.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/uuid": "^9.0.0",
    "@types/node": "^20.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "electron": "^28.0.0",
    "concurrently": "^8.2.0"
  }
}
```

**Step 2: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "electron"]
}
```

**Step 3: Commit**

```bash
git add package.json tsconfig.json
git commit -m "feat: initialize project with dependencies"
```

---

### Task 1.2: Create Vite Configuration

**Files:**
- Create: `vite.config.ts`

**Step 1: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173
  }
});
```

**Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "feat: add vite configuration"
```

---

### Task 1.3: Create Electron TypeScript Config

**Files:**
- Create: `electron/tsconfig.json`

**Step 1: Create electron/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "../dist/electron",
    "rootDir": "."
  },
  "include": ["**/*"]
}
```

**Step 2: Commit**

```bash
git add electron/tsconfig.json
git commit -m "feat: add electron tsconfig"
```

---

### Task 1.4: Create Data Directory Structure

**Files:**
- Create: `data/config.json`
- Create: `data/todos.json`
- Create: `data/notes.json`
- Create: `data/passwords.json`
- Create: `data/prompts.json`
- Create: `data/weekly-reports.json`

**Step 1: Create all data files with initial structure**

```json
// data/config.json
{
  "llm": { "apiUrl": "", "apiKey": "", "model": "" },
  "shortcut": { "key": "", "enabled": false },
  "weeklyReport": { "enabled": false, "time": "17:00", "format": "markdown" }
}

// data/todos.json
{ "todos": [] }

// data/notes.json
{ "notes": [] }

// data/passwords.json
{ "passwords": [] }

// data/prompts.json
{ "prompts": [] }

// data/weekly-reports.json
{ "reports": [] }
```

**Step 2: Commit**

```bash
git add data/
git commit -m "feat: create data directory with initial files"
```

---

## Phase 2: Electron Main Process

### Task 2.1: Create Main Entry File

**Files:**
- Create: `electron/main.ts`

**Implementation:**

```typescript
import { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain } from 'electron';
import * as path from 'path';
import TrayService from './services/TrayService';
import ShortcutService from './services/ShortcutService';
import StoreService from './services/StoreService';
import IPCBridge from './services/IPCBridge';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const storeService = new StoreService();
const trayService = new TrayService();
const shortcutService = new ShortcutService();
const ipcBridge = new IPCBridge(storeService);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    frame: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow?.hide();
  });

  tray = trayService.create(mainWindow);
  ipcBridge.register();
}

app.whenReady().then(() => {
  createWindow();
  shortcutService.register('Ctrl+Shift+B', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('system:quit', () => {
  globalShortcut.unregisterAll();
  tray?.destroy();
  mainWindow?.destroy();
  app.quit();
});
```

**Step 2: Commit**

```bash
git add electron/main.ts
git commit -m "feat: create electron main entry"
```

---

### Task 2.2: Create Preload Script

**Files:**
- Create: `electron/preload.ts`

**Implementation:**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // System
  getVersion: () => ipcRenderer.invoke('system:getVersion'),
  quit: () => ipcRenderer.send('system:quit'),

  // Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config: any) => ipcRenderer.invoke('config:set', config),

  // Todos
  getTodos: () => ipcRenderer.invoke('todos:getAll'),
  addTodo: (todo: any) => ipcRenderer.invoke('todos:add', todo),
  updateTodo: (id: string, data: any) => ipcRenderer.invoke('todos:update', { id, data }),
  deleteTodo: (id: string) => ipcRenderer.invoke('todos:delete', id),
  migrateTodos: () => ipcRenderer.invoke('todos:migrate'),

  // Notes
  getNotes: () => ipcRenderer.invoke('notes:getAll'),
  addNote: (note: any) => ipcRenderer.invoke('notes:add', note),
  updateNote: (id: string, data: any) => ipcRenderer.invoke('notes:update', { id, data }),
  deleteNote: (id: string) => ipcRenderer.invoke('notes:delete', id),

  // Passwords
  getPasswords: () => ipcRenderer.invoke('passwords:getAll'),
  addPassword: (pwd: any) => ipcRenderer.invoke('passwords:add', pwd),
  updatePassword: (id: string, data: any) => ipcRenderer.invoke('passwords:update', { id, data }),
  deletePassword: (id: string) => ipcRenderer.invoke('passwords:delete', id),

  // Prompts
  getPrompts: () => ipcRenderer.invoke('prompts:getAll'),
  addPrompt: (prompt: any) => ipcRenderer.invoke('prompts:add', prompt),
  updatePrompt: (id: string, data: any) => ipcRenderer.invoke('prompts:update', { id, data }),
  deletePrompt: (id: string) => ipcRenderer.invoke('prompts:delete', id),

  // LLM
  llmCall: (prompt: string, options?: any) => ipcRenderer.invoke('llm:call', { prompt, options }),
  llmTestConnection: () => ipcRenderer.invoke('llm:testConnection'),

  // Holiday
  isHoliday: (date: string) => ipcRenderer.invoke('holiday:isHoliday', date),

  // Shortcut
  registerShortcut: (key: string) => ipcRenderer.invoke('shortcut:register', { key }),

  // Weekly Report
  setWeeklyReport: (enabled: boolean, time: string) => ipcRenderer.invoke('scheduler:setWeeklyReport', { enabled, time })
});
```

**Step 2: Commit**

```bash
git add electron/preload.ts
git commit -m "feat: create preload script with IPC bridge"
```

---

### Task 2.3: Create StoreService

**Files:**
- Create: `electron/services/StoreService.ts`

**Implementation:**

```typescript
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');

export default class StoreService {
  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  read<T>(filename: string): T {
    this.ensureDir();
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return {} as T;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  }

  write<T>(filename: string, data: T): void {
    this.ensureDir();
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  getConfig() { return this.read('config.json'); }
  setConfig(config: any) { this.write('config.json', config); }

  getTodos() { return this.read('todos.json'); }
  setTodos(todos: any) { this.write('todos.json', todos); }

  getNotes() { return this.read('notes.json'); }
  setNotes(notes: any) { this.write('notes.json', notes); }

  getPasswords() { return this.read('passwords.json'); }
  setPasswords(passwords: any) { this.write('passwords.json', passwords); }

  getPrompts() { return this.read('prompts.json'); }
  setPrompts(prompts: any) { this.write('prompts.json', prompts); }

  getWeeklyReports() { return this.read('weekly-reports.json'); }
  setWeeklyReports(reports: any) { this.write('weekly-reports.json', reports); }
}
```

**Step 2: Commit**

```bash
git add electron/services/StoreService.ts
git commit -m "feat: create StoreService for JSON file storage"
```

---

### Task 2.4: Create IPCBridge

**Files:**
- Create: `electron/services/IPCBridge.ts`

**Implementation:**

```typescript
import { ipcMain } from 'electron';
import StoreService from './StoreService';
import LLMService from './LLMService';
import HolidayService from './HolidayService';
import { v4 as uuidv4 } from 'uuid';

export default class IPCBridge {
  private store: StoreService;
  private llm: LLMService | null = null;
  private holiday: HolidayService;

  constructor(store: StoreService) {
    this.store = store;
    this.holiday = new HolidayService();
  }

  register() {
    // System
    ipcMain.handle('system:getVersion', () => ({ version: '1.0.0' }));

    // Config
    ipcMain.handle('config:get', () => this.store.getConfig());
    ipcMain.handle('config:set', (_, config) => {
      this.store.setConfig(config);
      this.llm = new LLMService(config.llm);
      return { success: true };
    });

    // Todos
    ipcMain.handle('todos:getAll', () => this.store.getTodos());
    ipcMain.handle('todos:add', (_, todo) => {
      const data = this.store.getTodos();
      todo.id = uuidv4();
      todo.createTime = new Date().toISOString();
      data.todos.push(todo);
      this.store.setTodos(data);
      return { success: true, id: todo.id };
    });
    ipcMain.handle('todos:update', (_, { id, data: update }) => {
      const data = this.store.getTodos();
      const idx = data.todos.findIndex(t => t.id === id);
      if (idx >= 0) {
        data.todos[idx] = { ...data.todos[idx], ...update };
        if (update.status === 'completed') {
          data.todos[idx].completeTime = new Date().toISOString();
        }
        this.store.setTodos(data);
        return { success: true };
      }
      return { success: false };
    });
    ipcMain.handle('todos:delete', (_, id) => {
      const data = this.store.getTodos();
      data.todos = data.todos.filter(t => t.id !== id);
      this.store.setTodos(data);
      return { success: true };
    });
    ipcMain.handle('todos:migrate', () => {
      const data = this.store.getTodos();
      const today = new Date().toISOString().split('T')[0];
      let count = 0;
      data.todos.forEach(t => {
        if (t.group === 'tomorrow' && t.dueDate === today) {
          t.group = 'today';
          count++;
        }
      });
      this.store.setTodos(data);
      return { success: true, migratedCount: count };
    });

    // Notes
    ipcMain.handle('notes:getAll', () => this.store.getNotes());
    ipcMain.handle('notes:add', (_, note) => {
      const data = this.store.getNotes();
      note.id = uuidv4();
      note.createTime = new Date().toISOString();
      note.updateTime = note.createTime;
      data.notes.push(note);
      this.store.setNotes(data);
      return { success: true, id: note.id };
    });
    ipcMain.handle('notes:update', (_, { id, data: update }) => {
      const data = this.store.getNotes();
      const idx = data.notes.findIndex(n => n.id === id);
      if (idx >= 0) {
        data.notes[idx] = { ...data.notes[idx], ...update, updateTime: new Date().toISOString() };
        this.store.setNotes(data);
        return { success: true };
      }
      return { success: false };
    });
    ipcMain.handle('notes:delete', (_, id) => {
      const data = this.store.getNotes();
      data.notes = data.notes.filter(n => n.id !== id);
      this.store.setNotes(data);
      return { success: true };
    });

    // Passwords
    ipcMain.handle('passwords:getAll', () => this.store.getPasswords());
    ipcMain.handle('passwords:add', (_, pwd) => {
      const data = this.store.getPasswords();
      pwd.id = uuidv4();
      pwd.createTime = new Date().toISOString();
      data.passwords.push(pwd);
      this.store.setPasswords(data);
      return { success: true, id: pwd.id };
    });
    ipcMain.handle('passwords:update', (_, { id, data: update }) => {
      const data = this.store.getPasswords();
      const idx = data.passwords.findIndex(p => p.id === id);
      if (idx >= 0) {
        data.passwords[idx] = { ...data.passwords[idx], ...update };
        this.store.setPasswords(data);
        return { success: true };
      }
      return { success: false };
    });
    ipcMain.handle('passwords:delete', (_, id) => {
      const data = this.store.getPasswords();
      data.passwords = data.passwords.filter(p => p.id !== id);
      this.store.setPasswords(data);
      return { success: true };
    });

    // Prompts
    ipcMain.handle('prompts:getAll', () => this.store.getPrompts());
    ipcMain.handle('prompts:add', (_, prompt) => {
      const data = this.store.getPrompts();
      prompt.id = uuidv4();
      prompt.createTime = new Date().toISOString();
      data.prompts.push(prompt);
      this.store.setPrompts(data);
      return { success: true, id: prompt.id };
    });
    ipcMain.handle('prompts:update', (_, { id, data: update }) => {
      const data = this.store.getPrompts();
      const idx = data.prompts.findIndex(p => p.id === id);
      if (idx >= 0) {
        data.prompts[idx] = { ...data.prompts[idx], ...update };
        this.store.setPrompts(data);
        return { success: true };
      }
      return { success: false };
    });
    ipcMain.handle('prompts:delete', (_, id) => {
      const data = this.store.getPrompts();
      data.prompts = data.prompts.filter(p => p.id !== id);
      this.store.setPrompts(data);
      return { success: true };
    });

    // LLM
    ipcMain.handle('llm:call', async (_, { prompt, options }) => {
      if (!this.llm) {
        const config = this.store.getConfig();
        this.llm = new LLMService(config.llm);
      }
      return await this.llm.call(prompt, options);
    });
    ipcMain.handle('llm:testConnection', async () => {
      if (!this.llm) {
        const config = this.store.getConfig();
        this.llm = new LLMService(config.llm);
      }
      return await this.llm.testConnection();
    });

    // Holiday
    ipcMain.handle('holiday:isHoliday', (_, date) => {
      return this.holiday.isHoliday(date);
    });

    // Shortcut
    ipcMain.handle('shortcut:register', (_, { key }) => {
      return { success: true };
    });

    // Scheduler
    ipcMain.handle('scheduler:setWeeklyReport', (_, { enabled, time }) => {
      const config = this.store.getConfig();
      config.weeklyReport = { enabled, time, format: config.weeklyReport?.format || 'markdown' };
      this.store.setConfig(config);
      return { success: true };
    });
  }
}
```

**Step 2: Commit**

```bash
git add electron/services/IPCBridge.ts
git commit -m "feat: create IPCBridge with all handlers"
```

---

### Task 2.5: Create TrayService

**Files:**
- Create: `electron/services/TrayService.ts`

**Implementation:**

```typescript
import { Tray, Menu, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';

export default class TrayService {
  create(window: BrowserWindow): Tray {
    const iconPath = path.join(__dirname, '../assets/icon.png');
    const icon = nativeImage.createFromPath(iconPath);

    const tray = new Tray(icon);

    const menu = Menu.buildFromTemplate([
      { label: '显示主窗口', click: () => window.show() },
      { label: '设置', click: () => window.show() },
      { type: 'separator' },
      { label: '退出', click: () => {
        window.destroy();
        tray.destroy();
      }}
    ]);

    tray.setContextMenu(menu);
    tray.setToolTip('Boost Tools');
    tray.on('click', () => {
      if (window.isVisible()) {
        window.hide();
      } else {
        window.show();
      }
    });

    return tray;
  }
}
```

**Step 2: Commit**

```bash
git add electron/services/TrayService.ts
git commit -m "feat: create TrayService"
```

---

### Task 2.6: Create ShortcutService

**Files:**
- Create: `electron/services/ShortcutService.ts`

**Implementation:**

```typescript
import { globalShortcut } from 'electron';

export default class ShortcutService {
  register(key: string, callback: () => void): boolean {
    try {
      globalShortcut.register(key, callback);
      return true;
    } catch (e) {
      console.error('Failed to register shortcut:', e);
      return false;
    }
  }

  unregister(key: string): void {
    globalShortcut.unregister(key);
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll();
  }
}
```

**Step 2: Commit**

```bash
git add electron/services/ShortcutService.ts
git commit -m "feat: create ShortcutService"
```

---

### Task 2.7: Create LLMService

**Files:**
- Create: `electron/services/LLMService.ts`

**Implementation:**

```typescript
export default class LLMService {
  private apiUrl: string;
  private apiKey: string;
  private model: string;

  constructor(config: { apiUrl: string; apiKey: string; model: string }) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async call(prompt: string, options?: { maxTokens?: number }): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!this.apiUrl || !this.apiKey || !this.model) {
      return { success: false, error: 'LLM配置不完整' };
    }

    try {
      const response = await fetch(`${this.apiUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens || 4096,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        return { success: false, error: `API错误: ${response.status}` };
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      return { success: true, content };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    return this.call('Hello', { maxTokens: 10 });
  }
}
```

**Step 2: Commit**

```bash
git add electron/services/LLMService.ts
git commit -m "feat: create LLMService with Anthropic API"
```

---

### Task 2.8: Create HolidayService

**Files:**
- Create: `electron/services/HolidayService.ts`

**Implementation:**

```typescript
import * as fs from 'fs';
import * as path from 'path';

export default class HolidayService {
  private holidays: Map<string, string> = new Map();

  constructor() {
    this.loadHolidays();
  }

  private loadHolidays() {
    const holidayDir = path.join(__dirname, '../../holiday-cn');
    if (!fs.existsSync(holidayDir)) return;

    const files = fs.readdirSync(holidayDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = fs.readFileSync(path.join(holidayDir, file), 'utf-8');
        const data = JSON.parse(content);
        if (data.days) {
          for (const day of data.days) {
            if (day.status === 'holiday') {
              this.holidays.set(day.date, day.name || '节假日');
            }
          }
        }
      }
    }
  }

  isHoliday(date: string): { isHoliday: boolean; name?: string } {
    const name = this.holidays.get(date);
    return { isHoliday: !!name, name };
  }

  getNextWorkday(date: string): string {
    const d = new Date(date);
    while (true) {
      d.setDate(d.getDate() + 1);
      const ds = d.toISOString().split('T')[0];
      if (!this.holidays.has(ds) && d.getDay() !== 0 && d.getDay() !== 6) {
        return ds;
      }
    }
  }
}
```

**Step 2: Commit**

```bash
git add electron/services/HolidayService.ts
git commit -m "feat: create HolidayService using holiday-cn"
```

---

## Phase 3: React Frontend Base

### Task 3.1: Create HTML Entry

**Files:**
- Create: `index.html`

**Implementation:**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boost Tools</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: create HTML entry"
```

---

### Task 3.2: Create React Entry

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`

**Implementation:**

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

```typescript
// src/App.tsx
import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './components/Layout/MainLayout';

const theme = {
  token: {
    colorPrimary: '#3B82F6',
    fontFamily: 'Plus Jakarta Sans, sans-serif'
  }
};

const App: React.FC = () => (
  <ConfigProvider theme={theme} locale={zhCN}>
    <MainLayout />
  </ConfigProvider>
);

export default App;
```

**Step 3: Commit**

```bash
git add src/main.tsx src/App.tsx
git commit -m "feat: create React entry and App"
```

---

### Task 3.3: Create Global CSS

**Files:**
- Create: `src/index.css`

**Implementation:**

```css
* {
  font-family: 'Plus Jakarta Sans', sans-serif;
}

body {
  margin: 0;
  padding: 0;
  background: #FFFFFF;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #FFFFFF;
}

::-webkit-scrollbar-thumb {
  background: #E5E7EB;
  border-radius: 3px;
}

.sidebar {
  background: #F9FAFB;
  border-right: 1px solid #E5E7EB;
}

.nav-btn.active {
  background: #EFF6FF;
  border: 2px solid #3B82F6;
}

.feature-card:hover {
  border-color: #3B82F6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.overdue-item {
  background: #FEF3C7 !important;
  border-color: #F59E0B !important;
}

.completed-item {
  background: #D4EDDA !important;
  border-color: #28A745 !important;
}
```

**Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat: create global CSS"
```

---

### Task 3.4: Create MainLayout

**Files:**
- Create: `src/components/Layout/MainLayout.tsx`
- Create: `src/components/Layout/Sidebar.tsx`
- Create: `src/components/Layout/ContentArea.tsx`

**Implementation:**

```typescript
// src/components/Layout/MainLayout.tsx
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ContentArea from './ContentArea';

const MainLayout: React.FC = () => {
  const [currentGroup, setCurrentGroup] = useState('ai');
  const [currentPage, setCurrentPage] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        currentGroup={currentGroup}
        onGroupChange={setCurrentGroup}
        onSettingsClick={() => setCurrentPage('settings')}
      />
      <ContentArea
        currentGroup={currentGroup}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onBack={() => setCurrentPage(null)}
      />
    </div>
  );
};

export default MainLayout;
```

```typescript
// src/components/Layout/Sidebar.tsx
import React from 'react';
import { Bot, Code2, AlignLeft, Wrench, Database, Settings } from 'lucide-react';

interface SidebarProps {
  currentGroup: string;
  onGroupChange: (group: string) => void;
  onSettingsClick: () => void;
}

const groups = [
  { id: 'ai', icon: Bot, name: 'AI' },
  { id: 'expr', icon: Code2, name: '表达式' },
  { id: 'fmt', icon: AlignLeft, name: '格式化' },
  { id: 'tools', icon: Wrench, name: '工具' },
  { id: 'data', icon: Database, name: '数据' }
];

const Sidebar: React.FC<SidebarProps> = ({ currentGroup, onGroupChange, onSettingsClick }) => (
  <nav style={{
    width: 80,
    background: '#F9FAFB',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 0',
    gap: 8,
    borderRight: '1px solid #E5E7EB'
  }}>
    {groups.map(g => (
      <button
        key={g.id}
        onClick={() => onGroupChange(g.id)}
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          cursor: 'pointer',
          background: currentGroup === g.id ? '#EFF6FF' : 'transparent',
          border: `2px solid ${currentGroup === g.id ? '#3B82F6' : 'transparent'}`,
          transition: 'all 150ms ease'
        }}
      >
        <g.icon size={20} color={currentGroup === g.id ? '#3B82F6' : '#6B7280'} />
        <span style={{ fontSize: 12, color: currentGroup === g.id ? '#3B82F6' : '#6B7280', fontWeight: 500 }}>
          {g.name}
        </span>
      </button>
    ))}
    <div style={{ width: 32, height: 1, background: '#E5E7EB', margin: 8 }} />
    <button
      onClick={onSettingsClick}
      style={{
        width: 56,
        height: 56,
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        cursor: 'pointer',
        background: 'transparent',
        border: '2px solid transparent',
        transition: 'all 150ms ease'
      }}
    >
      <Settings size={20} color="#6B7280" />
      <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>设置</span>
    </button>
  </nav>
);

export default Sidebar;
```

```typescript
// src/components/Layout/ContentArea.tsx
import React from 'react';
import GroupView from '../GroupView';
import TodoPage from '../../views/ai/TodoPage';
import SettingsPage from '../../views/settings/SettingsPage';
// ... other pages will be imported

interface ContentAreaProps {
  currentGroup: string;
  currentPage: string | null;
  onPageChange: (page: string) => void;
  onBack: () => void;
}

const ContentArea: React.FC<ContentAreaProps> = ({ currentGroup, currentPage, onPageChange, onBack }) => {
  if (currentPage === 'settings') {
    return <SettingsPage onBack={onBack} />;
  }

  if (currentPage) {
    // Render specific page
    switch (currentPage) {
      case 'todo': return <TodoPage onBack={onBack} />;
      // ... other pages
      default: return <GroupView group={currentGroup} onPageChange={onPageChange} />;
    }
  }

  return <GroupView group={currentGroup} onPageChange={onPageChange} />;
};

export default ContentArea;
```

**Step 2: Commit**

```bash
git add src/components/Layout/
git commit -m "feat: create layout components"
```

---

### Task 3.5: Create GroupView

**Files:**
- Create: `src/components/GroupView.tsx`

**Implementation:**

```typescript
import React from 'react';
import { Card } from 'antd';
import { ListChecks, FileText, Table2, MessageSquare, Calculator, Clock, Regex, FileJson, FileCode, Diff, Fingerprint, Hash, Template, StickyNote, KeyRound } from 'lucide-react';

interface GroupViewProps {
  group: string;
  onPageChange: (page: string) => void;
}

const groupFeatures: Record<string, { id: string; icon: any; name: string; desc: string }[]> = {
  ai: [
    { id: 'todo', icon: ListChecks, name: 'TodoList周报', desc: '待办任务管理 + 自动生成周报' },
    { id: 'file-read', icon: FileText, name: '文件解读', desc: '上传Word/PDF，AI解读重点' },
    { id: 'fake-data', icon: Table2, name: '假数据生成', desc: 'AI生成JSON或表格格式数据' },
    { id: 'prompts', icon: MessageSquare, name: '提示词模板', desc: '自定义提示词模板复用' }
  ],
  expr: [
    { id: 'aviator', icon: Calculator, name: 'Aviator表达式', desc: '可视化拼接Aviator表达式' },
    { id: 'cron', icon: Clock, name: 'Cron表达式', desc: '点点点生成Cron表达式' },
    { id: 'regex', icon: Regex, name: '正则表达式', desc: '17种常用正则预设' }
  ],
  fmt: [
    { id: 'json', icon: FileJson, name: 'JSON美化', desc: '格式化、压缩、校验JSON' },
    { id: 'xml', icon: FileCode, name: 'XML美化', desc: '格式化、压缩、校验XML' },
    { id: 'diff', icon: Diff, name: '文本比较', desc: '逐行对比高亮差异' }
  ],
  tools: [
    { id: 'uuid', icon: Fingerprint, name: 'UUID生成', desc: '批量生成UUID' },
    { id: 'crypto', icon: Hash, name: '加密工具', desc: 'MD5/SHA系列哈希计算' },
    { id: 'template', icon: Template, name: '数据填充模板', desc: 'SQL IN/编号/前缀后缀' }
  ],
  data: [
    { id: 'notes', icon: StickyNote, name: '笔记', desc: '本地笔记管理' },
    { id: 'passwords', icon: KeyRound, name: '账号密码', desc: '账号密码管理' }
  ]
};

const GroupView: React.FC<GroupViewProps> = ({ group, onPageChange }) => {
  const features = groupFeatures[group] || [];

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
        {group === 'ai' ? 'AI辅助' : group === 'expr' ? '表达式生成' : group === 'fmt' ? '格式化' : group === 'tools' ? '工具' : '数据管理'}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: group === 'ai' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 16 }}>
        {features.map(f => (
          <Card
            key={f.id}
            hoverable
            onClick={() => onPageChange(f.id)}
            style={{ borderRadius: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <f.icon size={24} color="#3B82F6" />
              <span style={{ fontWeight: 600 }}>{f.name}</span>
            </div>
            <p style={{ fontSize: 14, color: '#6B7280' }}>{f.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GroupView;
```

**Step 2: Commit**

```bash
git add src/components/GroupView.tsx
git commit -m "feat: create GroupView with all feature cards"
```

---

## Phase 4: Feature Pages (Parallel Development)

### Task 4.1: TodoPage + TodoList

**Files:**
- Create: `src/views/ai/TodoPage/index.tsx`
- Create: `src/views/ai/TodoPage/TodoList.tsx`
- Create: `src/views/ai/TodoPage/TodoItem.tsx`
- Create: `src/views/ai/TodoPage/TodoForm.tsx`
- Create: `src/views/ai/TodoPage/WeeklyReportModal.tsx`

### Task 4.2: SettingsPage

**Files:**
- Create: `src/views/settings/SettingsPage.tsx`
- Create: `src/views/settings/LLMSettings.tsx`
- Create: `src/views/settings/ShortcutSettings.tsx`

### Task 4.3: Expression Pages (Aviator, Cron, Regex)

**Files:**
- Create: `src/views/expression/AviatorPage/index.tsx`
- Create: `src/views/expression/CronPage/index.tsx`
- Create: `src/views/expression/RegexPage/index.tsx`

### Task 4.4: Format Pages (JSON, XML, TextCompare)

**Files:**
- Create: `src/views/format/JsonPage/index.tsx`
- Create: `src/views/format/XmlPage/index.tsx`
- Create: `src/views/format/TextComparePage/index.tsx`

### Task 4.5: Tools Pages (UUID, Crypto, Template)

**Files:**
- Create: `src/views/tools/UuidPage/index.tsx`
- Create: `src/views/tools/CryptoPage/index.tsx`
- Create: `src/views/tools/TemplatePage/index.tsx`

### Task 4.6: Data Pages (Notes, Passwords)

**Files:**
- Create: `src/views/data/NotesPage/index.tsx`
- Create: `src/views/data/PasswordsPage/index.tsx`

---

## Phase 5: Common Components

### Task 5.1: CopyButton

### Task 5.2: LoadingOverlay

### Task 5.3: EmptyState

---

## Phase 6: Final Build and Test

### Task 6.1: Install dependencies and build

### Task 6.2: Create icon and package

---

## Execution Order

1. Phase 1 (Project Init) - Tasks 1.1-1.4 sequential
2. Phase 2 (Electron) - Tasks 2.1-2.8 can run in parallel
3. Phase 3 (React Base) - Tasks 3.1-3.5 sequential
4. Phase 4 (Feature Pages) - All 6 tasks can run in parallel
5. Phase 5 (Common) - Can run with Phase 4
6. Phase 6 (Build) - Final step