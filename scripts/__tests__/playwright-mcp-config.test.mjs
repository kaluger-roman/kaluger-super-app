// Guards scripts/playwright-mcp.config.json (issue #107). Run: node --test scripts/__tests__/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG = join(dirname(dirname(fileURLToPath(import.meta.url))), "playwright-mcp.config.json");

test("Playwright MCP launches Chromium with the fake camera and microphone", () => {
  const config = JSON.parse(readFileSync(CONFIG, "utf8"));
  const args = config.browser?.launchOptions?.args ?? [];

  assert.ok(args.includes("--use-fake-device-for-media-stream"));
  assert.ok(args.includes("--use-fake-ui-for-media-stream"));
});
