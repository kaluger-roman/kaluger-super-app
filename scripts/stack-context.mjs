#!/usr/bin/env node
// Checkout identity, shared by dev and QA stacks, including detached Codex worktrees.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const hash = (value) => createHash("sha256").update(value).digest("hex").slice(0, 12);

const ensureLegacyRegistryEmpty = (common) => {
  const registry = join(common, "dev-stack-ports.json");
  let slots;
  try {
    slots = JSON.parse(readFileSync(registry, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return;
  }
  if (!slots || Array.isArray(slots) || typeof slots !== "object" || Object.keys(slots).length > 0) {
    throw new Error(`Найден непустой или некорректный старый реестр портов: ${registry}. Остановите старые Node.js dev-серверы и все старые Compose-проекты dev-* через прежний checkout; используйте Compose без -v для сохранения данных. Затем архивируйте этот реестр вне Git-каталога или удалите его. Не перезапускайте прежний scripts/dev-stack.sh.`);
  }
};

export const stackContext = (cwd = process.cwd()) => {
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  const root = realpathSync(git("rev-parse", "--show-toplevel"));
  const common = realpathSync(git("rev-parse", "--path-format=absolute", "--git-common-dir"));
  const label = basename(root).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "checkout";
  return { root, common, id: `${label}-${hash(root)}`, branch: git("branch", "--show-current") || "detached" };
};

// mkdir is atomic on macOS/Linux. Never discard a corrupt registry or steal a live lock.
export const allocateSlot = ({ common, id }, release = false) => {
  // The old allocator cannot see local slots, so reserving its slots cannot isolate both versions.
  if (!release) ensureLegacyRegistryEmpty(common);
  const registry = join(common, "local-stack-ports.json");
  const lock = `${registry}.lock`;
  const deadline = Date.now() + 10000;
  for (;;) {
    try { mkdirSync(lock); break; } catch (error) {
      if (error.code !== "EEXIST") throw error;
      if (Date.now() >= deadline) throw new Error(`Port registry is locked: ${lock}. Check other setup processes before removing a stale lock.`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  try {
    const slots = existsSync(registry) ? JSON.parse(readFileSync(registry, "utf8")) : {};
    if (!slots || Array.isArray(slots) || typeof slots !== "object" ||
        Object.values(slots).some((slot) => !Number.isInteger(slot) || slot < 1 || slot > 999) ||
        new Set(Object.values(slots)).size !== Object.values(slots).length) {
      throw new Error(`Invalid port registry: ${registry}`);
    }
    if (release) delete slots[id];
    else if (!Object.hasOwn(slots, id)) {
      const used = new Set(Object.values(slots));
      let slot = 1;
      while (used.has(slot)) slot += 1;
      if (slot > 999) throw new Error("No free dev stack slots");
      slots[id] = slot;
    }
    const temporary = `${registry}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(slots, null, 2)}\n`, { mode: 0o600 });
    renameSync(temporary, registry);
    return slots[id];
  } finally {
    rmdirSync(lock);
  }
};

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const context = stackContext();
    const command = process.argv[2];
    if (command === "id") console.log(context.id);
    else if (command === "slot") console.log(allocateSlot(context));
    else if (command === "release") allocateSlot(context, true);
    else throw new Error("Usage: node scripts/stack-context.mjs id|slot|release");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
