# Canvas/SVG/图表动态布局与渲染规范

> 优先级：低于 02_UI_RULES.md，高于动画实现细节
> 最后更新：2026-06-08

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

## 2. 动态布局原则

### 2.1 尺寸计算来源（允许的）

Canvas/SVG/图表布局必须优先基于以下方式计算：

| 类型 | 来源 | 示例 |
|------|------|------|
| 语义化比例 | `canvasStyle.ts` 或 feature 配置 | `chartWidthRatio = 0.28` |
| 语义化上下限 | `canvasStyle.ts` | `minPointRadius = 4`, `maxVectorLengthRatio = 0.4` |
| 主题 token | `@/theme/physics`, `@/theme/colors` | `lineWidth.primary`, `fontSize.label` |
| 容器尺寸测量 | 运行时容器测量 | `canvasRef.current.clientWidth` |
| 物理坐标范围 | 物理计算值 + 坐标转换 | 缩放比例基于物理范围自动计算 |

### 2.2 禁止的做法

```ts
// ❌ 禁止：组件内硬编码最终像素尺寸
const chartX = canvasSize.width - 180;
const pointRadius = 6;

// ❌ 禁止：硬编码图表尺寸
const chart = { width: 200, height: 150 };
```

### 2.3 推荐做法

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

## 3. 魔法数字判定表

本规范禁止「无语义裸数字」，但不是禁止所有数字。以下是明确的判定规则：

| 数值类型 | 组件内是否允许 | 处理方式 |
|----------|----------------|----------|
| 业务规则常量 | ✅ 允许（建议常量化） | 放入 `canvasStyle.ts` 或 feature 配置，加注释 |
| 物理常量 | ✅ 允许 | 来自 `physics/constants.ts`，带 JSDoc |
| 数学常量（Math.PI, 0.5） | ✅ 允许 | 直接使用，复杂语义需命名 |
| 视觉尺寸（16px, 180px） | ❌ 禁止 | 从 `@/theme` 或 `canvasStyle.ts` 导入 |
| 颜色值（#2563EB, rgb()） | ❌ 禁止 | 从 `@/theme/physics` 导入 |
| 动效时长（150ms, 250ms） | ❌ 禁止 | 从 `@/theme/motion` 导入 |
| 响应式比例（0.28） | ⚠️ 不建议裸写 | 放入 `canvasStyle.ts`，命名为 `chartWidthRatio` |

### 3.1 示例：正确 vs 错误

```ts
// ❌ 错误：无语义裸数字
const radius = 5;
const margin = 10;

// ✅ 正确：命名为常量或从主题导入
const { minPointRadius, margin } = CANVAS_STYLE;
```

---

## 4. 坐标系统分层

### 4.1 三类坐标的职责分离

| 坐标类型 | 来源 | 转换/计算 | 用途 |
|----------|------|----------|------|
| 物理坐标 | `physics/` 计算 | 物理世界的真实值 | 位移、速度、力、轨道半径 |
| Canvas 坐标 | `coordinate.ts` 转换 | 必须使用 `physicsToCanvas()` | 实际绘制位置 |
| 布局坐标 | `canvasLayout.ts` 计算 | 图表 inset、图例位置、标注避让 | 非物理元素布局 |

### 4.2 禁止的做法

```ts
// ❌ 禁止：组件内手写坐标计算
const canvasX = centerX + physicsX * scale;
```

### 4.3 推荐的做法

```ts
// ✅ 推荐：统一使用 coordinate.ts
import { physicsToCanvas } from '@/utils/coordinate';

const [canvasX, canvasY] = physicsToCanvas(physicsX, physicsY, canvasSize, scale);
```

---

## 5. canvasStyle.ts 职责边界

### 5.1 canvasStyle.ts 应该包含

- 线宽 token（矢量、标注、坐标轴、网格等）
- 箭头样式（长度、角度、head 尺寸）
- 标注字体大小与样式
- 网格/坐标轴样式
- 图表 inset 比例与上下限
- 可读性下限（minPointRadius, minArrowLength 等）
- Canvas/SVG 统一 marker 规则

### 5.2 canvasStyle.ts 不应该包含

- 具体物理计算
- 某个动画组件的专属业务参数
- 页面外层布局宽度
- 具体 DOM 结构
- 运行时容器测量

---

## 6. 物理图表规范

### 6.1 图表基本要求

| 项目 | 规范 |
|------|------|
| 坐标轴样式 | 来自 `canvasStyle.ts`，标注物理量和单位 |
| 曲线颜色 | 从 `chartColors.ts` 或物理量颜色映射 |
| 网格 | 默认弱化，可选 Toggle |
| 数据点 | 不超过必要数量，避免干扰理解 |
| 图例 | 同屏 > 2 条曲线才显示 |
| 动态尺寸 | 按容器比例计算，有 min/max |
| 小图（AnalysisPage） | SVG，元素 ≤ 5 个 |

### 6.2 常见物理图表类型

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

## 7. 信息密度与降级策略

### 7.1 信息优先级

| 层级 | 内容 | 降级策略 |
|------|------|----------|
| 必要层 | 物体、主轨迹、坐标轴 | 最后隐藏 |
| 重要层 | 主矢量、核心标注 | 空间不足时先隐藏分量 |
| 辅助层 | 网格、参考线 | 默认可选，空间不足自动隐藏 |
| 分析层 | 历史轨迹、额外解释 | 默认隐藏，Toggle 开启 |

### 7.2 降级触发条件

- Canvas 可见元素 > 7 个
- 容器尺寸 < 最小阈值
- 元素尺寸 < 可读性下限

---

## 8. 禁止项与推荐替代

| 禁止做法 | 推荐替代 |
|----------|----------|
| 组件内写 HEX 颜色 | 从 `@/theme/colors` 或 `@/theme/physics` 导入 |
| 组件内写 `requestAnimationFrame` | 使用 `src/utils/animation.ts` |
| 手写 `centerX + x * scale` | 使用 `physicsToCanvas()` |
| 固定图表 `185px × 120px` | 使用容器比例 + min/max |
| Canvas 内用 lucide 图标 | 使用 SVG 路径或绘制函数 |

---

## 9. 相关文档与 Checklist

- [02_UI_RULES.md](./02_UI_RULES.md)：UI 视觉铁律
- [PROCESS_LOG.md](../process/PROCESS_LOG.md)：工程日志
- [CHECKLIST.md](../process/CHECKLIST.md)：提交流程 Checklist（特别是「Canvas/SVG/图表检查」部分）
