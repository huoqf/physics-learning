# physics-learning 颜色审计 — 待处理清单

> 更新：2026-06-25（§B §C 已修复）

---

## 需新增 token（暂未处理）

### A1. 力的语义混用

| # | 文件 | 行号 | 问题 | 建议 |
|---|------|------|------|------|
| 1 | `InclinedAmpereScene.tsx` | 224-225 | 平衡徽标用 `forceNet` | 新增 `SCENE_COLORS.labels.stateBalanced` |
| 2 | `WorkAnimation.tsx` | 430-434 | 警告框用 `forceNet` | 新增状态警告色 |
| 3 | `HandRule.tsx` | 63 | 拇指用 `forceNet` | 洛伦兹力场景改 `lorentzForce` |
| 4 | `SkeletalHand.tsx` | 407 | 拇指用 `forceNet` | 同上 |

### A2. UI 色侵入物理图层

| # | 文件 | 行号 | 问题 | 建议 |
|---|------|------|------|------|
| 1 | `ParticleEmitter.tsx` | 129 | 指示灯用 `colors.success/danger` | 改用 `SCENE_COLORS` 设备状态色 |
| 2 | `ForcePolygon.tsx` | 154、193 | 平衡指示用 `success/danger` | 新增状态标记色 |
| 3 | `InclinedAmpereScene.tsx` | 227-233 | 滑动提示用 `forceArrowRed` | 改用 `SCENE_COLORS.labels.stateWarning` |
| 4 | `CentripetalAnimation.tsx` | 839 | 脱轨提示用 `danger` | 改用 `SCENE_COLORS.labels` |
| 5 | `SatelliteAnimation.tsx` | 1024 | 目标点用 `success` | 改用 `SCENE_COLORS` 目标标记色 |
| 6 | `ACValues.tsx` | 912、924、933 | 表格状态用 `success` | 划归 `SCENE_COLORS` 仪表状态色 |

### A3. 硬编码色待收编

| # | 文件 | 行号 | 问题 | 建议 |
|---|------|------|------|------|
| 1 | `CircuitAnalysis.tsx` | 330-333 | 电阻色环硬编码 | 收编 `SCENE_COLORS.circuit.resistorBand*` |
| 2 | `CircuitAnalysisCenterExtra.tsx` | 93-101 | U-I 曲线硬编码 | 改用 `PHYSICS_COLORS` token |
