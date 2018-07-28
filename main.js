const { electron, dialog, app, BrowserWindow, Menu } = require("electron");
const log = require("electron-log");
const path = require("path");
const url = require("url");
const child_process = require("child_process");

let mainWindow;
let serverProcess;
let CURRENT_PORT = 5000;

app.on("ready", () => {
    log.warn("Starting Server");
    createMenu(CURRENT_PORT);
    spawnProcess(CURRENT_PORT);
});

function createMenu(port) {
    const mainMenu = Menu.buildFromTemplate(getMenuTemplate(port));
    Menu.setApplicationMenu(mainMenu);
}

function testConnection(port, callback) {
    const { net } = require('electron');
    const request = net.request({
        method: 'GET',
        protocol: 'http:',
        hostname: 'localhost',
        port: port,
        path: '/'
    });
    request.on('response', (response) => {
        if (response.statusCode === 200) {
            return callback();
        }
    });
    request.on("error", () => {
        return callback("no response");
    });
    request.end();
}

function spawnProcess(port) {
    // Start Server via server.js
    let args = ["-p", port];
    let env = {};
    serverProcess = child_process.fork(path.join(__dirname, "node-js-sample/index.js"), args, {env: env});

    serverProcess.on("message", (message) => {});
    serverProcess.on("exit", (code, signal) => {});
    serverProcess.on("close", (code, signal) => {});
    serverProcess.on("error", (err) => {
        log.error(err);
    });

    const intervalID = setInterval(() => {
        testConnection(port, (err) => {
            if (err || mainWindow) return;
            clearInterval(intervalID);
            mainWindow = new BrowserWindow({
                width: 1280,
                height: 800,
                show: false
            });
            // Load server in window
            // We'll instead want to load the server from an HTML file
            mainWindow.loadURL(url.format({
                pathname: "127.0.0.1:" + port,
                protocol: "http:",
                slashes: true
            }));
            mainWindow.webContents.on('did-finish-load', () => {
                mainWindow.show();
            });

            // Quit app when closed
            mainWindow.on("closed", () => {
                quitServer(port);
            });
        });
    }, 10);
}

function quitServer(port) {
    if (serverProcess) {
        serverProcess.kill();
    }
    app.quit();
}

// Create menu template
function getMenuTemplate(port) {
    return [
        // Each object is a dropdown
        {
            label: "File",
            submenu: [{
                    label: "Quit application",
                    accelerator: process.platform == "darwin" ? "Command+Q" : "Ctrl+Q",
                    click() {
                        quitServer(port);
                    }
                }
            ]
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
                { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
            ]
        },
        {
            label: "Developer Tools",
            submenu: [{
                    role: "reload"
                },
                {
                    label: "Toggle DevTools",
                    accelerator: process.platform == "darwin" ? "Command+I" : "Ctrl+I",
                    click(item, focusedWindow) {
                        focusedWindow.toggleDevTools();
                    }
                }
            ]
        }
    ];
}
