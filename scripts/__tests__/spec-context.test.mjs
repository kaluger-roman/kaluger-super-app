import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
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


test('explicit missing slug fails before setup-plan can overwrite a sibling spec', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "spec context ' quote ")));
  try {
    execFileSync('git', ['init', '-q', dir]);
    mkdirSync(join(dir, '.specify/scripts/bash'), { recursive: true });
    mkdirSync(join(dir, '.specify/templates'), { recursive: true });
    mkdirSync(join(dir, 'specs/038-existing'), { recursive: true });
    for (const script of ['common.sh','setup-plan.sh','check-prerequisites.sh']) copyFileSync(resolve('.specify/scripts/bash',script),join(dir,'.specify/scripts/bash',script));
    const plan=join(dir,'specs/038-existing/plan.md');
    writeFileSync(plan,'Existing approved plan');
    writeFileSync(join(dir,'.specify/templates/plan-template.md'),'Template');
    for (const [script,args] of [['check-prerequisites.sh',['--json','--paths-only']],['setup-plan.sh',['--json']]]) {
      const result=spawnSync('/bin/bash',[join(dir,'.specify/scripts/bash',script),...args],{cwd:dir,env:{...process.env,SPECIFY_FEATURE:'038-missing'},encoding:'utf8'});
      assert.notEqual(result.status,0);assert.match(result.stderr,/Explicit feature directory not found/);assert.equal(readFileSync(plan,'utf8'),'Existing approved plan');
    }
    const actual=JSON.parse(execFileSync('/bin/bash',[join(dir,'.specify/scripts/bash/check-prerequisites.sh'),'--json','--paths-only'],{cwd:dir,env:{...process.env,SPECIFY_FEATURE:'038-existing'},encoding:'utf8'}));
    assert.equal(actual.FEATURE_DIR,join(dir,'specs/038-existing'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('ambiguous prefix returns failure with no misleading feature path', () => {
  const dir=mkdtempSync(join(tmpdir(),'spec-prefix-'));
  try {
    for (const name of ['039-one','039-two']) mkdirSync(join(dir,'specs',name),{recursive:true});
    const result=spawnSync('/bin/bash',['-c','source "$1"; find_feature_dir_by_prefix "$2" "$3"','_',common,dir,'039-other'],{encoding:'utf8'});
    assert.notEqual(result.status,0);assert.equal(result.stdout,'');assert.match(result.stderr,/SPECIFY_FEATURE/);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
