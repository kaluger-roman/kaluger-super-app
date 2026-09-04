module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: ["./tsconfig.json"],
    },
    plugins: ["@typescript-eslint", "import", "unused-imports", "testing-library"],
    extends: [
        "react-app",
        "react-app/jest",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/errors",
        "plugin:import/warnings",
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
            {
                patterns: [
                    "../**/pages/**",
                    "../**/features/**",
                    "../**/app/**",
                    "@shared/*/*",
                    "@features/*/*/*",
                    "@entities/*/*/*",
                ],
            },
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
        "no-restricted-syntax": [
            "error",
            {
                selector: "TSEnumDeclaration",
                message: "Use string literal union types instead of enums.",
            },
        ],
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
    ],
};
