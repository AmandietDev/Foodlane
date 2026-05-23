import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

void (async () => {
  const secret = process.env.ADMIN_CACHE_SECRET;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  if (!secret) {
    console.error("❌  ADMIN_CACHE_SECRET manquant dans .env.local");
    process.exit(1);
  }

  console.log(`→ Appel de ${appUrl}/api/admin/clear-cache …`);

  const res = await fetch(`${appUrl}/api/admin/clear-cache`, {
    method: "POST",
    headers: { "x-admin-secret": secret },
  });

  const json = await res.json().catch(() => ({}));

  if (json.ok) {
    console.log("✅  Cache vidé :", json.cleared?.join(", "));
  } else {
    console.error("❌  Échec :", json.error ?? res.status);
    process.exit(1);
  }
})();
