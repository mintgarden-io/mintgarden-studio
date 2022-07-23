import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { release } from 'os';
import * as path from 'path';
import { join } from 'path';
import { chiaRoot, getConfig, getConnectionInfoFromConfig, RPCAgent, TConfig } from 'chia-agent';
import Store from 'electron-store';
import * as fs from 'fs';
import { SmartCoin } from 'greenwebjs';
import { bech32m } from 'bech32';
import axios from 'axios';
import crypto from 'crypto';

const axiosHttp = axios.create({
  adapter: require('axios/lib/adapters/http'),
});

// setLogLevel('debug');

const store = new Store<{ CHIA_ROOT: string }>({ defaults: { CHIA_ROOT: chiaRoot } });

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
    height: 1000,
    width: 1440,
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

const getChiaAgent = () => {
  const chiaRoot = store.get('CHIA_ROOT');

  const config = getConfig(`${chiaRoot}/config/config.yaml`);
  const { hostname, port } = getConnectionInfoFromConfig('wallet', config);
  const certs = loadCertFilesFromConfig(chiaRoot, config);

  return new RPCAgent({
    service: 'wallet',
    protocol: 'https',
    host: hostname,
    port: port,
    ca_cert: certs.caCert,
    client_cert: certs.clientCert,
    client_key: certs.clientKey,
  });
};

function loadCertFilesFromConfig(chiaRoot: string, config: TConfig) {
  const resolveFromChiaRoot = (pathFromChiaRoot: string[]) => {
    return path.resolve(chiaRoot, ...pathFromChiaRoot);
  };

  const clientCertPath = resolveFromChiaRoot([config['/daemon_ssl/private_crt']] as string[]);
  const clientKeyPath = resolveFromChiaRoot([config['/daemon_ssl/private_key']] as string[]);
  const caCertPath = resolveFromChiaRoot([config['/private_ssl_ca/crt']] as string[]);
  const getCertOrKey = (path: string) => {
    if (!fs.existsSync(path)) {
      throw new Error(`crt/key Not Found at ${path}`);
    }
    return fs.readFileSync(path);
  };

  const clientCert = getCertOrKey(clientCertPath);
  const clientKey = getCertOrKey(clientKeyPath);
  const caCert = getCertOrKey(caCertPath);

  return { clientCert, clientKey, caCert };
}

ipcMain.on('connect', async (event, { responseChannel, ...args }) => {
  try {
    const agent = getChiaAgent();
    await agent.sendMessage<any>('wallet', 'healthz');
    event.sender.send(responseChannel, { success: true });
  } catch (error) {
    console.log(error);
    event.sender.send(responseChannel, { error, chiaRoot: store.get('CHIA_ROOT') });
  }
});

ipcMain.on('get_sync_status', async (event, { responseChannel, ...args }) => {
  try {
    const agent = getChiaAgent();
    const response = await agent.sendMessage<any>('wallet', 'get_sync_status');
    const networkInfoResponse = await agent.sendMessage<any>('wallet', 'get_network_info');
    event.sender.send(responseChannel, { ...response, ...networkInfoResponse });
  } catch (error) {
    console.log(error);
    event.sender.send(responseChannel, { error });
  }
});

ipcMain.on('set_chia_root', async (event, { responseChannel, ...args }) => {
  store.set('CHIA_ROOT', args.chiaRoot);
  event.sender.send(responseChannel, {});
});

ipcMain.on('get_chia_root', async (event, { responseChannel }) => {
  const chiaRoot = store.get('CHIA_ROOT');
  event.sender.send(responseChannel, { chiaRoot });
});

ipcMain.on('get_public_keys', async (event, { responseChannel }) => {
  try {
    const agent = getChiaAgent();
    const { public_key_fingerprints } = await agent.sendMessage<any>('wallet', 'get_public_keys');
    const { fingerprint } = await agent.sendMessage<any>('wallet', 'get_logged_in_fingerprint');
    event.sender.send(responseChannel, { fingerprints: public_key_fingerprints, fingerprint });
  } catch (error) {
    event.sender.send(responseChannel, { error });
  }
});

ipcMain.on('log_in', async (event, { responseChannel, ...args }) => {
  try {
    const agent = getChiaAgent();
    const response = await agent.sendMessage<any>('wallet', 'log_in', {
      fingerprint: args.fingerprint,
    });
    event.sender.send(responseChannel, response);
  } catch (error) {
    console.log(error);
  }
});

ipcMain.on('get_wallet_balance', async (event, { responseChannel }) => {
  try {
    const agent = getChiaAgent();
    const response = await agent.sendMessage<any>('wallet', 'get_wallet_balance', {
      wallet_id: 1,
    });
    event.sender.send(responseChannel, response);
  } catch (error) {
    console.log(error);
  }
});

ipcMain.on('get_dids', async (event, { responseChannel }) => {
  const dids = [];
  try {
    const agent = getChiaAgent();
    const response = await agent.sendMessage<any>('wallet', 'get_wallets', {
      type: 8,
    });
    for (const wallet of response.wallets) {
      const response = await agent.sendMessage<any>('wallet', 'did_get_did', {
        wallet_id: wallet.id,
      });
      dids.push({ name: wallet.name, didId: response.my_did, coinId: response.coin_id });
    }
    event.sender.send(responseChannel, { dids });
  } catch (error) {
    console.log(error);
  }
});

ipcMain.on('get_nfts_for_did', async (event, { responseChannel, ...args }) => {
  try {
    let url1 = `https://api.testnet.mintgarden.io/profile/${args.did}/nfts?type=created`;
    const { data } = await axiosHttp.get(url1);
    event.sender.send(responseChannel, { nfts: data.items });
  } catch (error) {
    console.log(error);
  }
});

ipcMain.on('mint_nft', async (event, { responseChannel, ...args }) => {
  try {
    const agent = getChiaAgent();
    const did = args.did;

    const walletResponse = await agent.sendMessage<any>('wallet', 'create_new_wallet', {
      wallet_type: 'nft_wallet',
      did_id: did.didId,
    });

    const response = await agent.sendMessage<any>('wallet', 'nft_mint_nft', {
      wallet_id: walletResponse.wallet_id,
      uris: args.dataUris,
      hash: args.dataHash,
      meta_uris: args.metadataUris,
      meta_hash: args.metadataHash,
      license_uris: args.licenseUrl ? [args.licenseUrl] : undefined,
      license_hash: args.licenseHash,
      did_id: args.did.didId,
      royalty_percentage: args.royaltyPercentage * 100,
      fee: args.feeInXch * 10 ** 12,
    });
    const launcherCoinRecord = response.spend_bundle?.coin_solutions.find(
      (solution: any) =>
        solution.coin.puzzle_hash === '0xeff07522495060c066f66f32acc2a77e3a3e737aca8baea4d1a64ea4cdc13da9'
    );
    console.log(launcherCoinRecord);
    let nft = undefined;
    if (launcherCoinRecord) {
      nft = getEncodedId(launcherCoinRecord);
      console.log('nft', nft);
    }

    event.sender.send(responseChannel, nft);
  } catch (error) {
    console.log('Failed to mint NFT', error);
    event.sender.send(responseChannel, { error });
  }
});

ipcMain.on('get_nft_mint_status', async (event, { responseChannel, ...args }) => {
  try {
    const agent = getChiaAgent();
    const walletResponse = await agent.sendMessage<any>('wallet', 'get_transactions', {
      wallet_id: 1,
      end: 10,
      reverse: true,
    });
    for (const transaction of walletResponse.transactions) {
      for (const addition of transaction.additions) {
        const smartCoin = new SmartCoin({
          parentCoinInfo: addition.parent_coin_info.replace('0x', ''),
          puzzleHash: addition.puzzle_hash.replace('0x', ''),
          amount: addition.amount,
        });
        if (smartCoin.getName() === args.nftId) {
          event.sender.send(responseChannel, { transaction });
          return;
        }
      }
    }
    event.sender.send(responseChannel, { transaction: undefined });
  } catch (error) {
    console.log('Failed to get NFT mint status', error);
    event.sender.send(responseChannel, { error });
  }
});

ipcMain.on('fetch_license', async (event, { responseChannel, ...args }) => {
  try {
    const { data } = await axiosHttp.get(args.licenseUrl, { responseType: 'arraybuffer' });
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    event.sender.send(responseChannel, { licenseHash: hash });
  } catch (error: any) {
    console.log('Failed to calculate license hash', error);
    let errorMessage = error.message;
    if (error.response?.statusText) {
      errorMessage = `${error.response.status}: ${error.response.statusText}`;
    }
    event.sender.send(responseChannel, { error: new Error(errorMessage) });
  }
});

function getEncodedId(launcherCoinRecord: any) {
  const launcherCoin = new SmartCoin({
    parentCoinInfo: launcherCoinRecord.coin.parent_coin_info.replace('0x', ''),
    puzzleHash: launcherCoinRecord.coin.puzzle_hash.replace('0x', ''),
    amount: launcherCoinRecord.coin.amount,
  });
  let id = launcherCoin.getId();
  if (id) {
    const idBuffer: Buffer = Buffer.from(id, 'hex');
    return { id, encodedId: bech32m.encode('nft', bech32m.toWords(idBuffer)) };
  }
}
