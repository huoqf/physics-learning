# 延后处理待办事项

> 最后更新：2026-06-26

---

## 一、动画组件拆分（P0 — 超 500 行）

| 文件 | 行数 |
|---|---|
| UniformAccelerationCenterExtra.tsx | 603 |
| EnergyConservationAnimation.tsx | 567 |

---

## 二、响应式缩放（P1）

- **A 类** SVG fontSize 裸值：已迁移 8 文件（力学 3 + 电磁学 5），剩余 11 文件纯硬编码 + 1 文件混合。详见 [`FONT_SIZE_AUDIT.md`](./FONT_SIZE_AUDIT.md)
- **C 类** Tailwind text-[Npx]：42 处 / 17+ 文件（sidebar/panel 面板大量使用）
- **D 类** useCanvasSize → CANVAS_PRESETS：已迁移 65/76 调用点，剩余 11 为占位符/紧凑子场景/唯一尺寸/动态传入，不建议替换。详见 [`CANVAS_PRESETS_AUDIT.md`](./CANVAS_PRESETS_AUDIT.md)

---

## 三、Viewport 架构（P1）

### 进度

- ✅ 42/44 Animation 组件已完成 useViewport 迁移（含 Transformer.tsx）
- ⏳ 剩余 2 个光学组件使用固定 viewBox 方案，待迁移：
  - `ReflectionAnimation.tsx`（低风险，~225 行，无拖拽）
  - `ThinLensAnimation.tsx`（中等风险，~811 行，含拖拽 + foreignObject）

### 硬约束（迁移时遵守）

- transform 必须采用设计稿左上角语义
- overlay 和 DOM panel 尺寸来自同一计算结果
- 不让组件反向 import registry
- `ThinLensAnimation` 迁移后须人工验证两种模式（基础/共轭法）和拖拽精度

### 参考

- 迁移指南见 [`VIEWPORT_AUDIT.md §4`](../../VIEWPORT_AUDIT.md)
