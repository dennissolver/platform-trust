import { supabaseAdmin } from "../lib/supabase";

async function main() {
  // List existing
  const { data: existing } = await supabaseAdmin.from("projects").select("id, slug").order("slug");
  console.log("Existing projects:", existing?.map((p: { slug: string }) => p.slug).join(", "));

  // Add missing
  const needed = [
    { name: "MMC Build", slug: "mmc-build" },
    { name: "Platform Trust", slug: "platform-trust" },
    { name: "OpenClaw", slug: "openclaw" },
    { name: "SmartBoard", slug: "smartboard" },
    { name: "Kira", slug: "kira" },
    { name: "Universal Interviews", slug: "universal-interviews" },
  ];

  const existingSlugs = new Set(existing?.map((p: { slug: string }) => p.slug) || []);

  for (const p of needed) {
    if (existingSlugs.has(p.slug)) {
      console.log(`  exists: ${p.slug}`);
      continue;
    }
    const { error } = await supabaseAdmin.from("projects").insert(p);
    console.log(error ? `  error: ${p.slug} — ${error.message}` : `  added: ${p.slug}`);
  }

  // Verify
  const { data: final } = await supabaseAdmin.from("projects").select("id, slug").order("slug");
  console.log("\nFinal projects:", final?.map((p: { slug: string }) => p.slug).join(", "));
}

main().catch(console.error);
