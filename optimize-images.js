const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, 'images');
const OUTPUT_DIR = path.join(__dirname, 'images', 'optimized');

const HERO_IMAGES = ['轮放1.jpg', '轮放2.jpg', '轮放3.jpg', '轮放4.jpg'];
const CONTENT_IMAGES = ['房湖公园.jpg', '金雁湖.jpg', '牛杂火锅.jpg', '城市概况.jpg'];

const HERO_WIDTHS = [400, 800, 1200, 1920];
const CONTENT_WIDTHS = [400, 800, 1200];

const WEBP_OPTIONS = { quality: 80, effort: 6 };
const AVIF_OPTIONS = { quality: 70, effort: 7 };

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function processImage(filename, widths, isHero = false) {
  const inputPath = path.join(INPUT_DIR, filename);
  const basename = path.parse(filename).name;

  if (!fs.existsSync(inputPath)) {
    console.warn(`⚠️  文件不存在: ${filename}`);
    return;
  }

  console.log(`\n📷 处理: ${filename}`);

  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    console.log(`   原图: ${metadata.width}x${metadata.height} ${(metadata.size / 1024).toFixed(1)}KB`);

    for (const width of widths) {
      if (width >= metadata.width) continue;

      const outName = `${basename}-${width}w`;
      
      // WebP
      const webpPath = path.join(OUTPUT_DIR, `${outName}.webp`);
      await image
        .clone()
        .resize({ width, withoutEnlargement: true })
        .webp(WEBP_OPTIONS)
        .toFile(webpPath);
      const webpStat = fs.statSync(webpPath);
      console.log(`   ✅ ${outName}.webp: ${width}w ${(webpStat.size / 1024).toFixed(1)}KB`);

      // AVIF (更小，可选)
      const avifPath = path.join(OUTPUT_DIR, `${outName}.avif`);
      await image
        .clone()
        .resize({ width, withoutEnlargement: true })
        .avif(AVIF_OPTIONS)
        .toFile(avifPath);
      const avifStat = fs.statSync(avifPath);
      console.log(`   ✅ ${outName}.avif: ${width}w ${(avifStat.size / 1024).toFixed(1)}KB`);
    }
  } catch (err) {
    console.error(`   ❌ 处理失败: ${err.message}`);
  }
}

async function main() {
  console.log('🚀 开始批量优化图片...\n');
  console.log('='.repeat(50));

  for (const img of HERO_IMAGES) {
    await processImage(img, HERO_WIDTHS, true);
  }

  for (const img of CONTENT_IMAGES) {
    await processImage(img, CONTENT_WIDTHS, false);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✨ 所有图片处理完成！');
  console.log(`📁 输出目录: ${OUTPUT_DIR}`);
  
  // 统计总大小
  const files = fs.readdirSync(OUTPUT_DIR);
  const totalSize = files.reduce((sum, f) => sum + fs.statSync(path.join(OUTPUT_DIR, f)).size, 0);
  console.log(`📊 优化后总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB (${files.length} 个文件)`);
}

main().catch(console.error);