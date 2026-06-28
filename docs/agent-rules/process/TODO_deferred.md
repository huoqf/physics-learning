# 延后处理待办事项

> 最后更新：2026-06-28

---

## 一、超长文件拆分（P0）— ✅ 全部完成

> 仅剩 `lightRodRope/trajectory.ts` (485行) 可关注拆分，但因 3 种模式共享 20+ 状态变量，拆分风险高，暂不处理。

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

### 3.2 params 类型安全 — 内部具名接口（P1）— ✅ 已完成

`types.ts` 新增 `ParamDefs<T>` + `normalizeParams()` 工具函数；kinematics/momentum/dynamics 三个高频构建器引入具名接口 + 默认值映射，外部签名不变。

已覆盖 3 文件 168 处 `params.xxx` 访问。剩余 21 个构建器文件可按需分批迁移。

### 3.3 AnimationConfig 泛型联动（P2）— ✅ 已完成

`AnimationConfig<P>` 泛型化，`defineAnimations<T>` 支持类型推断，19 个 registry 文件共 57 处 `defaultParams` 添加 `as const` 编译期校验。

### 3.4 expandedNodes 数组 → Set（P3，按需）

`useKnowledgeStore.ts` 中 `expandedNodes: string[]`，O(n) includes。当前节点 < 200，无感知性能问题。节点 500+ 时再评估。

### 3.5 其他

| 条目 | 前提条件 |
|---|---|
| `WrongPage.renderCard` 提取为 `React.memo` | `WrongCard` 已有 `React.memo`，但 `menuFor` 状态只影响被点击的单张卡，收益有限；视后续性能需求决定 |
