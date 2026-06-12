# 矢量箭头迁移追踪

> 最后更新：2026-06-12
> 全部完成后删除本文件

---

## 规则

- 所有物理矢量箭头必须使用 `VectorArrow` + `SceneConfig.refMagnitudes` 归一化
- 禁止各 lesson 自行定义 `<marker>` 或硬编码箭头长度
- 曲线箭头（`<path>` + `markerEnd`）可保留，但 marker 引用须通过 `VectorDefs` 生成

---

## 已迁移（6 个文件）

| 文件 | 章节 | 迁移日期 |
|------|------|---------|
| `VelocityAnimation.tsx` | 1-运动学 | 2026-06-12 |
| `VelocityAnimationStrip.tsx` | 1-运动学 | 2026-06-12 |
| `AccelerationAnimation.tsx` | 1-运动学 | 2026-06-12 |
| `AccelerationCenterExtra.tsx` | 1-运动学 | 2026-06-12 |
| `UniformAccelerationAnimation.tsx` | 1-运动学 | 2026-06-12 |
| `CoulombLaw.tsx` | 7-电磁学 | 2026-06-12 |

---

## 待迁移（按章节分组）

### 第 1 章 运动学（kinematics）— 剩余 6 个

| 文件 | 复杂度 | 备注 |
|------|--------|------|
| `UniformAccelerationCenterExtra.tsx` | 中 | 2 marker（v, a） |
| `VerticalThrowAnimation.tsx` | 中 | 2 marker（velocity, accel） |
| `ProjectileAnimation.tsx` | 中 | 3 marker（vx, vy, v） |
| `ObliqueThrowAnimation.tsx` | 中 | 3 marker（vx, vy, v） |
| `FreeFallDripAnimation.tsx` | 低 | 1 marker（v） |
| `FreeFallAnimation.tsx` | 中 | 3 marker（g, air, air-b） |

### 第 2 章 动力学（dynamics）— 10 个

| 文件 | 复杂度 | 备注 |
|------|--------|------|
| `NewtonSecondAnimation.tsx` | 高 | 多 marker（applied/friction/gravity/normal/netforce/velocity/acceleration） |
| `FrictionAnimation.tsx` | 中 | 待确认 marker 数量 |
| `WeightlessnessAnimation.tsx` | 中 | 4 marker（gravity/normal/acceleration/velocity） |
| `ConnectedBodiesAnimation.tsx` | 中 | 待确认 |
| `GravityBasicAnimation.tsx` | 中 | 3 marker（gravity/centripetal/grav-force） |
| `GravityAnimation.tsx` | 中 | 2 marker（gravity-right/left） |
| `VectorAdditionAnimation.tsx` | 高 | 4 marker（main/f1/f2/fcomp） |
| `EquilibriumAnimation.tsx` | 高 | 6 marker（g/t1/t2/overload/fnet/comp） |
| `SpringForceAnimation.tsx` | 低 | 1 marker（spring-force） |
| `SpringForceCenterExtra.tsx` | 低 | 待确认 |

### 第 3 章 圆周运动（circular）— 2 个

| 文件 | 复杂度 | 备注 |
|------|--------|------|
| `CircularMotionAnimation.tsx` | 中 | 2 marker（circular/ac） |
| `CentripetalAnimation.tsx` | 中 | 3 marker（v/a/f） |

### 第 4 章 万有引力（gravitation）— 2 个

| 文件 | 复杂度 | 备注 |
|------|--------|------|
| `SatelliteAnimation.tsx` | 中 | 2 marker（f/v） |
| `KeplerAnimation.tsx` | 中 | 2 marker（v/f） |

### 第 5 章 动量（momentum）— 5 个

| 文件 | 复杂度 | 备注 |
|------|--------|------|
| `MomentumAnimation.tsx` | 高 | 6 marker（v/va/vb/pa/pb/pt） |
| `MomentumTheoremAnimation.tsx` | 中 | 3 marker（v/f/p） |
| `MomentumConservationAnimation.tsx` | 中 | 2 marker（v/p） |
| `ImpulseAnimation.tsx` | 中 | 2 marker（v/f） |
| `CollisionAnimation.tsx` | 低 | 1 marker（v） |

### 第 6 章 功与能量（energy）— 3 个

| 文件 | 复杂度 | 备注 |
|------|--------|------|
| `WorkAnimation.tsx` | 高 | 6 marker（force/proj-pos/proj-neg/fn/friction/mg） |
| `PowerAnimation.tsx` | 中 | 3 marker（appliedForce/friction/velocity） |
| `PotentialEnergyAnimation.tsx` | 待确认 | |
| `KineticEnergyAnimation.tsx` | 待确认 | |
| `EnergyConservationAnimation.tsx` | 待确认 | |

### 第 7 章 力与运动（force-motion）— 1 个

| 文件 | 复杂度 | 备注 |
|------|--------|------|
| `ForceMotionSandbox.tsx` | 中 | 3 marker（force/velocity/accel） |

---

## 进度统计

- **已迁移**：6 / ~29 个文件（21%）
- **待迁移**：~23 个文件
- **预计工作量**：简单（1-2 marker）约 15min/文件，中等（3-4 marker）约 30min/文件，复杂（5+ marker）约 45min/文件
