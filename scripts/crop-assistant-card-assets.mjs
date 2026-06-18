import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const assistantSrc = path.join(
  process.env.USERPROFILE,
  ".cursor/projects/c-Users-amand-OneDrive-Universit-de-Tours-Documents-foodlane-app/assets/c__Users_amand_AppData_Roaming_Cursor_User_workspaceStorage_1b5998b5ed6bd83909e47435c3d86644_images_image-88a454f5-958e-4085-a58b-ab1b100b7549.png"
);

const defiSrc = path.join(
  process.env.USERPROFILE,
  ".cursor/projects/c-Users-amand-OneDrive-Universit-de-Tours-Documents-foodlane-app/assets/c__Users_amand_AppData_Roaming_Cursor_User_workspaceStorage_1b5998b5ed6bd83909e47435c3d86644_images_image-d3129ef6-0f8d-4fb7-89bc-3daa8aada413.png"
);

const assistantOut = path.join(root, "public/home/assistant-card");
const defiOut = path.join(root, "public/equilibre/defi");
fs.mkdirSync(assistantOut, { recursive: true });
fs.mkdirSync(defiOut, { recursive: true });

await sharp(assistantSrc)
  .extract({ left: 0, top: 0, width: 178, height: 215 })
  .png()
  .toFile(path.join(assistantOut, "mascot.png"));

await sharp(assistantSrc)
  .extract({ left: 468, top: 48, width: 110, height: 130 })
  .png()
  .toFile(path.join(assistantOut, "arrow.png"));

const prompts = [
  { name: "diner", left: 592, top: 28, width: 168, height: 48 },
  { name: "lactose", left: 592, top: 84, width: 168, height: 48 },
  { name: "equilibre", left: 592, top: 140, width: 168, height: 48 },
];
for (const p of prompts) {
  await sharp(assistantSrc)
    .extract({ left: p.left, top: p.top, width: p.width, height: p.height })
    .png()
    .toFile(path.join(assistantOut, `prompt-${p.name}.png`));
}

await sharp(defiSrc)
  .extract({ left: 28, top: 28, width: 52, height: 52 })
  .png()
  .toFile(path.join(defiOut, "target-icon.png"));

console.log("done");
