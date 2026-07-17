# AGENTS.md — Antigravity 工作区规则（自动加载，优先级最高）

> 本文件由 Antigravity IDE 自动加载，无需手动读取。铁律违反 = 本次任务无效。
> 详细规范见 `.trae/rules/project_rules.md` 与 `docs/agent-rules/` 下各文档。

---

## ⚡ 三屏内容分配铁律（设计前必读）

```
左屏（LeftPanel）         中屏（AnimationSvgCanvas）        右屏（PhysicsPanel）
──────────────────        ──────────────────────────        ──────────────────────
• paramMeta 数值参数      • 动画场景（SVG 主体）            • QuantitySection（物理量）
• controlMeta 模式开关    • CenterExtra 图表（可选）         • FormulaSection（公式+条件）
• SidebarExtra（复杂）    ❌ 禁止大段教学文字              • ExamPointSection（高考要点）
                          ❌ 禁止完整公式推导               ❌ 禁止动画控制控件
                          ❌ 禁止高考考点总结
```

**主屏文字约束**：SVG 内只允许出现物理量数值标注（`v = 3.2 m/s`）和坐标轴标签，禁止教学解释段落。

## ⚡ 布局 preset 选择铁律（分屏是主流，按动画方向选）

> 动画配合图表更能帮助学生理解物理过程，**`splitV`/`splitH` 是大多数页面的首选**。

| preset | 设计尺寸 | 选用条件 |
|--------|---------|---------|
| `CANVAS_PRESETS.splitV` | 840×325 | **水平运动**（追及、碰撞、平抛）或**多图表并列**（v-t + x-t + a-t） |
| `CANVAS_PRESETS.splitH` | 420×650 | **垂直/斜向运动**（自由落体、斜抛、弹簧振子） |
| `CANVAS_PRESETS.full` | 840×650 | 无需配套图表的纯场景（光学、磁场分布等） |
| `CANVAS_PRESETS.square` | 650×650 | 圆形/旋转对称（圆周运动、向心力） |

**决策直觉**：水平运动 → `splitV`；竖直运动 → `splitH`；多图表并列 → `splitV`；无图表 → `full`

> ❌ 严禁 `wide` / `tall` 等废弃 preset；严禁手写 `width={900}` 固定像素。

---

## ⚡ 其他铁律速查（违反则任务无效）

### 铁律 1：统一来源，禁止硬编码

| ❌ 禁止 | ✅ 正确替代 |
|--------|-----------|
| 硬编码颜色 `fill="#3B82F6"` | `import { PHYSICS_COLORS } from '@/theme/physics'` |
| 硬编码尺寸 `fontSize={14}` | `font(14)`（来自 `canvasSize.font`） |
| 自造 `<marker>` / `<line>` 矢量箭头 | `PhysicsVectorArrow` 或 `VectorArrow` |
| 直接 `requestAnimationFrame(...)` | `useAnimationLifecycle` / `src/utils/animation.ts` |
| 写死 `scale = 0.8` | `useSceneScale({ vp, preset, anchor })` |
| 任何魔法数字坐标 | `worldToDesign()` from `@/scene` |

### 铁律 2：新页面布局唯一路径

```tsx
// ✅ 唯一标准写法（新页面必须）
const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
const sceneScale = useSceneScale({ vp, preset: CANVAS_PRESETS.full, anchor: 'center' })
<AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
  ...
</AnimationSvgCanvas>
```

```tsx
// ❌ 禁止（存量遗留，新建页面严禁使用）
viewBox={`0 0 ${width} ${height}`}           // 历史方式A（固定 viewBox）
createSceneScaleFromViewport({ mode: 'visibleArea' })  // deprecated
physicsToCanvas(...)                          // 仅用于维护旧组件
```

### 铁律 3：左屏控制台必须使用声明式体系

```tsx
// ✅ 正确
paramMeta → 由 registry 驱动 ParamControl（数值参数）
controlMeta → 由 registry 驱动 ControlPanel（模式/开关/提示）
// ❌ 禁止
手写 <input type="range" />   // 散乱控件
新建 SidebarExtra 放简单开关  // 仅复杂自定义才用
```

### 铁律 4：组件复用，禁止重复手写

| 场景 | 必须使用 | import |
|------|---------|--------|
| 三栏页面 | `ThreePanel` | `@/components/Layout` |
| SVG 画布容器 | `AnimationSvgCanvas` | `@/components/Layout` |
| 质点/小球 | `Ball` | `@/components/Physics` |
| 滑块/木块 | `Block` | `@/components/Physics` |
| 地面/斜面 | `PhysicsGround` | `@/components/Physics` |
| 物理矢量 | `PhysicsVectorArrow` | `@/components/Physics` |
| 视觉标注箭头 | `VectorArrow` | `@/components/Physics` |
| 粒子轨迹 | `ParticleTrajectory` | `@/components/Physics` |
| 物理图表基座 | `BasePhysicsChart` | `@/components/Chart` |
| 实时时序图 | `MiniChart` | `@/components/UI` |
| 左屏容器 | `LeftPanel` / `LeftPanelSection` | `@/components/UI` |

**图表约束**：禁止手写 `toSvgX / toSvgY` 坐标轴；禁止 `<foreignObject>` 内嵌 React 图表；需图表时必须在现有组件基础上扩展或组合。

| 图表需求 | 必须使用 | import |
|---------|---------|--------|
| v-t 图 | `VelocityTimeChart` | `@/components/Chart` |
| x-t 图 | `DisplacementTimeChart` | `@/components/Chart` |
| a-t 图 | `AccelerationTimeChart` | `@/components/Chart` |
| 自定义关系图 | `BasePhysicsChart` + 插件 | `@/components/Chart` |
| 轻量实时图 | `MiniChart` | `@/components/UI` |

### 铁律 4B：颜色语义层级隔离（混用即违规）

| 语义层级 | 来源 | 适用场景 | ❌ 禁止 |
|---------|------|---------|--------|
| 物理量 | `PHYSICS_COLORS.*` | 力/速度/加速度矢量标注 | 用 `colors.primary` 表示速度 |
| 场景器材 | `SCENE_COLORS.*` | 磁铁/线圈/球体材质 | 用 `PHYSICS_COLORS` 表示器材 |
| Canvas 基础设施 | `CANVAS_COLORS.*` | 网格线/坐标轴/参考线 | 用 `colors.neutral[200]` 直接 |
| 图表 | `CHART_COLORS.*` / `VT_CHART_COLORS.*` | 图表曲线 | 混用 PHYSICS_COLORS |
| 透明度变体 | `withAlpha(token, 0.3)` | 任意半透明色 | 手拼 `rgba(...)` |

```ts
// ✅ 正确 import（统一入口，禁止子路径）
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, CHART_COLORS, withAlpha } from '@/theme/physics'

// ❌ 禁止子路径导入
import { withAlpha } from '@/theme/physics/colors'
```

### 铁律 5：HashRouter Only

禁止引入 `BrowserRouter`，路由跳转仅用 `to="/xxx"`（HashRouter 内部路径）。

### 铁律 6：物理层纯净

`src/physics/` 内禁止出现 DOM、React、window、Store 依赖。所有函数必须有 JSDoc + 单位注释。

---

## 📋 新建页面前必须确认的 7 件事

1. **选择 preset**：`full` / `splitV` / `splitH` / `square`（根据是否有图表分区、是否圆形对称决定）
2. **选择 controlsMode**：高中物理**默认 `timed`**（有起点/终点的过程动画）；静态参数展示用 `param`；圆周/热运动等永续循环才用 `loop`
3. **分层结构**：`XxxAnimation.tsx`（编排）+ `hooks/useXxxPhysics.ts`（物理）+ `components/XxxScene.tsx`（渲染）
4. **颜色来源（按语义隔离）**：物理量 → `PHYSICS_COLORS`；场景器材 → `SCENE_COLORS`；图表 → `CHART_COLORS`；Canvas 基础设施 → `CANVAS_COLORS`；透明度变体 → `withAlpha()`
5. **坐标系统**：`worldToDesign()` 转换，`useSceneScale` 比例尺，禁止手写 `x * scale + offset`；SVG 字体必须 `font(N)` 包裹
6. **Registry 注册（5 个文件全部完成）**：`data/registries/<domain>.ts`（`paramMeta`/`controlMeta`/`defaultParams as const`）+ `data/quantities/<domain>/<topic>.ts`（物理量构建器）+ `data/physicsQuantities.ts`（注册构建器）+ `data/knowledgeTree.ts`（确认知识点）
7. **组件复用检查**：新增场景前必须查阅 `COMPONENT_REGISTRY.md`，有现成组件时禁止手写等效实现

---

## 📚 按需读取索引

| 触发条件 | 读取文档 |
|---------|---------|
| 涉及 Canvas/SVG/图表布局 | `docs/agent-rules/ui/07_CANVAS_SVG_CHART_RULES.md` |
| 涉及 UI 组件/颜色/间距 | `docs/agent-rules/ui/02_UI_RULES.md` |
| 实现左侧/右侧屏组件 | `docs/agent-rules/ui/08_THREE_PANEL_RULES.md` |
| 需要完整组件 API | `docs/agent-rules/ui/COMPONENT_REGISTRY.md` |
| 查询动画入口→场景→物理映射 | `MEMORY.md`（动画映射表） |
| 提交前验收 | `docs/agent-rules/process/CHECKLIST.md` |

---

*最后更新：2026-07-16 | 由 Antigravity 生成*
