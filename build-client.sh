#!/bin/bash
set -e
# 在服务器上构建客户端安装包
# bash build-client.sh

cd "$(dirname "$0")/client"
npm install

# 构建前端 (Vite)
npm run build

# 编译 Electron 主进程
npx tsc --outDir dist-electron

# 打包 (当前平台)
npx electron-builder --linux --publish=never

echo ""
echo "✅ 构建完成，安装包在 server/downloads/"
ls -lh ../server/downloads/*.AppImage 2>/dev/null || echo "  (无 AppImage)"
