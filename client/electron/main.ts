import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification, screen } from 'electron';
import path from 'path';

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

  // Position top-right
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  mainWindow.setPosition(width - 350, 10);

  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!);
  } else {
    // dist-electron/electron/main.js → ../../dist/index.html
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray() {
  try {
    // Create a 16x16 icon from a minimal valid PNG
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
    // App still works without tray
  }
}

// IPC: show native notification from renderer
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
