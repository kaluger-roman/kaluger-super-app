import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('setup creates private local env once, without exposing keys or overwriting existing config', () => {
  const dir = mkdtempSync(join(tmpdir(), 'local env '));
  try {
    mkdirSync(join(dir, 'scripts'));
    mkdirSync(join(dir, 'backend', 'node_modules', 'web-push'), { recursive: true });
    mkdirSync(join(dir, 'backend', 'node_modules', 'bcryptjs'), { recursive: true });
    writeFileSync(join(dir, 'backend', 'node_modules', 'web-push', 'index.js'), 'exports.generateVAPIDKeys = () => ({publicKey:"public-test",privateKey:"private-test"});');
    writeFileSync(join(dir, 'backend', 'node_modules', 'bcryptjs', 'index.js'), 'exports.hashSync = () => "$2b$test";');
    copyFileSync('scripts/setup-local-env.mjs', join(dir, 'scripts', 'setup-local-env.mjs'));
    const output = execFileSync(process.execPath, [join(dir, 'scripts', 'setup-local-env.mjs')], { encoding: 'utf8' });
    const env = join(dir, 'backend', '.env');
    const content = readFileSync(env, 'utf8');
    assert.equal(statSync(env).mode & 0o777, 0o600);
    assert.match(content, /DATABASE_URL='postgresql:\/\/dev:dev@127\.0\.0\.1:1\/use_dev_stack_wrapper'/);
    assert.match(content, /RESEND_API_KEY='re_local_dummy'/);
    const keys = [...content.matchAll(/(?:^|\n)(?:JWT_SECRET|ADMIN_JWT_SECRET|STUDENT_JWT_SECRET)='([a-f0-9]{64})'/g)].map((m) => m[1]);
    assert.equal(new Set(keys).size, 3);
    for (const key of [...keys, 'private-test']) assert.ok(!output.includes(key));
    writeFileSync(env, '# user-owned config\nCUSTOM=value\n');
    execFileSync(process.execPath, [join(dir, 'scripts', 'setup-local-env.mjs')]);
    assert.equal(readFileSync(env, 'utf8'), '# user-owned config\nCUSTOM=value\n');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
