# [M0] 技术基础架构

&gt; 依赖：无 | 完成后解锁：[M1] [M3]（可并行启动）
&gt; 最后更新：2026-05-29

---

## 完成标准

所有任务打勾，且以下验证通过：
- `npm run dev` 启动无报错，`http://localhost:5173/` 可访问
- `npm run test` 全部通过
- 目录结构与下方约定完全一致

---

## 任务清单

### M0-1 项目初始化

- [x] `npm create vite@latest` 初始化，选 React + TypeScript
- [x] 配置 `tsconfig.json`：`strict: true`，`paths` 别名（`@/` → `src/`）
- [x] 配置 `vite.config.ts`：`base: './'`，路径别名，esbuild tsx 显式声明
- [x] 配置 `.eslintrc` + `prettier`
- [x] 初始化 `package.json` scripts：`dev` / `build` / `test` / `lint`

### M0-2 TailwindCSS 4 配置

- [x] 安装 `tailwindcss@4` + `postcss` + `autoprefixer`
- [x] 配置 `tailwind.config.*`，注册语义化色阶：
  - `primary`（蓝色系，主操作色）
  - `secondary`（青色系，辅助色）
  - `danger`（红色系）
  - `warning`（黄色系）
  - `neutral`（灰色系，50-900）
- [x] 验证：全局 CSS 导入 Tailwind，基础样式渲染正常

### M0-3 路由配置

- [x] 安装 `react-router-dom`
- [x] 配置 `HashRouter`（禁止 BrowserRouter）
- [x] 创建路由骨架（空页面占位即可）：

| 路由 | 组件 | 说明 |
|------|------|------|
| `/` | `HomePage` | 知识入口、学习概览 |
| `/animation/:id` | `AnimationPage` | 物理动画播放页 |
| `/analysis/:id` | `AnalysisPage` | 真题拆解页 |
| `/practice` | `PracticePage` | 练习测验页 |
| `/wrong` | `WrongPage` | 错题回顾页 |
| `/knowledge` | `KnowledgePage` | 知识树浏览页 |

### M0-4 状态管理

- [x] 安装 `zustand`
- [x] 创建 Store 骨架（类型定义 + 空 actions）：
  - `src/stores/useAnimationStore.ts`：`{ animationType, params, time, isPlaying, speed }`
  - `src/stores/useKnowledgeStore.ts`：`{ currentNode, expandedNodes, history }`
  - `src/stores/useProblemStore.ts`：`{ currentProblem, currentStep, answers }`
  - `src/stores/useWrongStore.ts`：`{ wrongs[], stats }`
  - `src/stores/useAppStore.ts`：`{ theme, sidebarOpen }`

### M0-5 核心工具函数

- [x] `src/utils/coordinate.ts` — 坐标系统（**必须优先完成**）
  ```ts
  // 物理坐标系：原点屏幕中心，Y轴向上
  // Canvas坐标系：原点左上角，Y轴向下
  physicsToCanvas(x, y, canvasW, canvasH, scale): {cx, cy}
  canvasToPhysics(cx, cy, canvasW, canvasH, scale): {x, y}
  // 测试：双向可逆，边界覆盖
  ```
- [x] `src/utils/animation.ts` — 动画控制器（**必须优先完成**）
  ```ts
  // 统一 rAF 入口，禁止组件直接调用 requestAnimationFrame
  interface AnimationController { start, pause, resume, reset, setSpeed }
  globalAnimationController: AnimationController
  // 回调必须接收 deltaTime
  // 动画频率与物理计算频率解耦
  ```
- [x] `src/utils/canvas.ts` — DPR 处理
  ```ts
  setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D
  // 处理 devicePixelRatio，返回已缩放的 ctx
  ```
- [x] `src/utils/storage.ts` — 存储接口
  ```ts
  export const storage = {
    getLocal / setLocal / removeLocal,      // LocalStorage
    getDB&lt;T&gt; / setDB / removeDB / clearDB,  // IndexedDB via idb
  }
  // IndexedDB 体积上限 200MB，超限提示用户清理
  ```
- [x] `src/utils/format.ts` — 数值格式化
  ```ts
  formatPhysics(value: number, unit: string, precision?: number): string
  // 例：formatPhysics(9.8, 'm/s²') → '9.80 m/s²'
  ```

### M0-6 数学工具库

- [x] `src/math/vector.ts`
  ```ts
  vectorAdd / vectorSub / vectorScale / vectorDot / vectorCross
  vectorMagnitude / vectorNormalize / vectorAngle
  ```
- [x] `src/math/trigonometry.ts`
  ```ts
  // 角度/弧度转换，常用三角计算封装
  degToRad / radToDeg / sinDeg / cosDeg / tanDeg
  ```
- [x] `src/math/numerical.ts`
  ```ts
  // 确定性数值方法（用于无解析解的物理仿真）
  rk4Step(f, t, y, h): number[]   // Runge-Kutta 4阶
  clamp(v, min, max): number
  lerp(a, b, t): number
  ```

### M0-7 基础组件库

- [x] `src/components/UI/Button.tsx`：Primary / Secondary / Ghost / Danger，含全状态（默认/Hover/Active/Disabled/Loading）
- [x] `src/components/UI/Slider.tsx`：物理参数调节滑块，支持 min/max/step/unit
- [x] `src/components/UI/KatexFormula.tsx`：封装 KaTeX 渲染，行内/块级两种模式
- [x] `src/components/UI/Badge.tsx`：知识点标签、难度标签
- [x] `src/components/UI/Card.tsx`：统一卡片容器
- [x] `src/components/Layout/ThreePanel.tsx`：三屏联动布局（左280px/中自适应/右320px）
- [x] `src/components/Layout/PageShell.tsx`：顶部导航 + 页面容器

### M0-8 数据结构定义

- [x] `src/data/types.ts` — 全局类型（**其他模块依赖此文件）
  ```ts
  // 知识点
  interface KnowledgeNode {
    id: string          // 如 'mechanics-kinematics-uniform'
    title: string
    chapter: string     // 如 '第二章'
    module: string      // 如 'mechanics'
    importance: 'basic' | 'core' | 'gaokao' | 'hard' | 'extend'
    animationIds: string[]
    problemIds: string[]
    prerequisites: string[]  // 前置知识点id
  }

  // 动画场景
  interface AnimationConfig {
    id: string
    title: string
    knowledgeId: string
    componentPath: string  // 懒加载路径
    defaultParams: Record&lt;string, number&gt;
  }

  // 题目
  interface Problem {
    id: string
    year: number        // 高考年份，模拟题用 0
    province: string
    title: string
    content: string     // 支持 KaTeX 语法
    difficulty: 1 | 2 | 3 | 4 | 5
    knowledgeIds: string[]
    steps: ProblemStep[]
  }

  interface ProblemStep {
    id: string
    description: string
    formula?: string   // KaTeX 字符串
    explanation: string
    knowledgeId?: string
  }
  ```
- [x] `src/data/animationRegistry.ts` — 动画注册表骨架
- [x] `src/data/analysisRegistry.ts` — 题目解析注册表骨架
- [x] `src/data/knowledgeTree.ts` — 知识树骨架（各模块知识点 id 索引）

### M0-9 测试环境

- [x] 安装 `vitest` + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom` + `@vitest/coverage-v8`
- [x] 配置 `vitest.config.ts`：environment jsdom，setupFiles，coverage v8
- [x] `tests/setup.ts`：导入 `@testing-library/jest-dom`
- [x] `tests/utils/coordinate.test.ts`：覆盖 `physicsToCanvas` / `canvasToPhysics` 双向转换
- [x] `tests/utils/animation.test.ts`：覆盖 AnimationController 生命周期
- [x] `tests/math/vector.test.ts`：覆盖向量运算

### M0-10 KaTeX 离线化

- [x] 安装 `katex`（在 process/PROCESS_LOG.md 申报后执行）
- [x] 将 KaTeX 字体文件复制到 `public/fonts/katex/`
- [x] 验证：断网环境下公式渲染正常

---

## 完成后操作

1. 更新 `roadmap/ROADMAP_PROGRESS.md` 里 [M0] 状态 → ✅
2. 在 `process/PROCESS_LOG.md` 记录完成条目
3. 可同时启动 [M1] 和 [M3] 的数据结构设计
