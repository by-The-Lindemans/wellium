// electron/main.cjs
const { app, BrowserWindow } = require('electron');
const path = require('path');

const DEV_URL = process.env.APP_URL || 'http://relay.localhost:8100';

// allow splash-screen audio without gesture
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

if (process.env.WELLIUM_DEV_RESET === '1') {
    const { session, app } = require('electron');
    app.whenReady().then(() =>
        session.defaultSession.clearStorageData().then(() => {
        })
    );
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1100,
        height: 800,
        show: false,                            // reveal only after first paint
        webPreferences: { contextIsolation: true, nodeIntegration: false }
    });

    /** try to load Vite dev server, retry until it’s ready */
    const tryLoad = async (attempt = 0) => {
        try {
            await win.loadURL(DEV_URL);
        } catch (err) {
            if (attempt < 50) {                   // ~10 s max
                setTimeout(() => tryLoad(attempt + 1), 200);
                return;
            }
            console.error('[electron] could not connect to dev server:', err);
            win.loadFile(path.join(__dirname, 'app', 'index.html')); // fallback prod build
        }
    };

    // automatic retry when Vite isn’t listening yet
    win.webContents.on('did-fail-load', (_evt, code, desc) => {
        console.log(`[electron] did-fail-load (${code}) ${desc} – retry`);
        setTimeout(() => tryLoad(), 200);
    });

    win.once('ready-to-show', () => win.show());
    tryLoad();                                // first attempt
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
