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

### 2.1 禁止硬编码像素布局

主屏动画页面（AnimationPage 中间区域）的 SVG 布局**禁止**使用硬编码像素值：

```ts
// ❌ 禁止：硬编码像素布局
<svg width={900} height={520}>
<BasicAmpereScene x={20} y={40} w={480} h={400} />
```

### 2.2 强制方案：useCanvasSize + useViewport（铁律）

**新动画组件必须**引用 `useCanvasSize()` + `useViewport()`；存量组件须在当前里程碑内迁移完成（见 §2.3）。根据是否有 overlay 二选一（见 §2.4 判断规则）：

```tsx
// CANVAS_PRESETS.full = { width: 700, height: 650 }（按布局区域选型，详见 project_rules.md）
// designWidth/designHeight 为 SVG 设计坐标系尺寸，必须与所选 preset 完全一致
const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full)
const vp = useViewport(canvasSize, { designWidth: 700, designHeight: 650 })
```

物理比例尺**必须**通过 `computeScale()` 基于物理世界范围计算：

```ts
import { computeScale } from '@/utils/coordinate'

const WORLD = { xMin: -2, xMax: 6, yMin: -1, yMax: 5 }
const physicsScale = computeScale(width, height, WORLD, padding)
```

字体大小**必须**通过 `font()` 函数缩放（内置 clamp(7, 16) 保证可读性）：

```tsx
// ✅ 正确
<text fontSize={font(11)} />

// ❌ 禁止
<text fontSize={11} />
```

画布预设尺寸从 `CANVAS_PRESETS`（`@/theme/spacing`）引用，动画 UI token 从 `@/theme/animationTokens` 引用。

### 2.3 旧方案遗留：viewBox + 比例常量（新组件禁用）

> ⚠️ **新动画组件禁止使用此方案**。存量测试证明固定 viewBox 在某些屏幕尺寸和三栏布局下存在内容裁切问题，且无法支持 overlay 避让。**存量组件须迁移至** §2.2 方案（`useCanvasSize` + `useViewport`），维护旧组件时以保持现有功能稳定为优先，但迁移不可跳过。

```ts
// ❌ 旧方案（禁止在新组件中使用，保留供存量迁移参考）
const VIEW_WIDTH = 800
const VIEW_HEIGHT = 500

const LAYOUT = {
  sceneX: 0.025,         // 20/800
  sceneY: 0.08,          // 40/500
  sceneWidthRatio: 0.6,  // 480/800
  sceneHeightRatio: 0.8, // 400/500
  panelX: 0.65,          // 520/800
  panelWidthRatio: 0.325,
  // ...
} as const

// 组件内动态计算
const layout = {
  scene: {
    x: VIEW_WIDTH * LAYOUT.sceneX,
    y: VIEW_HEIGHT * LAYOUT.sceneY,
    w: VIEW_WIDTH * LAYOUT.sceneWidthRatio,
    h: VIEW_HEIGHT * LAYOUT.sceneHeightRatio,
  },
  // ...
}

// SVG 使用 viewBox
<svg
  viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
  preserveAspectRatio="xMidYMid meet"
  className="w-full h-full"
>
  <BasicAmpereScene x={layout.scene.x} y={layout.scene.y} w={layout.scene.w} h={layout.scene.h} />
</svg>
```

### 2.4 🚨 SVG viewBox 铁律（禁止双重缩放）

> **违反此条将导致初次进入页面时出现画面"缓缓放大"视觉跳变。**

#### 问题根因

在**未传入 overlay 参数**时，`viewBox` 动态绑定容器真实像素尺寸，同时又通过 `vp.transform` 做缩放，形成**双重缩放反模式**：
- 首帧：`width/height` = `useCanvasSize` 初始值（设计稿默认尺寸），`vp.scale ≈ 1`
- ResizeObserver 触发后：`width/height` → 真实容器尺寸，viewBox 扩大，画面出现放大跳变

#### 禁止的做法（反模式）

```tsx
// ❌ 严禁：在未传入 overlay 参数的情况下，viewBox 绑定容器真实像素 + 同时用 vp.transform（双重缩放反模式）
const { width, height } = canvasSize
const vp = useViewport(canvasSize, { designWidth: 700, designHeight: 650 }) // ⚠️ 严禁：未传入 overlay 参数！

<svg viewBox={`0 0 ${width} ${height}`}>   {/* ← width/height 由 ResizeObserver 动态更新 */}
  <g transform={vp.transform}>              {/* ← 在无 overlay 场景下又做了一次缩放，双重缩放！ */}
    ...设计坐标内容...
  </g>
</svg>
```

#### 正确做法：三类合规布局体系（原“二选一”修订）

**方式A（纯设计坐标型，推荐）：viewBox 固定设计尺寸，SVG 自动居中缩放**

```tsx
// ✅ 方式A（推荐）：viewBox 固定为设计常量，preserveAspectRatio 负责自适应容器
// DESIGN_WIDTH/HEIGHT 必须与所用 CANVAS_PRESETS 完全一致
const DESIGN_WIDTH = 700   // 对应 CANVAS_PRESETS.full.width
const DESIGN_HEIGHT = 650  // 对应 CANVAS_PRESETS.full.height

// ⚠️ 注意：采用方式A且无需在 JS 中使用可视区几何裁切或浮层定位时，豁免对此类组件对 useViewport() 的强制调用，可彻底删除 void vp 等空调用！

<svg
  viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`}  // ← 恒定，不随容器变化
  preserveAspectRatio="xMidYMid meet"               // ← SVG 原生居中缩放
  className="w-full h-full"
>
  <g>  {/* 无 transform，直接用设计坐标 */}
    ...
  </g>
</svg>

// 若有 overlay（如右侧公式面板），首选使用 CSS absolute 定位而非 SVG overlay：
// <div className="relative">
//   <svg viewBox="0 0 700 650" ...>...</svg>
//   <div className="absolute right-0 top-0 w-[240px]"><FormulaPanel /></div>
// </div>
```

**方式B（坐标变换型，限制使用）：viewBox 绑定真实容器尺寸 + vp.transform**

> ⚠️ **方式B仅在需要 SVG 内部精确 overlay 避让时使用**（如 SVG 内部图表与物理场景共存，且必须精确控制各区块在 SVG 坐标系中的位置）。**首选方式A + CSS absolute overlay**，仅无法用 CSS 解决时才用方式B。

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

**方式C（可视区自适应型 / Canvas 动态布局）：基于 vp.visibleW/H/X/Y 像素区域自适应**

> ✅ **合法场景**：高频运动、复杂图表表盘、或依赖容器像素尺寸计算物理比例尺的场景（对应 `SceneLayoutProfile` 的 `visibleArea` 与 `centerScale` 模式）。

```tsx
// ✅ 方式C：利用可视区属性直接计算自适应坐标
const vp = useViewport(canvasSize, { designWidth: 700, designHeight: 400 })
// 结合 createSceneScaleFromViewport 快捷字面量生成比例尺
const sceneScale = createSceneScaleFromViewport(vp, 'visibleArea', { designWidth: 700, designHeight: 400 })

<svg width={canvasSize.width} height={canvasSize.height} className="w-full h-full">
  {/* 直接使用 canvasPos 或 worldToPixel(wx, wy, sceneScale) 计算后的真实像素位置渲染 */}
</svg>
```

#### 判断规则

| 情况 | 正确做法 |
|------|----------|
| 无 overlay，内容全屏居中 | **方式A**：viewBox = 固定设计常量，无 vp.transform（无 JS 裁切需求时豁免调用 useViewport）|
| 有 overlay 但可用 CSS 浮层 | **方式A + CSS absolute overlay**（首选，无首帧跳变）|
| 必须在 SVG 内部精确 overlay 避让 | **方式B**：viewBox = 真实容器尺寸 + vp.transform（**必须声明 overlay 参数**）|
| 动态力学图解 / 依赖动态比例尺 / Canvas | **方式C**：使用 `vp.visibleW/H/X/Y` 与 `createSceneScaleFromViewport` 快捷字面量在像素区自适应布局（对应 `visibleArea`/`centerScale`）|

#### 指针事件坐标映射对比

```tsx
// ❌ 旧做法（与 vp.transform 绑定，易出错）
const x = (e.clientX - rect.left - vp.tx) / vp.scale
const y = (e.clientY - rect.top - vp.ty) / vp.scale

// ✅ 方式A/B 推荐做法（SVG 原生矩阵变换，精确可靠）
const pt = svg.createSVGPoint()
pt.x = e.clientX; pt.y = e.clientY
const { x, y } = pt.matrixTransform(svg.getScreenCTM()!.inverse())

// ✅ 方式C 推荐做法：通过容器 bounding rect 与物理比例尺反算
const { x: px, y: py } = canvasToPhysics(e.clientX - rect.left, e.clientY - rect.top, visibleW, visibleH, scale)
```


### 2.6 验收标准

| 检查项 | 标准 |
|--------|------|
| SVG 标签 | 采用方式 A/B 时使用 `viewBox` + `preserveAspectRatio`；采用方式 C（可视区像素自适应）时明确声明尺寸或 `w-full h-full` |
| **viewBox 值** | **严禁在未传 overlay 参数时，`viewBox={\`0 0 ${width} ${height}\`}` 同时使用 `<g transform={vp.transform}>`（双重缩放）** |
| **布局模式选择** | **采用方式 A 时 viewBox 绑定设计常量；采用方式 B 时必须在 `useViewport` 声明 overlay 参数；采用方式 C 时使用 `vp.visible*` 做可视区像素定位** |
| 布局坐标 | 使用比例常量计算，禁止散落的无语义像素值 |
| 物理比例尺 | 优先使用 `createSceneScaleFromViewport(vp, 'visibleArea')` 或 `computeScale()` 计算，禁止硬编码恒等缩放绕过归一化 |
| 字体大小 | SVG 内使用 `fontSize={font(N)}`，画布内 HTML 使用 `style={{ fontSize: font(N) }}`，禁止裸值 |
| 响应式 | 调整浏览器窗口大小时，布局比例保持不变，无视觉跳变 |
| **指针事件** | **方式 A/B 组件使用 `getScreenCTM().inverse()` 矩阵变换；方式 C 统一扣除容器与边距偏移，禁止散落的手动算式** |
| **useViewport** | **按需调用：方式 A 无计算需求时豁免调用（消除 void vp）；方式 B 明确传 overlay；方式 C 消费 visible 属性做动态布局** |


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
