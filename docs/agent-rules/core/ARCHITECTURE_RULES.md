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
| 动画渲染 | SVG（教学图解优先）/ Canvas（高频动画）/ PixiJS（后期复杂场景） |
| 数学公式 | KaTeX（完全离线） |
| 图标 | lucide-react |
| 数据验证 | Zod |
| 本地存储 | IndexedDB（主）/ LocalStorage（轻量配置） |
| 测试 | Vitest + Testing Library |
| 打包目标 | 浏览器本地运行优先，后期平滑迁移 Electron |

> HashRouter 原因：Electron 以 `file://` 加载时，BrowserRouter 路由失效。

---

## 2. 目录结构

```text
src/
├── app/                    # 应用壳、路由、全局布局
├── components/
│   ├── Layout/             # 布局组件
│   └── UI/                 # UI 基础组件
├── pages/                  # 页面级容器
├── features/               # 按学科/能力拆分的业务模块
│   ├── mechanics/
│   ├── electricity/
│   ├── thermodynamics/
│   ├── optics/
│   ├── atomic/
│   ├── analysis/           # 题目拆解模块
│   └── knowledge/          # 知识树浏览模块
├── physics/                # 纯物理计算（无副作用）
├── math/                   # 数学工具（矢量、三角、矩阵、数值求解）
├── utils/                  # 坐标、动画、存储等共享工具
├── data/
│   ├── knowledge/          # 分模块知识库 JSON
│   ├── problems/           # 题目与解析数据
│   ├── knowledgeTree.ts
│   ├── animationRegistry.ts
│   └── analysisRegistry.ts
└── stores/
    ├── useAnimationStore.ts
    ├── useKnowledgeStore.ts
    ├── useProblemStore.ts
    └── useWrongStore.ts

theme/                      # 设计 token（颜色/间距/圆角/阴影/动效）
├── colors.ts               # UI 语义色，Tailwind 从此导入
├── physics/                # 物理主题子模块（推荐入口 @/theme/physics）
│   ├── colors.ts           # 物理量颜色（~110 token，8 分组）
│   ├── sceneColors.ts      # 场景器材外观色（磁铁/线圈/灯泡/手势等）
│   ├── chartColors.ts      # 物理图像配色（v-t/P-V/U-I 等 9 组）
│   ├── canvasStyle.ts      # SVG/Canvas 绘制规范（线宽/箭头/SVG_ATTR/Marker）
│   └── index.ts            # 统一导出
├── spacing.ts              # 间距比例尺 + 布局固定尺寸 + 密度上限
├── radius.ts               # 圆角规范
├── shadow.ts               # 阴影规范
├── motion.ts               # 动效时长与 easing
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
| `useAnimationStore` | 播放状态、时间轴、速度、参数 |
| `useKnowledgeStore` | 知识树展开、当前节点、浏览历史 |
| `useProblemStore` | 题目进度、当前步骤、答题状态 |
| `useWrongStore` | 错题记录、复练状态、统计信息 |
| `useAppStore`（可选） | 全局 UI 状态，不得与业务状态混写 |

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

---

## 7. 动画系统规则

- 所有动画必须使用 `src/utils/animation.ts`
- **禁止**在组件中直接调用 `requestAnimationFrame`
- **禁止**各组件自行实现 easing 曲线或时间控制器
- 优先使用 `globalAnimationController`，特殊场景可创建独立 `AnimationController`
- 动画回调必须处理 `deltaTime`，动画更新频率与物理计算频率解耦

---

## 8. 数据层规则

### 8.1 数据位置

| 数据类型 | 路径 |
|---------|------|
| 分模块知识库 | `src/data/knowledge/` |
| 题目与解析 | `src/data/problems/` |
| 知识树索引 | `src/data/knowledgeTree.ts` |
| 动画注册表 | `src/data/animationRegistry.ts` |
| 题目解析注册表 | `src/data/analysisRegistry.ts` |

所有数据结构须满足：可序列化、可检索、可按章节拆分、可被知识树/动画页/题目解析页共同消费。

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

Tailwind 颜色配置从 `src/theme/colors.ts` 导入，禁止在 `tailwind.config.*` 中重复定义颜色值：

```ts
// tailwind.config.ts
import { tailwindColors } from './src/theme/colors'
export default { theme: { extend: { colors: tailwindColors } } }
```

所有组件中的颜色/间距/动效值必须从 `src/theme/` 子模块引用，禁止硬编码。import 路径详见 `ui/02_UI_RULES.md §2`。

---

## 12. 性能与测试

- 纯组件使用 `React.memo()`，计算密集逻辑使用 `useMemo()`，回调使用 `useCallback()`
- 所有纯函数必须有测试，核心组件必须有基础交互测试
- 测试文件放 `tests/`，结构与 `src/` 对齐，`tests/setup.ts` 必须导入 `@testing-library/jest-dom`

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
