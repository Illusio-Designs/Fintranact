/**
 * Fintranact Windows desktop shell (Electron).
 *
 * Phase 0: loads the same web UI and talks to the same backend APIs — the
 * desktop is a client only (authorization stays server-side). Later phases add
 * the local device bridge (biometric/printer/scanner/weighbridge), an offline
 * cache + sync queue, and auto-update (electron-updater).
 */
import { app, BrowserWindow } from 'electron';
import path from 'node:path';

const WEB_URL = process.env.FINTRANACT_WEB_URL ?? 'http://localhost:3000';
const isDev = !app.isPackaged;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'Fintranact — RAVI Metal Treatment',
    backgroundColor: '#0E0E11',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  void win.loadURL(WEB_URL);
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  // Phase 4: initAutoUpdate(); Phase 3-4: startDeviceBridge();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
