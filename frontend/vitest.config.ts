import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

import { splitTestFiles } from "./vitest.isolation";

const testFiles = splitTestFiles(__dirname);
// The shared project runs its files in a random order; a failure there is reproduced with
// VITEST_SEED=<the printed seed>.
const shuffleSeed = Number(process.env.VITEST_SEED) || Date.now();
console.log(`vitest: shared project file order seed ${shuffleSeed}`);

export default defineConfig({
  plugins: [react()],
  test: {
    // Files that mock modules run isolated; the rest share a module graph per worker and run in
    // a random order, so a test that leaks state into the next file fails early (see
    // docs/conventions/frontend-testing.md, "Test isolation").
    projects: [
      { extends: true, test: { name: "isolated", include: testFiles.isolated } },
      {
        extends: true,
        test: {
          name: "shared",
          include: testFiles.shared,
          isolate: false,
          // Added to the root setupFiles (`extends: true` concatenates them).
          setupFiles: [path.resolve(__dirname, "./src/__tests__/sharedModels.setup.ts")],
          sequence: { shuffle: { files: true, tests: false }, seed: shuffleSeed },
        },
      },
    ],
    globals: true,
    environment: "happy-dom",
    setupFiles: [path.resolve(__dirname, "./src/__tests__/setup.ts")],
    css: true,
    exclude: [
      "node_modules/**",
      "dist",
      "e2e/**/*.spec.ts",
      "playwright-report/**",
      "test-results/**",
    ],
    deps: {
      optimizer: {
        web: {
          enabled: true,
          include: [
            "@mui/material",
            "@mui/icons-material",
            "@mui/system",
            "@mui/x-date-pickers",
            "@emotion/react",
            "@emotion/styled",
            "react-router-dom",
            "react-big-calendar",
            "effector-react",
            "patronum",
            "date-fns",
          ],
        },
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/__tests__/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData/",
        "src/index.tsx",
      ],
    },
  },
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "./src/app"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@features": path.resolve(__dirname, "./src/features"),
      "@entities": path.resolve(__dirname, "./src/entities"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@widgets": path.resolve(__dirname, "./src/widgets"),
    },
  },
});
