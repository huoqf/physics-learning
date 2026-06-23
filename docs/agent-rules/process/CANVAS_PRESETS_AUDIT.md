# CANVAS_PRESETS 迁移盘点

> 核查日期：2026-06-23
> 总调用点：72（含 2 JSDoc 示例 + 7 已迁移 + 63 硬编码）

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
| extraWide | 800×440 | 变压器、法拉第等 |

---

## A. 已迁移至现有 preset（29 调用点）

### tall: 700×450（6）

| 文件 | 行 |
|---|---|
| mechanics/momentum/ImpulseAnimation.tsx | 171 |
| mechanics/momentum/MomentumAnimation.tsx | 79 |
| electromagnetism/electrostatics/CoulombLaw.tsx | 36 |
| mechanics/momentum/MomentumConservationAnimation.tsx | 58 |
| mechanics/momentum/CollisionAnimation.tsx | 48 |
| mechanics/momentum/MomentumTheoremAnimation.tsx | 74 |

### mediumTall: 650×450（6）

| 文件 | 行 |
|---|---|
| mechanics/dynamics/GravityAnimation.tsx | 23 |
| mechanics/dynamics/GravityBasicAnimation.tsx | 41 |
| mechanics/dynamics/EquilibriumAnimation.tsx | 26 |
| mechanics/gravitation/KeplerAnimation.tsx | 28 |
| mechanics/gravitation/SatelliteAnimation.tsx | 124 |
| mechanics/dynamics/VectorAdditionAnimation.tsx | 30 |

### standard: 700×420（7）

| 文件 | 行 |
|---|---|
| mechanics/energy/EnergyConservationAnimation.tsx | 38 |
| mechanics/energy/PotentialEnergyAnimation.tsx | 46 |
| mechanics/energy/PowerAnimation.tsx | 34 |
| mechanics/energy/KineticEnergyAnimation.tsx | 31 |
| electromagnetism/magnetism/VelocitySelector.tsx | 25 |
| electromagnetism/dc-circuits/ClosedCircuit.tsx | 15 |
| thermodynamics/kinematics/IntermolecularForcesAnimation.tsx | 35 |

### wide: 700×400（6）

| 文件 | 行 |
|---|---|
| mechanics/kinematics/UniformAccelerationAnimation.tsx | 39 |
| electromagnetism/induction/LenzsLaw.tsx | 19 |
| electromagnetism/induction/InductionPhenomenon.tsx | 31 |
| electromagnetism/magnetism/ChargeInBField.tsx | 29 |
| mechanics/dynamics/NewtonSecondAnimation.tsx | 24 |
| thermodynamics/kinematics/BrownianMotion.tsx | 61 |

### square: 600×600（3）

| 文件 | 行 |
|---|---|
| mechanics/circular/CentripetalAnimation.tsx | 74 |
| mechanics/circular/CircularMotionAnimation.tsx | 72 |
| electromagnetism/magnetism/BoundaryMagneticField/SimulationView.tsx | 12 |

### extraWide: 800×440（1）

| 文件 | 行 |
|---|---|
| electromagnetism/induction/FaradayLaw.tsx | 24 |

---

## B. 新增 mediumWide 后迁移（4 调用点）

| 文件 | 行 | 尺寸 |
|---|---|---|
| electromagnetism/dc-circuits/OhmLaw.tsx | 11 | 650×400 |
| mechanics/dynamics/SpringForceAnimation.tsx | 21 | 650×400 |
| mechanics/dynamics/WeightlessnessCenterExtra.tsx | 11 | 650×400 |
| mechanics/dynamics/NewtonSecondCenterExtra.tsx | 11 | 650×400 |

---

## C. 不替换（35 调用点）

### 已迁移（7，CANVAS_PRESETS.xxx 语法）

| 文件 | preset |
|---|---|
| electromagnetism/induction/ACValues.tsx | wide |
| thermodynamics/gasLaws/GasLawsAnimation.tsx | wide |
| thermodynamics/gasLaws/ClapeyronAnimation.tsx | wide |
| electromagnetism/induction/PowerTransmission.tsx | extraWide |
| thermodynamics/secondLaw/SecondLawAnimation.tsx | wide |
| thermodynamics/firstLaw/FirstLawAnimation.tsx | wide |
| thermodynamics/gasLaws/ClapeyronCenterExtra.tsx | wide |

### 物理坐标系占位符 100×100（5）

| 文件 | 行 |
|---|---|
| mechanics/kinematics/ProjectileAnimation.tsx | 55 |
| mechanics/kinematics/ObliqueThrowAnimation.tsx | 57 |
| mechanics/kinematics/FreeFallDripAnimation.tsx | 67 |
| mechanics/kinematics/VerticalThrowAnimation.tsx | 37 |
| mechanics/kinematics/FreeFallAnimation.tsx | 66 |

### 动态传入（5）

| 文件 | 行 | 说明 |
|---|---|---|
| optics/thin-lens/ThinLensAnimation.tsx | 158 | VIEW_WIDTH×VIEW_HEIGHT |
| optics/total-internal-reflection/TIRAnimation.tsx | 37 | VIEW_WIDTH×VIEW_HEIGHT |
| optics/refraction/RefractionAnimation.tsx | 41 | VIEW_WIDTH×VIEW_HEIGHT |
| optics/reflection/ReflectionAnimation.tsx | 30 | VIEW_WIDTH×VIEW_HEIGHT |
| components/Chart/BasePhysicsChart.tsx | 45 | initW×initH（props） |

### 唯一尺寸（18）

| 文件 | 行 | 尺寸 |
|---|---|---|
| mechanics/force-motion/ForceMotionSandbox.tsx | 76 | 640×320 |
| mechanics/force-motion/ForceMotionTripleChart.tsx | 274 | 900×200 |
| mechanics/energy/WorkAnimation.tsx | 56 | 700×650 |
| electromagnetism/electrostatics/ChargeInEField.tsx | 27 | 700×460 |
| mechanics/dynamics/WeightlessnessAnimation.tsx | 48 | 230×440 |
| electromagnetism/magnetism/BoundaryMagneticField/ChargeInBField.tsx | 11 | 800×600 |
| electromagnetism/magnetism/BoundaryMagneticField/ChargeInBField.tsx | 68 | 200×180 |
| electromagnetism/induction/Transformer.tsx | 126 | 760×440 |
| electromagnetism/induction/ACGeneration.tsx | 33 | 820×480 |
| electromagnetism/electrostatics/ElectricPotential.tsx | 22 | 700×500 |
| electromagnetism/electrostatics/FieldLines.tsx | 117 | 700×480 |
| electromagnetism/electrostatics/ElectricField.tsx | 31 | 700×480 |
| electromagnetism/dc-circuits/CircuitAnalysis.tsx | 58 | 650×360 |
| mechanics/kinematics/VelocityAnimation.tsx | 28 | 700×350 |
| mechanics/kinematics/AccelerationAnimation.tsx | 41 | 700×350 |
| electromagnetism/electrostatics/Capacitor.tsx | 31 | 700×300 |
| mechanics/kinematics/VelocityAnimationStrip.tsx | 34 | 700×200 |
| thermodynamics/kinematics/IntermolecularForcesCenterExtra.tsx | 12 | 600×300 |
| mechanics/dynamics/SpringForceCenterExtra.tsx | 11 | 420×315 |

### 待确认（2）

| 文件 | 行 | 尺寸 | 说明 |
|---|---|---|---|
| mechanics/dynamics/FrictionAnimation.tsx | 26 | 650×420 | 差 standard 50px 宽 |
| electromagnetism/induction/CuttingEMF.tsx | 203 | 700×440 | 差 extraWide 100px 宽 |

### compact 相关（5，暂不处理）

| 文件 | 行 | 尺寸 |
|---|---|---|
| mechanics/kinematics/UniformAccelerationCenterExtra.tsx | 145 | 400×180 |
| mechanics/kinematics/UniformAccelerationCenterExtra.tsx | 541 | 400×80 |
| mechanics/kinematics/UniformAccelerationCenterExtra.tsx | 581 | 400×300 |
| mechanics/dynamics/FrictionCenterExtra.tsx | 10 | 400×200 |
| electromagnetism/dc-circuits/CircuitAnalysisCenterExtra.tsx | 10 | 400×200 |

---

## 汇总

| 分类 | 调用点 | 操作 |
|---|---:|---|
| A. 精确映射现有 preset | 29 | ✅ 已替换 |
| B. 新增 mediumWide | 4 | ✅ 已替换 |
| C. 不替换 | 35 | 保持现状 |
| **合计** | **68** | — |

- 硬编码从 68 降至 35（减少 49%）
- CANVAS_PRESETS 从 6 个增至 7 个（新增 mediumWide）
- tsc 零错误通过
