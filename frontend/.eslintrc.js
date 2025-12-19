module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: ['./tsconfig.json'],
    },
    plugins: ['@typescript-eslint', 'import', 'unused-imports'],
    extends: ['plugin:@typescript-eslint/recommended', 'plugin:import/errors', 'plugin:import/warnings'],
    settings: {
        'import/resolver': {
            typescript: {
                project: './tsconfig.json',
            },
            alias: {
                map: [
                    ['@app', './src/app'],
                    ['@pages', './src/pages'],
                    ['@features', './src/features'],
                    ['@entities', './src/entities'],
                    ['@shared', './src/shared'],
                    ['@components', './src/components'],
                    ['@widgets', './src/widgets'],
                ],
                extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
            }
        },
    },
    rules: {
        'import/no-unused-modules': [
            'warning',
            {
                unusedExports: true,
                src: ['src/**'],
            },
        ],
    },
    overrides: [
        {
            files: ['*.ts', '*.tsx'],
            rules: {
                '@typescript-eslint/no-explicit-any': 'error',
                '@typescript-eslint/explicit-module-boundary-types': 'off',
            },
        },
    ],
};
