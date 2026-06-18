import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TodoFlow 管理</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1117;color:#c9d1d9;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:32px;width:100%;max-width:600px}
h1{font-size:20px;margin-bottom:24px}
input,select{width:100%;padding:8px 12px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#c9d1d9;font-size:14px;outline:none;margin-bottom:10px}
input:focus,select:focus{border-color:#58a6ff}
button{padding:8px 16px;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:13px;transition:opacity .15s}
button:hover{opacity:.85}
.btn-green{background:#238636}
.btn-red{background:#da3633}
.btn-blue{background:#1f6feb}
.btn-gray{background:#21262d;color:#c9d1d9;border:1px solid #30363d}
table{width:100%;font-size:13px;border-collapse:collapse}
th{text-align:left;color:#8b949e;padding:8px 0;font-weight:500;border-bottom:1px solid #21262d}
td{padding:8px 0;border-bottom:1px solid #21262d;vertical-align:middle}
td code{font-family:monospace;font-size:12px;color:#8b949e}
.badge{padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500}
.badge-admin{background:#1f6feb22;color:#58a6ff}
.badge-user{background:#30363d;color:#8b949e}
.key-box{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:12px}
.key-box code{color:#3fb950;font-size:13px;word-break:break-all}
.toast{position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;font-size:13px;z-index:999;animation:fadeIn .2s}
.toast-err{background:#da3633;color:#fff}
.toast-ok{background:#238636;color:#fff}
.hidden{display:none}
@keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
</style>
</head>
<body>
<div class="card" id="app">
  <h1>📋 TodoFlow 管理</h1>

  <!-- Login -->
  <div id="login-box">
    <input type="password" id="key-input" placeholder="请输入管理员密钥">
    <button class="btn-green" style="width:100%" onclick="login()">连接</button>
  </div>

  <!-- Panel (hidden until login) -->
  <div id="panel-box" class="hidden">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <span style="font-size:13px;color:#8b949e" id="logged-as"></span>
      <button class="btn-gray" style="margin-left:auto" onclick="logout()">退出</button>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn-blue" onclick="showCreate()">+ 创建用户</button>
      <button class="btn-gray" onclick="fetchUsers()">刷新</button>
    </div>

    <!-- Create form -->
    <div id="create-form" class="hidden" style="background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:12px">
      <input type="text" id="new-name" placeholder="显示名称">
      <select id="new-role"><option value="user">普通用户</option><option value="admin">管理员</option></select>
      <div style="display:flex;gap:8px">
        <button class="btn-green" onclick="createUser()">创建</button>
        <button class="btn-gray" onclick="hideCreate()">取消</button>
      </div>
    </div>

    <!-- Key display -->
    <div id="key-display" class="hidden key-box">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:12px;color:#8b949e" id="key-label"></span>
        <button class="btn-gray" style="font-size:11px;padding:2px 8px" onclick="copyKey()">复制</button>
      </div>
      <code id="key-text"></code>
    </div>

    <!-- User table -->
    <table><thead><tr><th>名称</th><th>角色</th><th>密钥</th><th style="text-align:right">操作</th></tr></thead>
      <tbody id="user-list"><tr><td colspan="4" style="text-align:center;color:#8b949e;padding:24px">加载中...</td></tr></tbody>
    </table>
  </div>
</div>
<script>
let authKey = '';
const api = (path, opts = {}) => fetch(path, {
  ...opts,
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authKey, ...opts.headers }
}).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)));

async function login() {
  const key = document.getElementById('key-input').value.trim();
  if (!key) return;
  try {
    const res = await fetch('/api/auth/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)));
    if (res.user.role !== 'admin') { toast('需要管理员权限', true); return; }
    authKey = key;
    document.getElementById('login-box').classList.add('hidden');
    document.getElementById('panel-box').classList.remove('hidden');
    document.getElementById('logged-as').textContent = res.user.displayName;
    fetchUsers();
  } catch (e) { toast(e.error || '密钥无效', true); }
}

function logout() { authKey = ''; document.getElementById('login-box').classList.remove('hidden'); document.getElementById('panel-box').classList.add('hidden'); }

async function fetchUsers() {
  try {
    const res = await api('/api/admin/users');
    const rows = res.data.map(u => '<tr>' +
      '<td>' + esc(u.displayName) + '</td>' +
      '<td><span class="badge ' + (u.role === 'admin' ? 'badge-admin' : 'badge-user') + '">' + (u.role === 'admin' ? '管理员' : '用户') + '</span></td>' +
      '<td><code>' + esc(u.keyMasked) + '</code></td>' +
      '<td style="text-align:right">' +
        '<button class="btn-blue" style="font-size:11px;padding:2px 8px;margin-right:4px" onclick="regenerateKey(\\'' + u.id + '\\',\\'' + esc(u.displayName) + '\\')">重置</button>' +
        '<button class="btn-red" style="font-size:11px;padding:2px 8px" onclick="deleteUser(\\'' + u.id + '\\',\\'' + esc(u.displayName) + '\\')">删除</button>' +
      '</td></tr>').join('');
    document.getElementById('user-list').innerHTML = rows || '<tr><td colspan="4" style="text-align:center;color:#8b949e;padding:24px">暂无用户</td></tr>';
  } catch (e) { toast(e.error || '加载失败', true); }
}

async function createUser() {
  const name = document.getElementById('new-name').value.trim();
  const role = document.getElementById('new-role').value;
  if (!name) return;
  try {
    const res = await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ displayName: name, role }) });
    document.getElementById('key-label').textContent = name + ' 的密钥（仅此一次显示）：';
    document.getElementById('key-text').textContent = res.key;
    document.getElementById('key-display').classList.remove('hidden');
    document.getElementById('create-form').classList.add('hidden');
    document.getElementById('new-name').value = '';
    fetchUsers();
  } catch (e) { toast(e.error || '创建失败', true); }
}

async function regenerateKey(id, name) {
  if (!confirm('确定要为 ' + name + ' 重新生成密钥？旧密钥将立即失效。')) return;
  try {
    const res = await api('/api/admin/users/' + id + '/regenerate-key', { method: 'POST' });
    document.getElementById('key-label').textContent = name + ' 的新密钥（仅此一次显示）：';
    document.getElementById('key-text').textContent = res.key;
    document.getElementById('key-display').classList.remove('hidden');
    fetchUsers();
  } catch (e) { toast(e.error || '操作失败', true); }
}

async function deleteUser(id, name) {
  if (!confirm('确定要删除用户 ' + name + '？此操作不可撤销。')) return;
  try { await api('/api/admin/users/' + id, { method: 'DELETE' }); fetchUsers(); }
  catch (e) { toast(e.error || '删除失败', true); }
}

function showCreate() { document.getElementById('create-form').classList.remove('hidden'); }
function hideCreate() { document.getElementById('create-form').classList.add('hidden'); }

function copyKey() {
  const text = document.getElementById('key-text').textContent;
  navigator.clipboard.writeText(text).then(() => toast('已复制密钥'));
}

function toast(msg, isErr) {
  const el = document.createElement('div');
  el.className = 'toast ' + (isErr ? 'toast-err' : 'toast-ok');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
</script>
</body></html>`);
});

export default router;
