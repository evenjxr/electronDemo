const { app, BrowserWindow, session, Menu } = require("electron");
const electronStore = require("electron-store");
const os = require("os");

const store = new electronStore();
const sessionCookieStoreKey = `cookies.mainWindow${getMacAddress()}`;
// const url = "http://v.helloword.cn";
// const url = "file://" + __dirname + "/src/index.html"
const url = "http://192.168.1.15:8080"
const template = [
  {
      label: 'View App',
      submenu: [
          {
              label: '强制刷新',
              role: 'forceReload'
          },
          {
              label: '全屏',
              role: 'togglefullscreen'
          }
      ]
  }
];
const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

app.on("ready", async function createWindow() {
  // 可以创建多个渲染进程
  getMacAddress();
  let win = new BrowserWindow({
    webPreferences: {
      webviewTag: true,
      contextIsolation: false
    }
  });
  // win.maximize();
  await initCookie();
  win.loadURL(url);
  win.webContents.on("did-navigate-in-page", function (event, url) {
    if (url.indexOf("login") > -1) {
      clearCookie();
    }
  });
  win.on("ready-to-show", function () {
    win.show();
  });
  win.on("close", () => {
    if (win.webContents.getURL().indexOf("login") > -1) {
      clearCookie();
    } else {
      saveCookie(url);
    }
  });
  win.on("closed", function () {
    win = null;
  });
});

// 页面全部关闭后关闭主进程,不同平台可能有不同的处理方式
app.on("window-all-closed", () => {
  app.quit();
});

//获取mac地址
function getMacAddress() {
  let mac = "";
  let networkInterfaces = os.networkInterfaces();
  for (let i in networkInterfaces) {
    for (let j in networkInterfaces[i]) {
      if (
        networkInterfaces[i][j]["family"] === "IPv4" &&
        networkInterfaces[i][j]["mac"] !== "00:00:00:00:00:00" &&
        networkInterfaces[i][j]["address"] !== "127.0.0.1"
      ) {
        mac = networkInterfaces[i][j]["mac"];
      }
    }
  }
  return mac;
}

async function initCookie() {
  await new Promise(resolve => {
    let cookies = store.get(sessionCookieStoreKey) || [];
    let recoverTimes = cookies.length;
    if (recoverTimes <= 0) {
      resolve();
      return;
    }
    //恢复cookie现场
    cookies.forEach(cookiesItem => {
      let { secure = false, domain = "", path = "" } = cookiesItem;
      session.defaultSession.cookies
        .set(
          Object.assign(cookiesItem, {
            url:
              (secure ? "https://" : "http://") +
              domain.replace(/^\./, "") +
              path
          })
        )
        .then(() => {})
        .catch(e => {
          console.error({
            message: "恢复cookie失败",
            cookie: cookiesItem,
            errorMessage: e.message
          });
        })
        .finally(() => {
          recoverTimes--;
          if (recoverTimes <= 0) {
            resolve();
          }
        });
    });
  });
}

function saveCookie() {
  session.defaultSession.cookies
    .get({})
    .then(cookies => {
      store.set(sessionCookieStoreKey, cookies);
    })
    .catch(error => {
      console.log(error);
    });
}

function clearCookie() {
  store.set(sessionCookieStoreKey, null);
}
