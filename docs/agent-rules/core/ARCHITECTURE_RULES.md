# 架构规则文档

## 0. 适用范围与优先级

本文件约束「高中物理交互动画学习系统」的前端、数据层、物理计算层、题目解析层与桌面打包层实现。

本文件是技术架构的权威来源。核心规范已整合至 `.trae/rules/project_rules.md`（Trae IDE 自动加载），本文件提供架构细则与铁律权威定义。**按需加载策略与文档优先级见 `AGENT.md` 按需加载速查**。

---

## 1. 技术栈声明

| 类别 | 选型 |
|------|------|
| 前端框架 | React 19 |
| 构建工具 | Vite 6，`base: './'` |
| 语言 | TypeScript 5.5+（strict mode） |
| CSS 框架 | TailwindCSS 4 |
| 状态管理 | Zustand |
| 路由 | react-router-dom（**HashRouter only**） |
| �```text
src/
├── app/                    # 应用壳、路由、全局布局
├── components/
│   ├── Layout/             # 布局组件（ThreePanel 等）
│   ├── Physics/            # 物理渲染公共组件（Ball、Block、SportsCar、VectorArrow、
│   │                       #   VectorDefs、HandRule、RotatingCoil、MagneticPoles…）
│   └── UI/                 # UI 基础组件
├── hooks/                  # 跨页面复用 Hook
│   └── useAnimationLifecycle.ts  # AnimationPage 生命周期封装
├── pages/                  # 页面级容器（薄壳）
├── scene/                  # 场景配置与坐标缩放（SceneConfig、SceneScale）
├── features/               # 按学科/能力拆分的业务模块
│   ├── mechanics/          # 力学（按物理主题分子目录）
│   │   ├── kinematics/     #   运动学
│   │   ├── dynamics/       #   动力学
│   │   ├── circular/       #   圆周运动
│   │   ├── gravitation/    #   万有引力
│   │   ├── momentum/       #   动量与冲量
│   │   ├── energy/         #   功与能量
│   │   └── force-motion/   #   力-运动沙盒（多力综合演示）
│   ├── electromagnetism/   # 电磁学（按物理主题分子目录）
│   │   ├── electrostatics/ #   静电场（库仑、电场、电容器…）
│   │   ├── dc-circuits/    #   恒定电流（欧姆、串并联…）
│   │   ├── magnetism/      #   磁场（安培力、洛伦兹力…）
│   │   └── induction/      #   电磁感应与交变电流（含 AC 动画）
│   ├── thermodynamics/     #   热学（待开发）
│   ├── optics/             #   光学（待开发）
│   ├── atomic/             #   原子物理（待开发）
│   ├── practice/           #   练习会话组件
│   └── dev/                #   开发调试专用（不纳入生产功能）
├── physics/                # 纯物理计算（无副作用，不得依赖 React/DOM/window）
├── math/                   # 数学工具（矢量、三角、矩阵、数值求解）
├── utils/                  # 坐标、动画、存储、轨迹插值等共享工具
│   ├── animation.ts        #   动画帧 Hook（useAnimationFrame / useSimulationFrame）
│   ├── coordinate.ts       #   坐标转换（physicsToCanvas / computeScale）
│   ├── moduleHelpers.tsx   #   跨页面共享工具（MODULE_LABELS、moduleOf、formatDate、toggle、chip）
│   ├── useCanvasSize.ts    #   画布尺寸响应式 Hook（scale / px / font）
│   └── storage.ts          #   IndexedDB / LocalStorage 封装
├── data/
│   ├── types.ts            # AnimationConfig 等核心类型定义
│   ├── problems/           # 题目与解析数据
│   ├── quantities/         # 物理量构建器（按物理主题拆分，懒加载）
│   │   ├── kinematics.ts
│   │   ├── dynamics.ts
│   │   ├── circular.ts
│   │   ├── gravitation.ts
│   │   ├── momentum.ts
│   │   ├── electromagnetism.ts
│   │   ├── forceMotion.ts
│   │   └── energy.ts
│   ├── knowledgeTree.ts    # 知识树索引（单文件）
│   ├── defineAnimations.ts # defineAnimations 工具函数
│   ├── registries/         # 按模块拆分的动画子注册表
│   │   ├── mechanics-kinematics.ts
│   │   ├── mechanics-dynamics.ts
│   │   ├── mechanics-circular-gravitation.ts
│   │   ├── mechanics-energy.ts
│   │   ├── mechanics-momentum.ts
│   │   ├── mechanics-force-motion.ts
│   │   ├── electromagnetism-electrostatics.ts
│   │   ├── electromagnetism-dc-circuits.ts
│   │   ├── electromagnetism-magnetism.ts
│   │   ├── electromagnetism-induction.ts
│   │   └── electromagnetism-ac.ts
│   ├── animationRegistry.ts # 薄合并入口（合并所有子注册表）
│   ├── analysisRegistry.ts
│   └── physicsQuantities.ts # 物理量懒注册入口
└── stores/
    ├── useAnimationStore.ts
    ├── useAppStore.ts
    ├── useKnowledgeStore.ts
    ├── useProblemStore.ts
    ├── useProgressStore.ts
    ├── usePracticeStore.ts
    └── useWrongStore.ts

theme/                      # 设计 token（颜色/间距/圆角/阴影/动效）
├── colors.ts               # UI 语义色，Tailwind 从此导入
├── physics/                # 物理主题子模块（推荐入口 @/theme/physics）
│   ├── colors.ts           # 物理量颜色（~110 token，8 分组）
│   ├── sceneColors.ts      # 场景器材外观色（磁铁/线圈/灯泡/手势/球体材质/电学器材等）
│   │                       #   含 ELECTRICAL_APPARATUS_COLORS（LED/五金件）、
│   │                       #   MECHANICS_APPARATUS_COLORS、ELECTROSTATIC_APPARATUS_COLORS 等
│   ├── vectorStyle.ts      # VectorType 枚举、视觉权重、颜色映射（矢量系统权威来源）
│   ├── canvasStyle.ts      # SVG/Canvas 绘制规范（线宽/箭头/SVG_ATTR/Marker）
│   ├── arrowStyle.ts       # ArrowGeometry 箭头几何规格
│   ├── firstLawColors.ts   # 热力学第一定律专用颜色
│   ├── secondLawColors.ts  # 热力学第二定律专用颜色
│   └── index.ts            # 统一导出（推荐引用路径 @/theme/physics）
├── spacing.ts              # 间距比例尺 + 布局固定尺寸 + 密度上限 + CANVAS_PRESETS
├── radius.ts               # 圆角规范
├── shadow.ts               # 阴影规范
├── motion.ts               # 动效时长与 easing
├── animationTokens.ts      # 动画 UI token（ANIM_FONT/SHADOW/PANEL/CHART_PAD）
└── index.ts                # 统一导出入口（可用，但子模块优先）

electron/                   # Electron 预留目录
├── main.ts
└── preload.ts

tests/
├── setup.ts
└── utils/
    ├── coordinate.test.ts
    └── animation.test.ts
```��── mechanics-energy.ts
│   │   ├── mechanics-momentum.ts
│   │   ├── electromagnetism-electrostatics.ts
│   │   ├── electromagnetism-dc-circuits.ts
│   │   ├── electromagnetism-magnetism.ts
│   │   ├── electromagnetism-induction.ts
│   │   └── electromagnetism-ac.ts
│   ├── animationRegistry.ts # 薄合并入口（合并所有子注册表）
│   ├── analysisRegistry.ts
│   └── physicsQuantities.ts # 物理量懒注册入口
└── stores/
    ├── useAnimationStore.ts
    ├── useAppStore.ts
    ├── useKnowledgeStore.ts
    ├── useProblemStore.ts
    ├── useProgressStore.ts
    ├── usePracticeStore.ts
    └── useWrongStore.ts

theme/                      # 设计 token（颜色/间距/圆角/阴影/动效）
├── colors.ts               # UI 语义色，Tailwind 从此导入
├── physics/                # 物理主题子模块（推荐入口 @/theme/physics）
│   ├── colors.ts           # 物理量颜色（~110 token，8 分组）
│   ├── sceneColors.ts      # 场景器材外观色（磁铁/线圈/灯泡/手势等）
│   ├── chartColors.ts      # 物理图像配色（v-t/P-V/U-I 等 9 组）
│   ├── canvasStyle.ts      # SVG/Canvas 绘制规范（线宽/箭头/SVG_ATTR/Marker）
│   └── index.ts            # 统一导出
├── spacing.ts              # 间距比例尺 + 布局固定尺寸 + 密度上限 + CANVAS_PRESETS
├── radius.ts               # 圆角规范
├── shadow.ts               # 阴影规范
├── motion.ts               # 动效时长与 easing
├── animationTokens.ts      # 动画 UI token（ANIM_FONT/SHADOW/PANEL/CHART_PAD）
└── index.ts                # 统一导出入口（可用，但子模块优先）

electron/                   # Electron 预留目录
├── main.ts
└── preload.ts

tests/
├── setup.ts
└── utils/
    ├── coordinate.test.ts
    └── animation.test.ts
```

新增规则：
- 新功能模块 → `src/features/`
- 纯物理计算 → `src/physics/`
- 数学工具 → `src/math/`
- 状态管理 → `src/stores/`
- 静态数据 → `src/data/`
- 禁止将页面逻辑直接塞进业务组件内部

---

## 3. 组件分层与依赖方向

### 3.1 分层职责

- **页面组件**：路由装配、布局组织、数据注入，不放复杂业务逻辑
- **功能组件**：单一物理场景、题目拆解或知识点演示
- **通用组件**：可复用 UI 片段
- **工具函数**：纯逻辑或明确副作用，不承担页面职责

### 3.2 依赖方向（单向）

```
页面组件 → 功能组件 → 通用组件 → 工具函数
                              ↗
                    physics/ & math/
```

- `physics/` 与 `math/` **不得**依赖 React、DOM、window、document
- `physics/` **不得**直接依赖渲染副作用工具（如 `utils/canvas.ts`）
- 页面层**不得**反向依赖底层计算实现细节

---

## 4. 纯函数规则

### 4.1 定义

纯函数必须满足：相同输入→相同输出，无副作用，不读外部可变状态，随机源必须通过 `seed` 显式注入。

### 4.2 存放位置与命名

| 位置 | 职责 | 命名示例 |
|------|------|---------|
| `src/physics/` | 物理量计算与状态求解 | `calculateUniformMotion` |
| `src/math/` | 矢量、三角、矩阵、数值方法（如 RK4） | `vectorAdd` |
| `src/utils/` | 坐标转换、动画控制、存储封装 | `physicsToCanvas` |

- 物理计算函数：动宾结构，如 `calculateAcceleratedMotion(v0, a, t)`
- 坐标转换函数：双域命名，如 `physicsToCanvas` / `canvasToPhysics`
- 不得把渲染逻辑、页面状态、题目文案混入纯计算模块

---

## 5. 状态管理规则

- 所有 Store 放入 `src/stores/`
- Store 只保存「真值」，不保存可派生状态
- 派生状态在组件层通过 `useMemo()` 或 selector 计算
- Action 必须动词开头：`setParams`、`updateProgress`、`reset`

| Store | 职责 |
|-------|------|
| `useAnimationStore` | 播放状态、时间轴、速度、参数、显示开关（showVectors/showGrid 等） |
| `useKnowledgeStore` | 知识树展开、当前节点、浏览历史 |
| `useProblemStore` | 题目进度、当前步骤、答题状态 |
| `useWrongStore` | 错题记录、复练状态、统计信息 |
| `useAppStore`（可选） | 全局 UI 状态（模式切换、发现步骤），不得与业务状态混写 |
| `useProgressStore` | 学习进度（已浏览动画、已掌握知识点），持久化至 IndexedDB |
| `usePracticeStore` | 练习会话状态 |

### 5.1 性能指南

- **精确订阅**：消费 Zustand store 时使用 selector 精确订阅所需字段（`useStore(s => s.field)`），避免全量解构导致不必要重渲染；高频更新字段（如 `time`）必须单独隔离订阅
- **防抖持久化**：IndexedDB 写入操作应使用防抖（推荐 500ms），避免高频 mutation 产生大量 I/O；`beforeunload` 时刷出待写入队列防止数据丢失
- **可序列化优先**：Store 状态优先使用原生可序列化类型（`string[]` 而非 `Set<string>`），避免自定义 `partialize`/`merge` workaround

---

## 6. 坐标系统规则

- 所有图形渲染必须通过 `src/utils/coordinate.ts` 做坐标转换
- 必须使用 `src/utils/canvas.ts` 的 `setupCanvas` 处理 DPR
- **禁止**在组件中直接写像素换算逻辑或魔法数字定位

| 坐标系 | 原点 | Y 轴方向 |
|--------|------|---------|
| 物理坐标系 | 屏幕中心 | 向上 |
| Canvas 坐标系 | 左上角 | 向下 |

转换函数必须双向可逆，且在测试中覆盖边界情况。

物理比例尺**必须**通过 `computeScale()`（`src/utils/coordinate.ts`）基于画布尺寸和物理世界范围计算，禁止在组件内写 `scale = N` 等硬编码比例尺。

### 6.1 两条坐标路径适用场景

项目中存在两条并行的坐标缩放路径，新组件开发者须明确选用：

| 路径 | 入口 | 适用场景 | 来源 |
|------|------|---------|------|
| 路径 A（强制） | `useViewport()` | 场景元素的比例定位（**全部组件强制**） | `src/utils/useViewport.ts` |
| 路径 B（保留） | `computeScale()` | 物理量→像素转换，与 useViewport 共存 | `src/utils/coordinate.ts` |

- **useViewport** → 场景元素的比例定位（**全部 Animation 组件强制使用**）
- **computeScale** → 物理量→像素转换（保留，与 useViewport 可共存）
- **createSceneScaleFromViewport** → 当组件已使用 useViewport 时，用此替代 `createSceneScale` 构建 SceneScale
- 所有 Animation 组件**禁止**使用绝对像素定位（如 `groundY = height - N`），必须用 `vp.visibleH * ratio` 或 LAYOUT 具名常量

---

## 7. 动画系统规则

- 所有动画必须使用以下三个统一入口，**禁止**在组件中直接调用 `requestAnimationFrame`
- **禁止**各组件自行实现 easing 曲线或时间控制器
- 动画回调必须处理 `deltaTime`，动画更新频率与物理计算频率解耦

| Hook / 模块 | 位置 | 适用场景 |
|-------------|------|---------|
| `useAnimationFrame` | `src/utils/animation.ts` | 受播放状态控制的动画帧；`playing=false` 时 rAF 停止 |
| `useSimulationFrame` | `src/utils/animation.ts` | 持续运行的物理仿真帧（如拖拽、弹簧）；rAF 始终运行，`active` 控制仿真推进 |
| `useAnimationLifecycle` | `src/hooks/useAnimationLifecycle.ts` | AnimationPage 专用生命周期封装（config 加载、store 初始化、播放循环、进度标记） |

> AnimationPage 应使用 `useAnimationLifecycle`；单个动画组件内使用 `useAnimationFrame` 或 `useSimulationFrame`。

---

## 8. 数据层规则

### 8.1 数据位置

| 数据类型 | 路径 |
|---------|------|
| 核心类型定义（AnimationConfig 等） | `src/data/types.ts` |
| 题目与解析 | `src/data/problems/` |
| 知识树索引（单文件） | `src/data/knowledgeTree.ts` |
| 动画注册表合并入口 | `src/data/animationRegistry.ts` |
| 动画注册表子模块 | `src/data/registries/*.ts` |
| defineAnimations 工具 | `src/data/defineAnimations.ts` |
| 题目解析注册表 | `src/data/analysisRegistry.ts` |
| 物理量构建器 | `src/data/quantities/`（按物理主题拆分，懒加载） |
| 物理量懒注册入口 | `src/data/physicsQuantities.ts` |

所有数据结构须满足：可序列化、可检索、可按章节拆分、可被知识树/动画页/题目解析页共同消费。

### 8.1.1 物理量构建器扩展指南

新增动画的物理量构建逻辑必须：
1. 在 `src/data/quantities/` 对应子模块中实现构建函数（或添加 case 分支）
2. 在 `src/data/physicsQuantities.ts` 的 `quantityRegistry` 中添加一条记录：
   ```ts
   'anim-xxx': {
     loader: () => import('./quantities/<模块名>'),
     builderName: '<BuilderName>',  // 必须是 BuilderName 联合类型中的合法值，拼错编译期报错
   },
   ```
3. 若新增了新的构建器函数名，同步将其加入文件顶部的 `BuilderName` 联合类型
4. 动画页进入时通过 `preloadQuantityBuilder()` 预加载（AnimationPage 已统一调用，无需手动触发）

禁止直接在 `physicsQuantities.ts` 中添加 switch-case 构建逻辑。

### 8.1.2 参数类型安全规范

**构建器参数归一化**：构建器文件应定义具名接口 + 默认值映射，通过 `normalizeParams()` 将 `Record<string, number>` 归一化为类型安全的具名接口。

```ts
// quantities/kinematics.ts 示例
import { normalizeParams, type ParamDefs } from './types'

interface KinematicsParams {
  v0: number
  a: number
  g: number
  // ...
}

const KINEMATICS_DEFAULTS: ParamDefs<KinematicsParams> = {
  v0: { default: 0 },
  a: { default: 1.5 },
  g: { default: 9.8 },
  // ...
}

export function buildKinematicsQuantities(
  animId: string,
  params: Record<string, number>,  // 外部签名不变
  time: number,
): PhysicsPanelData | null {
  const p = normalizeParams(params, KINEMATICS_DEFAULTS)  // 内部类型安全
  // 使用 p.v0, p.a, p.g 而非 params.v0, params.a, params.g
}
```

**AnimationConfig 泛型联动**：`AnimationConfig<P>` 已泛型化，registry 文件的 `defaultParams` 必须添加 `as const` 以获得编译期字面量类型校验。

```ts
// registries/mechanics-kinematics.ts 示例
export const mechanicsKinematicsAnimations = defineAnimations({
  'anim-velocity': {
    title: '速度演示',
    knowledgeId: 'mechanics-1-3',
    Component: lazy(() => import('...')),
    defaultParams: {
      v: 8, t: 0, scene: 0,
    } as const,  // 必须添加 as const
    // ...
  },
})
```

**新增动画时的类型安全检查清单**：
1. 构建器文件：定义具名接口 + 默认值映射 + `normalizeParams` 调用
2. Registry 文件：`defaultParams` 添加 `as const`
3. 验证：`npx tsc --noEmit` 零错误

### 8.2 错题数据流

```
用户作答(AnalysisPage) → useProblemStore → useWrongStore → IndexedDB
WrongPage 只能通过 useWrongStore 读取，不得直接读写数据库
```

### 8.3 storage 接口约定

```ts
export const storage = {
  getLocal(key: string): unknown,
  setLocal(key: string, value: unknown): void,
  removeLocal(key: string): void,
  getDB<T>(key: string): Promise<T>,
  setDB(key: string, value: unknown): Promise<void>,
  removeDB(key: string): Promise<void>,
  clearDB(): Promise<void>,
}

// Zustand persist 兼容的 IndexedDB StateStorage
export const idbStorage: StateStorage

// localStorage → IndexedDB 一次性迁移
export function migrateFromLocalStorage(key: string): Promise<void>
```

IndexedDB 体积上限：**200MB**，超限时提示用户清理。

---

## 9. 路由与页面规则

- 强制使用 `HashRouter`，禁止改为 `BrowserRouter`

| 路由 | 页面 | 职责 |
|------|------|------|
| `/` | HomePage | 知识入口、学习概览、继续学习 |
| `/animation/:id` | AnimationPage | 物理场景交互动画 |
| `/analysis/:id` | AnalysisPage | 高考题拆解与逐步讲解 |
| `/practice` | PracticePage | 练习与测验 |
| `/wrong` | WrongPage | 错题回顾与重练 |

**AnimationPage 组装约定**：
- 通过 `animationRegistry.ts` 定位场景配置
- 通过 `React.lazy` + `Suspense` 按需加载 `features/` 组件
- 不得硬编码所有动画组件引用
- 三屏联动布局尺寸（280px/320px）与信息密度规则见 `docs/agent-rules/ui/02_UI_RULES.md`

---

## 10. 代码规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `AnimationPage` |
| 函数 | camelCase | `calculateUniformMotion` |
| 常量 | UPPER_SNAKE_CASE | `GRAVITY` |
| 私有变量 | 下划线前缀 | `_internalState` |

- 禁止同一目录下存在同名 `.ts` 与 `.tsx` 文件（如 `foo.ts` + `foo.tsx`），避免隐式扩展解析歧义
- 纯函数必须有 JSDoc，公开 API 写明参数、返回值和边界条件
- import 路径从最具体的子模块入口引用（如 `@/theme/physics`、`@/theme/colors`、`@/theme/motion`），`@/theme` 统一入口仍可用但子模块优先

---

## 11. 依赖管理

### 11.1 已批准依赖

**生产**：`react`、`react-dom`、`react-router-dom`、`zustand`、`lucide-react`

**开发**：`vite`、`@vitejs/plugin-react`、`tailwindcss`、`postcss`、`autoprefixer`、`typescript`、`vitest`、`@testing-library/react`、`@testing-library/jest-dom`、`@vitest/coverage-v8`、`jsdom`、`eslint`、`prettier`

**候选（按里程碑批准）**：`katex`、`idb`、`pixijs`

### 11.2 新增流程

新增依赖前必须先在 `PROCESS_LOG.md` 申报 → 更新本文件依赖清单 → 执行安装。

### 11.3 主题 Token 约定

Tailwind v4 使用 CSS-first 配置，颜色通过 `src/index.css` 中的 `@theme` 块定义。`src/theme/colors.ts` 供组件内 JS 引用，禁止在组件内硬编码颜色值。

所有组件中的颜色/间距/动效值必须从 `src/theme/` 子模块引用，禁止硬编码。import 路径详见 `ui/02_UI_RULES.md §2`。

动画组件的 UI token（字体/阴影/面板/图表内边距）从 `src/theme/animationTokens.ts` 引用，画布预设尺寸从 `CANVAS_PRESETS`（`src/theme/spacing.ts`）引用。

**矢量系统 token**：矢量类型枚举（`VectorType`）、视觉权重（`VECTOR_VISUAL_WEIGHT`）、颜色映射（`VECTOR_COLORS`）从 `src/theme/physics/vectorStyle.ts` 引用；箭头几何规格（`ArrowGeometry`）从 `src/theme/physics/arrowStyle.ts` 引用。两者均通过 `@/theme/physics` 统一入口导出。

---

## 12. 性能与测试

- 纯组件使用 `React.memo()`，计算密集逻辑使用 `useMemo()`，回调使用 `useCallback()`
- 所有纯函数必须有测试，核心组件必须有基础交互测试
- 测试文件放 `tests/`，结构与 `src/` 对齐，`tests/setup.ts` 必须导入 `@testing-library/jest-dom`

### 12.1 代码组织指南

- **Feature 子目录分组**：`features/mechanics/` 和 `features/electromagnetism/` 下按物理主题分子目录（mechanics: kinematics/dynamics/circular/gravitation/momentum/energy；electromagnetism: electrostatics/dc-circuits/magnetism/induction/shared），新增动画文件放入对应子目录，禁止平铺
- **大文件拆分**：单文件超过 500 行时应考虑按职责拆分为独立模块，通过懒加载或 barrel 文件组织
- **重复逻辑提取**：多处出现的相同计算模式（如轨迹插值）应提取为 `src/utils/` 下的通用工具函数

```ts
// vitest.config.ts
test: {
  environment: 'jsdom',
  setupFiles: ['./tests/setup.ts'],
  coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
}
```

---

## 13. 构建与打包

- `vite.config.ts` 必须配置 `base: './'`
- 离线策略：KaTeX 字体、图标、题库 JSON 全部打包入本地资源，**禁止**运行时加载在线 CDN
- Electron 预留：`contextIsolation: true`，禁用 `nodeIntegration`，通过 `preload.ts` 暴露有限能力

---

## 14. 文档维护规则

- 新增 `src/theme/` token 后，同步更新 `docs/agent-rules/ui/02_UI_RULES.md` 对应章节
