#!/bin/bash
set -e

cd "$(dirname "$0")"

# 安装 Node.js（如未安装）
if ! command -v node &>/dev/null; then
  echo "📥 安装 Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "📦 构建 TodoFlow 客户端..."
cd client
npm install --no-audit --no-fund
npm run build

# 编译 Electron 主进程
npx tsc --outDir dist-electron

# 打包 Linux AppImage
npx electron-builder --linux --publish=never

echo ""
echo "✅ 构建完成"
ls -lh ../server/downloads/*.AppImage 2>/dev/null || echo "  (无 AppImage 文件)"
