# Key-Based Authentication Design

**Date**: 2026-06-18
**Status**: Approved

## Overview

Replace the current email/password self-registration + JWT login system with a
pre-shared API key model. Administrators manage user accounts server-side; each
user receives a unique key. The client enters the key once and connects.

## Motivation

- Remove self-registration — accounts are admin-managed
- Eliminate password management entirely (no bcrypt, no JWT, no password reset)
- Simple key-based auth for a desktop todo app

## Database Changes

### User Model (`server/prisma/schema.prisma`)

Remove: `email`, `passwordHash`
Add:
- `key` — unique random string, e.g. `td_3k8f2a1b9c4d...`, the user's credential
- `role` — `"admin" | "user"`, defaults to `"user"`

### Migration

A Prisma migration will: drop `email`/`password_hash` columns, add `key`/`role`.
Existing user data will be lost (acceptable — the app is in early development).

## Server Changes

### First-Run Admin Bootstrap

When the server starts and finds zero users in the database, it creates a
default admin account and prints the key to `stdout`:

```
======== Initial Admin Key ========
  Key: td_admin_3k8f2a1b9c4d...
  Save this key — it will not be shown again.
====================================
```

### Key Auth Middleware (`middleware/keyAuth.ts`)

Replaces `middleware/auth.ts`. On every request:
1. Read `Authorization: Bearer <key>` header
2. Query database: `SELECT * FROM users WHERE key = <key>`
3. If found: attach `req.userId` and `req.userRole`, call `next()`
4. If not found: 401

No JWT verification, no bcrypt.

### Auth Endpoint (minimal)

`POST /api/auth/connect` — single public endpoint. Accepts `{ key: string }`,
queries the database, returns `{ user: { id, displayName, role } }` or 401.
This replaces the old register + login endpoints.

### Admin Routes (`routes/admin.ts`)

All routes protected by `requireAdmin` middleware (checks `user.role === "admin"`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all users (keys masked: `td_xxx...a1b2`) |
| POST | `/api/admin/users` | Create user. Body: `{ displayName, role? }`. Returns full key once. |
| POST | `/api/admin/users/:id/regenerate-key` | Regenerate user's key. Returns full key once. |
| PUT | `/api/admin/users/:id` | Update displayName or role |
| DELETE | `/api/admin/users/:id` | Delete user. Cannot delete self. |

### Removed Code

- `routes/auth.ts` — entire file (register, login, /me endpoints)
- `services/auth.ts` — bcrypt, JWT generation, password logic
- `middleware/auth.ts` — JWT verification (replaced by keyAuth)
- `config.ts` — `jwtSecret`, `jwtExpiresIn`

### Key Generation

Use `crypto.randomBytes(24).toString('hex')` prefixed with `td_` to produce
48-character alphanumeric keys. The prefix helps identify the key format.

## Client Changes

### KeyLogin Component

Replaces `LoginForm.tsx`. A single text input for the key + "Connect" button.
On success: store key in `localStorage`, proceed to main app.
On failure: show "Invalid key" error.

The server URL input remains — users may need to point to different servers.

### useAuth Hook Changes

- Remove `login(email, password)` and `register(email, password, displayName)`
- Add `connect(key: string): Promise<void>` — POSTs the key to `/api/auth/connect`
- On mount: restore key from `localStorage`, call `/api/auth/connect` to validate

### Auth Endpoint (minimal)

`POST /api/auth/connect` — accepts `{ key: string }`, validates against DB,
returns `{ user: { id, displayName, role } }`. This is the only public auth
endpoint.

### Admin Panel

Admin users (role="admin") see a gear icon in the FloatWindow header. Clicking it
opens a modal with:
- User list table (name, role badge, masked key, created date)
- "Create User" button → form with name + role → dialog showing the full key
- "Regenerate Key" per user → confirmation → dialog showing new key
- "Delete User" per user → confirmation → removes user

Regular users do not see the gear icon.

## Auth Flow

```
Client                          Server
  |                                |
  |-- POST /api/auth/connect ----->|  { key: "td_xxx" }
  |                                |  SELECT * FROM users WHERE key = ?
  |<-- { user: { id, name, role }} |  key found → OK
  |                                |
  |  Store key in localStorage     |
  |  All subsequent requests carry Authorization: Bearer td_xxx
```

## Security Considerations

- Keys are stored in localStorage (same as current JWT tokens)
- Keys never expire (admin can revoke by regenerating)
- Keys are generated server-side via CSPRNG (`crypto.randomBytes`)
- Key masking in admin UI prevents accidental exposure
- Deleted user's active sessions won't work (database check on every request)
