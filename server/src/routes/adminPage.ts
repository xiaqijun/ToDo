import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TodoFlow 管理后台</title>
<style>
:root {
  --bg: #0d1117; --bg2: #161b22; --bg3: #21262d; --border: #30363d;
  --text: #c9d1d9; --text2: #8b949e; --blue: #58a6ff; --green: #3fb950;
  --yellow: #d29922; --orange: #db6d28; --red: #f85149;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);display:flex;height:100vh;overflow:hidden}
input,select,button{font-family:inherit}
input,select{padding:6px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;outline:none}
input:focus,select:focus{border-color:var(--blue)}
button{padding:6px 14px;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:13px;transition:opacity .15s}
button:hover{opacity:.85}
.btn-blue{background:#1f6feb} .btn-green{background:#238636} .btn-red{background:#da3633} .btn-gray{background:var(--bg3);color:var(--text);border:1px solid var(--border)}
table{width:100%;font-size:13px;border-collapse:collapse}
th{text-align:left;color:var(--text2);padding:10px 12px;font-weight:500;border-bottom:1px solid var(--bg3);white-space:nowrap}
td{padding:8px 12px;border-bottom:1px solid var(--bg3)}
td code{font-family:SFMono,monospace;font-size:12px;color:var(--text2)}
.badge{padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500;white-space:nowrap}
.bg-blue{background:#1f6feb22;color:var(--blue)} .bg-green{background:#23863622;color:var(--green)}
.bg-yellow{background:#d2992222;color:var(--yellow)} .bg-orange{background:#db6d2822;color:var(--orange)}
.bg-red{background:#f8514922;color:var(--red)} .bg-gray{background:var(--bg3);color:var(--text2)}

/* Layout */
.sidebar{width:200px;min-width:200px;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:12px 0}
.sidebar .logo{padding:8px 16px 16px;font-size:14px;font-weight:600;border-bottom:1px solid var(--border);margin-bottom:8px}
.sidebar a{display:flex;align-items:center;gap:8px;padding:8px 16px;font-size:13px;color:var(--text2);text-decoration:none;cursor:pointer;transition:all .1s}
.sidebar a:hover{background:var(--bg3);color:var(--text)}
.sidebar a.active{background:var(--bg);color:var(--blue);border-left:3px solid var(--blue);padding-left:13px}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:var(--bg2);border-bottom:1px solid var(--border);font-size:13px}
.content{flex:1;overflow-y:auto;padding:20px}
.section{display:none} .section.active{display:block}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:20px}
.stat-card{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:16px}
.stat-card .label{font-size:12px;color:var(--text2);margin-bottom:6px}
.stat-card .value{font-size:28px;font-weight:600}
.stat-card .value.red{color:var(--red)}
.panel{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:14px}
.panel h3{font-size:14px;margin-bottom:12px;color:var(--text)}
.filter-bar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center}
.key-box{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px}
.key-box code{color:var(--green);font-size:13px;word-break:break-all}
.hidden{display:none!important}
.pagination{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:12px;font-size:13px;color:var(--text2)}
.spinner{display:inline-block;width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.modal-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center}
.modal-box{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:560px;width:90%;max-height:80vh;overflow-y:auto}
.modal-box h3{margin-bottom:14px;font-size:15px}
.toast{position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;font-size:13px;z-index:9999;animation:fadeIn .2s}
.toast-ok{background:#238636;color:#fff} .toast-err{background:#da3633;color:#fff}
@keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:768px){.sidebar{display:none}.stats-grid{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<!-- Sidebar -->
<nav class="sidebar" id="sidebar">
  <div class="logo">📋 TodoFlow 管理</div>
  <a data-section="dashboard" class="active" onclick="showSection('dashboard')">📊 仪表盘</a>
  <a data-section="users" onclick="showSection('users')">👥 用户管理</a>
  <a data-section="tasks" onclick="showSection('tasks')">📝 任务管理</a>
  <a data-section="teams" onclick="showSection('teams')">👪 团队管理</a>
  <a data-section="system" onclick="showSection('system')">⚙️ 系统设置</a>
</nav>

<div class="main">
  <!-- Topbar -->
  <div class="topbar">
    <span style="color:var(--text2)">TodoFlow 管理后台</span>
    <div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:12px;color:var(--text2)" id="admin-name"></span>
      <button class="btn-gray" style="font-size:11px;padding:4px 10px" onclick="logout()">退出</button>
    </div>
  </div>

  <!-- Content -->
  <div class="content">

    <!-- Dashboard -->
    <div class="section active" id="sec-dashboard">
      <div class="stats-grid" id="stats-grid"></div>
      <div class="panel">
        <h3>📋 最近任务</h3>
        <table><thead><tr><th>标题</th><th>创建者</th><th>状态</th><th>截止日期</th></tr></thead>
          <tbody id="recent-tasks"></tbody></table>
      </div>
    </div>

    <!-- Users -->
    <div class="section" id="sec-users">
      <div class="panel">
        <div style="display:flex;gap:10px;margin-bottom:12px;align-items:center">
          <input type="text" id="user-search" placeholder="搜索用户..." oninput="filterUsers()" style="width:200px">
          <button class="btn-blue" onclick="showCreateUser()">+ 创建用户</button>
          <button class="btn-gray" onclick="fetchUsers()">刷新</button>
        </div>
        <div id="create-user-form" class="hidden" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px">
          <input type="text" id="new-user-name" placeholder="显示名称" style="width:200px;margin-right:8px">
          <select id="new-user-role" style="margin-right:8px"><option value="user">普通用户</option><option value="admin">管理员</option></select>
          <button class="btn-green" onclick="createUser()">创建</button>
          <button class="btn-gray" onclick="hideCreateUser()">取消</button>
        </div>
        <div id="user-key-display" class="hidden key-box">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:12px;color:var(--text2)" id="user-key-label"></span>
            <button class="btn-gray" style="font-size:11px;padding:2px 8px" onclick="copyKey()">复制</button>
          </div>
          <code id="user-key-text"></code>
        </div>
        <table><thead><tr><th>名称</th><th>角色</th><th>密钥</th><th style="text-align:right">操作</th></tr></thead>
          <tbody id="user-list"></tbody></table>
      </div>
    </div>

    <!-- Tasks -->
    <div class="section" id="sec-tasks">
      <div class="panel">
        <div class="filter-bar">
          <select id="task-status"><option value="">全部状态</option><option value="pending">待办</option><option value="done">已完成</option></select>
          <select id="task-importance"><option value="">全部重要性</option><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select>
          <select id="task-urgency"><option value="">全部紧急度</option><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select>
          <input type="text" id="task-search" placeholder="搜索任务标题..." style="width:160px">
          <button class="btn-blue" onclick="fetchTasks()">搜索</button>
          <button class="btn-gray" onclick="resetTasks()">重置</button>
        </div>
        <table><thead><tr><th>标题</th><th>创建者</th><th>负责人</th><th>状态</th><th>重要性</th><th>紧急度</th><th>截止日期</th><th style="text-align:right">操作</th></tr></thead>
          <tbody id="task-list"></tbody></table>
        <div class="pagination" id="task-pagination"></div>
      </div>
    </div>

    <!-- Teams -->
    <div class="section" id="sec-teams">
      <div class="panel">
        <div style="margin-bottom:12px"><button class="btn-blue" onclick="fetchTeams()">刷新</button></div>
        <table><thead><tr><th>团队名</th><th>成员数</th><th>创建者</th><th>创建时间</th><th style="text-align:right">操作</th></tr></thead>
          <tbody id="team-list"></tbody></table>
      </div>
    </div>

    <!-- System -->
    <div class="section" id="sec-system">
      <div class="stats-grid" id="sys-cards"></div>
      <div class="panel">
        <h3>📦 下载同步</h3>
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn-blue" id="sync-btn" onclick="triggerDownloadSync()">立即同步</button>
          <span style="font-size:13px;color:var(--text2)" id="sync-status">加载中...</span>
        </div>
      </div>
    </div>

  </div>
</div>

<!-- Task detail modal -->
<div class="modal-overlay hidden" id="task-modal">
  <div class="modal-box" id="task-modal-content"></div>
</div>
<!-- Team members modal -->
<div class="modal-overlay hidden" id="team-modal">
  <div class="modal-box" id="team-modal-content"></div>
</div>

<script>
// ── Auth ──
let authKey = '';
const api = (path, opts = {}) => fetch(path, {
  ...opts, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authKey, ...opts.headers }
}).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)));

async function login() {
  const key = localStorage.getItem('adminKey') || '';
  if (!key) { showLogin(); return; }
  try {
    const res = await fetch('/api/auth/connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key })
    }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)));
    if (res.user.role !== 'admin') { toast('需要管理员权限', true); showLogin(); return; }
    authKey = key;
    localStorage.setItem('adminKey', key);
    document.getElementById('admin-name').textContent = res.user.displayName;
    document.getElementById('login-overlay')?.remove();
    showSection('dashboard');
  } catch (e) { toast('密钥无效或服务器不可达', true); showLogin(); }
}

function showLogin() {
  if (document.getElementById('login-overlay')) return;
  const div = document.createElement('div');
  div.id = 'login-overlay';
  div.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;align-items:center;justify-content:center';
  div.innerHTML = '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:30px;width:360px"><h1 style="font-size:18px;margin-bottom:18px">📋 TodoFlow 管理</h1><input type="password" id="login-key" placeholder="请输入管理员密钥" style="width:100%;margin-bottom:10px"><button class="btn-green" style="width:100%" onclick="doLogin()">连接</button><p id="login-err" style="color:var(--red);font-size:12px;margin-top:10px;display:none"></p></div>';
  document.body.appendChild(div);
}
function doLogin() {
  const key = document.getElementById('login-key').value.trim();
  if (!key) return;
  document.getElementById('login-err').style.display = 'none';
  fetch('/api/auth/connect', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key })
  }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
    .then(res => {
      if (res.user.role !== 'admin') { document.getElementById('login-err').textContent = '需要管理员权限'; document.getElementById('login-err').style.display = 'block'; return; }
      authKey = key; localStorage.setItem('adminKey', key);
      document.getElementById('admin-name').textContent = res.user.displayName;
      document.getElementById('login-overlay').remove();
      showSection('dashboard');
    }).catch(e => { document.getElementById('login-err').textContent = e.error || '密钥无效'; document.getElementById('login-err').style.display = 'block'; });
}
function logout() { localStorage.removeItem('adminKey'); location.reload(); }

// ── Navigation ──
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-' + name).classList.add('active');
  document.querySelectorAll('.sidebar a').forEach(a => { a.classList.remove('active'); if (a.dataset.section === name) a.classList.add('active'); });
  if (name === 'dashboard') fetchStats();
  else if (name === 'users') fetchUsers();
  else if (name === 'tasks') fetchTasks();
  else if (name === 'teams') fetchTeams();
  else if (name === 'system') fetchSystem();
}

// ── Dashboard ──
async function fetchStats() {
  try {
    const res = await api('/api/admin/stats');
    const d = res.data;
    document.getElementById('stats-grid').innerHTML =
      card('总用户数', d.totalUsers, '') + card('总任务数', d.totalTasks, '') +
      card('待办任务', d.pendingTasks, '') + card('已完成', d.doneTasks, '') +
      card('已逾期', d.overdueTasks, 'red') + card('团队数', d.totalTeams, '');
    document.getElementById('recent-tasks').innerHTML = d.recentTasks.length
      ? d.recentTasks.map(t => '<tr><td>' + esc(t.title) + '</td><td>' + esc(t.creator?.displayName||'') + '</td><td><span class="badge ' + statusBadge(t.status) + '">' + statusLabel(t.status) + '</span></td><td>' + fmtDate(t.dueAt) + '</td></tr>').join('')
      : '<tr><td colspan="4" style="text-align:center;color:var(--text2);padding:20px">暂无数据</td></tr>';
  } catch (e) { toast('加载仪表盘失败', true); }
}
function card(label, value, cls) {
  return '<div class="stat-card"><div class="label">' + label + '</div><div class="value' + (cls ? ' ' + cls : '') + '">' + value + '</div></div>';
}

// ── Users ──
let allUsers = [];
async function fetchUsers() {
  try {
    const res = await api('/api/admin/users');
    allUsers = res.data;
    renderUsers(allUsers);
  } catch (e) { toast('加载用户列表失败', true); }
}
function renderUsers(list) {
  document.getElementById('user-list').innerHTML = list.length
    ? list.map(u => '<tr><td>' + esc(u.displayName) + '</td><td><span class="badge ' + (u.role === 'admin' ? 'bg-blue' : 'bg-gray') + '">' + (u.role === 'admin' ? '管理员' : '用户') + '</span></td><td><code>' + esc(u.keyMasked) + '</code></td><td style="text-align:right"><button class="btn-blue" style="font-size:11px;padding:2px 8px;margin-right:4px" onclick="regenerateKey(\\'' + u.id + '\\',\\'' + esc(u.displayName) + '\\')">重置</button><button class="btn-red" style="font-size:11px;padding:2px 8px" onclick="deleteUser(\\'' + u.id + '\\',\\'' + esc(u.displayName) + '\\')">删除</button></td></tr>').join('')
    : '<tr><td colspan="4" style="text-align:center;color:var(--text2);padding:20px">暂无用户</td></tr>';
}
function filterUsers() {
  const q = document.getElementById('user-search').value.toLowerCase();
  renderUsers(q ? allUsers.filter(u => u.displayName.toLowerCase().includes(q)) : allUsers);
}
function showCreateUser() { document.getElementById('create-user-form').classList.remove('hidden'); }
function hideCreateUser() { document.getElementById('create-user-form').classList.add('hidden'); document.getElementById('new-user-name').value = ''; }
async function createUser() {
  const name = document.getElementById('new-user-name').value.trim(), role = document.getElementById('new-user-role').value;
  if (!name) return;
  try {
    const res = await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ displayName: name, role }) });
    document.getElementById('user-key-label').textContent = name + ' 的密钥（仅此一次显示）：';
    document.getElementById('user-key-text').textContent = res.key;
    document.getElementById('user-key-display').classList.remove('hidden');
    hideCreateUser(); fetchUsers();
  } catch (e) { toast(e.error || '创建失败', true); }
}
async function regenerateKey(id, name) {
  if (!confirm('确定要为 ' + name + ' 重新生成密钥？旧密钥将立即失效。')) return;
  try {
    const res = await api('/api/admin/users/' + id + '/regenerate-key', { method: 'POST' });
    document.getElementById('user-key-label').textContent = name + ' 的新密钥（仅此一次显示）：';
    document.getElementById('user-key-text').textContent = res.key;
    document.getElementById('user-key-display').classList.remove('hidden');
    fetchUsers();
  } catch (e) { toast(e.error || '操作失败', true); }
}
async function deleteUser(id, name) {
  if (!confirm('确定要删除用户 ' + name + '？此操作不可撤销。')) return;
  try { await api('/api/admin/users/' + id, { method: 'DELETE' }); fetchUsers(); }
  catch (e) { toast(e.error || '删除失败', true); }
}
function copyKey() {
  navigator.clipboard.writeText(document.getElementById('user-key-text').textContent).then(() => toast('已复制密钥'));
}

// ── Tasks ──
let taskPage = 1, taskTotal = 0;
async function fetchTasks(pg) {
  if (pg) taskPage = pg;
  const params = new URLSearchParams({ page: taskPage, limit: 20 });
  const add = (k, v) => { if (v) params.set(k, v); };
  add('status', document.getElementById('task-status').value);
  add('importance', document.getElementById('task-importance').value);
  add('urgency', document.getElementById('task-urgency').value);
  add('search', document.getElementById('task-search').value.trim());
  try {
    const res = await api('/api/admin/tasks?' + params.toString());
    taskTotal = res.total;
    document.getElementById('task-list').innerHTML = res.data.length
      ? res.data.map(t => '<tr><td>' + esc(t.title) + '</td><td>' + esc(t.creator?.displayName||'') + '</td><td>' + esc(t.assignee?.displayName||'') + '</td><td><span class="badge ' + statusBadge(t.status) + '">' + statusLabel(t.status) + '</span></td><td><span class="badge ' + importanceBadge(t.importance) + '">' + importanceLabel(t.importance) + '</span></td><td><span class="badge ' + urgencyBadge(t.urgency) + '">' + urgencyLabel(t.urgency) + '</span></td><td>' + fmtDate(t.dueAt) + '</td><td style="text-align:right"><button class="btn-blue" style="font-size:11px;padding:2px 8px;margin-right:4px" onclick="viewTask(\\'' + t.id + '\\')">查看</button><button class="btn-red" style="font-size:11px;padding:2px 8px" onclick="deleteTask(\\'' + t.id + '\\',\\'' + esc(t.title) + '\\')">删除</button></td></tr>').join('')
      : '<tr><td colspan="8" style="text-align:center;color:var(--text2);padding:20px">暂无任务</td></tr>';
    const totalPages = Math.ceil(res.total / res.limit);
    document.getElementById('task-pagination').innerHTML = totalPages > 1
      ? '<button class="btn-gray" ' + (taskPage <= 1 ? 'disabled' : '') + ' onclick="fetchTasks(' + (taskPage - 1) + ')">上一页</button><span>第 ' + taskPage + ' 页，共 ' + totalPages + ' 页（共 ' + res.total + ' 条）</span><button class="btn-gray" ' + (taskPage >= totalPages ? 'disabled' : '') + ' onclick="fetchTasks(' + (taskPage + 1) + ')">下一页</button>'
      : '';
  } catch (e) { toast('加载任务列表失败', true); }
}
function resetTasks() {
  document.getElementById('task-status').value = '';
  document.getElementById('task-importance').value = '';
  document.getElementById('task-urgency').value = '';
  document.getElementById('task-search').value = '';
  taskPage = 1; fetchTasks();
}
async function viewTask(id) {
  try {
    const res = await api('/api/admin/tasks/' + id);
    const t = res.data;
    document.getElementById('task-modal-content').innerHTML =
      '<h3>📝 ' + esc(t.title) + '</h3>' +
      '<p style="font-size:13px;color:var(--text2);margin-bottom:10px">描述：' + esc(t.description || '无') + '</p>' +
      '<table style="margin-bottom:10px"><tr><td style="color:var(--text2);width:80px">状态</td><td><span class="badge ' + statusBadge(t.status) + '">' + statusLabel(t.status) + '</span></td></tr>' +
      '<tr><td style="color:var(--text2)">重要性</td><td><span class="badge ' + importanceBadge(t.importance) + '">' + importanceLabel(t.importance) + '</span></td></tr>' +
      '<tr><td style="color:var(--text2)">紧急度</td><td><span class="badge ' + urgencyBadge(t.urgency) + '">' + urgencyLabel(t.urgency) + '</span></td></tr>' +
      '<tr><td style="color:var(--text2)">创建者</td><td>' + esc(t.creator?.displayName || '') + '</td></tr>' +
      '<tr><td style="color:var(--text2)">负责人</td><td>' + esc(t.assignee?.displayName || '无') + '</td></tr>' +
      '<tr><td style="color:var(--text2)">开始</td><td>' + fmtDate(t.startAt) + '</td></tr>' +
      '<tr><td style="color:var(--text2)">截止</td><td>' + fmtDate(t.dueAt) + '</td></tr>' +
      '<tr><td style="color:var(--text2)">创建时间</td><td>' + fmtDate(t.createdAt) + '</td></tr></table>' +
      (t.subtasks?.length ? '<p style="font-size:13px;font-weight:500;margin-bottom:4px">子任务 (' + t.subtasks.length + ')：</p>' + t.subtasks.map(st => '<p style="font-size:12px;color:var(--text2);padding-left:12px">☐ ' + esc(st.title) + (st.assignee ? ' (' + esc(st.assignee.displayName) + ')' : '') + '</p>').join('') : '') +
      '<button class="btn-gray" style="margin-top:10px" onclick="closeModal(\\'task-modal\\')">关闭</button>';
    document.getElementById('task-modal').classList.remove('hidden');
  } catch (e) { toast('加载任务详情失败', true); }
}
async function deleteTask(id, title) {
  if (!confirm('确定要删除任务「' + title + '」？此操作不可撤销。')) return;
  try { await api('/api/admin/tasks/' + id, { method: 'DELETE' }); toast('已删除'); fetchTasks(); }
  catch (e) { toast(e.error || '删除失败', true); }
}

// ── Teams ──
async function fetchTeams() {
  try {
    const res = await api('/api/admin/teams');
    document.getElementById('team-list').innerHTML = res.data.length
      ? res.data.map(t => '<tr><td>' + esc(t.name) + '</td><td>' + t.memberCount + '</td><td>' + esc(t.creatorName) + '</td><td>' + fmtDate(t.createdAt) + '</td><td style="text-align:right"><button class="btn-blue" style="font-size:11px;padding:2px 8px;margin-right:4px" onclick="viewTeamMembers(\\'' + t.id + '\\',\\'' + esc(t.name) + '\\')">成员</button><button class="btn-red" style="font-size:11px;padding:2px 8px" onclick="deleteTeam(\\'' + t.id + '\\',\\'' + esc(t.name) + '\\')">删除</button></td></tr>').join('')
      : '<tr><td colspan="5" style="text-align:center;color:var(--text2);padding:20px">暂无团队</td></tr>';
  } catch (e) { toast('加载团队列表失败', true); }
}
async function viewTeamMembers(id, name) {
  try {
    const res = await api('/api/teams/' + id + '/members');
    document.getElementById('team-modal-content').innerHTML =
      '<h3>👪 ' + esc(name) + ' - 成员</h3><table><thead><tr><th>用户</th><th>角色</th><th>加入时间</th></tr></thead><tbody>' +
      (res.data.length ? res.data.map(m => '<tr><td>' + esc(m.user?.displayName || '') + '</td><td><span class="badge ' + (m.role === 'owner' ? 'bg-blue' : 'bg-gray') + '">' + m.role + '</span></td><td>' + fmtDate(m.joinedAt) + '</td></tr>').join('') : '<tr><td colspan="3" style="color:var(--text2);text-align:center;padding:20px">暂无成员</td></tr>') +
      '</tbody></table><button class="btn-gray" style="margin-top:10px" onclick="closeModal(\\'team-modal\\')">关闭</button>';
    document.getElementById('team-modal').classList.remove('hidden');
  } catch (e) { toast('加载成员列表失败', true); }
}
async function deleteTeam(id, name) {
  if (!confirm('确定要删除团队「' + name + '」？关联任务将取消团队归属。')) return;
  try { await api('/api/admin/teams/' + id, { method: 'DELETE' }); toast('已删除'); fetchTeams(); }
  catch (e) { toast(e.error || '删除失败', true); }
}

// ── System ──
async function fetchSystem() {
  try {
    const res = await api('/api/admin/system');
    const d = res.data;
    document.getElementById('sys-cards').innerHTML =
      '<div class="stat-card"><div class="label">服务器版本</div><div class="value" style="font-size:20px">' + esc(d.version) + '</div></div>' +
      '<div class="stat-card"><div class="label">运行时间</div><div class="value" style="font-size:20px">' + esc(d.uptimeHuman) + '</div></div>' +
      '<div class="stat-card"><div class="label">数据库</div><div class="value" style="font-size:20px;color:' + (d.dbStatus === 'connected' ? 'var(--green)' : 'var(--red)') + '">' + (d.dbStatus === 'connected' ? '已连接' : '已断开') + '</div></div>' +
      '<div class="stat-card"><div class="label">上次下载同步</div><div class="value" style="font-size:14px">' + (d.lastDownloadSync ? fmtDate(d.lastDownloadSync) : '从未同步') + '</div></div>';
    document.getElementById('sync-status').textContent = d.downloadSyncing ? '同步中...' : '空闲';
  } catch (e) { toast('加载系统信息失败', true); }
}
async function triggerDownloadSync() {
  const btn = document.getElementById('sync-btn');
  btn.disabled = true; btn.textContent = '同步中...';
  try {
    const res = await api('/api/admin/system/sync-downloads', { method: 'POST' });
    toast('已触发同步');
  } catch (e) {
    toast(e.error || '同步触发失败', true);
  }
  btn.disabled = false; btn.textContent = '立即同步';
  setTimeout(fetchSystem, 2000);
}

// ── Helpers ──
function toast(msg, isErr) {
  const el = document.createElement('div');
  el.className = 'toast ' + (isErr ? 'toast-err' : 'toast-ok');
  el.textContent = msg; document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'; }
function statusBadge(s) { return s === 'done' ? 'bg-green' : 'bg-yellow'; }
function statusLabel(s) { return s === 'done' ? '已完成' : '待办'; }
function importanceLabel(i) { return i === 'high' ? '高' : i === 'medium' ? '中' : '低'; }
function importanceBadge(i) { return i === 'high' ? 'bg-orange' : i === 'medium' ? 'bg-blue' : 'bg-gray'; }
function urgencyLabel(u) { return u === 'high' ? '高' : u === 'medium' ? '中' : '低'; }
function urgencyBadge(u) { return u === 'high' ? 'bg-red' : u === 'medium' ? 'bg-blue' : 'bg-gray'; }

// ── Keyboard ──
document.addEventListener('keydown', e => { if (e.key === 'Escape') { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')); } });
document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); }));

// ── Init ──
login();
</script>
</body></html>`);
});

export default router;
