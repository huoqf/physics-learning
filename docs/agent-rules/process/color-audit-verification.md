# 颜色审计报告核对结果

> 核对日期：2026-06-25
> 核对范围：逐行读取源码验证 color-audit-report.md 中全部23项发现

## 3.1.1 forceNet 语义错用（9项全部属实）

| # | 文件 | 行号 | 代码实况 | 判定 |
|---|------|------|---------|------|
| 1 | `src/components/Physics/Block.tsx` | 301-303 | 十字标记和圆点均用 `PHYSICS_COLORS.forceNet` 绘制 | 属实 |
| 2 | `src/data/quantities/electromagnetism.ts` | 856 | `color: PHYSICS_COLORS.forceNet` 用于安培力F条目 | 属实 |
| 3 | `src/data/quantities/electromagnetism.ts` | 891 | `color: PHYSICS_COLORS.forceNet` 用于F_安进阶条目 | 属实 |
| 4 | `src/data/quantities/electromagnetism.ts` | 1199 | `color: PHYSICS_COLORS.forceNet` 用于瞬时安培力 | 属实 |
| 5 | `src/features/electromagnetism/magnetism/components/InclinedAmpereScene.tsx` | 224-225 | 平衡徽标的fill+stroke+文字色均为forceNet | 属实 |
| 6 | `src/features/mechanics/energy/WorkEnergyBar.tsx` | 39 | `{ label: 'Ek', color: PHYSICS_COLORS.forceNet }` | 属实 |
| 7 | `src/features/mechanics/energy/WorkAnimation.tsx` | 430-434 | 警告框背景stroke文字三处均用forceNet | 属实 |
| 8 | `src/components/Physics/HandRule.tsx` | 63 | `thumb: PHYSICS_COLORS.forceNet` 拇指=力F | 属实 |
| 9 | `src/components/Physics/SkeletalHand.tsx` | 407 | `thumb: PHYSICS_COLORS.forceNet` 骨骼手拇指 | 属实 |

## 3.1.2 EMF颜色错配（3项中2项完全属实）

| # | 文件 | 行号 | 代码实况 | 判定 |
|---|------|------|---------|------|
| 1 | `src/data/quantities/electromagnetism.ts` | 1197 | `color: PHYSICS_COLORS.magneticField`（绿色）用于感应电动势，应为emf琥珀色 | 属实 |
| 2 | `src/data/quantities/electromagnetism.ts` | 1075 | 感应电动势条目缺少color属性 | 属实 |
| 3 | `src/data/quantities/electromagnetism.ts` | 1254 | formula条目本身不含color字段，属规范建议层面 | 部分属实 |

## 3.2 UI颜色侵入物理图层（9项全部属实）

| # | 文件 | 行号 | 代码实况 | 判定 |
|---|------|------|---------|------|
| 1 | `src/components/Physics/ParticleEmitter.tsx` | 129 | `active ? colors.success[500] : colors.danger[500]` 指示灯 | 属实 |
| 2 | `src/features/electromagnetism/magnetism/components/ForcePolygon.tsx` | 154,193 | 行154状态文`colors.success[600]/danger[600]`；行193原点圆`colors.success[600]` | 属实 |
| 3 | `src/features/electromagnetism/magnetism/components/InclinedAmpereScene.tsx` | 231-233 | 滑动提示用`PHYSICS_COLORS.forceArrowRed`而非场景状态色 | 属实 |
| 4 | `src/features/mechanics/circular/CentripetalAnimation.tsx` | 839 | 脱轨文字`colors.danger[600]` | 属实 |
| 5 | `src/features/mechanics/energy/KineticEnergyScene.tsx` | 362-368 | 阶段徽标背景描边文字分别用`colors.primary[100/600/700]`和`colors.warning[100/600/700]` | 属实 |
| 6 | `src/features/mechanics/energy/PowerScene.tsx` | 280-288 | 三阶段徽标分别用`primary/warning/success`各阶色 | 属实 |
| 7 | `src/features/thermodynamics/kinematics/BrownianMotion.tsx` | 220-222 | 花粉径向渐变用`colors.accent[200/500/600]`高考金 | 属实 |
| 8 | `src/features/mechanics/gravitation/SatelliteAnimation.tsx` | 1024 | 入轨目标点`colors.success[500]` | 属实 |
| 9 | `src/features/electromagnetism/induction/ACValues.tsx` | 912/924/933 | 成功弹窗用`colors.success[50/700/600]` | 属实 |

## 3.3.1 硬编码物理色（9项全部属实）

| # | 文件 | 行号 | 代码实况 | 判定 |
|---|------|------|---------|------|
| 1 | `src/data/quantities/kinematics.ts` | 435 | `color: '#2563EB'` v²条目，未走velocity token | 属实 |
| 2 | `src/data/quantities/kinematics.ts` | 437 | `color: '#DC2626'` 斜率条目，未走acceleration token | 属实 |
| 3 | `src/features/electromagnetism/dc-circuits/CircuitAnalysis.tsx` | 330-333 | 色环`'#EF4444'` `'#1C1917'` `'#D4AF37'` 硬编码 | 属实 |
| 4 | `src/features/electromagnetism/dc-circuits/CircuitAnalysisCenterExtra.tsx` | 93-101 | U-I曲线`'#3B82F6'` `'#F97316'` `'#10B981'` `'#64748B'` | 属实 |
| 5 | `src/features/electromagnetism/magnetism/BoundaryMagneticField/ChargeInBField.tsx` | 118-129 | 磁场区域`"#3B82F614"` `"#3B82F622"` `"#3B82F699"` | 属实 |
| 6 | `src/features/mechanics/kinematics/KinematicsAdvancedAnimation.tsx` | 184-345 | 速度箭头/文字`#2563EB`，加速度`#DC2626`，起始线`#DC2626`，标记箭头fill同色 | 属实 |
| 7 | `src/features/mechanics/gravitation/SatelliteAnimation.tsx` | 688-690 | 尾焰渐变`#f97316` `#ef4444` `#dc2626` | 属实 |
| 8 | `src/components/Physics/CoupledCoilField.tsx` | 49 | 默认参数`lineColor = '#10B981'` | 属实 |
| 9 | `src/components/Physics/ParametricMagneticField.tsx` | 37 | 默认参数`lineColor = '#4ade80'` | 属实 |

## 3.3.2 colors.ts 语义污染（属实）

`src/theme/colors.ts` 第88行：`600: '#DC2626', // 负值数字、加速度矢量` — UI色文件注释中混入物理语义，易误导开发者。

## 3.3.3 SCENE_COLORS 注释不一致（属实）

- `src/theme/physics/sceneColors.ts:72` — activeGlow `#059669`（绿色）注释声称"与 PHYSICS_COLORS.electricCurrent 一致"，但 electricCurrent 实为 `#DC2626`（红色），两者不符。
- `src/components/Physics/PrimaryCoil.tsx:180` — fallback 硬编码 `#10B981`
- `src/components/Physics/Solenoid.tsx:192` — 同上 fallback `#10B981`

## 总计

| 分类 | 报告项目数 | 属实 | 偏差说明 |
|------|-----------|------|---------|
| 3.1.1 forceNet错用 | 9 | 9 | 无偏差 |
| 3.1.2 EMF错配 | 3 | 2+1部分 | 第3项formula条目无color字段，属规范建议 |
| 3.2 UI色侵入 | 9 | 9 | 无偏差 |
| 3.3.1 硬编码色 | 9 | 9 | 无偏差 |
| 3.3.2 注释污染 | 1 | 1 | 无偏差 |
| 3.3.3 注释不一致 | 1组 | 1组 | 无偏差 |
| **合计** | **32项** | **31属实+1部分** | **准确率 97%** |
