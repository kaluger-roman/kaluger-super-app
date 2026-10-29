import fs from "fs";
import path from "path";

// A module mock (vi.mock / vi.doMock) replaces the module for the whole worker, so a file that
// mocks needs a module graph of its own. Every other test file shares one module graph per worker
// and loads MUI and the rest only once. `// @vitest-isolate` opts a file into isolation by hand.
const NEEDS_ISOLATION = /\bvi\.(mock|doMock)\(|@vitest-isolate/;
const TEST_FILE = /\.test\.tsx?$/;

const listTestFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTestFiles(full);
    return TEST_FILE.test(entry.name) ? [full] : [];
  });

// Unit tests of the e2e helpers live next to them (docs/conventions/e2e-testing.md).
const TEST_ROOTS = ["src", "e2e"];

export const splitTestFiles = (root: string): { isolated: string[]; shared: string[] } => {
  const files = TEST_ROOTS.flatMap((dir) => listTestFiles(path.join(root, dir))).map((file) =>
    path.relative(root, file)
  );
  const isolated = files.filter((file) =>
    NEEDS_ISOLATION.test(fs.readFileSync(path.join(root, file), "utf8"))
  );
  const shared = files.filter((file) => !isolated.includes(file));
  return { isolated, shared };
};
