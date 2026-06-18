import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const src = path.join(
  process.env.USERPROFILE,
  ".cursor/projects/c-Users-amand-OneDrive-Universit-de-Tours-Documents-foodlane-app/assets/c__Users_amand_AppData_Roaming_Cursor_User_workspaceStorage_1b5998b5ed6bd83909e47435c3d86644_images_image-c9350e1c-563a-4df2-a08f-8fd324648297.png"
);

const outDir = path.join(root, "public/home/quick-actions");
fs.mkdirSync(outDir, { recursive: true });

const { width, height } = await sharp(src).metadata();
const cardW = Math.floor(width / 4);

// Zone icône en haut à gauche de chaque carte (proportions maquette)
const iconW = Math.floor(cardW * 0.42);
const iconH = Math.floor(height * 0.38);
const leftPad = Math.floor(cardW * 0.14);
const topPad = Math.floor(height * 0.14);

const names = ["preferences", "carnet", "favoris", "recettes"];

for (let i = 0; i < 4; i++) {
  const left = i * cardW + leftPad;
  await sharp(src)
    .extract({ left, top: topPad, width: iconW, height: iconH })
    .png()
    .toFile(path.join(outDir, `icon-${names[i]}.png`));
  console.log("written", names[i], left, topPad, iconW, iconH);
}

console.log("done", { width, height, cardW });
