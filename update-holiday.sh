#!/bin/bash
set -e

echo "===== 开始更新 holiday-cn 节假日子模块 ====="

# 1. 更新子模块到远程最新代码
git submodule update --remote holiday-cn

# 2. 进入子模块拉取main分支最新（兜底加固）
cd holiday-cn
git checkout main
git pull origin main
cd ..

# 3. 检测是否有版本变更，有就提交到主仓库
if git status --porcelain holiday-cn | grep -q .; then
    git add holiday-cn
    git commit -m "chore: 同步 holiday-cn 最新节假日数据"
    echo "✅ 已自动提交子模块新版本到主仓库"
else
    echo "ℹ️ 节假日数据已是最新，无需提交"
fi

echo "===== 更新完成 ====="