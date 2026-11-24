import { spawnSync } from "node:child_process";
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const [pluginDir = "../plugin"] = process.argv.slice(2);
const vencordDir = process.cwd();
const lintDir = join(vencordDir, "src", "plugins", "rayward-lint");
const configPath = join(vencordDir, ".oxlintrc.rayward.json");

const raw = readFileSync(join(vencordDir, ".oxlintrc.json"), "utf8")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/,(\s*[}\]])/g, "$1");
const config = JSON.parse(raw);

delete config.options;
config.jsPlugins = config.jsPlugins.filter(plugin => plugin.name !== "path-alias");
for (const scope of [config, ...(config.overrides ?? [])]) {
    for (const rule of Object.keys(scope.rules ?? {})) {
        if (rule.startsWith("path-alias/")) delete scope.rules[rule];
    }
}
writeFileSync(configPath, JSON.stringify(config, null, 2));

const skip = new Set([".git", ".github", "docs"]);
cpSync(resolve(pluginDir), lintDir, {
    recursive: true,
    filter: source => !skip.has(source.split(/[\\/]/).pop()),
});

let status = 1;
try {
    const result = spawnSync("pnpm", ["exec", "oxlint", "-c", configPath, lintDir], { stdio: "inherit", shell: process.platform === "win32" });
    status = result.status ?? 1;
} finally {
    rmSync(lintDir, { recursive: true, force: true });
    rmSync(configPath, { force: true });
}
process.exit(status);
