# Configurations

The only configuration that the application currently has is the template folder path.
For the default config location, it uses the `userData` path provided by Electron. This path is cross-platform.

```javascript
app.getPath("userData");
```
