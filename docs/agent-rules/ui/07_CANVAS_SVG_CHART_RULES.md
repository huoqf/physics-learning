# Canvas/SVG/图表动态布局与渲染规范

> 优先级：低于 02_UI_RULES.md，高于动画实现细节
> 最后更新：2026-06-16

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

### 2.2 推荐方案：useCanvasSize + computeScale（首选）

所有动画组件**必须**使用 `useCanvasSize()` 获取画布尺寸，通过返回的 `scale` / `px()` / `font()` 函数进行响应式缩放：

```tsx
const [containerRef, { width, height, scale, px, font }] = useCanvasSize(CANVAS_PRESETS.wide)
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

### 2.3 备选方案：viewBox + 比例常量

```ts
// ✅ 推荐：使用 viewBox + 比例常量
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

### 2.5 进阶方案：归一化坐标系（可选）

对于需要更高灵活性的场景，可使用归一化坐标系 (100 x 60)：

```ts
const scene = {
  width: 100,
  height: 60,
  paddingX: 8,
  paddingY: 6,
  centerY: 30,
}

const regions = {
  scene: {
    x: scene.paddingX,
    y: scene.paddingY,
    w: (scene.width - scene.paddingX * 2) * 0.6,
    h: scene.height - scene.paddingY * 2,
  },
  // ...
}

<svg viewBox={`0 0 ${scene.width} ${scene.height}`} preserveAspectRatio="xMidYMid meet">
```

> **注意**：归一化坐标需要同步更新所有子组件内部坐标，改动范围较大，非必要不采用。

### 2.6 验收标准

| 检查项 | 标准 |
|--------|------|
| SVG 标签 | 使用 `viewBox` + `preserveAspectRatio`，禁止 `width/height` 硬编码像素 |
| 布局坐标 | 使用比例常量计算，禁止散落的无语义像素值 |
| 物理比例尺 | 使用 `computeScale()` 计算，禁止 `scale = N` 硬编码 |
| 字体大小 | SVG 内使用 `fontSize={font(N)}`，画布内 HTML 使用 `style={{ fontSize: font(N) }}`，禁止裸值 |
| 响应式 | 调整浏览器窗口大小时，布局比例保持不变 |

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

### 7.1 图表基本要求

| 项目 | 规范 |
|------|------|
| 坐标轴样式 | 来自 `canvasStyle.ts`，标注物理量和单位 |
| 曲线颜色 | 从 `chartColors.ts` 或物理量颜色映射 |
| 网格 | 默认弱化，可选 Toggle |
| 数据点 | 不超过必要数量，避免干扰理解 |
| 图例 | 同屏 > 2 条曲线才显示 |
| 动态尺寸 | 按容器比例计算，有 min/max |
| 小图（AnalysisPage） | SVG，元素 ≤ 5 个 |

### 7.2 常见物理图表类型

| 图表类型 | 物理意义 | 推荐技术 |
|----------|----------|----------|
| v-t 图 | 速度-时间曲线 | SVG 或 Canvas |
| a-t 图 | 加速度-时间曲线 | SVG 或 Canvas |
| s-t 图 | 位移-时间曲线 | SVG 或 Canvas |
| F-x 图 | 力-位移曲线（做功图） | SVG 或 Canvas |
| T²-a³ 图 | 开普勒第三定律验证 | SVG 或 Canvas |
| P-V 图 | 热力学过程图 | SVG 或 Canvas |
| U-I 图 | 电压-电流特性 | SVG 或 Canvas |

---

## 8. 信息密度与降级策略

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
| 组件内写 `requestAnimationFrame` | 使用 `src/utils/animation.ts` |
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
