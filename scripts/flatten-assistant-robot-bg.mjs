import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

/** Couleur de fond d’origine du PNG robot (échantillonnée sur les bords). */
export const ASSISTANT_ROBOT_BG = { r: 254, g: 250, b: 249 };
export const ASSISTANT_ROBOT_BG_HEX = "#FEFAF9";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(__dirname, "../public/landing/assistant-robot.png");

const tmp = `${input}.tmp.png`;
await sharp(input)
  .flatten({ background: ASSISTANT_ROBOT_BG })
  .png()
  .toFile(tmp);

const fs = await import("fs");
fs.renameSync(tmp, input);

console.log("PNG aplati sur", ASSISTANT_ROBOT_BG_HEX);
