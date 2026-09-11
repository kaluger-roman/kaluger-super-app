const restrictedImportPatterns = [
    "../**/pages/**",
    "../**/features/**",
    "../**/app/**",
    "@shared/*/*",
    "@features/*/*/*",
    "@entities/*/*/*",
];

const styledMessage = "Use `styled` from @shared — it filters `$`-prefixed props.";
const restrictedImportPaths = [
    { name: "@mui/material", importNames: ["styled"], message: styledMessage },
    { name: "@mui/material/styles", importNames: ["styled"], message: styledMessage },
    { name: "@mui/system", importNames: ["styled"], message: styledMessage },
    { name: "@emotion/styled", message: styledMessage },
    { name: "styled-components", message: styledMessage },
];

const enumRule = {
    selector: "TSEnumDeclaration",
    message: "Use string literal union types instead of enums.",
};
const useUnitArrayRule = {
    selector: 'CallExpression[callee.name="useUnit"][arguments.0.type="ArrayExpression"]',
    message: "No useUnit([...]) — call useUnit per store, or pass an object of events.",
};
const emptyFileRules = [
    { selector: "Program[body.length=0]", message: "Empty file — delete it instead." },
    {
        selector:
            "Program > ExportNamedDeclaration[declaration=null][specifiers.length=0][source=null]",
        message: "Stub `export {}` — delete the file instead.",
    },
];
const modelNamedImportRule = {
    selector:
        'ImportDeclaration[importKind!="type"][source.value=/\\.model$/] > ImportSpecifier[importKind!="type"]',
    message: 'Import models as a namespace: import * as fooModel from "./foo.model".',
};
const timerMessage = "No raw timers in models — use `delay` / `interval` from patronum.";
const timerRules = [
    { selector: "CallExpression[callee.name=/^(setTimeout|setInterval)$/]", message: timerMessage },
    {
        selector:
            "CallExpression[callee.object.name=/^(window|globalThis)$/][callee.property.name=/^(setTimeout|setInterval)$/]",
        message: timerMessage,
    },
];
const restrictedSyntax = [enumRule, useUnitArrayRule, ...emptyFileRules, modelNamedImportRule];

module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: ["./tsconfig.json"],
    },
    plugins: ["@typescript-eslint", "import", "unused-imports", "testing-library", "effector"],
    extends: [
        "react-app",
        "react-app/jest",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/errors",
        "plugin:import/warnings",
        "plugin:jsx-a11y/recommended",
    ],
    settings: {
        "import/parsers": {
            "@typescript-eslint/parser": [".ts", ".tsx"],
        },
        "import/resolver": {
            typescript: {
                project: "./tsconfig.json",
                alwaysTryTypes: true,
            },
            node: {
                extensions: [".js", ".jsx", ".ts", ".tsx"],
            },
            alias: {
                map: [
                    ["@app", "./src/app"],
                    ["@pages", "./src/pages"],
                    ["@features", "./src/features"],
                    ["@entities", "./src/entities"],
                    ["@shared", "./src/shared"],
                    ["@components", "./src/components"],
                    ["@widgets", "./src/widgets"],
                ],
                extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
            },
        },
    },
    rules: {
        "no-restricted-imports": [
            "error",
            { patterns: restrictedImportPatterns, paths: restrictedImportPaths },
        ],

        "import/no-restricted-paths": [
            "error",
            {
                zones: [
                    {
                        target: "./src/shared",
                        from: "./src/shared/index.ts",
                        message:
                            "Do not import from @shared within shared layer. Use relative imports instead.",
                    },
                    {
                        target: "./src/entities",
                        from: "./src/entities/index.ts",
                        message:
                            "Do not import from @entities within entities layer. Use relative imports instead.",
                    },
                    {
                        target: "./src/shared",
                        from: "./src/entities",
                    },
                    {
                        target: "./src/shared",
                        from: "./src/features",
                    },
                    {
                        target: "./src/shared",
                        from: "./src/pages",
                    },
                    {
                        target: "./src/shared",
                        from: "./src/app",
                    },
                    {
                        target: "./src/entities",
                        from: "./src/features",
                    },
                    {
                        target: "./src/entities",
                        from: "./src/pages",
                    },
                    {
                        target: "./src/entities",
                        from: "./src/app",
                    },
                    {
                        target: "./src/features",
                        from: "./src/pages",
                    },
                    {
                        target: "./src/features",
                        from: "./src/app",
                    },
                ],
            },
        ],
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                args: "none",
                ignoreRestSiblings: true,
            },
        ],
        "unused-imports/no-unused-imports": "error",
        "unused-imports/no-unused-vars": [
            "warn",
            {
                vars: "all",
                varsIgnorePattern: "^_",
                args: "after-used",
                argsIgnorePattern: "^_",
            },
        ],
        "import/no-unused-modules": [
            1,
            {
                unusedExports: true,
                src: ["src/**"],
            },
        ],
        "import/order": [
            "error",
            {
                groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
                pathGroups: [
                    {
                        pattern: "react",
                        group: "external",
                        position: "before",
                    },
                ],
                pathGroupsExcludedImportTypes: ["react"],
                alphabetize: { order: "asc", caseInsensitive: true },
                "newlines-between": "always",
            },
        ],
        "testing-library/no-node-access": "off",
        "testing-library/no-container": "off",
        "import/no-default-export": "error",
        "func-style": ["error", "expression"],
        "@typescript-eslint/consistent-type-definitions": ["error", "type"],
        "@typescript-eslint/consistent-type-imports": ["error", { disallowTypeAnnotations: false }],
        "no-restricted-syntax": ["error", ...restrictedSyntax],
        "effector/enforce-store-naming-convention": "error",
        "effector/enforce-effect-naming-convention": "error",
        "effector/enforce-gate-naming-convention": "error",
        "effector/no-watch": "error",
        "effector/no-getState": "error",
        "effector/no-forward": "error",
        "effector/no-guard": "error",
        "effector/prefer-useUnit": "error",
        "react/forbid-component-props": [
            "error",
            {
                forbid: [
                    {
                        propName: "sx",
                        message: "No inline styles — use styled-components from @shared.",
                    },
                    {
                        propName: "style",
                        message: "No inline styles — use styled-components from @shared.",
                    },
                ],
            },
        ],
        "react/forbid-dom-props": [
            "error",
            {
                forbid: [
                    {
                        propName: "style",
                        message: "No inline styles — use styled-components from @shared.",
                    },
                ],
            },
        ],
        "jsx-a11y/no-autofocus": "off",
        "react/forbid-elements": [
            "error",
            {
                forbid: [
                    {
                        element: "form",
                        message: "No <form> tags — use explicit onClick handlers on buttons.",
                    },
                ],
            },
        ],
    },
    overrides: [
        {
            files: ["*.ts", "*.tsx"],
            rules: {
                "@typescript-eslint/no-explicit-any": "error",
                "@typescript-eslint/explicit-module-boundary-types": "off",
            },
        },
        {
            files: ["src/**/*.tsx"],
            excludedFiles: ["**/__tests__/**", "**/*.test.tsx"],
            rules: {
                "max-lines": ["error", { max: 150, skipBlankLines: true, skipComments: true }],
            },
        },
        {
            files: ["src/**/*.model.ts"],
            rules: {
                "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
                "no-restricted-syntax": ["error", ...restrictedSyntax, ...timerRules],
            },
        },
        {
            // The one place that wraps MUI's styled; everything else goes through it.
            files: ["src/shared/lib/styled.helpers.ts"],
            rules: {
                "no-restricted-imports": ["error", { patterns: restrictedImportPatterns }],
            },
        },
        {
            // CRA's react-app-env.d.ts is a bare `/// <reference>` — empty body by design.
            files: ["**/*.d.ts"],
            rules: {
                "no-restricted-syntax": "off",
            },
        },
        {
            // Tests reach into model internals directly; the namespace-import rule is prod-only.
            files: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
            rules: {
                "jsx-a11y/click-events-have-key-events": "off",
                "jsx-a11y/no-static-element-interactions": "off",
                "no-restricted-syntax": ["error", enumRule, useUnitArrayRule, ...emptyFileRules],
            },
        },
    ],
};
