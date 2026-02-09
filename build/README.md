# Icon Assets

Place your app icons in this directory:

## Required Files

- `icon.icns` - macOS icon (512x512@2x recommended)
- `icon.ico` - Windows icon (256x256 with multiple sizes)
- `icon.png` - Linux icon (512x512 or 1024x1024)

## Quick Setup

### Option 1: Use electron-icon-builder (Automated)

1. Install the tool:
   ```bash
   npm install -g electron-icon-builder
   ```

2. Place a 1024x1024 PNG source image here as `icon.png`

3. Run from project root:
   ```bash
   electron-icon-builder --input=./build/icon.png --output=./build
   ```

### Option 2: Manual Creation

1. **For macOS (.icns)**:
   - Use an online converter or macOS `iconutil`
   - Must contain 512x512@1x and 512x512@2x (1024x1024)

2. **For Windows (.ico)**:
   - Use an online converter or tools like ImageMagick
   - Should contain multiple sizes: 16, 32, 48, 64, 128, 256

3. **For Linux (.png)**:
   - Simple PNG file, 512x512 or larger
   - Transparent background recommended

## Useful Tools

- **Online Converters**:
  - https://iconverticons.com/online/
  - https://cloudconvert.com/
  - https://anyconv.com/png-to-ico-converter/

- **Desktop Tools**:
  - ImageMagick (command-line)
  - GIMP (free, cross-platform)
  - Icon Slate (macOS)
  - IcoFX (Windows)

## Testing

After adding icons, rebuild your app:
```bash
pnpm run dist
```

The icons should appear in the built application.
