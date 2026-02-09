const { app } = require("electron");
const fs = require("fs");
const path = require("path");

class ConfigManager {
  constructor() {
    this.configDir = app.getPath("userData");
    this.configPath = path.join(this.configDir, "config.json");
    this.config = null;
  }

  /**
   * Load configuration from disk
   * Creates default config if file doesn't exist
   * @returns {Object} Configuration object
   */
  load() {
    try {
      //  1: Ensure config directory exists
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      //  2: Load existing config if it exists
      const configExists = fs.existsSync(this.configPath);
      if (configExists) {
        const data = fs.readFileSync(this.configPath, "utf8");
        this.config = JSON.parse(data);
        return this.config;
      }

      //  3: Create default configuration if file doesn't exist
      this.config = this.getDefaultConfig();
      this.save();

      return this.config;
    } catch (error) {
      // Return default config on error
      console.error("Failed to load config:", error);
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }

  /**
   * Save current configuration to disk
   * @returns {boolean} Success status
   */
  save() {
    try {
      //  1: Ensure directory exists
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      //  2: Write config to file
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        "utf8",
      );
      return true;
    } catch (error) {
      console.error("Failed to save config:", error);
      return false;
    }
  }

  /**
   * Get default configuration
   * @returns {Object} Default config object
   */
  getDefaultConfig() {
    return {
      templatePath: null,
      firstRun: true,
    };
  }

  /**
   * Get current configuration
   * @returns {Object} Current config
   */
  get() {
    if (!this.config) {
      this.load();
    }
    return this.config;
  }

  /**
   * Set a configuration value
   * @param {string} key - Config key
   * @param {*} value - Config value
   * @returns {boolean} Success status
   */
  set(key, value) {
    if (!this.config) {
      this.load();
    }
    this.config[key] = value;
    return this.save();
  }

  /**
   * Get configuration file path
   * @returns {string} Path to config.json
   */
  getConfigPath() {
    return this.configPath;
  }
}

module.exports = new ConfigManager();
