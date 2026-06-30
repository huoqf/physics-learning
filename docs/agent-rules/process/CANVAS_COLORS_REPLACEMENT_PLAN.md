# colors.neutral[] Canvas 违规 — 第一批安全替换清单

> 审计日期：2026-06-30
> 筛选标准：仅包含**明确的 canvas 基础设施**（网格线、坐标轴、参考线、刻度线、分隔线）
> 排除项：UI 元素边框、卡片背景、文字颜色、物理实体渲染

---

## 替换映射表

| 原代码 | 替换为 | 语义 |
|--------|--------|------|
| `colors.neutral[200]` (网格/分隔线) | `CANVAS_COLORS.grid` | 网格线、参考虚线、分隔线 |
| `colors.neutral[300]` (坐标轴) | `CANVAS_COLORS.axis` | 坐标轴、地面线、轴线 |
| `colors.neutral[400]` (刻度/轨迹) | `CANVAS_COLORS.trackHistory` | 刻度线、轨迹、辅助标注线 |

---

## 安全替换清单（22 处，10 个文件）

### 1. ElectricPotentialAnimScene.tsx（4 处）

| 行号 | 当前代码 | 替换为 | 语义 |
|------|---------|--------|------|
| 87 | `stroke={colors.neutral[300]}` | `stroke={CANVAS_COLORS.axis}` | 接地水平线（坐标轴） |
| 117 | `stroke={colors.neutral[200]}` | `stroke={CANVAS_COLORS.grid}` | A-B 端点辅助虚线 |
| 69-72 | `stroke={colors.neutral[400]}` ×4 | `stroke={CANVAS_COLORS.trackHistory}` | 接地符号线条 |

### 2. ElectricPotentialChartScene.tsx（4 处）

| 行号 | 当前代码 | 替换为 | 语义 |
|------|---------|--------|------|
| 125 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.axis}` | 图表坐标轴线 |
| 133 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.axis}` | 图表坐标轴线 |
| 165 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.trackHistory}` | 垂直刻度线 |
| 177 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.trackHistory}` | 水平刻度线 |

### 3. ACValues.tsx（1 处）

| 行号 | 当前代码 | 替换为 | 语义 |
|------|---------|--------|------|
| 177 | `stroke={colors.neutral[200]}` | `stroke={CANVAS_COLORS.grid}` | AC/DC 加热盒分隔线 |

### 4. Capacitor.tsx（1 处）

| 行号 | 当前代码 | 替换为 | 语义 |
|------|---------|--------|------|
| 419 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.trackHistory}` | 电容刻度线 |

### 5. VelocitySelector.tsx（4 处）

| 行号 | 当前代码 | 替换为 | 语义 |
|------|---------|--------|------|
| 598 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.axis}` | 图表 y 轴 |
| 622 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.axis}` | 图表 x 轴 |
| 655 | `stroke={colors.neutral[300]}` | `stroke={CANVAS_COLORS.axis}` | 图表轴线 |
| 664 | `stroke={colors.neutral[300]}` | `stroke={CANVAS_COLORS.axis}` | 图表轴线 |

### 6. InclineForceDiagram.tsx（3 处）

| 行号 | 当前代码 | 替换为 | 语义 |
|------|---------|--------|------|
| 220 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.axis}` | 斜面参考线 |
| 238 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.axis}` | 斜面参考线 |
| 299 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.trackHistory}` | 虚线辅助线 |

### 7. EnergyConservationBarChart.tsx（1 处）

| 行号 | 当前代码 | 替换为 | 语义 |
|------|---------|--------|------|
| 42 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.grid}` | 能量柱分隔线 |

### 8. KineticEnergyScene.tsx（1 处）

| 行号 | 当前代码 | 替换为 | 语义 |
|------|---------|--------|------|
| 237 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.grid}` | 面板分隔线 |

### 9. PowerScene.tsx（3 处）

| 行号 | 当前代码 | 替换为 | 语义 |
|------|---------|--------|------|
| 176 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.grid}` | 货箱分隔线 |
| 177 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.grid}` | 货箱分隔线 |
| 178 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.grid}` | 货箱分隔线 |

### 10. ThinLensAnimation.tsx（2 处）

| 行号 | 当前代码 | 替换为 | 语义 |
|------|---------|--------|------|
| 295 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.trackHistory}` | 光屏水平刻度 |
| 296 | `stroke={colors.neutral[400]}` | `stroke={CANVAS_COLORS.trackHistory}` | 光屏垂直刻度 |

---

## 本次不替换（保留原因）

| 文件 | 行号 | 保留原因 |
|------|------|---------|
| `ForcePolygon.tsx` | 107 | 卡片边框（UI 元素） |
| `HeatingBox.tsx` | 176 | 组件边框（UI 元素） |
| `BasicAmpereScene.tsx` | 120-121 | 导线渲染（物理实体） |
| `SatelliteAnimation.tsx` | 282-284 | 火箭图形（物理实体） |
| `SatelliteShapes.tsx` | 25 | 卫星图形（物理实体） |
| `PendulumScene.tsx` | 40 | 支架渲染（物理实体） |
| `InductionPhenomenon.tsx` | 397 | 开关组件（UI 元素） |
| `KineticEnergyAnimation.tsx` | 140 | 面板分隔线（UI divider） |
| `PowerAnimation.tsx` | 176 | 面板分隔线（UI divider） |
| `PowerScene.tsx` | 265 | 信息卡片（UI 元素） |
| `VelocityAnimation.tsx` | 270 | 放大镜框（UI 元素） |

---

## 验证命令

替换后执行：
```bash
npx tsc --noEmit
npm run build
```
