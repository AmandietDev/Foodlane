import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const assets = path.join(
  process.env.USERPROFILE,
  ".cursor/projects/c-Users-amand-OneDrive-Universit-de-Tours-Documents-foodlane-app/assets"
);

const copies = [
  {
    src: "c__Users_amand_AppData_Roaming_Cursor_User_workspaceStorage_1b5998b5ed6bd83909e47435c3d86644_images_image-ff851dc3-d3d6-4767-aa03-06e3f0606410.png",
    dest: "public/home/menu-hero/card-mockup.png",
  },
  {
    src: "c__Users_amand_AppData_Roaming_Cursor_User_workspaceStorage_1b5998b5ed6bd83909e47435c3d86644_images_image-834d4d0f-6cc1-4934-857d-3047f9806379.png",
    dest: "public/home/assistant-card/card-mockup.png",
  },
];

for (const { src, dest } of copies) {
  const out = path.join(root, dest);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(path.join(assets, src), out);
  console.log("copied", dest);
}
