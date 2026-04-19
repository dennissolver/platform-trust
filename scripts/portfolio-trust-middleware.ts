/**
 * Wire Platform Trust into a portfolio project.
 *
 * Drops a small `lib/platform-trust.ts` stub that re-exports
 * @caistech/platform-trust-middleware. The heavy implementation lives in
 * the published package — this script no longer emits a 200-line template.
 *
 * Per-consumer setup still requires (outside this script):
 *   1. Add `@caistech:registry=https://npm.pkg.github.com` to the project's .npmrc
 *   2. npm install @caistech/platform-trust-middleware@^0.2.0
 *      (or pnpm add, per the project's package manager)
 *   3. Set env vars: PLATFORM_TRUST_SUPABASE_URL, PLATFORM_TRUST_SERVICE_KEY,
 *      PLATFORM_TRUST_PROJECT_ID.
 *
 * See AUDIT_RESULTS_2026-04.md §7.16 for the canonical migration pattern.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "fs";
import { join, dirname } from "path";

const BASE = "C:/Users/denni/PycharmProjects";

const PROJECTS: Array<{ dir: string; libPath: string }> = [
  // Next.js projects with src/lib or lib or apps/frontend/lib
  { dir: "MMCBuild", libPath: "src/lib/platform-trust.ts" },
  { dir: "easy-claude-code", libPath: "apps/frontend/lib/platform-trust.ts" },
  { dir: "storefront-mcp", libPath: "lib/platform-trust.ts" },
  { dir: "gbta-openclaw", libPath: "src/lib/platform-trust.ts" },
  { dir: "F2K-Checkpoint-Latest", libPath: "src/lib/platform-trust.ts" },
  { dir: "DealFindrs", libPath: "src/lib/platform-trust.ts" },
  { dir: "Tenderwatch", libPath: "src/lib/platform-trust.ts" },
  { dir: "SmartBoard", libPath: "src/lib/platform-trust.ts" },
  { dir: "Connexions", libPath: "src/lib/platform-trust.ts" },
  { dir: "LaunchReady", libPath: "src/lib/platform-trust.ts" },
  { dir: "property-services", libPath: "src/lib/platform-trust.ts" },
  { dir: "Kira", libPath: "src/lib/platform-trust.ts" },
  { dir: "coordination", libPath: "src/lib/platform-trust.ts" },
  { dir: "agentic-os", libPath: "lib/platform-trust.ts" },
  { dir: "raiseready-core", libPath: "src/lib/platform-trust.ts" },
  { dir: "TourLingo", libPath: "src/lib/platform-trust.ts" },
  { dir: "LeadSpark", libPath: "src/lib/platform-trust.ts" },
  { dir: "HouseSitAgent", libPath: "src/lib/platform-trust.ts" },
  { dir: "NDISSDAAutomate", libPath: "src/lib/platform-trust.ts" },
  { dir: "universal-interviews", libPath: "src/lib/platform-trust.ts" },
  { dir: "RaiseReadyTemplate", libPath: "lib/platform-trust.ts" },
];

function getStub(projectSlug: string): string {
  return `/**
 * Platform Trust integration for ${projectSlug}.
 *
 * Re-export shim: the real implementation lives in
 * @caistech/platform-trust-middleware (published to GitHub Packages).
 * This file exists so existing call sites like
 *   import { trustGate, trustLog, trustMeter } from '@/lib/platform-trust'
 * continue to work unchanged.
 *
 * Required runtime env vars:
 *   PLATFORM_TRUST_SUPABASE_URL
 *   PLATFORM_TRUST_SERVICE_KEY
 *   PLATFORM_TRUST_PROJECT_ID
 *
 * Install prerequisites (one-off per project):
 *   1. Add \`@caistech:registry=https://npm.pkg.github.com\` to .npmrc
 *   2. npm install @caistech/platform-trust-middleware@^0.2.0
 */

export {
  trustGate,
  trustLog,
  trustMeter,
} from '@caistech/platform-trust-middleware';

export type {
  TrustContext,
  TrustGateResult,
} from '@caistech/platform-trust-middleware';
`;
}

function main() {
  let created = 0;
  let skipped = 0;
  let existing = 0;
  const pendingInstall: string[] = [];

  for (const project of PROJECTS) {
    const root = join(BASE, project.dir);
    if (!existsSync(root)) {
      console.log(`  skip: ${project.dir} (not found)`);
      skipped++;
      continue;
    }

    const targetPath = join(root, project.libPath);

    if (existsSync(targetPath)) {
      console.log(`  exists: ${project.dir} (${project.libPath})`);
      existing++;
      continue;
    }

    const dir = dirname(targetPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const slug = project.dir.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    writeFileSync(targetPath, getStub(slug));
    console.log(`  create: ${project.dir} → ${project.libPath}`);
    created++;
    pendingInstall.push(project.dir);
  }

  console.log(`\nDone: ${created} created, ${existing} already existed, ${skipped} skipped`);

  if (pendingInstall.length > 0) {
    console.log(`\nNext: in each of the ${pendingInstall.length} repos below, run:`);
    console.log(`  echo '@caistech:registry=https://npm.pkg.github.com' >> .npmrc`);
    console.log(`  npm install @caistech/platform-trust-middleware@^0.2.0 --legacy-peer-deps`);
    console.log(`  (or pnpm add @caistech/platform-trust-middleware@^0.2.0 for pnpm projects)\n`);
    for (const dir of pendingInstall) console.log(`  - ${dir}`);
  }
}

main();
