/** Handles template folder selection, copying bundled templates, and validation */

const { app, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const configManager = require("./config");
const sampleJsonGenerator = require("./sampleJsonGenerator");

class TemplateManager {
  constructor() {
    this.bundledTemplatePath = null;
    this.userTemplatePath = null;
    this.isPackaged = app.isPackaged;
    this.mainWindow = null;
  }

  /**
   * Initialize template system
   * - Load config
   * - Prompt for template folder on first run
   * - Validate and fallback if needed
   * @param {BrowserWindow} mainWindow - Main window for dialogs
   * @returns {Promise<string>} Path to template directory
   */
  async initialize(mainWindow) {
    // Store main window reference for IPC
    this.mainWindow = mainWindow;

    // Determine bundled template location
    this.bundledTemplatePath = this.isPackaged
      ? path.join(process.resourcesPath, "template")
      : path.join(__dirname, "template");

    console.log("Bundled templates at:", this.bundledTemplatePath);

    // Load configuration
    const config = configManager.get();

    // First run: prompt user to select template folder
    if (config.firstRun) {
      console.log("First run detected, prompting for template folder...");
      await this.promptTemplateFolder(mainWindow);
      configManager.set("firstRun", false);
    }

    // Get configured template path
    let templatePath = config.templatePath;

    // Validate template path exists and has required files
    if (templatePath && this.validateTemplateFolder(templatePath)) {
      console.log("Using configured template path:", templatePath);
      this.userTemplatePath = templatePath;
      return templatePath;
    }

    // Fallback: copy bundled templates to userData
    console.log("Template folder invalid or missing, using fallback...");
    const fallbackPath = await this.createFallbackTemplates();
    this.userTemplatePath = fallbackPath;
    configManager.set("templatePath", fallbackPath);

    return fallbackPath;
  }

  /**
   * Get sample JSON for current templates
   * @returns {object} Sample JSON
   */
  getSampleJson() {
    return sampleJsonGenerator.generateSampleJson(this.userTemplatePath);
  }

  /**
   * Get required fields from templates (for validation)
   * @returns {Set<string>} Set of required field paths
   */
  getRequiredFields() {
    return sampleJsonGenerator.getRequiredFields(this.userTemplatePath);
  }

  /**
   * Validate JSON against template requirements
   * @param {object} json - JSON to validate
   * @returns {object} Validation result with { valid: boolean, missingFields: string[] }
   */
  validateJSON(json) {
    const requiredFields = this.getRequiredFields();
    const missingFields = [];

    for (const fieldPath of requiredFields) {
      // Skip array markers
      const cleanPath = fieldPath.replace("[]", "");
      const parts = cleanPath.split(".");

      // Check if field exists in JSON
      let current = json;
      let exists = true;

      for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
          current = current[part];
        } else {
          exists = false;
          break;
        }
      }

      if (!exists) {
        missingFields.push(fieldPath);
      }
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Prompt user to select template folder
   * If user cancels, falls back to default location
   * @param {BrowserWindow} mainWindow - Parent window for dialog
   * @returns {Promise<string>} Selected template path
   */
  async promptTemplateFolder(mainWindow) {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "question",
      title: "Template Folder Setup",
      message: "Would you like to choose a custom template folder?",
      detail:
        "You can select a folder with your custom HTML templates, or use the default templates bundled with the app.\n\n" +
        "Default templates will be copied to:\n" +
        path.join(app.getPath("userData"), "templates"),
      buttons: ["Choose Custom Folder", "Use Default Templates"],
      defaultId: 1,
      cancelId: 1,
    });

    // User wants to choose custom folder
    if (response === 0) {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: "Select Template Folder",
        properties: ["openDirectory"],
        message: "Select a folder containing your PDF templates",
      });

      if (!canceled && filePaths && filePaths[0]) {
        const selectedPath = filePaths[0];

        // Validate selected folder
        if (this.validateTemplateFolder(selectedPath)) {
          console.log("User selected template folder:", selectedPath);
          configManager.set("templatePath", selectedPath);
          return selectedPath;
        } else {
          // Invalid folder, show error and fallback
          await dialog.showMessageBox(mainWindow, {
            type: "warning",
            title: "Invalid Template Folder",
            message:
              "The selected folder does not contain required template files.",
            detail:
              "Required files: main.html, header.html, footer.html\n\n" +
              "Falling back to default templates.",
          });
        }
      }
    }

    // User chose default or canceled - copy bundled templates
    const defaultPath = await this.createFallbackTemplates();
    configManager.set("templatePath", defaultPath);
    return defaultPath;
  }

  /**
   * Validate that a folder contains required template files
   * @param {string} folderPath - Path to validate
   * @returns {boolean} True if valid
   */
  validateTemplateFolder(folderPath) {
    return !(!folderPath || !fs.existsSync(folderPath));
  }

  /**
   * Copy bundled templates to a writable location (userData/templates)
   * @returns {Promise<string>} Path to copied templates
   */
  async createFallbackTemplates() {
    const targetPath = path.join(app.getPath("userData"), "templates");

    try {
      // Create target directory if it doesn't exist
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      // Copy all files from bundled template folder
      const files = fs.readdirSync(this.bundledTemplatePath);

      for (const file of files) {
        const srcPath = path.join(this.bundledTemplatePath, file);
        const destPath = path.join(targetPath, file);

        // Only copy files, not directories
        const stat = fs.statSync(srcPath);
        if (stat.isFile()) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`Copied template file: ${file}`);
        } else if (stat.isDirectory()) {
          // Recursively copy directories (for assets like images, fonts)
          this.copyDirectoryRecursive(srcPath, destPath);
        }
      }

      console.log("Templates copied to:", targetPath);
      return targetPath;
    } catch (error) {
      console.error("Failed to copy templates:", error);
      // If copy fails, return bundled path as last resort
      // Note: This may be read-only in packaged app
      return this.bundledTemplatePath;
    }
  }

  /**
   * Recursively copy directory contents
   * @param {string} src - Source directory
   * @param {string} dest - Destination directory
   */
  copyDirectoryRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);

    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const stat = fs.statSync(srcPath);

      if (stat.isFile()) {
        fs.copyFileSync(srcPath, destPath);
      } else if (stat.isDirectory()) {
        this.copyDirectoryRecursive(srcPath, destPath);
      }
    }
  }

  /**
   * Get current template path
   * @returns {string} Current template directory path
   */
  getTemplatePath() {
    if (!this.userTemplatePath) {
      const config = configManager.get();
      return config.templatePath || this.bundledTemplatePath;
    }
    return this.userTemplatePath;
  }

  /**
   * Change template folder (allows user to reconfigure)
   * @param {BrowserWindow} mainWindow - Parent window for dialog
   * @returns {Promise<string>} New template path
   */
  async changeTemplateFolder(mainWindow) {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: "Select Template Folder",
      properties: ["openDirectory"],
      message: "Select a folder containing your PDF templates",
    });

    if (!canceled && filePaths && filePaths[0]) {
      const selectedPath = filePaths[0];

      if (this.validateTemplateFolder(selectedPath)) {
        console.log("Template folder changed to:", selectedPath);
        configManager.set("templatePath", selectedPath);
        this.userTemplatePath = selectedPath;
        return selectedPath;
      } else {
        await dialog.showMessageBox(mainWindow, {
          type: "error",
          title: "Invalid Template Folder",
          message:
            "The selected folder does not contain required template files.",
          detail:
            "Required files: main.html, header.html, footer.html\n\n" +
            "Template folder not changed.",
        });
      }
    }

    return this.getTemplatePath();
  }

  /**
   * Reset to default templates
   * @returns {Promise<string>} Path to default templates
   */
  async resetToDefaultTemplates() {
    const defaultPath = await this.createFallbackTemplates();
    configManager.set("templatePath", defaultPath);
    this.userTemplatePath = defaultPath;
    console.log("Reset to default templates:", defaultPath);
    return defaultPath;
  }

  /**
   * Open template folder in system file explorer
   */
  openTemplateFolder() {
    const { shell } = require("electron");
    const templatePath = this.getTemplatePath();
    if (fs.existsSync(templatePath)) {
      shell.openPath(templatePath);
    }
  }
}

// Export singleton instance
module.exports = new TemplateManager();
