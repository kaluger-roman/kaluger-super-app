import eslint from "@eslint/js";
import checkFile from "eslint-plugin-check-file";
import importPlugin from "eslint-plugin-import";
import jest from "eslint-plugin-jest";
import tseslint from "typescript-eslint";

const enumRule = {
  selector: "TSEnumDeclaration",
  message: "Use string literal union types instead of enums.",
};
const emptyFileRules = [
  { selector: "Program[body.length=0]", message: "Empty file — delete it instead." },
  {
    selector:
      "Program[body.length=1] > ExportNamedDeclaration[declaration=null][specifiers.length=0][source=null]",
    message: "Stub `export {}` — delete the file instead.",
  },
];
const errorClassRule = {
  selector: 'ClassDeclaration[superClass.name="Error"], ClassExpression[superClass.name="Error"]',
  message: "Custom Error classes live in src/utils/errors.ts.",
};
const prismaMockRule = {
  selector:
    'CallExpression[callee.object.name="jest"][callee.property.name=/^(mock|doMock|unstable_mockModule)$/][arguments.0.value=/prisma/i]',
  message: "Do NOT mock Prisma — run against the test database.",
};
// Cyrillic-free literal in a response payload: `res.json({ error })` and the `message`
// object express-rate-limit sends as the body. Messages built elsewhere (template
// literals, service errors) stay review-checked.
const russianErrorMessage = "Error messages are in Russian (docs/conventions/backend.md).";
const cyrillicFreeErrorLiteral =
  'Property[key.name="error"] > Literal[value=/^[^\\u0400-\\u04FF]*$/]';
const russianErrorRules = [
  {
    selector: `CallExpression[callee.property.name="json"] ${cyrillicFreeErrorLiteral}`,
    message: russianErrorMessage,
  },
  {
    selector: `CallExpression[callee.name="rateLimit"] ${cyrillicFreeErrorLiteral}`,
    message: russianErrorMessage,
  },
];
const roleSuffixes = "types,helpers,constants,validators";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "eslint.config.mjs"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    plugins: {
      "check-file": checkFile,
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
        enumRule,
        ...emptyFileRules,
        errorClassRule,
        prismaMockRule,
        ...russianErrorRules,
      ],
      "check-file/filename-naming-convention": [
        "error",
        { "**/*.ts": "CAMEL_CASE" },
        { ignoreMiddleExtensions: true },
      ],
      "check-file/folder-naming-convention": [
        "error",
        { "src/**/": "@(__tests__|[a-z]*([a-zA-Z0-9]))" },
      ],
    },
  },
  {
    // Allowlist of role suffixes: whatever survives `ignores` has an unknown one.
    files: ["src/**/*.*.ts"],
    ignores: [`src/**/*.{${roleSuffixes},test,d}.ts`, "src/**/__tests__/**"],
    rules: {
      "check-file/filename-blocklist": [
        "error",
        { "**/*.ts": `<name>.{${roleSuffixes}}.ts` },
        {
          errorMessage: `"{{ target }}": use <name>.ts or <name>.{${roleSuffixes}}.ts`,
        },
      ],
    },
  },
  {
    // The one file allowed to declare `class X extends Error`.
    files: ["src/utils/errors.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        enumRule,
        ...emptyFileRules,
        prismaMockRule,
        ...russianErrorRules,
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
    files: ["src/**/__tests__/**/*.ts", "src/**/*.test.ts"],
    plugins: {
      jest,
    },
    rules: {
      // supertest's res.body and hand-rolled ws/jest mocks are typed `any`
      // upstream — banning `any` in tests would force churn without safety.
      "@typescript-eslint/no-explicit-any": "off",
      "jest/no-disabled-tests": "error",
      "jest/no-done-callback": "error",
      "jest/no-focused-tests": "error",
    },
  }
);
