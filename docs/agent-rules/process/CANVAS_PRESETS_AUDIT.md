# CANVAS_PRESETS 迁移盘点

> 核查日期：2026-06-23
> 总调用点：76（64 已迁移 + 12 硬编码）

---

## 现有 preset

| preset | 尺寸 | 说明 |
|---|---|---|
| tall | 700×450 | 动量、库仑等 |
| standard | 700×420 | 能量、速度选择器等 |
| mediumTall | 650×450 | 万有引力、开普勒等 |
| wide | 700×400 | 匀加速、感应等 |
| mediumWide | 650×400 | 欧姆定律、弹簧力等（本次新增） |
| square | 600×600 | 圆周运动、向心力等 |
| extraWide | 800×440 | 变压器、法拉第、光学等 |

---

## A. 已迁移至现有 preset（64 调用点）

### tall: 700×450（13）

| 文件 | 行 |
|---|---|
| mechanics/momentum/ImpulseAnimation.tsx | 171 |
| mechanics/momentum/MomentumAnimation.tsx | 79 |
| electromagnetism/electrostatics/CoulombLaw.tsx | 36 |
| mechanics/momentum/MomentumConservationAnimation.tsx | 58 |
| mechanics/momentum/CollisionAnimation.tsx | 48 |
| mechanics/momentum/MomentumTheoremAnimation.tsx | 74 |
| electromagnetism/electrostatics/Capacitor.tsx | 31 |
| electromagnetism/electrostatics/ChargeInEField.tsx | 27 |
| electromagnetism/electrostatics/ElectricField.tsx | 35 |
| electromagnetism/electrostatics/ElectricPotential.tsx | 23 |
| electromagnetism/electrostatics/FieldLines.tsx | 120 |
| electromagnetism/induction/CuttingEMF.tsx | 203 |
| mechanics/dynamics/WeightlessnessAnimation.tsx | 48 |

### mediumTall: 650×450（6）

| 文件 | 行 |
|---|---|
| mechanics/dynamics/GravityAnimation.tsx | 23 |
| mechanics/dynamics/GravityBasicAnimation.tsx | 41 |
| mechanics/dynamics/EquilibriumAnimation.tsx | 26 |
| mechanics/gravitation/KeplerAnimation.tsx | 28 |
| mechanics/gravitation/SatelliteAnimation.tsx | 124 |
| mechanics/dynamics/VectorAdditionAnimation.tsx | 30 |

### standard: 700×420（9）

| 文件 | 行 |
|---|---|
| mechanics/energy/EnergyConservationAnimation.tsx | 38 |
| mechanics/energy/PotentialEnergyAnimation.tsx | 46 |
| mechanics/energy/PowerAnimation.tsx | 34 |
| mechanics/energy/KineticEnergyAnimation.tsx | 31 |
| mechanics/dynamics/FrictionAnimation.tsx | 26 |
| electromagnetism/magnetism/VelocitySelector.tsx | 25 |
| electromagnetism/magnetism/BoundaryMagneticField/ChargeInBField.tsx | 11 |
| electromagnetism/dc-circuits/ClosedCircuit.tsx | 15 |
| thermodynamics/kinematics/IntermolecularForcesAnimation.tsx | 35 |

### wide: 700×400（18）

| 文件 | 行 |
|---|---|
| mechanics/kinematics/VelocityAnimation.tsx | 29 |
| mechanics/kinematics/AccelerationAnimation.tsx | 42 |
| mechanics/kinematics/UniformAccelerationAnimation.tsx | 40 |
| mechanics/dynamics/NewtonSecondAnimation.tsx | 24 |
| mechanics/force-motion/ForceMotionSandbox.tsx | 76 |
| mechanics/energy/WorkAnimation.tsx | 56 |
| electromagnetism/magnetism/ChargeInBField.tsx | 29 |
| electromagnetism/induction/InductionPhenomenon.tsx | 31 |
| electromagnetism/induction/LenzsLaw.tsx | 19 |
| electromagnetism/induction/Transformer.tsx | 126 |
| electromagnetism/induction/ACValues.tsx | 320 |
| thermodynamics/kinematics/BrownianMotion.tsx | 61 |
| thermodynamics/kinematics/IntermolecularForcesCenterExtra.tsx | 12 |
| thermodynamics/gasLaws/GasLawsAnimation.tsx | 66 |
| thermodynamics/gasLaws/ClapeyronAnimation.tsx | 62 |
| thermodynamics/gasLaws/ClapeyronCenterExtra.tsx | 25 |
| thermodynamics/secondLaw/SecondLawAnimation.tsx | 52 |
| thermodynamics/firstLaw/FirstLawAnimation.tsx | 78 |

### mediumWide: 650×400（7）

| 文件 | 行 |
|---|---|
| electromagnetism/dc-circuits/OhmLaw.tsx | 11 |
| electromagnetism/dc-circuits/CircuitAnalysis.tsx | 58 |
| mechanics/dynamics/SpringForceAnimation.tsx | 21 |
| mechanics/dynamics/SpringForceCenterExtra.tsx | 11 |
| mechanics/dynamics/WeightlessnessCenterExtra.tsx | 11 |
| mechanics/dynamics/NewtonSecondCenterExtra.tsx | 11 |
| mechanics/dynamics/ConnectedBodiesAnimation.tsx | 53 |

### square: 600×600（3）

| 文件 | 行 |
|---|---|
| mechanics/circular/CentripetalAnimation.tsx | 74 |
| mechanics/circular/CircularMotionAnimation.tsx | 72 |
| electromagnetism/magnetism/BoundaryMagneticField/SimulationView.tsx | 12 |

### extraWide: 800×440（8）

| 文件 | 行 |
|---|---|
| electromagnetism/induction/FaradayLaw.tsx | 24 |
| electromagnetism/induction/PowerTransmission.tsx | 53 |
| electromagnetism/induction/ACGeneration.tsx | 33 |
| mechanics/kinematics/VelocityAnimationStrip.tsx | 34 |
| optics/thin-lens/ThinLensAnimation.tsx | 158 |
| optics/total-internal-reflection/TIRAnimation.tsx | 37 |
| optics/refraction/RefractionAnimation.tsx | 41 |
| optics/reflection/ReflectionAnimation.tsx | 30 |

---

## B. 硬编码（12 调用点）

### 物理坐标系占位符 100×100（5）

物理坐标系基准值，组件内动态缩放，无需 preset 化。

| 文件 | 行 | 说明 |
|---|---|---|
| mechanics/kinematics/ProjectileAnimation.tsx | 55 | 抛体运动 |
| mechanics/kinematics/ObliqueThrowAnimation.tsx | 57 | 斜抛运动 |
| mechanics/kinematics/FreeFallDripAnimation.tsx | 67 | 自由落体水滴 |
| mechanics/kinematics/VerticalThrowAnimation.tsx | 37 | 竖直上抛 |
| mechanics/kinematics/FreeFallAnimation.tsx | 66 | 自由落体 |

### compact 子场景（5）

CenterExtra 紧凑画中画，尺寸刻意小，不适用标准 preset。

| 文件 | 行 | 尺寸 |
|---|---|---|
| mechanics/kinematics/UniformAccelerationCenterExtra.tsx | 145 | 400×180 |
| mechanics/kinematics/UniformAccelerationCenterExtra.tsx | 541 | 400×80 |
| mechanics/kinematics/UniformAccelerationCenterExtra.tsx | 581 | 400×300 |
| mechanics/dynamics/FrictionCenterExtra.tsx | 10 | 400×200 |
| electromagnetism/dc-circuits/CircuitAnalysisCenterExtra.tsx | 10 | 400×200 |

### 唯一尺寸（2）

各有特殊布局需求，不适合强行统一。

| 文件 | 行 | 尺寸 | 原因 |
|---|---|---|---|
| mechanics/force-motion/ForceMotionTripleChart.tsx | 274 | 900×200 | 三图横排 |
| BoundaryMagneticField/ChargeInBField.tsx | 68 | 200×180 | 小缩略图 |

### 动态传入（1）

| 文件 | 行 | 说明 |
|---|---|---|
| components/Chart/BasePhysicsChart.tsx | 45 | initW×initH（props 传入） |

---

## 汇总

| 分类 | 调用点 | 操作 |
|---|---:|---|
| A. 已迁移至 preset | 64 | ✅ 已替换 |
| B. 硬编码 | 12 | 保持现状 |
| **合计** | **76** | — |

- 已迁移从 7 增至 64（新增 57）
- 硬编码从 70 降至 12（减少 83%）
- CANVAS_PRESETS 从 6 个增至 7 个（新增 mediumWide）
- tsc 零错误通过
- tsc 零错误通过
