# Canvas/SVG/图表动态布局与渲染规范

> 优先级：低于 02_UI_RULES.md，高于动画实现细节
> 最后更新：2026-06-26

---

## 1. SVG vs Canvas 选择标准

| 场景 | 推荐技术 | 原因 |
|------|----------|------|
| 静态受力图、几何光路图 | SVG | 标注清晰、可交互、易维护 |
| 低频交互图解 | SVG | DOM 可访问性好，便于 hover/tooltip |
| 高频粒子、轨迹、实时运动 | Canvas | 性能更稳定 |
| 同屏大量对象或复杂场景 | PixiJS | 后期扩展 |
| 真题解析中的小图 | SVG | 信息密度可控，适合步骤化讲解 |
| 数据图表 | SVG 或 Canvas | 取决于数据量和交互复杂度 |

**SVG 规范补充**：SVG 中的颜色、线宽、箭头、文字样式必须引用 `@/theme/physics` 和 `canvasStyle.ts`，不得绕过主题 token。

---

## 2. 主屏页面布局规范（铁律）

> 最后更新：2026-07-08

### 2.1 禁止硬编码像素布局

主屏动画页面（AnimationPage 中间区域）的 SVG 布局**禁止**使用硬编码像素值：

```ts
// ❌ 禁止：硬编码像素布局
<svg width={900} height={520}>
<BasicAmpereScene x={20} y={40} w={480} h={400} />
```

### 2.2 【新页面唯一标准路径】`useAnimationViewport` + `AnimationSvgCanvas`

> **铁律**：2026-07-08 起，所有新建动画组件必须使用此路径，无例外。

#### 核心工具

| 工具 | 路径 | 职责 |
|------|------|------|
| `useAnimationViewport` | `src/hooks/useAnimationViewport.ts` | 复合 Hook：`useCanvasSize + useViewport` 合并，designWidth/designHeight 严格绑定 preset |
| `AnimationSvgCanvas` | `src/components/Layout/AnimationSvgCanvas.tsx` | 标准 SVG 容器：封装 `containerRef + w-full h-full svg + g transform` 样板 |

#### 场景 1：SVG 独占中屏（无 overlay）

```tsx
import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'

export default function MyAnimation() {
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.full,  // 700×650
  })

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      {/* <defs> 放 children 首位，在 <g transform> 内声明完全合法 */}
      <defs>
        <radialGradient id="ball-grad">...</radialGradient>
      </defs>
      {/* 内容使用设计坐标 0..700 / 0..650，不得再乘 scale */}
      <PhysicsScene font={canvasSize.font} />
    </AnimationSvgCanvas>
  )
}
```

#### 场景 2：SVG + HTML overlay 浮层（右侧图表卡片）

```tsx
// overlay 宽度在外部计算，传入 overlayRight 让 vp 自动居中可视区
const { containerRef, canvasSize, vp } = useAnimationViewport({
  preset: CANVAS_PRESETS.full,
  overlayRight: Math.round(Math.max(280, canvasSize.width * 0.38)),
})

return (
  <div className="w-full h-full relative">
    {/* SVG 画布，内容自动避让右侧 overlay */}
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <PhysicsScene font={canvasSize.font} />
    </AnimationSvgCanvas>
    {/* HTML 浮层，CSS 绝对定位叠加 */}
    <div className="absolute right-0 top-0 bottom-0 w-[280px]">
      <ChartPanel />
    </div>
  </div>
)
```

> ⚠️ **overlay 宽度依赖 `canvasSize.width` 时**：使用 `preset.width`（设计稿初始值）代替第一帧前的 `canvasSize.width` 估算，或通过 `useMemo` 引用上一帧值。两次估算误差在首帧后会立即修正，不产生视觉跳变。

#### 场景 3：SVG + 指针交互（拖拽/点击）

```tsx
import { useRef } from 'react'
import { useViewportPointer } from '@/utils'

const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
const svgRef = useRef<SVGSVGElement>(null)
const getSvgPoint = useViewportPointer(svgRef)  // 返回设计坐标中的点

return (
  <AnimationSvgCanvas
    containerRef={containerRef}
    transform={vp.transform}
    svgRef={svgRef}
    onMouseMove={(e) => {
      const pt = getSvgPoint(e.clientX, e.clientY)
      if (pt) handleDrag(pt.x, pt.y)  // pt.x/y 已在设计坐标系内
    }}
  >
    <DraggableScene font={canvasSize.font} />
  </AnimationSvgCanvas>
)
```

#### 场景 4：图表与 SVG 分区并列（上下/左右）

```tsx
// 上方图表 + 下方 SVG 动画：各自用独立 div，不互相嵌套
const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.splitV })

return (
  <div className="w-full h-full flex flex-col">
    {/* 上方图表区：纯 HTML，不涉及 vp */}
    <div className="h-[310px] shrink-0">
      <BasePhysicsChart ... />
    </div>
    {/* 下方 SVG 动画区 */}
    <div className="flex-1 min-h-0">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <PhysicsScene font={canvasSize.font} />
      </AnimationSvgCanvas>
    </div>
  </div>
)
```

#### 场景 5：依赖可视区物理比例尺（centerScale / visibleArea）

```tsx
// 圆周运动等需要以中心为原点的场景，先用 useAnimationViewport 拿到 vp，
// 再用 createSceneScaleFromViewport 建立物理比例尺
const { containerRef, canvasSize, vp } = useAnimationViewport({
  preset: CANVAS_PRESETS.square,  // 650×650
  overlayRight: isAdvanced ? Math.round(cardWidth) : 0,
})

const scale = (Math.min(vp.visibleW, vp.visibleH) - PADDING) / (2 * rMax)

const sceneScale = useMemo(() => createSceneScaleFromViewport(vp, 'centerScale', {
  designWidth: 650,
  designHeight: 650,
  worldWidth: vp.visibleW / scale,
  worldHeight: vp.visibleH / scale,
  refMagnitudes: { velocity: vMax, force: fMax },
}), [vp, scale, vMax, fMax])

return (
  <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
    <CircularScene sceneScale={sceneScale} font={canvasSize.font} />
  </AnimationSvgCanvas>
)
```

#### 核心规则汇总

| 规则 | 说明 |
|------|------|
| `preset` 严格绑定 | `designWidth/Height` 由 Hook 内部自动从 `preset` 派生，调用方不得覆盖 |
| `<defs>` 在 children 首位 | defs 在 `<g transform>` 内完全合法，id 在同一 SVG 文档内有效 |
| 图表严禁 `<foreignObject>` | 响应式图表组件必须放在 HTML 层（flex 分区或 absolute 浮层），不得嵌入 SVG |
| `font()` 强制使用 | `fontSize={font(11)}` 而非 `fontSize={11}` |
| 物理比例尺 | 通过 `computeScale()` 或 `createSceneScaleFromViewport()` 计算，禁止硬编码 |
| 指针事件 | 传 `svgRef` + `useViewportPointer`，禁止手写 `(clientX - rect.left - vp.tx) / vp.scale` |

---

### 2.3 【存量遗留路径】固定 viewBox（禁止新建，按排期迁移）

> ⚠️ **仅服务于既有页面重构参考，新建页面严禁使用。**
> 存量组件的维护以保持现有功能稳定为优先，按里程碑排期逐步迁移至 §2.2。

存量组件使用的三种历史写法（均不得新建）：

**历史方式 A（固定 viewBox，无 vp.transform）**
```tsx
// ❌ 禁止新建。存量遗留：固定 viewBox = 设计常量，preserveAspectRatio 自适应
// 问题：无法支持 overlay 精确避让
<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
  <g>...</g>
</svg>
```

**历史方式 B（动态 viewBox + overlay + vp.transform）**
```tsx
// ❌ 禁止新建。存量遗留：viewBox 绑定真实容器尺寸 + vp.transform
// 合法前提：useViewport 必须声明 overlay 参数（否则为双重缩放反模式）
const vp = useViewport(canvasSize, { designWidth: 700, designHeight: 650, overlayRight: 240 })
<svg viewBox={`0 0 ${width} ${height}`}>
  <g transform={vp.transform}>...</g>
</svg>
```

**历史方式 C（可视区像素坐标，无 g transform）**
```tsx
// ❌ 禁止新建。存量遗留：直接用 vp.visibleW/H 计算像素坐标，SVG 无 g transform
// 适用于依赖真实像素比例尺的动态力学图
<svg width={canvasSize.width} height={canvasSize.height} className="w-full h-full">
  {/* 坐标由 physicsToCanvasWithOrigin 在像素空间计算 */}
</svg>
```

**存量违规清单**（见 `TODO_deferred.md §五`）：

| 文件 | 违规类型 | 优先级 |
|------|---------|-------|
| `GasLawsAnimation.tsx` | foreignObject 嵌入 RelationChart | 🟠 中 |
| `ClapeyronAnimation.tsx` | foreignObject 嵌入 RelationChart | 🟠 中 |
| `ReflectionAnimation.tsx` | 固定 viewBox 800×500（非标准 preset） | 🟡 低 |
| `ThinLensAnimation.tsx` | 固定 viewBox 800×500（非标准 preset） | 🟡 低 |
| `OhmLaw.tsx` | 固定 viewBox 650×400（非标准 preset） | 🟡 低 |

---

### 2.4 🚨 严禁模式

#### 严禁 1：双重缩放反模式（首帧视觉跳变）

```tsx
// ❌ 严禁：viewBox 动态绑定容器尺寸 + vp.transform，且未声明 overlay 参数
const vp = useViewport(canvasSize, { designWidth: 700, designHeight: 650 }) // 无 overlay！

<svg viewBox={`0 0 ${width} ${height}`}>   {/* width/height ResizeObserver 动态更新 */}
  <g transform={vp.transform}>              {/* 双重缩放！首帧后触发"放大跳变" */}
    ...
  </g>
</svg>
```

**根因**：首帧 `width/height = preset 初始值`，`vp.scale ≈ 1`；ResizeObserver 后 `width/height → 真实像素`，viewBox 扩大，`vp.scale` 重新计算，两次缩放叠加导致画面跳变。

**正确做法**：改用 §2.2 的 `AnimationSvgCanvas`（无 viewBox，SVG 以 CSS 尺寸为视口，无双重缩放）。

**方式B（坐标变换型，存量维护参考）：viewBox 绑定真实容器尺寸 + vp.transform**

> ⚠️ **存量遗留，禁止新建。** 仅用于维护既有方式B 组件（如需要 SVG 内部精确 overlay 避让且无法迁移至 §2.2 的场景）。新页面一律使用 §2.2 的 `AnimationSvgCanvas`（无 viewBox）。

```tsx
// ✅ 方式B（限制场景）：需要 SVG 内精确坐标 overlay 时
const { width, height } = canvasSize
const vp = useViewport(canvasSize, {
  designWidth: 700,    // 必须与 CANVAS_PRESETS 所用 preset 一致
  designHeight: 650,
  overlayRight: 240,   // ⚠️ 必须声明 overlay 参数（px），此时配合动态 viewBox + vp.transform 才合法且不构成双重缩放！
})

<svg viewBox={`0 0 ${width} ${height}`}>   {/* ← viewBox 绑定真实容器尺寸 */}
  <g transform={vp.transform}>              {/* ← vp.transform 将设计坐标映射到可视区域 */}
    ...内容仅出现在可视区域内（左侧 width - 240px 区域）...
  </g>
</svg>
```

**方式C（可视区自适应型，存量维护参考）：基于 vp.visibleW/H/X/Y 像素区域自适应**

> ⚠️ **存量遗留，禁止新建。** 仅用于维护既有方式C 组件。新页面使用 §2.2 的 `useAnimationViewport` + `createSceneScaleFromViewport` 实现同等效果。

```tsx
// ✅ 方式C（普通可视区布局 visibleArea）：利用可视区属性直接计算自适应坐标
const vp = useViewport(canvasSize, { designWidth: 700, designHeight: 400 })
const sceneScale = createSceneScaleFromViewport(vp, 'visibleArea', { designWidth: 700, designHeight: 400 })

// ✅ 方式C（旋转中心对称/天体轨道 centerScale 场景）：
// 当物理坐标需以视口中心 (centerX, centerY) 为原点，且有动态计算的物理比例 (scale) 时：
const centerSceneScale = createSceneScaleFromViewport(vp, 'centerScale', {
  designWidth: 650, designHeight: 650,
  worldWidth: (vp.visibleW - padding) / scale,   // ⚠️ 必须声明实际物理世界跨度，确保导出正确 physical scale
  worldHeight: (vp.visibleH - padding) / scale,
})

<svg width={canvasSize.width} height={canvasSize.height} className="w-full h-full">
  {/* 直接使用 canvasPos 或 worldToPixel(wx, wy, sceneScale) 计算后的真实像素位置渲染 */}
</svg>
```

#### 判断规则

> **新页面一律使用 §2.2**（`useAnimationViewport` + `AnimationSvgCanvas`），无例外。
> 旧方式A/B/C 仅见 §2.3，用于存量页面维护参考，不得用于新建。

| 情况 | 做法（§2.2 统一路径） |
|------|----------------------|
| 无 overlay，内容全屏居中 | `useAnimationViewport({ preset })` + `AnimationSvgCanvas` |
| 有 overlay 但可用 CSS 浮层 | `useAnimationViewport({ preset, overlayRight })` + `AnimationSvgCanvas` + HTML absolute 浮层 |
| 必须在 SVG 内部精确 overlay 避让 | `useAnimationViewport({ preset, overlayRight })` + `AnimationSvgCanvas` |
| 动态力学图解 / 依赖动态比例尺 / Canvas | `useAnimationViewport({ preset })` + `createSceneScaleFromViewport` |

#### 指针事件坐标映射对比

```tsx
// ❌ 旧做法（与 vp.transform 绑定，易出错）
const x = (e.clientX - rect.left - vp.tx) / vp.scale
const y = (e.clientY - rect.top - vp.ty) / vp.scale

// ✅ 推荐做法（SVG 原生矩阵变换，精确可靠，适用于新标准路径及方式B）
const pt = svg.createSVGPoint()
pt.x = e.clientX; pt.y = e.clientY
const { x, y } = pt.matrixTransform(svg.getScreenCTM()!.inverse())

// ✅ 方式C 推荐做法：通过容器 bounding rect 与物理比例尺反算
const { x: px, y: py } = canvasToPhysics(e.clientX - rect.left, e.clientY - rect.top, visibleW, visibleH, scale)
```


### 2.6 验收标准

> 新页面一律使用 §2.2 标准路径。以下验收项以 §2.2 为准，存量方式A/B/C 的验收见 §2.3。

| 检查项 | 标准 |
|--------|------|
| SVG 标签 | §2.2 路径：无 `viewBox`，使用 `className="w-full h-full block"`；存量方式A/B 使用 `viewBox` + `preserveAspectRatio` |
| **viewBox 值** | **严禁在未传 overlay 参数时，`viewBox={\`0 0 ${width} ${height}\`}` 同时使用 `<g transform={vp.transform}>`（双重缩放）** |
| **布局模式选择** | **新页面统一使用 `useAnimationViewport` + `AnimationSvgCanvas`（§2.2）；存量方式 B 须在 `useViewport` 声明 overlay 参数；存量方式 C 使用 `vp.visible*` 做可视区像素定位** |
| 布局坐标 | 使用比例常量计算，禁止散落的无语义像素值 |
| 物理比例尺 | 优先使用 `createSceneScaleFromViewport(vp, 'visibleArea')` 或 `computeScale()` 计算，禁止硬编码恒等缩放绕过归一化 |
| 字体大小 | SVG 内使用 `fontSize={font(N)}`，画布内 HTML 使用 `style={{ fontSize: font(N) }}`，禁止裸值 |
| 响应式 | 调整浏览器窗口大小时，布局比例保持不变，无视觉跳变 |
| **指针事件** | **使用 `getScreenCTM().inverse()` 矩阵变换（§2.2 及存量方式B）；存量方式C 统一扣除容器与边距偏移，禁止散落的手动算式** |
| **useViewport** | **新页面通过 `useAnimationViewport` 统一调用；存量方式 A 无计算需求时豁免调用；存量方式 B 明确传 overlay；存量方式 C 消费 visible 属性做动态布局** |


### 2.7 图表与 SVG 场景并列规范

> 同一组件只能选一条缩放路径（详见 `project_rules.md` 铁律 1-8）。

| | 做法 |
|---|---|
| ✅ 正确 | HTML `flex` 容器内，SVG 场景（路径 A）与图表 `div`（路径 B）**平级并列** |
| ❌ 禁止 | SVG 内用 `<foreignObject>` 包裹图表组件（两套缩放叠加，导致图表裁切/X轴消失） |

```tsx
// ✅ 正确：HTML flex 分区，SVG 场景与图表平级
<div className="flex w-full h-full">
  <svg viewBox="0 0 700 650" className="flex-1">
    {/* 路径 A：SVG viewBox，内部坐标用设计常量 */}
  </svg>
  <div className="w-[240px]">
    <BasePhysicsChart ... />  {/* 路径 B：HTML 响应式 */}
  </div>
</div>

// ❌ 禁止：foreignObject 嵌套导致两套缩放叠加
<svg viewBox="0 0 700 650">
  <foreignObject x={460} y={0} width={240} height={650}>
    <BasePhysicsChart ... />  {/* 两套缩放叠加，图表裁切/X轴消失 */}
  </foreignObject>
</svg>
```

图表区与场景区的宽高比例须统一在对应 `config.ts` 中管理，禁止在 Scene 组件内硬编码魔法数字。

---

## 3. 动态布局原则

### 3.1 尺寸计算来源（允许的）

Canvas/SVG/图表布局必须优先基于以下方式计算：

| 类型 | 来源 | 示例 |
|------|------|------|
| 语义化比例 | `canvasStyle.ts` 或 feature 配置 | `chartWidthRatio = 0.28` |
| 语义化上下限 | `canvasStyle.ts` | `minPointRadius = 4`, `maxVectorLengthRatio = 0.4` |
| 主题 token | `@/theme/physics`, `@/theme/colors` | `lineWidth.primary`, `fontSize.label` |
| 容器尺寸测量 | 运行时容器测量 | `canvasRef.current.clientWidth` |
| 物理坐标范围 | 物理计算值 + 坐标转换 | 缩放比例基于物理范围自动计算 |

### 3.2 禁止的做法

```ts
// ❌ 禁止：组件内硬编码最终像素尺寸
const chartX = canvasSize.width - 180;
const pointRadius = 6;

// ❌ 禁止：硬编码图表尺寸
const chart = { width: 200, height: 150 };

// ❌ 禁止：硬编码物理比例尺
const scale = 160;

// ❌ 禁止：字体大小裸值
<text fontSize={11} />
```

### 3.3 推荐做法

```ts
// ✅ 推荐：使用 token + 比例 + 上下限
const chartWidth = Math.max(
  canvasSize.width * CANVAS_STYLE.chartWidthRatio,
  CANVAS_STYLE.minChartWidth
);
const pointRadius = Math.min(
  Math.max(canvasSize.shortEdge * 0.01, CANVAS_STYLE.minPointRadius),
  CANVAS_STYLE.maxPointRadius
);
```

---

## 4. 魔法数字判定表

本规范禁止「无语义裸数字」，但不是禁止所有数字。以下是明确的判定规则：

| 数值类型 | 组件内是否允许 | 处理方式 |
|----------|----------------|----------|
| 业务规则常量 | ✅ 允许（建议常量化） | 放入 `canvasStyle.ts` 或 feature 配置，加注释 |
| 物理常量 | ✅ 允许 | 来自 `physics/constants.ts`，带 JSDoc |
| 数学常量（Math.PI, 0.5） | ✅ 允许 | 直接使用，复杂语义需命名 |
| 视觉尺寸（16px, 180px） | ❌ 禁止 | 从 `@/theme` 或 `canvasStyle.ts` 导入 |
| 物理比例尺（scale = 160） | ❌ 禁止 | 使用 `computeScale(canvasW, canvasH, WORLD)` |
| SVG fontSize 裸值（fontSize={7}） | ❌ 禁止 | 使用 `fontSize={font(7)}` |
| Tailwind text-[Npx]（画布内） | ❌ 禁止 | 使用 `style={{ fontSize: font(N) }}` |
| 颜色值（#2563EB, rgb()） | ❌ 禁止 | 从 `@/theme/physics` 导入 |
| 动效时长（150ms, 250ms） | ❌ 禁止 | 从 `@/theme/motion` 导入 |
| 响应式比例（0.28） | ⚠️ 不建议裸写 | 放入 `canvasStyle.ts`，命名为 `chartWidthRatio` |

### 4.1 示例：正确 vs 错误

```ts
// ❌ 错误：无语义裸数字
const radius = 5;
const margin = 10;

// ✅ 正确：命名为常量或从主题导入
const { minPointRadius, margin } = CANVAS_STYLE;
```

---

## 5. 坐标系统分层

### 5.1 三类坐标的职责分离

| 坐标类型 | 来源 | 转换/计算 | 用途 |
|----------|------|----------|------|
| 物理坐标 | `physics/` 计算 | 物理世界的真实值 | 位移、速度、力、轨道半径 |
| Canvas 坐标 | `coordinate.ts` 转换 | 必须使用 `physicsToCanvas()` | 实际绘制位置 |
| 布局坐标 | `canvasLayout.ts` 计算 | 图表 inset、图例位置、标注避让 | 非物理元素布局 |

### 5.2 禁止的做法

```ts
// ❌ 禁止：组件内手写坐标计算
const canvasX = centerX + physicsX * scale;
```

### 5.3 推荐的做法

```ts
// ✅ 推荐：统一使用 coordinate.ts
import { physicsToCanvas } from '@/utils/coordinate';

const [canvasX, canvasY] = physicsToCanvas(physicsX, physicsY, canvasSize, scale);
```

---

## 6. canvasStyle.ts 职责边界

### 6.1 canvasStyle.ts 应该包含

- 线宽 token（矢量、标注、坐标轴、网格等）
- 箭头样式（长度、角度、head 尺寸）
- 标注字体大小与样式
- 网格/坐标轴样式
- 图表 inset 比例与上下限
- 可读性下限（minPointRadius, minArrowLength 等）
- Canvas/SVG 统一 marker 规则

### 6.2 canvasStyle.ts 不应该包含

- 具体物理计算
- 某个动画组件的专属业务参数
- 页面外层布局宽度
- 具体 DOM 结构
- 运行时容器测量

---

## 7. 物理图表规范

### 7.1 图表组件体系

图表使用 `src/components/Chart/` 下的通用组件，从 `@/components/Chart` barrel import：

| 组件 | 职责 | 使用场景 |
|------|------|---------|
| **BasePhysicsChart** | 原子层容器：双轴独立缩放、网格、刻度、轴标签、自适应降级 | 所有新图表 |
| **ChartCursor** | 十字竖线 + 数据点 + 数值标签 | 需要游标的图表 |
| **ChartArea** | 曲线下方面积填充 | 位移积分、功等面积语义 |
| **ChartTangent** | 切线 + 切点 + 可选割线 | 速度/电场强度斜率展示 |
| **useChartContext** | 获取 toSvgX/toSvgY/font/px | 插件内部坐标计算 |

**铁律**：新增图表必须使用 `BasePhysicsChart`，禁止手写 `toSvgX/toSvgY` 坐标变换。

### 7.2 图表基本要求

| 项目 | 规范 |
|------|------|
| 坐标轴样式 | 来自 `CHART_LAYOUT` token + `CHART_COLORS`，标注物理量和单位 |
| 曲线颜色 | 使用 `ChartSeriesVariant` 枚举（primary/secondary/accent/warm/success） |
| 面积填充 | 使用 `ChartAreaVariant` + `ChartAreaIntensity` 枚举，禁止任意 HEX/rgba |
| 网格 | BasePhysicsChart 自适应降级（standard/mini 模式 + width/height 双维度） |
| 数据点 | 不超过必要数量，避免干扰理解 |
| 图例 | 同屏 > 2 条曲线才显示 |
| 动态尺寸 | 通过 `useCanvasSize()` + `CHART_LAYOUT` token 驱动，禁止硬编码像素 |
| 小图（AnalysisPage） | 使用 `variant="mini"`，SVG，元素 ≤ 5 个 |

### 7.3 常见物理图表类型

| 图表类型 | 物理意义 | 推荐技术 |
|----------|----------|----------|
| v-t 图 | 速度-时间曲线 | BasePhysicsChart |
| a-t 图 | 加速度-时间曲线 | BasePhysicsChart |
| s-t 图 | 位移-时间曲线 | BasePhysicsChart |
| F-x 图 | 力-位移曲线（做功图） | BasePhysicsChart + ChartArea |
| T²-a³ 图 | 开普勒第三定律验证 | BasePhysicsChart |
| P-V 图 | 热力学过程图 | BasePhysicsChart |
| U-I 图 | 电压-电流特性 | BasePhysicsChart |

### 7.4 颜色变体枚举

```ts
// 参考线/游标/切线
type ChartReferenceVariant = 'default' | 'highlight' | 'tangent'

// 数据曲线
type ChartSeriesVariant = 'primary' | 'secondary' | 'accent' | 'warm' | 'success'

// 面积填充
type ChartAreaVariant = 'default' | 'alt' | 'warm'
type ChartAreaIntensity = 'subtle' | 'normal' | 'strong'
```

所有变体通过 `REFERENCE_MAP` / `SERIES_MAP` / `AREA_FILL_MAP` / `AREA_INTENSITY_MAP` 映射到 token 颜色，从 `@/theme/physics` 引入。

---

## 8. 信息密度与降级策略

> Canvas 数量上限定义于 `02_UI_RULES.md §4`，本文件规定降级触发条件与策略。

### 8.1 信息优先级

| 层级 | 内容 | 降级策略 |
|------|------|----------|
| 必要层 | 物体、主轨迹、坐标轴 | 最后隐藏 |
| 重要层 | 主矢量、核心标注 | 空间不足时先隐藏分量 |
| 辅助层 | 网格、参考线 | 默认可选，空间不足自动隐藏 |
| 分析层 | 历史轨迹、额外解释 | 默认隐藏，Toggle 开启 |

### 8.2 降级触发条件

- Canvas 可见元素 > 7 个
- 容器尺寸 < 最小阈值
- 元素尺寸 < 可读性下限

---

## 9. 禁止项与推荐替代

| 禁止做法 | 推荐替代 |
|----------|----------|
| 组件内写 HEX 颜色 | 从 `@/theme/colors` 或 `@/theme/physics` 导入 |
| 组件内写 `requestAnimationFrame` | 使用 `src/utils/animation.ts`（详见 `ARCHITECTURE_RULES.md §7`） |
| 手写 `centerX + x * scale` | 使用 `physicsToCanvas()` |
| 固定图表 `185px × 120px` | 使用容器比例 + min/max |
| Canvas 内用 lucide 图标 | 使用 SVG 路径或绘制函数 |

---

## 10. 统一矢量渲染

### 10.1 组件体系

| 组件/模块 | 路径 | 职责 |
|-----------|------|------|
| `VectorArrow` | `src/components/Physics/VectorArrow.tsx` | 统一矢量箭头渲染（line + polygon 箭头头部） |
| `VectorDefs` | `src/components/Physics/VectorDefs.tsx` | SVG `<marker>` 定义（按颜色+档位自动生成） |
| `vectorStyle` | `src/theme/physics/vectorStyle.ts` | VectorType 枚举、视觉权重、颜色、marker 档位 |
| `vectorLength` | `src/utils/vectorLength.ts` | 归一化箭头长度计算 |
| `SceneConfig` | `src/scene/SceneConfig.ts` | 场景配置（含 `refMagnitudes`） |
| `SceneScale` | `src/scene/SceneScale.ts` | 场景坐标缩放（透传 `refMagnitudes`） |

### 10.2 使用规范

**必须使用 `VectorArrow` 的场景**：所有需要绘制物理矢量箭头（力、速度、加速度、电场等）的 lesson 文件。

**禁止的做法**：
- 各 lesson 自行定义 `<marker id="arrowhead-xxx">` — 已由 `VectorDefs` 统一管理
- 各 lesson 硬编码箭头像素长度（如 `len = F * 2`）— 已由 `vectorLength.ts` 归一化替代
- 各 lesson 手写 `<line>` + `markerEnd` 组合画箭头

### 10.3 `refMagnitudes` 配置规则

每个使用 `VectorArrow` 的场景**必须**在 `SceneConfig` 中声明 `refMagnitudes`：

```typescript
const scene: SceneConfig = {
  vectorBounds: { x: 0, y: 0, width: 700, height: 450 },
  originX: 0,
  originY: 0,
  refMagnitudes: {
    force: 100,           // 该场景预期最大力（N）
    velocity: 20,         // 该场景预期最大速度（m/s）
    electricForce: 50,    // 该场景预期最大电场力（N）
  },
};
```

`refMagnitudes` 的值应为该场景中对应类型的**参考最大值**（同量纲），使最大箭头约占 `maxVectorLength` 的 80%。

**动态场景**（力值范围随参数变化）：可动态计算 `refMagnitude`，如 `refMagnitudes: { electricForce: maxForce * 1.2 }`。

### 10.4 归一化算法

```
arrowPixelLength = (mag / refMagnitude) × maxVectorLength × visualWeight
```

- `mag`：矢量模长（物理单位）
- `refMagnitude`：场景参考最大值（同量纲）
- `maxVectorLength`：`min(bounds.width, bounds.height) × 0.3`
- `visualWeight`：`VECTOR_VISUAL_WEIGHT[type]`（velocity=1.0, force=0.7, magneticField=0.4…）

结果 clamp 到 `[minLength=14, maxVectorLength]`。

### 10.5 `VECTOR_DISPLAY` 与 `vectorStyle.ts` 的边界

| 模块 | 职责 | 状态 |
|------|------|------|
| `canvasStyle.ts VECTOR_DISPLAY` | 旧方案遗留 token（scaleBase、maxLengthRatio） | `@deprecated`，未迁移 lesson 仍可使用 |
| `vectorStyle.ts` | VectorType 枚举、视觉权重、颜色、marker 档位 | **权威来源**，新 lesson 必须使用 |

---

## 11. 相关文档与 Checklist

- [02_UI_RULES.md](./02_UI_RULES.md)：UI 视觉铁律
- [PROCESS_LOG.md](../process/PROCESS_LOG.md)：工程日志
- [CHECKLIST.md](../process/CHECKLIST.md)：提交流程 Checklist（特别是「Canvas/SVG/图表检查」部分）
