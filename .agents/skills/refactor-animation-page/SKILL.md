---
name: refactor-animation-page
description: 重构动画页面 / 重构已有组件 / 迁移旧动画 / 修复动画规范违规 / 优化现有动画页面 / 迁移 wide/tall preset
---

# 重构动画页面 Skill

> 核心原则：**只改违规处，不重写正确处。** 本 Skill 触发于重构/迁移/修复/优化已有动画页面。

---

## Step 0：重构前审计（先识别，后动手）

### 0A：三屏内容违规识别

| 位置 | ❌ 违规内容 | ✅ 正确位置 |
|------|-----------|-----------|
| 主屏 SVG | 大段教学文字（超过一句话的解释性 `<text>`） | 右屏 FormulaSection / 左屏 `controlMeta tip` |
| 主屏 SVG | 完整公式推导（多行 KaTeX 块） | 右屏 FormulaSection |
| 主屏 SVG | 高考考点总结列表 | 右屏 ExamPointSection |
| 左屏 | 手写 `<input type="range">` | 迁移到 `paramMeta` |
| 左屏 | 手写 `<button>` 模式切换 / toggle 开关 | 迁移到 `controlMeta.segmented` / `.toggle` |
| 左屏 | 手写预设按钮 | 迁移到 `controlMeta.preset` |
| 左屏 | 手写 `border-t/rounded-xl/p-4` 容器 | 改用 `LeftPanelSection` |
| 左屏 | `SidebarExtra` 直接访问 `useAnimationStore` | 改为 props 注入 |
| 右屏 | 参数调节控件 | 移至左屏 |

### 0B：布局与 Viewport 违规识别

| ❌ 违规 | ✅ 修复 |
|-------|--------|
| `viewBox={...}` + `vp.transform` 同时使用（双重缩放反模式） | 移除 `viewBox`，改用 `AnimationSvgCanvas` |
| `createSceneScaleFromViewport({ mode: 'visibleArea' })` 或 `'centerScale'` | 替换为 `useSceneScale` / `createSceneScaleFromDesignCenter` |
| `CANVAS_PRESETS.wide` / `CANVAS_PRESETS.tall` | 迁移至 `full`/`splitV`/`splitH`/`square`（见 Step 1） |
| `requestAnimationFrame(...)` 裸调用 | 改用 `useAnimationLifecycle` / `useAnimationFrame` |
| `originPixel` prop（已废弃） | 改为 `originDesign` |
| `x * (canvasWidth / physicsWidth)` 手写坐标 | 改为 `worldToDesign({ x, y }, sceneScale)` |
| 硬编码 `width={900} height={520}` | 改为 `CANVAS_PRESETS.<preset>.width/height` |
| `useViewport` / `computeScale` 在新功能中 | 新功能必须用 `useAnimationViewport` + `useSceneScale` |

### 0C：组件违规识别

| ❌ 违规 | ✅ 修复 |
|-------|--------|
| 手写 `<line>` + `<marker>` 矢量箭头 | 替换为 `VectorArrow` / `PhysicsVectorArrow` |
| 手写 `toSvgX / toSvgY` 图表坐标轴 | 替换为 `BasePhysicsChart`/`VelocityTimeChart` 等 |
| `<foreignObject>` 内嵌 React 图表 | 改为 HTML 层 flex 分区，图表与 SVG 平级 |
| 手写圆球 `<circle>` + 渐变 | 替换为 `Ball` 组件 |
| 手写滑块 `<rect>` + 纹理 | 替换为 `Block` 组件 |
| 手写地面纹理 SVG | 替换为 `PhysicsGround` |
| 子路径导入 `@/components/Physics/Ball` | 改为 barrel `@/components/Physics` |

### 0D：颜色违规识别

```ts
// ❌ 常见颜色违规
fill="#3B82F6"             → fill={PHYSICS_COLORS.velocity}
stroke="red"               → stroke={PHYSICS_COLORS.force}
fill="#22C55E"             → fill={PHYSICS_COLORS.energy}
fill="rgba(0,0,0,0.3)"    → fill={withAlpha(PHYSICS_COLORS.xxx, 0.3)}
stroke={colors.neutral[200]}  // Canvas 基础设施 → stroke={CANVAS_COLORS.grid}
fill="#8B4513"             → fill={SCENE_COLORS.wood}
fill="#C0C0C0"             → fill={SCENE_COLORS.metal}
// 禁止 UI 色用于物理量（colors.primary/danger 用于 Canvas 物理量）
fill={colors.primary[500]} → fill={PHYSICS_COLORS.velocity}  // 这是物理量，不是 UI 元素

// ❌ 字号违规
fontSize={14}              → fontSize={font(14)}
fontSize={11}              → fontSize={font(11)}
```

### 0E：信息密度违规

- SVG 可见元素 > 7 个：应分层（`showVectors` toggle 控制辅助层）
- SVG 文字标注 > 5 个：合并或默认隐藏次要标注

---

## Step 1：布局迁移路径

### 废弃 preset 迁移

| 原 preset | 推荐目标 | 判断依据 |
|-----------|---------|---------|
| `wide`（宽横屏） | `full` (840×650) | 无图表分区 |
| `wide`（右侧有图表） | `splitH` (420×650) | 图表在右 |
| `tall`（高竖屏） | `full` (840×650) | 竖向场景 |
| 圆形/对称 | `square` (650×650) | 圆周运动、波动 |

```tsx
// 迁移前（废弃）
const { canvasSize } = useCanvasSize(CANVAS_PRESETS.wide)

// 迁移后（标准路径）
const { containerRef, canvasSize, vp } = useAnimationViewport({
  preset: CANVAS_PRESETS.full,
  // 若视觉出现缩放偏差，加平滑补偿
  // presetCompensation: 1.2,
})
```

### 圆形场景迁移

```tsx
// 圆周/对称场景：用 createSceneScaleFromDesignCenter（新页面标准）
import { createSceneScaleFromDesignCenter } from '@/scene'

const sceneScale = useMemo(() => createSceneScaleFromDesignCenter({
  designWidth: 650,
  designHeight: 650,
  worldWidth: rMax * 2.4,
  worldHeight: rMax * 2.4,
  refMagnitudes: { velocity: vMax, force: fMax },
}), [rMax, vMax, fMax])
```

### 分区布局迁移（图表+动画）

```tsx
// splitV：上图表 + 下动画，flex-col，各独立 div，禁止嵌套
<div className="w-full h-full flex flex-col">
  <div className="h-[310px] shrink-0">
    <VelocityTimeChart points={vtPoints} currentTime={time} tMax={tMax} title="v-t" />
  </div>
  <div className="flex-1 min-h-0">
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <Scene ... />
    </AnimationSvgCanvas>
  </div>
</div>
```

---

## Step 2：坐标系统迁移对照

| 旧写法 | 新写法 |
|-------|-------|
| `physicsToCanvas(x, y, w, h)` | `worldToDesign({ x, y }, sceneScale)` |
| `x * (canvasWidth / physicsWidth)` | `worldToDesign({ x, y }, sceneScale).x` |
| `createSceneScaleFromViewport({ mode: 'visibleArea' })` | `useSceneScale({ vp, preset, anchor })` |
| `createSceneScaleFromViewport({ mode: 'transform' })` | 保留可用（输出设计坐标） |
| 拖拽：`(clientX - rect.left - vp.tx) / vp.scale` | `useViewportPointer(svgRef)` |
| 地面固定宽度 `width={840}` | `width={vp.designVisibleW}` + `x={vp.designLeft}` |

---

## Step 3：图表组件替换

```tsx
// ❌ 禁止手写坐标轴
const toSvgX = (v: number) => (v / maxV) * chartWidth
<line x1={toSvgX(0)} x2={toSvgX(maxV)} ... />

// ✅ 正确：使用 VelocityTimeChart（v-t 图）
import { VelocityTimeChart } from '@/components/Chart'
<VelocityTimeChart points={vtPoints} currentTime={time} tMax={10} title="v-t" />

// ✅ 正确：使用 BasePhysicsChart（自定义图表，如 P-V 图）
import { BasePhysicsChart, ChartCursor, ChartLine } from '@/components/Chart'
<BasePhysicsChart xDomain={[0, vMax]} yDomain={[0, pMax]} xLabel="V/L" yLabel="p/Pa">
  <ChartLine points={pvPoints} series="primary" />
  <ChartCursor x={currentV} dataPoints={[{ y: currentP, label: 'p', series: 'primary' }]} />
</BasePhysicsChart>

// ✅ 正确：MiniChart（轻量实时时序图，CenterExtra 常用）
import { MiniChart } from '@/components/UI'
<MiniChart
  series={[{ data: vtData, color: PHYSICS_COLORS.velocity, label: 'v' }]}
  xLabel="t / s"
  yLabel="v / m·s⁻¹"
  currentTime={time}
/>
```

---

## Step 4：物理量颜色修复速查

```ts
// 语义层级隔离（必须正确区分）
PHYSICS_COLORS.*   ← 物理矢量和标注（力、速度、加速度、能量等）
SCENE_COLORS.*     ← 场景器材外观（磁铁、线圈、球体材质等）
CANVAS_COLORS.*    ← Canvas 基础设施（网格线、坐标轴、参考线）
CHART_COLORS.*     ← 图表曲线与填充

// withAlpha：从 @/theme/physics 统一入口，禁止子路径
import { withAlpha } from '@/theme/physics'
fill={withAlpha(PHYSICS_COLORS.velocity, 0.3)}

// UI 色（colors.primary/danger 等）严禁用于物理量
// 只用于：阶段徽章、平衡状态指示、警告横幅等非物理教学元素
```

---

## Step 5：重构 Checklist

### 三屏内容
- [ ] 主屏无大段教学文字（只有数值标注 + 坐标轴标签）
- [ ] 知识讲解/公式推导已移至右屏或删除
- [ ] 左屏控件走声明式体系（paramMeta/controlMeta）
- [ ] SVG 可见元素 ≤ 7，文字标注 ≤ 5

### 布局与 Viewport
- [ ] 双重缩放已消除（`viewBox` + `vp.transform` 不共存）
- [ ] 废弃 preset 已迁移（wide/tall → full/splitV/splitH/square）
- [ ] `originPixel` → `originDesign` 已全部替换
- [ ] 裸 `requestAnimationFrame` 已替换

### 组件复用
- [ ] 矢量箭头已替换（无 `<line>+<marker>`）
- [ ] 图表已替换为 `BasePhysicsChart`/`VelocityTimeChart` 等
- [ ] 球体/滑块/地面已替换为 `Ball`/`Block`/`PhysicsGround`

### 颜色与字体
- [ ] 硬编码颜色已替换为主题 token
- [ ] Canvas 基础设施色用 `CANVAS_COLORS`，非 `colors.neutral`
- [ ] `fontSize={N}` → `fontSize={font(N)}`
- [ ] import 改为 barrel，无子路径

### 保持不变（禁止过度重构）
- [ ] 未改动与本次任务无关的文件
- [ ] 未重写正确的遗留模式
- [ ] 未删除有效的 JSDoc 和注释

### 验证
- [ ] `tsc --noEmit` 通过
- [ ] 开发服务器无控制台报错
- [ ] 动画播放/暂停/重置正常

---

> ❗ 若发现需大范围重构，必须先与用户确认范围再动手。
