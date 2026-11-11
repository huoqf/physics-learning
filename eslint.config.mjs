import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  // 全局忽略
  { ignores: ['dist', 'electron-dist', 'coverage', '**/*.tsbuildinfo', 'vite.config.d.ts', '.shots', '.shots/**', '.check-dist*/**'] },

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
      // 禁止从 @/components/UI 导入已隔离的公式组件（防止 KaTeX CSS 模块级副作用渗透首屏）
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: '@/components/UI',
            importNames: ['KatexFormula', 'PhysicsPanel'],
            message: 'KatexFormula 与 PhysicsPanel 已独立至 @/components/Formula，禁止从 @/components/UI 导入（防止 KaTeX 污染首屏）。',
          },
        ],
      }],
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
  // 覆盖 src/ 全域（早期只覆盖 features/ 与 components/，导致 data/ 与 physics/ 成盲区：
  // 2026-11-02 审计在 data/quantities 里抓到 19 处 hex、physics/ 里抓到 10 处）。
  // src/theme/ 是颜色 token 的 SSOT，其字面量 hex 属合法定义，排除。
  // 测试文件测的就是十六进制解析，排除。
  // 存量违规由 suppressions 基线冻结（`npx eslint . --suppress-all` 维护），新增违规立即报错。
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/theme/**', '**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
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
  // ecmaVersion 必须 ≥ 2022：`probe-seg-wrap.mjs` 等质检脚本用顶层 await 起 Playwright 浏览器，
  // 2020 下解析直接失败（"Cannot use keyword 'await' outside an async function"）。
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // 2-c) Playwright 质检脚本：`page.evaluate()` 的回调体在**浏览器上下文**里执行，
  // 里面的 `document` / `getComputedStyle` 是合法的浏览器全局，不是 Node 全局。
  // 新增用 Playwright 的质检脚本时，务必把文件名加进这份清单。
  {
    files: ['scripts/probe-seg-wrap.mjs', 'scripts/check-runtime-ui.mjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
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
