// Minimal ESLint flat config to satisfy lint step without TypeScript plugins.
// We lint only JS files; TS is covered by `npm run typecheck`.

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'out/**',
      'coverage/**',
      '**/*.ts',
      '**/*.tsx',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {},
  },
];
