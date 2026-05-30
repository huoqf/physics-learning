# 修复计划：ESLint 迁移 + 动画注册表重构

> 归属里程碑：[M2] 力学完善 + 导航系统（质量闸门与架构治理）
> 关联问题：#BUG-002（ESLint flat config 迁移）、#BUG-003（动画注册表双映射不一致）

---

## 问题 1：ESLint 9 flat config 迁移（分环境多 block）

### 步骤 1.1：申报 `globals` 依赖

> 根据 `CORE_RULES.md §3`，新增 npm 包必须先在 `PROCESS_LOG.md` 申报。

在 `docs/agent-rules/process/PROCESS_LOG.md` 的「依赖申报记录」表中追加一行：

| 日期 | 申报人 | 包名 | 用途说明 | 批准状态 | 批准人 |
|------|--------|------|---------|---------|--------|
| 2026-05-30 | agent | globals | ESLint flat config 中声明 browser/node 全局变量 | ✅ 批准 | - |

### 步骤 1.2：安装 `globals`

```bash
npm install --save-dev globals
```

### 步骤 1.3：创建 `eslint.config.mjs`（分环境多 block）

新建文件 `eslint.config.mjs`（使用 `.mjs` 以匹配项目 `"type": "module"`）：

```js
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  // 忽略
  {
    ignores: ['dist'],
  },
  // JS 基础推荐规则
  js.configs.recommended,
  // ===== src/ 源码（浏览器环境） =====
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // TS 项目应关掉核心 no-undef，交给 TS 编译器处理
      'no-undef': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  // ===== 配置文件（Node 环境） =====
  {
    files: ['*.config.{ts,js,mjs}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  // ===== 测试文件（Vitest 环境，放宽规则） =====
  {
    files: ['tests/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...{
          describe: 'readonly',
          it: 'readonly',
          test: 'readonly',
          expect: 'readonly',
          beforeAll: 'readonly',
          afterAll: 'readonly',
          beforeEach: 'readonly',
          afterEach: 'readonly',
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      // 测试文件允许使用 any
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // ===== 题目数据文件（KaTeX 字符串，允许反斜杠转义） =====
  {
    files: ['src/data/problems/**/*.{ts,tsx}'],
    rules: {
      'no-useless-escape': 'off',
    },
  },
];
```

关键设计决策：
- **分三个 block**：`src/`（browser）、`*.config.*`（node）、`tests/`（vitest）——每个环境有独立的 globals
- **关掉 `no-undef`**：TS 项目标准做法，交给 `@typescript-eslint/no-undef` 处理
- **测试文件放宽 `@typescript-eslint/no-explicit-any`**：测试中 mock 等场景经常需要 any

### 步骤 1.4：删除旧配置

删除 `.eslintrc.cjs`。

### 步骤 1.5：修复 lint 脚本

`package.json` 中 `lint` 脚本的 `--ext ts,tsx` 是 ESLint 8 及更早版本的参数，ESLint 9 已移除。改为：

```json
"lint": "eslint . --report-unused-disable-directives --max-warnings 0"
```

### 步骤 1.6：题目数据文件 KaTeX 转义豁免

`src/data/problems/**` 中的 KaTeX 字符串包含 `\\sim`、`\\frac` 等转义序列，ESLint 的 `no-useless-escape` 会误报。已在步骤 1.3 的 config 中通过专用 block 关闭该规则，无需修改数据文件。

---

## 问题 2 & 3：合并动画注册表与组件映射 + 解决代码分包

### 根因分析

当前有两份独立的动画→组件映射：

| 位置 | 格式 | 是否使用 |
|---|---|---|
| `animationRegistry.ts` | `componentPath` 字符串字段 | 死数据，无人读取 |
| `AnimationPage.tsx:L171-196` | 手写 `animationComponents` 对象 | 实际使用 |

不一致导致 `anim-impulse` 的 `componentPath` 指向不存在的 `ImpulseAnimation`，而 `AnimationPage` 实际映射到 `MomentumTheoremAnimation`。

注意：`features/mechanics/index.ts` 第 25 行已经存在别名转接：
```ts
export { default as ImpulseAnimation } from './MomentumTheoremAnimation'
```
这是 #2 的临时 workaround，但不能解决根本问题。

### 分包问题

`HomePage.tsx` 和 `KnowledgePage.tsx` 都 import `animationRegistry`，但只是为了 `Object.keys(...).length` 数个数。如果直接在 registry 中 import 24 个真实组件，会导致首页/知识树页被迫加载全部动画组件（含 framer-motion 等），加剧 676KB 单包问题。

### 修复策略

**使用 `React.lazy` 作为 Component 字段值**——既消除双映射（单一数据源），又实现按需加载（解决分包）。一举两得。

### 步骤 2.1：更新 `AnimationConfig` 类型（`src/data/types.ts`）

- 顶部新增 `import type React from 'react'`
- 将 `componentPath: string` 替换为 `Component: React.LazyExoticComponent<React.ComponentType<any>>`

```ts
import type React from 'react'

export interface AnimationConfig {
  id: string
  title: string
  knowledgeId: string
  Component: React.LazyExoticComponent<React.ComponentType<unknown>>
  defaultParams: Record<string, number>
}
```

使用 `LazyExoticComponent` 而非直接 `ComponentType`，明确这是一个懒加载引用，不会在 import 时触发代码加载。

### 步骤 2.2：创建动画总数常量

新建 `src/data/animationCount.ts`（轻量元数据文件，无组件依赖）：

```ts
export const ANIMATION_COUNT = 24
```

### 步骤 2.3：重写 `animationRegistry.ts`

- 顶部导入 `import type React from 'react'`
- 将所有 `componentPath: '@/features/mechanics/xxx'` 替换为 `Component: React.lazy(() => import('@/features/mechanics/XxxAnimation'))`
- 修复 `anim-impulse`，将其 `Component` 指向 `React.lazy(() => import('@/features/mechanics/MomentumTheoremAnimation'))`
- 注册表不再 import `@/features/mechanics` 的组件（全部用 lazy import），避免首页被牵连

### 步骤 2.4：修改 `AnimationPage.tsx`

- 删除手写 `animationComponents` 静态对象（L171-196）
- 删除 `import * as MechanicsAnimations from '@/features/mechanics'`
- `config` 从 `getAnimationConfig(id)` 获取，类型已包含 `Component` 字段（React.LazyExoticComponent）
- 渲染时直接使用 `config.Component`（React.lazy 组件可直接当 JSX 渲染）
- 检查逻辑改为 `if (!config || !config.Component)`

### 步骤 2.5：修改 `HomePage.tsx` 和 `KnowledgePage.tsx`

两处都 import `animationRegistry` 只是为了 `Object.keys(animationRegistry).length`。改为：

```ts
import { ANIMATION_COUNT } from '@/data/animationCount'
```

将 `Object.keys(animationRegistry).length` 替换为 `ANIMATION_COUNT`。

删除对 `animationRegistry` 的 import。

### 步骤 2.6：清理 `features/mechanics/index.ts`

删除第 25 行的别名转接：
```ts
export { default as ImpulseAnimation } from './MomentumTheoremAnimation'
```

### 步骤 2.7：影响分析

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `src/data/types.ts` | 修改 | `componentPath` → `Component: React.LazyExoticComponent`，新增 `import type React` |
| `src/data/animationCount.ts` | 新增 | 轻量常量，解耦首页对 registry 的依赖 |
| `src/data/animationRegistry.ts` | 重写 | 字符串路径 → `React.lazy()` 动态导入 |
| `src/pages/AnimationPage.tsx` | 简化 | 删除 `animationComponents` 对象，改用 `config.Component` |
| `src/pages/HomePage.tsx` | 修改 | `animationRegistry` import → `ANIMATION_COUNT` |
| `src/pages/KnowledgePage.tsx` | 修改 | `animationRegistry` import → `ANIMATION_COUNT` |
| `src/features/mechanics/index.ts` | 删除一行 | 移除 `ImpulseAnimation` 别名转接 |

---

## 验证

### ESLint 迁移验证
1. `npm run lint` —— 必须正常执行，无 `--ext` 废弃警告，`--max-warnings 0` 生效，返回码 0
2. 确认 `.eslintrc.cjs` 已删除，`eslint.config.mjs` 存在
3. 分环境验证：
   - `src/` 文件正确应用 browser 环境规则
   - `vite.config.ts`、`vitest.config.ts` 正确应用 node 环境规则（`__dirname` 不再报错）
   - `tests/` 文件正确应用 vitest 环境规则（`describe`/`it`/`expect` 不报错，`any` 不报错）

### 动画注册表验证
1. 全项目搜索 `componentPath` —— 应无残留引用
2. `grep -rn "ImpulseAnimation" src/` —— 应无残留引用（确认别名删除后无遗漏）
3. `npm run build` —— TypeScript 编译与 Vite 构建均通过
4. `npm run dev` —— 启动无报错，访问 `/animation/anim-impulse` 渲染 `MomentumTheoremAnimation`

### 分包验证
1. `npm run build` 后查看 `dist/assets/` 下的 chunk 文件大小，确认首页 chunk 不包含动画组件代码
2. `grep -rn "animationRegistry" src/pages/` —— HomePage 和 KnowledgePage 不应再 import registry

### 回归测试
1. `npm test` —— 全部通过

### 文档更新
1. 更新 `ROADMAP_PROGRESS.md` 和 `PROCESS_LOG.md`（`CORE_RULES.md §2.3` 要求）
2. 在 `PROCESS_LOG.md` 记录 `globals` 依赖申报
3. 更新 `ROADMAP_M2_POLISH.md` 相关任务状态
