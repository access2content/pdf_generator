const { BrowserWindow } = require("electron");
const fs = require("fs");
const handlebars = require("handlebars");
const path = require("path");
const templateManager = require("./templateManager");

async function generatePDF(data, filePath) {
  //  1: Get current template directory from template manager
  const templateDir = templateManager.getTemplatePath();
  console.log("Generating PDF using templates from:", templateDir);

  //  2: Compile main template
  const template = fs.readFileSync(path.join(templateDir, "main.html"), "utf8");
  const html = handlebars.compile(template)(data);

  // Load header/footer templates
  // TODO: Verify if Header and Footer exists. If required, do template compilation
  const headerTemplate = fs.readFileSync(
    path.join(templateDir, "header.html"),
    "utf8",
  );

  const footerTemplate = fs.readFileSync(
    path.join(templateDir, "footer.html"),
    "utf8",
  );

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: false,
    },
  });

  // Load HTML safely
  await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));

  // Ensure fonts/layout fully loaded before print
  await win.webContents.executeJavaScript(
    "document.fonts ? document.fonts.ready : true",
  );

  const pdfBuffer = await win.webContents.printToPDF({
    pageSize: "A4",
    printBackground: true,

    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,

    marginsType: 1,
  });

  fs.writeFileSync(filePath, pdfBuffer);

  win.close();
}

module.exports = { generatePDF };
