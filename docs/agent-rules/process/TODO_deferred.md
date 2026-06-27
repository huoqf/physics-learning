# 延后处理待办事项

> 最后更新：2026-06-27

---

## 一、超长文件拆分（P0）— ✅ 全部完成

### 待处理

（无）

> 以下动画组件亦超 500 行，可关注拆分：
> - `EnergyConservationAnimation.tsx` — 657
> - `UniformAccelerationCenterExtra.tsx` — 560

### 已完成

| 文件 | 拆分方式 | 日期 |
|---|---|---|
| ~~`electromagnetism.ts`~~ → `electromagnetism/` | 5 域模块 + index 调度器（1,517 → 6 模块） | 2026-06-27 |
| ~~`SpringCompositeAnimation.tsx`~~ | 提取 `SpringEnergyChartContent` + `SpringForceChartContent`（1,271 → 630 + 395 + 325） | 2026-06-27 |
| ~~`MomentumApplicationAnimation.tsx`~~ | 提取 `CurvedSlotModel` + `SpringBlocksModel` + `ManBoatModel`（1,171 → 108 + 160 + 170 + 255） | 2026-06-27 |
| ~~`dynamics.ts`~~ → `dynamics/` | 6 模块（1,074 → 6 模块） | 2026-06-27 |
| ~~`SatelliteAnimation.tsx`~~ | 提取 `satelliteLayout` + `SatelliteShapes` + `useSatellitePhysics` + `useOrbitCurves`（1,138 → 343 + 48 + 51 + 183 + 32） | 2026-06-27 |

---

## 二、响应式缩放（P1）

- **A 类** SVG fontSize 裸值：已迁移 8 文件（力学 3 + 电磁学 5），剩余 11 文件纯硬编码 + 1 文件混合。详见 [`FONT_SIZE_AUDIT.md`](./FONT_SIZE_AUDIT.md)
- **C 类** Tailwind text-[Npx]：42 处 / 17+ 文件（sidebar/panel 面板大量使用）
- **D 类** useCanvasSize → CANVAS_PRESETS：已迁移 65/76 调用点，剩余 11 为占位符/紧凑子场景/唯一尺寸/动态传入，不建议替换。详见 [`CANVAS_PRESETS_AUDIT.md`](./CANVAS_PRESETS_AUDIT.md)

---

## 三、代码质量审查（P2 预防性优化）

| 条目 | 前提条件 |
|---|---|
| `WrongPage.renderCard` 提取为 `React.memo` | `WrongCard` 已有 `React.memo`，但 `menuFor` 状态只影响被点击的单张卡，收益有限；视后续性能需求决定 |
