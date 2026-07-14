# 项目规范 — 高中物理交互动画学习系统

> **Trae IDE 默认加载的项目规范文件。**
> 详细规范见下方「快速索引」部分。
> 最后更新：2026-07-12（VIEWPORT 架构更新：新增 useSceneScale / useCanvasViewport / worldToDesign，标记 visibleArea/centerScale 为 deprecated）

---

## 1. 项目目标

1. 建立完整且清晰的高中物理知识结构
2. 用交互动画帮助理解物理现象与概念
3. 通过真题拆解帮助学习者建立解题思路
4. 可长期扩展，便于持续加入新章节、新题型与新场景

---

## 2. 技术栈

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

---

## 3. 目录结构

关键目录：`app/`（路由壳）| `components/`（公共组件）| `hooks/`（复用 Hook）| `pages/`（页面薄壳）| `features/`（业务模块）| `physics/`（纯物理计算）| `scene/`（场景缩放）| `theme/`（设计 token）。完整目录树见 `docs/agent-rules/core/ARCHITECTURE_RULES.md §2`。

---

## 4. 全局铁律（不得违反）

> 铁律 = 违反会直接导致系统 bug 的架构约束。流程习惯见下方 §4.1。

| 序号 | 铁律 | 禁止 |
|------|------|------|
| 1 | **统一来源，禁止绕过**（十条子约束见下方展开） | 硬编码颜色/魔法数字/裸值 `fontSize={N}`/自造 `<marker>`/直接 `requestAnimationFrame`/写死 `scale = N` |
| 2 | **物理层纯函数可序列化**：`src/physics/` 无副作用、无 DOM/React/window 依赖、有 JSDoc + 单位注释；所有数据结构可序列化（IndexedDB 持久化兼容） | 在 `physics/` 中访问 DOM/Store；不可序列化的数据结构（Set/Map/Function） |
| 3 | **组件职责边界**：页面组件薄壳（路由+布局+数据注入）；三屏不交叉（详见 `02_UI_RULES.md §5.1`）；动画状态统一 `useAnimationStore` | 页面塞业务逻辑；右侧屏放参数控件；左侧屏放公式推导；另建 `usePhysicsState` |
| 4 | **HashRouter only**：禁止 BrowserRouter（Electron `file://` 下路由 404） | BrowserRouter |
| 5 | **组件复用优先**：场景中存在可复用组件时必须直接使用，禁止在 `features/` 中重复手写等效实现（详见下方展开） | 手写地面纹理/球体/滑块/矢量箭头/图表轴等已有组件实现 |
| 6 | **左屏控制台声明式优先**：左屏必须使用 `LeftPanel` 体系；数值参数优先 `paramMeta → ParamControl`，模式/开关/预设/提示优先 `controlMeta → ControlPanel`；`SidebarExtra` 仅保留复杂自定义控制 | 新页面手写散乱左屏容器、简单模式切换/开关仍写 SidebarExtra、直接手写 `input[type=range]` |

### 铁律 1 展开：统一来源十条子约束

1. **颜色/间距/圆角/阴影/动效** → 必须从 `src/theme/` 子模块引用
2. **坐标转换** → 必须走 `physicsToCanvas()`（`src/utils/coordinate.ts`）
3. **场景缩放** → 新页面统一使用 `useSceneScale`（`src/hooks/useSceneScale.ts`）构造 `SceneScale`，通过 `anchor` 模式选择缩放策略；物理坐标→设计坐标统一使用 `worldToDesign`（`src/scene`，`worldToPixel` 的语义别名）。`createSceneScaleFromViewport` 的 `visibleArea`/`centerScale` 模式已 `@deprecated`（输出容器像素单位，不适合在 `<g transform={vp.transform}>` 内使用），存量迁移逐步替换；`transform` 模式保持可用（输出设计坐标）
4. **动画调度** → 必须通过 `src/utils/animation.ts` 的 Hook（禁止直接调用 `requestAnimationFrame`）
5. **矢量箭头** → 必须使用 `VectorArrow` 组件；调用方式以 `COMPONENT_REGISTRY.md` 与源码 interface 为准，禁止手写 `<line>` + `<marker>`
6. **画布尺寸** → 新页面通过 `useAnimationViewport({ preset })` 统一获取（见约束 8）；存量旧组件维护时可用 `useCanvasSize(CANVAS_PRESETS.xxx)`（`src/theme/spacing.ts`），新页面禁止直接调用
7. **字体缩放** → 必须走 `font()` 函数（内置 clamp 7–16，来自 `useCanvasSize` 返回值）
8. **布局缩放与 viewBox 绑定策略**：
   - **【新页面唯一标准路径】**：`useAnimationViewport({ preset })` + `AnimationSvgCanvas`，无 viewBox，SVG 以 CSS 尺寸为视口，`vp.transform` 由组件内部处理；overlay 声明于 `overlayRight/Left/Top/Bottom` 参数（详见 `07_CANVAS_SVG_CHART_RULES.md §2.2`）。
     ```tsx
     const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
     const sceneScale = useSceneScale({ vp, preset, anchor: 'viewport', physicsWidth: 10, physicsHeight: 8 })
     <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
       <Scene font={canvasSize.font} sceneScale={sceneScale} />
     </AnimationSvgCanvas>
     ```
   - **【存量遗留，禁止新建】**：历史方式A（固定 viewBox）/ 方式B（动态 viewBox + overlay + vp.transform）/ 方式C（vp.visibleW/H 像素坐标），仅用于维护既有组件，按排期迁移至新标准路径（见 `07_CANVAS_SVG_CHART_RULES.md §2.3`）。
   - **严禁双重缩放反模式**：在**未声明 overlay 参数**时，`viewBox={\`0 0 ${width} ${height}\`}` 同时使用 `vp.transform` → 导致首次进入时画面"缓缓放大"视觉跳变。
9. **Canvas+SVG 混合渲染坐标对齐**（约束 3 的混合渲染特例，含 `canvasRef` 的 `AnimationSvgCanvas`）：
   - **新页面标准路径**：SVG 路径使用 `useSceneScale` + `worldToDesign`（输出设计坐标）；Canvas 路径使用 `useCanvasViewport({ mode: 'raw' })` + `designToPixel`；物理坐标→Canvas 像素通过 `toCanvasPixel = worldToDesign → designToPixel` 两步转换
   - **禁止**：用 `designW/worldWidth` 为基准的 sceneScale 直接计算 SVG 矢量起点设计坐标 → 宽高比不等于设计比时坐标偏移
   - **禁止**：新代码使用 `createSceneScaleFromViewport` 的 `visibleArea`/`centerScale` 模式构造 Canvas sceneScale（输出容器像素，在 `useCanvasViewport({ mode: 'raw' })` 下需手动转换，改用 `useSceneScale` 统一输出设计坐标）
   - **`sceneScale.maxVectorLength`** 已为设计坐标单位（`useSceneScale` 内部计算），SVG VectorArrow 可直接使用；Canvas 绘制需 `metersToPixels = sceneScale.scaleX * vp.scale`
10. **渲染缩放策略互斥**：同一组件只能选一条核心渲染策略。**严禁在 SVG 内用 `<foreignObject>` 嵌入响应式 React 图表组件**（两套缩放叠加导致图表 X 轴消失）；需动画+图表并列时须在 HTML 层 `flex` 分区，两者平级而非嵌套。
11. **viewModel 纯净性**：`model/viewModel.ts` 只返回物理坐标系（y↑ 正）数据，**禁止**引入 `vp.scale`、`vp.transform`、`visibleW`、`visibleH`、`physicsToCanvas` 或任何 SVG/Canvas 坐标。`physicsToCanvas` 映射保留在 `hooks/useXxxPhysics.ts` 层，使缩放、响应式布局和物理计算可独立演进。


### CANVAS_PRESETS 画布预设规格（4 种）

页面主屏为 ThreePanel 固定三栏（左参数 / 中画布 / 右公式），`CANVAS_PRESETS`（定义于 `src/theme/spacing.ts`）按**动画在中屏的布局区域**提供以下四种预设：

| preset | viewBox 设计坐标 | 选用条件 |
|--------|----------------|----------|
| `full`   | 840×650 | 动画独占中屏全区域，无图表分区 |
| `splitV` | 840×325 | 中屏上下并列（上图表+下场景，或反向） |
| `splitH` | 420×650 | 中屏左右并列（左场景+右图表面板） |
| `square` | 650×650 | 圆形或旋转对称（圆周运动、向心力） |

> **新增动画组件只允许使用以上四个有效 preset**。如首次开发无法确定布局，默认选 `full`。
> 存量 `wide`/`tall` 迁移时传 `{ presetCompensation: 1.2 }`，详见 `07_CANVAS_SVG_CHART_RULES.md §2.3`。

### 铁律 5 展开：组件复用

实现动画场景时，**必须优先使用 `src/components/` 下已有组件**，禁止在 `features/` 内重新手写等效逻辑。

**核心 API 入口**（选用逻辑见铁律 1 子约束 3、8）：

| 需求 | 用什么 | import |
|------|--------|--------|
| 动画视口 | `useAnimationViewport` | `@/hooks` |
| SVG 画布容器 | `AnimationSvgCanvas` | `@/components/Layout` |
| 三栏页面布局 | `ThreePanel` | `@/components/Layout` |
| 物理矢量箭头 | `VectorArrow` | `@/components/Physics` |
| 粒子轨迹（历史+预测+拖尾+本体） | `ParticleTrajectory` | `@/components/Physics` |
| 质点/小球 | `Ball` | `@/components/Physics` |
| 滑块/木块 | `Block` | `@/components/Physics` |
| 地面/斜面/参考面 | `PhysicsGround` | `@/components/Physics` |
| 场景物理比例尺 | `useSceneScale` | `@/hooks` |
| 物理坐标→设计坐标 | `worldToDesign` | `@/scene` |
| Canvas 视口 | `useCanvasViewport` | `@/hooks` |
| 左屏控制台 | `LeftPanel` / `LeftPanelSection` | `@/components/UI` |
| 左屏数值参数 | `ParamControl`（通过 `paramMeta` 驱动） | `@/components/UI` |
| 左屏模式开关 | `ControlPanel`（通过 `controlMeta` 驱动） | `@/components/UI` |
| SVG 坐标映射 | `useViewportPointer` | `@/utils` |
| 动画生命周期 | `useAnimationLifecycle` | `@/hooks` |
| 物理图表基座 | `BasePhysicsChart` | `@/components/Chart` |

完整组件清单及 barrel import 规则见 `docs/agent-rules/ui/02_UI_RULES.md §7.1`。
详细调用示例、必需 props、推荐组合与禁止替代写法见 `docs/agent-rules/ui/COMPONENT_REGISTRY.md`；组件完整 API 仍以源码 TypeScript interface / JSDoc 为准。

### 4.1 流程规范（习惯，非铁律）

| 序号 | 规范 |
|------|------|
| 1 | 新增 npm 包先在 PROCESS_LOG.md 申报再安装 |
| 2 | 提交前在 PROCESS_LOG.md 添加记录 |

---

## 5. 规范优先级

1. `project_rules.md`（本文件） - 全局铁律与索引
2. `ARCHITECTURE_RULES.md` - 架构细则
3. `02_UI_RULES.md` - UI 视觉铁律
4. 其他专题规范

---

## 6. 快速索引

| 场景 | 查阅文档 |
|------|----------|
| 公共组件用途、import、最小调用示例 | `docs/agent-rules/ui/COMPONENT_REGISTRY.md` |
| 架构分层、状态管理、数据规则 | `docs/agent-rules/core/ARCHITECTURE_RULES.md` |
| UI 视觉、token 引用、三屏布局 | `docs/agent-rules/ui/02_UI_RULES.md` |
| 动效时长、easing、动画编排 | `docs/agent-rules/ui/03_MOTION_RULES.md` |
| Canvas/SVG/图表动态布局 | `docs/agent-rules/ui/07_CANVAS_SVG_CHART_RULES.md` |
| 真题解析页规范 | `docs/agent-rules/ui/04_ANALYSIS_PAGE_RULES.md` |
| 错题本规范 | `docs/agent-rules/ui/05_WRONGBOOK_RULES.md` |
| 导航与状态保持 | `docs/agent-rules/ui/06_NAVIGATION_RULES.md` |
| 三屏职责与侧屏组件规范 | `docs/agent-rules/ui/08_THREE_PANEL_RULES.md` |
| 里程碑进度 | `docs/agent-rules/roadmap/ROADMAP_PROGRESS.md` |
| 工程日志与提交流程 | `docs/agent-rules/process/PROCESS_LOG.md` |
| 提交 Checklist | `docs/agent-rules/process/CHECKLIST.md` |

---

## 7. 提交 Checklist

提交前按 [CHECKLIST.md](../docs/agent-rules/process/CHECKLIST.md) 逐项验收（80+ 项）。铁律 1–6 违反则提交无效。
