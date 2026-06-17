# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Server (port 3001)
cd server && npm run dev          # Start dev server with hot reload (tsx watch)
cd server && npx tsc --noEmit     # Type check
cd server && npx prisma generate  # Regenerate Prisma client after schema changes
cd server && npx prisma migrate dev --name <name>  # Create and apply migration

# Client (port 5173)
cd client && npm run dev          # Vite dev server (browser mode)
cd client && npm run electron:dev # Electron mode (requires server running)
cd client && npx tsc --noEmit     # Type check
```

## Architecture

TodoFlow is a desktop todo app with a **floating window** UI (click tray icon to show/hide). Two-process architecture:

**Server** (`server/`) — Single source of truth. REST API + Socket.io for real-time push. Node.js + Express + Prisma + PostgreSQL. Key flows:

- **Task urgency auto-upgrade** (`services/tasks.ts:applyUrgencyUpgrade`): When a task's due date is within 24h, urgency bumps one level (medium→high). Overdue tasks are forced to `effectiveUrgency: 'high'` with `isOverdue: true`. This is computed at query time, not persisted.
- **Reminder scheduler** (`services/reminder.ts`): `node-cron` runs every minute, scans pending tasks with due dates, creates DB notifications + emits `task:reminder` socket events for tasks due within 15 min.
- **Socket.io** (`socket/index.ts`): Users join `user:{userId}` rooms on connect. Team members join `team:{teamId}` rooms. Task CRUD operations emit `task:updated` to all relevant user rooms and the team room.
- **Auth**: JWT-based. `middleware/auth.ts` extracts Bearer token, verifies, attaches `userId` to request. All resource routes are protected.

**Client** (`client/`) — Electron + React + Vite + Tailwind. Key patterns:

- **App.tsx** gates on auth: `useAuth` checks localStorage token → calls `/api/users/me` → either shows `LoginForm` or `FloatWindow`.
- **FloatWindow.tsx** is the main shell: header (tabs + logout) → scrollable quadrant list → add bar at bottom. It switches between showing an add-input and a `TaskForm`.
- **useTasks hook** manages the task list with socket listeners for real-time updates. `getQuadrantTasks(quadrant)` filters and sorts tasks by quadrant.
- **QuadrantView** receives a `QuadrantKey` ('q1'-'q4'), gets tasks from `useTasks().getQuadrantTasks()`, renders with collapse/expand.
- **TaskForm** builds the recurrence rule JSON client-side from form fields, sends to server as-is.

**Shared types** (`shared/types.ts`) — `User`, `Task`, `Team`, `TeamMember`, `Notification`, `RecurrenceRule`. The server's `Prisma.Json` type maps to `RecurrenceRule`. Client and server each have path aliases (`@shared/*`) pointing here, but the actual import paths are relative.

**Quadrant mapping** (urgency × importance):
| | 高重要度 | 低重要度 |
|---|---|---|
| **高紧急度** | q1 马上做 | q3 委派 |
| **低紧急度** | q2 计划做 | q4 暂缓 |

**Recurrence rules** are stored as JSONB in `tasks.recurrence_rule`. Each type has different shape:
- `hourly`: `{ type, interval, weekdaysOnly? }`
- `daily`: `{ type, weekdaysOnly? }`
- `weekly`: `{ type, days: number[], dueTime? }`
- `monthly`: `{ type, day: number }`
- `quarterly`: `{ type, due, startOffsetDays }`

**Database**: Models use `@map`/`@@map` for snake_case table/column names. `Task` has a self-referencing `parent/subtasks` relation. `TeamMember` uses composite PK `@@id([teamId, userId])`. Cascade deletes on `Notification` and `TeamMember`.
