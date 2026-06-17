import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    showNotification: (title, body) => {
        ipcRenderer.send('show-notification', { title, body });
    },
    hideWindow: () => ipcRenderer.send('hide-window'),
});
