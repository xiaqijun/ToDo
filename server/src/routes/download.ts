import { Router, Request, Response } from 'express';
import express from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();
const downloadsDir = path.join(__dirname, '../../downloads');

// Ensure downloads directory exists
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Serve static download files
router.use('/files', express.static(downloadsDir));

// Download page
router.get('/', (_req: Request, res: Response) => {
  const platformRules: { label: string; ext: string; icon: string }[] = [
    { label: 'Windows', ext: '.exe', icon: '🪟' },
    { label: 'macOS', ext: '.dmg', icon: '🍎' },
    { label: 'Linux', ext: '.AppImage', icon: '🐧' },
  ];

  let files: { name: string; url: string; size: string; icon: string }[] = [];

  try {
    const dirFiles = fs.readdirSync(downloadsDir);
    // list all installable files, match by extension
    for (const f of dirFiles) {
      const rule = platformRules.find(r => f.endsWith(r.ext));
      if (rule) {
        const stat = fs.statSync(path.join(downloadsDir, f));
        files.push({
          name: `${rule.label} (${f})`,
          url: `/download/files/${encodeURIComponent(f)}`,
          size: formatSize(stat.size),
          icon: rule.icon,
        });
      }
    }
  } catch {
    // directory empty or missing
  }

  const links = files.length > 0
    ? files.map(a =>
        `<a href="${a.url}" class="link"><span>${a.icon}</span><div><strong>${a.name}</strong><br><small>${a.size}</small></div><span class="arrow">↓</span></a>`
      ).join('')
    : '<p class="empty">暂无安装包。<br>在服务器上运行 <code>bash deploy.sh</code> 自动构建。<br><br><small>macOS 安装包需在 Mac 上构建：<br><code>cd client && npx electron-builder --mac</code></small></p>';

  res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TodoFlow 下载</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1117;color:#c9d1d9;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:32px;width:100%;max-width:420px}
  h1{font-size:20px;margin-bottom:4px}.ver{color:#8b949e;font-size:13px;margin-bottom:24px}
  .link{display:flex;align-items:center;gap:12px;padding:14px 16px;background:#21262d;border:1px solid #30363d;border-radius:8px;margin-bottom:8px;text-decoration:none;color:#c9d1d9;transition:all .15s}
  .link:hover{border-color:#58a6ff;background:#1c2128}
  .link span{font-size:24px}.link strong{font-size:14px}.link small{color:#8b949e;font-size:11px}
  .arrow{margin-left:auto;color:#8b949e;font-size:18px}
  .empty{color:#8b949e;text-align:center;padding:24px 0;font-size:13px;line-height:1.8}
  .footer{text-align:center;margin-top:24px;color:#484f58;font-size:11px}
</style>
</head>
<body>
<div class="card">
  <h1>📋 TodoFlow</h1>
  <p class="ver">桌面待办提醒工具</p>
  ${links}
  <p class="footer">下载安装后，在设置中填写服务器地址即可使用</p>
</div>
</body>
</html>`);
});

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default router;
