# boost-tools

效能助推器 - 基于 Tauri 的本地化提效工具集

## 环境搭建

### 步骤 1: Node.js 安装

**下载地址:** https://nodejs.org/ (推荐 v18+ LTS 版本)

**配置 npm 镜像源:**
```bash
npm config set registry https://registry.npmmirror.com
```

**验证镜像源:**
```bash
npm config get registry
# 应输出 https://registry.npmmirror.com/
```

**验证安装:**
```bash
node -v      # 应输出 v18.x.x 或更高
npm -v       # 应输出 9.x.x 或更高
```

---

### 步骤 2: VS Build Tools 安装 (Windows 必需)

**下载地址:** https://visualstudio.microsoft.com/visual-cpp-build-tools/

安装时选择以下组件:
- **MSVC v143 - VS 2022 C++ x64/x86 build tools** (最新版)
- **Windows 10 SDK** 或 **Windows 11 SDK** (任选一个最新版)

**验证安装:**

```bash
where cl.exe
# 有输出路径 → 已安装
# 找不到 → 未安装
```

或检查 VC 工具目录:
```bash
dir "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC"
```

---

### 步骤 3: Rust 安装

**配置 Rustup 镜像源 (PowerShell):**
```powershell
$env:RUSTUP_DIST_SERVER = "https://mirrors.tuna.tsinghua.edu.cn/rustup"
$env:RUSTUP_UPDATE_ROOT = "https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup"
```

**下载安装器:**
```
https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe
```

运行 `rustup-init.exe`，选择默认安装即可。

**设置稳定版:**
```bash
rustup default stable
```

**配置 Cargo 镜像源:**

创建或编辑 `%USERPROFILE%\.cargo\config.toml`:
```toml
[source.crates-io]
replace-with = 'rsproxy-sparse'

[source.rsproxy-sparse]
registry = "https://rsproxy.cn/crates.io-index"

[registries.rsproxy]
index = "https://rsproxy.cn/crates.io-index"

[net]
offline = false
```

**验证安装:**
```bash
rustc -v      # 应输出 rustc 1.77.2 或更高
cargo -v      # 应输出 cargo 1.x.x
rustup show   # 应显示 stable-x86_64-pc-windows-msvc
```

---

### 步骤 4: 项目依赖安装

```bash
# 克隆项目
git clone <仓库地址>
cd boost-tools

# 安装前端依赖
npm install
```

---

### 步骤 5: 启动开发环境

```bash
npm run tauri:dev
```

首次启动会编译 Rust 后端，可能需要几分钟。后续编译会使用缓存，速度更快。

---

## 环境验证清单

| 检查项 | 命令 | 预期结果 |
|--------|------|---------|
| Node.js | `node -v` | v18.x.x+ |
| npm | `npm -v` | 9.x.x+ |
| npm 镜像源 | `npm config get registry` | npmmirror.com |
| VS Build Tools | `where cl.exe` | 有输出路径 |
| Rust | `rustc -v` | 1.77.2+ |
| Cargo | `cargo -v` | 正常输出 |
| MSVC 工具链 | `rustup show` | stable-x86_64-pc-windows-msvc |

---

## 常见问题

### Rust 编译报错: linker 'link.exe' not found

**原因:** VS Build Tools 未正确安装 MSVC 组件

**解决:** 重新安装 VS Build Tools，确保勾选 "MSVC C++ build tools"

### npm install 速度慢

**解决:** 已配置镜像源，若未配置:
```bash
npm config set registry https://registry.npmmirror.com
```

### cargo build 速度慢

**解决:** 已配置镜像源，若未配置见步骤 3 中 `.cargo/config.toml` 配置