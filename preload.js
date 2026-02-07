const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  submitJSON: (data) => ipcRenderer.invoke("generate-pdf", data),
});
