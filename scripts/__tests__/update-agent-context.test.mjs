import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AGENT_FILES, parsePlan, updateAgentContexts } from "../../.specify/scripts/node/update-agent-context.mjs";

const checkout = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const script = join(checkout, ".specify/scripts/bash/update-agent-context.sh");
const start = "<!-- SPECIFY:GENERATED:START -->";
const end = "<!-- SPECIFY:GENERATED:END -->";
let root;
let planPath;
const plan = (language = "TypeScript 5.9", dependencies = "React + Express", storage = "PostgreSQL") =>
  `# Plan\n\n**Language/Version**: ${language}\n**Primary Dependencies**: ${dependencies}\n**Storage**: ${storage}\n**Project Type**: web\n`;
const update = (options = {}) => updateAgentContexts({ root, planPath, feature: "042-context", date: "2026-11-04", agent: "codex", ...options });
const context = () => readFileSync(join(root, "AGENTS.md"), "utf8");

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), "agent context ' with spaces-")));
  mkdirSync(join(root, ".specify/templates"), { recursive: true });
  copyFileSync(join(checkout, ".specify/templates/agent-file-template.md"), join(root, ".specify/templates/agent-file-template.md"));
  mkdirSync(join(root, "specs/042-context"), { recursive: true });
  planPath = join(root, "specs/042-context/plan.md");
  writeFileSync(planPath, plan());
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

test("preserves all human instructions byte-for-byte and is idempotent", () => {
  const prefix = "# Human rules\r\nНе трогать `home`, $literal и \\ paths.\r\n";
  const suffix = "\n<!-- MANUAL ADDITIONS START -->\nKeep this exactly.\n<!-- MANUAL ADDITIONS END -->\nTail without newline";
  writeFileSync(join(root, "AGENTS.md"), `${prefix}${start}\nold generated text\n${end}${suffix}`);
  update();
  assert.equal(context().slice(0, prefix.length), prefix);
  assert.equal(context().slice(-suffix.length), suffix);
  assert.match(context(), /TypeScript 5\.9 \+ React \+ Express/);
  assert.match(context(), /PostgreSQL/);
  const first = context();
  assert.equal(update().files[0].changed, false);
  assert.equal(context(), first);
});

test("adds a block without altering legacy content and preserves nested manual additions", () => {
  const original = "# Legacy\n## Active Technologies\nUser notes\n<!-- MANUAL ADDITIONS START -->\nCustom rule\n<!-- MANUAL ADDITIONS END -->";
  writeFileSync(join(root, "AGENTS.md"), original);
  update();
  assert.ok(context().startsWith(original));
  assert.equal(context().split("Custom rule").length, 2);
  const manual = "<!-- MANUAL ADDITIONS START -->\r\nEmbedded rule\r\n<!-- MANUAL ADDITIONS END -->";
  writeFileSync(join(root, "AGENTS.md"), `prefix\n${start}\n${manual}\n${end}\ntail`);
  update();
  assert.ok(context().includes(manual));
  assert.ok(context().startsWith("prefix\n"));
  assert.ok(context().endsWith("\ntail"));
});

test("keeps technology history, avoids duplicate technologies and limits recent features to three", () => {
  for (let index = 1; index <= 4; index += 1) {
    writeFileSync(planPath, plan(`TypeScript ${index}`, "React", "PostgreSQL"));
    update({ feature: `04${index}-feature` });
  }
  const text = context();
  assert.equal((text.match(/^- PostgreSQL \(/gm) || []).length, 1);
  assert.match(text, /TypeScript 1 \+ React/);
  const recent = text.split("### Recent Changes")[1];
  assert.doesNotMatch(recent, /041-feature/);
  assert.match(recent, /044-feature:[\s\S]*043-feature:[\s\S]*042-feature:/);
  assert.equal((recent.match(/^- /gm) || []).length, 3);
});

test("skips unresolved plan fields without reading the following header as a value", () => {
  assert.deepEqual(parsePlan(plan("", "NEEDS CLARIFICATION", "N/A")), {
    language: "", dependencies: "", storage: "", projectType: "web",
  });
  writeFileSync(planPath, plan("", "NEEDS CLARIFICATION", "N/A"));
  update();
  assert.doesNotMatch(context(), /NEEDS CLARIFICATION|\*\*Primary Dependencies\*\*/);
});

test("rejects damaged markers before writing any existing target", () => {
  const agents = "Human rules\n";
  const claude = `Human rules\n${start}\nunclosed`;
  writeFileSync(join(root, "AGENTS.md"), agents);
  writeFileSync(join(root, "CLAUDE.md"), claude);
  assert.throws(() => update({ agent: "" }), /Malformed or duplicate/);
  assert.equal(context(), agents);
  assert.equal(readFileSync(join(root, "CLAUDE.md"), "utf8"), claude);
});

test("supports every original agent name and defaults to Codex without creating Claude files", () => {
  const first = update({ agent: "" });
  assert.deepEqual(first.files.map(({ path }) => path), [join(root, "AGENTS.md")]);
  assert.equal(existsSync(join(root, "CLAUDE.md")), false);
  for (const [agent, file] of Object.entries(AGENT_FILES)) {
    const result = update({ agent });
    assert.deepEqual(result.files.map(({ path }) => path), [join(root, file)]);
    assert.ok(readFileSync(join(root, file), "utf8").includes(start));
  }
  const all = update({ agent: "" });
  assert.equal(all.files.length, new Set(Object.values(AGENT_FILES)).size);
  assert.equal(all.files.filter(({ path }) => path === join(root, "AGENTS.md")).length, 1);
});

test("rejects unknown agents, missing plans, detached identities and symlink targets", () => {
  assert.throws(() => update({ agent: "made-up" }), /Unknown agent/);
  assert.throws(() => update({ planPath: join(root, "missing/plan.md") }), /No plan.md/);
  assert.throws(() => update({ feature: "HEAD" }), /feature identity/);
  writeFileSync(join(root, "target.md"), "untouched");
  symlinkSync(join(root, "target.md"), join(root, "AGENTS.md"));
  assert.throws(() => update(), /regular file/);
  assert.equal(readFileSync(join(root, "target.md"), "utf8"), "untouched");
});

test("Bash 3.2 entrypoint resolves exact SPECIFY_FEATURE in a local checkout with quotes/spaces", () => {
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root });
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(join(root, "scripts/dev-stack.sh"), "#!/bin/bash\n");
  mkdirSync(join(root, "frontend"));
  mkdirSync(join(root, "backend"));
  writeFileSync(join(root, "package.json"), "{}\n");
  const result = spawnSync("/bin/bash", [script, "codex"], {
    cwd: root, env: { ...process.env, SPECIFY_FEATURE: "042-context" }, encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.feature, "042-context");
  assert.equal(output.plan, planPath);
  assert.match(context(), /bash scripts\/dev-stack.sh test-backend/);
  assert.match(context(), /npm --prefix frontend test/);
  assert.doesNotMatch(context(), /ssh |npm test &&/);
});

test("explicit feature identity never falls back to another directory with the same prefix", () => {
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root });
  const result = spawnSync("/bin/bash", [script, "codex"], {
    cwd: root, env: { ...process.env, SPECIFY_FEATURE: "042-missing" }, encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No plan.md/);
  assert.equal(existsSync(join(root, "AGENTS.md")), false);
});
