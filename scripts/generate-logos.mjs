import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const source = path.join(root, "public/logo-source.png");
const TOLERANCE = 28;

function dist(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

async function loadWithTransparency(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const sample = (x, y) => {
    const i = (y * width + x) * channels;
    return [data[i], data[i + 1], data[i + 2]];
  };

  const points = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
  ];
  const bg = [0, 0, 0];
  for (const [x, y] of points) {
    const p = sample(x, y);
    bg[0] += p[0];
    bg[1] += p[1];
    bg[2] += p[2];
  }
  bg[0] = Math.round(bg[0] / points.length);
  bg[1] = Math.round(bg[1] / points.length);
  bg[2] = Math.round(bg[2] / points.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const px = [data[i], data[i + 1], data[i + 2]];
      if (dist(px, bg) <= TOLERANCE) {
        data[i + 3] = 0;
      }
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png();
}

async function writePng(pipeline, outPath, size) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  let img = pipeline.clone();
  if (size) {
    img = img.resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }
  await img.toFile(outPath);
  console.log("written:", path.relative(root, outPath));
}

const pipeline = await loadWithTransparency(source);

const outputs = [
  [path.join(root, "public/logo-app.png"), 512],
  [path.join(root, "public/logo.png"), 512],
  [path.join(root, "public/logo-icon.png"), 192],
  [path.join(root, "public/favicon-32x32.png"), 32],
  [path.join(root, "public/favicon-16x16.png"), 16],
  [path.join(root, "app/icon.png"), 512],
  [path.join(root, "app/apple-icon.png"), 180],
];

for (const [outPath, size] of outputs) {
  await writePng(pipeline, outPath, size);
}

console.log("Logo Foodlane généré.");
