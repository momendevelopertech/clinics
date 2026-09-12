import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

if (process.env.VERCEL !== "1" && process.env.CI !== "true" && existsSync(".git")) {
  execSync(process.platform === "win32" ? "npx.cmd husky" : "npx husky", {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}
