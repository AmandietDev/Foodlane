import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const src = path.join(
  process.env.USERPROFILE,
  ".cursor/projects/c-Users-amand-OneDrive-Universit-de-Tours-Documents-foodlane-app/assets/c__Users_amand_AppData_Roaming_Cursor_User_workspaceStorage_1b5998b5ed6bd83909e47435c3d86644_images_image-59676da6-92ec-46e2-870d-2aaab8e09849.png"
);

const outDir = path.join(root, "public/home/menu-hero");
fs.mkdirSync(outDir, { recursive: true });

const { width, height } = await sharp(src).metadata();

// Illustration bol + éléments flottants (droite, sans texte parasite)
await sharp(src)
  .extract({
    left: Math.floor(width * 0.48),
    top: Math.floor(height * 0.02),
    width: Math.floor(width * 0.52),
    height: Math.floor(height * 0.76),
  })
  .png()
  .toFile(path.join(outDir, "illustration.png"));

// Badges complets (coords px sur maquette 877×463)
const badges = [
  { name: "rapide", left: 36, top: 378, width: 118, height: 52 },
  { name: "liste", left: 160, top: 378, width: 178, height: 52 },
  { name: "equilibre", left: 368, top: 378, width: 108, height: 52 },
];

for (const badge of badges) {
  await sharp(src)
    .extract({
      left: badge.left,
      top: badge.top,
      width: badge.width,
      height: badge.height,
    })
    .png()
    .toFile(path.join(outDir, `badge-${badge.name}.png`));
}

console.log("done", { width, height });
