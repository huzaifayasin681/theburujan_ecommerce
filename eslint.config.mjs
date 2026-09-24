import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
export default [
  { ignores: ['**/node_modules/**','**/dist/**','**/.next/**','**/coverage/**','**/*.d.ts','**/*.config.js'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } }, globals: { ...globals.node, ...globals.browser, ...globals.jest } },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: { ...tsPlugin.configs.recommended.rules, '@typescript-eslint/no-explicit-any': 'error', '@typescript-eslint/no-unused-vars': ['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}], 'no-undef':'off' },
  },
];
