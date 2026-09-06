import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "eslint.config.mjs"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    plugins: {
      import: importPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "none",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { disallowTypeAnnotations: false },
      ],
      "import/no-default-export": "error",
      "func-style": ["error", "expression"],
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message: "Use string literal union types instead of enums.",
        },
      ],
    },
  },
  {
    files: ["src/controllers/**/*.ts"],
    ignores: ["src/controllers/**/__tests__/**"],
    rules: {
      "max-lines": [
        "error",
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // Grandfathered: over the 150-line limit before the rule landed.
    // Shrink opportunistically (extract to services), then remove from here.
    files: [
      "src/controllers/auth.ts",
      "src/controllers/lessons/createLesson.ts",
      "src/controllers/lessons/getLessons.ts",
      "src/controllers/lessons/updateLesson.ts",
      "src/controllers/statistics/getStatistics.ts",
    ],
    rules: {
      "max-lines": [
        "warn",
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // supertest's res.body and hand-rolled ws/jest mocks are typed `any`
    // upstream — banning `any` in tests would force churn without safety.
    files: ["src/**/__tests__/**/*.ts", "src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
