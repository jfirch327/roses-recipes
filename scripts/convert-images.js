#!/usr/bin/env node
/**
 * Convert Grandma Rose's handwritten recipe HEIC photos to web-ready JPG and WebP,
 * at two sizes each (full-view and thumbnail).
 *
 * Source:  Recipes/Hand Written Recipes/*.HEIC
 * Target:  src/assets/images/recipes/
 *
 * Run:     npm run convert-images
 */

const fs = require("fs");
const path = require("path");
const heicConvert = require("heic-convert");
const sharp = require("sharp");

const SOURCE_DIR = path.join(__dirname, "..", "Recipes", "Hand Written Recipes");
const TARGET_DIR = path.join(__dirname, "..", "src", "assets", "images", "recipes");

const FULL_WIDTH = 1600;
const THUMB_WIDTH = 640;
const JPG_QUALITY = 82;
const WEBP_QUALITY = 80;

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function convertOne(filename) {
  const base = filename.replace(/\.(heic|HEIC)$/i, "").toLowerCase();
  const inputPath = path.join(SOURCE_DIR, filename);

  const heicBuffer = await fs.promises.readFile(inputPath);
  const jpegBuffer = await heicConvert({
    buffer: heicBuffer,
    format: "JPEG",
    quality: 0.92
  });

  const outputs = [
    { width: FULL_WIDTH, suffix: "", fmt: "jpg" },
    { width: FULL_WIDTH, suffix: "", fmt: "webp" },
    { width: THUMB_WIDTH, suffix: "-thumb", fmt: "jpg" },
    { width: THUMB_WIDTH, suffix: "-thumb", fmt: "webp" }
  ];

  for (const out of outputs) {
    const outPath = path.join(TARGET_DIR, `${base}${out.suffix}.${out.fmt}`);
    let pipeline = sharp(jpegBuffer)
      .rotate()
      .resize({ width: out.width, withoutEnlargement: true });

    if (out.fmt === "jpg") {
      pipeline = pipeline.jpeg({ quality: JPG_QUALITY, mozjpeg: true });
    } else {
      pipeline = pipeline.webp({ quality: WEBP_QUALITY });
    }

    await pipeline.toFile(outPath);
  }

  return base;
}

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }
  await ensureDir(TARGET_DIR);

  const files = (await fs.promises.readdir(SOURCE_DIR))
    .filter((f) => /\.heic$/i.test(f))
    .sort();

  if (files.length === 0) {
    console.log("No HEIC files found.");
    return;
  }

  console.log(`Converting ${files.length} handwritten recipe image(s):`);
  for (const file of files) {
    process.stdout.write(`  ${file} ... `);
    try {
      const base = await convertOne(file);
      console.log(`ok (${base}.jpg / .webp / -thumb.jpg / -thumb.webp)`);
    } catch (err) {
      console.log(`FAILED`);
      console.error(`    ${err.message}`);
    }
  }

  console.log("\nTranscription checklist:");
  for (const file of files) {
    const base = file.replace(/\.(heic|HEIC)$/i, "").toLowerCase();
    console.log(`  [ ] ${base} -> assign category, transcribe, save as src/recipes/<category>/<slug>.md`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
