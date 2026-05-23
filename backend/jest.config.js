module.exports = {
    testEnvironment: "node",
    roots: ["<rootDir>/src"],
    testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
    transform: {
        "^.+\\.(t|j)sx?$": [
            "@swc/jest",
            {
                jsc: {
                    target: "es2022",
                    parser: {
                        syntax: "typescript",
                        decorators: true,
                    },
                    transform: {
                        decoratorMetadata: true,
                        legacyDecorator: true,
                    },
                    experimental: {
                        plugins: [
                            ["@swc-contrib/mut-cjs-exports", {}],
                        ],
                    },
                },
                module: {
                    type: "commonjs",
                },
            },
        ],
    },
    collectCoverageFrom: [
        "src/**/*.ts",
        "!src/**/*.d.ts",
        "!src/index.ts",
        "!src/types/**",
    ],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
};
