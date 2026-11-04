#!/usr/bin/env node
// Bash owns local feature discovery; Node performs literal, atomic file updates.
import { randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const START = "<!-- SPECIFY:GENERATED:START -->";
const END = "<!-- SPECIFY:GENERATED:END -->";
const MANUAL_START = "<!-- MANUAL ADDITIONS START -->";
const MANUAL_END = "<!-- MANUAL ADDITIONS END -->";

export const AGENT_FILES = {
  claude: "CLAUDE.md",
  gemini: "GEMINI.md",
  copilot: ".github/agents/copilot-instructions.md",
  "cursor-agent": ".cursor/rules/specify-rules.mdc",
  qwen: "QWEN.md",
  opencode: "AGENTS.md",
  codex: "AGENTS.md",
  windsurf: ".windsurf/rules/specify-rules.md",
  kilocode: ".kilocode/rules/specify-rules.md",
  auggie: ".augment/rules/specify-rules.md",
  roo: ".roo/rules/specify-rules.md",
  codebuddy: "CODEBUDDY.md",
  qoder: "QODER.md",
  amp: "AGENTS.md",
  shai: "SHAI.md",
  q: "AGENTS.md",
  agy: ".agent/rules/specify-rules.md",
  bob: "AGENTS.md",
};

const readOptional = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const parsePlan = (plan) => {
  const field = (name) => {
    const value = plan.match(new RegExp(`^\\*\\*${escapeRegExp(name)}\\*\\*:[ \t]*(.*?)[ \t]*$`, "m"))?.[1]?.trim() || "";
    return !value || value === "N/A" || value.includes("NEEDS CLARIFICATION") || /^\[.*\]$/.test(value)
      ? ""
      : value;
  };
  return {
    language: field("Language/Version"),
    dependencies: field("Primary Dependencies"),
    storage: field("Storage"),
    projectType: field("Project Type"),
  };
};

// Refuse damaged/duplicate markers instead of guessing which human text to replace.
const locateBlock = (text, start, end) => {
  const starts = text.split(start).length - 1;
  const ends = text.split(end).length - 1;
  if (starts === 0 && ends === 0) return null;
  const first = text.indexOf(start);
  const last = text.indexOf(end);
  if (starts !== 1 || ends !== 1 || last < first) {
    throw new Error(`Malformed or duplicate managed markers: ${start}`);
  }
  return { start: first, end: last + end.length, text: text.slice(first, last + end.length) };
};

const sectionItems = (block, name) => {
  const match = block.match(new RegExp(`^#{2,3} ${escapeRegExp(name)}\\r?\\n([\\s\\S]*?)(?=^#{2,3} |^<!--|$(?![\\s\\S]))`, "m"));
  return match ? match[1].split(/\r?\n/).filter((line) => line.startsWith("- ")) : [];
};

const commandsFor = (root, language) => {
  if (existsSync(join(root, "scripts/dev-stack.sh"))) {
    const commands = ["- `bash scripts/dev-stack.sh ports` — current checkout URLs and ports"];
    if (existsSync(join(root, "backend"))) commands.push("- `bash scripts/dev-stack.sh test-backend [jest args]`");
    if (existsSync(join(root, "frontend"))) commands.push("- `npm --prefix frontend test -- [path]`");
    if (existsSync(join(root, "package.json"))) commands.push("- `npm run check` — changed frontend/backend checks");
    return commands.join("\n");
  }
  if (/Python/i.test(language)) return "- `pytest`\n- `ruff check .`";
  if (/Rust/i.test(language)) return "- `cargo test`\n- `cargo clippy`";
  if (/JavaScript|TypeScript/i.test(language)) return "- Use the existing package.json test/lint scripts in the target package.";
  return "- Use the project commands documented outside this generated block.";
};

const structureFor = (root, projectType) => {
  const directories = ["backend", "frontend", "landing", "tests", "scripts"].filter((name) => existsSync(join(root, name)));
  if (directories.length) return directories.map((name) => `${name}/`).join("\n");
  return /web/i.test(projectType) ? "backend/\nfrontend/\ntests/" : "src/\ntests/";
};

export const renderContext = ({ root, planPath, feature, data, previous = "", template, date }) => {
  const managed = locateBlock(previous, START, END);
  const oldBlock = managed?.text || "";
  const stack = [data.language, data.dependencies].filter(Boolean).join(" + ");
  const technologies = sectionItems(oldBlock, "Active Technologies");
  for (const value of [stack, data.storage].filter(Boolean)) {
    if (!technologies.some((line) => line === `- ${value}` || line.startsWith(`- ${value} (`))) {
      technologies.push(`- ${value} (${feature})`);
    }
  }
  const summary = [stack, data.storage].filter(Boolean).join("; ");
  const recent = sectionItems(oldBlock, "Recent Changes").filter((line) => !summary || !line.startsWith(`- ${feature}:`));
  if (summary) recent.unshift(`- ${feature}: Added ${summary}`);
  const values = {
    "[PROJECT NAME]": basename(root),
    "[DATE]": date,
    "[PLAN PATH]": relative(root, planPath).split(sep).join("/"),
    "[FEATURE]": feature,
    "[EXTRACTED FROM ALL PLAN.MD FILES]": [...new Set(technologies)].join("\n") || "No resolved technology fields in the active plan.",
    "[ACTUAL STRUCTURE FROM PLANS]": structureFor(root, data.projectType),
    "[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES]": commandsFor(root, data.language),
    "[LANGUAGE-SPECIFIC, ONLY FOR LANGUAGES IN USE]": "Follow AGENTS.md and the applicable docs/conventions/ file; feature plans do not override project rules.",
    "[LAST 3 FEATURES AND WHAT THEY ADDED]": recent.slice(0, 3).join("\n") || "No resolved technology changes.",
  };
  let block = template.trimEnd();
  for (const [key, value] of Object.entries(values)) block = block.split(key).join(value);
  const generated = locateBlock(block, START, END);
  if (!generated || generated.start !== 0 || generated.end !== block.length) {
    throw new Error("Agent template must contain exactly one complete managed block");
  }
  // Legacy manual additions can be outside the managed block (already preserved)
  // or inside it; in the latter case carry the exact manual section forward.
  const manual = locateBlock(oldBlock, MANUAL_START, MANUAL_END);
  if (manual) block = block.replace(END, `${manual.text}\n${END}`);
  if (managed) return previous.slice(0, managed.start) + block + previous.slice(managed.end);
  return previous + (previous ? (previous.endsWith("\n") ? "\n" : "\n\n") : "") + block + "\n";
};

const ensureWithinRoot = (root, path) => {
  let ancestor = existsSync(path) ? path : dirname(path);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const resolved = realpathSync(ancestor);
  const offset = relative(root, resolved);
  if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
    throw new Error(`Context target escapes the checkout: ${path}`);
  }
  if (existsSync(path) && (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink())) {
    throw new Error(`Context target must be a regular file, not a symlink: ${path}`);
  }
};

export const updateAgentContexts = ({ root, planPath, feature, agent = "", date }) => {
  root = realpathSync(root);
  planPath = resolve(planPath);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(feature) || feature === "HEAD") {
    throw new Error("Set SPECIFY_FEATURE to the exact feature slug; detached HEAD is not a feature identity");
  }
  if (agent && !Object.hasOwn(AGENT_FILES, agent)) throw new Error(`Unknown agent type '${agent}'; expected ${Object.keys(AGENT_FILES).join("|")}`);
  ensureWithinRoot(root, planPath);
  if (!existsSync(planPath)) throw new Error(`No plan.md found at ${planPath}`);
  planPath = realpathSync(planPath);
  const data = parsePlan(readFileSync(planPath, "utf8"));
  const templatePath = join(root, ".specify/templates/agent-file-template.md");
  if (!existsSync(templatePath)) throw new Error(`Template not found: ${templatePath}`);
  const template = readFileSync(templatePath, "utf8");
  let targets = agent ? [AGENT_FILES[agent]] : [...new Set(Object.values(AGENT_FILES))].filter((path) => existsSync(join(root, path)));
  if (!targets.length) targets = [AGENT_FILES.codex];
  // Validate and prepare every target before touching the first one.
  const updates = targets.map((path) => {
    const target = join(root, path);
    ensureWithinRoot(root, target);
    const before = readOptional(target);
    const content = renderContext({ root, planPath, feature, data, previous: before, template, date });
    return { target, before, content };
  });
  for (const { target, before, content } of updates) {
    if (content === before) continue;
    mkdirSync(dirname(target), { recursive: true });
    const temporary = join(dirname(target), `.specify-context-${randomUUID()}.tmp`);
    try {
      const mode = existsSync(target) ? lstatSync(target).mode & 0o777 : 0o644;
      writeFileSync(temporary, content, { encoding: "utf8", flag: "wx", mode });
      if (readOptional(target) !== before) throw new Error(`Context changed during update; retry after inspection: ${target}`);
      renameSync(temporary, target);
    } finally {
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  }
  return { feature, plan: planPath, files: updates.map(({ target, before, content }) => ({ path: target, changed: content !== before })) };
};

const main = () => {
  const [root, planPath, feature, agent = ""] = process.argv.slice(2);
  if (!root || !planPath || !feature) throw new Error("Use .specify/scripts/bash/update-agent-context.sh [agent_type]");
  // Use the machine/user's local date rather than silently changing to UTC.
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  process.stdout.write(`${JSON.stringify(updateAgentContexts({ root, planPath, feature, agent, date }), null, 2)}\n`);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`update-agent-context: ${error.message}\n`);
    process.exitCode = 1;
  }
}
