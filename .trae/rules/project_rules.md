# 项目规范 — 高中物理交互动画学习系统

> **Trae IDE 默认加载的项目规范文件。**
> 详细规范见下方「快速索引」部分。
> 最后更新：2026-07-04

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

```text
src/
├── app/          # 应用壳、路由、全局布局
├── components/   # 公共组件（Layout / Chart / Physics / UI）
├── hooks/        # 跨页面复用 Hook（useAnimationLifecycle 等）
├── pages/        # 页面级容器（薄壳，不放复杂业务逻辑）
├── scene/        # 场景配置与坐标缩放（SceneConfig、SceneScale）
├── features/     # 按学科/能力拆分的业务模块（mechanics / electromagnetism / …）
├── physics/      # 纯物理计算（无副作用，不得依赖 React/DOM/window）
├── math/         # 数学工具（矢量、三角、矩阵、数值求解）
├── utils/        # 坐标、动画、存储等共享工具
├── data/         # 类型定义、题库、注册表、物理量构建器
├── stores/       # Zustand 状态管理
theme/            # 设计 token（颜色/间距/圆角/阴影/动效）
```

> 完整目录树（含二级子目录、文件列表）见 `docs/agent-rules/core/ARCHITECTURE_RULES.md §2`。

---

## 4. 全局铁律（不得违反）

> 铁律 = 违反会直接导致系统 bug 的架构约束。流程习惯见下方 §4.1。

| 序号 | 铁律 | 禁止 |
|------|------|------|
| 1 | **统一来源，禁止绕过**（八条约束见下方展开） | 硬编码颜色/魔法数字/裸值 `fontSize={N}`/自造 `<marker>`/直接 `requestAnimationFrame`/写死 `scale = N` |
| 2 | **物理层纯函数可序列化**：`src/physics/` 无副作用、无 DOM/React/window 依赖、有 JSDoc + 单位注释；所有数据结构可序列化（IndexedDB 持久化兼容） | 在 `physics/` 中访问 DOM/Store；不可序列化的数据结构（Set/Map/Function） |
| 3 | **组件职责边界**：页面组件薄壳（路由+布局+数据注入）；三屏不交叉（详见 `02_UI_RULES.md §5.1`）；动画状态统一 `useAnimationStore` | 页面塞业务逻辑；右侧屏放参数控件；左侧屏放公式推导；另建 `usePhysicsState` |
| 4 | **HashRouter only**：禁止 BrowserRouter（Electron `file://` 下路由 404） | BrowserRouter |
| 5 | **组件复用优先**：场景中存在可复用组件时必须直接使用，禁止在 `features/` 中重复手写等效实现（详见下方展开） | 手写地面纹理/球体/滑块/矢量箭头/图表轴等已有组件实现 |
| 6 | **左屏控制台声明式优先**：左屏必须使用 `LeftPanel` 体系；数值参数优先 `paramMeta → ParamControl`，模式/开关/预设/提示优先 `controlMeta → ControlPanel`；`SidebarExtra` 仅保留复杂自定义控制 | 新页面手写散乱左屏容器、简单模式切换/开关仍写 SidebarExtra、直接手写 `input[type=range]` |

### 铁律 1 展开：统一来源八条约束

1. **颜色/间距/圆角/阴影/动效** → 必须从 `src/theme/` 子模块引用
2. **坐标转换** → 必须走 `physicsToCanvas()`（`src/utils/coordinate.ts`）
3. **动画调度** → 必须通过 `src/utils/animation.ts` 的 Hook（禁止直接调用 `requestAnimationFrame`）
4. **矢量箭头** → 必须走 `VectorArrow` 组件 + `refMagnitudes` 归一化（`vectorStyle.ts` 为颜色权威）
5. **画布尺寸** → 必须走 `useCanvasSize(CANVAS_PRESETS.xxx)`（`src/theme/spacing.ts`）
6. **字体缩放** → 必须走 `font()` 函数（内置 clamp 7–16，来自 `useCanvasSize` 返回值）
7. **布局缩放与 viewBox 绑定策略（新页面唯一标准）**：
      - **新页面唯一标准路径**：必须使用 `useAnimationViewport` 复合 Hook + `AnimationSvgCanvas` 标准容器组件（详见 `07_CANVAS_SVG_CHART_RULES.md §2.2`），以消除 designWidth/designHeight 与 preset 的手动同步偏差，并完全规避双重缩放。
      - **存量迁移参考**：存量页面旧的三类体系（固定 viewBox 方式 A、动态 viewBox + overlay 方式 B、可视区像素方式 C）仅供重构参考，禁止新建。
      - **严禁双重缩放反模式**：在未声明 overlay 参数时，`viewBox={\`0 0 ${width} ${height}\`}` 同时使用 `vp.transform` → 导致首帧放大跳变（AnimationSvgCanvas 从架构上消除了此问题）。
   8. **渲染缩放策略互斥**（注意：此处「SVG方式A/B/C」与 `ARCHITECTURE_RULES.md §6` 坐标路径含义不同）→ 同一组件只能选一条核心渲染策略：**新标准路径** 内部用设计常量，禁止再乘 `scale` 或引用 `canvasSize.width/height`；**响应式与可视区（旧方式B/C）** 走 `useCanvasSize` / `useViewport` 返回的尺寸与缩放属性；**严禁在 SVG 画布内用 `<foreignObject>` 嵌入响应式 React 图表组件**；需动画+图表并列时须在 HTML 层 `flex` 分区，两者平级而非嵌套。

### CANVAS_PRESETS 画布预设规格（4 种）

页面主屏为 ThreePanel 固定三栏（左参数 / 中画布 / 右公式），`CANVAS_PRESETS`（定义于 `src/theme/spacing.ts`）按**动画在中屏的布局区域**提供以下四种预设：

> ⚠️ 以下为 SVG viewBox **逻辑坐标系尺寸，非屏幕像素**。
> `useCanvasSize` 在运行时将所选比例等比缩放至物理容器；
> `useViewport` 的 `designWidth/designHeight` 必须与所选 preset 完全一致。
> **基准**：1440px 标准桌面下，中屏实际幓 ≈ 840px、可用高 ≈ 650px（扭除顶栏 56px + 控制条 48px）。

| preset | viewBox 设计坐标 | 定义 | 选用条件 |
|--------|----------------|------|-------------------------------|
| `full`   | 700×650 | 全区域，AR≈1.08:1 | 动画**独占中屏全区域**，无图表分区 |
| `splitV` | 700×325 | 上下分区，高度为 full 的一半 | 中屏**上下并列**（上图表+下场景，或反向） |
| `splitH` | 350×650 | 左右分区，宽度为 full 的一半 | 中屏**左右并列**（左场景+右图表面板） |
| `square` | 650×650 | 1:1 正方形 | 主体为**圆形或旋转对称**（圆周运动、向心力） |

> **新增动画组件只允许使用以上四个有效 preset**。如首次开发无法确定布局，默认选 `full`。
> **存量废弃预设（`wide`/`tall`）平滑迁移指南**：在将存量 `CANVAS_PRESETS.wide` (700×400) 或 `tall` (700×450) 迁移为标准 `full` (700×650) 时，为避免字体和视觉元素缩水 17% 产生跳变，**必须在 `useCanvasSize` 传参中配置 `{ presetCompensation: 1.2 }`**（如 `useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })`），即可低成本平滑保留原有的视觉放大效果。

### 铁律 5 展开：组件复用

实现动画场景时，**必须优先使用 `src/components/` 下已有组件**，禁止在 `features/` 内重新手写等效逻辑。

左屏控制区是组件复用重点：
- 顶层统一使用 `LeftPanel` / `LeftPanelSection` / `LeftPanelScrollArea`
- 数值参数优先放入 registry 的 `paramMeta`，由 `ParamControl` 渲染
- 模式、开关、预设、提示优先放入 registry 的 `controlMeta`，由 `ControlPanel` 渲染
- `SidebarExtra` 仅用于复杂自定义控制，内部也必须复用 `LeftPanelSection`

完整组件清单（Physics / Chart / Layout / UI 四个目录）及 barrel import 规则见 `docs/agent-rules/ui/02_UI_RULES.md §7.1`。

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

## 7. 任务完成摘要 Checklist

> 提交前按 [CHECKLIST.md](../docs/agent-rules/process/CHECKLIST.md) 逐项验收（完整 80+ 项）。
> 以下为铁律最高优先级核心项，违反则提交无效：

- [ ] 无硬编码颜色/间距/动效/魔法数字/裸值 fontSize（铁律 1）
- [ ] 新增 `src/physics/` 函数有 JSDoc + 单位注释，无 DOM 依赖（铁律 2）
- [ ] 页面组件薄壳，三屏职责不交叉（铁律 3）
- [ ] 场景中优先使用 `src/components/` 已有组件，禁止 `features/` 内重复手写（铁律 5）
- [ ] 左屏已使用 `LeftPanel` 体系；数值参数走 `paramMeta`，模式/开关/预设走 `controlMeta`（铁律 6）
- [ ] PROCESS_LOG.md 已更新
