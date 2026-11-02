# VIEWPORT 架构合规审计报告

> 审计时间：2026-07-10
> 标准依据：`docs/agent-rules/ui/07_CANVAS_SVG_CHART_RULES.md §2.2`
> 合规标准：使用 `useAnimationViewport` from `@/hooks`（标准复合 Hook）

---

## 汇总

| 分类 | 数量 | 说明 |
|------|------|------|
| **COMPLIANT** | 39 | 已使用 `useAnimationViewport` |
| **LEGACY（待迁移）** | 69 | 使用 `useCanvasSize` / `useViewport` from `@/utils` |
| **EXEMPT** | ~118 | 无需 viewport（图表、子组件、包装器等） |

---

## COMPLIANT（39 个）

| # | 文件 | 说明 |
|---|------|------|
| 1 | `electromagnetism/magnetism/BoundaryMagneticField/ChargeInBField.tsx` | 页面壳 + 图表布局 |
| 2 | `electromagnetism/magnetism/BoundaryMagneticField/SimulationView.tsx` | Canvas 场景渲染 |
| 3 | `electromagnetism/electrostatics/ChargeInEField.tsx` | 带电粒子在电场中运动 |
| 4 | `electromagnetism/dc-circuits/CircuitAnalysis.tsx` | 电路分析 |
| 5 | `electromagnetism/magnetism/combined-fields/CombinedFieldsAnimation.tsx` | 复合场组合场 |
| 6 | `electromagnetism/induction/loop-field/components/LoopPassFieldScene.tsx` | 穿过磁场场景 |
| 7 | `electromagnetism/induction/InductionPhenomenon.tsx` | 电磁感应现象（+useViewportPointer） |
| 8 | `electromagnetism/induction/InductionDualRods.tsx` | 双杆感应 |
| 9 | `electromagnetism/induction/SingleRodAnimation.tsx` | 单杆感应 |
| 10 | `electromagnetism/dc-circuits/OhmLaw.tsx` | 欧姆定律 |
| 11 | `electromagnetism/electrostatics/Capacitor.tsx` | 电容器 |
| 12 | `electromagnetism/induction/dual-rods/components/DualRodsScene.tsx` | 双杆场景 |
| 13 | `mechanics/momentum/BulletBlockAnimation.tsx` | 子弹打木块 |
| 14 | `mechanics/momentum/MomentumTheoremAnimation.tsx` | 动量定理 |
| 15 | `mechanics/gravitation/BinaryStarsAnimation.tsx` | 双星系统 |
| 16 | `mechanics/gravitation/OrbitTransferAnimation.tsx` | 轨道转移 |
| 17 | `mechanics/dynamics/BlockBoardAnimation.tsx` | 板块模型 |
| 18 | `mechanics/dynamics/InclinedPlaneAnimation.tsx` | 斜面模型 |
| 19 | `mechanics/dynamics/ConveyorAnimation.tsx` | 传送带 |
| 20 | `mechanics/dynamics/SpringForceCenterExtra.tsx` | 弹簧力侧栏 |
| 21 | `mechanics/dynamics/components/SpringForceHookeLawScene.tsx` | 胡克定律场景 |
| 22 | `mechanics/dynamics/components/SpringForceCutRopeScene.tsx` | 剪绳场景 |
| 23 | `mechanics/circular/CircularMotionAnimation.tsx` | 圆周运动 |
| 24 | `mechanics/circular/CircularModelsAnimation.tsx` | 圆周模型 |
| 25 | `optics/total-internal-reflection/TIRAnimation.tsx` | 全反射 |
| 26 | `optics/refraction/RefractionAnimation.tsx` | 折射 |
| 27 | `optics/reflection/ReflectionAnimation.tsx` | 反射 |
| 28 | `optics/thin-lens/ThinLensAnimation.tsx` | 薄透镜（+useViewportPointer） |
| 29 | `vibration/wave/WaveDiffractionAnimation.tsx` | 波的衍射 |
| 30 | `vibration/wave/MechanicalWaveAnimation.tsx` | 机械波（+useViewportPointer） |
| 31 | `vibration/wave/WaveInterferenceAnimation.tsx` | 波的干涉 |
| 32 | `vibration/simpleHarmonic/SimplePendulumAnimation.tsx` | 单摆 |
| 33 | `thermodynamics/gasLaws/ClapeyronAnimation.tsx` | 克拉伯龙方程 |
| 34 | `thermodynamics/gasLaws/GasLawsAnimation.tsx` | 气体定律 |
| 35 | `modern/bohr-theory/components/PhotoelectricSim.tsx` | 光电效应模拟 |
| 36 | `mechanics/kinematics/FreeFallDripAnimation.tsx` | 滴水法测 g（840×650, full） |
| 37 | `mechanics/kinematics/FreeFallAnimation.tsx` | 自由落体（840×650, full） |
| 38 | `electromagnetism/magnetism/AmpereForce.tsx` | 安培力（840×650, full） |
| 39 | `electromagnetism/magnetism/CircularGeometryModel/CircularGeometryModel.tsx` | 磁场圆周几何（420×650, splitH） |

---

## LEGACY — 待迁移（69 个）

### A. 主动画页面：`useCanvasSize` + `useViewport` 分开调用（55 个）

#### mechanics/kinematics/（10 个）

| # | 文件 | 导入 |
|---|------|------|
| 1 | `AccelerationAnimation.tsx` | `useCanvasSize, useViewport` |
| 2 | `KinematicsAdvancedAnimation.tsx` | `useCanvasSize, useViewport` |
| 3 | `ObliqueThrowAnimation.tsx` | `useCanvasSize, useViewport, physicsToCanvasWithOrigin` |
| 4 | `ProjectileAnimation.tsx` | `useCanvasSize, useViewport, physicsToCanvasWithOrigin, clientToContainerPoint` |
| 5 | `StroboscopicAnimation.tsx` | `useCanvasSize, useViewport` |
| 6 | `UniformAccelerationAnimation.tsx` | `useCanvasSize, useViewport` |
| 7 | `VelocityAnimation.tsx` | `useCanvasSize, useViewport` |
| 8 | `VelocityAnimationStrip.tsx` | `useCanvasSize, useViewport` |
| 9 | `VerticalThrowAnimation.tsx` | `useCanvasSize, useViewport` |
| 10 | `AccelerationCenterExtra.tsx` | `useCanvasSize`（布局尺寸） |

#### mechanics/dynamics/（12 个）

| # | 文件 | 导入 |
|---|------|------|
| 13 | `ConnectedBodiesAnimation.tsx` | `useCanvasSize, useViewport, PX_PER_METER` |
| 14 | `EquilibriumAnimation.tsx` | `useCanvasSize, useViewport` |
| 15 | `FrictionAnimation.tsx` | `useCanvasSize, useViewport` |
| 16 | `GravityAnimation.tsx` | `useCanvasSize, useViewport, clientToContainerPoint` |
| 17 | `GravityBasicAnimation.tsx` | `useCanvasSize, useViewport` |
| 18 | `NewtonSecondAnimation.tsx` | `useCanvasSize, useViewport, layoutLabels` |
| 19 | `VectorAdditionAnimation.tsx` | `useCanvasSize, useViewport` |
| 20 | `WeightlessnessAnimation.tsx` | `useCanvasSize, useViewport` |
| 21 | `WeightlessnessCenterExtra.tsx` | `useCanvasSize`（布局尺寸） |
| 22 | `NewtonSecondCenterExtra.tsx` | `useCanvasSize`（布局尺寸） |
| 23 | `FrictionCenterExtra.tsx` | `useCanvasSize`（图表尺寸） |
| 24 | `ConnectedBodiesCenterExtra.tsx` | `useCanvasSize` |

#### mechanics/energy/（7 个）

| # | 文件 | 导入 |
|---|------|------|
| 25 | `EnergyConservationAnimation.tsx` | `useCanvasSize, useViewport, clientToContainerPoint` |
| 26 | `KineticEnergyAnimation.tsx` | `useCanvasSize, useViewport` |
| 27 | `PowerAnimation.tsx` | `useCanvasSize, useViewport` |
| 28 | `PotentialEnergyAnimation.tsx` | `useCanvasSize, useViewport` |
| 29 | `SpringCompositeAnimation.tsx` | `useCanvasSize, clientToContainerPoint` |
| 30 | `WorkAnimation.tsx` | `useCanvasSize, useViewport` |
| 31 | `WorkEnergyBar.tsx` | `useCanvasSize` |

#### mechanics/momentum/（8 个）

| # | 文件 | 导入 |
|---|------|------|
| 32 | `CollisionAnimation.tsx` | `useCanvasSize, useViewport` |
| 33 | `CurvedSlotAnimation.tsx` | `useCanvasSize, useViewport, getPointsUpToTime` |
| 34 | `ImpulseAnimation.tsx` | `useCanvasSize, useViewport` |
| 35 | `ManBoatAnimation.tsx` | `useCanvasSize, useViewport, getPointsUpToTime` |
| 36 | `MomentumAnimation.tsx` | `useCanvasSize, useViewport` |
| 37 | `MomentumConservationAnimation.tsx` | `useCanvasSize, useViewport` |
| 38 | `SpringBlocksAnimation.tsx` | `useCanvasSize, useViewport, getPointsUpToTime` |
| 39 | `BulletBlockCharts.tsx` | `useCanvasSize` |

#### mechanics/gravitation/（2 个）

| # | 文件 | 导入 |
|---|------|------|
| 40 | `KeplerAnimation.tsx` | `useCanvasSize, useViewport` |
| 41 | `SatelliteAnimation.tsx` | `useCanvasSize, useViewport, clientToContainerPoint` |

#### mechanics/circular/（2 个，hidden via hook）

| # | 文件 | 说明 |
|---|------|------|
| 42 | `VerticalCircularAnimation.tsx` | 通过 `useVerticalCircularPhysics` hook 隐式使用 |
| 43 | `CentripetalAnimation.tsx` | 通过 `useCentripetalPhysics` hook 隐式使用 |

#### electromagnetism/（13 个）

| # | 文件 | 导入 |
|---|------|------|
| 44 | `electrostatics/CoulombLaw.tsx` | `useCanvasSize, useViewport` |
| 45 | `electrostatics/ElectricField.tsx` | `useCanvasSize, useViewport, clientToSvgPoint` |
| 46 | `electrostatics/ElectricPotential.tsx` | `useCanvasSize, clientToContainerPoint` |
| 47 | `electrostatics/FieldLines.tsx` | `useCanvasSize` |
| 48 | `dc-circuits/ClosedCircuit.tsx` | `useCanvasSize` |
| 49 | `dc-circuits/CircuitAnalysisCenterExtra.tsx` | `useCanvasSize` |
| 50 | `magnetism/VelocitySelector.tsx` | `useCanvasSize` |
| 51 | `induction/ACGeneration.tsx` | `useCanvasSize, useViewport` |
| 52 | `induction/ACValues.tsx` | `useCanvasSize` |
| 53 | `induction/CuttingEMF.tsx` | `useCanvasSize` |
| 54 | `induction/FaradayLaw.tsx` | `useCanvasSize` |
| 55 | `induction/LenzsLaw.tsx` | `useCanvasSize` |
| 56 | `induction/PowerTransmission.tsx` | `useCanvasSize` |
| 57 | `induction/Transformer.tsx` | `useCanvasSize, useViewport` |

#### thermodynamics/（5 个）

| # | 文件 | 导入 |
|---|------|------|
| 60 | `kinematics/BrownianMotion.tsx` | `useCanvasSize` |
| 61 | `kinematics/IntermolecularForcesAnimation.tsx` | `useCanvasSize, useViewport` |
| 62 | `firstLaw/FirstLawAnimation.tsx` | `useCanvasSize, useViewport` |
| 63 | `secondLaw/SecondLawAnimation.tsx` | `useCanvasSize, useViewport` |
| 64 | `gasLaws/ClapeyronCenterExtra.tsx` | `useCanvasSize` |

#### vibration/（1 个）

| # | 文件 | 导入 |
|---|------|------|
| 65 | `simpleHarmonic/SimpleHarmonicAnimation.tsx` | `useCanvasSize, useViewport` |

#### modern/（3 个）

| # | 文件 | 导入 |
|---|------|------|
| 66 | `bohr-theory/components/ScatterSim.tsx` | `useCanvasSize` |
| 67 | `bohr-theory/components/ExcitationSim.tsx` | `useCanvasSize` |
| 68 | `photoelectric/components/PhototubeCanvas.tsx` | `useCanvasSize` |

### B. 类型导入（6 个，接收父组件 props）

| # | 文件 | 导入 |
|---|------|------|
| 69 | `mechanics/momentum/components/MomentumBasicScene.tsx` | `type CanvasSize` + `type ViewportInfo` |
| 70 | `mechanics/momentum/components/MomentumAdvancedScene.tsx` | `type CanvasSize` |
| 71 | `mechanics/momentum/components/CollisionBasicScene.tsx` | `type CanvasSize` |
| 72 | `mechanics/momentum/components/CollisionAdvancedScene.tsx` | `type CanvasSize` |
| 73 | `electromagnetism/induction/components/CuttingEMFScene.tsx` | `type CanvasSize` |
| 74 | `electromagnetism/induction/transformer/components/TransformerScene.tsx` | `type ViewportInfo` |

### C. 自定义 hook 中隐式使用（2 个）

| # | 文件 | 说明 |
|---|------|------|
| 75 | `mechanics/circular/hooks/useVerticalCircularPhysics.ts` | `useCanvasSize, useViewport` |
| 76 | `mechanics/circular/hooks/useCentripetalPhysics.ts` | `useCanvasSize, useViewport` |

---

## EXEMPT（无需迁移）

### 图表组件（~32 个）

包括 `VtChartWithArea.tsx`、`VelocityXTChart.tsx`、`VelocityVTChart.tsx`、`VerticalThrowCharts.tsx`、`WorkEnergyBar.tsx`、`EnergyConservationBarChart.tsx`、`KineticEnergyCharts.tsx`、`WorkVTChart.tsx`、`WorkFSChart.tsx`、`PowerCharts.tsx`、`BlockBoardChart.tsx`、`ConveyorChart.tsx`、`CapacitorChart.tsx`、`SingleRodCharts.tsx`、`AmpereFIChart.tsx`、`ACValuesChartPanel.tsx`、`VoltageProfileChart.tsx`、`FaradayChartPanel.tsx`、`VelocitySelectorChart.tsx`、`MaxwellBoltzmannChart.tsx`、`IntermolecularForceChart.tsx`、`IUCurveChart.tsx` 等。

### 场景子组件（~24 个）

接收父组件传入的 canvasSize/sceneScale/vp props，自身无需调用 viewport hook。

### 包装器/编排器（~8 个）

如 `LightWeightMutationAnimation.tsx`、`SpringForceAnimation.tsx`、`BohrTheoryAnimation.tsx`、`PhotoelectricAnimation.tsx` 等，viewport 由子组件处理。

### CenterExtra/侧栏面板（~14 个）

纯图表/信息面板，无动画 viewport 需求。

### 纯 UI / defs / 辅助组件（~30 个）

SVG helpers、静态显示、手则卡片等。

### 非动画页面（~7 个）

知识树、练习、错题本、解析页等。

---

## 迁移模式

### 标准迁移（高优先级，57 个主动画页面）

```tsx
// 之前
import { useCanvasSize, useViewport } from '@/utils'
const [ref, canvas] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
const vp = useViewport(canvas, { designWidth: 700, designHeight: 650 })
const sceneScale = createSceneScaleFromViewport(vp, ...)

// 之后
import { useAnimationViewport } from '@/hooks'
const { containerRef, canvasSize, vp } = useAnimationViewport({
  preset: CANVAS_PRESETS.full,
  presetCompensation: 1.2,
})
const sceneScale = createSceneScaleFromViewport(vp, ...)
```

### 仅 useCanvasSize（中优先级，~10 个布局文件）

```tsx
// 之前
import { useCanvasSize } from '@/utils'
const [ref, size] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })

// 之后
import { useAnimationViewport } from '@/hooks'
const { containerRef, canvasSize } = useAnimationViewport({
  preset: CANVAS_PRESETS.full,
  presetCompensation: 1.2,
})
```

### 类型导入（低优先级，6 个）

父组件迁移后，子组件的 `type CanvasSize` / `type ViewportInfo` 导入可保留（类型兼容）。

---

## 注意事项

1. **`useViewportPointer`** — 3 个已合规页面额外使用 `useViewportPointer` from `@/utils` 做拖拽坐标映射，这是合规的额外工具调用，不需要迁移。
2. **`presetCompensation: 1.2`** — 旧 preset（wide/tall）迁移到 full 时的过渡系数，新页面不传。
3. **`worldHeight` 计算** — 使用 `worldWidth * (vp.visibleH / vp.visibleW)` 跟随画布宽高比，保证均匀缩放。
4. **`originY` 覆盖** — 某些场景（如带电粒子在磁场中）需要非中心的 origin，通过 spread 覆盖 `createSceneScaleFromViewport` 的默认值。

---

## 迁移风险评估

> 评估时间：2026-07-10
> 核心风险：`useAnimationViewport` 锁定 designWidth/designHeight 为 preset 值， legacy 文件使用自定义尺寸会导致 viewport 计算错误。

### CANVAS_PRESETS 参考

| Preset | width | height |
|--------|-------|--------|
| full | 840 | 650 |
| splitV | 840 | 325 |
| splitH | 420 | 650 |
| square | 650 | 650 |

### 风险分布

| 风险等级 | 数量 | 说明 |
|----------|------|------|
| **LOW** | 2 | 设计尺寸恰好匹配 preset，直接替换即可 |
| **MEDIUM** | 1 | 尺寸匹配但有 `vp.scale` 依赖（验证后安全） |
| **HIGH** | 38 | 设计尺寸不匹配任何 preset，迁移会破坏布局 |

### LOW 风险（2 个）— 可直接迁移

| # | 文件 | 设计尺寸 | Preset 匹配 | 说明 |
|---|------|----------|-------------|------|
| 1 | `useVerticalCircularPhysics.ts` | 650×650 | square ✓ | vp.centerX/CenterY 坐标映射，验证安全 |
| 2 | `useCentripetalPhysics.ts` | 650×650 | square ✓ | 同上，含 clientToContainerPoint 拖拽 |

### MEDIUM 风险（1 个）— 尺寸匹配但有 vp 依赖

| # | 文件 | 设计尺寸 | Preset 匹配 | 风险点 |
|---|------|----------|-------------|--------|
| 1 | `KeplerAnimation.tsx` | 840×650 | full ✓ | `vp.scale` 用于轨道半径计算，迁移后 scale 不变，验证安全 |

### HIGH 风险（38 个）— 需要重构

#### Group A: "700×N 遗留"（20 个）

旧设计标准 700px 宽，无对应 preset。迁移后 `vp.scale` 变化 ~1.2x，所有像素位置偏移。

| # | 文件 | 设计尺寸 | 额外依赖 | 风险说明 |
|---|------|----------|----------|----------|
| 1 | `VelocityAnimation.tsx` | 700×650 | — | 布局位置偏移 ~18% |
| 2 | `EnergyConservationAnimation.tsx` | 700×650 | `clientToContainerPoint`, `physicsToCanvasWithOrigin` | 拖拽交互坐标映射破坏 |
| 3 | `CoulombLaw.tsx` | 700×650 | — | 布局位置偏移 |
| 4 | `SimpleHarmonicAnimation.tsx` | 700×650 | — | 布局比例绑定 700×650 |
| 5 | `NewtonSecondAnimation.tsx` | 700×650 | `layoutLabels` | 力标签避让逻辑依赖设计空间 |
| 6 | `WorkAnimation.tsx` | 700×650 | — | 图表/场景比例调优 |
| 7 | `Transformer.tsx` | 380×{355\|320} | `vp.scale`（子组件） | 动态 designHeight，线圈几何依赖 vp.scale |
| 8 | `ACGeneration.tsx` | 700×650 | — | 3D 投影布局 |
| 9 | `IntermolecularForcesAnimation.tsx` | 700×400 | — | 无匹配 preset |
| 10 | `FirstLawAnimation.tsx` | 700×400 | — | 粒子模拟边界 |
| 11 | `VelocityAnimationStrip.tsx` | 700×400 | — | 条带布局 |
| 12 | `UniformAccelerationAnimation.tsx` | 700×400 | — | 图表+场景分割 |
| 13 | `AccelerationAnimation.tsx` | 700×400 | — | 双轨布局 |
| 14 | `SecondLawAnimation.tsx` | 700×400 | — | 粒子模拟边界 |
| 15 | `PotentialEnergyAnimation.tsx` | 700×400 | — | 双模式场景 |
| 16 | `PowerAnimation.tsx` | 700×400 | — | 图表+场景比例 |
| 17 | `KineticEnergyAnimation.tsx` | 700×400 | — | 图表+场景比例 |
| 18 | `VectorAdditionAnimation.tsx` | 700×450 | — | 矢量网格布局 |
| 19 | `ImpulseAnimation.tsx` | 700×450 | — | F-t 图表区域 |
| 20 | `MomentumAnimation.tsx` | 700×450 | — | 动量场景布局 |

#### Group B: 650×N 尺寸（4 个）

| # | 文件 | 设计尺寸 | 额外依赖 | 风险说明 |
|---|------|----------|----------|----------|
| 21 | `GravityAnimation.tsx` | 650×450 | `clientToContainerPoint`, `physicsToCanvas`, `computeScale` | 自定义坐标数学 + 拖拽交互 |
| 22 | `GravityBasicAnimation.tsx` | 650×450 | — | 盘/钩顶点坐标在 650×450 空间 |
| 23 | `ConnectedBodiesAnimation.tsx` | 650×400 | `PX_PER_METER` | 常量 + 自定义尺寸 |
| 24 | `SatelliteAnimation.tsx` | 700×650 | `clientToContainerPoint` | `vp.scale` 用于行星半径渲染 |

#### Group C: 非标准小尺寸（5 个）

| # | 文件 | 设计尺寸 | 额外依赖 | 风险说明 |
|---|------|----------|----------|----------|
| 25 | `VerticalThrowAnimation.tsx` | 100×100 | — | 归一化坐标系，迁移到任何 preset 都破坏 |
| 26 | `ProjectileAnimation.tsx` | 100×100 | `physicsToCanvasWithOrigin`, `clientToContainerPoint` | 同上 + 拖拽 |
| 27 | `ObliqueThrowAnimation.tsx` | 100×100 | `physicsToCanvasWithOrigin` | 同上 + 轨迹渲染 |
| 28 | `StroboscopicAnimation.tsx` | 400×180 | — | 条带子组件 |
| 29 | `KinematicsAdvancedAnimation.tsx` | 600×160 | — | 水平轨道布局 |

#### Group D: 复杂 vp 数学 + 非标准尺寸（9 个）

| # | 文件 | 设计尺寸 | 额外依赖 | 风险说明 |
|---|------|----------|----------|----------|
| 30 | `FrictionAnimation.tsx` | 700×400 | — | **vp.visibleW/visibleH/visibleX/visibleY** → 地面/箱子/斜面位置 |
| 31 | `EquilibriumAnimation.tsx` | 700×450 | — | **vp.visibleW/visibleH** → 传入物理计算 |
| 32 | `WeightlessnessAnimation.tsx` | 700×450 | — | 电梯井布局 |
| 33 | `CollisionAnimation.tsx` | 700×180 | — | 碰撞条带，COL_LAYOUT 位置计算 |
| 34 | `ManBoatAnimation.tsx` | 700×180 | `getPointsUpToTime` | 轨迹渲染依赖设计空间 |
| 35 | `CurvedSlotAnimation.tsx` | 700×260 | `getPointsUpToTime` | 槽物理渲染 |
| 36 | `SpringBlocksAnimation.tsx` | 700×180 | `getPointsUpToTime` | 弹簧-木块子场景 |
| 37 | `MomentumConservationAnimation.tsx` | 840×180 | — | 宽度匹配 full 但高度不匹配任何 preset |
| 38 | `WeightlessnessAnimation.tsx` | 700×450 | — | 电梯井布局 |

### 关键风险模式

**模式 1: 设计尺寸不匹配 preset**

`useAnimationViewport` 强制 `designWidth = preset.width`, `designHeight = preset.height`。Legacy 文件传入的自定义尺寸会被忽略，导致 `vp.scale`, `vp.tx`, `vp.ty` 全部变化。

**模式 2: vp 值直接参与布局计算**

以下文件直接使用 `vp.visibleW/visibleH/scale/centerX/centerY` 做像素级布局，迁移后这些值会变化：

| 文件 | 依赖的 vp 属性 | 用途 |
|------|---------------|------|
| `FrictionAnimation` | `visibleW, visibleH, visibleX, visibleY` | 地面/箱子/斜面位置 |
| `EquilibriumAnimation` | `visibleW, visibleH` | 传入物理计算 |
| `KeplerAnimation` | `scale` | 轨道半径 |
| `SatelliteAnimation` | `scale` | 行星半径 |
| `Transformer` | `scale` | 线圈几何 |
| `useVerticalCircularPhysics` | `centerX, centerY` | 坐标原点 |
| `useCentripetalPhysics` | `centerX, centerY` | 坐标原点 |

**模式 3: 100×100 归一化坐标系**

`VerticalThrowAnimation`、`ProjectileAnimation`、`ObliqueThrowAnimation` 使用 100×100 作为无量纲坐标空间，通过 `physicsToCanvasWithOrigin` 做最终像素映射。迁移到任何 preset 都会完全破坏坐标映射。

**模式 4: 额外坐标工具依赖**

| 工具 | 影响文件数 | 风险 |
|------|-----------|------|
| `physicsToCanvasWithOrigin` | 6 | 坐标转换依赖 vp 参数 |
| `clientToContainerPoint` | 6 | 拖拽交互坐标映射 |
| `getPointsUpToTime` | 3 | 轨迹点计算依赖设计空间 |
| `clientToSvgPoint` | 1 | SVG 坐标映射 |
| `PX_PER_METER` | 1 | 像素/米常量 + 自定义尺寸 |
| `layoutLabels` | 1 | 标签避让依赖设计空间 |

### 迁移方案建议

| 方案 | 适用范围 | 优点 | 缺点 |
|------|----------|------|------|
| **A. 直接替换** | LOW 风险 2 个 | 零布局改动 | 仅适用于尺寸恰好匹配 preset 的文件 |
| **B. 逐文件重构** | HIGH 风险 38 个 | 最正确，完全合规 | 工作量大，每个文件需重算布局 |
| **C. 新增 legacy preset** | HIGH 风险 38 个 | 最简单，零布局改动 | 增加 preset 数量，违背标准化初衷 |
| **D. 扩展 useAnimationViewport** | HIGH 风险 38 个 | 兼顾兼容性 | 绕过设计尺寸锁定的意义 |

### 推荐迁移顺序

1. **第一批**：LOW 风险 2 个（`useVerticalCircularPhysics.ts`, `useCentripetalPhysics.ts`，square 650×650）
2. **第二批**：MEDIUM 风险 1 个（KeplerAnimation，验证 vp.scale 依赖）
3. **第三批**：按模块选代表文件逐模块迁移，每模块先 1 个验证再批量
4. **最后**：类型导入 6 个（父组件迁移后自动兼容）

> **已迁移**（2026-07-10）：FreeFallDripAnimation, FreeFallAnimation, AmpereForce, CircularGeometryModel（共 4 个，LOW 风险）
