---
name: refactor-animation-page
description: 重构动画页面 / 重构已有组件 / 迁移旧动画 / 修复动画规范违规 / 优化现有动画页面 / 迁移 wide/tall preset / 为已有动画增加高考真题预设 / 扩展高考临界刻度 / 升级动画高考考点 / 动画高考提分改造
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
| `x * (canvasWidth / physicsWidth)` 手写坐标 | 改为 `worldToDesign(x, y, sceneScale)` |
| 硬编码 `width={900} height={520}` | 改为 `CANVAS_PRESETS.<preset>.width/height` 或 `vp.designVisibleW` |
| `useViewport` / `computeScale` 在新功能中 | 新功能必须用 `useAnimationViewport` + `useSceneScale` |
| **`presetCompensation: 1.2`（任何页面）** | **删除此参数**。该参数是旧 wide/tall→full 迁移遗留，在新页面或已完成迁移的页面均无存在理由。视觉偏差应调整 physicsScaleDesign 或 anchor，不要加补偿系数。 |
| 图表区 `h-[Npx]` 写死高度 | 改为 `flex-1 min-h-0`（与动画区平分高度） |

### 0C：SceneScale 违规识别

| ❌ 违规 | ✅ 修复 | 影响 |
|-------|--------|-----|
| `physicsWidth: 1.2` | 把小数当物理视野（米），逻辑荒谬 | 比例尺扭曲 |
| `physicsWidth: 0.9` | 同上 | 比例尺扭曲 |
| `physicsWidth: preset.width`（= 840） | 把设计像素当物理单位，1m=1px | 坐标混乱 |
| `physicsWidth: 840` | 同上 | 坐标混乱 |
| `customScaleX ≠ customScaleY` | 非等比缩放，合速度箭头方向与物理不符 | 矢量方向失真 |
| `worldToDesign({ x, y }, sceneScale)` | 旧 API 写法（不存在） | 编译错误 |
| `vp.scale` 参与坐标计算 | vp.scale 是容器像素级别，不应与设计坐标混用 | 二次缩放 |

**正确的 physicsWidth/Height**：真实物理世界的视野范围（米），例如：
- 追及场景 200m 跑道 → `physicsWidth: 200`
- 自由落体 50m 楼 → `physicsHeight: 50`  
- 微观粒子场景 → `physicsWidth: 1e-9`（纳米量级）

### 0D：组件违规识别

| ❌ 违规 | ✅ 修复 |
|-------|--------| 
| 手写 `<line>` + `<marker>` 矢量箭头 | 替换为 `VectorArrow` / `PhysicsVectorArrow` |
| 手写 `toSvgX / toSvgY` 图表坐标轴 | 替换为 `BasePhysicsChart`/`VelocityTimeChart` 等 |
| `<foreignObject>` 内嵌 React 图表 | 改为 HTML 层 flex 分区，图表与 SVG 平级 |
| 手写圆球 `<circle>` + 渐变 | 替换为 `Ball` 组件 |
| 手写滑块 `<rect>` + 纹理 | 替换为 `Block` 组件 |
| 手写地面纹理 SVG | 替换为 `PhysicsGround` |
| 地面 `width={N}` 写死魔法数字 | 改为 `x={vp.designLeft} width={vp.designVisibleW}` |
| 子路径导入 `@/components/Physics/Ball` | 改为 barrel `@/components/Physics` |

### 0E：颜色违规识别

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

### 0F：信息密度违规

- SVG 可见元素 > 7 个：应分层（`showVectors` toggle 控制辅助层）
- SVG 文字标注 > 5 个：合并或默认隐藏次要标注

---

## Step 1：布局迁移路径

### 废弃 preset 迁移

| 原 preset | 推荐目标 | 判断依据 |
|-----------|---------|---------| 
| `wide`（宽横屏，无图表） | `full` (840×650) | 无图表分区 |
| `wide`（右侧有图表） | `splitH` (420×650) | 图表在右 |
| `tall`（高竖屏） | `full` (840×650) | 竖向场景 |
| 圆形/对称 | `square` (650×650) | 圆周运动、波动 |

```tsx
// 迁移前（废弃）
const { canvasSize } = useCanvasSize(CANVAS_PRESETS.wide)

// 迁移后（标准路径）
// ⚠️ 严禁 presetCompensation：不管迁移新旧，此参数在任何情况下都不应出现
const { containerRef, canvasSize, vp } = useAnimationViewport({
  preset: CANVAS_PRESETS.full,
})
// 如果删除 presetCompensation 后视觉有轻微变化（字体缩小），
// 在相关 font(N) 调用中将 N 值微调 +1~2 即可，不要靠补偿系数
```

### 圆形场景迁移

```tsx
// 圆周/对称场景：用 useSceneScale(anchor: 'center')
const sceneScale = useSceneScale({
  vp, preset: CANVAS_PRESETS.square,
  anchor: 'center',
  physicsScaleDesign: 50,     // 1m = 50 设计像素
  centerSource: 'viewport',  // 原点在视口中心
  refMagnitudes: { velocity: vMax, force: fMax },
})

// ⚠️ createSceneScaleFromDesignCenter 是遗留 API，
// 维护旧代码可以保留，新功能和迁移场景请用 useSceneScale(anchor:'center')
```

### 分区布局迁移（图表+动画）

```tsx
// splitV：上图表 + 下动画，两区各 flex-1 自适应，禁止写死高度
<div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
  <div className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm flex flex-col">
    <VelocityTimeChart points={vtPoints} currentTime={time} tMax={tMax} title="v-t" />
  </div>
  <div ref={containerRef} className="flex-1 min-h-0 relative">
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <Scene ... />
    </AnimationSvgCanvas>
  </div>
</div>
// ❌ 禁止：h-[270px] shrink-0 → 在不同屏幕下会侵占动画区
```

---

## Step 2：坐标系统迁移对照

| 旧写法 | 新写法 | 备注 |
|-------|-------|------| 
| `physicsToCanvas(x, y, w, h)` | `worldToDesign(x, y, sceneScale)` | 新 API 返回 `{ px, py }` |
| `x * (canvasWidth / physicsWidth)` | `worldToDesign(x, y, sceneScale).px` | — |
| `createSceneScaleFromViewport({ mode: 'visibleArea' })` | `useSceneScale({ vp, preset, anchor: 'center', physicsScaleDesign })` | 有固定器材 |
| `createSceneScaleFromViewport({ mode: 'transform' })` | 保留可用（输出设计坐标） | — |
| `worldToDesign({ x, y }, sceneScale)` → `{ x, y }` | `worldToDesign(x, y, sceneScale)` → `{ px, py }` | API 纠正 |
| 拖拽：`(clientX - rect.left - vp.tx) / vp.scale` | `useViewportPointer(svgRef)` | — |
| 地面固定宽度 `x={0} width={840}` | `x={vp.designLeft} width={vp.designVisibleW}` | 撑满可视区 |
| 地面固定宽度 `x={-40} width={900}` | `x={vp.designLeft} width={vp.designVisibleW}` | 同上 |
| **`physicsWidth: preset.width`（= 840）** | **根据实际物理场景设置真实视野（米）** | 把像素当物理量是错误 |
| **`physicsWidth: 1.2`** | **根据实际物理场景设置真实视野（米）** | 1.2m 视野逻辑荒谬 |
| 网格线 `x2={820}` 写死 | `x2={vp.designLeft + vp.designVisibleW}` | — |
| 坐标轴 `y1={originY - 290}` 写死 | `y1={0}` （设计坐标顶部） | — |

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
- [ ] 无 `presetCompensation: 1.2`（任何值均不应存在）
- [ ] `originPixel` → `originDesign` 已全部替换
- [ ] 裸 `requestAnimationFrame` 已替换
- [ ] 图表区改为 `flex-1 min-h-0`，无 `h-[Npx]` 写死高度

### SceneScale
- [ ] `physicsWidth/Height` 是真实物理视野范围（米），不是像素
- [ ] `customScaleX === customScaleY`（等比缩放，矢量方向准确）
- [ ] 使用正确 API：`worldToDesign(x, y, sceneScale)` → `{ px, py }`
- [ ] 地面/网格线使用 `vp.designLeft/designVisibleW`，无魔法数字

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
