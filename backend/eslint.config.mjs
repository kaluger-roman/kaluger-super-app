import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

const enumRule = {
  selector: "TSEnumDeclaration",
  message: "Use string literal union types instead of enums.",
};
const emptyFileRules = [
  { selector: "Program[body.length=0]", message: "Empty file — delete it instead." },
  {
    selector:
      "Program > ExportNamedDeclaration[declaration=null][specifiers.length=0][source=null]",
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
        enumRule,
        ...emptyFileRules,
        errorClassRule,
        prismaMockRule,
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
    // supertest's res.body and hand-rolled ws/jest mocks are typed `any`
    // upstream — banning `any` in tests would force churn without safety.
    files: ["src/**/__tests__/**/*.ts", "src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
