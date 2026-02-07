const { BrowserWindow } = require("electron");
const fs = require("fs");
const handlebars = require("handlebars");
const path = require("path");

async function generatePDF(data, filePath) {
  // Compile main template
  const template = fs.readFileSync(
    path.join(__dirname, "template", "main.html"),
    "utf8",
  );
  const html = handlebars.compile(template)(data);

  // Load header/footer templates
  const headerTemplate = fs.readFileSync(
    path.join(__dirname, "template", "header.html"),
    "utf8",
  );

  const footerTemplate = fs.readFileSync(
    path.join(__dirname, "template", "footer.html"),
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
