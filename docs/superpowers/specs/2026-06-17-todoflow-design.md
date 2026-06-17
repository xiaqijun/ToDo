# TodoFlow v1 设计文档

## 概述

TodoFlow 是一个桌面待办提醒工具，采用 Electron 桌面客户端 + Node.js 服务端架构。核心交互为系统托盘浮窗，以四象限视图组织任务，支持循环任务、团队分配和智能紧急度升级。

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面客户端 | Electron + React + Tailwind CSS + shadcn/ui |
| 服务端 | Node.js + Express + Socket.io |
| 数据库 | PostgreSQL |
| 共享 | TypeScript 全栈 |

## 架构

```
┌──────────────────────────────────────────┐
│              Electron Desktop App         │
│  ┌────────────────────────────────────┐  │
│  │     React Frontend (Renderer)       │  │
│  │  四象限浮窗 | 任务表单 | 团队视图   │  │
│  └──────────┬─────────────────────────┘  │
│  ┌──────────┴─────────────────────────┐  │
│  │     Electron Main Process           │  │
│  │  系统托盘 | 原生通知 | 窗口管理      │  │
│  └──────────┬─────────────────────────┘  │
└─────────────┼────────────────────────────┘
              │  HTTP REST + WebSocket
┌─────────────┼────────────────────────────┐
│             │     Node.js Server          │
│  ┌──────────┴──┐ ┌──────┐ ┌───────────┐  │
│  │  REST API   │ │Socket│ │ 提醒调度器 │  │
│  │             │ │ .io  │ │            │  │
│  └──────┬──────┘ └──┬───┘ └─────┬─────┘  │
│         └───────────┴───────────┘         │
│                    │                       │
│              PostgreSQL                    │
└────────────────────────────────────────────┘
```

- Electron 主进程只负责系统托盘、原生通知、窗口生命周期，不参与业务逻辑。
- React 渲染进程通过 HTTP REST 与服务端通信，Socket.io 接收实时推送。
- 服务端是唯一数据源，客户端不持久存储业务状态（纯在线）。

## 核心功能

### v1 功能清单

1. **浮窗式 UI** — 系统托盘图标点击弹出，Esc 或点击外部关闭，支持 Pin 固定
2. **四象限视图** — 按"紧急度 × 重要度"组织任务：马上做 / 计划做 / 委派 / 暂缓
3. **任务 CRUD** — 创建、编辑、完成、删除任务
4. **子任务** — 任务支持拆分子任务，子任务可独立分配给不同成员
5. **循环任务** — 支持每小时、每天、每周、每月、每季度
6. **团队空间** — 创建团队、邀请成员、任务分配
7. **服务端推送** — Socket.io 实时同步任务变更 + 提醒通知
8. **智能紧急度升级** — 截止时间逼近时自动提升任务紧急度
9. **纯在线** — v1 不实现离线支持

## 数据模型

### 用户 (users)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| email | VARCHAR(255) | 邮箱，唯一 |
| password_hash | VARCHAR(255) | 密码哈希 |
| display_name | VARCHAR(100) | 显示名称 |
| avatar_url | TEXT | 头像 URL |
| created_at | TIMESTAMP | 创建时间 |

### 任务 (tasks)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| title | VARCHAR(500) | 标题 |
| description | TEXT | 描述 |
| status | ENUM(pending, done) | 状态 |
| importance | ENUM(high, medium, low) | 重要度 |
| urgency | ENUM(high, medium, low) | 紧急度（手动设置，可被自动升级覆盖） |
| parent_id | UUID nullable | 父任务 ID，顶级为 null |
| start_at | TIMESTAMP | 开始时间（任务从此时间起显示） |
| due_at | TIMESTAMP | 截止时间 |
| remind_at | INTERVAL | 提前多久提醒（如 '15 minutes'） |
| is_recurring | BOOLEAN | 是否循环 |
| recurrence_rule | JSONB | 循环规则（见下文） |
| assignee_id | UUID nullable | 被分配者 ID |
| creator_id | UUID | 创建者 ID |
| team_id | UUID nullable | 所属团队 ID |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 循环规则 (recurrence_rule)
```jsonc
// 每小时 — 工作日 9:00-18:00，每 1 小时一次
{ "type": "hourly", "interval": 1, "start_time": "09:00", "due_time": "18:00", "weekdays_only": true }

// 每天 — 18:00 后显示，23:59 截止
{ "type": "daily", "visible_after": "18:00", "due_time": "23:59" }

// 每周 — 周一上午 12:00 截止
{ "type": "weekly", "days": [1], "due_time": "12:00" }

// 每月 — 每月 1 号
{ "type": "monthly", "day": 1 }

// 每季度 — 季度末前 7 天开始，季度末截止
{ "type": "quarterly", "due": "quarter_end", "start_offset_days": -7 }
```

### 团队 (teams)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(200) | 团队名称 |
| created_by | UUID | 创建者 ID |
| created_at | TIMESTAMP | 创建时间 |

### 团队成员 (team_members)
| 字段 | 类型 | 说明 |
|------|------|------|
| team_id | UUID | 团队 ID |
| user_id | UUID | 用户 ID |
| role | ENUM(owner, admin, member) | 角色 |
| joined_at | TIMESTAMP | 加入时间 |

### 通知 (notifications)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 接收用户 ID |
| task_id | UUID | 关联任务 ID |
| type | ENUM(reminder, assigned, completed) | 通知类型 |
| read_at | TIMESTAMP nullable | 已读时间 |
| created_at | TIMESTAMP | 创建时间 |

## 智能紧急度升级

任务的实际显示象限由"截止时间距离"动态调整：

| 条件 | 效果 |
|------|------|
| 距截止 > 3 天 | 保持原象限 |
| 距截止 ≤ 1 天 | 紧急度自动 +1（Q2→Q1，Q4→Q3） |
| 已超期 | 强制进入 Q1，红色标记"已超期" |

此逻辑在查询任务时由服务端计算，不影响存储的 urgency 值。

## 浮窗 UI 设计

- 尺寸：约 310px 宽，定位在屏幕右上角
- Q1/Q2 默认展开，Q3/Q4 默认折叠
- 每个象限显示任务计数
- 任务项左侧色条区分优先级，支持 checkbox 快速完成
- 循环任务和分配标签以 tag 形式显示

### 表单结构
```
标题       [_______________]

象限        分配给      循环
[🟡计划做]  [自己 ▾]   [每小时 ▾]

开始时间              截止时间
[2026-06-17 09:00]    [2026-06-17 18:00]

间隔 [1] 小时  ✅ 仅工作日    ← 循环参数迷你行

子任务
[取消] [添加]
```

## REST API

### 认证
```
POST   /api/auth/login          — 登录
POST   /api/auth/register       — 注册
```

### 任务
```
GET    /api/tasks               — 任务列表 (?quadrant=q1&team_id=xx)
POST   /api/tasks               — 创建任务
PUT    /api/tasks/:id           — 更新任务
DELETE /api/tasks/:id           — 删除任务
PATCH  /api/tasks/:id/complete  — 完成/取消完成任务
```

### 团队
```
GET    /api/teams               — 我的团队列表
POST   /api/teams               — 创建团队
GET    /api/teams/:id/members   — 团队成员
POST   /api/teams/:id/members   — 邀请成员
PATCH  /api/teams/:id/members/:uid — 修改成员角色
DELETE /api/teams/:id/members/:uid — 移除成员
```

### 用户
```
GET    /api/users/me            — 当前用户信息
GET    /api/users/search?q=xx   — 搜索用户（分配时用）
```

### 通知
```
GET    /api/notifications       — 我的通知列表
PATCH  /api/notifications/:id/read — 标记已读
```

## Socket.io 事件

### 服务端 → 客户端
```
task:updated       — 任务变更（团队内成员可收到）
task:reminder      — 提醒触发（个人）
notification:new   — 新通知（个人）
```

### 客户端 → 服务端
```
join:team:{id}     — 加入团队房间
leave:team:{id}    — 离开团队房间
```

## 提醒机制

1. 服务端定时任务（每分钟扫描）检查 pending 任务的 `due_at - remind_at`
2. 触发条件满足时，通过 Socket.io 发送 `task:reminder` 事件
3. 客户端 Electron 主进程收到后调用系统原生通知 API
4. 同时写入 notifications 表

## 部署方案

- 云服务器（阿里云/腾讯云等）
- Node.js + PostgreSQL 部署
- 客户端通过公网 IP/域名连接服务端
- 后续可考虑 Docker 化

## 非功能需求

- v1 不实现离线支持（纯在线模式）
- 客户端不持久存储业务数据
- 服务端定时任务使用 node-cron
- 密码存储使用 bcrypt 哈希
