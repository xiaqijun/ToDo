#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}"
echo "  ╔══════════════════════════╗"
echo "  ║   📋 TodoFlow 一键部署   ║"
echo "  ╚══════════════════════════╝"
echo -e "${NC}"

# 1. Docker
if ! command -v docker &>/dev/null; then
  echo -e "${YELLOW}[1/3] 安装 Docker...${NC}"
  curl -fsSL https://get.docker.com | bash
else
  echo -e "${GREEN}[1/3] Docker 已安装${NC}"
fi

# 2. 清理旧部署 + 生成密钥
echo -e "${YELLOW}[2/3] 清理并生成配置...${NC}"
unset DB_PASSWORD JWT_SECRET PORT CLIENT_URL 2>/dev/null || true
docker compose down -v 2>/dev/null || true
docker rm -f todoflow-server-1 todoflow-db-1 2>/dev/null || true
docker volume ls --format '{{.Name}}' | grep -i pgdata | xargs -r docker volume rm 2>/dev/null || true
rm -f .env

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

# 3. 拉取镜像并启动
echo -e "${YELLOW}[3/3] 启动服务...${NC}"
docker compose pull 2>/dev/null || docker compose build
docker compose up -d db

# 等数据库就绪
echo "  等待数据库..."
sleep 5

# 用临时容器跑数据库迁移（用完即删）
echo "  执行数据库迁移..."
docker run --rm --network host \
  -e DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@127.0.0.1:5432/todoflow" \
  -v "$(pwd)/server/prisma:/app/prisma" \
  node:20-alpine \
  sh -c "cd /app && npx prisma migrate deploy --schema=prisma/schema.prisma"

# 启动服务端
docker compose up -d server

# 结果
sleep 3
echo ""
if docker compose ps | grep -q "Up"; then
  echo -e "${GREEN}============================================${NC}"
  echo -e "${GREEN}✅ 部署完成${NC}"
  echo ""
  echo -e "  📡 服务:     ${YELLOW}http://$IP:3001${NC}"
  echo -e "  📥 客户端:   ${YELLOW}http://$IP:3001/download${NC}"
  echo ""
  echo -e "  ${YELLOW}💡 客户端安装包由 GitHub Actions 自动构建:${NC}"
  echo -e "     https://github.com/xiaqijun/ToDo/releases"
  echo -e "     下载后放到 server/downloads/ 目录即可在线下载"
  echo ""
  echo -e "  管理: docker compose logs -f | restart | down"
else
  echo -e "${RED}❌ 启动失败${NC}"
  docker compose logs --tail 20
  exit 1
fi
