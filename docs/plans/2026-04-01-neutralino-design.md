# Boost Tools - Neutralino.js 技术设计文档

> **创建日期**: 2026-04-01
> **目的**: 基于 PRD v1.0，使用 Neutralino.js 替代 Electron 实现轻量化桌面应用

---

## 一、技术选型对比

| 方案 | 包体积 | 环境复杂度 | 开发语言 | 最终选择 |
|------|--------|-----------|----------|---------|
| Electron | ~150MB | 简单 | JS/TS | ❌ 包体过大 |
| Tauri | ~10MB | Rust门槛高 | Rust+TS | ❌ 环境复杂 |
| **Neutralino.js** | **~5MB** | **简单** | **JS/TS** | **✅ 最终选择** |

**选择理由**：
- 包体最小，用户体验好
- 只需 Node.js 环境，无需 Rust/Golang
- 可直接复用现有 React 代码
- 支持系统托盘、快捷键、文件操作等所有必需功能

---

## 二、项目架构

### 2.1 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Neutralino.js v4.x | 跨平台桌面应用框架 |
| 前端框架 | React 18 + TypeScript | 复用现有代码 |
| UI组件库 | Ant Design 5.x | 企业级UI组件 |
| 图标库 | Lucide React | 轻量图标库 |
| 数据存储 | JSON文件 + Neutralino文件API | 本地持久化 |
| LLM集成 | 前端直接调用API | 无需后端代理 |

### 2.2 目录结构

```
boost-tools/
├── src/                      # React 前端代码
│   ├── components/           # 公共组件
│   │   ├── Layout/           # 布局组件
│   │   └── common/           # 通用组件（CopyButton等）
│   ├── views/                # 功能页面
│   │   ├── ai/               # AI辅助模块
│   │   ├── expression/       # 表达式生成模块
│   │   ├── format/           # 格式化模块
│   │   ├── tools/            # 工具模块
│   │   ├── data/             # 数据管理模块
│   │   └── settings/         # 设置页面
│   ├── hooks/                # 自定义Hooks
│   ├── utils/                # 工具函数
│   ├── services/             # 服务层（LLM、存储）
│   ├── types/                # TypeScript类型定义
│   ├── App.tsx               # 应用入口
│   └── main.tsx              # React入口
│   └── index.css             # 全局样式
│
├── neutralino/               # Neutralino 配置
│   └── main.js               # 主进程入口（可选扩展）
│
├── data/                     # 本地数据存储
│   ├── config.json           # 全局配置（LLM、周报设置）
│   ├── todos.json            # 待办任务数据
│   ├── notes.json            # 笔记数据
│   ├── passwords.json        # 密码数据（加密）
│   ├── prompts.json          # 提示词模板数据
│   └── weekly-reports.json   # 周报历史
│
├── resources/                # 应用资源
│   └── icons/                # 应用图标
│       ├── icon.png          # 应用图标
│       ├── tray.png          # 托盘图标
│       └── window-icon.png   # 窗口图标
│
├── index.html                # HTML入口
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript配置
├── vite.config.ts            # Vite构建配置
├── neutralino.config.json    # Neutralino应用配置
│
├── prd/                      # 产品文档
│   └ prd_v1.0.html           # PRD文档
│
├── prototype/                # 原型图
│   └ prototype_v1.0.html     # 原型HTML
│
└── docs/                     # 其他文档
    └── plans/                # 设计文档
```

---

## 三、Neutralino 核心配置

### 3.1 neutralino.config.json

```json
{
  "$schema": "https://raw.githubusercontent.com/neutralinojs/neutralinojs/main/schemas/neutralino.config.schema.json",
  "applicationId": "boost-tools",
  "version": "1.0.0",
  "defaultMode": "window",
  "port": 0,
  "documentRoot": "/dist/",
  "url": "/",
  "enableServer": true,
  "enableNativeAPI": true,
  "tokenSecurity": "one-time",
  "logging": {
    "enabled": true,
    " writeToLogFile": false
  },
  "nativeAllowList": [
    "app.*",
    "os.*",
    "debug.*",
    "filesystem.*",
    "storage.*",
    "computer.*",
    "window.*",
    "events.*",
    "clipboard.*",
    "tray.*",
    "hotkeys.*",
    "updater.*"
  ],
  "globalVariables": {
    "APP_NAME": "Boost Tools"
  },
  "modes": {
    "window": {
      "title": "Boost Tools - 效能助推器",
      "width": 900,
      "height": 650,
      "minWidth": 700,
      "minHeight": 500,
      "fullScreen": false,
      "alwaysOnTop": false,
      "icon": "/resources/icons/window-icon.png",
      "enableInspector": false,
      "borderless": false,
      "maximize": false,
      "hidden": false,
      "resizable": true,
      "exitProcessOnClose": true
    }
  },
  "tray": {
    "enabled": true,
    "icon": "/resources/icons/tray.png",
    "menuItems": [
      { "id": "show", "text": "显示窗口" },
      { "id": "settings", "text": "设置" },
      { "id": "quit", "text": "退出" }
    ]
  },
  "cli": {
    "binaryName": "boost-tools",
    "frontendLibrary": "React",
    "projectVersion": "1.0.0"
  }
}
```

### 3.2 package.json

```json
{
  "name": "boost-tools",
  "version": "1.0.0",
  "description": "效能助推器 - 本地化提效工具集（Neutralino.js桌面版）",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "neu:dev": "neu run",
    "neu:build": "neu build --release",
    "neu:update": "neu update"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "antd": "^5.12.0",
    "@ant-design/icons": "^5.2.0",
    "lucide-react": "^0.300.0",
    "uuid": "^9.0.0",
    "dayjs": "^1.11.0",
    "react-beautiful-dnd": "^13.1.0",
    "diff-match-patch": "^1.0.0",
    "marked": "^9.0.0",
    "crypto-js": "^4.2.0",
    "pdfjs-dist": "^3.11.0",
    "mammoth": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/uuid": "^9.0.0",
    "@types/node": "^20.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "@neutralinojs/neu": "^4.15.0"
  }
}
```

---

## 四、核心功能实现方案

### 4.1 系统托盘（BT-026）

```typescript
// src/services/TrayService.ts
import * as Neutralino from '@neutralinojs/lib';

export class TrayService {
  async init() {
    // 点击托盘图标显示/隐藏窗口
    Neutralino.on('trayMenuItemClicked', (event) => {
      switch (event.detail.id) {
        case 'show':
          Neutralino.window.show();
          break;
        case 'settings':
          Neutralino.window.show();
          // 导航到设置页面
          break;
        case 'quit':
          Neutralino.app.exit();
          break;
      }
    });

    // 单击托盘图标切换窗口
    Neutralino.on('trayIconClicked', () => {
      Neutralino.window.isVisible().then((visible) => {
        if (visible) {
          Neutralino.window.hide();
        } else {
          Neutralino.window.show();
        }
      });
    });
  }
}
```

### 4.2 快捷键唤起（BT-027）

```typescript
// src/services/ShortcutService.ts
import * as Neutralino from '@neutralinojs/lib';

export class ShortcutService {
  private currentShortcut: string = 'Ctrl+Shift+B';

  async register(key: string): Promise<boolean> {
    try {
      await Neutralino.hotkeys.register(key, () => {
        Neutralino.window.isVisible().then((visible) => {
          if (visible) {
            Neutralino.window.hide();
          } else {
            Neutralino.window.show();
            Neutralino.window.focus();
          }
        });
      });
      this.currentShortcut = key;
      return true;
    } catch (error) {
      console.error('快捷键注册失败:', error);
      return false;
    }
  }

  async unregister() {
    await Neutralino.hotkeys.unregister(this.currentShortcut);
  }
}
```

### 4.3 JSON文件存储

```typescript
// src/services/StorageService.ts
import * as Neutralino from '@neutralinojs/lib';
import { encrypt, decrypt } from './CryptoService';

const DATA_DIR = NL_PATH + '/data';

export class StorageService {
  private async ensureDataDir() {
    try {
      await Neutralino.filesystem.readDirectory(DATA_DIR);
    } catch {
      await Neutralino.filesystem.createDirectory(DATA_DIR);
    }
  }

  async read<T>(filename: string, encrypted: boolean = false): Promise<T> {
    await this.ensureDataDir();
    const path = `${DATA_DIR}/${filename}`;
    try {
      const content = await Neutralino.filesystem.readFile(path);
      const data = encrypted ? decrypt(content) : content;
      return JSON.parse(data) as T;
    } catch {
      return {} as T;
    }
  }

  async write<T>(filename: string, data: T, encrypted: boolean = false) {
    await this.ensureDataDir();
    const path = `${DATA_DIR}/${filename}`;
    const content = JSON.stringify(data, null, 2);
    const output = encrypted ? encrypt(content) : content;
    await Neutralino.filesystem.writeFile(path, output);
  }

  // 快捷方法
  async getConfig() { return this.read('config.json'); }
  async setConfig(config: any) { return this.write('config.json', config); }
  async getTodos() { return this.read('todos.json'); }
  async setTodos(todos: any) { return this.write('todos.json', todos); }
  async getNotes() { return this.read('notes.json'); }
  async setNotes(notes: any) { return this.write('notes.json', notes); }
  async getPasswords() { return this.read('passwords.json', true); }
  async setPasswords(passwords: any) { return this.write('passwords.json', passwords, true); }
  async getPrompts() { return this.read('prompts.json'); }
  async setPrompts(prompts: any) { return this.write('prompts.json', prompts); }
}
```

### 4.4 LLM服务

```typescript
// src/services/LLMService.ts
import { StorageService } from './StorageService';

interface LLMConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  format: 'openai' | 'claude' | 'anthropic';
}

export class LLMService {
  private config: LLMConfig | null = null;
  private storage: StorageService;

  constructor() {
    this.storage = new StorageService();
  }

  async init() {
    const config = await this.storage.getConfig();
    this.config = config?.llm || null;
  }

  async call(prompt: string, options?: { maxTokens?: number }): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!this.config?.apiUrl || !this.config?.apiKey) {
      return { success: false, error: '请先在设置中配置LLM API' };
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      let body: any;
      let endpoint: string;

      switch (this.config.format) {
        case 'claude':
        case 'anthropic':
          headers['x-api-key'] = this.config.apiKey;
          headers['anthropic-version'] = '2023-06-01';
          endpoint = `${this.config.apiUrl}/v1/messages`;
          body = {
            model: this.config.model,
            max_tokens: options?.maxTokens || 4096,
            messages: [{ role: 'user', content: prompt }]
          };
          break;
        case 'openai':
        default:
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
          endpoint = `${this.config.apiUrl}/v1/chat/completions`;
          body = {
            model: this.config.model,
            max_tokens: options?.maxTokens || 4096,
            messages: [{ role: 'user', content: prompt }]
          };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        return { success: false, error: `API错误: ${response.status}` };
      }

      const data = await response.json();
      const content = this.extractContent(data);
      return { success: true, content };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private extractContent(data: any): string {
    if (this.config?.format === 'claude' || this.config?.format === 'anthropic') {
      return data.content?.[0]?.text || '';
    }
    return data.choices?.[0]?.message?.content || '';
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    return this.call('Hello', { maxTokens: 10 });
  }

  async updateConfig(config: LLMConfig) {
    this.config = config;
    const fullConfig = await this.storage.getConfig();
    fullConfig.llm = config;
    await this.storage.setConfig(fullConfig);
  }
}
```

### 4.5 文件解读（BT-007）

**调整说明**: 由于 Neutralino 无法直接读取用户本地文件路径（需要用户选择），改为上传方式。

```typescript
// src/services/FileParserService.ts
import * as pdfjs from 'pdfjs-dist';
import * as mammoth from 'mammoth';

export class FileParserService {
  async parsePDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text;
  }

  async parseWord(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  async parseFile(file: File): Promise<{ text: string; type: string }> {
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return { text: await this.parsePDF(file), type: 'PDF' };
      case 'doc':
      case 'docx':
        return { text: await this.parseWord(file), type: 'Word' };
      default:
        throw new Error('不支持的文件格式');
    }
  }
}
```

---

## 五、数据结构定义

### 5.1 config.json

```typescript
interface AppConfig {
  llm: {
    apiUrl: string;       // API地址
    apiKey: string;       // API密钥
    model: string;        // 模型名称
    format: 'openai' | 'claude' | 'anthropic';  // API格式
  };
  shortcut: {
    key: string;          // 快捷键，如 'Ctrl+Shift+B'
    enabled: boolean;     // 是否启用
  };
  weeklyReport: {
    enabled: boolean;     // 是否自动生成
    time: string;         // 生成时间，如 '17:00'
    format: 'text' | 'markdown';  // 输出格式
  };
}
```

### 5.2 todos.json

```typescript
interface Todo {
  id: string;
  title: string;
  description?: string;
  group: 'today' | 'tomorrow' | 'nextWeek' | 'overdue';
  status: 'pending' | 'completed';
  dueDate?: string;       // YYYY-MM-DD
  createTime: string;     // ISO datetime
  completeTime?: string;  // ISO datetime
}

interface TodosData {
  todos: Todo[];
}
```

### 5.3 notes.json

```typescript
interface Note {
  id: string;
  title: string;
  content: string;
  mode: 'text' | 'markdown';
  createTime: string;
  updateTime: string;
}

interface NotesData {
  notes: Note[];
}
```

### 5.4 passwords.json（加密存储）

```typescript
interface PasswordEntry {
  id: string;
  name: string;           // 账号名称/网站名称
  username?: string;      // 用户名
  password: string;       // 密码
  url?: string;           // 网站地址
  notes?: string;         // 备注
  createTime: string;
  updateTime: string;
}

interface PasswordsData {
  passwords: PasswordEntry[];
}
```

### 5.5 prompts.json

```typescript
interface PromptTemplate {
  id: string;
  name: string;
  template: string;       // 支持 {{占位符}} 语法
  placeholders?: string[]; // 占位符列表
  createTime: string;
}

interface PromptsData {
  prompts: PromptTemplate[];
}
```

---

## 六、功能模块与PRD对照

| PRD Story ID | 功能 | Neutralino实现方式 | 备注 |
|--------------|------|-------------------|------|
| BT-026 | 系统托盘常驻 | Neutralino.tray API | ✅ 完全支持 |
| BT-027 | 快捷键唤起 | Neutralino.hotkeys API | ✅ 完全支持 |
| BT-028 | 主界面分组导航 | React组件 | ✅ 前端实现 |
| BT-029 | 配置LLM API | 前端表单 + StorageService | ✅ 完全支持 |
| BT-030 | 配置周报设置 | 前端表单 + StorageService | ✅ 完全支持 |
| BT-001~006 | Todo周报 | React + StorageService + LLMService | ✅ 完全支持 |
| BT-007 | 文件解读 | 用户上传 + FileParserService + LLMService | ⚠️ 交互调整：改为上传 |
| BT-008 | 假数据生成 | 前端 + LLMService | ✅ 完全支持 |
| BT-009 | 提示词模板 | React + StorageService | ✅ 完全支持 |
| BT-010~014 | 表达式生成 | React前端计算 + LLMService | ✅ 完全支持 |
| BT-015~017 | 格式化工具 | React前端计算 | ✅ 纯前端实现 |
| BT-018~021 | 通用工具 | React前端计算 | ✅ 纯前端实现 |
| BT-022~025 | 数据管理 | React + StorageService | ✅ 完全支持 |

**结论**: 30个用户故事全部可实现，仅BT-007需调整交互方式。

---

## 七、开发计划

### Phase 1: 项目基础（Week 1）

1. 清理残留代码（src-tauri等）
2. 配置 Neutralino.js 项目
3. 实现系统托盘、快捷键
4. 实现主界面布局（分组导航）
5. 实现 StorageService、LLMService

### Phase 2: P0核心功能（Week 2-3）

1. TodoList核心功能（新增、编辑、状态切换）
2. 周报生成功能
3. 表达式生成器（Aviator、Cron、正则）
4. 格式化工具（JSON、UUID、加密）
5. 数据填充模板

### Phase 3: P1重要功能（Week 4）

1. 文件解读功能
2. 假数据生成
3. 提示词模板管理
4. 笔记管理
5. 密码管理
6. XML美化、文本对比

### Phase 4: P2优化功能（Week 5）

1. 搜索功能
2. 拖拽调整Todo分组
3. LLM生成自定义正则
4. 界面优化与打磨

### Phase 5: 打包发布（Week 6）

1. 应用图标设计
2. Neutralino打包配置
3. Windows安装包生成
4. 文档完善



---

## 附录：参考资料

- [Neutralino.js 官方文档](https://neutralino.js.org/docs/)
- [PRD v1.0](../prd/prd_v1.0.html)
- [原型 v1.0](../prototype/prototype_v1.0.html)