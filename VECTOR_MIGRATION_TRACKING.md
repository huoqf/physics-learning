# 矢量渲染迁移跟踪

> 全部迁移完成后删除此文件。按 `project_rules.md` §4 铁律 #12：所有物理矢量箭头必须使用 VectorArrow + SceneConfig.refMagnitudes。

## 第1章 运动学 (kinematics) ✅ 已完成

| 文件 | 标记数 | 状态 |
|------|--------|------|
| VelocityAnimation.tsx | 2 | ✅ 已迁移 |
| VelocityAnimationStrip.tsx | 3 | ✅ 已迁移 |
| VelocityCenterExtra.tsx | 0 | ✅ 无需迁移（纯布局） |
| AccelerationAnimation.tsx | 3 | ✅ 已迁移 |
| AccelerationCenterExtra.tsx | 1 | ✅ 已迁移 |
| UniformAccelerationAnimation.tsx | 3 | ✅ 已迁移 |
| UniformAccelerationCenterExtra.tsx | 2 | ✅ 已迁移 |
| VerticalThrowAnimation.tsx | 2 | ✅ 已迁移 |
| ProjectileAnimation.tsx | 3 | ✅ 已迁移 |
| ObliqueThrowAnimation.tsx | 3 | ✅ 已迁移 |
| FreeFallDripAnimation.tsx | 1 | ✅ 已迁移 |
| FreeFallAnimation.tsx | 3 | ✅ 已迁移 |
| VelocityXTChart.tsx | 1 | ✅ 已迁移 |

## 第2章 动力学/牛顿定律 (dynamics) ❌ 待迁移

| 文件 | 标记数 | 状态 |
|------|--------|------|
| VectorAdditionAnimation.tsx | 4 | ✅ 已迁移 |
| FrictionAnimation.tsx | 4 | ✅ 已迁移 |
| FrictionCenterExtra.tsx | 1 | ✅ 已迁移 |
| GravityAnimation.tsx | 2 | ✅ 已迁移 |
| GravityBasicAnimation.tsx | 3 | ✅ 已迁移 |
| EquilibriumAnimation.tsx | 6 | ✅ 已迁移 |
| ConnectedBodiesAnimation.tsx | 4 | ✅ 已迁移 |
| SpringForceAnimation.tsx | 3 | ✅ 已迁移 |
| SpringForceCenterExtra.tsx | 1 | ✅ 已迁移 |

## 第3章 圆周运动 (circular) ❌ 待迁移

| 文件 | 标记数 | 状态 |
|------|--------|------|
| CircularMotionAnimation.tsx | 2 | ✅ 已迁移 |
| CentripetalAnimation.tsx | 3 | ❌ 待迁移 |

## 第4章 动量 (momentum) ❌ 待迁移

| 文件 | 标记数 | 状态 |
|------|--------|------|
| MomentumAnimation.tsx | 6 | ❌ 待迁移 |
| MomentumTheoremAnimation.tsx | 3 | ❌ 待迁移 |
| MomentumConservationAnimation.tsx | 2 | ❌ 待迁移 |
| ImpulseAnimation.tsx | 2 | ❌ 待迁移 |
| CollisionAnimation.tsx | 1 | ❌ 待迁移 |

## 第5章 能量 (energy) ❌ 待迁移

| 文件 | 标记数 | 状态 |
|------|--------|------|
| WorkAnimation.tsx | 6 | ❌ 待迁移 |
| PowerAnimation.tsx | 3 | ❌ 待迁移 |
| KineticEnergyAnimation.tsx | 4 | ❌ 待迁移 |
| PotentialEnergyAnimation.tsx | 2 | ❌ 待迁移 |
| EnergyConservationAnimation.tsx | 1 | ❌ 待迁移 |

## 第6章 万有引力 (gravitation) ❌ 待迁移

| 文件 | 标记数 | 状态 |
|------|--------|------|
| SatelliteAnimation.tsx | 2 | ❌ 待迁移 |
| KeplerAnimation.tsx | 2 | ❌ 待迁移 |

## 第7章 力与运动 (force-motion) ❌ 待迁移

| 文件 | 标记数 | 状态 |
|------|--------|------|
| ForceMotionSandbox.tsx | 3 | ❌ 待迁移 |

## 汇总

| 章节 | 待迁移文件数 | 总标记数 | 状态 |
|------|-------------|---------|------|
| 第1章 运动学 | 0 | 0 | ✅ 已完成 |
| 第2章 动力学 | 0 | 0 | ✅ 已完成 |
| 第3章 圆周运动 | 2 | 5 | 未开始 |
| 第4章 动量 | 5 | 14 | 未开始 |
| 第5章 能量 | 5 | 16 | 未开始 |
| 第6章 万有引力 | 2 | 4 | 未开始 |
| 第7章 力与运动 | 1 | 3 | 未开始 |
| **合计** | **31** | **88** | — |
