import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
const repository = resolve(root, '../..');
export const outputDirectory = join(root, 'dist/super-app-agents');
const pathTo = command => {
  try { return execFileSync('/usr/bin/which', [command], { encoding: 'utf8', timeout: 3000 }).trim(); }
  catch { return command; }
};

export const buildPlugin = async ({ outdir = outputDirectory, portableOutdir = join(dirname(outdir), 'portable/super-app-agents') } = {}) => {
  await rm(outdir, { recursive: true, force: true });
  await cp(join(root, 'super-app-agents'), outdir, { recursive: true });
  await mkdir(join(outdir, 'server'), { recursive: true });
  const [browser, styles] = await Promise.all([
    build({ entryPoints: [join(root, 'src/panel.mjs')], bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022', minify: true, legalComments: 'eof' }),
    build({ entryPoints: [join(root, 'src/panel.css')], bundle: true, write: false, minify: true, legalComments: 'eof' }),
  ]);
  let html = await readFile(join(root, 'src/panel.html'), 'utf8');
  html = html.replace('/* PANEL_SCRIPT */', () => browser.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'))
    .replace('/* PANEL_CSS */', () => styles.outputFiles[0].text);
  await writeFile(join(outdir, 'server/panel.html'), html);
  await build({
    entryPoints: [join(root, 'src/server.mjs')], outfile: join(outdir, 'server/server.mjs'), bundle: true,
    platform: 'node', format: 'esm', target: 'node20', minify: true, legalComments: 'eof',
    nodePaths: [join(root, 'node_modules')],
    banner: { js: "import { createRequire as _createRequire } from 'node:module';const require = _createRequire(import.meta.url);" },
  });
  // Node/gh/Codex are resolved on the authoring Mac. The runtime itself stays inside the installed package.
  const env = {
    SUPER_APP_REPO_ROOT: repository, SUPER_APP_REPOSITORY: 'kaluger-roman/kaluger-super-app',
    SUPER_APP_GH_PATH: pathTo('gh'), SUPER_APP_CODEX_PATH: pathTo('codex'),
  };
  for (const name of ['mcp.json', '.mcp.json']) {
    const file = join(outdir, name);
    const manifest = JSON.parse(await readFile(file, 'utf8'));
    manifest.mcpServers['super-app-agents'].command = process.execPath;
    manifest.mcpServers['super-app-agents'].env = env;
    await writeFile(file, JSON.stringify(manifest, null, 2) + '\n');
  }
  // Codex CLI 0.166 ignores stdio servers in the portable root manifest. Keep
  // the complete portable export separately; install the verified native overlay.
  await rm(portableOutdir, { recursive: true, force: true });
  await cp(outdir, portableOutdir, { recursive: true });
  await rm(join(outdir, 'plugin.json'));
  return outdir;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(await buildPlugin());
}
