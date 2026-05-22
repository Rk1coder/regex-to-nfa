const { cpSync, existsSync, mkdirSync, rmSync } = require("node:fs");
const { resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const root = resolve(__dirname, "..");
const source = resolve(root, "artifacts/thompson-nfa-studio/dist/public");
const target = resolve(root, "public");

const build = spawnSync(
  "pnpm",
  ["--filter", "@workspace/thompson-nfa-studio", "run", "build"],
  {
    cwd: root,
    env: { ...process.env, BASE_PATH: process.env.BASE_PATH ?? "/" },
    shell: process.platform === "win32",
    stdio: "inherit",
  },
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

if (!existsSync(resolve(source, "index.html"))) {
  console.error(`Vite output was not found at ${source}`);
  process.exit(1);
}

rmSync(target, { force: true, recursive: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

if (!existsSync(resolve(target, "index.html"))) {
  console.error(`Vercel output was not created at ${target}`);
  process.exit(1);
}
