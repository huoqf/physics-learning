# FONT_SIZE 响应式缩放盘点

> 核查日期：2026-06-29（更新）
> 原始审计：2026-06-23
> 总硬编码 fontSize：~89 处 / 21 文件（D 类已迁移）
> 已用 `fontSize={font(N)}` 或 `canvasSize.font()`：~401 处（已迁移）

---

## 分类总览

| 分类 | 文件数 | 调用点 | 状态 |
|---|---:|---:|---|
| A. 已迁移（原 A 类，有 useCanvasSize） | 8 | 50 | ✅ 全部完成 |
| D. 已迁移（遗漏文件） | 11 | 38 | ✅ 全部完成 |
| B. 需引入 font（subcomponent，需加 prop） | 11 | 49 | 待执行 |
| C. 混合文件（部分已迁移，剩余硬编码） | 2 | 10 | 待补齐 |
| **合计** | **32** | **147** | — |

---

## A. 已迁移 ✅（8 文件，50 调用点）

> 2026-06-29 核实：力学 3 + 电磁学 5 全部已迁移，无硬编码残留。

| # | 文件 | 原硬编码数 | 状态 |
|---|---|---:|---|
| 1 | mechanics/dynamics/GravityBasicAnimation.tsx | 10 | ✅ |
| 2 | mechanics/dynamics/GravityAnimation.tsx | 5 | ✅ |
| 3 | mechanics/dynamics/FrictionAnimation.tsx | 2 | ✅ |
| 4 | electromagnetism/electrostatics/ChargeInEField.tsx | 8 | ✅ |
| 5 | electromagnetism/magnetism/VelocitySelector.tsx | 8 | ✅ |
| 6 | electromagnetism/electrostatics/ElectricField.tsx | 2 | ✅ |
| 7 | electromagnetism/magnetism/BoundaryMagneticField/ChargeInBField.tsx | 8 | ✅ |
| 8 | electromagnetism/magnetism/ChargeInBField.tsx | 8 | ✅ |

---

## B. 需引入 font（11 文件，49 调用点）

Subcomponent，无 `useCanvasSize`，需在 props 接口加 `font: (v: number) => number`，由父组件传入。

### 去重后纯 B 类（仅 subcomponent，无 useCanvasSize）：11 文件

| # | 文件 | 硬编码数 | 类型 |
|---|---|---:|---|
| 1 | electromagnetism/magnetism/components/InclineForceDiagram.tsx | 11 | 场景子组件 |
| 2 | electromagnetism/electrostatics/ElectricFieldAdvancedScene.tsx | 6 | 场景子组件 |
| 3 | electromagnetism/magnetism/components/InclinedAmpereScene.tsx | 5 | 场景子组件 |
| 4 | electromagnetism/magnetism/components/BasicAmpereScene.tsx | 4 | 场景子组件 |
| 5 | components/Physics/Galvanometer.tsx | 4 | 公共物理组件 |
| 6 | electromagnetism/magnetism/components/ForcePolygon.tsx | 2 | 场景子组件 |
| 7 | components/Physics/BarMagnet.tsx | 2 | 公共物理组件 |
| 8 | components/Physics/CapacitorPlates.tsx | 2 | 公共物理组件 |
| 9 | electromagnetism/magnetism/components/UniformMagneticField.tsx | 3 | 场景子组件 |
| 10 | electromagnetism/magnetism/AmpereForce.tsx | 3 | 场景子组件 |
| 11 | electromagnetism/electrostatics/ElectricFieldBasicScene.tsx | 2 | 场景子组件 |

---

## C. 混合文件（2 文件，10 调用点）

已有部分 `fontSize={font(N)}`，剩余硬编码需补齐。

| # | 文件 | 硬编码数 | 已用 font() 数 |
|---|---|---:|---:|
| 1 | mechanics/gravitation/SatelliteAnimation.tsx | 9 | 3 |
| 2 | electromagnetism/induction/InductionPhenomenon.tsx | 1 | 大部分已迁移 |

---

## D. 已迁移 ✅（11 文件，38 调用点）

> 2026-06-29 完成。公共物理组件添加 `font` prop + Spring 相关文件迁移。

| # | 文件 | 原硬编码数 | 方式 | 状态 |
|---|---|---:|---|---|
| 1 | mechanics/energy/SpringEnergyChartContent.tsx | 9 | 添加 `font` prop | ✅ |
| 2 | mechanics/energy/SpringCompositeAnimation.tsx | 5 | 已有 `font`，替换残留 | ✅ |
| 3 | mechanics/energy/SpringForceChartContent.tsx | 4 | 添加 `font` prop | ✅ |
| 4 | components/Physics/SkeletalHand.tsx | 3 | 添加 `font` prop | ✅ |
| 5 | components/Physics/DialMeter.tsx | 4 | 添加 `font` prop | ✅ |
| 6 | components/Physics/MagneticPoles.tsx | 4 | 添加 `font` prop | ✅ |
| 7 | mechanics/momentum/SpringBlocksAnimation.tsx | 4 | 解构 `font` + 替换 | ✅ |
| 8 | components/Physics/HandRule.tsx | 2 | 添加 `font` prop | ✅ |
| 9 | components/Physics/Block.tsx | 1 | 已有 `font`，替换残留 | ✅ |
| 10 | components/Physics/VectorArrow.tsx | 1 | 添加 `font` prop | ✅ |
| 11 | components/Physics/LightBulb.tsx | 1 | 添加 `font` prop | ✅ |

---

## 建议实施顺序

### Phase 1: ✅ A 类（已完成）

### Phase 2: ✅ D 类（已完成）

### Phase 3: C 类混合文件（2 文件）
补齐已有 font() 文件中的硬编码残留。
- SatelliteAnimation(9), InductionPhenomenon(1)

### Phase 4: B 类 subcomponent（11 文件，49 调用点）
需改 props 接口 + 父组件传参。影响面较大，建议逐个文件处理。
- 先公共组件：Galvanometer(4), BarMagnet(2), CapacitorPlates(2)
- 再场景子组件：InclineForceDiagram(11), ElectricFieldAdvancedScene(6) 等

---

## B/C 类风险收益评估（2026-06-29）

### 高收益低风险（已全部完成 ✅）

| 文件 | 硬编码数 | 调用方 | 方式 |
|------|---------|--------|------|
| Block.tsx | 1 | 8 个场景 | 已有 font prop，替换残留 |
| LightBulb.tsx | 1 | 4 个场景 | 添加 font prop，默认恒等 |
| VectorArrow.tsx | 1 | 234 个场景 | 添加 font prop，默认恒等，调用方零改动 |
| HandRule.tsx | 2 | 3 个场景 | 添加 font prop，透传至 SkeletonHand |
| SkeletalHand.tsx | 3 | 仅 HandRule | 添加 font prop，FingerView + Palm 透传 |

### 中等收益中风险（B 类公共组件，8 调用方）

| 文件 | 硬编码数 | 调用方 | 风险点 |
|------|---------|--------|--------|
| Galvanometer.tsx | 4 | 2 | 公共组件，刻度盘数字 + 单位字母 |
| BarMagnet.tsx | 2 | 2 | N/S 极标签 |
| CapacitorPlates.tsx | 2 | 2 | +/- 电荷标记 |

### 低收益高风险（建议暂缓）

| 类别 | 文件数 | 硬编码数 | 理由 |
|------|--------|---------|------|
| B 类场景子组件 | 8 | 37 | InclineForceDiagram(11) 等，需改 props 接口 + 逐个父组件传参，改动链长，子组件内部字体与场景布局紧耦合 |
| C 类混合残留 | 2 | 10 | SatelliteAnimation(9) 轨道标注布局固定，缩放收益有限；InductionPhenomenon(1) 仅 1 处 |

---

## 字体大小分布（更新）

| fontSize | 出现次数 | 说明 |
|---|---:|---|
| 2.4–7 | ~30 | 小字标注（坐标轴刻度、辅助标签、图表 tick） |
| 8–9 | ~45 | 常规标注（力分量、速度标签） |
| 10–12 | ~35 | 主要标签（标题、数值） |
| 14–18 | ~12 | 大字强调（电荷符号、仪表刻度、N/S 极） |
| 22+ | ~3 | 特殊大字（电场基础场景、电荷符号） |
| 36 | 4 | MagneticPoles N/S 极标签 |
