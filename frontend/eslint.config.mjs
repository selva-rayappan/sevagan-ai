import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  {
    // Pre-existing patterns from before this project had a lint config wired
    // up — downgraded to warnings so CI can be introduced without a rewrite
    // of unrelated pages; new violations still show up in review.
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];

export default eslintConfig;
