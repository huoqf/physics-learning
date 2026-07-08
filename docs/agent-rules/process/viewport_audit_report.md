# Viewport 架构规范审计报告

> 审计范围：`project_rules.md` + `07_CANVAS_SVG_CHART_RULES.md` 规范要求 vs. 实际代码实现
> 审计时间：2026-07-08

---

## 一、规范核心要点（待验证项）

| 规范条目 | 规范要求 |
|---------|---------|
| 铁律 1-5 | 画布尺寸必须走 `useCanvasSize(CANVAS_PRESETS.xxx)`（仅 full/splitV/splitH/square 四种） |
| 铁律 1-6 | 字体缩放必须走 `font()` 函数，禁止裸值 `fontSize={N}` |
| 铁律 1-7A | 方式A：viewBox **绑定设计常量**，不使用 `vp.transform` |
| 铁律 1-7B | 方式B：动态 `viewBox={width×height}` + `vp.transform`，**必须声明 overlay 参数** |
| 铁律 1-7 严禁 | 未声明 overlay 时，`viewBox={0 0 ${width} ${height}}` + `vp.transform` = **双重缩放反模式** |
| 铁律 1-8 | 同一组件只能选一条核心渲染策略，禁止 SVG 内用 `<foreignObject>` 嵌入响应式图表 |
| 07规范§2.3 | 旧 `VIEW_WIDTH/HEIGHT` 固定方案禁止在新组件使用，存量须迁移 |
| 07规范§2 | `designWidth/designHeight` 必须与所用 CANVAS_PRESETS 完全一致 |

---

## 二、发现的缺陷与漏洞

### 🔴 严重（直接导致 bug）

#### 缺陷 1：双重缩放反模式——TIRAnimation（全内反射）
**文件**：[TIRAnimation.tsx](file:///D:/code/physic/physics-learning/src/features/optics/total-internal-reflection/TIRAnimation.tsx#L39-L66)

```tsx
// ❌ 违规：viewBox 没有绑定，但使用了 canvasSize.width/height 作为 svg 的 width/height
// 且 useViewport 未传 overlay 参数，然后又使用了 vp.transform
const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
const vp = useViewport(canvasSize, {
  designWidth: TIR_DESIGN.width,   // ← 800（非 CANVAS_PRESETS 值！）
  designHeight: TIR_DESIGN.height, // ← 500（非 CANVAS_PRESETS 值！）
  // ⚠️ 无 overlay 参数声明！
})

<svg
  width={canvasSize.width}     // ← 真实像素尺寸
  height={canvasSize.height}   // ← 真实像素尺寸
>
  <g transform={vp.transform}> {/* ← 无 overlay 下的双重缩放！*/}
```

**问题**：
1. `viewBox` 缺失（SVG 元素没有 `viewBox` 属性），等同于 viewBox = width×height
2. 未声明 overlay 参数 + 使用 `vp.transform` = **双重缩放反模式**
3. `designWidth: 800 / designHeight: 500` 与 `CANVAS_PRESETS.full (700×650)` 不一致

---

#### 缺陷 2：双重缩放反模式——RefractionAnimation（折射）
**文件**：[RefractionAnimation.tsx](file:///D:/code/physic/physics-learning/src/features/optics/refraction/RefractionAnimation.tsx#L43-L88)

```tsx
// ❌ 与 TIRAnimation 完全相同的反模式
const vp = useViewport(canvasSize, {
  designWidth: 800,  // ← 非标准预设值
  designHeight: 500, // ← 非标准预设值
  // 无 overlay 参数
})
<svg width={canvasSize.width} height={canvasSize.height}>
  <g transform={vp.transform}> {/* 双重缩放！ */}
```

**同时存在** `designWidth/Height` 与 `CANVAS_PRESETS` 不一致问题。

---

#### 缺陷 3：`designWidth/Height` 与 CANVAS_PRESETS 不一致——MomentumTheoremAnimation
**文件**：[MomentumTheoremAnimation.tsx](file:///D:/code/physic/physics-learning/src/features/mechanics/momentum/MomentumTheoremAnimation.tsx#L26-L34)

```tsx
const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
// CANVAS_PRESETS.full = 700×650，但 useViewport 传了 600×450
const vp = useViewport(canvasSize, {
  designWidth: 600,   // ❌ 与 CANVAS_PRESETS.full.width=700 不一致
  designHeight: 450,  // ❌ 与 CANVAS_PRESETS.full.height=650 不一致
  overlayRight: Math.round(cardWidth + 24),  // ✅ 有 overlay，不是双重缩放问题
})
```

**问题**：规范明确要求 `designWidth/designHeight 必须与所选 preset 完全一致`。此处使用了自定义尺寸 600×450，不属于任何合法 CANVAS_PRESETS 值，且无 `presetCompensation` 说明。会导致 `vp.scale` 计算结果与容器实际缩放比脱节。

---

#### 缺陷 4：`foreignObject` 嵌入响应式图表——多处违反铁律 1-8
**文件清单（均为直接违规）**：

| 文件 | 问题 |
|------|------|
| [GasLawsAnimation.tsx#L393](file:///D:/code/physic/physics-learning/src/features/thermodynamics/gasLaws/GasLawsAnimation.tsx#L393) | `<foreignObject>` 嵌入 `RelationChart`（响应式图表组件） |
| [ClapeyronAnimation.tsx#L344](file:///D:/code/physic/physics-learning/src/features/thermodynamics/gasLaws/ClapeyronAnimation.tsx#L344) | `<foreignObject>` 嵌入 `RelationChart` |
| [SimpleHarmonicAnimation.tsx#L635](file:///D:/code/physic/physics-learning/src/features/vibration/simpleHarmonic/SimpleHarmonicAnimation.tsx#L635) | SVG 内 `<foreignObject>` 嵌入 HTML 区块 |
| [EnergyConservationAnimation.tsx#L336](file:///D:/code/physic/physics-learning/src/features/mechanics/energy/EnergyConservationAnimation.tsx#L336) | SVG 内 `<foreignObject>` 嵌入图表 |

规范要求**必须改用 HTML `flex` 容器平级分区**，严禁在 SVG 内用 `<foreignObject>` 包裹图表组件（两套缩放叠加，导致图表裁切/X轴消失）。

---

### 🟠 中等（规范偏差，可能导致视觉异常）

#### 缺陷 5：旧方案固定 viewBox 800×500 未迁移——ReflectionAnimation、ThinLensAnimation
**文件**：
- [ReflectionAnimation.tsx#L62](file:///D:/code/physic/physics-learning/src/features/optics/reflection/ReflectionAnimation.tsx#L62)
- [ThinLensAnimation.tsx#L154](file:///D:/code/physic/physics-learning/src/features/optics/thin-lens/ThinLensAnimation.tsx#L154)

```tsx
// ❌ 旧方案（§2.3 明确禁止新组件使用，存量须迁移）
<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet">
```

800×500 不是任何合法 CANVAS_PRESETS 值（full=700×650, splitV=700×325, splitH=350×650, square=650×650）。规范要求存量迁移至标准预设。

---

#### 缺陷 6：非标准 viewBox（650×400）——OhmLaw
**文件**：[OhmLaw.tsx#L89](file:///D:/code/physic/physics-learning/src/features/electromagnetism/dc-circuits/OhmLaw.tsx#L89)

```tsx
<svg viewBox="0 0 650 400" ...>  // ❌ 650×400 不属于任何有效 preset
```

---

#### 缺陷 7：硬编码 HEX 颜色——BinaryStarsAnimation、CombinedFieldsAnimation
**文件**：
- [BinaryStarsAnimation.tsx#L44](file:///D:/code/physic/physics-learning/src/features/mechanics/gravitation/BinaryStarsAnimation.tsx#L44)
  ```tsx
  style={{ background: '#F8FAFC' }}  // ❌ 应从 @/theme 引入
  stroke="#E2E8F0"  // ❌ 硬编码
  stroke="#94A3B8"  // ❌ 硬编码
  ```
- [CombinedFieldsAnimation.tsx#L577-L585](file:///D:/code/physic/physics-learning/src/features/electromagnetism/magnetism/combined-fields/CombinedFieldsAnimation.tsx#L577)
  ```tsx
  <text fontSize={10}>  // ❌ 裸值 fontSize
  <text fontSize={9}>   // ❌ 裸值 fontSize
  ```

---

#### 缺陷 8：BinaryStarsAnimation 使用 splitH 但 viewBox 为动态
**文件**：[BinaryStarsAnimation.tsx#L10-L43](file:///D:/code/physic/physics-learning/src/features/mechanics/gravitation/BinaryStarsAnimation.tsx#L10-L43)

```tsx
const [, canvasSize] = useCanvasSize(CANVAS_PRESETS.splitH)  // 350×650
// 但 SVG 没有 viewBox，只有 width="100%" height="100%"
<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
// 内容却用设计坐标 cx = 175 (硬编码)，未使用 vp.transform
```

**问题**：动态 `viewBox={0 0 ${width} ${height}}`（方式B 特征），但内部没有 `<g transform={vp.transform}>`，相当于在容器坐标系内用设计坐标，宽高变化时布局会失真。

---

### 🟡 轻微（建议改进，不直接破坏功能）

#### 缺陷 9：CircularMotionAnimation——useViewport 无 overlay 参数但未用 vp.transform
**文件**：[CircularMotionAnimation.tsx#L73-L76](file:///D:/code/physic/physics-learning/src/features/mechanics/circular/CircularMotionAnimation.tsx#L73)

```tsx
const vp = useViewport(canvasSize, {
  designWidth: CIRCULAR_DESIGN.width,
  designHeight: CIRCULAR_DESIGN.height,
  // 无 overlay 参数
})
// SVG 使用 width={canvasSize.width} height={canvasSize.height}，无 viewBox，无 vp.transform
// 但通过 vp.visibleW/H/centerX/centerY 做方式C 布局
```

技术上用的是方式C（可视区自适应），但无 overlay 时方式C 正常——此处可合法，但注意 SVG 无 `viewBox` 属性，依赖容器原生尺寸，符合方式C 描述但规范中未明确要求。

#### 缺陷 10：BrownianMotion 动态 viewBox 但无 overlay 无 transform（可能合法但形式混乱）
**文件**：[BrownianMotion.tsx#L211](file:///D:/code/physic/physics-learning/src/features/thermodynamics/kinematics/BrownianMotion.tsx#L211)

```tsx
<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
```

动态 viewBox 绑定真实像素，没有 `vp.transform`，内部用像素坐标直接绘制——技术上是方式C变体，不构成双重缩放反模式，但 viewBox 与 width/height 相同时 viewBox 无实际作用，属冗余写法。

#### 缺陷 11：LoopPassFieldScene 及 DualRodsScene 动态 viewBox 无 overlay 无 transform
**文件**：
- [LoopPassFieldScene.tsx#L103](file:///D:/code/physic/physics-learning/src/features/electromagnetism/induction/loop-field/components/LoopPassFieldScene.tsx#L103)

与 BrownianMotion 类似，`viewBox={0 0 ${width} ${height}}` + `preserveAspectRatio` + 用 `width/height` 为基础的像素坐标，属于方式C变体，但viewBox与实际尺寸完全一致时规范约束无意义。

---

## 三、规范自身潜在漏洞

### 规范漏洞 A：方式C 对 "无 viewBox SVG" 的表述不清晰
**位置**：`07_CANVAS_SVG_CHART_RULES.md §2.4` 及 `project_rules.md` 铁律 1-7

规范中方式C 示例代码写的是：
```tsx
<svg width={canvasSize.width} height={canvasSize.height} className="w-full h-full">
```
但没有明确说明"方式C 下是否需要 viewBox"，以及 `viewBox={0 0 ${width} ${height}}` + preserveAspectRatio 是否等同于无 viewBox。实际代码中存在多种方式C变体写法，规范未覆盖。

### 规范漏洞 B：`designWidth/designHeight` 的自由度边界不清晰
**位置**：`project_rules.md §4 铁律 1-7` + `07规范§2.2`

规范要求"`designWidth/designHeight` 必须与所选 preset 完全一致"，但：
1. `MomentumTheoremAnimation` 用 `CANVAS_PRESETS.full`（700×650）但 `designWidth=600, designHeight=450`
2. `TIRAnimation`/`RefractionAnimation` 用 `CANVAS_PRESETS.full` 但 `designWidth=800, designHeight=500`

规范没有说明：方式B（有 overlay）下 `designWidth` 是否可以不等于 preset？若业务上必须使用不同设计坐标系，规范应补充合法例外场景或迁移路径。

### 规范漏洞 C：`foreignObject` 的使用场景划定存在灰色地带
**位置**：`07_CANVAS_SVG_CHART_RULES.md §2.7`

规范明确禁止"SVG 内用 `<foreignObject>` 包裹图表组件（两套缩放叠加，导致图表裁切/X轴消失）"，但实际存在大量 `<foreignObject>` 使用：
- 部分（如 `GasLawsAnimation`、`ClapeyronAnimation`）属于明确违规：嵌入 `RelationChart` 等响应式图表
- 部分（如 `MomentumScene`、`SatelliteAnimation` 的信息卡片）则是"信息卡片 HTML"而非"响应式图表"

规范未区分"响应式图表组件 `<foreignObject>`（禁止）"与"静态 HTML 信息卡（可接受）"，导致判断困难。

---

## 四、问题汇总

| 级别 | 数量 | 问题 |
|------|------|------|
| 🔴 严重 | 4 | TIRAnimation 双重缩放、RefractionAnimation 双重缩放、MomentumTheorem designWidth 不一致、foreignObject 图表嵌入多处 |
| 🟠 中等 | 4 | ReflectionAnimation/ThinLensAnimation 旧方案 800×500 未迁移、OhmLaw 非标准 viewBox、BinaryStars 硬编码颜色+fontSize、CombinedFields 裸值 fontSize |
| 🟡 轻微 | 3 | CircularMotion 方式C 形式、BrownianMotion 冗余 viewBox、LoopPassFieldScene 冗余 viewBox |
| 📋 规范漏洞 | 3 | 方式C viewBox 表述不清、designWidth 边界未定、foreignObject 灰色地带 |

---

## 五、修复优先级建议

1. **立即修复**：TIRAnimation + RefractionAnimation（双重缩放，用户首次进入有"缓缓放大"视觉跳变）
2. **本里程碑内**：GasLawsAnimation + ClapeyronAnimation（foreignObject 嵌图表，X轴可能消失）
3. **迁移排期**：ReflectionAnimation、ThinLensAnimation、OhmLaw（旧方案迁移至标准 preset）
4. **规范补充**：在 `07_CANVAS_SVG_CHART_RULES.md` §2.4 增加方式C的 viewBox 说明，§2.7 区分图表组件与信息卡 foreignObject
