#!/bin/bash
set -e
# TodoFlow 一键部署（服务器 + 客户端构建）
# curl -fsSL https://raw.githubusercontent.com/xiaqijun/ToDo/master/deploy.sh | bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}"
echo "  ╔══════════════════════════╗"
echo "  ║   📋 TodoFlow 一键部署   ║"
echo "  ╚══════════════════════════╝"
echo -e "${NC}"

# --------------------------------------------------
# 1. Docker
# --------------------------------------------------
if ! command -v docker &>/dev/null; then
  echo -e "${YELLOW}[1/4] 安装 Docker...${NC}"
  curl -fsSL https://get.docker.com | bash
else
  echo -e "${GREEN}[1/4] Docker 已安装${NC}"
fi

# --------------------------------------------------
# 2. 清理旧部署
# --------------------------------------------------
echo -e "${YELLOW}[2/4] 清理旧部署...${NC}"
unset DB_PASSWORD JWT_SECRET PORT CLIENT_URL 2>/dev/null || true
docker compose down -v 2>/dev/null || true
docker rm -f todoflow-server-1 todoflow-db-1 2>/dev/null || true
docker volume ls --format '{{.Name}}' | grep -i pgdata | xargs -r docker volume rm 2>/dev/null || true
rm -f .env
echo "  已清除"

# --------------------------------------------------
# 3. 生成配置
# --------------------------------------------------
echo -e "${YELLOW}[3/4] 生成密钥...${NC}"
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets;print(secrets.token_hex(32))")
DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || python3 -c "import secrets;print(secrets.token_hex(16))")
IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")

cat > .env << EOF
JWT_SECRET=$JWT_SECRET
DB_PASSWORD=$DB_PASSWORD
PORT=3001
CLIENT_URL=http://$IP:5173
EOF

echo "  DB_PASSWORD=$DB_PASSWORD"

# --------------------------------------------------
# 4. 启动服务
# --------------------------------------------------
echo -e "${YELLOW}[4/4] 构建并启动...${NC}"
docker compose up -d --build

# --------------------------------------------------
# 5. 构建客户端
# --------------------------------------------------
echo ""
echo -e "${YELLOW}📦 构建客户端安装包...${NC}"

# 安装 Node.js
if ! command -v node &>/dev/null; then
  echo "  安装 Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# 安装 electron-builder Linux 依赖
echo "  → 安装系统依赖..."
apt-get install -y libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils \
  libatspi2.0-0 libsecret-1-0 libasound2t64 2>/dev/null || \
apt-get install -y libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils \
  libatspi2.0-0 libsecret-1-0 libasound2 2>/dev/null || true

cd client

echo "  → npm install..."
npm install --no-audit --no-fund

echo "  → vite build..."
npm run build

echo "  → tsc electron..."
npx tsc --outDir dist-electron

echo "  → electron-builder --linux..."
npx electron-builder --linux --publish=never
BUILD_OK=$?

cd ..

# 检查构建产物
echo ""
echo "  下载目录内容:"
ls -lh server/downloads/ 2>/dev/null || echo "  (目录为空)"

if [ -f server/downloads/*.AppImage ] 2>/dev/null || ls server/downloads/*.AppImage 2>/dev/null; then
  echo -e "  ${GREEN}✅ AppImage 构建成功${NC}"
elif [ $BUILD_OK -ne 0 ]; then
  echo -e "  ${RED}electron-builder 构建失败 (exit $BUILD_OK)${NC}"
fi

# --------------------------------------------------
# 结果
# --------------------------------------------------
echo ""
if docker compose ps 2>/dev/null | grep -q "Up"; then
  echo -e "${GREEN}============================================${NC}"
  echo -e "${GREEN}✅ 部署完成${NC}"
  echo ""
  echo -e "  📡 服务:     ${YELLOW}http://$IP:3001${NC}"
  echo -e "  📥 客户端:   ${YELLOW}http://$IP:3001/download${NC}"
  echo ""
  if ls server/downloads/*.AppImage 2>/dev/null; then
    echo -e "  ${GREEN}✅ 客户端安装包已就绪${NC}"
  else
    echo -e "  ${YELLOW}⚠ 客户端安装包未生成，在服务器上手动运行:${NC}"
    echo -e "     ${YELLOW}cd client && npx electron-builder --linux${NC}"
  fi
  echo ""
  echo -e "  管理: docker compose logs -f | restart | down"
else
  echo -e "${RED}❌ 启动失败${NC}"
  docker compose logs --tail 20
  exit 1
fi
