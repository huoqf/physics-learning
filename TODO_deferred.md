# TODO: 特殊硬编码颜色（待后续处理）

以下颜色硬编码因特殊原因需保留或单独处理，不在本次修复范围内。

---

## ✅ 已完成迁移

| 类别 | 状态 | 说明 |
|------|------|------|
| LED/数显特有色 | ✅ 已收归 | `SCENE_COLORS.electricalApparatus.ledScreenBg/ledDisplayGreen/ledDisplayRed` |
| Stone 色系五金件 | ✅ 已收归 | `SCENE_COLORS.electricalApparatus.terminalBody/terminalCap/terminalCore/rheostatBase` |
| Physics 组件 | ✅ 已迁移 | 9 个组件约 50 处硬编码 |
| Feature 动画 | ✅ 已迁移 | 12+ 个文件约 100+ 处硬编码 |
| 白色标签 #FFFFFF | ✅ 已迁移 | 10 个文件统一改用 `colors.neutral.white` |
| CuttingEMF 物理语义修正 | ✅ 已完成 | 力矢量/电动势/极性标注归位 |

---

## 一、保留不动的拟物渐变色（16 处）

以下渐变色是具象物体的美术表现，属于高内聚组件色，不应提取为全局变量：

| 文件 | 行 | 颜色 | 用途 |
|------|-----|------|------|
| `SatelliteAnimation.tsx` | 671-673 | `#f97316/#ef4444/#dc2626` | 火箭尾焰渐变 |
| `SatelliteAnimation.tsx` | 677 | `#000000` | 阴影滤镜 |
| `SatelliteAnimation.tsx` | 1015 | `#020617` | 深色面板背景 |
| `ClosedCircuit.tsx` | 96-98 | `#DC2626/#7F1D1D` | 内阻发热渐变 |
| `ClosedCircuit.tsx` | 249-251 | `#78350F/#DC2626/#D4AF37` | 电阻色环（棕/红/金） |
| `BrownianMotion.tsx` | 207-209 | `#FDE68A/#F59E0B/#D97706` | 花粉渐变 |
| `GravityAnimation.tsx` | 287 | `#000000` | 阴影滤镜 |

---

## 二、剩余少量硬编码（可后续批量处理）

| 文件 | 行 | 颜色 | 说明 |
|------|-----|------|------|
| `VelocitySelector.tsx` | 763 | `#FFFFFF` | SVG 内联白色 |
| `FieldLines.tsx` | 残留 | `rgba(255,255,255,...)` | 半透明白色（已是 rgba） |
| `ChargeInEField.tsx` | 残留 | `rgba(255,255,255,...)` | 半透明白色（已是 rgba） |

---

## 三、物理语义错配（~33 处，待修复）

### 风险评估

| 优先级 | 类别 | 风险 | 说明 |
|--------|------|------|------|
| P0 | 安培力/洛伦兹力误用 `forceNet` | 🟢 低 | 单纯 token 替换，语义明确，改完立即可验证 |
| P0 | 左手定则手指颜色交换 | 🟡 中 | 语义修正，但需确认物理教学正确性（中指=电流，拇指=力） |
| P1 | 外力误用 `forceNet` | 🟢 低 | `appliedForce` 已存在，直接替换 |
| P1 | 重力误用 `forceNet` | 🟢 低 | `gravity` 已存在，直接替换 |
| P1 | 空气阻力误用 `forceNet` | 🟢 低 | `airResistance` 已存在，直接替换 |
| P1 | 动量误用 `forceNet` | 🟢 低 | `momentum` 已存在，直接替换 |
| P2 | 电容器极板误用 `forceNet` | 🟡 中 | 需确认用 `positiveCharge` 还是 `SCENE_COLORS.circuit.capacitorPlate` |
| P3 | 非力高亮误用 `forceNet` | 🟡 中 | ~6 处，逐个审定替换目标（`CANVAS_COLORS.annotation` 或专用 token） |

### 文件清单

#### P0 — 安培力/洛伦兹力（7 处）
- `features/electromagnetism/magnetism/components/InclineForceDiagram.tsx` L400,409 → `lorentzForce`
- `features/electromagnetism/magnetism/components/ForcePolygon.tsx` L165 → `lorentzForce`
- `features/electromagnetism/magnetism/components/BasicAmpereScene.tsx` L183,192 → `lorentzForce`
- `features/electromagnetism/magnetism/components/AmpereFIChart.tsx` L205,237 → `lorentzForce`
- `features/electromagnetism/magnetism/ChargeInBField.tsx` L139,144 → `lorentzForce`
- `features/electromagnetism/induction/LenzsLaw.tsx` L285 → `lorentzForce`

#### P0 — 左手定则（2 处）
- `components/Physics/HandRule.tsx` L65 → 中指=`electricCurrent`，拇指=`forceNet`
- `components/Physics/SkeletalHand.tsx` L409 → 中指=`electricCurrent`，拇指=`forceNet`

#### P1 — 外力（8 处）
- `features/mechanics/dynamics/ConnectedBodiesAnimation.tsx` L478,487,497,632 → `appliedForce`
- `features/mechanics/momentum/ImpulseAnimation.tsx` L226,275,428 → `appliedForce`
- `features/mechanics/momentum/MomentumTheoremAnimation.tsx` L433,440 → `appliedForce`

#### P1 — 重力（2 处）
- `features/mechanics/dynamics/GravityBasicAnimation.tsx` L353,371 → `gravity`

#### P1 — 空气阻力（3 处）
- `features/mechanics/kinematics/FreeFallAnimation.tsx` L371,547,552 → `airResistance`

#### P1 — 动量（3 处）
- `features/mechanics/momentum/MomentumAnimation.tsx` L557,560 → `momentum`
- `features/mechanics/momentum/MomentumConservationAnimation.tsx` L320 → `momentum`

#### P2 — 电容器极板（2 处）
- `features/electromagnetism/electrostatics/Capacitor.tsx` L294,295 → `positiveCharge` / `SCENE_COLORS.circuit.capacitorPlate`

#### P3 — 非力高亮误用（~6 处）
- `GravityBasicAnimation.tsx` L353,380,519,525,530,537 → 逐个审定
- `FreeFallAnimation.tsx` L404,600,770 → 逐个审定
- `VerticalThrowAnimation.tsx` L415 → `PHYSICS_COLORS.labelText`
- `FrictionAnimation.tsx` L390,394 → `CANVAS_COLORS.annotation`
- `CentripetalAnimation.tsx` L459 → `CANVAS_COLORS.labelText`
- `KeplerAnimation.tsx` L630 → `CANVAS_COLORS.annotation`

---

## 四、UI colors.* 混入物理渲染（~72 处，待修复）

### 风险评估

| 优先级 | 类别 | 风险 | 说明 |
|--------|------|------|------|
| P0 | 力矢量用 `colors.primary/danger` | 🟡 中 | 颜色值可能接近但语义错误，改完需对比色值确认无突变 |
| P0 | 左手定则 UI 色混用 | 🟡 中 | 同类型一 P0 |
| P1 | 速度轴/曲线用 `colors.primary` | 🟢 低 | `primary[500]=#3B82F6` ≈ `velocity=#2563EB`，视觉差异小 |
| P1 | 内能 Q 曲线用 `colors.danger` | 🟢 低 | `danger[600]=#DC2626` → `internalEnergy=#B91C1C`，色相相同仅明度微调 |
| P1 | 电磁场用 `colors.success/accent` | 🟡 中 | `success[500]=#10B981` → `magneticField=#10B981`（相同），但语义需修正 |
| P1 | 电路元件外观用 `colors.danger/accent` | 🟡 中 | 电路元件依赖 SCENE_COLORS 一致性，需确认 SCENE_COLORS 有对应 token |
| P2 | 图表临界点用 `colors.accent/danger` | 🟢 低 | 语义替换，视觉影响小 |
| P2 | 零势能参考线用 `colors.success` | 🟢 低 | `success[500]=#10B981`，替换为 `CHART_COLORS.reference` 需确认颜色 |
| P3 | 物体外观（花粉/整流罩/斜面） | 🟡 中 | 涉及拟物组件，需确认是否有 SCENE_COLORS 对应 token |
| P3 | 路径线用 `colors.primary` | 🟡 中 | `ElectricPotentialAnimScene` 整组 6 处，需确认 `electricPotential` 色值 |
| P3 | 失重参考线用 `colors.primary` | 🟢 低 | 2 处，语义替换 |

### 文件清单

#### P0 — 力矢量 UI 色混用（10 处）
- `features/electromagnetism/magnetism/components/InclineForceDiagram.tsx` L378,387 → `normalForce`；L452,461 → `forceNet`
- `features/electromagnetism/magnetism/components/ForcePolygon.tsx` L171 → `normalForce`；L182,187 → `forceNet`
- `features/mechanics/force-motion/ForceMotionTripleChart.tsx` L203 → `FX_CHART_COLORS.forceCurve`；L218 → `VT_CHART_COLORS.velocityCurve`

#### P1 — 速度（3 处）
- `features/electromagnetism/magnetism/BoundaryMagneticField/ChargeInBField.tsx` L217,220,232 → `velocity`

#### P1 — 内能（4 处）
- `features/mechanics/energy/EnergyConservationAnimation.tsx` L350,383,401,533 → `internalEnergy`

#### P1 — 电磁场（8 处）
- `features/electromagnetism/induction/CuttingEMF.tsx` L594 → `electricCurrent`
- `features/electromagnetism/induction/FaradayFieldSandbox.tsx` L78,82,96 → `emf`/`electricCurrent`
- `features/electromagnetism/induction/InductionPhenomenon.tsx` L277,447,462 → `magneticField*`

#### P1 — 电路元件外观（13 处）
- `features/electromagnetism/dc-circuits/ClosedCircuit.tsx` L221 → `batteryPos`
- `features/electromagnetism/electrostatics/Capacitor.tsx` L265,267,282,426,445 → `SCENE_COLORS.circuit.*`
- `components/Physics/DCSource.tsx` L163,164 → `batteryPos`
- `components/Physics/Rheostat.tsx` L145-151 → `SCENE_COLORS.electricalApparatus.*`
- `components/Physics/Galvanometer.tsx` L174 → `batteryPos`

#### P2 — 图表临界点（12 处）
- `features/electromagnetism/dc-circuits/ClosedCircuitCenterExtra.tsx` L203,204 → `criticalPt`
- `features/mechanics/energy/PowerAnimation.tsx` L219,385,393,398,399,448,523,528,529,567 → `criticalPt`
- `features/electromagnetism/magnetism/VelocitySelector.tsx` L762 → `highlightPt`

#### P2 — 零势能参考线（8 处）
- `features/mechanics/energy/PotentialEnergyAnimation.tsx` L531,540 → `reference`
- `features/mechanics/energy/EnergyConservationAnimation.tsx` L430,435,496,501 → `reference`

#### P3 — 电势路径线（6 处）
- `features/electromagnetism/electrostatics/ElectricPotentialAnimScene.tsx` L128,140,144,150,181,193 → `electricPotential`

#### P3 — 物体外观（5 处）
- `features/thermodynamics/kinematics/BrownianMotion.tsx` L247,256 → `SCENE_COLORS` 专用 token
- `features/mechanics/gravitation/SatelliteAnimation.tsx` L575 → 场景 token
- `components/Physics/Rails.tsx` L100-102,205-206 → `SCENE_COLORS.surface`

#### P3 — 失重参考线（2 处）
- `features/mechanics/dynamics/WeightlessnessAnimation.tsx` L629,638 → `reference`

---

## 五、建议执行顺序

1. **第一批（P0 安培力/洛伦兹力 + 左手定则）**：9 处，教学影响最大
2. **第二批（P1 外力/重力/阻力/动量）**：16 处，低风险批量替换
3. **第三批（P1 UI 色混用：力/速度/内能/电磁/电路）**：38 处，中风险需逐文件验证
4. **第四批（P2 图表标注/参考线）**：20 处，低风险
5. **第五批（P3 电势/物体外观/失重）**：13 处，需确认 SCENE_COLORS token 覆盖
6. **每批完成后**：`npm run lint` + `npm run test` + 视觉抽检
