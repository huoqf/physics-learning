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
| VectorArrow type="force" 语义修正 | `ead1d2a` | 16 处改专用 type |
| 安培力/洛伦兹力颜色归位 | `ead1d2a` | 6 文件 forceNet → lorentzForce |
| 左手定则手指颜色交换 | `4c6fde3` | HandRule/SkeletalHand：拇指=力，中指=电流 |
| 动量标签 forceNet → momentum | `4c6fde3` | MomentumAnimation/MomentumConservationAnimation |
| 电容器极板 positiveCharge/negativeCharge | `4c6fde3` | Capacitor.tsx 上下极板归位 |
| 非力高亮 forceNet 修正 | `4c6fde3` | GravityBasic/FreeFall/VerticalThrow/Friction/Centripetal/Kepler |
| UI colors.* 混入物理渲染全量修正 | `de40ca7` | ~72 处，22 文件，覆盖力/速度/内能/电磁/电路/图表/参考线/物体外观 |

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

**类型三（物理语义错配）和类型四（UI 色混用）已全部清零。**
