// Flat ESLint config (ESLint 9). Linting is scoped to the booking API and
// tests — the static HTML/inline scripts predate this toolchain and are out of scope.
export default [
  {
    files: ['api/**/*.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'off',
      'prefer-const': 'error',
      'eqeqeq': 'error',
    },
  },
  {
    ignores: ['node_modules/**', '*.html'],
  },
];
