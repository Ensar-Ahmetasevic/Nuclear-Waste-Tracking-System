import js from '@eslint/js';
import globals from 'globals';
import next from '@next/eslint-plugin-next';
export default [
  { ignores: ['.next/**', '.next-test/**', 'node_modules/**', '.local/**'] },
  js.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser }, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { '@next/next': next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      'no-dupe-keys': 'error',
      'no-sequences': ['error', { allowInParentheses: false }],
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
    },
  },
];
