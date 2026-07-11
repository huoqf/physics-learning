# 粒子轨迹统一渲染迁移跟踪

> 标准组件：`ParticleTrajectory`（SVG）/ `drawCanvasParticleTrajectory`（Canvas）
> Token 体系：`CANVAS_STYLE.stroke.trackHistory` / `opacity.trackHistory` / `dash.trajectory` 等
> 规范文档：`ADR: 粒子轨迹统一渲染标准`（codebase-memory）

---

## 已迁移 ✅

| # | 文件 | 场景 | 迁移日期 | 变更摘要 |
|---|------|------|---------|---------|
| 1 | `CombinedFieldsAnimation.tsx` | 质谱仪/回旋加速器/电偏转+磁偏转 | 2026-07-11 | 3 处 `<polyline>` + `<Ball>` → 3 个 `<ParticleTrajectory>`，`Ball` 导入移除，`OPACITY`/`DASH` 导入移除 |
| 2 | `ChargeInEField.tsx` | 带电粒子在匀强电场 | 2026-07-11 | `<polyline>` + `<circle>` → `<ParticleTrajectory>`，`PARTICLE_RADIUS` 常量移除，`historyPathPoints` memo 移除 |
| 3 | `ProjectileAnimation.tsx` | 平抛运动（含阻力对比） | 2026-07-11 | 两条 `<path>` + `<Ball>` → `<ParticleTrajectory>`（`predictedPoints`=真空路径），真空对照 `<Ball steelGhost>` 保留，`physicalPathD`/`physicalVacPathD` memo 移除 |
| 4 | `ObliqueThrowAnimation.tsx` | 斜抛运动（含阻力对比） | 2026-07-11 | 双轨迹（实际+真空）+ `<Ball steelGhost>` → `<ParticleTrajectory>`（`predictedPoints`=真空路径），`physicalPathD`/`physicalVacPathD` memo 移除，`DASH` 导入移除 |

**迁移完成**：4/7 高优先级文件已迁移，3 个因特殊结构跳过（双物体自定义渲染、圆弧+绳/杆、path 字符串+多模式）。

---

## 待迁移 🔲

### 高优先级（SVG，结构直接匹配）

| # | 文件 | 场景 | 行号范围 | 说明 | 状态 |
|---|------|------|---------|------|------|
| 5 | `FreeFallScene.tsx` | 自由落体（双物体） | ~164-177 | 双物体+自定义渲染（硬币渐变、羽毛摆动），不适合标准 Ball | ⏭️ 跳过 |
| 6 | `VerticalCircularScene.tsx` | 竖直圆周运动 | ~38-114 | 圆弧轨迹+绳/杆连接，`ParticleTrajectory` 不支持 | ⏭️ 跳过 |
| 7 | `ForceMotionSandbox.tsx` | 牛顿定律综合沙盒 | ~222-302 | path 字符串格式+多模式物体，不适合统一迁移 | ⏭️ 跳过 |

### 中优先级（部分匹配或需适配）

| # | 文件 | 场景 | 说明 |
|---|------|------|------|
| 8 | `FreeFallDripAnimation.tsx` | 滴水法测 g | trail 可迁移，水滴是自定义椭圆变形不适合标准 Ball |
| 9 | `BoundaryMagneticField/SimulationView.tsx` | 有界磁场偏转 | **Canvas API**，最丰富的轨迹渲染，需 SVG 转换 |
| 10 | `CircularGeometryModel.tsx` | 圆形磁场几何模型 | **Canvas API**，tail + 粒子本体 |

### 低优先级（静态轨道/非标准场景，不迁移）

| # | 文件 | 场景 | 不适合原因 |
|---|------|------|-----------|
| 11 | `CentripetalScene.tsx` | 匀速圆周运动 | 固定轨道圆，非增长历史轨迹 |
| 12 | `CircularModelsAnimation.tsx` | 圆周运动模型 | 椭圆轨道，非粒子轨迹 |
| 13 | `SatelliteAnimation.tsx` | 卫星运动 | 静态轨道几何 |
| 14 | `OrbitTransferAnimation.tsx` | 霍曼变轨 | 静态轨道几何 |
| 15 | `BrownianMotion.tsx` | 布朗运动 | 随机游走，自定义六边形粒子 |
| 16 | `KinematicsAdvancedAnimation.tsx` | 运动学进阶 | 频闪点阵轨迹，非连续线 |
| 17 | `SimplePendulumAnimation.tsx` | 单摆沙摆 | 波形图，非空间轨迹 |
| 18 | `SpringCompositeAnimation.tsx` | 弹簧振子组合 | 参考指示线，非轨迹 |

---

## 迁移总结

**已迁移**：4 个文件（CombinedFieldsAnimation, ChargeInEField, ProjectileAnimation, ObliqueThrowAnimation）

**跳过**：3 个高优先级 + 8 个低优先级 = 11 个文件因结构不匹配跳过

**适用模式**：单粒子+增长历史轨迹+标准 Ball 渲染（电偏转、磁偏转、平抛、斜抛等）

**不适用模式**：双物体自定义渲染、圆弧+绳/杆、path 字符串格式、静态轨道、频闪点阵、波形图

---

## 迁移规范速查

### 替换模式

```tsx
// 旧：内联 polyline + Ball
<polyline points={...} fill="none" stroke={...} strokeWidth={...} strokeDasharray={...} />
<Ball cx={...} cy={...} r={...} type="steel" />

// 新：统一组件
<ParticleTrajectory
  historyPoints={historyPoints}      // 已走过路径
  predictedPoints={predictedPoints}  // 完整理论路径
  tailPoints={tailPoints}            // 最近 8 个点
  isFocus
  chargeSign="+"  // 或 '-' / 'none'
  customBaseColor={...}              // 可选：自定义颜色
/>
```

### 派生数据模式

```tsx
const historyPoints = useMemo(() => {
  return trajectory
    .filter(pt => pt.t <= currentTime)
    .map(pt => ({ x: pt.x, y: pt.y }))
}, [trajectory, currentTime])

const predictedPoints = useMemo(() => {
  return trajectory.map(pt => ({ x: pt.x, y: pt.y }))
}, [trajectory])

const tailPoints = useMemo(() => {
  const tailLen = Math.min(8, historyPoints.length)
  return historyPoints.slice(-tailLen)
}, [historyPoints])
```

### 清理检查清单

- [ ] 移除旧 `<polyline>` / `<path>` 轨迹渲染
- [ ] 移除旧 `<Ball>` / `<circle>` 粒子本体（除非有特殊用途如 ghost ball）
- [ ] 移除相关的 path string memo（如 `physicalPathD`）
- [ ] 移除不再需要的常量（如 `PARTICLE_RADIUS`）
- [ ] 移除不再需要的导入（如 `OPACITY`、`DASH`、`CANVAS_STYLE`）
- [ ] 运行 `npx tsc --noEmit` 确认零错误
