import { IpcRenderer } from 'electron';

export class IpcService {
  private ipcRenderer?: IpcRenderer;

  public send<T>(channel: string, request: { [key: string]: any } = {}): Promise<T> {
    // If the ipcRenderer is not available try to initialize it
    if (!this.ipcRenderer) {
      this.initializeIpcRenderer();
      if (!this.ipcRenderer) {
        throw new Error(`Unable to load ipcRenderer`);
      }
    }
    // If there's no responseChannel let's auto-generate it
    if (!request.responseChannel) {
      request.responseChannel = `${channel}_response_${new Date().getTime()}`;
    }

    const ipcRenderer = this.ipcRenderer;
    ipcRenderer.send(channel, request);

    // This method returns a promise which will be resolved when the response has arrived.
    return new Promise((resolve, reject) => {
      ipcRenderer.once(request.responseChannel, (event, response) => {
        if (response.error) {
          return reject(response.error);
        }
        resolve(response);
      });
    });
  }

  private initializeIpcRenderer() {
    if (!window || !window.process || !window.require) {
      throw new Error(`Unable to require renderer process`);
    }
    this.ipcRenderer = window.require('electron').ipcRenderer;
  }
}
