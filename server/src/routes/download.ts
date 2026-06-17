import { Router, Request, Response } from 'express';
import express from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();
const downloadsDir = path.join(__dirname, '../../downloads');
const GITHUB_REPO = 'xiaqijun/ToDo';

// Ensure downloads directory exists
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Serve static download files
router.use('/files', express.static(downloadsDir));

interface DownloadItem {
  name: string;
  url: string;
  size: string;
  icon: string;
}

const PLATFORMS = [
  { label: 'Windows', ext: '.exe', icon: '🪟' },
  { label: 'macOS',   ext: '.dmg', icon: '🍎' },
  { label: 'Linux',   ext: '.AppImage', icon: '🐧' },
];

// ── Background sync: pull installer files from GitHub Releases ──

interface ReleaseAsset { name: string; browser_download_url: string; size: number }

let lastTag = '';          // latest release tag we've synced
let syncing = false;       // mutex — only one sync at a time

async function syncFromGitHub(): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    // 1. Fetch latest release metadata
    const resp = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          'User-Agent': 'TodoFlow-Server',
          Accept: 'application/vnd.github+json',
        },
        signal: AbortSignal.timeout(30_000),
      }
    );
    if (!resp.ok) { console.error('[download] GitHub API error:', resp.status); return; }

    const release = await resp.json() as any;
    const tag = release.tag_name as string;
    if (tag === lastTag) return; // already synced this release

    const assets: ReleaseAsset[] = release.assets || [];

    for (const plat of PLATFORMS) {
      // Find the asset matching this platform's extension
      const asset = assets.find((a: ReleaseAsset) => a.name.endsWith(plat.ext));
      if (!asset) continue;

      const dest = path.join(downloadsDir, asset.name);

      // Skip if already downloaded
      if (fs.existsSync(dest)) {
        const stat = fs.statSync(dest);
        // Accept if file size is close enough (±1 KB)
        if (Math.abs(stat.size - asset.size) < 1024) continue;
        // Otherwise delete and re-download
        fs.unlinkSync(dest);
      }

      // 2. Download the file
      console.log(`[download] Fetching ${asset.name} …`);
      const dl = await fetch(asset.browser_download_url, {
        signal: AbortSignal.timeout(300_000), // 5 min per file
      });
      if (!dl.ok) { console.error(`[download] Failed to fetch ${asset.name}: ${dl.status}`); continue; }

      const buf = Buffer.from(await dl.arrayBuffer());
      fs.writeFileSync(dest, buf);
      console.log(`[download] Cached ${asset.name} (${formatSize(asset.size)})`);
    }

    // Clean up stale files from older releases
    const keep = new Set(assets.map((a: ReleaseAsset) => a.name));
    for (const f of fs.readdirSync(downloadsDir)) {
      if (!keep.has(f) && PLATFORMS.some(p => f.endsWith(p.ext))) {
        fs.unlinkSync(path.join(downloadsDir, f));
        console.log(`[download] Removed stale ${f}`);
      }
    }

    lastTag = tag;
    console.log(`[download] Synced to ${tag}`);
  } catch (err: any) {
    if (err?.name === 'AbortError' || err?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      console.error('[download] GitHub API / download timeout');
    } else {
      console.error('[download] Sync error:', err);
    }
  } finally {
    syncing = false;
  }
}

// Initial sync on startup, then every 30 minutes
syncFromGitHub();
const syncTimer = setInterval(syncFromGitHub, 30 * 60_000);

// ── Download page ──

router.get('/', (_req: Request, res: Response) => {
  const items: DownloadItem[] = [];

  for (const f of fs.readdirSync(downloadsDir)) {
    const rule = PLATFORMS.find(r => f.endsWith(r.ext));
    if (rule) {
      const stat = fs.statSync(path.join(downloadsDir, f));
      items.push({
        name: `${rule.label} (${f})`,
        url: `/download/files/${encodeURIComponent(f)}`,
        size: formatSize(stat.size),
        icon: rule.icon,
      });
    }
  }

  const links = items.length > 0
    ? items.map(a =>
        `<a href="${a.url}" class="link"><span>${a.icon}</span><div><strong>${a.name}</strong><br><small>${a.size} · 本地缓存</small></div><span class="arrow">↓</span></a>`
      ).join('')
    : '<p class="empty">暂无安装包。<br>服务端正从 GitHub Releases 同步，请稍后刷新。</p>';

  res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TodoFlow 下载</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1117;color:#c9d1d9;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:32px;width:100%;max-width:440px}
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
  <p class="footer">下载安装后，填写服务器地址即可使用</p>
</div>
</body>
</html>`);
});

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default router;
