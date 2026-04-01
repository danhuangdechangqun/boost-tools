const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'resources', 'icons');
const svgPath = path.join(iconsDir, 'icon.svg');

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);

  // 主图标 256x256
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(path.join(iconsDir, 'icon.png'));

  // 窗口图标 64x64
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(iconsDir, 'window-icon.png'));

  // 托盘图标 32x32 (更小更清晰)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(iconsDir, 'tray.png'));

  console.log('图标生成完成！');
}

generateIcons().catch(console.error);