import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  // 全局忽略
  { ignores: ['dist', 'electron-dist', 'coverage', '**/*.tsbuildinfo', 'vite.config.d.ts'] },

  js.configs.recommended,

  // 1) 应用源码（浏览器环境）
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    rules: {
      ...tseslint.configs.strict.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // TS 项目交给 tsc 做未定义检查，关闭核心规则避免 React/JSX 误报
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // 1-b) physics/ 纯函数层：禁止 React/DOM 依赖（铁律2）
  {
    files: ['src/physics/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'react', message: 'physics/ 禁止依赖 React（铁律2：纯函数可序列化）' },
          { name: 'react-dom', message: 'physics/ 禁止依赖 DOM（铁律2：纯函数可序列化）' },
          { name: 'react-dom/server', message: 'physics/ 禁止依赖 DOM（铁律2：纯函数可序列化）' },
        ],
      }],
    },
  },

  // 1-c) 禁止硬编码颜色（铁律1-1）
  // 作用域仅限页面/组件层；src/theme/ 是颜色 token 的 SSOT，其字面量 hex 属合法定义。
  // 存量违规由 .eslint-suppressions.json 冻结（B1 基线抑制），新增违规立即报错。
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: 'Literal[value=/^#[0-9A-Fa-f]{3,8}$/]',
        message: '禁止硬编码颜色，请改用主题 token（PHYSICS_COLORS / SCENE_COLORS / CHART_COLORS）',
      }],
    },
  },

  // 2) 构建/工具配置文件（Node 环境）
  {
    files: ['*.config.{ts,js,mjs}', 'vite.config.ts', 'vitest.config.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      'no-undef': 'off',
    },
  },

  // 2-b) Node 脚本（ESM .mjs）
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // 3) 测试文件（vitest / playwright 全局 + 放宽 any）
  {
    files: ['tests/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, ...globals.vitest },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
