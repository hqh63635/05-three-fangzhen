module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: ['plugin:vue/essential', '@vue/airbnb', 'plugin:prettier/recommended'],
  parserOptions: {
    parser: '@babel/eslint-parser',
  },
  settings: {
    'import/resolver': {
      webpack: {
        config: {
          resolve: {
            modules: ['node_modules'],
          },
        },
      },
    },
  },
  rules: {
    'prettier/prettier': 'off',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': 'warn',
    'import/extensions': [
      'warn',
      'always',
      {
        js: 'never',
        vue: 'never',
      },
    ],
    'space-before-function-paren': 0,
    'object-curly-newline': 'off',
    'global-require': 0,
    'linebreak-style': 'off',
    'func-names': ['error', 'never'],
    'no-plusplus': 'off',
    'no-prototype-builtins': 'off',
    'no-param-reassign': 'off',
    'no-underscore-dangle': 'off',
    'no-alert': 'error',
    radix: ['error', 'as-needed'],
    'no-nested-ternary': 'off',
    'no-use-before-define': ['error', { functions: false, classes: true }],
    'no-unused-expressions': ['error', { allowShortCircuit: true }],
    'no-restricted-globals': 'off',
    'vuejs-accessibility/form-control-has-label': 'off',
    'vuejs-accessibility/click-events-have-key-events': 'off',
    'vuejs-accessibility/media-has-caption': 'off',
    'no-bitwise': 'off',
    'default-param-last': 'off',
    'import/no-cycle': 'off',
    'vuejs-accessibility/mouse-events-have-key-events': 'off',
  },
};
