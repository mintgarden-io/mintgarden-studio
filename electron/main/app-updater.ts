import { autoUpdater } from 'electron-updater';

export default class AppUpdater {
  checkForUpdatesAndNotify() {
    return autoUpdater.checkForUpdatesAndNotify();
  }
}
