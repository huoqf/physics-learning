import { contextBridge } from 'electron';

const electronAPI = {
  platform: process.platform,
  isElectron: true,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
