require('dotenv').config();
const { ipcMain } = require('electron');
const fetch = require('node-fetch');
const { preferencesUtil } = require('../store/preferences');

const fetchNotifications = async () => {
  const url = process.env.BRUNO_INFO_ENDPOINT || 'https://appinfo.usebruno.com';
  const data = await fetch(url).then((res) => res.json());
  return data?.notifications || [];
};

// Contacting the notifications server is opt-in: with the preference off, no request leaves the machine.
const pushNotifications = async (mainWindow) => {
  if (!preferencesUtil.shouldFetchNotifications()) {
    return;
  }

  try {
    const notifications = await fetchNotifications();
    mainWindow.webContents.send('main:load-notifications', notifications);
  } catch (error) {
    console.error('Error while fetching notifications!', error);
  }
};

const registerNotificationsIpc = (mainWindow, watcher) => {
  mainWindow.webContents.on('did-finish-load', () => pushNotifications(mainWindow));
  ipcMain.on('renderer:notifications-opened', () => pushNotifications(mainWindow));
};

module.exports = registerNotificationsIpc;
module.exports.pushNotifications = pushNotifications;
