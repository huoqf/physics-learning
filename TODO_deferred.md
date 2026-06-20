# TODO: 颜色系统待处理项

---

## ✅ 已完成

| 类别 | 提交 | 说明 |
|------|------|------|
| LED/数显特有色 | `2e183fa` | `SCENE_COLORS.electricalApparatus.ledScreenBg/ledDisplayGreen/ledDisplayRed` |
| Stone 色系五金件 | `2e183fa` | `SCENE_COLORS.electricalApparatus.terminalBody/terminalCap/terminalCore/rheostatBase` |
| Physics 组件 SCENE_COLORS 收归 | `ee3e046` | DCSource/Rheostat/Galvanometer/Solenoid 等 9 个组件 |
| Feature 动画 SCENE_COLORS 收归 | `ee3e046` | 12+ 个文件约 100+ 处硬编码 |
| 白色标签 #FFFFFF | `2e183fa` | 10 个文件统一改用 `colors.neutral.white` |
| CuttingEMF 物理语义修正 | `ee3e046` | 力矢量/电动势/极性标注归位 |
| VectorArrow type="force" 语义修正 | `ead1d2a` | 16 处改专用 type（lorentzForce/appliedForce/elasticForce/forceComponent） |
| 安培力/洛伦兹力颜色归位 | `ead1d2a` | 6 文件 forceNet → lorentzForce |

---

## 一、保留不动的拟物渐变色

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

## 二、剩余少量硬编码

| 文件 | 行 | 颜色 | 说明 |
|------|-----|------|------|
| `VelocitySelector.tsx` | 763 | `#FFFFFF` | SVG 内联白色 |
| `FieldLines.tsx` | 残留 | `rgba(255,255,255,...)` | 半透明白色（已是 rgba） |
| `ChargeInEField.tsx` | 残留 | `rgba(255,255,255,...)` | 半透明白色（已是 rgba） |

---

## 三、物理语义错配（剩余 ~17 处）

### P0 — 左手定则手指颜色交换（2 处）
- `components/Physics/HandRule.tsx` L65 → 中指=`electricCurrent`，拇指=`forceNet`
- `components/Physics/SkeletalHand.tsx` L409 → 中指=`electricCurrent`，拇指=`forceNet`

### P1 — 动量标签误用 forceNet（3 处）
- `features/mechanics/momentum/MomentumAnimation.tsx` L557,560 → `momentum`
- `features/mechanics/momentum/MomentumConservationAnimation.tsx` L320 → `momentum`

### P2 — 电容器极板（2 处）
- `features/electromagnetism/electrostatics/Capacitor.tsx` L294,295 → `positiveCharge` / `SCENE_COLORS.circuit.capacitorPlate`

### P3 — 非力高亮误用 forceNet（~6 处，逐个审定）
- `GravityBasicAnimation.tsx` L353,380,519,525,530,537 → `CANVAS_COLORS.annotation` 或专用 token
- `FreeFallAnimation.tsx` L404,600,770 → 逐个审定
- `VerticalThrowAnimation.tsx` L415 → `PHYSICS_COLORS.labelText`
- `FrictionAnimation.tsx` L390,394 → `CANVAS_COLORS.annotation`
- `CentripetalAnimation.tsx` L459 → `CANVAS_COLORS.labelText`
- `KeplerAnimation.tsx` L630 → `CANVAS_COLORS.annotation`

---

## 四、UI colors.* 混入物理渲染（~72 处）

### P0 — 力矢量 UI 色混用（6 处，InclineForceDiagram/ForcePolygon 已部分修正）
- `features/electromagnetism/magnetism/components/InclineForceDiagram.tsx` L378,387 → `normalForce`；L452,461 → `forceNet`
- `features/electromagnetism/magnetism/components/ForcePolygon.tsx` L171 → `normalForce`；L182,187 → `forceNet`
- `features/mechanics/force-motion/ForceMotionTripleChart.tsx` L203 → `FX_CHART_COLORS.forceCurve`；L218 → `VT_CHART_COLORS.velocityCurve`

### P1 — 速度（3 处）
- `features/electromagnetism/magnetism/BoundaryMagneticField/ChargeInBField.tsx` L217,220,232 → `velocity`

### P1 — 内能（4 处）
- `features/mechanics/energy/EnergyConservationAnimation.tsx` L350,383,401,533 → `internalEnergy`

### P1 — 电磁场（8 处）
- `features/electromagnetism/induction/CuttingEMF.tsx` L594 → `electricCurrent`
- `features/electromagnetism/induction/FaradayFieldSandbox.tsx` L78,82,96 → `emf`/`electricCurrent`
- `features/electromagnetism/induction/InductionPhenomenon.tsx` L277,447,462 → `magneticField*`

### P1 — 电路元件外观（13 处）
- `features/electromagnetism/dc-circuits/ClosedCircuit.tsx` L221 → `batteryPos`
- `features/electromagnetism/electrostatics/Capacitor.tsx` L265,267,282,426,445 → `SCENE_COLORS.circuit.*`
- `components/Physics/DCSource.tsx` L163,164 → `batteryPos`
- `components/Physics/Rheostat.tsx` L145-151 → `SCENE_COLORS.electricalApparatus.*`
- `components/Physics/Galvanometer.tsx` L174 → `batteryPos`

### P2 — 图表临界点（12 处）
- `features/electromagnetism/dc-circuits/ClosedCircuitCenterExtra.tsx` L203,204 → `criticalPt`
- `features/mechanics/energy/PowerAnimation.tsx` L219,385,393,398,399,448,523,528,529,567 → `criticalPt`
- `features/electromagnetism/magnetism/VelocitySelector.tsx` L762 → `highlightPt`

### P2 — 零势能参考线（8 处）
- `features/mechanics/energy/PotentialEnergyAnimation.tsx` L531,540 → `reference`
- `features/mechanics/energy/EnergyConservationAnimation.tsx` L430,435,496,501 → `reference`

### P3 — 电势路径线（6 处）
- `features/electromagnetism/electrostatics/ElectricPotentialAnimScene.tsx` L128,140,144,150,181,193 → `electricPotential`

### P3 — 物体外观（5 处）
- `features/thermodynamics/kinematics/BrownianMotion.tsx` L247,256 → `SCENE_COLORS` 专用 token
- `features/mechanics/gravitation/SatelliteAnimation.tsx` L575 → 场景 token
- `components/Physics/Rails.tsx` L100-102,205-206 → `SCENE_COLORS.surface`

### P3 — 失重参考线（2 处）
- `features/mechanics/dynamics/WeightlessnessAnimation.tsx` L629,638 → `reference`

---

## 五、建议执行顺序

1. **下一批（P0 左手定则 + P1 动量标签）**：5 处，低风险
2. **P1 UI 色混用：力/速度/内能/电磁/电路**：34 处，中风险需逐文件验证
3. **P2 图表标注/参考线**：20 处，低风险
4. **P3 电势/物体外观/失重**：13 处，需确认 SCENE_COLORS token 覆盖
5. **每批完成后**：`npm run lint` + `npm run test` + 视觉抽检
