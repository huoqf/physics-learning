# Viewport 架构规范审计报告

> 审计范围：`project_rules.md` + `07_CANVAS_SVG_CHART_RULES.md` 规范要求 vs. 实际代码实现
> 首次审计：2026-07-08
> 最近更新：2026-07-08（二次审计：3 个严重缺陷已修复，剩余 2 个严重缺陷）

---

## 一、规范核心要点

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

## 二、缺陷状态追踪

### 迁移进度总览

| 级别 | 首次审计 | 已修复 | 仍存在 |
|------|:-------:|:------:|:------:|
| 🔴 严重 | 4 | 4 | 0 |
| 🟠 中等 | 4 | 4 | 0 |
| 🟡 轻微 | 3 | 3 | 0 |
| **合计** | **11** | **11** | **0** |

---

### 🔴 严重（直接导致 bug）

#### ~~缺陷 1：双重缩放反模式——TIRAnimation~~ ✅ 已修复
**文件**：`src/features/optics/total-internal-reflection/TIRAnimation.tsx`

修复方式：`useAnimationViewport({ preset: CANVAS_PRESETS.full, presetCompensation: 1.2 })` + `AnimationSvgCanvas`。设计常量 `VIEW_WIDTH=700, VIEW_HEIGHT=650` 对齐 `CANVAS_PRESETS.full`。

#### ~~缺陷 2：双重缩放反模式——RefractionAnimation~~ ✅ 已修复
**文件**：`src/features/optics/refraction/RefractionAnimation.tsx`

修复方式：与 TIRAnimation 相同，`useAnimationViewport` + `AnimationSvgCanvas`，设计坐标 840×650 对齐 preset。

#### ~~缺陷 3：`designWidth/Height` 与 CANVAS_PRESETS 不一致——MomentumTheoremAnimation~~ ✅ 已修复
**文件**：`src/features/mechanics/momentum/MomentumTheoremAnimation.tsx`

修复方式：`useCanvasSize` + `useViewport` 拆分迁移至 `useAnimationViewport({ preset: CANVAS_PRESETS.full, presetCompensation: 1.2, overlayRight: ... })` + `AnimationSvgCanvas`。designWidth/Height 由 hook 内部从 preset 派生（840×650），消除手动不一致。

#### 缺陷 4：`foreignObject` 嵌入响应式图表 🔴

| 文件 | 状态 | 说明 |
|------|:----:|------|
| `GasLawsAnimation.tsx` | ✅ 已修复 | RelationChart 移至 HTML flex 分区，无 foreignObject |
| `ClapeyronAnimation.tsx` | ✅ 已修复 | RelationChart 移至 HTML flex 层，无 foreignObject |
| `SimpleHarmonicAnimation.tsx` | ✅ 已修复 | EnergyBars 移至绝对定位 HTML overlay，无 foreignObject |
| `EnergyConservationAnimation.tsx` | ✅ 已修复 | RelationChart 移至绝对定位 HTML overlay，无 foreignObject |

所有 foreignObject 嵌入响应式图表的违规已清零。

---

### 🟠 中等（规范偏差，可能导致视觉异常）

#### ~~缺陷 5：旧方案固定 viewBox 800×500——ReflectionAnimation、ThinLensAnimation~~ ✅ 已修复
**文件**：
- `src/features/optics/reflection/ReflectionAnimation.tsx`
- `src/features/optics/thin-lens/ThinLensAnimation.tsx`

修复方式：均迁移至 `useAnimationViewport({ preset: CANVAS_PRESETS.full })` + `AnimationSvgCanvas`，设计坐标 840×650。ThinLensAnimation 的 RelationChart 也移至 HTML flex 层。

#### ~~缺陷 6：非标准 viewBox（650×400）——OhmLaw~~ ✅ 已修复
**文件**：`src/features/electromagnetism/dc-circuits/OhmLaw.tsx`

修复方式：`useAnimationViewport({ preset: CANVAS_PRESETS.splitV })` + `AnimationSvgCanvas`，设计坐标 840×325。

#### 缺陷 7：硬编码 HEX 颜色——BinaryStarsAnimation ✅ 已修复
**文件**：`src/features/mechanics/gravitation/BinaryStarsAnimation.tsx`

修复方式：所有硬编码 HEX 颜色替换为 `PHYSICS_COLORS.*` 语义 token：
- `#E2E8F0` → `PHYSICS_COLORS.grid`（轨道圈）
- `#94A3B8` → `PHYSICS_COLORS.textMuted`（连线）
- `#CBD5E1` → `PHYSICS_COLORS.trackHistory`（三角形连线）
- `#EF4444` → `PHYSICS_COLORS.alertRed`（质心标记）
- `#EA580C` → `PHYSICS_COLORS.forceNet`（力矢量）
- `#2563EB` → `PHYSICS_COLORS.velocity`（速度矢量）
- `rgba(234, 88, 12, 0.5)` → `withAlpha(PHYSICS_COLORS.forceNet, 0.5)`（分引力）
- `#C2410C` → `PHYSICS_COLORS.forceNetArrow`（橙星标签）
- `#1D4ED8` → `PHYSICS_COLORS.objectStroke`（蓝星标签）

#### ~~缺陷 8：CombinedFieldsAnimation 裸值 fontSize~~ ✅ 已修复
**文件**：`src/features/electromagnetism/magnetism/combined-fields/CombinedFieldsAnimation.tsx`

修复方式：所有 `fontSize` 值改为 `font(11)` / `font(13)` 等函数调用。

---

### 🟡 轻微（建议改进，不直接破坏功能）

#### ~~缺陷 9：CircularMotionAnimation——旧式拆分模式~~ ✅ 已修复
**文件**：`src/features/mechanics/circular/CircularMotionAnimation.tsx`

修复方式：`useCanvasSize(CANVAS_PRESETS.square)` + `useViewport` 拆分迁移至 `useAnimationViewport({ preset: CANVAS_PRESETS.square })` + `AnimationSvgCanvas`。删除 `CIRCULAR_DESIGN` 常量，改用 `CANVAS_PRESETS.square.width/height`。

#### ~~缺陷 10：BrownianMotion 冗余 viewBox~~ ✅ 已修复
**文件**：`src/features/thermodynamics/kinematics/BrownianMotion.tsx`

修复方式：删除冗余的 `viewBox={0 0 ${width} ${height}}`（与 `width`/`height` 属性完全相同时无实际作用）。

#### ~~缺陷 11：LoopPassFieldScene 冗余 viewBox~~ ✅ 已修复
**文件**：`src/features/electromagnetism/induction/loop-field/components/LoopPassFieldScene.tsx`

修复方式：`useAnimationViewport` + `AnimationSvgCanvas`，冗余 viewBox 已移除。

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

规范要求"`designWidth/designHeight` 必须与所选 preset 完全一致"，但 `MomentumTheoremAnimation` 用 `CANVAS_PRESETS.full`（840×650）但 `designWidth=600, designHeight=450`。

规范没有说明：方式B（有 overlay）下 `designWidth` 是否可以不等于 preset？若业务上必须使用不同设计坐标系，规范应补充合法例外场景或迁移路径。

### 规范漏洞 C：`foreignObject` 的使用场景划定存在灰色地带
**位置**：`07_CANVAS_SVG_CHART_RULES.md §2.7`

规范明确禁止"SVG 内用 `<foreignObject>` 包裹图表组件"，但实际存在两类使用：
- **明确违规**：嵌入 `RelationChart` 等响应式图表（`EnergyConservationAnimation`）
- **灰色地带**：嵌入非图表 HTML 组件（`SimpleHarmonicAnimation` 的 `EnergyBars`、`MomentumScene`/`SatelliteAnimation` 的信息卡片）

规范未区分"响应式图表组件 `<foreignObject>`（禁止）"与"静态 HTML 信息卡（可接受）"，导致判断困难。建议在 §2.7 增加例外清单或明确界定标准。

---

## 四、修复优先级建议

### 仍需处理

仅剩规范层面的建议，无代码缺陷：

1. **📋 规范补充**：在 `07_CANVAS_SVG_CHART_RULES.md` §2.4 增加方式C viewBox 说明，§2.7 区分图表组件与信息卡 foreignObject

### 已完成修复清单（首次审计→二次审计）

| 缺陷 | 文件 | 修复方式 |
|------|------|---------|
| 双重缩放 | TIRAnimation | `useAnimationViewport` + `AnimationSvgCanvas` |
| 双重缩放 | RefractionAnimation | `useAnimationViewport` + `AnimationSvgCanvas` |
| designWidth 不一致 | MomentumTheoremAnimation | `useAnimationViewport` + `AnimationSvgCanvas` |
| foreignObject | GasLawsAnimation | RelationChart 移至 HTML flex 分区 |
| foreignObject | ClapeyronAnimation | RelationChart 移至 HTML flex 层 |
| foreignObject | SimpleHarmonicAnimation | EnergyBars 移至绝对定位 HTML overlay |
| foreignObject | EnergyConservationAnimation | RelationChart 移至绝对定位 HTML overlay |
| 硬编码颜色 | BinaryStarsAnimation | HEX → `PHYSICS_COLORS.*` + `withAlpha` |
| 旧 viewBox 800×500 | ReflectionAnimation | `useAnimationViewport` + 840×650 |
| 旧 viewBox 800×500 | ThinLensAnimation | `useAnimationViewport` + 840×650 + RelationChart 移出 |
| 非标准 viewBox | OhmLaw | `useAnimationViewport(splitV)` + 840×325 |
| 裸值 fontSize | CombinedFieldsAnimation | `font()` 函数调用 |
| 冗余 viewBox | LoopPassFieldScene | `useAnimationViewport` + `AnimationSvgCanvas` |
| 旧式拆分模式 | CircularMotionAnimation | `useAnimationViewport(square)` + `AnimationSvgCanvas` |
| 冗余 viewBox | BrownianMotion | 删除冗余 `viewBox` 属性 |
