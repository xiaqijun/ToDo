#!/bin/bash
set -e

# TodoFlow 一键部署
# 用法: bash install.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}📋 TodoFlow 一键部署${NC}"

# 安装 Docker
if ! command -v docker &>/dev/null; then
  echo -e "${YELLOW}安装 Docker...${NC}"
  curl -fsSL https://get.docker.com | bash
fi

# 生成密钥
export JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
export DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(16))")
export PORT=3001
export CLIENT_URL="http://localhost:5173"

# 构建并启动
docker compose up -d --build

IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")
echo ""
echo -e "${GREEN}✅ 部署完成${NC}"
echo -e "  服务: ${YELLOW}http://$IP:3001${NC}"
echo -e "  下载: ${YELLOW}http://$IP:3001/download${NC}"
