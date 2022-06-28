import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { release } from 'os';
import { join } from 'path';
import { RPCAgent } from 'chia-agent';

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}
//process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

let win: BrowserWindow | null = null;
// Here, you can also use other preload
const splash = join(__dirname, '../preload/splash.js');
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin
const url = `http://${process.env['VITE_DEV_SERVER_HOST']}:${process.env['VITE_DEV_SERVER_PORT']}`;

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    height: 800,
    width: 1280,
    webPreferences: {
      preload: splash,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (app.isPackaged) {
    win.loadFile(join(__dirname, '../../index.html'));
  } else {
    win.loadURL(url);
    // win.webContents.openDevTools()
  }

  // Test active push message to Renderer-process
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  win = null;
  if (process.platform !== 'darwin') app.quit();
});

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

// new window example arg: new windows url
ipcMain.handle('open-win', (event, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload: splash,
    },
  });

  if (app.isPackaged) {
    childWindow.loadFile(join(__dirname, `../renderer/index.html`), {
      hash: `${arg}`,
    });
  } else {
    childWindow.loadURL(`${url}/#${arg}`);
    // childWindow.webContents.openDevTools({ mode: "undocked", activate: true })
  }
});

ipcMain.on('get_public_keys', async (event, { responseChannel }) => {
  const agent = new RPCAgent({
    service: 'wallet',
  });
  try {
    const { public_key_fingerprints } = await agent.sendMessage<any>('wallet', 'get_public_keys');
    const { fingerprint } = await agent.sendMessage<any>('wallet', 'get_logged_in_fingerprint');
    event.sender.send(responseChannel, { fingerprints: public_key_fingerprints, fingerprint });
  } catch (error) {
    event.sender.send(responseChannel, { error });
  }
});

ipcMain.on('log_in', async (event, { responseChannel, ...args }) => {
  const agent = new RPCAgent({
    service: 'wallet',
  });
  try {
    const response = await agent.sendMessage<any>('wallet', 'log_in', {
      fingerprint: args.fingerprint,
    });
    event.sender.send(responseChannel, response);
  } catch (error) {
    console.log(error);
  }
});

ipcMain.on('get_wallet_balance', async (event, { responseChannel }) => {
  const agent = new RPCAgent({
    service: 'wallet',
  });
  try {
    const response = await agent.sendMessage<any>('wallet', 'get_wallet_balance', {
      wallet_id: 1,
    });
    event.sender.send(responseChannel, response);
  } catch (error) {
    console.log(error);
  }
});

ipcMain.on('get_dids', async (event, { responseChannel }) => {
  const agent = new RPCAgent({
    service: 'wallet',
  });
  const dids = [];
  try {
    const response = await agent.sendMessage<any>('wallet', 'get_wallets', {
      type: 8,
    });
    for (const wallet of response.wallets) {
      const response = await agent.sendMessage<any>('wallet', 'did_get_did', {
        wallet_id: wallet.id,
      });
      dids.push({ name: wallet.name, id: response.my_did });
    }
    event.sender.send(responseChannel, { dids });
  } catch (error) {
    console.log(error);
  }
});

ipcMain.on('mint_nft', async (event, { responseChannel, ...args }) => {
  const agent = new RPCAgent({
    service: 'wallet',
  });
  try {
    const did = args.did;

    const { wallets } = await agent.sendMessage<any>('wallet', 'get_wallets', {
      type: 10,
    });
    let nft_did_wallet = wallets.find((wallet: any) => wallet.data && JSON.parse(wallet.data)?.did_id === did);
    if (!nft_did_wallet) {
      const response = await agent.sendMessage<any>('wallet', 'create_new_wallet', {
        wallet_type: 'nft_wallet',
        did_id: did,
      });
      nft_did_wallet = { id: response.wallet_id };
    }

    const response = await agent.sendMessage<any>('wallet', 'nft_mint_nft', {
      wallet_id: nft_did_wallet.wallet_id,
      // uris: args.dataUris,
      hash: args.dataHash,
      meta_uris: args.metadataUris,
      meta_hash: args.metadataHash,
      did_id: args.did,
    });
    event.sender.send(responseChannel, response);
  } catch (error) {
    event.sender.send(responseChannel, { error });
    console.log('Failed to mint NFT', error);
  }
});
