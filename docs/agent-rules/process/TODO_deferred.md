# 延后处理待办事项

> 最后更新：2026-06-27

---

## 一、超长文件拆分（P0）— ✅ 全部完成

### 待处理

（无）

> 以下文件仍超 400 行，可关注拆分：
> - `lightRodRope/trajectory.ts` — 485（主积分函数，3 种模式共享 20+ 状态变量，拆分风险高）
> - `momentumApplication.ts` — 462
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
| ~~`forceMotion.ts`~~ → `forceMotion/` | index + types + utils + 10 个 modes/*（716 → 13 模块） | 2026-06-27 |
| ~~`lightRodRope.ts`~~ → `lightRodRope/` | index + types + interpolate + trajectory（795 → 4 模块） | 2026-06-27 |
| ~~`magnetism.ts`~~ → `magnetism/` | index + forces + ampereForce + velocitySelector（556 → 4 模块） | 2026-06-27 |

---

## 二、响应式缩放（P1）

- **A 类** SVG fontSize 裸值：已迁移 8 文件（力学 3 + 电磁学 5），剩余 11 文件纯硬编码 + 1 文件混合。详见 [`FONT_SIZE_AUDIT.md`](./FONT_SIZE_AUDIT.md)
- **C 类** Tailwind text-[Npx]：42 处 / 17+ 文件（sidebar/panel 面板大量使用）
- **D 类** useCanvasSize → CANVAS_PRESETS：已迁移 65/76 调用点，剩余 11 为占位符/紧凑子场景/唯一尺寸/动态传入，不建议替换。详见 [`CANVAS_PRESETS_AUDIT.md`](./CANVAS_PRESETS_AUDIT.md)

---

## 三、代码质量（P2 预防性优化）

### 3.1 animationRegistry 懒加载（P0，最高风险）

`animationRegistry.ts` 20 个同步 import，chunk 66.59 KB raw / 17.35 KB gzip。改为按前缀动态 `import()`，`getAnimationConfig` 变 async。

**风险**：唯一运行时调用点 `useAnimationLifecycle.ts:35` 需重构；需设计 config 未加载时的 loading/fallback UI；路由切换中间状态处理；测试 mock 策略。

工作量：2-3 天（含 loading 状态设计）。

### 3.2 params 类型安全 — 内部具名接口（P1）

`physicsQuantities.ts` 是动态分发层，调用方传 `Record<string, number>`，无法改具名签名。方案：构建器内部定义具名接口 + `normalizeParams()` 归一化，外部签名不变。

当前 354 处 `params.xxx` 未类型化访问，分布在 24 个量构建器文件中。

优先文件（按访问频次）：kinematics(57) / momentum(57) / dynamics(54)

工作量：3 个高频文件约 1.5-2 天，随需求分批。

### 3.3 AnimationConfig 泛型联动（P2）

`defaultParams` 类型与量构建器参数类型联动，缺少必要 key 时编译期报错。

工作量：3-5 天，规划季度。

### 3.4 expandedNodes 数组 → Set（P3，按需）

`useKnowledgeStore.ts` 中 `expandedNodes: string[]`，O(n) includes。当前节点 < 200，无感知性能问题。节点 500+ 时再评估。

### 3.5 其他

| 条目 | 前提条件 |
|---|---|
| `WrongPage.renderCard` 提取为 `React.memo` | `WrongCard` 已有 `React.memo`，但 `menuFor` 状态只影响被点击的单张卡，收益有限；视后续性能需求决定 |
