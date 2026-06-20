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
| 左手定则手指颜色交换 | `4c6fde3` | HandRule/SkeletalHand：拇指=力，中指=电流 |
| 动量标签 forceNet → momentum | `4c6fde3` | MomentumAnimation/MomentumConservationAnimation |
| 电容器极板 positiveCharge/negativeCharge | `4c6fde3` | Capacitor.tsx 上下极板归位 |
| 非力高亮 forceNet 修正 | `4c6fde3` | GravityBasic/FreeFall/VerticalThrow/Friction/Centripetal/Kepler |

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

## 三、UI colors.* 混入物理渲染（~72 处）

### P0 — 力矢量 UI 色混用（6 处）
- `InclineForceDiagram.tsx` L378,387 → `normalForce`；L452,461 → `forceNet`
- `ForcePolygon.tsx` L171 → `normalForce`；L182,187 → `forceNet`
- `ForceMotionTripleChart.tsx` L203 → `FX_CHART_COLORS.forceCurve`；L218 → `VT_CHART_COLORS.velocityCurve`

### P1 — 速度（3 处）
- `ChargeInBField.tsx`（BoundaryMagneticField）L217,220,232 → `velocity`

### P1 — 内能（4 处）
- `EnergyConservationAnimation.tsx` L350,383,401,533 → `internalEnergy`

### P1 — 电磁场（8 处）
- `CuttingEMF.tsx` L594 → `electricCurrent`
- `FaradayFieldSandbox.tsx` L78,82,96 → `emf`/`electricCurrent`
- `InductionPhenomenon.tsx` L277,447,462 → `magneticField*`

### P1 — 电路元件外观（13 处）
- `ClosedCircuit.tsx` L221 → `batteryPos`
- `Capacitor.tsx` L265,267,282,426,445 → `SCENE_COLORS.circuit.*`
- `DCSource.tsx` L163,164 → `batteryPos`
- `Rheostat.tsx` L145-151 → `SCENE_COLORS.electricalApparatus.*`
- `Galvanometer.tsx` L174 → `batteryPos`

### P2 — 图表临界点（12 处）
- `ClosedCircuitCenterExtra.tsx` L203,204 → `criticalPt`
- `PowerAnimation.tsx` L219,385,393,398,399,448,523,528,529,567 → `criticalPt`
- `VelocitySelector.tsx` L762 → `highlightPt`

### P2 — 零势能参考线（8 处）
- `PotentialEnergyAnimation.tsx` L531,540 → `reference`
- `EnergyConservationAnimation.tsx` L430,435,496,501 → `reference`

### P3 — 电势路径线（6 处）
- `ElectricPotentialAnimScene.tsx` L128,140,144,150,181,193 → `electricPotential`

### P3 — 物体外观（5 处）
- `BrownianMotion.tsx` L247,256 → `SCENE_COLORS` 专用 token
- `SatelliteAnimation.tsx` L575 → 场景 token
- `Rails.tsx` L100-102,205-206 → `SCENE_COLORS.surface`

### P3 — 失重参考线（2 处）
- `WeightlessnessAnimation.tsx` L629,638 → `reference`

---

## 四、建议执行顺序

1. **P1 速度/内能/电磁场**：15 处，中风险
2. **P1 电路元件外观**：13 处，中风险需确认 SCENE_COLORS 覆盖
3. **P0 力矢量 UI 色混用**：6 处，中风险
4. **P2 图表标注/参考线**：20 处，低风险
5. **P3 电势/物体外观/失重**：13 处，需确认 SCENE_COLORS token
6. **每批完成后**：`npm run lint` + `npm run test` + 视觉抽检
