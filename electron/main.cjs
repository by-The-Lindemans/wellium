const { app, BrowserWindow } = require('electron');
const path = require('path');

const DEV_URL = process.env.APP_URL || 'https://relay.localhost:8100'; // Ionic dev server
const IGNORE_CERT = process.env.IGNORE_CERT_ERRORS === '1';            // for dev self‑signed

// Allow autoplay in Electron (splash sound)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// (optional) accept self-signed dev certs. DO NOT use in production.
if (IGNORE_CERT) {
    app.commandLine.appendSwitch('ignore-certificate-errors');
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1100,
        height: 800,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            autoplayPolicy: 'no-user-gesture-required'
        }
    });

    win.loadURL(DEV_URL);
    // win.webContents.openDevTools({ mode: 'detach' }); // if you want devtools
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
