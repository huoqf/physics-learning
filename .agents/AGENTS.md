# AGENTS.md — Antigravity 工作区入口（索引，不含独立规则）

> 本文件由 Antigravity IDE 自动加载。
> **它不是规范源**：铁律的编号与含义只以 `.trae/rules/project_rules.md` 为准，
> 本文件只做「哪条规矩在哪、什么时候该去读」的索引。两者冲突时改本文件，不改 project_rules。
>
> 2026-11-02 收敛：此前本文件自带一套「铁律 1/2/3/4/4B/5/6」，与 project_rules 的
> 编号同名不同义，且 4 处结论相反（SidebarExtra 是否可用、`anchor` 取值、import 路径、
> 规范优先级）。现已全部删除，只保留指向真正权威的链接。

---

## ⚡ 三条最容易违反的硬约束（速查，细则见 project_rules §4）

| 约束 | ❌ 禁止 | ✅ 正确替代 | 权威 |
|------|--------|-----------|------|
| 统一来源 | `fill="#3B82F6"`、`fontSize={14}`、`scale = 0.8`、手写 `x*scale+offset` | `PHYSICS_COLORS`/`SCENE_COLORS`/`CHART_COLORS`、`font(N)`、`useSceneScale`、`worldToDesign` | 铁律 1（含 11 条子约束） |
| 物理层纯净 | `src/physics/` 里 import React/DOM/window/Store | 纯函数 + JSDoc + 单位注释；看板与场景 import 同一实现 | 铁律 2 |
| 左屏声明式 | 手写 `<input type="range">`、散乱左屏容器、**恢复 `SidebarExtra`** | `paramMeta → ParamControl`、`controlMeta → ControlPanel` | 铁律 6 |

> `SidebarExtra` 已于 2026-07-13 全量清零，**不得恢复**（`ARCHITECTURE_RULES.md §8.1.3`）。

## ⚡ 三屏内容分配（摘要，细则见 `08_THREE_PANEL_RULES.md`）

```
左屏（LeftPanel）         中屏（AnimationSvgCanvas）        右屏（PhysicsPanel）
──────────────────        ──────────────────────────        ──────────────────────
• paramMeta 数值参数      • 动画场景（SVG 主体）            • QuantitySection（物理量）
• controlMeta 模式开关    • CenterExtra 图表（可选）         • FormulaSection（公式+条件）
                          ❌ 禁止大段教学文字              • ExamPointSection（高考要点）
                          ❌ 禁止完整公式推导               ❌ 禁止动画控制控件
```

SVG 内只允许物理量数值标注（`v = 3.2 m/s`）与坐标轴标签，禁止教学解释段落。

## ⚡ 画布 preset（4 种，语义以 project_rules §CANVAS_PRESETS 为准）

| preset | 设计尺寸 | 中屏分区方式 | 何时用 |
|--------|---------|-------------|--------|
| `full` | 840×650 | 动画独占中屏 | 无配套图表的纯场景（光学、磁场分布）；**无法判断时默认选它** |
| `splitV` | 840×325 | 上下并列（场景 + 图表，或反向） | 有配套图表、且画面横向展开（追及、碰撞、平抛） |
| `splitH` | 420×650 | 左右并列（场景 ∣ 图表） | 有配套图表、且画面纵向展开（自由落体、斜抛、弹簧振子） |
| `square` | 650×650 | 方形 | 圆形/旋转对称（圆周运动、向心力） |

> 决策顺序：**没有配套图表 → `full`**；有图表再按画面方向在 `splitV`/`splitH` 里选。
> ❌ 严禁 `wide` / `tall`（已废弃）；严禁手写 `width={900}` 固定像素。

## ⚡ 新页面唯一标准路径（细则见 `project_rules.md §4.8`、`07_CANVAS_SVG_CHART_RULES.md §2`）

```tsx
const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
const sceneScale = useSceneScale({ vp, preset: CANVAS_PRESETS.full, anchor: 'viewport', physicsWidth: 10, physicsHeight: 8 })
<AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
  ...
</AnimationSvgCanvas>
```

```tsx
// ❌ 存量遗留，新建页面严禁使用
viewBox={`0 0 ${width} ${height}`}                     // 历史方式A（固定 viewBox）
createSceneScaleFromViewport({ mode: 'visibleArea' })  // deprecated
physicsToCanvas(...)                                    // 仅用于维护旧组件
```

## ⚡ 组件复用（完整清单见 `COMPONENT_REGISTRY.md`，铁律 5）

| 场景 | 必须使用 | import |
|------|---------|--------|
| 三栏页面 / SVG 画布容器 | `ThreePanel` / `AnimationSvgCanvas` | `@/components/Layout` |
| 质点 / 滑块 / 地面 | `Ball` / `Block` / `PhysicsGround` | `@/components/Physics` |
| 物理矢量 / 视觉标注箭头 | `PhysicsVectorArrow` / `VectorArrow` | `@/components/Physics` |
| 粒子轨迹 | `ParticleTrajectory` | `@/components/Physics` |
| 图表基座 / 实时时序图 | `BasePhysicsChart` / `MiniChart` | `@/components/Chart` · `@/components/UI` |
| 左屏容器 | `LeftPanel` / `LeftPanelSection` | `@/components/UI` |
| 右屏看板 / 公式 | `PhysicsPanel` / `KatexFormula` | `@/components/Formula` |

**import 路径**：子模块入口优先（`@/theme/physics`、`@/theme/colors`、`@/theme/motion`）；
`@/theme` 统一入口仍可用但子模块优先（语义更明确、tree-shaking 更好）。见 `ARCHITECTURE_RULES.md §10`。

**颜色语义层级**（混用即违规，`PHYSICS_COLORS` 与 `SCENE_COLORS` 不可互换）：

| 语义 | token | 用于 |
|------|-------|------|
| 物理量 | `PHYSICS_COLORS.*` | 力/速度/加速度矢量标注 |
| 场景器材 | `SCENE_COLORS.*` | 磁铁/线圈/球体/电路元件材质 |
| 画布基础设施 | `CANVAS_COLORS.*` | 网格线/坐标轴/参考线 |
| 图表 | `CHART_COLORS.*` / `VT_CHART_COLORS.*` | 曲线、面积填充 |
| 透明度变体 | `withAlpha(token, 0.3)` | 任意半透明（禁止手拼 `rgba()`） |

---

## 📋 新建页面前要确认的 7 件事

1. **preset**：按上面的表选（无图表 → `full`）
2. **controlsMode**：过程动画 `timed`（默认）；永续循环（圆周、热运动、交变波形）`loop`；纯参数驱动无时间推进 `param`
3. **分层**：`XxxAnimation.tsx`（编排）+ `hooks/useXxxPhysics.ts`（物理）+ `components/XxxScene.tsx`（渲染）
4. **颜色**：按上表语义选 token，不硬编码
5. **坐标**：`useSceneScale` + `worldToDesign`，不手写 `x*scale+offset`；字号走 `font(N)`
6. **注册 5 处**：`data/registries/<domain>.ts` + `data/quantities/<domain>/<topic>.ts` + `data/physicsQuantities.ts` + `data/knowledgeTree.ts` + 跑 `node scripts/gen-annotations.mjs`
7. **复用检查**：先查 `COMPONENT_REGISTRY.md`，有现成组件时禁止手写等效实现

---

## 📚 按需读取索引

| 触发条件 | 读取文档 |
|---------|---------|
| 铁律的权威定义 / 目录结构 / 数据层协议 | `.trae/rules/project_rules.md`、`docs/agent-rules/core/ARCHITECTURE_RULES.md` |
| 涉及 UI 组件 / 颜色 / 间距 | `docs/agent-rules/ui/02_UI_RULES.md` |
| 涉及 Canvas/SVG/图表布局 | `docs/agent-rules/ui/07_CANVAS_SVG_CHART_RULES.md` |
| 实现左侧/右侧屏组件 | `docs/agent-rules/ui/08_THREE_PANEL_RULES.md` |
| 需要完整组件 API | `docs/agent-rules/ui/COMPONENT_REGISTRY.md` |
| 查询动画入口→场景→物理映射 | `MEMORY.md`（动画映射表，由 `scripts/gen-annotations.mjs` 生成） |
| 提交前验收 | `docs/agent-rules/process/CHECKLIST.md` |

---

*最后更新：2026-11-02（收敛为索引，删除与本项目权威规范冲突的独立铁律）*
