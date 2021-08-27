const { app, BrowserWindow, session, Menu, ipcMain } = require("electron");
const electronStore = require("electron-store");
const os = require("os");

const store = new electronStore();
const sessionCookieStoreKey = `cookies.mainWindow${getMacAddress()}`;
const url = "http://127.0.0.1:8000/main.html?b=" + Math.random();
// const url = "file://" + __dirname + "/src/main.html?a=" + Math.random();
// const url = "https://minipro-1254168140.cos.ap-beijing.myqcloud.com/index.html";
// const url =
//   "https://minipro-1254168140.cos.ap-beijing.myqcloud.com/main.html?a=" +
//   Math.random();
const template = [
  {
    label: "View App",
    submenu: [
      {
        label: "强制刷新",
        role: "forceReload"
      },
      {
        label: "全屏",
        role: "togglefullscreen"
      }
    ]
  }
];
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

ipcMain.on("clear-cookies", (event, url) => {
  clearCookie();
});
ipcMain.on("save-cookies", async (event, url) => {
  await saveCookie();
  await initCookie();
});

app.on("ready", async function createWindow() {
  let win = new BrowserWindow({
    webPreferences: {
      webviewTag: true,
      contextIsolation: false,
      nodeIntegration: true
    }
  });
  // win.maximize();
  await initCookie();
  win.loadURL(url);
  win.on("ready-to-show", function () {
    win.show();
  });
  win.on("close", () => {
    saveCookie();
  });
  win.on("closed", function () {
    win = null;
  });
  win.on("did-navigate-in-page", () => {
    win.focus();
  });
});

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

async function saveCookie() {
  await session.defaultSession.cookies
    .get({})
    .then(cookies => {
      const cookie = cookies.find(
        item => item.name === "student-grammar-token"
      );
      if (cookie) {
        // newCookies = [
        //   "gv.helloword.cn",
        //   "v.helloword.cn",
        //   "g.helloword.cn"
        // ].map(site => {
        //   return {
        //     ...cookie,
        //     domain: site
        //   };
        // });
        // console.log(222222, newCookies);
        store.set(sessionCookieStoreKey, [cookie]);
      }
    })
    .catch(error => {
      console.log(error);
    });
}

function clearCookie() {
  session.defaultSession.cookies
    .get({})
    .then(cookies => {
      cookies.forEach(cookie => {
        let url = "";
        url += cookie.secure ? "https://" : "http://";
        url += cookie.domain.charAt(0) === "." ? "www" : "";
        url += cookie.domain;
        url += cookie.path;
        session.defaultSession.cookies.remove(url, cookie.name, error => {
          if (error) console.log(`error removing cookie ${cookie.name}`, error);
        });
      });
    })
    .catch(error => {
      console.log(error);
    });
  store.set(sessionCookieStoreKey, null);
}
