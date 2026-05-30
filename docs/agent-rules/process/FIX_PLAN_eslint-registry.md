# 修复执行方案：ESLint 9 flat config 迁移 + 动画注册表单一数据源重构

> **归属里程碑**：[M2] 力学完善 + 导航系统（质量闸门与架构治理）
> **关联问题**：#BUG-002（ESLint flat config 迁移）、#BUG-003（动画注册表双映射不一致）、#PERF-004（首屏分包）
> **遵循规范**：`AGENT.md` 全局铁律 §5（依赖先申报）、§6（修改必记录）；`CORE_RULES.md`
> **状态**：✅ 已执行完成（2026-05-30）— lint 0 警告、build 通过、test 33/33、残留引用清零。关联问题落地为 #BUG-005 / #BUG-006 / #PERF-007

> ⚠️ 执行前置：本方案要求「先改后验」，每个阶段结束必须跑通对应验证命令才能进入下一阶段。
> 所有 `npm install` 必须使用文档给定的**锁定版本号**，禁止裸装（裸装会触发 ESLint 10 peer 冲突，详见 §1.0）。

---

## 阶段总览与执行顺序

```
S0 依赖申报（PROCESS_LOG）
  → S1 ESLint flat config 迁移（多环境）
  → S2 修复迁移后暴露的既有 lint 报错
  → S3 动画注册表单一数据源重构（含 lazy 分包）
  → S4 全量验证
  → S5 文档回写（PROCESS_LOG / ROADMAP）
```

> S1 与 S3 强耦合：S1 会报出 `AnimationPage.tsx` 的 `React is not defined`，该错误在 S3 删除手写映射后自动消失。
> 因此**必须按 S1→S2→S3 顺序**，S2 暂时容忍/旁路该错，S3 完成后统一以 §S4 收口。

---

## S0：依赖申报（AGENT.md 铁律 §5）

在 `docs/agent-rules/process/PROCESS_LOG.md` 的「依赖申报记录」表追加 **2 行**（原方案漏报 `@eslint/js`）：

| 日期 | 申报人 | 包名 | 版本 | 用途说明 | 批准状态 |
|------|--------|------|------|---------|---------|
| 2026-05-30 | agent | `@eslint/js` | `^9` | ESLint 9 flat config 的 `js.configs.recommended` 基础规则集 | ✅ |
| 2026-05-30 | agent | `globals` | `^15` | flat config 中声明 browser / node / vitest 全局变量 | ✅ |

---

## S1：ESLint 9 flat config 迁移

### S1.0 ⚠️ 为什么必须锁版本（实测结论）

- 裸装 `npm i -D @eslint/js` 会拉到 `@eslint/js@10`，其 peer 要求 `eslint@10`，与本项目 `eslint@^9.20.1` 冲突，`npm install` 直接 `ERESOLVE` 失败。
- 验证 lint 必须走 `npm run lint`（用本地 eslint 9），**禁止裸 `npx eslint`**——npx 在解析失败时会临时下载 `eslint@10` 执行，导致 `ERR_MODULE_NOT_FOUND`。
- 执行后用 `npx eslint --version` 确认输出为 `9.x` 才算环境正确。

### S1.1 安装（锁定版本）

```bash
npm install --save-dev "@eslint/js@^9" "globals@^15"
```

### S1.2 新建 `eslint.config.mjs`（多环境分块）

> 关键点：原方案只配了 `globals.browser` 单一环境，导致 `vite.config.ts` / `vitest.config.ts`（Node 环境，用 `__dirname`）和 `tests/**`（vitest 全局 + 需放宽 any）全部报 `no-undef`。
> 本配置按 **src(browser) / 配置文件(node) / tests(vitest)** 三块声明，并显式关闭核心 `no-undef`（TS 项目标准做法，未定义标识符交给 `tsc` 把关）。

```js
// eslint.config.mjs
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  // 全局忽略
  { ignores: ['dist', 'coverage', '**/*.tsbuildinfo', 'vite.config.js', 'vite.config.d.ts'] },

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
      ...tseslint.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // TS 项目交给 tsc 做未定义检查，关闭核心规则避免 React/JSX 误报
      'no-undef': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
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

  // 3) 测试文件（vitest 全局 + 放宽 any）
  {
    files: ['tests/**/*.{ts,tsx}'],
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
```

### S1.3 删除旧配置

```bash
rm .eslintrc.cjs
```

### S1.4 修正 `package.json` 的 lint 脚本

`--ext ts,tsx` 是 ESLint 8 参数，ESLint 9 已移除：

```jsonc
// package.json → scripts
"lint": "eslint . --report-unused-disable-directives --max-warnings 0"
```

### S1.5 阶段验证

```bash
npx eslint --version      # 必须输出 9.x（不是 10.x）
npm run lint              # 允许此时仍有 S2 的既有报错，但不得再有 no-undef / 环境类报错
```

---

## S2：修复迁移后暴露的既有 lint 报错

> 迁移完成后 `--max-warnings 0` 才真正生效，会暴露**原本就存在、此前从未被检查**的问题。实测共 4 类（`AnimationPage` 的 `React is not defined` 已在 S1 关闭 `no-undef` + S3 删映射后消除，此处不重复）。

### S2.1 `src/data/problems/mechanics/kinematics-sample.ts:10` — `no-useless-escape`

定位第 10 行字符串中多余的 `\,` 转义，删除不必要的反斜杠（KaTeX/文本里 `,` 无需转义）。修改后该行公式/文本渲染结果不变。

### S2.2 `tests/utils/animation.test.ts:8-9` — `no-explicit-any`

已由 S1.2 第 3 块 `'@typescript-eslint/no-explicit-any': 'off'` 覆盖（测试中 mock rAF 用 any 合理），无需改测试代码。

### S2.3 配置文件 `__dirname`

已由 S1.2 第 2 块 `globals.node` 覆盖，无需改代码。

### S2.4 阶段验证

```bash
npm run lint     # 期望：仅可能剩 AnimationPage 的 1 个 react-hooks/exhaustive-deps warning
```

> 该 `exhaustive-deps` warning 会让 `--max-warnings 0` 失败。处理方式二选一（在 S3 一并解决）：
> - 推荐：按 react-hooks 建议补全/重构依赖数组；
> - 或：在该行加 `// eslint-disable-next-line react-hooks/exhaustive-deps` 并注明原因（受 `--report-unused-disable-directives` 约束，注释必须真实生效）。

---

## S3：动画注册表单一数据源重构（含 lazy 分包）

### 根因（双映射）

| 位置 | 形式 | 现状 |
|---|---|---|
| `animationRegistry.ts` | `componentPath` 字符串 | 死字段，无人读取 |
| `AnimationPage.tsx` | 手写 `animationComponents` 对象 | 实际使用 |
| `features/mechanics/index.ts:25` | `ImpulseAnimation` 别名转接 | #BUG-003 的临时 workaround |

两份映射不同步 → `anim-impulse` 的 path 指向不存在的 `ImpulseAnimation`。

### 策略：单一数据源 + `React.lazy`（兼顾 #PERF-004）

> ⚠️ 影响分析补充（原方案遗漏）：`HomePage.tsx` 与 `KnowledgePage.tsx` 都 `import { animationRegistry }`，**仅用于 `Object.keys(animationRegistry).length` 数个数**。
> 若把 24 个组件的**静态引用**塞进 registry，首页/知识树页会被迫连带打包全部动画组件，加剧 676KB 单包问题。
> 因此 `Component` 字段统一存 **`lazy(() => import(...))`**：既消除双映射，又让动画按需加载，首页只数个数不会拉重组件。

### S3.1 `src/data/types.ts`

```ts
import type { LazyExoticComponent, ComponentType } from 'react'

export interface AnimationConfig {
  id: string
  title: string
  knowledgeId: string
  Component: LazyExoticComponent<ComponentType>   // 替换原 componentPath: string
  defaultParams: Record<string, number>
}
```

### S3.2 重写 `src/data/animationRegistry.ts`

- 顶部：`import { lazy } from 'react'`
- 每条记录：`componentPath: '@/features/mechanics/Xxx'` → `Component: lazy(() => import('@/features/mechanics/Xxx'))`
- `anim-impulse` → `Component: lazy(() => import('@/features/mechanics/MomentumTheoremAnimation'))`（修正错配）
- `getAnimationConfig` 保持不变

示例：

```ts
import { lazy } from 'react'
import { AnimationConfig } from './types'

export const animationRegistry: Record<string, AnimationConfig> = {
  'anim-velocity': {
    id: 'anim-velocity',
    title: '速度演示',
    knowledgeId: 'mechanics-1-3',
    Component: lazy(() => import('@/features/mechanics/VelocityAnimation')),
    defaultParams: { v: 5, t: 0 },
  },
  // ... 其余 22 条同样改写 ...
  'anim-impulse': {
    id: 'anim-impulse',
    title: '动量定理',
    knowledgeId: 'mechanics-8-3',
    Component: lazy(() => import('@/features/mechanics/MomentumTheoremAnimation')),
    defaultParams: { m: 2, v0: 0, F: 10, t_duration: 3 },
  },
}
```

### S3.3 `src/pages/AnimationPage.tsx`

1. 删除 `import * as MechanicsAnimations from '@/features/mechanics'`
2. 删除整段手写 `animationComponents`（约 L171–196）—— `React is not defined` 报错随之消失
3. 存在性判断：`if (!config || !config.Component)`
4. 渲染：`const AnimationComponent = config.Component`，并用 `<Suspense>` 包裹（lazy 组件必须）：

```tsx
import { Suspense } from 'react'
// ...
<Suspense fallback={<div className="w-full h-full flex items-center justify-center text-neutral-400">加载动画中…</div>}>
  <AnimationComponent />
</Suspense>
```

5. 顺手解决 S2.4 的 `exhaustive-deps`（`config` 依赖）：在重构 effect 时一并修正依赖数组。

### S3.4 `src/features/mechanics/index.ts`

删除第 25 行别名转接：

```ts
export { default as ImpulseAnimation } from './MomentumTheoremAnimation'   // ← 删除
```

> 注意：删后须确认 `ImpulseAnimation` 在别处无引用（见 §S4 第 3 条 grep）。

### S3.5 影响文件清单（修订版）

| 文件 | 变更 | 说明 |
|---|---|---|
| `src/data/types.ts` | 修改 | `componentPath` → `Component: LazyExoticComponent` |
| `src/data/animationRegistry.ts` | 重写 | 字符串路径 → `lazy(() => import(...))` |
| `src/pages/AnimationPage.tsx` | 简化 | 删手写映射，改 `config.Component` + `Suspense`，修依赖数组 |
| `src/features/mechanics/index.ts` | 删一行 | 移除 `ImpulseAnimation` 别名 |
| `src/pages/HomePage.tsx` | **核对** | 仅用 `Object.keys().length`，lazy 后不再连带打包组件，无需改逻辑 |
| `src/pages/KnowledgePage.tsx` | **核对** | 同上 |

---

## S4：全量验证

```bash
# 1) lint 闸门真正生效且通过
npm run lint                       # 0 error 0 warning，进程退出码 0

# 2) 类型 + 构建（确认 lazy 分包生效）
npm run build                      # tsc -b 通过；观察输出应出现多个按需 chunk，主包显著小于 676KB

# 3) 单元测试回归
npm test                          # 33 用例全过

# 4) 死字段 / 残留引用清零
grep -rn "componentPath" src/      # 期望无输出
grep -rn "ImpulseAnimation" src/   # 期望无输出（别名已删且无引用）

# 5) 运行时回归
npm run dev                       # 启动无报错
#   手测：/animation/anim-impulse 正常渲染（动量定理动画），其余动画可正常加载
```

**通过标准（全部满足才算完成）**
- [ ] `npx eslint --version` 为 9.x
- [ ] `npm run lint` 退出码 0、零 warning
- [ ] `npm run build` 通过，主 chunk 体积下降、出现 per-animation 异步 chunk
- [ ] `npm test` 33/33
- [ ] `grep componentPath` 与 `grep ImpulseAnimation` 均无输出
- [ ] `/animation/anim-impulse` 运行时正确渲染

---

## S5：文档回写（AGENT.md 铁律 §6）

1. `PROCESS_LOG.md`：在「修改记录」追加本次变更摘要（含 #BUG-002 / #BUG-003 / #PERF-004 关闭、新增依赖 `@eslint/js`+`globals`）。
2. `ROADMAP_PROGRESS.md`：更新质量闸门与导航治理任务状态。
3. `ROADMAP_M2_POLISH.md`：勾选对应任务。
4. （可选）补 `.gitignore`：`*.tsbuildinfo`、`vite.config.js`、`vite.config.d.ts`，避免构建产物再次入库（与 lint ignore 保持一致）。

---

## 附：相对原方案的关键修正一览

| # | 原方案问题 | 本方案修正 | 依据 |
|---|---|---|---|
| 1 | 漏装 `@eslint/js`、未锁版本 → 安装失败 | `@eslint/js@^9 globals@^15` 锁版本 + 补申报 | 实测 ERESOLVE |
| 2 | 只配 browser 单环境 → config/tests 全报 `no-undef` | browser/node/vitest 三块 + 关 `no-undef` | 实测 8 errors |
| 3 | 未处理迁移后既有 lint 报错 | S2 专列 no-useless-escape / any / exhaustive-deps | 实测 lint 输出 |
| 4 | 静态引用塞 registry，加剧单包 | `Component` 存 `lazy()` + `Suspense` | 引用链分析 |
| 5 | 影响表漏 HomePage/KnowledgePage | 补入清单并核对 | grep 引用链 |
| 6 | 验证缺残留引用检查 | 增加 `grep componentPath/ImpulseAnimation` | SSoT 收口 |
