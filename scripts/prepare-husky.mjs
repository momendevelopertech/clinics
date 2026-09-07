import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

if (process.env.VERCEL !== "1" && process.env.CI !== "true" && existsSync(".git")) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  execFileSync(npx, ["husky"], { stdio: "inherit" });
}
