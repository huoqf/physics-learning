# FONT_SIZE 响应式缩放盘点

> 核查日期：2026-06-23
> 总 fontSize 属性：107 处 / 21 文件（含已使用 font() 的混合文件）
> 其中已用 `fontSize={font(N)}`：363 处（已迁移，不在本审计范围）

---

## 分类总览

| 分类 | 文件数 | 调用点 | 操作 |
|---|---:|---:|---|
| A. 可直接改（有 useCanvasSize，解构 font 即可） | 8 | 50 | 改解构 + 替换 |
| B. 需引入 font（subcomponent，需加 prop） | 11 | 53 | 需改 props 接口 + 父组件传参 |
| C. 混合文件（部分已迁移，剩余硬编码） | 2 | 10 | 补齐硬编码部分 |
| D. 不建议改（图表 tick / 特殊布局） | 0 | 0 | — |
| **合计** | **21** | **113** | — |

> 注：115 = 107（纯硬编码文件）+ 8（混合文件中的硬编码部分，Capacitor 10 + InductionPhenomenon 1 + SatelliteAnimation 9 = 20，但 InductionPhenomenon 和 SatelliteAnimation 已大部分迁移，实际硬编码为 1+9=10）

修正后：107 + 10 = 117 处硬编码 fontSize。

---

## A. 可直接改（8 文件，50 调用点）

已有 `useCanvasSize`，只需改解构 `const [ref, { font }] = useCanvasSize(...)` 再替换。

| # | 文件 | 硬编码数 | 当前解构 |
|---|---|---:|---|
| 1 | electromagnetism/electrostatics/ChargeInEField.tsx | 8 | `canvasSize` |
| 2 | electromagnetism/magnetism/VelocitySelector.tsx | 8 | `canvasSize` |
| 3 | mechanics/dynamics/GravityBasicAnimation.tsx | 10 | `canvasSize` |
| 4 | mechanics/dynamics/GravityAnimation.tsx | 5 | `canvasSize` |
| 5 | mechanics/dynamics/FrictionAnimation.tsx | 2 | `canvasSize` |
| 6 | electromagnetism/magnetism/BoundaryMagneticField/ChargeInBField.tsx | 8 | `size` |
| 7 | electromagnetism/electrostatics/ElectricField.tsx | 2 | `canvasSize` |
| 8 | electromagnetism/magnetism/ChargeInBField.tsx | 8 | `canvasSize` |

---

## B. 需引入 font（11 文件，53 调用点）

Subcomponent，无 `useCanvasSize`，需在 props 接口加 `font: (v: number) => number`，由父组件传入。

| # | 文件 | 硬编码数 | 类型 |
|---|---|---:|---|
| 1 | electromagnetism/magnetism/components/InclineForceDiagram.tsx | 11 | 场景子组件 |
| 2 | electromagnetism/electrostatics/ChargeInEField.tsx | 8 | 场景（A类已含） |
| 3 | electromagnetism/magnetism/BoundaryMagneticField/ChargeInBField.tsx | 8 | 场景（A类已含） |
| 4 | electromagnetism/magnetism/VelocitySelector.tsx | 8 | 场景（A类已含） |
| 5 | electromagnetism/electrostatics/ElectricFieldAdvancedScene.tsx | 6 | 场景子组件 |
| 6 | electromagnetism/magnetism/components/InclinedAmpereScene.tsx | 5 | 场景子组件 |
| 7 | electromagnetism/magnetism/components/BasicAmpereScene.tsx | 4 | 场景子组件 |
| 8 | mechanics/dynamics/GravityBasicAnimation.tsx | 10 | 场景（A类已含） |
| 9 | components/Physics/Galvanometer.tsx | 3 | 公共物理组件 |
| 10 | components/Physics/BarMagnet.tsx | 2 | 公共物理组件 |
| 11 | components/Physics/CapacitorPlates.tsx | 2 | 公共物理组件 |

> 注：A 类文件也在 B 类出现是因为它们虽有 useCanvasSize 但未解构 font。A/B 不互斥——A 是"最容易改"，B 是"需要更多工作"。

### 去重后纯 B 类（仅 subcomponent，无 useCanvasSize）：8 文件

| # | 文件 | 硬编码数 |
|---|---|---:|
| 1 | electromagnetism/magnetism/components/InclineForceDiagram.tsx | 11 |
| 2 | electromagnetism/electrostatics/ElectricFieldAdvancedScene.tsx | 6 |
| 3 | electromagnetism/magnetism/components/InclinedAmpereScene.tsx | 5 |
| 4 | electromagnetism/magnetism/components/BasicAmpereScene.tsx | 4 |
| 5 | components/Physics/Galvanometer.tsx | 3 |
| 6 | electromagnetism/magnetism/components/ForcePolygon.tsx | 3 |
| 7 | components/Physics/BarMagnet.tsx | 2 |
| 8 | components/Physics/CapacitorPlates.tsx | 2 |
| 9 | electromagnetism/magnetism/components/UniformMagneticField.tsx | 3 |
| 10 | electromagnetism/magnetism/AmpereForce.tsx | 3 |
| 11 | electromagnetism/electrostatics/ElectricFieldBasicScene.tsx | 2 |

---

## C. 混合文件（2 文件）

已有部分 `fontSize={font(N)}`，剩余硬编码需补齐。

| # | 文件 | 硬编码数 | 已用 font() 数 |
|---|---|---:|---:|
| 1 | mechanics/gravitation/SatelliteAnimation.tsx | 9 | 3 |
| 2 | electromagnetism/induction/InductionPhenomenon.tsx | 1 | 4 |

---

## 建议实施顺序

### Phase 1: A 类（8 文件，最安全）
改解构 + 替换。改动最小，风险最低。
- 力学：GravityAnimation(5), GravityBasicAnimation(10), FrictionAnimation(2)
- 电磁学：ChargeInEField(8), VelocitySelector(8), ElectricField(2), BoundaryMagneticField/ChargeInBField(8), ChargeInBField(8)

### Phase 2: C 类混合文件（2 文件）
补齐已有 font() 文件中的硬编码残留。
- SatelliteAnimation(9), InductionPhenomenon(1)

### Phase 3: B 类 subcomponent（11 文件）
需改 props 接口 + 父组件传参。影响面较大，建议逐个文件处理。
- 先公共组件：Galvanometer(3), BarMagnet(2), CapacitorPlates(2)
- 再场景子组件：InclineForceDiagram(11), ElectricFieldAdvancedScene(6) 等

---

## 字体大小分布

| fontSize | 出现次数 | 说明 |
|---|---:|---|
| 5–7 | ~25 | 小字标注（坐标轴刻度、辅助标签） |
| 8–9 | ~40 | 常规标注（力分量、速度标签） |
| 10–12 | ~35 | 主要标签（标题、数值） |
| 14–18 | ~10 | 大字强调（电荷符号、仪表刻度） |
| 22+ | ~2 | 特殊大字（电场基础场景） |
