import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification, screen } from 'electron';
import path from 'path';

// Set writable userData path to avoid GPU cache permission errors on Windows
app.setPath('userData', path.join(app.getPath('temp'), 'todoflow-data'));

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT:', err.stack || err.message);
});
process.on('unhandledRejection', (reason: any) => {
  console.error('REJECTION:', reason?.stack || reason?.message || reason);
});

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 340,
    height: 520,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  mainWindow.setPosition(width - 350, 10);

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  mainWindow.loadURL(devUrl);

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray() {
  try {
    const icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA' +
      'EElEQVQ4T2P8//8/AyMDEgMAGnYBAQFnrGmNAAAAAElFTkSuQmCC'
    );
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示/隐藏', click: () => {
          if (mainWindow?.isVisible()) mainWindow.hide();
          else mainWindow?.show();
        }
      },
      { type: 'separator' },
      {
        label: '退出', click: () => {
          isQuitting = true;
          app.quit();
        }
      },
    ]);

    tray.setToolTip('TodoFlow');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow?.isVisible()) mainWindow.hide();
      else mainWindow?.show();
    });
  } catch (err) {
    console.error('Failed to create tray:', err);
  }
}

ipcMain.on('show-notification', (_event, data: { title: string; body: string }) => {
  if (Notification.isSupported()) {
    const n = new Notification({ title: data.title, body: data.body });
    n.on('click', () => mainWindow?.show());
    n.show();
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
