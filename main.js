const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { generatePDF } = require("./simplePdf");

ipcMain.handle("generate-pdf", async (_, data) => {
  const info = JSON.parse(JSON.stringify(data));
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Save PDF",
    defaultPath: info.designer.name + ".pdf",
    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
  });

  if (canceled || !filePath) {
    return { status: "cancelled" };
  }

  await generatePDF(data, filePath);

  return { status: "ok", path: filePath };
});

function createWindow() {
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
    },
  });

  win.maximize();
  win.setMenuBarVisibility(false);

  win.loadFile("index.html");
  win.show();
}

app.commandLine.appendSwitch("disable-features", "UseDBus");
app.whenReady().then(createWindow);
