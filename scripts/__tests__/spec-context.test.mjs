import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const common = resolve('.specify/scripts/bash/common.sh');
test('exact spec name wins when historical numeric prefixes are duplicated', () => {
  const dir = mkdtempSync(join(tmpdir(), 'spec context '));
  try {
    for (const name of ['039-call-fullscreen', '039-video-call-background']) mkdirSync(join(dir, 'specs', name), { recursive: true });
    const found = execFileSync('bash', ['-c', 'source "$1"; find_feature_dir_by_prefix "$2" "$3"', '_', common, dir, '039-call-fullscreen'], { encoding: 'utf8' }).trim();
    assert.equal(found, join(dir, 'specs', '039-call-fullscreen'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
