# 项目规范 — 高中物理交互动画学习系统

> **Trae IDE 默认加载的项目规范文件。**
> 详细规范见下方「快速索引」部分。

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

> 技术栈细则与依赖清单见 `docs/agent-rules/core/ARCHITECTURE_RULES.md §1`。

---

## 3. 目录结构

```text
src/
├── app/                    # 应用壳、路由、全局布局
├── components/
│   ├── Layout/             # 布局组件（ThreePanel 等）
│   ├── Chart/              # 图表基础设施（BasePhysicsChart、ChartCursor、ChartArea、ChartTangent）
│   ├── Physics/            # 物理渲染公共组件（Ball、Block、SportsCar、VectorArrow、
│   │                       #   VectorDefs、HandRule、RotatingCoil、MagneticPoles…）
│   └── UI/                 # UI 基础组件
├── hooks/                  # 跨页面复用 Hook
│   └── useAnimationLifecycle.ts  # AnimationPage 生命周期封装（config加载/播放循环/进度标记）
├── pages/                  # 页面级容器（薄壳，不放复杂业务逻辑）
├── scene/                  # 场景配置与坐标缩放（SceneConfig、SceneScale）
├── features/               # 按学科/能力拆分的业务模块
│   ├── mechanics/          # 力学动画（按物理主题分子目录）
│   │   ├── kinematics/     #   运动学（速度、加速度、自由落体、平抛…）
│   │   ├── dynamics/       #   动力学（牛顿定律、摩擦力、平衡…）
│   │   ├── circular/       #   圆周运动
│   │   ├── gravitation/    #   万有引力
│   │   ├── momentum/       #   动量与冲量
│   │   ├── energy/         #   功与能量
│   │   └── force-motion/   #   力-运动沙盒（多力综合演示）
│   ├── electromagnetism/   # 电磁学动画（按物理主题分子目录）
│   │   ├── electrostatics/ #   静电场（库仑、电场、电容器…）
│   │   ├── dc-circuits/    #   恒定电流（欧姆、串并联…）
│   │   ├── magnetism/      #   磁场（安培力、洛伦兹力…）
│   │   └── induction/      #   电磁感应与交变电流
│   ├── thermodynamics/     # 热学（待开发）
│   ├── optics/             # 光学（待开发）
│   ├── atomic/             # 原子物理（待开发）
│   ├── practice/           # 练习会话组件
│   └── dev/                # 开发调试专用（不纳入生产功能，不写入注册表）
├── physics/                # 纯物理计算（无副作用，不得依赖 React/DOM/window）
├── math/                   # 数学工具（矢量、三角、矩阵、数值求解）
├── utils/                  # 坐标、动画、存储、轨迹插值等共享工具
│   ├── animation.ts        #   动画帧 Hook（useAnimationFrame / useSimulationFrame）
│   ├── coordinate.ts       #   坐标转换（physicsToCanvas / computeScale）
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
│   ├── animationRegistry.ts # 动画注册表（薄合并入口，合并所有子注册表）
│   ├── analysisRegistry.ts  # 题目解析注册表
│   └── physicsQuantities.ts # 物理量懒注册入口（按动画 ID 懒加载对应模块）
└── stores/
    ├── useAnimationStore.ts # 播放状态、时间轴、速度、参数、显示开关（showVectors 等）
    ├── useAppStore.ts       # 全局 UI 状态（不得与业务状态混写）
    ├── useKnowledgeStore.ts # 知识树展开、当前节点
    ├── useProblemStore.ts   # 题目进度、答题状态
    ├── useProgressStore.ts  # 学习进度
    ├── usePracticeStore.ts  # 练习会话状态
    └── useWrongStore.ts     # 错题记录

src/theme/                  # 设计 token（颜色/间距/圆角/阴影/动效）
├── colors.ts               # UI 语义色
├── physics/                # 物理主题子模块（推荐入口 @/theme/physics）
│   ├── colors.ts           # 物理量颜色（~110 token，8 分组）
│   ├── sceneColors.ts      # 场景器材外观色
│   ├── chartColors.ts      # 物理图像配色
│   ├── canvasStyle.ts      # SVG/Canvas 绘制规范
│   ├── vectorStyle.ts      # VectorType 枚举、视觉权重、颜色映射（矢量系统权威来源）
│   ├── arrowStyle.ts       # ArrowGeometry 箭头几何规格
│   └── index.ts            # 统一导出入口（推荐引用路径 @/theme/physics）
├── spacing.ts              # 间距比例尺 + 布局固定尺寸 + 密度上限 + CANVAS_PRESETS
├── radius.ts               # 圆角规范
├── shadow.ts               # 阴影规范
├── motion.ts               # 动效时长与 easing
├── animationTokens.ts      # 动画 UI token（ANIM_FONT/SHADOW/PANEL/CHART_PAD）
└── index.ts                # 统一导出入口
```

---

## 4. 全局铁律（不得违反）

> 铁律 = 违反会直接导致系统 bug 的架构约束。流程习惯见下方 §4.1。

| 序号 | 铁律 | 禁止 |
|------|------|------|
| 1 | **统一来源，禁止绕过**（六条约束见下方展开） | 硬编码颜色/魔法数字/裸值 `fontSize={N}`/自造 `<marker>`/直接 `requestAnimationFrame`/写死 `scale = N` |
| 2 | **物理层纯函数可序列化**：`src/physics/` 无副作用、无 DOM/React/window 依赖、有 JSDoc + 单位注释；所有数据结构可序列化（IndexedDB 持久化兼容） | 在 `physics/` 中访问 DOM/Store；不可序列化的数据结构（Set/Map/Function） |
| 3 | **组件职责边界**：页面组件薄壳（路由+布局+数据注入）；三屏不交叉（详见 `02_UI_RULES.md §5.1`）；动画状态统一 `useAnimationStore` | 页面塞业务逻辑；右侧屏放参数控件；左侧屏放公式推导；另建 `usePhysicsState` |
| 4 | **HashRouter only**：禁止 BrowserRouter（Electron `file://` 下路由 404） | BrowserRouter |

### 铁律 1 展开：统一来源六条约束

1. **颜色/间距/圆角/阴影/动效** → 必须从 `src/theme/` 子模块引用
2. **坐标转换** → 必须走 `physicsToCanvas()`（`src/utils/coordinate.ts`）
3. **动画调度** → 必须通过 `src/utils/animation.ts` 的 Hook（禁止直接调用 `requestAnimationFrame`）
4. **矢量箭头** → 必须走 `VectorArrow` 组件 + `refMagnitudes` 归一化（`vectorStyle.ts` 为颜色权威）
5. **画布尺寸** → 必须走 `useCanvasSize(CANVAS_PRESETS.xxx)`（`src/theme/spacing.ts`）
6. **字体缩放** → 必须走 `font()` 函数（内置 clamp 7–16，来自 `useCanvasSize` 返回值）

### CANVAS_PRESETS 画布预设规格（7 种）

| preset | 尺寸 | 典型场景 |
|---|---|---|
| `tall` | 700×450 | 动量、库仑、电容、电场、电势、场线 |
| `standard` | 700×420 | 能量、摩擦力、速度选择器、闭合电路 |
| `mediumTall` | 650×450 | 万有引力、矢量合成、开普勒、卫星 |
| `wide` | 700×400 | 匀加速、感应、洛伦兹、热学 |
| `mediumWide` | 650×400 | 欧姆定律、弹簧力、失重、牛二 CenterExtra |
| `square` | 600×600 | 圆周运动、向心力、边界磁场 |
| `extraWide` | 800×440 | 变压器、法拉第、输电、光学 |

> 新增动画组件应优先选用匹配尺寸的 preset。仅当布局有特殊需求（占位符/紧凑子场景/唯一比例）时允许硬编码 `{ width, height }`。

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

> 以下为**铁律最高优先级**验证项，违反则提交无效。完整 35 项验收清单见 [CHECKLIST.md](../docs/agent-rules/process/CHECKLIST.md)。

- [ ] 当前里程碑文件对应任务已标记完成
- [ ] PROCESS_LOG.md 已更新
- [ ] 新增依赖已申报（如适用）
- [ ] 无硬编码颜色/间距/动效/魔法数字/裸值 fontSize（铁律 1）
- [ ] Canvas/SVG 内无 `colors.neutral.*` 裸值，均通过 `CANVAS_COLORS`/`CHART_COLORS` 引用
- [ ] 无子路径导入（`from '@/theme/physics/colors'` 等），均从 `@/theme/physics` 统一入口引入
- [ ] SVG `<text>` 全部使用 `font()` 缩放，无裸值 `fontSize={N}`
- [ ] 新增图表必须使用 `BasePhysicsChart` + 插件体系，禁止手写 `toSvgX/toSvgY` 坐标变换
- [ ] 图表颜色使用 `ChartReferenceVariant`/`ChartSeriesVariant`/`ChartAreaVariant` 枚举，禁止传入任意字符串颜色
- [ ] 图表组件从 `@/components/Chart` barrel import，禁止子路径导入
- [ ] 布局响应式：`useCanvasSize()` + `computeScale()` + `font()`（铁律 1）
- [ ] 新增 `src/physics/` 函数有 JSDoc + 单位注释，无 DOM 依赖（铁律 2）
- [ ] 页面组件薄壳，三屏职责不交叉（铁律 3）
- [ ] ROADMAP_PROGRESS.md 已更新（如适用）
