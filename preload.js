const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  submitJSON: (data) => ipcRenderer.invoke("generate-pdf", data),

  getTemplatePath: () => ipcRenderer.invoke("get-template-path"),
  changeTemplateFolder: () => ipcRenderer.invoke("change-template-folder"),
  resetTemplates: () => ipcRenderer.invoke("reset-templates"),
  openTemplateFolder: () => ipcRenderer.invoke("open-template-folder"),

  // Sample JSON
  getSampleJson: () => ipcRenderer.invoke("get-sample-json"),
  validateJSON: (data) => ipcRenderer.invoke("validate-json", data),
});
