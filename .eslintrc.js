module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    'no-param-reassign': 0,
    'no-continue': 0,
    'no-restricted-syntax': 0,
    'guard-for-in': 0,
    'no-use-before-define': 0,
    'no-console': 0,
  },
};
