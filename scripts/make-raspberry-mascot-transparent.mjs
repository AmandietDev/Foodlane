import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(__dirname, "../public/equilibre/assistant-raspberry-mascot.png");
const TOLERANCE = 48;

function dist(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

const sample = (x, y) => {
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
};

const points = [
  [4, 4],
  [width - 5, 4],
  [4, height - 5],
  [width - 5, height - 5],
  [width >> 1, 6],
  [6, height >> 1],
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

console.log("Couleur de fond détectée:", bg);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    const px = [data[i], data[i + 1], data[i + 2]];
    if (dist(px, bg) <= TOLERANCE) {
      data[i + 3] = 0;
    }
  }
}

await sharp(data, { raw: { width, height, channels } }).png().toFile(input);
console.log("PNG mis à jour:", input);
