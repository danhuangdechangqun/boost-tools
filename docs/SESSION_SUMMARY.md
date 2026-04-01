# Boost Tools 会话摘要

> 创建时间：2026-03-31 晚
> 最后更新：2026-04-01
> 下次继续时请让Claude读取此文件，然后调用 `brainstorming` 技能继续设计文档编写

---

## 一、项目概述

**项目名称**：Boost Tools（效能助推器）

**产品形态**：Electron桌面应用，系统托盘常驻，快捷键唤起

**技术栈**：
- 框架：Electron + React + TypeScript
- UI组件：Ant Design
- 数据存储：JSON文件本地存储
- 节假日数据：holiday-cn子模块（已引入）

---

## 二、已完成工作

### 2.1 需求采集与确认 ✅
- 15个功能模块，分为5大分组
- 6个Epic，30个用户故事
- 端口确认：仅桌面端
- 数据存储：本地JSON文件
- 大模型API：Anthropic Messages（原生格式），模型手动输入

### 2.2 PRD文档 ✅
- 文件路径：`D:\AI\boost-tools\prd\prd_v1.0.html`
- 包含：项目信息、名词说明、涉及端口、需求背景与目标、用户与使用场景、Epic概述、用户故事清单（30个Story）、详细方案（部分）、业务流程图、异常与边界处理、回滚方案、未来演进规划

### 2.3 原型设计 ✅ 全部完成
- 文件路径：`D:\AI\boost-tools\prototype\prototype_v1.0.html`
- 使用技能：`ui-ux-pro-max`
- 设计系统：Primary #3B82F6, 字体 Plus Jakarta Sans, 背景 #FFFFFF, 导航 #F9FAFB

**已完成功能原型（15个）：**

| 序号 | 功能模块 | 所属分组 | 优先级 | 状态 |
|------|----------|----------|--------|------|
| 1 | TodoList周报 | AI辅助 | P0 | ✅ 完成 |
| 2 | 文件解读 | AI辅助 | P0 | ✅ 完成 |
| 3 | 假数据生成 | AI辅助 | P1 | ✅ 完成 |
| 4 | 提示词模板 | AI辅助 | P1 | ✅ 完成 |
| 5 | Aviator表达式 | 表达式生成 | P0 | ✅ 完成 |
| 6 | Cron表达式 | 表达式生成 | P0 | ✅ 完成 |
| 7 | 正则表达式 | 表达式生成 | P0 | ✅ 完成 |
| 8 | JSON美化 | 格式化 | P0 | ✅ 完成 |
| 9 | XML美化 | 格式化 | P1 | ✅ 完成 |
| 10 | 文本比较 | 格式化 | P1 | ✅ 完成 |
| 11 | UUID生成 | 工具 | P0 | ✅ 完成 |
| 12 | 加密工具 | 工具 | P0 | ✅ 完成 |
| 13 | 数据填充模板 | 工具 | P0 | ✅ 完成 |
| 14 | 笔记 | 数据管理 | P1 | ✅ 完成 |
| 15 | 账号密码 | 数据管理 | P1 | ✅ 完成 |

### 2.4 设计文档 ✅
- 文件路径：`D:\AI\boost-tools\docs\plans\2026-03-31-boost-tools-design.md`

### 2.5 设计系统 ✅
- 文件路径：`D:\AI\boost-tools\design-system\boost-tools\MASTER.md`
- 配色：Primary #3B82F6（蓝色），背景纯白，左侧导航浅灰
- 字体：Plus Jakarta Sans

---

## 三、下一步工作

### 3.1 PRD待补充
- 详细方案章节需要补充其他功能模块（目前只有TodoList相关的详细方案）
- 原型沙盒切片需要嵌入PRD

### 3.2 未执行步骤
按照 `user-to-story` 技能流程，以下步骤未完成：
- **步骤五**：输出流程图（部分完成，已输出3个流程图）
- **步骤六**：产出最终版PRD（内嵌原型与切片）- 部分完成
- **步骤七**：版本迭代与管理（未开始）
- **步骤八**：HTML完成确认与MD版本生成（未开始）

---

## 四、关键设计决策记录

### 4.1 产品形态
- 系统托盘常驻，快捷键唤起
- 左侧分组导航（卡片形式）
- 纯白色背景，蓝色主色调

### 4.2 TodoList功能细节
- 三栏布局：今日待办、明日待办、下周计划
- 每日0点自动迁移：
  - 昨日"今日待办"未完成 → "未完成待办"区域（黄色背景）
  - "明日待办" → "今日待办"
- 勾选完成 → 移到"本周已完成"（绿色背景）
- 双击查看详情（标题+描述）
- 拖拽调整分组

### 4.3 大模型配置
- API格式：Anthropic Messages（原生）
- 模型：手动输入框，非下拉选择
- API地址、Key：手动填写

### 4.4 占位符语法
- 使用 `{{双花括号}}` 语法

---

## 五、文件结构

```
D:\AI\boost-tools\
├── prd\
│   └── prd_v1.0.html              # PRD文档（HTML）
├── prototype\
│   └── prototype_v1.0.html        # 原型（全部15个功能模块完成）
├── docs\
│   ├── plans\
│   │   └── 2026-03-31-boost-tools-design.md  # 设计文档
│   └── SESSION_SUMMARY.md         # 本摘要文件
├── design-system\
│   └── boost-tools\
│       └── MASTER.md              # 设计系统
├── holiday-cn\                     # 节假日数据子模块
├── aviator.md                      # Aviator表达式参考
└── README.md
```

---

## 六、用户偏好记录

1. 偏好简洁现代风格，纯白背景
2. 不喜欢绿色图标，改用蓝色
3. 模型输入框让用户手动填写，不要下拉选择
4. API格式固定为Anthropic Messages（原生）
5. 占位符使用 `{{双花括号}}` 语法
6. **原型设计使用 `ui-ux-pro-max` 技能**
7. **样式参考已完成的 TodoList 周报原型**

---

**2026-04-01 更新：所有15个功能模块原型设计已完成，PRD文档已完成iframe原型沙盒切片嵌入，下一步可进入开发阶段。**

---

## 七、原型嵌入PRD完成情况（2026-04-01）

已完成所有15个功能模块的iframe原型沙盒切片嵌入PRD文档：

| 序号 | 功能模块 | 页面ID | 嵌入状态 |
|------|----------|--------|----------|
| 1 | 设置页面 | settings | ✅ 已嵌入 |
| 2 | TodoList周报 | todo | ✅ 已嵌入 |
| 3 | 文件解读 | file-read | ✅ 已嵌入 |
| 4 | 假数据生成 | fake-data | ✅ 已嵌入 |
| 5 | 提示词模板 | prompts | ✅ 已嵌入 |
| 6 | Aviator表达式 | aviator | ✅ 已嵌入 |
| 7 | Cron表达式 | cron | ✅ 已嵌入 |
| 8 | 正则表达式 | regex | ✅ 已嵌入 |
| 9 | JSON美化 | json | ✅ 已嵌入 |
| 10 | UUID生成 | uuid | ✅ 已嵌入 |
| 11 | 加密工具 | crypto | ✅ 已嵌入 |
| 12 | 笔记 | notes | ✅ 已嵌入 |
| 13 | 账号密码 | passwords | ✅ 已嵌入 |

**嵌入格式示例：**
```html
<iframe class="prototype-sandbox" src="../prototype/prototype_v1.0.html?sandbox=true&focus=[page-id]" sandbox="allow-scripts allow-same-origin"></iframe>
```

---

## 八、原型设计待优化项（2026-04-01反馈）

| 序号 | 功能模块 | 问题描述 | 优化方案 |
|------|----------|----------|----------|
| 1 | 假数据生成 | 表格格式输出为Markdown格式，粘贴到Excel后变为三行一列而非两列两行 | 改为输出真正的TSV/制表符分隔格式，或提供Excel直接复制功能 |
| 2 | 所有功能页面 | 左侧分组导航选中后视觉高亮不够明显 | 增加选中状态的背景色、边框、图标颜色变化的视觉强化 |
| 3 | 笔记 | 缺少删除笔记、查看详情、编辑修改功能 | 添加删除按钮、双击查看详情弹窗、编辑保存功能 |
| 4 | 账号密码 | 密码虽隐藏但无法查看明文 | 添加眼睛图标，点击切换密码显示/隐藏 |

---

## 九、2026-04-01 设计文档编写进度（Brainstorming）

### 9.1 已确认的设计决策

| 决策项 | 决策内容 |
|--------|----------|
| 设计定位 | 在现有设计文档基础上补充优化 |
| 重点内容 | 组件设计、服务架构、数据存储、API设计 |
| 技术栈 | 保持现有选型（Electron + React + TypeScript + Ant Design） |
| 文档组织 | 方案三：混合架构设计（全局架构 + 功能模块设计） |
| 开机自启 | 不需要开机自启动功能 |

### 9.2 已完成的设计展示

#### ✅ 服务架构设计（已确认）
- **主进程服务模块**：
  - TrayService.js（系统托盘）
  - ShortcutService.js（快捷键）
  - StoreService.js（JSON存储）
  - LLMService.js（大模型调用）
  - HolidayService.js（节假日判断）
  - SchedulerService.js（定时任务）
  - FileService.js（文件处理）
  - IPCBridge.js（IPC通信管理）

- **渲染进程服务模块**：
  - ipcClient.ts（IPC客户端封装）
  - clipboardService.ts（剪贴板）
  - storageService.ts（前端存储）

#### ✅ IPC接口设计（已确认）
- IPC通道定义（system、config、todos、file、prompts、notes、passwords、holiday、shortcut、scheduler）
- 请求/响应格式规范（IPCResponse<T>）
- 主进程与渲染进程通信机制已解释

#### ✅ 数据存储设计（已确认）
- 存储文件：config.json、todos.json、notes.json、passwords.json、prompts.json、weekly-reports.json
- 详细数据结构定义：
  - AppConfig（全局配置）
  - TodoData/TodoItem（TodoList）
  - NotesData/NoteItem（笔记）
  - PasswordsData/PasswordItem（账号密码）
  - PromptsData/PromptItem（提示词模板）
  - WeeklyReportsData/WeeklyReportItem（周报记录）

### 9.3 设计文档完成情况

| 序号 | 设计章节 | 状态 |
|------|----------|------|
| 1 | 服务架构设计 | ✅ 已完成 |
| 2 | IPC接口设计 | ✅ 已完成 |
| 3 | 数据存储设计 | ✅ 已完成 |
| 4 | API设计（LLM调用） | ✅ 已完成 |
| 5 | React组件设计 | ✅ 已完成 |
| 6 | 编写设计文档 | ✅ 已完成 |

**设计文档路径**：`D:\code\AI\boost-tools\docs\plans\2026-03-31-boost-tools-design.md`

---

## 十、2026-04-01 开发进度（代码已生成）

### 10.1 已完成的代码文件

**Electron主进程：**
- `electron/main.ts` - 主入口，托盘，IPC注册
- `electron/preload.ts` - 预加载脚本
- `electron/tsconfig.json` - TS配置
- `electron/services/StoreService.ts` - JSON存储
- `electron/services/LLMService.ts` - 大模型调用
- `electron/services/HolidayService.ts` - 节假日判断

**React前端：**
- `src/main.tsx` - 入口
- `src/App.tsx` - 应用主组件
- `src/index.css` - 全局样式
- `src/components/Layout/` - 布局组件
- `src/components/GroupView.tsx` - 分组视图
- `src/views/ai/` - AI辅助页面（4个）
- `src/views/expression/` - 表达式页面（3个）
- `src/views/format/` - 格式化页面（3个）
- `src/views/tools/` - 工具页面（3个）
- `src/views/data/` - 数据管理页面（2个）
- `src/views/settings/SettingsPage.tsx` - 设置页面

**配置文件：**
- `package.json` - 依赖配置
- `tsconfig.json` - TypeScript配置
- `vite.config.ts` - Vite配置
- `index.html` - HTML入口
- `data/*.json` - 数据文件

### 10.2 下一步操作

重启电脑后执行：

```powershell
cd D:\code\AI\boost-tools

# 如果electron还有问题，重新安装
Remove-Item -Recurse -Force node_modules\electron
npm install electron

# 启动开发
npm run dev:renderer   # 终端1：Vite开发服务器
npm run build:electron # 终端2：编译Electron
npm run start          # 终端2：启动应用
```

---

**下次继续时，告诉Claude：**
> "正在从 Electron 迁移到 Tauri。请继续写 Tauri 迁移设计文档。"

---

## 十一、2026-04-01 技术栈重大变更：Electron → Tauri

### 11.1 变更决策

| 决策项 | 原方案（Electron） | 新方案（Tauri） |
|--------|-------------------|-----------------|
| 框架 | Electron 28 | Tauri 2.x（最新稳定版） |
| 后端语言 | Node.js (TypeScript) | Rust |
| 打包体积 | ~150-200MB | ~10-15MB |
| 渲染引擎 | 自带 Chromium | 系统 WebView2（Windows自带） |
| 托盘/快捷键 | Electron内置 | Tauri插件（tauri-plugin-tray等） |

### 11.2 变更原因

1. **用户需求**：轻量化桌面客户端，像 cc-switch 一样
2. **目标平台**：仅 Windows，WebView2 自带无需额外安装
3. **使用场景**：自用为主，打包体积可以接受迁移成本

### 11.3 迁移范围

需要迁移到 Rust 的后端模块：
- 系统托盘（Tray）
- 全局快捷键（Shortcut）
- IPC通信（Tauri Command）
- JSON存储（todos/notes/passwords/prompts/config）
- LLM API调用（HTTP请求）
- 节假日判断（读取 holiday-cn 数据）

前端保留：
- React + Vite + TypeScript 不变
- Ant Design 不变
- 只需调整 IPC 调用方式（从 `window.electronAPI` 改为 Tauri invoke）

### 11.4 Rust 环境安装进度

**已完成：**
- ✅ 设置镜像源（USTC镜像）
- ✅ 执行 `winget install Rustlang.Rustup`
- ⏳ 环境变量尚未生效（需重启终端验证）

**Cargo镜像配置待完成：**
创建 `C:\Users\Administrator\.cargo\config.toml`：
```toml
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "sparse+https://mirrors.ustc.edu.cn/crates.io-index/"
```

### 11.5 用户技术背景

- Rust经验：**完全新手**，无开发经验
- 需要在设计文档中包含 Rust 基础教程和代码模板

### 11.6 下一步

1. 重启终端验证 Rust 安装（`rustc --version`）
2. 配置 Cargo 镜像
3. 编写 Tauri 迁移设计文档（包含 Rust 新手教程）
4. 初始化 Tauri 项目
5. 迁移后端逻辑
6. 调整前端 IPC
7. 打包测试