# 延后处理待办事项

> 最后更新：2026-06-27

---

## 一、超长文件 Top 5（P0 — 需拆分/重构）

| # | 文件 | 行数 | 状态 |
|---|---|---|---|
| 1 | ~~`src/data/quantities/electromagnetism.ts`~~ → `electromagnetism/` | 1,517 → 6 模块 | ✅ 已完成 |
| 2 | `src/features/mechanics/energy/SpringCompositeAnimation.tsx` | 1,271 | ⬜ 待处理 |
| 3 | `src/features/mechanics/momentum/MomentumApplicationAnimation.tsx` | 1,065 | ⬜ 待处理 |
| 4 | `src/features/mechanics/gravitation/SatelliteAnimation.tsx` | 1,049 | ⬜ 待处理 |
| 5 | ~~`src/physics/dynamics.ts`~~ → `dynamics/` | 1,074 → 6 模块 | ✅ 已完成 |

> 补充：以下动画组件亦超 500 行，需关注拆分：
> - `EnergyConservationAnimation.tsx` — 657
> - `UniformAccelerationCenterExtra.tsx` — 560

### 拆分风险评估（2026-06-27）

| # | 文件 | 风险 | 消费者 | 关键因素 |
|---|---|---|---|---|
| 1 | ~~`electromagnetism.ts`~~ | ~~🟢 **低**~~ | ~~1~~ | ✅ **已完成**（2026-06-27）。拆为 5 个域模块（electrostatics/dc-circuits/magnetism/induction/ac）+ index.ts 调度器，`tsc --noEmit` 零错误。`physicsQuantities.ts` 注册表无需改动。 |
| 2 | `SpringCompositeAnimation.tsx` | 🟢 **低** | 1（懒加载） | `SpringEnergyChartContent`(405行) + `SpringForceChartContent`(338行) 均为纯 props 驱动的内部渲染组件，提取为同级文件零耦合。主文件降至 ~620 行；进一步抽取 `useSpringAnimation` hook 可至 ~400 行。 |
| 3 | `MomentumApplicationAnimation.tsx` | 🟢 **低** | 1（懒加载） | 3 个物理模型（曲槽/弹簧/人船）完全独立，`modelType` 门控已是天然边界。零交叉依赖，各自提取为独立组件 + 1 个编排器即可。Model 2 的键盘逻辑需抽为 `useManBoatKeyboard` hook。 |
| 4 | `SatelliteAnimation.tsx` | 🟢 **低** | 1（懒加载） | 可拆为 6-7 个文件：`LAYOUT` 配置、Kepler 物理 hook、v-t 采样 hook、SVG 形状组件、Mode-0/Mode-1 场景、图表交互。难点：`renderEarth` 在 3 处被闭包调用，需提取为 props 传入的独立组件。 |

**优先级建议**：先处理 #1（数据层拆分，无 UI 风险）和 #3（模型间零耦合，机械拆分），再处理 #2（提取内部组件），最后处理 #4（闭包依赖较多）。

---

## 二、响应式缩放（P1）

- **A 类** SVG fontSize 裸值：已迁移 8 文件（力学 3 + 电磁学 5），剩余 11 文件纯硬编码 + 1 文件混合。详见 [`FONT_SIZE_AUDIT.md`](./FONT_SIZE_AUDIT.md)
- **C 类** Tailwind text-[Npx]：42 处 / 17+ 文件（sidebar/panel 面板大量使用）
- **D 类** useCanvasSize → CANVAS_PRESETS：已迁移 65/76 调用点，剩余 11 为占位符/紧凑子场景/唯一尺寸/动态传入，不建议替换。详见 [`CANVAS_PRESETS_AUDIT.md`](./CANVAS_PRESETS_AUDIT.md)

---

## 三、代码质量审查 — P2 预防性优化（待观察）

| # | 条目 | 前提条件 |
|---|---|---|
| 3-1 | `WrongPage.renderCard` 提取为 `React.memo` 组件 | `WrongCard` 已有 `React.memo`，但 `menuFor` 状态只影响被点击的单张卡，收益有限；视后续性能需求决定 |
