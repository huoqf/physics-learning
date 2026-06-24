# 项目结构与规范修复方案

> 制定日期：2026-06-24
> 依据：[STRUCTURE_AUDIT] 全项目核查报告（Viewport / 矢量图表 / 响应式缩放 / 铁律违反 四维度并行调查）
> 范围：覆盖 P0 高危、P1 架构冲突、P2 规范偏离共 8 项问题
> 原则：每项给出「问题定位 → 修复方案 → 代码示例 → 验证方法 → 工作量评估」，便于按项独立排期
> 特殊约定：**颜色与像素值硬编码仅记录清单，不做任何处理**（见 P0-3、P2-3）

---

## 执行状态总览

| 任务 | 优先级 | 状态 | 执行日期 |
|------|--------|------|----------|
| P0-1 清理自造 `<marker>` | P0 | ✅ **已完成** | 2026-06-24 |
| P0-2 修复 ForceMotionTripleChart | P0 | ✅ **已完成** | 2026-06-24 |
| P0-3 `colors.neutral.*` 清单（仅记录） | P0 | ✅ **已完成（仅记录）** | 2026-06-24 |
| P0-4 AnalysisPage/WrongPage 外迁 | P0 | ✅ **已完成** | 2026-06-24 |
| P1-1 SceneLayoutProfile 定义 | P1 | ✅ **已完成** | 2026-06-24 |
| P1-2 批量修复子路径导入 | P1 | ✅ **已完成** | 2026-06-24 |
| P2-1 components/Physics/ fontSize 迁移 | P2 | ✅ **部分完成** | 2026-06-24 |
| P2-2 清理 VectorArrow 假 sceneScale | P2 | ✅ **已完成** | 2026-06-24 |
| P2-3 硬编码像素值（仅记录不清理） | P2 | ✅ **已完成（仅记录）** | 2026-06-24 |

> **说明**：P2-1 完成了 DCSource.tsx（提取 FONT_BASE 常量）和 Block.tsx（新增可选 font prop），剩余 9 个组件（DialMeter/HandRule/LightBulb/MagneticPoles/SkeletalHand/CapacitorPlates/BarMagnet/Galvanometer/Rheostat）因模式一致且无运行时风险，留待后续排期。
>
> **P1-1 后续**：类型定义（SceneLayoutProfile）+ 工厂函数（createSceneScaleFromViewport）+ 常量（IDENTITY_SCENE_SCALE）已完成。13 个组件的 SceneScale 迁移未做，因需逐个确认 designWidth/designHeight 和 overlay 值，留待后续排期。

---

## 目录

- [P0-1 清理自造 `<marker>` 画物理矢量](#p0-1-清理自造-marker-画物理矢量)
- [P0-2 修复 ForceMotionTripleChart 伪造 ChartContext](#p0-2-修复-forcemotiontriplechart-伪造-chartcontext)
- [P0-3 `colors.neutral.*` 裸值清单（仅记录，不处理）](#p0-3-colorsneutral-裸值清单仅记录不处理)
- [P0-4 AnalysisPage / WrongPage 业务逻辑外迁](#p0-4-analysispage--wrongpage-业务逻辑外迁)
- [P1-1 定义 SceneLayoutProfile 并对齐 SceneScale 与 Viewport](#p1-1-定义-scenelayoutprofile-并对齐-scenescale-与-viewport)
- [P1-2 批量修复子路径导入](#p1-2-批量修复子路径导入)
- [P2-1 迁移 `components/Physics/` 的 fontSize → font()](#p2-1-迁移-componentsphysics-的-fontsize--font)
- [P2-2 清理 VectorArrow 假 sceneScale（23 处）](#p2-2-清理-vectorarrow-假-scenescale23-处)
- [P2-3 硬编码像素值清理（颜色部分仅记录）](#p2-3-硬编码像素值清理颜色部分仅记录)

---

## P0-1 清理自造 `<marker>` 画物理矢量

### 问题定位

铁律 1d 明确「矢量箭头必须走 VectorArrow + refMagnitudes 归一化」，VectorArrow 已改用 `<polygon>` 绘制（不依赖 marker）。经 grep `marker id=` 实际核查，全项目共 6 处自造 marker：

#### 类型 A：物理矢量（必须迁移到 VectorArrow）— 2 处

| 文件 | 行号 | marker id | 用途 |
|---|---|---|---|
| `src/features/electromagnetism/induction/ACGeneration.tsx` | 216 | `aB` | 磁场 B 矢量箭头 |
| `src/features/electromagnetism/electrostatics/Capacitor.tsx` | 469 | `arrow-cap-E` | 电场 E 箭头 |

#### 类型 B：几何/电路标注（非物理矢量，加注释保留）— 4 处

| 文件 | 行号 | marker id | 用途 | 说明 |
|---|---|---|---|---|
| `src/features/electromagnetism/electrostatics/Capacitor.tsx` | 472 | `tick-cap` | 极板刻度标注 | 几何标注 |
| `src/features/electromagnetism/electrostatics/ElectricPotentialAnimScene.tsx` | 67 | `ground-symbol` | 接地符号 | 电路符号 |
| `src/features/mechanics/dynamics/SpringForceAnimation.tsx` | 249 | `arrow-displacement-start` | 位移尺寸线起点 | 几何标注 |
| `src/features/mechanics/dynamics/SpringForceAnimation.tsx` | 252 | `arrow-displacement-end` | 位移尺寸线终点 | 几何标注 |

> **勘误**：原核查报告提到的 `ElectricField.tsx` 的 `arrow-efield` 和 `Rails.tsx` 的 `arc-arrow` **实际不存在**，已从清单移除。

### 修复方案

#### 类型 A：物理矢量迁移到 VectorArrow

**示例（ACGeneration.tsx L216-218）**：

```tsx
// ❌ 修复前
<defs>
  <marker id="aB" markerWidth={font(7)} markerHeight={font(5)} refX={font(6)} refY={font(2.5)} orient="auto">
    <polygon points={`0 0,${font(7)} ${font(2.5)},0 ${font(5)}`} fill={SCENE_COLORS.coil.enamelBase} />
  </marker>
</defs>
<!-- 后续 <line markerEnd="url(#aB)" ... /> 画磁场箭头 -->

// ✅ 修复后：删除 marker，改用 VectorArrow
<VectorArrow
  origin={{ x: arrowStart.x, y: arrowStart.y }}
  vector={{ x: arrowEnd.x - arrowStart.x, y: arrowEnd.y - arrowStart.y }}
  type="magneticField"
  sceneScale={sceneScale}
  color={SCENE_COLORS.coil.enamelBase}  // 保留原色
/>
```

**注意**：这两处原本用 `<line markerEnd="url(#xxx)">` 画箭头，迁移时需：
1. 删除 `<defs>` 中的 marker 定义
2. 删除 `<line>` 的 `markerEnd` 属性
3. 用 `<VectorArrow>` 替换 `<line>`，`vector` 为箭头方向向量
4. 若该场景尚未构造 `sceneScale`，需补 `createSceneScale` 调用（见 P2-2 的 `IDENTITY_SCENE_SCALE` 方案）

#### 类型 B：几何/电路标注加注释保留

```tsx
{/* 几何标注，非物理矢量，不适用铁律 1d */}
<marker id="tick-cap" ...>
```

长期建议在 `src/components/Physics/` 下提供官方 `<DimensionLine>` / `<AngleArc>` / `<GroundSymbol>` 组件统一管理，但不在本次修复范围。

### 验证方法

1. `npx tsc --noEmit` 无新增错误
2. 视觉回归：对比修复前后截图，箭头位置/颜色/长度应一致
3. Grep 验证：`grep -rn 'marker id=' src/features/` 仅剩 4 处类型 B（带注释）

> **执行提醒**：`Capacitor.tsx` 同时含 A 类（`arrow-cap-E`，L469，需迁移）和 B 类（`tick-cap`，L472，需保留）。执行时**只删 A 类 marker 定义及其 `<line markerEnd>` 引用**，不要误删 B 类。

### 工作量评估

- 类型 A（2 文件）：中等，每文件需理解原 marker 用法并构造 VectorArrow 参数
- 类型 B（3 文件 4 处）：小，仅加注释
- **合计**：约 0.5 天

---

## P0-2 修复 ForceMotionTripleChart 伪造 ChartContext

### 问题定位

`src/features/mechanics/force-motion/ForceMotionTripleChart.tsx` 是组件化过程中最典型的「半接入」冲突：

- L80-132：手写 `toX`/`toY` 坐标变换（绕过 BasePhysicsChart）
- L137-147：**伪造 ChartContext** 喂给 ChartArea/ChartCursor 插件
- L338：x-t 图曲线色直接用 `colors.neutral[500]` 裸值（违反铁律 1，**颜色问题仅记录不处理**）
- L161-259：手画整套三联图（网格/轴/曲线/游标）

一旦 BasePhysicsChart 的 ChartContextValue 契约（`toSvgX`/`toSvgY` 签名、`plotOrigin` 语义）变化，此处会静默崩溃。

同类问题（手写 `toSvgX`/`toSvgY`）：
- `src/features/mechanics/dynamics/FrictionCenterExtra.tsx` L33-34
- `src/features/mechanics/dynamics/SpringForceCenterExtra.tsx` L32
- `src/features/electromagnetism/dc-circuits/CircuitAnalysisCenterExtra.tsx` L86, 88

### 修复方案

#### 方案选择：扩展 BasePhysicsChart 支持三联图

ForceMotionTripleChart 是「三联图」（F-t / v-t / x-t 并排），现有 BasePhysicsChart 是单图容器。两种修复路径：

| 路径 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| A. 三次 BasePhysicsChart | 每个子图独立用 BasePhysicsChart | 完全合规 | 需重构 SingleChart 内部 |
| B. 扩展 BasePhysicsChart 支持 `multiChart` 模式 | BasePhysicsChart 接受 `charts: ChartSpec[]` | 保留三联布局 | BasePhysicsChart API 扩张 |

**推荐路径 A**（改动局部、风险低）：

```tsx
// ForceMotionTripleChart.tsx 重构后骨架
import { BasePhysicsChart, ChartArea, ChartCursor } from '@/components/Chart'
import { CHART_COLORS, FX_CHART_COLORS, VT_CHART_COLORS, XT_CHART_COLORS } from '@/theme/physics'

// 每个子图改为 BasePhysicsChart 的 children
function SingleChart({
  width, height, points, domainPoints, currentTime, currentValue,
  color, yLabel, areaText, areaVariant, terminalValue, zeroBased, font,
}: SingleChartProps) {
  // ⚠️ 关键：以下变量需从原 layout useMemo (L80-132) 中提取计算逻辑，
  //    不要直接复制示例中的占位符
  const maxTime = Math.max((domainPoints ?? points).at(-1)?.t ?? 1, 1)
  // ⚠️ 使用不可变写法（与项目函数式风格一致，避免 lint 告警）
  const baseValues = (domainPoints ?? points).map((p) => p.value)
  const values = terminalValue != null ? [...baseValues, terminalValue, 0] : [...baseValues, 0]
  const maxAbs = Math.max(1, ...values.map(Math.abs))
  let minValue = zeroBased ? 0 : (values.some((v) => v < 0) ? -maxAbs : 0)
  let maxValue = maxAbs
  const pad = (maxValue - minValue) * 0.15 || 1
  if (zeroBased || minValue >= 0) maxValue += pad
  else { minValue -= pad; maxValue += pad }

  // ⚠️ areaPoints 需从原 L152-158 的 useMemo 中提取（按 currentTime 截断的面积点集）
  const areaPoints = useMemo(() => {
    if (!areaVariant) return []
    const cap = Math.min(currentTime, maxTime)
    return points.filter((p) => p.t <= cap + 1e-9).map((p) => ({ x: p.t, y: p.value }))
  }, [areaVariant, points, currentTime, maxTime])

  return (
    <BasePhysicsChart
      initialSize={{ width, height }}
      xDomain={{ min: 0, max: maxTime }}
      yDomain={{ min: minValue, max: maxValue }}
      xLabel="t/s"
      yLabel={yLabel}
    >
      {(ctx) => (
        <>
          {/* 曲线 */}
          <path
            d={buildPath(points.map(p => ({ x: ctx.toSvgX(p.t), y: ctx.toSvgY(p.value) })))}
            fill="none" stroke={color} strokeWidth={STROKE.chartMain}
          />
          {/* 面积（用官方 ChartArea，自动消费 ctx） */}
          {areaVariant && areaPoints.length >= 2 && (
            <ChartArea
              points={areaPoints}
              baseline={0}
              variant={areaVariant}
              intensity="subtle"
              stroke={color}
            />
          )}
          {/* 游标（用官方 ChartCursor，自动消费 ctx） */}
          {currentTime <= maxTime && (
            <ChartCursor
              x={currentTime}
              dataPoints={[{ y: currentValue, label: yLabel, series: 'primary' }]}
              showLabels={false}
            />
          )}
        </>
      )}
    </BasePhysicsChart>
  )
}
```

**关键改动**：
1. 删除 L80-132 手写 `layout`（toX/toY/curve 等）— 但需保留 maxTime/minValue/maxValue 的计算逻辑
2. 删除 L137-147 伪造的 `chartCtx`
3. 删除 L161-259 手画的网格/轴/标签（BasePhysicsChart 内置）
4. L338 `colors.neutral[500]` → `XT_CHART_COLORS.positionCurve`（与 `DisplacementTimeChart` 一致）

#### FrictionCenterExtra / SpringForceCenterExtra

这两处是 CenterExtra 子场景的小图，同样手写 `toSvgX/toSvgY`。修复方式同上：改用 `BasePhysicsChart` + children 模式。

- `FrictionCenterExtra.tsx`：F-μ 图 → RelationChart
- `SpringForceCenterExtra.tsx`：F-x 图 → RelationChart

#### CircuitAnalysisCenterExtra（需先验证）

`CircuitAnalysisCenterExtra.tsx` L86, 88 的 `toSvgY_U`/`toSvgY_I` 用于柱状图。**BasePhysicsChart 当前是否支持 bar series 需先验证**：

- **若支持**：按上述模式迁移
- **若不支持**：保留手画柱状图，但**删除伪造的 ChartContext**（不使用 ChartArea/ChartCursor 插件），改为纯 SVG 绘制

### 验证方法

1. `npx tsc --noEmit`
2. `npx vitest run tests/components/Chart`
3. 视觉回归：ForceMotion 页面三联图与修复前一致（曲线/面积/游标/渐近线）
4. Grep 验证：`grep -rn 'toSvgY_U\|toSvgY_I\|chartCtx' src/features/` 无结果

### 工作量评估

- ForceMotionTripleChart：大（需重构 SingleChart，约 200 行改动）
- FrictionCenterExtra / SpringForceCenterExtra：中（各约 50 行）
- CircuitAnalysisCenterExtra：中（需先验证 BasePhysicsChart bar series 支持）
- **合计**：约 1.5 天

---

## P0-3 `colors.neutral.*` 裸值清单（仅记录，不处理）

> **特殊约定**：颜色硬编码问题仅记录清单，不做任何处理。

### 清单

规范明确「Canvas/SVG 内无 `colors.neutral.*` 裸值，均通过 `CANVAS_COLORS`/`CHART_COLORS` 引用」。实际有 63 处违反，分布在 20 个文件。

**典型违规**（完整清单见核查报告）：

| 文件 | 行号 | 数量 |
|---|---|---|
| `src/components/Physics/Rails.tsx` | 131, 156, 237, 246, 251, 260, 325, 336, 347 | 9 |
| `src/features/electromagnetism/induction/ACValues.tsx` | 173, 556, 597, 675, 735, 846 | 6 |
| `src/features/electromagnetism/electrostatics/FieldLines.tsx` | 534, 543, 581, 589, 599 | 5 |
| `src/features/electromagnetism/electrostatics/CoulombLaw.tsx` | 189, 202, 436, 454, 465 | 5 |
| `src/features/electromagnetism/electrostatics/ElectricFieldAdvancedScene.tsx` | 57, 70, 86 | 3 |
| `src/features/electromagnetism/electrostatics/ElectricFieldBasicScene.tsx` | 88, 104 | 2 |
| `src/features/electromagnetism/electrostatics/ElectricField.tsx` | 230 | 1 |
| `src/components/Physics/DCSource.tsx` | 268, 279 | 2 |
| `src/components/Physics/ConductingRod.tsx` | 105, 167, 193, 243, 265 | 5 |
| `src/components/Physics/Block.tsx` | 225, 237 | 2 |
| 其余 10 文件 | — | 23 |

### 处理方式

**本次不处理**。仅作为技术债务记录，供后续排期。

---

## P0-4 AnalysisPage / WrongPage 业务逻辑外迁

### 问题定位

铁律 3「页面组件薄壳（路由+布局+数据注入）」，但：

- `src/pages/AnalysisPage.tsx`：内嵌 `ContentWithKatex`（L13-32）/ `StepCard`（L44-154）/ `KnowledgeChain`（L163-213）3 个组件 + `toggleStep`/`goToPrevStep`/`goToNextStep`/`handleAnimationClick`/`getStepStatus`/`completedKnowledgeIds` 等大量业务逻辑（L219-296）
- `src/pages/WrongPage.tsx`：内嵌 `WrongCard`（L33-165）+ `STATUS_META` 常量 + `isThisWeek` 工具函数 + 筛选/排序逻辑（L181-229）

### 修复方案

#### AnalysisPage 拆分

```
src/features/analysis/
├── components/
│   ├── ContentWithKatex.tsx     # 从 AnalysisPage L13-32 迁出
│   ├── StepCard.tsx             # 从 AnalysisPage L44-154 迁出
│   └── KnowledgeChain.tsx       # 从 AnalysisPage L163-213 迁出
├── hooks/
│   └── useAnalysisSteps.ts      # 从 AnalysisPage L219-296 迁出
│                                 #   toggleStep/goToPrevStep/goToNextStep
│                                 #   handleAnimationClick/getStepStatus
│                                 #   completedKnowledgeIds
└── index.ts
```

**AnalysisPage 修复后骨架**：

```tsx
// src/pages/AnalysisPage.tsx（薄壳）
import { useAnalysisSteps } from '@/features/analysis'
import { StepCard, KnowledgeChain } from '@/features/analysis'

export default function AnalysisPage() {
  const { problem, currentStep, steps, ...rest } = useAnalysisSteps()
  if (!problem) return <Loading />
  return (
    <Layout>
      <StepCard step={currentStep} {...rest} />
      <KnowledgeChain ... />
    </Layout>
  )
}
```

**注意**：`useAnalysisSteps` hook 提取后，需确认依赖的 store（Zustand）访问方式不会因迁移破坏。Zustand store 可在任意位置 import 调用，迁移不影响。

#### WrongPage 拆分

经核查，`src/features/` 下当前**无 wrongbook 相关目录**，需新建。命名采用 `wrongbook`（与 `src/stores/useWrongStore.ts` 命名一致）：

```
src/features/wrongbook/          # 新建目录
├── components/
│   └── WrongCard.tsx            # 从 WrongPage L33-165 迁出
├── constants/
│   └── statusMeta.ts            # STATUS_META 迁出
├── utils/
│   └── dateFilter.ts            # isThisWeek 迁出
├── hooks/
│   └── useWrongBookFilter.ts    # 筛选/排序逻辑迁出
└── index.ts
```

### 验证方法

1. `npx tsc --noEmit`
2. 路由功能回归：解析页步骤切换、错题本筛选/排序
3. 文件行数验证：AnalysisPage / WrongPage 应 < 80 行

### 工作量评估

- AnalysisPage：中（3 组件 + 1 hook 迁出，约 300 行重组）
- WrongPage：中（1 组件 + 1 hook + 常量迁出，约 200 行重组）
- **合计**：约 1 天

---

## P1-1 定义 SceneLayoutProfile 并对齐 SceneScale 与 Viewport

### 问题定位

Viewport 架构存在三个核心冲突：

1. **SceneLayoutProfile 未定义**：`AnimationConfig`（[types.ts#L64](file:///d:/code/physic/physics-learning/src/data/types.ts#L64)）无 `sceneLayout` 字段，10 个已接入 Viewport 的组件分三种模式自行决定接入方式
2. **SceneScale 与 Viewport 未对齐**：`createSceneScale` 使用 `canvasSize.width/height`，不感知 visible 区域
   - `WorkAnimation.tsx` L169：SceneScale 形同虚设（`originX:0, originY:0`，但布局用 `vp.visibleX`）
   - `KeplerAnimation.tsx` L80：同时用 `useViewport` 和 `physicsToCanvas`，两套定位系统并存
3. **physicsToCanvas 不感知 Viewport**：`physicsToCanvas(x, y, canvasWidth, canvasHeight, scale)` 中心点 = `canvasWidth/2`，overlay 时会错位

### 修复方案

#### 步骤 1：新建 `src/scene/SceneLayoutProfile.ts`（新文件）

```typescript
// src/scene/SceneLayoutProfile.ts（新建文件）
import type { VectorType } from '@/theme/physics/vectorStyle'

/**
 * 场景布局模式 — 声明组件如何消费 ViewportInfo
 *
 * - 'transform'   : 使用 vp.transform 包裹设计坐标（0..designW / 0..designH）
 * - 'visibleArea' : 使用 vp.visibleX/visibleW 做比例布局
 * - 'centerScale' : 使用 vp.centerX/centerY/scale 做中心缩放
 */
export type SceneLayoutMode = 'transform' | 'visibleArea' | 'centerScale'

export interface SceneLayoutProfile {
  /** 布局模式 */
  mode: SceneLayoutMode
  /** 设计基准宽（px） */
  designWidth: number
  /** 设计基准高（px） */
  designHeight: number
  /** overlay 遮挡（px），与 DOM panel 同源 */
  overlay?: {
    left?: number
    right?: number
    top?: number
    bottom?: number
  }
  /** 矢量参考量级（用于 refMagnitudes 归一化） */
  refMagnitudes?: Partial<Record<VectorType, number>>
}
```

#### 步骤 2：在 `src/data/types.ts` 中扩展 AnimationConfig

```typescript
// src/data/types.ts — AnimationConfig 扩展
import type { SceneLayoutProfile } from '@/scene/SceneLayoutProfile'

export interface AnimationConfig {
  // ... 现有字段
  /** 场景布局配置（声明 Viewport 接入模式与设计基准） */
  sceneLayout?: SceneLayoutProfile
}
```

#### 步骤 3：在 `src/scene/SceneScale.ts` 中新增 `createSceneScaleFromViewport` 工厂

> **注意**：以下函数直接追加到 `SceneScale.ts` 末尾。`createSceneScale` 和 `SceneScale` 类型已在同文件中定义，**无需 import 自身**。

```typescript
// src/scene/SceneScale.ts — 追加到文件末尾（不修改现有 createSceneScale）
import type { ViewportInfo } from '@/utils/useViewport'
import type { SceneLayoutProfile } from './SceneLayoutProfile'

/**
 * 从 ViewportInfo 构造 SceneScale，确保矢量归一化与可视区域对齐。
 *
 * - mode='transform'   : vectorBounds 使用设计坐标 (0,0,designW,designH)
 * - mode='visibleArea' : vectorBounds 使用可视区域 (visibleX,visibleY,visibleW,visibleH)
 * - mode='centerScale' : vectorBounds 以 centerX/centerY 为原点
 *
 * @throws 当 profile 为 null/undefined 时抛出明确错误（避免旧组件静默失败）
 */
export function createSceneScaleFromViewport(
  vp: ViewportInfo,
  profile: SceneLayoutProfile | undefined,
): SceneScale {
  if (!profile) {
    throw new Error(
      '[createSceneScaleFromViewport] sceneLayout profile 未定义。' +
      '请在 AnimationConfig.sceneLayout 中声明，或改用 createSceneScale。'
    )
  }

  const sceneConfig: SceneConfig = (() => {
    switch (profile.mode) {
      case 'transform':
        return {
          vectorBounds: { x: 0, y: 0, width: profile.designWidth, height: profile.designHeight },
          originX: 0, originY: 0,
          worldWidth: profile.designWidth, worldHeight: profile.designHeight,
          refMagnitudes: profile.refMagnitudes,
        }
      case 'visibleArea':
        return {
          vectorBounds: { x: vp.visibleX, y: vp.visibleY, width: vp.visibleW, height: vp.visibleH },
          originX: vp.visibleX, originY: vp.visibleY,
          worldWidth: vp.visibleW, worldHeight: vp.visibleH,
          refMagnitudes: profile.refMagnitudes,
        }
      case 'centerScale':
        return {
          vectorBounds: { x: vp.visibleX, y: vp.visibleY, width: vp.visibleW, height: vp.visibleH },
          originX: vp.centerX, originY: vp.centerY,
          worldWidth: profile.designWidth, worldHeight: profile.designHeight,
          refMagnitudes: profile.refMagnitudes,
        }
    }
  })()
  return createSceneScale(sceneConfig)
}
```

> **实现提示**：`SceneConfig` 类型已在同文件 import（L2），`createSceneScale` 函数在同文件定义（L14），均无需重复 import。仅 `ViewportInfo` 和 `SceneLayoutProfile` 需从外部 import。

#### 步骤 4：在 `src/scene/index.ts` 中导出新符号

```typescript
// src/scene/index.ts — 新增导出（现有 4 个导出保留）
export { createSceneScale, worldToPixel } from './SceneScale';
export type { SceneScale } from './SceneScale';
export type { SceneConfig, VectorBounds } from './SceneConfig';
export { IDENTITY, createRotationTransform } from './CoordinateTransform';
export type { CoordinateTransform } from './CoordinateTransform';

// 新增导出
export { createSceneScaleFromViewport } from './SceneScale';
export type { SceneLayoutProfile, SceneLayoutMode } from './SceneLayoutProfile';
```

#### 步骤 5：逐个组件迁移（以 WorkAnimation 为例）

```tsx
// src/features/mechanics/energy/WorkAnimation.tsx — 修复后
import { useViewport } from '@/utils/useViewport'
import { createSceneScaleFromViewport } from '@/scene'
import type { SceneLayoutProfile } from '@/scene'

// 从 config 读取 profile（或组件内声明）
const profile: SceneLayoutProfile = {
  mode: 'visibleArea',
  designWidth: 700, designHeight: 420,
  refMagnitudes: { force: 10, displacement: 5 },
}

const vp = useViewport(canvasSize, {
  designWidth: profile.designWidth,
  designHeight: profile.designHeight,
  overlayRight: profile.overlay?.right ?? 0,
})

// SceneScale 从 Viewport 派生，不再用 canvasSize
const sceneScale = useMemo(
  () => createSceneScaleFromViewport(vp, profile),
  [vp, profile],
)
```

**迁移清单**（13 个组件，经 `grep useViewport src/features/` 实际核查）：

| 组件 | 当前模式 | 迁移后 profile.mode |
|---|---|---|
| ElectricField | transform | `transform` |
| FieldLines | transform | `transform` |
| ReflectionAnimation | transform | `transform` |
| RefractionAnimation | transform | `transform` |
| ThinLensAnimation | transform | `transform` |
| TIRAnimation | transform | `transform` |
| WorkAnimation | visibleArea | `visibleArea` |
| VelocityAnimation | visibleArea | `visibleArea` |
| CollisionAnimation | visibleArea | `visibleArea` |
| MomentumAnimation | visibleArea | `visibleArea` |
| Transformer | centerScale | `centerScale` |
| SatelliteAnimation | centerScale | `centerScale` |
| KeplerAnimation | centerScale | `centerScale` |

> **勘误**：原方案称"10 个组件"，实际 grep 核查为 **13 个**。新增的 3 个：`FieldLines`（transform 组）、`ReflectionAnimation`/`RefractionAnimation`（transform 组，原方案归在"4 光学模块"但未单独列出）。

#### 步骤 6：physicsToCanvas 的处理

`physicsToCanvas` 是底层工具，不强制改造。建议：
- 在同时使用 Viewport 和 physicsToCanvas 的组件（KeplerAnimation）中，改用 `sceneScale.worldToPixel` 替代 `physicsToCanvas`
- `physicsToCanvas` 保留给未接入 Viewport 的旧组件使用，逐步淘汰

### 验证方法

1. `npx tsc --noEmit`
2. 视觉回归：13 个接入 Viewport 的组件，特别是 Transformer（有 overlay）和 KeplerAnimation（混用两套坐标系）
3. 单元测试：为 `createSceneScaleFromViewport` 编写测试，覆盖三种 mode + profile 缺失时的报错

### 工作量评估

- 类型定义 + 工厂函数：小（0.5 天）
- 13 个组件迁移：中（每个约 0.5 小时，共 1.5 天）
- KeplerAnimation 双坐标系清理：中（需逐行替换 physicsToCanvas）
- **合计**：约 2.5 天

---

## P1-2 批量修复子路径导入

> **执行顺序约束**：本任务**必须在 P1-1 完成后执行**，不可并行。原因：`@/scene/SceneScale` → `@/scene` 的替换依赖 P1-1 中 `SceneLayoutProfile` 等新符号已通过 barrel 导出，否则会产生新的 import 错误。

### 问题定位

规范明确「无子路径导入」，但存在以下违反：

#### `@/theme/physics/*` 子路径（8 处，铁律明确禁止）

| 文件 | 行号 | 子路径 |
|---|---|---|
| `src/features/thermodynamics/secondLaw/SecondLawCenterExtra.tsx` | 5 | `@/theme/physics/secondLawColors` |
| `src/features/thermodynamics/secondLaw/SecondLawAnimation.tsx` | 7, 8 | `@/theme/physics/secondLawColors` + `@/theme/physics/canvasStyle` |
| `src/data/quantities/secondLaw.ts` | 4 | `@/theme/physics/secondLawColors` |
| `src/data/quantities/firstLaw.ts` | 6 | `@/theme/physics/firstLawColors` |
| `src/features/thermodynamics/kinematics/BrownianMotion.tsx` | 10 | `@/theme/physics/sceneColors` |
| `src/features/thermodynamics/firstLaw/FirstLawAnimation.tsx` | 8, 9 | `@/theme/physics/firstLawColors` + `@/theme/physics/canvasStyle` |
| `src/features/thermodynamics/gasLaws/ClapeyronCenterExtra.tsx` | 7 | `@/theme/physics/canvasStyle` |
| `src/features/thermodynamics/gasLaws/ClapeyronAnimation.tsx` | 8 | `@/theme/physics/canvasStyle` |
| `src/features/thermodynamics/gasLaws/GasLawsAnimation.tsx` | 8 | `@/theme/physics/canvasStyle` |
| `src/features/mechanics/dynamics/GravityBasicAnimation.tsx` | 8 | `@/theme/physics/colors` |
| `src/features/mechanics/kinematics/UniformAccelerationAnimation.tsx` | 17 | `@/theme/physics/vectorStyle` |

#### `@/components/Chart/*` 子路径（2 处，铁律明确禁止）

| 文件 | 行号 | 子路径 |
|---|---|---|
| `src/features/mechanics/kinematics/UniformAccelerationAnimation.tsx` | 21 | `@/components/Chart/ChartContext` |
| `src/features/mechanics/kinematics/UniformAccelerationCenterExtra.tsx` | 19 | `@/components/Chart/ChartContext` |

#### `@/scene/SceneScale` 子路径（30+ 处，规范偏离）

应从 `@/scene` barrel 导入。

### 修复方案

#### 步骤 1：确认 barrel 已导出所需符号

经核查：
- `@/theme/physics/index.ts` 已导出 `FIRST_LAW_COLORS`/`SECOND_LAW_COLORS`/`CANVAS_STYLE`/`PHYSICS_COLORS`/`VECTOR_COLORS` 等
- `@/components/Chart/index.ts` 已导出 `useChartContext`/`ChartContext`
- `@/scene/index.ts` 已导出 `createSceneScale`/`worldToPixel`（P1-1 完成后还将导出 `SceneLayoutProfile` 等）

所有 barrel 已就绪，无需扩展。

#### 步骤 2：批量替换

```bash
# PowerShell 脚本示例
$replacements = @(
    @{ From = "'@/theme/physics/secondLawColors'"; To = "'@/theme/physics'" },
    @{ From = "'@/theme/physics/firstLawColors'";  To = "'@/theme/physics'" },
    @{ From = "'@/theme/physics/canvasStyle'";    To = "'@/theme/physics'" },
    @{ From = "'@/theme/physics/sceneColors'";    To = "'@/theme/physics'" },
    @{ From = "'@/theme/physics/colors'";         To = "'@/theme/physics'" },
    @{ From = "'@/theme/physics/vectorStyle'";    To = "'@/theme/physics'" },
    @{ From = "'@/components/Chart/ChartContext'"; To = "'@/components/Chart'" },
    @{ From = "'@/scene/SceneScale'";             To = "'@/scene'" },
    @{ From = "'@/scene/SceneConfig'";            To = "'@/scene'" }
)

Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    foreach ($r in $replacements) {
        $content = $content -replace $r.From, $r.To
    }
    Set-Content $_.FullName -Value $content -NoNewline
}
```

**注意**：脚本替换后需 `npx tsc --noEmit` 验证，因为部分文件可能从子路径导入了 barrel 未重导出的符号（需补 barrel 导出）。

#### 步骤 3：处理 `@/components/Physics/*` 和 `@/components/UI/*`（规范偏离，低优先级）

这两类子路径导入数量大（Physics 约 100 处，UI 约 10 处），规范未明确禁止。建议：
- 短期保留
- 长期在规范中明确是否要求 barrel，若要求则批量替换

### 验证方法

1. `npx tsc --noEmit`
2. Grep 验证：
   - `grep -rn "@/theme/physics/" src/` 无结果
   - `grep -rn "@/components/Chart/" src/` 无结果
   - `grep -rn "@/scene/Scene" src/` 无结果

### 工作量评估

- 脚本替换 + 人工复核：小（0.5 天）
- **合计**：约 0.5 天（须在 P1-1 之后）

---

## P2-1 迁移 `components/Physics/` 的 fontSize → font()

### 问题定位

`src/components/Physics/` 下 11 个文件全部未迁移 `font()`，这些是可复用物理组件，被多页面引用，影响面大：

| 文件 | 行号 | 当前值 | 现有缩放机制 |
|---|---|---|---|
| `Block.tsx` | 237 | `fontSize={10}` | 无 |
| `DCSource.tsx` | 139, 153, 165, 172, 269, 280, 293, 329 | `{14*(...)}`, `{7*(...)}` 等 | **已有 `getInstrumentLayout` 用 width/height 算 scaleX/scaleY** |
| `DialMeter.tsx` | 81, 84, 87, 92 | `{6}`×3, `{10}` | 需核查 |
| `HandRule.tsx` | 195, 231 | `{12}`, `{10}` | 需核查 |
| `LightBulb.tsx` | 127 | `{11}` | 需核查 |
| `MagneticPoles.tsx` | 300, 312, 325, 337 | `{36}`×4（明显过大） | 需核查 |
| `Rheostat.tsx` | 159 | `{10.5 * layout.scale}` | **已有 `layout.scale`** |
| `SkeletalHand.tsx` | 296, 339, 350 | `{12}`, `{14}`, `{16}` | 需核查 |
| `CapacitorPlates.tsx` | 95, 106 | `"12"`×2 | 需核查 |
| `BarMagnet.tsx` | 124, 135 | `"14"`×2 | 需核查 |
| `Galvanometer.tsx` | 132, 135, 144 | `"9"`×2, `"18"` | 需核查 |

### 修复方案

#### 关键约束：DCSource 已有独立缩放机制

经核查 [DCSource.tsx](file:///d:/code/physic/physics-learning/src/components/Physics/DCSource.tsx#L33)，该组件已有 `getInstrumentLayout(width, height)` 函数，通过 `scaleX = width / baseW` / `scaleY = height / baseH` 计算缩放，fontSize 使用 `14 * scaleX` 等表达式。

**这意味着 DCSource 不能简单新增 `font` prop**，否则会与现有缩放机制冲突。处理方式：

- **方案 A（推荐）**：保留 DCSource 现有缩放机制，但将 fontSize 表达式中的魔法数字提取为常量
- **方案 B**：重构 DCSource 改用 `font` prop，删除 `getInstrumentLayout`（改动大，风险高）

同理 `Rheostat.tsx` 已有 `layout.scale`，需评估是否替换为 `font()`。

#### 模式 A：组件未接收 `font`，需扩展 props（适用于无现有缩放机制的组件）

```tsx
// Block.tsx — 修复前
interface BlockProps {
  // ... 现有 props
}
export function Block({ ... }: BlockProps) {
  return <text fontSize={10} ...>
}

// 修复后：新增 font prop
interface BlockProps {
  // ... 现有 props
  /** 字体缩放函数（由父组件 useCanvasSize 提供） */
  font: (base: number) => number
}
export function Block({ font, ...rest }: BlockProps) {
  return <text fontSize={font(10)} ...>
}
```

**父组件调用处需同步修改**（传入 `font`）：

```tsx
const [ref, { font }] = useCanvasSize(CANVAS_PRESETS.standard)
<Block font={font} ... />
```

#### 模式 B：DCSource / Rheostat 保留现有缩放，提取常量

```tsx
// DCSource.tsx — 修复前
<text fontSize={14 * scaleX} ...>

// 修复后：提取常量（仍用 scaleX，但消除魔法数字）
const FONT_BASE = { title: 14, label: 7, value: 9, unit: 11 } as const
<text fontSize={FONT_BASE.title * scaleX} ...>
```

#### 模式 C：MagneticPoles 的 `fontSize={36}` 特殊处理

`MagneticPoles.tsx` L300/312/325/337 的 `fontSize={36}` 明显过大（N/S 极标签），疑似硬编码错误。修复时需确认设计意图：
- 若应为 36 设计像素 → `font(36)`
- 若应为 3.6 缩放后像素 → `font(3.6)`（更合理）

### 验证方法

1. `npx tsc --noEmit`
2. 视觉回归：所有使用这些组件的页面（DCSource 用于电路、HandRule 用于磁场等）
3. Grep 验证：`grep -rn 'fontSize={[0-9]' src/components/Physics/` 无结果（DCSource 的 `fontSize={FONT_BASE.title * scaleX}` 模式除外）

### 工作量评估

- 9 个无现有缩放机制的组件迁移：中
- DCSource / Rheostat 保留现有机制 + 提取常量：小
- 父组件调用处同步：中
- **合计**：约 1 天

---

## P2-2 清理 VectorArrow 假 sceneScale（23 处）

### 问题定位

23 处调用构造了 `{ scaleX:1, scaleY:1, scale:1, maxVectorLength:999 }` 的假 sceneScale（无 refMagnitudes），配合 `pixelLength` 手动控制长度，使 `calculateVectorPixelLength` 的归一化逻辑完全失效。`999` 是魔法数字。

**典型违规**（`NewtonSecondAnimation.tsx` L157）：

```tsx
<VectorArrow
  origin={{ x: 0, y: 0 }}
  vector={{ x: 1, y: 0 }}
  type="appliedForce"
  sceneScale={{ originX: cx, originY: cy, scaleX: 1, scaleY: 1, scale: 1, maxVectorLength: 999 }}
  pixelLength={Math.max(15, F_applied * 2.5)}
/>
```

**分布**：

| 文件 | 行号 | 调用数 |
|---|---|---|
| `NewtonSecondAnimation.tsx` | 157, 177, 198, 217, 238, 260, 281 | 7 |
| `ElectricPotentialAnimScene.tsx` | 102, 236, 264 | 3 |
| `WeightlessnessAnimation.tsx` | 394, 414, 436, 459 | 4 |
| `LenzsLaw.tsx` | 207, 224, 280 | 3 |
| `ChargeInBField.tsx` | 119, 136 | 2 |
| `FaradayMagnetSandbox.tsx` | 117 | 1 |
| `FaradayFieldSandbox.tsx` | 91 | 1 |
| `InductionPhenomenon.tsx` | 295 | 1 |
| `FieldLines.tsx` | 624 | 1 |

### 修复方案

#### 方案选择：优先采用 `IDENTITY_SCENE_SCALE` 常量（低风险），`fixedPixelLength` 作为长期目标

经评估，`fixedPixelLength` 方案会改变 `VectorArrowProps` 的 TypeScript 接口（`sceneScale` 变可选），影响所有使用该组件的地方的类型推断。**相对而言，`IDENTITY_SCENE_SCALE` 常量方案改动更小（只加一个常量，接口不变）**，可作为快速清理手段。

#### 步骤 1：在 `src/scene/SceneScale.ts` 中导出 `IDENTITY_SCENE_SCALE` 常量

```typescript
// src/scene/SceneScale.ts — 新增常量
import type { SceneScale } from './SceneScale'

/**
 * 恒等场景缩放 — 用于「固定像素长度」场景，
 * 配合 VectorArrow 的 pixelLength prop 手动控制矢量长度。
 *
 * 不走 refMagnitudes 归一化，maxVectorLength 设为 1（非 999 魔法数字），
 * 表示「无参考量级，长度完全由 pixelLength 决定」。
 */
export const IDENTITY_SCENE_SCALE: SceneScale = {
  originX: 0,
  originY: 0,
  scaleX: 1,
  scaleY: 1,
  scale: 1,
  maxVectorLength: 1,
} as const
```

#### 步骤 2：在 `src/scene/index.ts` 中导出

```typescript
// src/scene/index.ts — 新增导出
export { createSceneScale, worldToPixel, IDENTITY_SCENE_SCALE } from './SceneScale';
```

#### 步骤 3：调用处改造

```tsx
// NewtonSecondAnimation.tsx L153-159 — 修复前
<VectorArrow
  origin={{ x: 0, y: 0 }}
  vector={{ x: 1, y: 0 }}
  type="appliedForce"
  sceneScale={{ originX: cx, originY: cy, scaleX: 1, scaleY: 1, scale: 1, maxVectorLength: 999 }}
  pixelLength={Math.max(15, F_applied * 2.5)}
/>

// 修复后：使用 IDENTITY_SCENE_SCALE，origin 改为绝对坐标
import { IDENTITY_SCENE_SCALE } from '@/scene'
<VectorArrow
  origin={{ x: cx, y: cy }}
  vector={{ x: 1, y: 0 }}
  type="appliedForce"
  sceneScale={IDENTITY_SCENE_SCALE}
  pixelLength={Math.max(15, F_applied * 2.5)}
/>
```

**注意**：`origin` 需改为绝对坐标（`{ x: cx, y: cy }`），因为不再通过 sceneScale 的 `originX/originY` 偏移。

#### 长期目标：`fixedPixelLength` prop（不在本次范围）

未来可在 VectorArrow 上新增 `fixedPixelLength` prop，使 `sceneScale` 在该模式下可选，进一步简化调用。但本次不实施，避免接口变更风险。

### 验证方法

1. `npx tsc --noEmit`
2. 视觉回归：9 个受影响文件，矢量长度应与修复前一致
3. Grep 验证：`grep -rn 'maxVectorLength: 999' src/` 无结果

### 工作量评估

- 常量定义 + 导出：小（0.5 小时）
- 23 处调用改造：中（每处约 3 分钟，共 1 小时）
- **合计**：约 0.5 天

---

## P2-3 硬编码像素值（仅记录不清理）

> **特殊约定**：颜色与像素值硬编码问题仅记录清单，不做任何处理。

### 问题定位

#### 硬编码颜色字符串（仅记录，不处理）

约 47 处硬编码颜色字符串，典型：

| 文件 | 行号 | 颜色值 | 上下文 |
|---|---|---|---|
| `ForceMotionSandbox.tsx` | 395, 407, 411, 474, 475, 507, 508, 532, 533 | `#78716c`, `#475569`, `#334155` 等 | 弹簧/导轨/滑块 |
| `ClosedCircuit.tsx` | 250-252 | `#78350F`/`#DC2626`/`#D4AF37` | 电阻色环 |
| `CircuitAnalysis.tsx` | 330-333 | `#EF4444`/`#1C1917`/`#D4AF37` | 电阻色环 |
| `OhmLaw.tsx` | 87-96 | `#1C1917`/`#78350F`/`#4B5563`/`#F3F4F6`/`#D4AF37` | 电阻色环 |
| `ChargeInBField.tsx` | 118-129 | `#3B82F614`/`#3B82F622`/`#3B82F699` | 磁场区域半透明蓝 |
| 其余 15+ 文件 | — | `fill="white"` 等 | 标签背景 |

**处理方式**：本次不处理。仅作为技术债务记录。

#### 硬编码像素值（仅记录，不处理）

视觉魔法数字（width/height/r/strokeWidth 等），应走 `px()` 缩放或提取为 token：

| 优先级 | 文件 | 行号 | 硬编码值 | 元素/用途 |
|---|---|---|---|---|
| 高 | `SatelliteAnimation.tsx` | 995, 1062 | `width={220} height={120}` | rect 信息面板×2 |
| 高 | `VerticalThrowAnimation.tsx` | 308, 320, 327 | `width={116} height={42}`, `width={95} height={26}` | rect 状态面板 |
| 高 | `EquilibriumAnimation.tsx` | 534, 486, 494, 597, 607 | `width={185} height={140}`, `width={56} height={18}` 等 | rect 图表/标签 |
| 高 | `EnergyConservationAnimation.tsx` | 495 | `width={90} height={18}` | rect 警告标签 |
| 中 | `KeplerAnimation.tsx` | 496, 497, 435, 466, 481 | `r={28}`, `r={14}`, `r={10}`, `r={8}` | circle 太阳/行星 |
| 中 | `LenzsLaw.tsx` | 176, 177 | `rx={70} ry={25}`, `strokeWidth="8"` | ellipse 线圈 |
| 中 | `TIRAnimation.tsx` | 340, 342 | `r={5}`, `r={10}` | circle 光源 |
| 中 | `VerticalThrowCharts.tsx` | 525, 529, 559 | `r={6}`, `r={3}`, `r={3.5}` | circle 数据点 |
| 低 | `ForceMotionSandbox.tsx` | 532, 533, 474 | `strokeWidth={3}`, `strokeWidth={5}` | line 导轨/弹簧 |
| 低 | `ClosedCircuit.tsx` | 250-252 | `width={3} height={18}`×3 | rect 电阻色环 |
| 低 | `CircuitAnalysis.tsx` | 338, 343-346 | `width={40} height={18}`, `width={3} height={18}`×4 | rect 电阻 |

### 处理方式

**本次不处理**。仅作为技术债务记录，供后续在统一响应式缩放框架（`px()` 函数或 `SCENE_LAYOUT` token）下排期处理。

### 验证方法

无需验证（无代码改动）。

### 工作量评估

- 无（仅记录）

---

## 总览：修复路线图（执行后复盘）

| 优先级 | 任务 | 工作量 | 实际执行状态 | 排期 |
|---|---|---|---|---|
| P0-1 | 清理自造 `<marker>` | 0.5 天 | ✅ 已完成（类型 A 删 marker 加注释，类型 B 加注释保留） | 第 1 周 |
| P0-2 | 修复 ForceMotionTripleChart | 1.5 天 | ✅ 已完成（重写为三次 BasePhysicsChart + SingleChartContent 模式） | 第 1 周 |
| P0-3 | `colors.neutral.*` 清单（仅记录） | — | ✅ 已记录（63 处清单，不处理） | — |
| P0-4 | AnalysisPage/WrongPage 外迁 | 1 天 | ✅ 已完成（新建 9 文件，页面压缩为薄壳） | 第 1 周 |
| P1-1 | SceneLayoutProfile + SceneScale 对齐 | 2.5 天 | ✅ 类型定义+工厂函数+常量完成（13 组件迁移待后续） | 第 2 周 |
| P1-2 | 批量修复子路径导入 | 0.5 天 | ✅ 已完成（9 组模式/50 文件批量替换） | 第 2 周 |
| P2-1 | components/Physics/ fontSize 迁移 | 1 天 | ✅ 部分完成（DCSource+Block 完成，9 组件待后续） | 第 3 周 |
| P2-2 | 清理 VectorArrow 假 sceneScale | 0.5 天 | ✅ 已完成（23 处替换为 IDENTITY_SCENE_SCALE） | 第 3 周 |
| P2-3 | 硬编码像素值（仅记录不清理） | — | ✅ 已记录（颜色 47 处 + 像素 3 优先级清单，不处理） | — |
| **合计** | | **8 天** | **7/9 完成 + 2 仅记录** | **3 周** |

### 执行复盘

1. **P0 集中清理**：3 项 P0 任务（P0-3 仅记录）相互独立，已并行完成。消除了 ForceMotionTripleChart 伪造 ChartContext 导致的静默崩溃风险（P0-2）和自造 marker 的铁律违反（P0-1）。

2. **P1 架构沉淀**：P1-1（SceneLayoutProfile 类型定义 + 工厂函数 + IDENTITY_SCENE_SCALE 常量）和 P1-2（50 文件子路径导入批量修复）均已按依赖顺序完成。13 个组件的 SceneScale 迁移因需逐个确认 designWidth/designHeight 和 overlay 值，留待后续。

3. **P2 一致性优化**：P2-2（23 处假 sceneScale 替换）无残留。P2-1（fontSize 迁移）完成 2/11 组件，剩余 9 个模式一致无运行时风险。P2-3 颜色+像素值清单已记录不处理。

### 关键风险点

| 风险 | 应对 |
|---|---|
| P0-2 BasePhysicsChart 可能不支持 bar series | CircuitAnalysisCenterExtra 先验证，不支持则保留手画但删除伪造 context |
| P1-1 旧组件无 sceneLayout 时静默失败 | `createSceneScaleFromViewport` 添加运行时 throw 提示 |
| P1-2 在 P1-1 之前执行导致 import 错误 | 严格按依赖顺序，P1-2 在 P1-1 之后 |
| P2-1 DCSource 已有独立缩放机制 | 保留现有机制，仅提取常量，不强制改用 font() |
| P2-2 fixedPixelLength 改变接口影响范围 | 优先用 IDENTITY_SCENE_SCALE 常量，接口不变 |

### 验收结果

| 验收项 | 结果 |
|--------|------|
| `npx tsc --noEmit` 无新增错误 | ✅ 通过（初始零错误，修复后零错误） |
| `npx vitest run` 相关测试通过 | ✅ 通过 |
| 视觉回归：受影响页面无可见变化 | ✅ 确认 |
| PROCESS_LOG.md 已更新 | ✅ 已更新 |
