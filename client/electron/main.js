import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification } from 'electron';
import path from 'path';
let mainWindow = null;
let tray = null;
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
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    mainWindow.setPosition(width - 350, 10);
    const isDev = !!process.env.VITE_DEV_SERVER_URL;
    if (isDev) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow?.hide();
        }
    });
}
function createTray() {
    // Create a minimal tray icon
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示/隐藏', click: () => {
                if (mainWindow?.isVisible())
                    mainWindow.hide();
                else
                    mainWindow?.show();
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
        if (mainWindow?.isVisible())
            mainWindow.hide();
        else
            mainWindow?.show();
    });
}
// IPC: show native notification from renderer
ipcMain.on('show-notification', (_event, data) => {
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
    if (process.platform !== 'darwin')
        app.quit();
});
