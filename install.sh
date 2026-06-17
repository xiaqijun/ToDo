#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}📋 TodoFlow 一键部署${NC}"

# 安装 Docker
if ! command -v docker &>/dev/null; then
  echo -e "${YELLOW}安装 Docker...${NC}"
  curl -fsSL https://get.docker.com | bash
fi

# 已安装？先清干净
if [ -f .env ] || docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q todoflow 2>/dev/null; then
  echo -e "${YELLOW}检测到已有部署，正在清除...${NC}"
  docker compose down -v 2>/dev/null || true
  docker rm -f todoflow-server-1 todoflow-db-1 2>/dev/null || true
  docker volume rm todoflow_pgdata 2>/dev/null || true
  docker volume ls --format '{{.Name}}' | grep pgdata | xargs -r docker volume rm 2>/dev/null || true
  rm -f .env
  echo -e "${GREEN}已清除旧部署${NC}"
fi

# 生成密钥
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(16))")
IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")

# 写入 .env（供 docker compose 读取）
cat > .env << EOF
JWT_SECRET=$JWT_SECRET
DB_PASSWORD=$DB_PASSWORD
PORT=3001
CLIENT_URL=http://$IP:5173
EOF

echo -e "${YELLOW}DB_PASSWORD=${DB_PASSWORD}${NC}"

# 构建并启动
docker compose up -d --build

# 等待就绪
echo "等待服务启动..."
sleep 5

# 检查状态
if docker compose ps | grep -q "Up"; then
  echo ""
  echo -e "${GREEN}============================================${NC}"
  echo -e "${GREEN}✅ TodoFlow 部署成功${NC}"
  echo ""
  echo -e "  服务地址:  ${YELLOW}http://$IP:3001${NC}"
  echo -e "  下载页面:  ${YELLOW}http://$IP:3001/download${NC}"
  echo ""
  echo -e "  管理命令:"
  echo -e "    docker compose logs -f    查看日志"
  echo -e "    docker compose restart    重启"
  echo -e "    docker compose down -v    完全卸载"
else
  echo ""
  echo -e "${RED}❌ 启动失败，查看日志：${NC}"
  docker compose logs --tail 20
  exit 1
fi
