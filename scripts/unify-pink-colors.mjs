import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../app");

const REPLACEMENTS = [
  ["#D44A4A", "#E94E77"],
  ["#C03A3A", "#D63D56"],
  ["#E94E67", "#E94E77"],
  ["#E8A0A0", "var(--beige-border)"],
  ["border-[#E8A0A0]", "border-[var(--beige-border)]"],
];

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name !== "node_modules" && name !== ".next") walk(p, files);
    } else if (/\.(tsx?|css)$/.test(name)) {
      files.push(p);
    }
  }
  return files;
}

let changed = 0;
for (const file of walk(root)) {
  let text = fs.readFileSync(file, "utf8");
  let next = text;
  for (const [from, to] of REPLACEMENTS) {
    next = next.split(from).join(to);
  }
  if (next !== text) {
    fs.writeFileSync(file, next, "utf8");
    changed++;
    console.log("updated:", path.relative(root, file));
  }
}
console.log(`Done. ${changed} files updated.`);
