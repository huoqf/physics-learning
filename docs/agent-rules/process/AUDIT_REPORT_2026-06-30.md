# 项目规范合规审计报告

> 审计日期：2026-06-30
> 审计范围：`src/` 全目录
> 规范来源：`docs/agent-rules/core/ARCHITECTURE_RULES.md` + `docs/agent-rules/ui/02_UI_RULES.md` + `docs/agent-rules/process/CHECKLIST.md`

---

## 一、总体评估

| 维度 | 合规状态 | 严重度 |
|------|---------|:------:|
| physics 模块独立性 | ✅ 合规 | — |
| 路由规范（HashRouter） | ✅ 合规 | — |
| 硬编码颜色 | ⚠️ 中等问题 | P2 |
| 硬编码 fontSize | ⚠️ 少量违规 | P3 |
| `colors.neutral[]` 直接用于 Canvas | ⚠️ 已修复 20 处，剩余约 207 处 | P1 |
| `rgba()` 手写 | ⚠️ 少量违规 | P3 |
| useAnimationStore selector 模式 | ⚠️ 混合使用 | P2 |
| 超长文件（>500行） | ⚠️ 16 个文件 | P2 |
| SVG `<circle>` 未使用 Ball 组件 | ⚠️ 需区分场景 | 见分析 |
| SVG `<rect>` 未使用 Block 组件 | ⚠️ 需区分场景 | 见分析 |

---

## 二、详细审计结果

### 2.1 ✅ physics 模块独立性 — 合规

`src/physics/` 目录未发现任何 React、DOM、window、document 引用。所有物理模块保持纯函数独立性。

### 2.2 ⚠️ 硬编码颜色（P2）

**发现：5 处 rgba() 手写**

| 文件 | 行号 | 问题代码 | 建议 |
|------|------|---------|------|
| `optics/thin-lens/ThinLensAnimation.tsx` | 210 | `rgba(2, 132, 199, 0.2)` | 使用 `withAlpha()` |
| `electromagnetism/induction/PowerTransmission.tsx` | 83 | `rgba(255, 255, 240, ${userBrightness})` | 动态计算场景，需评估 |
| `electromagnetism/induction/PowerTransmission.tsx` | 90 | `rgba(${r}, ${g}, ${b}, ...)` | 同上 |
| `electromagnetism/induction/PowerTransmission.tsx` | 97 | `rgba(${r}, ${g}, ${b}, ...)` | 同上 |
| `mechanics/momentum/MomentumScene.tsx` | 193 | `rgba(0, 0, 0, 0.12)` | 使用 `withAlpha()` |

### 2.3 ⚠️ `colors.neutral[]` 直接用于 Canvas/SVG — 已部分修复

**第一批已完成（2026-06-30）**：10 个文件 20 处替换为 `CANVAS_COLORS.grid`/`axis`/`trackHistory`。

**已修复文件**：`ElectricPotentialAnimScene.tsx`、`ElectricPotentialChartScene.tsx`、`ACValues.tsx`、`VelocitySelector.tsx`、`InclineForceDiagram.tsx`、`EnergyConservationBarChart.tsx`、`KineticEnergyScene.tsx`、`PowerScene.tsx`、`Capacitor.tsx`、`ThinLensAnimation.tsx`

**剩余高频违规文件**（需逐案审查语义）：

| 文件 | 剩余违规数 | 典型问题 |
|------|:------:|---------|
| `SatelliteAnimation.tsx` | 12+ | `colors.neutral[600/700]` 用于 SVG 笔画和填充 |
| `InductionPhenomenon.tsx` | 10+ | `colors.neutral[50-800]` 用于电路元件 |
| `ForceDecompositionCard.tsx` | 6 | `colors.neutral[200-800]` 用于卡片 |
| `PendulumScene.tsx` | 6 | `colors.neutral[100-800]` 用于摆线和支架 |
| `ClosedCircuit.tsx` | 5+ | `colors.neutral[600-800]` 用于导线渐变 |
| `OhmLaw.tsx` | 4+ | `colors.neutral[400-800]` 用于元件 |
| `ValleyScene.tsx` | 4 | `colors.neutral[100/800]` 用于块体 |
| `KineticEnergyScene.tsx` | 5 | `colors.neutral[100-700]` 用于场景 |
| `ACGeneration.tsx` | 3 | `colors.neutral[50/500]` 用于标注 |
| `HeatingBox.tsx` | 3 | `colors.neutral[100-300]` 用于加热盒 |
| `ForcePolygon.tsx` | 3 | `colors.neutral[50-700]` 用于力多边形 |
| `AmpereFIChart.tsx` | 5 | `colors.neutral[50-600]` 用于图表卡片 |
| `KnowledgeTree.tsx` | 5 | `colors.neutral[50-500]` 用于知识树 |

### 2.4 ⚠️ 硬编码 fontSize（P3）

**发现：3 处违规**

| 文件 | 行号 | 代码 | 建议 |
|------|------|------|------|
| `mechanics/energy/lightRodRope/LightRodRopeScene.tsx` | 470 | `fontSize={9}` | → `fontSize={font(9)}` |
| `mechanics/energy/lightRodRope/LightRodRopeScene.tsx` | 497 | `fontSize={11}` | → `fontSize={font(11)}` |
| `dev/VectorPlayground.tsx` | 65 | `fontSize={13}` | 开发调试文件，可忽略 |

### 2.5 ⚠️ useAnimationStore selector 模式（P2）

**总计 116 处 useAnimationStore 调用**：

| 模式 | 数量 | 占比 | 合规性 |
|------|-----:|-----:|:------:|
| 精确 selector `useAnimationStore((s) => s.field)` | ~38 | 33% | ✅ |
| 解构 selector `const {...} = useAnimationStore(selector)` | ~74 | 64% | ⚠️ |
| 完全解构 `const {...} = useAnimationStore()` | ~4 | 3% | ❌ |

**问题**：64% 使用解构 selector 模式。如果 selector 返回新对象 `(s) => ({ params: s.params, time: s.time })`，会导致每次渲染创建新引用，触发不必要的重渲染。需确认是否使用了 `useShallow`。

**需修复的完全解构**（无 selector）：

| 文件 | 行号 |
|------|------|
| `mechanics/dynamics/useEquilibriumPhysics.ts` | 74 |

### 2.6 ⚠️ 超长文件（>500行）— 16 个文件

| 文件 | 行数 | 优先级 | 备注 |
|------|-----:|:------:|------|
| `electromagnetism/induction/Transformer.tsx` | 724 | P1 | TODO_deferred 未列出 |
| `electromagnetism/magnetism/VelocitySelector.tsx` | 720 | P2 | 已在 TODO_deferred |
| `mechanics/force-motion/ForceMotionSandbox.tsx` | 694 | P2 | 调试工具 |
| `mechanics/dynamics/EquilibriumAnimation.tsx` | 688 | P2 | 已在 TODO_deferred 观察区 |
| `mechanics/gravitation/KeplerAnimation.tsx` | 621 | P3 | 已在 TODO_deferred 观察区 |
| `mechanics/momentum/MomentumConservationAnimation.tsx` | 671 | P3 | 已在 TODO_deferred 观察区 |
| `electromagnetism/induction/PowerTransmission.tsx` | 594 | P2 | 未在 TODO_deferred |
| `mechanics/dynamics/FrictionAnimation.tsx` | 598 | P2 | 未在 TODO_deferred |
| `mechanics/energy/SpringCompositeAnimation.tsx` | 585 | P3 | 未在 TODO_deferred |
| `optics/total-internal-reflection/TIRAnimation.tsx` | 564 | P3 | 未在 TODO_deferred |
| `electromagnetism/electrostatics/FieldLines.tsx` | 559 | P3 | 未在 TODO_deferred |
| `mechanics/dynamics/ConnectedBodiesAnimation.tsx` | 557 | P3 | 未在 TODO_deferred |
| `mechanics/kinematics/ObliqueThrowAnimation.tsx` | 534 | P3 | 未在 TODO_deferred |
| `mechanics/dynamics/GravityBasicAnimation.tsx` | 519 | P3 | 未在 TODO_deferred |
| `mechanics/kinematics/FreeFallDripAnimation.tsx` | 505 | P3 | 未在 TODO_deferred |
| `mechanics/circular/CircularMotionAnimation.tsx` | 506 | P3 | 未在 TODO_deferred |

**注意**：`Transformer.tsx`（724行）和 `ForceMotionSandbox.tsx`（694行）未列入 TODO_deferred。

### 2.7 SVG `<circle>` / `<rect>` 使用分析

**`<circle>` 匹配：338 处**

大部分是合理的场景元素（轨道圆、数据点、锚点、电荷、旋钮等），并非都是"球体"需要替换为 `<Ball>`。

**真正应考虑使用 Ball 组件的**：
- `ObliqueThrowAnimation.tsx:444` — 钢球 `<circle ... fill="url(#vacuum-sphere-grad)">`
- `GravityBasicAnimation.tsx` — 多处重物球体
- `WorkAnimation.tsx:328` — 滑块上的球体

**合理使用 `<circle>` 的场景**：
- 轨道路径、数据点、锚点、电荷符号、旋钮、滑轮轴心等

### 2.8 `<rect>` 使用分析

**`<rect>` 匹配：230 处**

大部分是面板背景、卡片、滑块槽、导线等 UI 元素，不适用 `<Block>` 组件。

**真正应考虑使用 Block 组件的**：
- `ValleyScene.tsx:83` — 木块 `<rect ... fill="url(#block-grad)">`
- `WorkAnimation.tsx:258` — 木块 `<rect ... fill="url(#block-body-grad)">`

---

## 三、优先修复建议

### P1 — 必须修复

1. **`colors.neutral[]` Canvas 违规**（227 处，30+ 文件）
   - 建议：建立 `CANVAS_COLORS` 扩展映射，批量替换
   - 工作量：中（需逐文件审查语义）

### P2 — 建议修复

2. **useAnimationStore 解构模式**（~74 处）
   - 确认是否已使用 `useShallow`，若未使用则添加
   - 或改为精确 selector 模式

3. **Transformer.tsx（724行）未列入拆分计划**
   - 建议加入 TODO_deferred

4. **PowerTransmission.tsx（594行）、FrictionAnimation.tsx（598行）未列入拆分计划**
   - 建议评估是否需要拆分

### P3 — 可选优化

5. **硬编码 fontSize**（3 处）— 直接替换为 `font()` 调用
6. **rgba() 手写**（5 处）— 替换为 `withAlpha()`
7. **未列入 TODO 的超长文件**（10 个 500-600 行文件）— 评估是否需要拆分

---

## 四、合规亮点

- ✅ `src/physics/` 完全独立，无 React/DOM 依赖
- ✅ 路由统一使用 HashRouter
- ✅ 无硬编码十六进制颜色值（#RRGGBB）
- ✅ 无子路径导入 `@/theme/physics/colors` 等违规
- ✅ 已有大量精确 selector 使用（33%）
- ✅ 超长文件数量从历史高位持续下降
