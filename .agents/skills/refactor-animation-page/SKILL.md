---
name: refactor-animation-page
description: 重构动画页面 / 重构已有组件 / 迁移旧动画 / 修复动画规范违规 / 优化现有动画页面 / 迁移 wide/tall preset / 为已有动画增加高考真题预设 / 扩展高考临界刻度 / 升级动画高考考点 / 动画高考提分改造
---

# 重构动画页面 Skill

> 核心原则：**只改违规处，不重写正确处。** 先 audit 后动手，scope 不清楚先问用户。

---

## Step 0：Audit — 识别违规类型

快速扫描目标文件，确认哪几类违规，再按 Step 对应小节处理。

### A. Viewport / 布局违规

| 违规特征 | 修复路径 |
|---------|---------|
| `CANVAS_PRESETS.wide` / `.tall` | → `full` / `splitV` / `splitH` / `square`（见 Step 1） |
| `viewBox={...}` + `vp.transform` 同时存在 | 移除 `viewBox`，改用 `AnimationSvgCanvas` |
| `presetCompensation: 1.2`（或任何值） | 删除此行。视觉偏差用 `physicsScaleDesign` 或 `font(N)` 中的 N 值微调补偿 |
| 图表区 `h-[Npx] shrink-0` 写死高度 | → `flex-1 min-h-0` |
| 裸 `requestAnimationFrame(...)` | → `useAnimationLifecycle` / `useAnimationFrame` |

### B. SceneScale / 坐标违规

| 违规特征 | 修复路径 |
|---------|---------|
| `physicsWidth: N`（N < 2 或 N = preset.width = 840）| physicsWidth 是物理视野米数，应填真实场景尺度（如 20、50、100） |
| `customScaleX ≠ customScaleY` | 非等比缩放导致合速度方向失真，改为相等值 |
| `worldToDesign({ x, y }, sceneScale)` | 正确 API：`worldToDesign(x, y, sceneScale)` → `{ px, py }` |
| `x * (canvasWidth / physicsWidth)` 手写坐标 | → `worldToDesign(x, y, sceneScale).px` |
| `physicsToCanvas(x, y, w, h)` | → `worldToDesign(x, y, sceneScale)` |

### C. 地面 / 网格线魔法数字

| 违规特征 | 修复路径 |
|---------|---------|
| `<PhysicsGround x={0} width={900} ...>` | → `x={vp.designLeft} width={vp.designVisibleW}` |
| `<line x2={820} ...>` / `y2={300}` 写死范围 | 水平线 → `x2={vp.designLeft + vp.designVisibleW}`；竖直线 → `y1={0}` |

### D. 组件违规

| 违规特征 | 修复路径 |
|---------|---------|
| `<line> + <marker>` 手写矢量 | → `VectorArrow` / `PhysicsVectorArrow` |
| `<foreignObject>` 内嵌图表 | → HTML 层 flex 分区，图表与 SVG Canvas 平级 |
| 手写 `toSvgX / toSvgY` 坐标轴 | → `BasePhysicsChart` / `VelocityTimeChart` |
| 手写 `<circle>` 渐变球 / `<rect>` 滑块 | → `Ball` / `Block` |
| 手写地面纹理 | → `PhysicsGround` |
| 子路径导入 `@/components/Physics/Ball` | → `@/components/Physics`（barrel） |

### E. 颜色 / 字体违规

```ts
// 违规 → 修复
fill="#3B82F6"          → fill={PHYSICS_COLORS.velocity}
fill="rgba(0,0,0,0.3)" → fill={withAlpha(PHYSICS_COLORS.xxx, 0.3)}
stroke={colors.neutral[200]}  // grid/axis 用 → stroke={CANVAS_COLORS.grid}
fontSize={11}           → fontSize={font(11)}
```

### F. 三屏内容违规

| 位置 | 违规 | 正确归属 |
|------|------|---------|
| 主屏 SVG | 大段教学文字 / 公式推导 | 右屏 FormulaSection |
| 主屏 SVG | 高考考点总结 | 右屏 ExamPointSection |
| 左屏 | 手写 input/button 控件 | `paramMeta` / `controlMeta` |

---

## Step 1：Preset 迁移路径

```
wide（无图表）  →  full  (840×650)
wide（有右侧图表）→  splitH (420×650)
tall            →  full  (840×650)
圆形/对称       →  square (650×650)
```

```tsx
// 迁移后标准 Viewport（无需 presetCompensation）
const { containerRef, canvasSize, vp } = useAnimationViewport({
  preset: CANVAS_PRESETS.full,
})
```

---

## Step 2：坐标系统迁移对照

| 旧写法 | 新写法 |
|-------|-------|
| `physicsToCanvas(x, y, w, h)` | `worldToDesign(x, y, sceneScale)` → `{ px, py }` |
| `createSceneScaleFromViewport({ mode: 'visibleArea' })` | `useSceneScale({ vp, preset, anchor: 'center', physicsScaleDesign: N })` |
| 圆形场景 `createSceneScaleFromDesignCenter(...)` | `useSceneScale({ vp, preset: CANVAS_PRESETS.square, anchor: 'center', physicsScaleDesign: N })` |
| `x={0} width={840}` / `x={-40} width={900}` | `x={vp.designLeft} width={vp.designVisibleW}` |
| 鼠标坐标转换手写 | `useViewportPointer(svgRef)` |

### SceneScale anchor 选型

```ts
// 视野充满型（粒子/物体在视野内运动）
useSceneScale({ vp, preset, anchor: 'viewport', physicsWidth: 20, physicsHeight: 15 })

// 圆周/对称（原点在视口中心）
useSceneScale({ vp, preset: CANVAS_PRESETS.square, anchor: 'center', physicsScaleDesign: 50 })

// 非标准原点（平抛等，必须等比：customScaleX === customScaleY）
useSceneScale({ vp, preset, anchor: 'custom',
  customOriginX: 70, customOriginY: 35, customScaleX: 25, customScaleY: 25 })
```

---

## Step 3：图表组件对照

```tsx
// v-t 图
<VelocityTimeChart points={vtPoints} currentTime={time} tMax={tMax} title="v-t" />

// 自定义图（P-V、F-x 等）
<BasePhysicsChart xDomain={[0, vMax]} yDomain={[0, pMax]} xLabel="V/L" yLabel="p/Pa">
  <ChartLine points={pvPoints} series="primary" />
  <ChartCursor x={currentV} dataPoints={[{ y: currentP, label: 'p', series: 'primary' }]} />
</BasePhysicsChart>

// 轻量实时图（CenterExtra 常用）
<MiniChart series={[{ data, color: PHYSICS_COLORS.velocity, label: 'v' }]}
  xLabel="t / s" yLabel="v / m·s⁻¹" currentTime={time} />
```

---

## Step 4：组件速查

| 需求 | 组件 | import |
|------|------|--------|
| 质点/球 | `Ball` | `@/components/Physics` |
| 滑块/箱 | `Block` | `@/components/Physics` |
| 地面/斜面 | `PhysicsGround` | `@/components/Physics` |
| 物理矢量 | `PhysicsVectorArrow` | `@/components/Physics` |
| 示意矢量 | `VectorArrow` | `@/components/Physics` |
| 粒子轨迹 | `ParticleTrajectory` | `@/components/Physics` |
| 颜色 token | `PHYSICS_COLORS` `SCENE_COLORS` `CANVAS_COLORS` `withAlpha` | `@/theme/physics` |

---

## Checklist（重构完成后验证）

- [ ] 无 `presetCompensation`，无废弃 preset（wide/tall）
- [ ] `physicsWidth/Height` 是真实物理视野米数；`customScaleX === customScaleY`
- [ ] `worldToDesign(x, y, sceneScale)` → `{ px, py }` 调用正确
- [ ] 地面/网格线用 `vp.designLeft / vp.designVisibleW`，无魔法数字
- [ ] 图表区 `flex-1 min-h-0`，不写死高度
- [ ] 矢量/图表/球/地面均使用对应组件，无手写等效实现
- [ ] 字号 `font(N)`，颜色 PHYSICS/SCENE/CANVAS_COLORS 按语义
- [ ] `tsc --noEmit` 通过，动画播放/暂停/重置正常
- [ ] 未改动本次任务无关文件
