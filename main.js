const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { generatePDF } = require("./simplePdf");
const templateManager = require("./templateManager");
const { EVENT } = require("./enums");

// Store reference to main window for template dialogs
let mainWindow = null;

ipcMain.handle(EVENT.GENERATE_PDF, async (_, data) => {
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

// Template management IPC handlers
ipcMain.handle(EVENT.TEMPLATE_PATH_GET, async () => {
  return templateManager.getTemplatePath();
});

ipcMain.handle(EVENT.TEMPLATE_PATH_CHANGE, async () => {
  return await templateManager.changeTemplateFolder(mainWindow);
});

ipcMain.handle(EVENT.TEMPLATE_PATH_RESET, async () => {
  return await templateManager.resetToDefaultTemplates();
});

ipcMain.handle(EVENT.TEMPLATE_PATH_OPEN, () => {
  templateManager.openTemplateFolder();
});

ipcMain.handle("get-sample-json", async () => {
  return templateManager.getSampleJson();
});

ipcMain.handle("validate-json", async (_, json) => {
  return templateManager.validateJSON(json);
});

async function createWindow() {
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

  // Store reference for template dialogs
  mainWindow = win;

  // Initialize template system before showing window
  // This handles first-run setup and validation
  try {
    const templatePath = await templateManager.initialize(win);
    console.log(
      "Template system initialized. Using templates from:",
      templatePath,
    );
  } catch (error) {
    console.error("Failed to initialize template system:", error);
    // Continue anyway - will use bundled templates as fallback
  }

  win.loadFile("index.html");
  win.show();
}

app.commandLine.appendSwitch("disable-features", "UseDBus");
app.whenReady().then(createWindow);
