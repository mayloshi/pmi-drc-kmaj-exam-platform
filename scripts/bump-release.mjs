import { readFile, writeFile } from "node:fs/promises";

const pagePath = new URL("../app/page.tsx", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);
const today = new Date().toISOString().slice(0, 10);

function bumpPatch(version) {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Unsupported version format: ${version}`);
  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

const page = await readFile(pagePath, "utf8");
const current = page.match(/const VERSION = "v([^"]+)";/);
if (!current) throw new Error("VERSION constant not found in app/page.tsx");

const nextVersion = bumpPatch(current[1]);
const nextPage = page
  .replace(/const VERSION = "v[^"]+";/, `const VERSION = "v${nextVersion}";`)
  .replace(/const UPDATED_AT = "[^"]+";/, `const UPDATED_AT = "${today}";`);

await writeFile(pagePath, nextPage);

const pkg = JSON.parse(await readFile(packagePath, "utf8"));
pkg.version = nextVersion;
await writeFile(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(`Prepared release v${nextVersion} (${today})`);
