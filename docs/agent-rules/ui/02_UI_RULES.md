# 02_UI_RULES — UI 视觉铁律

&gt; 优先级：低于 core/ARCHITECTURE_RULES，高于 03/04/05
&gt; AI任务入口：涉及任何 UI 实现前必须读本文件，细节查 src/theme/ 代码
&gt; 最后更新：2026-05-31

---

## 1. 设计哲学（不可违反）

本产品气质：**精密学习工具**，介于科学仪器与教育软件之间。

| 维度 | ✅ 应有 | ❌ 禁止 |
|------|--------|--------|
| 颜色 | 深海蓝主色，冷白背景，冷灰中性色 | 彩虹色、荧光色、卡通暖色 |
| Canvas | 干净轴线、精确标注 | 游戏风粒子爆炸、霓虹效果 |
| 动效 | ease-out / ease-in-out，符合物理惯性 | bounce、弹跳、随机飞入 |
| 排版 | 科学论文级清晰度，克制留白 | 过度装饰、四处塞满内容 |

---

## 2. Token 体系（权威来源：src/theme/）

所有实现必须从以下文件引用 token，**禁止硬编码任何颜色/间距/圆角值**：

| 文件 | 内容 | import 路径 |
|------|------|------------|
| `src/theme/colors.ts` | 5套色阶（primary/secondary/accent/neutral/状态色） | `@/theme/colors` |
| `src/theme/physics/colors.ts` | 物理量颜色（~110 token，8 分组） | `@/theme/physics` |
| `src/theme/physics/sceneColors.ts` | 场景器材外观色（磁铁/线圈/灯泡/手势/球体材质等） | `@/theme/physics` |
| `src/theme/physics/chartColors.ts` | 物理图像配色（v-t/P-V/U-I 等 9 组） | `@/theme/physics` |
| `src/theme/physics/canvasStyle.ts` | SVG/Canvas 绘制规范（线宽/箭头/SVG_ATTR/Marker） | `@/theme/physics` |
| `src/theme/spacing.ts` | 间距比例尺（4px基准）+ CANVAS_PRESETS | `@/theme/spacing` |
| `src/theme/animationTokens.ts` | 动画 UI token（ANIM_FONT / ANIM_SHADOW / ANIM_PANEL / CHART_PAD） | `@/theme/animationTokens` |
| `src/theme/radius.ts` | 圆角规范 | `@/theme/radius` |
| `src/theme/shadow.ts` | 阴影规范 | `@/theme/shadow` |
| `src/theme/motion.ts` | 动效时长与 easing | `@/theme/motion` |
| `src/theme/physics/vectorStyle.ts` | VectorType 枚举、视觉权重、颜色映射（矢量系统权威来源） | `@/theme/physics` |
| `src/theme/physics/arrowStyle.ts` | ArrowGeometry 箭头几何规格 | `@/theme/physics` |

Tailwind 配置从 `src/theme/colors.ts` 导入，不在 `tailwind.config.*` 中重复定义颜色值。

---

## 3. 物理量颜色语义（不可更改）

Canvas/SVG 中每类物理量有固定颜色，详见 `src/theme/physics/colors.ts`。
核心摘要：

| 物理量 | 颜色语义 | 十六进制值 | 用途与设计规范 |
|--------|---------|------|------|
| 速度 v | 经典蓝 `velocity` | `#2563EB` | 速度矢量箭头、v-t/y-t曲线等 |
| 加速度 a | 警示红 `acceleration` | `#DC2626` | 加速度矢量箭头、a-t曲线 |
| 合力 F_合 | 动力亮橙 `forceNet` | `#EA580C` | 合力分析主箭头（线宽 3px，粗于分力） |
| 外力 F_外 | 动力深蓝 `appliedForce` | `#1E3A8A` | 外加/施加力矢量（与合力区分） |
| 洛伦兹力/安培力 F_L | 洛伦兹紫 `lorentzForce` | `#8B5CF6` | 洛伦兹力/安培力矢量（与合力区分） |
| 重力 mg | 经典重力绿 `gravity` | `#15803D` | 课本经典的重力绘制颜色（亦可使用 Slate 灰色弱化） |
| 动能 Ek | 动能青 `kineticEnergy` | `#06B6D4` | 动能柱体、电光青色与势能明确区分 |
| 势能 Ep | 势能紫 `potentialEnergy` | `#7C3AED` | 势能柱体、重力/弹性势能，高位储存紫色 |
| 电场 E | 电场黄 `electricField` | `#D97706` | 电场线、电场强度矢量箭头 |
| 磁场 B | 磁场绿 `magneticField` | `#10B981` | 磁场线、磁感应强度，符合人教版教材绿色磁感线习惯 |
| 电动势 ε | 电动势橙黄 `emf` | `#D97706` | 电动势标注（注意：与电场同色系但语义不同） |
| 正电荷 +q | 经典红 `positiveCharge` | `#EF4444` | 正电荷标注 |
| 负电荷 -q | 经典蓝 `negativeCharge` | `#3B82F6` | 负电荷标注 |

**铁律规则**：
1. 同一画面最多同时展示 5 种物理量颜色。
2. 历史轨迹固定使用 `#94A3B8`（Track Gray）。
3. 场景器材材质（如钢珠、滑轨、底座渐变）必须引用 `SCENE_COLORS.materials.*` 的色标数组进行渐变渲染，**禁止任何 HEX 颜色值的硬编码**。
4. 同屏多个同类物理量（如三种力）必须通过子 Token（`appliedForce`、`lorentzForce`、`forceNet`）实现色相分流，禁止全部指派同一颜色。

### 3.0.1 Canvas 内颜色隔离规则（物理色 vs UI 色）

Canvas/SVG 中的颜色按**语义层级**严格隔离，禁止混用：

| 语义层级 | 颜色来源 | 适用场景 | 示例 |
|----------|----------|----------|------|
| **物理量** | `PHYSICS_COLORS.*` | 力、速度、加速度、能量等物理矢量与标注 | `PHYSICS_COLORS.velocity`、`PHYSICS_COLORS.forceNet` |
| **场景器材** | `SCENE_COLORS.*` | 磁铁、线圈、灯泡、滑轨等器材外观材质 | `SCENE_COLORS.magnet.northFace` |
| **Canvas 基础设施** | `CANVAS_COLORS.*` | 网格、坐标轴、标注框、物体描边 | `CANVAS_COLORS.grid`、`CANVAS_COLORS.annotation` |
| **图表** | `CHART_COLORS.*` / `VT_CHART_COLORS.*` 等 | v-t/P-V/U-I 等图表曲线与填充 | `CHART_COLORS.primary` |
| **UI 教学状态** | `colors.primary/danger/success/warning` | 阶段徽章、平衡/失稳指示、警告横幅等**非物理量**的教学反馈 | 阶段 1 蓝、阶段 2 橙、阶段 3 绿 |

**隔离铁律**：
1. **物理 Canvas 内禁止使用 UI 色表达物理量**：力、速度、加速度、电动势等物理量的颜色必须且只能来自 `PHYSICS_COLORS.*`，禁止挪用 `colors.primary`（UI 蓝）或 `colors.danger`（UI 红）充当物理量颜色。
2. **UI 色仅限 Canvas 内的非物理教学元素**：阶段徽章、平衡状态指示、警告横幅、系统分析框等 UI 教学反馈可以使用 `colors.primary/danger/success/warning`，但同一画面中物理量颜色与 UI 教学色不得产生视觉冲突（如同屏的蓝色速度矢量与蓝色阶段徽章）。
3. **`withAlpha` 半透明派生**：需要半透明变体时使用 `withAlpha(token, alpha)`（从 `@/theme/physics` 引入），禁止手动拼接 `rgba()`。
4. **禁止 `colors.neutral.*` 直接用于 Canvas/SVG**：网格线、参考线、分隔线、标注框底色等 Canvas 基础设施颜色必须通过 `CANVAS_COLORS.*` 或 `CHART_COLORS.*` 引用，禁止直接使用 `colors.neutral[200]`/`colors.neutral[300]`/`colors.neutral.white` 等裸值。对应关系：`CANVAS_COLORS.grid` = neutral[200]，`CHART_COLORS.reference` = neutral[400]。
5. **禁止子路径导入**：`withAlpha` 等 theme 导出必须从 `@/theme/physics` 统一入口引入，禁止 `from '@/theme/physics/colors'` 等子路径导入。
6. **SVG 文字必须用 `font()` 缩放**：Canvas/SVG 内所有 `<text fontSize={...}>` 必须使用 `font(N)` 函数包裹（内置 clamp 7–16），禁止裸值 `fontSize={11}` 或手动 `Math.max(10, ...)` 计算。

### 3.1 球体材质附加规范

1. **统一渲染组件**：所有小球、钢珠、摆球、砝码球、行星等圆球物理实体的渲染，**必须**使用统一公共组件 `<Ball>`（位于 `src/components/Physics/Ball.tsx`）。**禁止**在单个动画页面中手绘圆球图层、SVG `<circle>` 或自造渐变 `<radialGradient>`。
2. **渐变 ID 防冲突**：组件内部通过 React 19 的 `useId()` 自动生成独立唯一的局部 SVG 渐变 ID，用以彻底杜绝原有的 `steel-sphere-grad` 和 `vacuum-sphere-grad` 等重复定义导致的跨文件 SVG ID 命名冲突。
3. **不得滥用语义色**：球体本体材质外观完全从 `SCENE_COLORS.sphere.*` 预设中读取，**禁止**借用物理量语义色 `PHYSICS_COLORS`（如速度、加速度颜色）充当物理实体本身的颜色。
4. **材质精准对照**：主钢珠统一使用 `SCENE_COLORS.sphere.steel`，投影/真空对照球统一使用 `SCENE_COLORS.sphere.steelGhost`。摆球、砝码球、行星应分别使用对应 preset（`pendulumBob` / `brassWeight` / `planetCool`），避免同一项目内材质风格漂移。新增球体材质必须先扩展 `sceneColors.ts`，禁止在组件内私自定义配色体系。

### 3.2 滑块与滑车材质规范

1. **统一渲染组件**：所有矩形物块、滑动木箱、不锈钢滑块、实验小车等非球体常规位移实体的渲染，**必须**使用统一公共组件 `<Block>`（位于 `src/components/Physics/Block.tsx`）。**禁止**在单个动画页面中手绘滑块 `<rect>`、板纹、滑轮或自造渐变。
2. **材质类型选择**：
   - 使用 `wood` 材质渲染普通木箱（适用于摩擦力模型一/二中的滑块）。
   - 使用 `metal` 材质渲染精密不锈钢滑块（适用于牛顿第二定律等滑轨滑块）。
   - 使用 `woodCart` 材质渲染带滑轮的木质小车（适用于动能定理、动量守恒等小车实验）。
   - 使用 `metalCart` 材质渲染带滑轮的不锈钢滑车（适用于速度、变加速等滑轨小车实验）。
3. **ID 冲突防范**：组件内部通过 React 19 的 `useId()` 自动生成独立的渐变 ID 后缀，彻底杜绝原有的 `box-grad`、`slider-metal` 和 `slider-metal-grad` 等重复定义导致的跨文件 SVG 渐变 ID 命名冲突。

### 3.3 电学器材与实验实体规范

**LED/数显特有色**：LED 数显屏、数码管等电子发光元件的颜色必须引用 `SCENE_COLORS.electricalApparatus`：

| Token | 用途 | 示例组件 |
|-------|------|----------|
| `ledScreenBg` | LED 数显屏暗色底壳 | DCSource |
| `ledDisplayGreen` | 数码管发光绿（正常显示） | DCSource |
| `ledDisplayRed` | 数码管发光红（超载指示） | DCSource |

**电学五金件部件**：接线柱、滑杆、变阻器支架等金属/塑料部件的颜色必须引用 `SCENE_COLORS.electricalApparatus`：

| Token | 用途 | 示例组件 |
|-------|------|----------|
| `terminalBody` | 接线柱塑料外壳 (stone-600) | Rheostat |
| `terminalCap` | 接线柱旋帽深色 (stone-800) | Rheostat |
| `terminalCore` | 接线柱/滑轨金属柱芯 (slate-300) | Rheostat |
| `rheostatBase` | 变阻器铸铁支架 (stone-700) | Rheostat |

### 3.4 跑车与车辆模型规范

1. **统一渲染组件**：所有流线型跑车、飞奔车辆等赛道位移实体的渲染，**必须**使用统一公共组件 `<SportsCar>`（位于 `src/components/Physics/SportsCar.tsx`）。**禁止**在单个动画页面中手绘跑车车身 `<path>`、十字辐条车轮或空气尾流线。
2. **动感视觉表达**：车辆在运动中，其车轮必须结合速度与时间动态旋转；在车尾应绘制层流空气尾流线表现动感，禁止使用静态图形充当运动状态。
3. **尺寸与缩放规范**：该组件设计基准尺寸为 `56x26`，支持通过 `width` 和 `height` 进行外层矢量等比/非等比无损缩放。

---

## 4. 信息密度铁律

**Canvas 黄金规则：任意时刻可见元素 ≤ 7个**

| 层级 | 默认可见 | 默认隐藏（toggle开启） |
|------|---------|---------------------|
| 必要层 | 物体、轨迹、坐标轴 | — |
| 重要层 | 主矢量（速度/合力） | 分量矢量 |
| 辅助层 | 当前物理量标注 | 参考线、网格 |
| 分析层 | — | 加速度矢量、历史轨迹 |

三屏布局密度上限：
- 左侧参数区：最多 **5个参数**
- Canvas 中间：最多 **7个元素**，Canvas内文字标注 ≤ 5个
- 右侧看板：最多 **8行物理量** + 高考要点卡片（≤ 3条，每条≤ 30字）

---

## 5. 三屏联动布局规范

使用 `ThreePanel` 组件（`@/components/Layout`），断点与面板宽度由 `BREAKPOINT` / `PANEL` 常量（`@/theme/spacing`）驱动：

| 断点 | 左侧 | 中间 | 右侧 |
|------|------|------|------|
| ≥ 1440px（standard） | 280px 固定 | 自适应 | 320px 固定 |
| 1280–1439px（compact） | 240px 固定 | 自适应 | 280px 固定 |
| 1024–1279px（tablet） | 抽屉（齿轮图标触发） | 自适应 | 280px 固定 |
| < 1024px（mobile） | 抽屉 | 自适应 | 下移至 Canvas 下方 |

- 面板背景：bg-neutral-50；分隔线：border-neutral-200 1px
- 顶部栏：高度 56px，bg-primary-800，白色文字
- 底部控制栏：高度 48px，播放/暂停/重置/速度/进度条

### 5.1 三屏职责边界（不可违反）

| 区域 | 核心职责 | 可包含 | 不应承载 |
|------|----------|--------|----------|
| 左侧屏 | 交互控制 | ParamControl、SegmentedControl、ToggleSwitch、OptionButton、TipCard | 公式体系、知识讲解、高考考点 |
| 中间屏 | 现象展示 | 动画、图表、数据表、实时标注、AnimationControls、InfoBar | 完整知识清单、系统性公式推导、高考总结 |
| 右侧屏 | 知识展示 | 物理量、公式（含适用条件）、高考要点、易错点 | 参数调节、模式切换、播放状态控制 |

**职责分离铁律**：
- 左侧屏只承载参数、模式、状态等交互控制
- 中间屏不承载完整公式体系和知识讲解；允许出现与当前图像、动画、实时计算直接相关的短公式标注
- 右侧屏不承载任何可交互参数控件或动画状态控制
- 详细规范见 `docs/agent-rules/ui/08_THREE_PANEL_RULES.md`

---

## 6. 学习状态视觉体系

### 知识点掌握四态

```
未学习（neutral-300）→ 已浏览（primary-400）→ 练习中（primary-600）→ 已掌握（success-500）
```

状态变化有 300ms transition；已掌握节点有 `box-shadow: glowRing.mastered（详见 src/theme/shadow.ts）` 光晕。

### 高考重要性标签（5级，使用 accent 金色系）

| importance | 标签 | 样式 |
|-----------|------|------|
| `gaokao` | 高考高频 ⭐ | accent-100 背景，accent-700 文字，左侧4px金色竖条 |
| `hard` | 难点 | danger-100 背景，danger-700 文字 |
| `core` | 核心 | primary-100 背景，primary-700 文字 |
| `basic` | 基础 | neutral-100 背景，neutral-600 文字 |
| `extend` | 拓展 | secondary-100 背景，secondary-700 文字 |

### 动画播放状态

| 状态 | 视觉变化 |
|------|---------|
| 播放中 | 顶部 2px primary-500 进度条 |
| 暂停 | Canvas opacity 0.9 dimmed |
| 慢放 &lt; 1x | 进度条变 secondary-400 |
| 快放 &gt; 1x | 进度条变 accent-500 |

---

## 7. 组件规范摘要

### 按钮尺寸

| 尺寸 | 高度 | 字号 |
|------|------|------|
| sm | 32px | 13px |
| md（默认）| 40px | 14px |
| lg | 48px | 16px |

### 按钮变体（详见 src/theme/colors.ts）

Primary（primary-600）/ Secondary（white + primary边框）/ Ghost（transparent）/ Danger（danger-500）

### 排版层级

| 级别 | 尺寸/字重 | 颜色 |
|------|---------|------|
| h1 | 28px/700 | neutral-800 |
| h2 | 22px/600 | neutral-800 |
| h3 | 18px/600 | neutral-700 |
| body | 15px/400 | neutral-600 |
| body-sm | 13px/400 | neutral-500 |
| mono（数值）| 14px/400 | neutral-700 |

字体栈：`'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif`

**Canvas/SVG 内字体**：动画组件中的 SVG 文字标注必须使用 `useCanvasSize()` 返回的 `font()` 函数缩放（如 `fontSize={font(11)}`），禁止裸值 `fontSize={11}`。`font()` 内置 clamp(7, 16) 保证可读性。设计基准值参考 `ANIM_FONT`（`@/theme/animationTokens`）。

### 数值显示规则

- 正数：neutral-700；负数：danger-600；零值：neutral-400（弱化）；极值：accent-600 + bold
- 单位：body-sm neutral-500，数值右侧 4px

### KaTeX 公式

- 行内：同正文字号，上下 2px margin
- 块级：primary-50 背景，rounded-sm，padding 12px 16px，上下 16px margin

### 组件必须实现的8态

默认 / Hover / Focus（primary-500 outline 2px）/ Active（scale 0.97）/ Disabled（opacity-40）/ Loading（spinner）/ 空态 / 错误态

### 7.1 物理公共器材与实验实体（公共组件规范）

物理实验实体组件（如电学的灯泡，力学的滑块、小车、小球等）统一存放在 `src/components/Physics/` 下。

* **接口文档化**：组件的 API Props、动效和设计意图**必须**在组件代码内通过 TypeScript 接口与 JSDoc 详细注释（自文档化），禁止在 UI 规范文档中列出具体 Props 细节。
* **复用铁律**：开发新场景前必须先检查该目录。**禁止**在单个页面中重复手绘或重写已有的器材/实体（如小灯泡、小车等）。
* **新增规范**：若需新增通用物理器材（如滑块等），应将其抽离为 `src/components/Physics/` 下的独立组件，并严格保证所有颜色来自 `SCENE_COLORS`。

---

## 8. UI 专属禁止项

- 禁止硬编码任何颜色值（包括 Canvas 内部）
- Canvas 物理量颜色必须从 `src/theme/physics/` 引用
- 禁止在 Canvas 内使用 lucide 图标（用 SVG 路径手绘）
- 禁止单页面试验深色模式（当前阶段浅色优先）
- 禁止发明新颜色或新 token（先更新 src/theme/ 对应文件）
- 禁止在 `tailwind.config.*` 中重复定义颜色值（从 colors.ts 导入）

---

## 9. 详细规则索引

| 需要查询 | 查阅位置 |
|---------|---------|
| 完整色阶 HEX 值 | `src/theme/colors.ts` |
| 物理量颜色完整表 | `src/theme/physics/colors.ts` |
| 动效时长/easing | `src/theme/motion.ts` → `ui/03_MOTION_RULES.md` |
| AnalysisPage 版式 | `ui/04_ANALYSIS_PAGE_RULES.md` |
| 错题本卡片 | `ui/05_WRONGBOOK_RULES.md` |
| Canvas 元素尺寸 | `src/theme/physics/canvasStyle.ts` |
| 三屏职责与侧屏组件规范 | `ui/08_THREE_PANEL_RULES.md` |
