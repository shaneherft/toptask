// Dependencies
var electron = require('electron'),
  app = electron.app,
  BrowserWindow = electron.BrowserWindow;

const {Menu, Tray} = require('electron');

const storage = require('electron-json-storage');

const ipcMain = require('electron').ipcMain;

// var Tray = require('tray');
// var Menu = require('menu');
var path = require('path');
// var globalShortcut = require('global-shortcut');
var configuration = require('./configuration');
var trayIcon = null;
var settingsWindow = null;
var trelloWindow = null;
var mainWindow;
var displaySize =1;

var trayMenuTemplate = [
    {
        label: 'Toptask',
        enabled: false
    },
    {
        label: 'Settings',
        click: function() {
          createSettingsWindow();
        }
    },
    {
        label: 'Clear Storage',
        click: function() {
          storage.clear(function(error) {
            if (error) throw error;
          });
        }
    },
    {
        label: 'Log Out',
        click: function() {
          mainWindow.webContents.send('log-out');
        }
    },
    {
        label: "Edit",
        submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" },
      ]},
    {
        label: 'Quit',
        click: function () {
            // ipcRenderer.send('close-main-window');
            app.quit();
        }
    }
];

var __DEV__ = (process.env['NODE_ENV'] === 'development');

var dialog = require('electron').dialog;
var Twit = require('twit');

console.log(`NODE_ENV=[${process.env['NODE_ENV']}]`);

// Config


// var xpos = displaySize.width;
// console.log(xpos);

function createWindow(rightAligned) {

  if (__DEV__) {
    // DEBUG run, developer helper features enabled

    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 349,
      height: 66,
      x: rightAligned -20,
      y: 80,
      frame: false,
      alwaysOnTop: false,
      webPreferences: {"nodeIntegration": true,}
    });
    // Open the DevTools.
    mainWindow.webContents.openDevTools({detach: true});

  } else {

    // PRODUCTION run

    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 349,
      height: 66,
      x: rightAligned - 20,
      y: 80,
      frame: false,
      alwaysOnTop: true,
      webPreferences: {
        "nodeIntegration": true,
      }
    });
  }

  mainWindow.loadURL('file://' + __dirname + '/index.html');

  if (process.platform === 'darwin') {
      trayIcon = new Tray(path.join(__dirname, 'app/images/tray-iconTemplate.png'));
  }
  else {
      trayIcon = new Tray(path.join(__dirname, 'app/images/tray-icon-alt.png'));
  }
  var trayMenu = Menu.buildFromTemplate(trayMenuTemplate);
  trayIcon.setContextMenu(trayMenu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
    trelloWindow = null;
  });
}

function createTrelloWindow(cardLink) {

  if (trelloWindow) {
      return;
  }

  trelloWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: true,
    webPreferences: {
      "nodeIntegration": false
    }
  });

  trelloWindow.loadURL(cardLink);

  trelloWindow.on('closed', function () {
    mainWindow.setSize(269, 66);
    mainWindow.webContents.send('refresh-card');
    trelloWindow = null;

    });

}

function createSettingsWindow(rightAligned) {

    if (settingsWindow) {
        return;
    }

    settingsWindow = new BrowserWindow({
        frame: false,
        height: 425,
        resizable: false,
        width: 269,
        x: rightAligned - 20,
        y: 80
    });

    settingsWindow.loadURL('file://' + __dirname + '/app/settings.html');

    settingsWindow.on('closed', function () {
        settingsWindow = null;
    });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {

  // if (!configuration.readSettings('shortcutKeys')) {
    // configuration.saveSettings('shortcutKeys', ['cmd','shift']);
  // }

  // app.dock.hide();
  displaySize = electron.screen.getPrimaryDisplay().workAreaSize;
  createWindow(displaySize.width - 346);

  // setGlobalShortcuts();

});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('set-size', function(event, width, height) {
  if (height < displaySize.height - 140) {
    mainWindow.setSize(width, height);
  }
  else {
    mainWindow.setSize(width, displaySize.height - 140)
  }

});

ipcMain.on('load-size', function(event) {
    mainWindow.setSize(269, 66)
});

ipcMain.on('trello-open', function(event, cardUrl) {
  createTrelloWindow(cardUrl);
});


ipcMain.on('close-settings-window', function () {
  settingsWindow.close();
  mainWindow.webContents.send('new-settings');
});

ipcMain.on('open-settings-window', function () {
  createSettingsWindow();
});


// ipcMain.on('set-global-shortcuts', function () {
//     setGlobalShortcuts();
// });

// function setGlobalShortcuts() {
//     globalShortcut.unregisterAll();
//
//     var shortcutKeysSetting = configuration.readSettings('shortcutKeys');
//     var shortcutPrefix = shortcutKeysSetting.length === 0 ? '' : shortcutKeysSetting.join('+') + '+';
//
//     globalShortcut.register(shortcutPrefix + 's', function () {
//         mainWindow.webContents.send('global-shortcut', 0);
//     });
// }
