# TodoFlow

桌面待办提醒工具，四象限浮窗 + 循环任务 + 团队协作。

## 技术栈

| 端 | 技术 |
|----|------|
| 客户端 | Electron + React + TypeScript + Tailwind CSS |
| 服务端 | Node.js + Express + Socket.io + Prisma |
| 数据库 | PostgreSQL |

## 功能

- 📋 四象限浮窗（马上做/计划做/委派/暂缓）
- 🔄 循环任务（每小时/每天/每周/每月/每季度）
- 👥 团队空间 + 任务分配
- 🔔 服务端推送 + 系统原生通知
- 🚨 智能紧急度升级（截止时间逼近自动提高优先级）
- 📝 子任务拆分与分配

## 快速开始

### 本地开发

**1. 准备环境**

- Node.js >= 18
- PostgreSQL >= 14

**2. 启动服务端**

```bash
cd server
cp .env.example .env   # 编辑 .env 配置数据库连接
npm install
npx prisma migrate dev  # 初始化数据库表
npm run dev             # 启动服务端 http://localhost:3001
```

**3. 启动客户端**

```bash
cd client
npm install
npm run dev            # 浏览器开发模式 http://localhost:5173
npm run electron:dev   # Electron 桌面模式（需要先启动服务端）
```

### 部署到服务器 (Docker)

**一键安装（全新服务器）：**

```bash
git clone <repo-url> && cd todoflow && bash install.sh
```

**手动部署：**

```bash
# 1. 在服务器上克隆项目
git clone <repo-url> && cd todoflow

# 2. 配置环境变量
cp server/.env.production.example server/.env
# 编辑 server/.env，设置 JWT_SECRET 和 DB_PASSWORD

# 3. 启动
docker compose up -d

# 4. 查看日志
docker compose logs -f server
```

服务端启动后，客户端连接地址改为服务器 IP：在 `client/.env` 中设置 `VITE_API_URL=http://<服务器IP>:3001`

## 项目结构

```
todoflow/
├── shared/types.ts        — 前后端共享类型定义
├── server/
│   ├── prisma/schema.prisma
│   └── src/
│       ├── routes/        — REST API 路由
│       ├── services/      — 业务逻辑
│       ├── middleware/     — JWT 认证 + 错误处理
│       └── socket/        — Socket.io 实时通信
├── client/
│   ├── electron/          — Electron 主进程
│   └── src/
│       ├── components/    — React UI 组件
│       ├── hooks/         — React hooks
│       └── api/           — HTTP + Socket.io 客户端
└── docs/superpowers/
    ├── specs/             — 设计文档
    └── plans/             — 实施计划
```

## 设计文档

- [功能设计](docs/superpowers/specs/2026-06-17-todoflow-design.md)
- [实施计划](docs/superpowers/plans/2026-06-17-todoflow-plan.md)
