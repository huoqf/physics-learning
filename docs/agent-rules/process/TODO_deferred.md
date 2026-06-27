# 延后处理待办事项

> 最后更新：2026-06-27（2026-06-27 追加：代码质量审查 P0-P3 条目）

---

## 一、超长文件 Top 5（P0 — 需拆分/重构）

| # | 文件 | 行数 | 状态 |
|---|---|---|---|
| 1 | `src/data/quantities/electromagnetism.ts` | 1,517 | ⬜ 待处理 |
| 2 | `src/features/mechanics/energy/SpringCompositeAnimation.tsx` | 1,271 | ⬜ 待处理 |
| 3 | ~~`src/physics/kinematics.ts`~~ → `src/physics/kinematics/` | 1,253 → 7 模块 | ✅ 已完成 |
| 4 | `src/features/mechanics/momentum/MomentumApplicationAnimation.tsx` | 1,065 | ⬜ 待处理 |
| 5 | `src/features/mechanics/gravitation/SatelliteAnimation.tsx` | 1,049 | ⬜ 待处理 |

> 补充：以下动画组件亦超 500 行，需关注拆分：
> - `EnergyConservationAnimation.tsx` — 657
> - `UniformAccelerationCenterExtra.tsx` — 560

### 拆分风险评估（2026-06-27）

| # | 文件 | 风险 | 消费者 | 关键因素 |
|---|---|---|---|---|
| 1 | `electromagnetism.ts` | 🟢 **低** | 1（动态导入） | 20 个独立 switch case，无共享状态，67% 为内联数据字面量。可按域拆为 5 个子模块（静电/直流/磁学/感应/交流），`physicsQuantities.ts` 改指向即可。 |
| 2 | `SpringCompositeAnimation.tsx` | 🟢 **低** | 1（懒加载） | `SpringEnergyChartContent`(405行) + `SpringForceChartContent`(338行) 均为纯 props 驱动的内部渲染组件，提取为同级文件零耦合。主文件降至 ~620 行；进一步抽取 `useSpringAnimation` hook 可至 ~400 行。 |
| 3 | ~~`kinematics.ts`~~ | ~~🟡 **中**~~ | ~~21~~ | ✅ **已完成**（2026-06-27）。拆为 7 个子模块（base/velocity/formulas/vertical-throw/acceleration/trajectory/interpolators），`tsc --noEmit` 零错误，37/37 测试通过。4 个直接消费者已改为 `@/physics`。 |
| 4 | `MomentumApplicationAnimation.tsx` | 🟢 **低** | 1（懒加载） | 3 个物理模型（曲槽/弹簧/人船）完全独立，`modelType` 门控已是天然边界。零交叉依赖，各自提取为独立组件 + 1 个编排器即可。Model 2 的键盘逻辑需抽为 `useManBoatKeyboard` hook。 |
| 5 | `SatelliteAnimation.tsx` | 🟢 **低** | 1（懒加载） | 可拆为 6-7 个文件：`LAYOUT` 配置、Kepler 物理 hook、v-t 采样 hook、SVG 形状组件、Mode-0/Mode-1 场景、图表交互。难点：`renderEarth` 在 3 处被闭包调用，需提取为 props 传入的独立组件。 |

**优先级建议**：先处理 #1（数据层拆分，无 UI 风险）和 #4（模型间零耦合，机械拆分），再处理 #2（提取内部组件），最后处理 #5（闭包依赖较多）。

---

## 二、响应式缩放（P1）

- **A 类** SVG fontSize 裸值：已迁移 8 文件（力学 3 + 电磁学 5），剩余 11 文件纯硬编码 + 1 文件混合。详见 [`FONT_SIZE_AUDIT.md`](./FONT_SIZE_AUDIT.md)
- **C 类** Tailwind text-[Npx]：42 处 / 17+ 文件（sidebar/panel 面板大量使用）
- **D 类** useCanvasSize → CANVAS_PRESETS：已迁移 65/76 调用点，剩余 11 为占位符/紧凑子场景/唯一尺寸/动态传入，不建议替换。详见 [`CANVAS_PRESETS_AUDIT.md`](./CANVAS_PRESETS_AUDIT.md)

---

## 三、Viewport 架构（P1）

### 进度

- ✅ 44/44 Animation 组件已完成 useViewport 迁移（含 Transformer.tsx、ReflectionAnimation、ThinLensAnimation）

---

## 四、代码质量审查 — P0 确定性问题（2026-06-27）

> 来源：代码质量分析报告。以下为有实际 bug 或确定性性能问题的条目，建议本周内修复。

### 4-1  `useKnowledgeStore` — `Set` 序列化风险

- **文件**：`src/stores/useKnowledgeStore.ts`
- **问题**：`expandedNodes: new Set<string>()` 在 `JSON.stringify` 后变为 `{}`，若未来对该 store 加 `persist` 中间件，数据将静默丢失。
- **修复**：将 `Set` 改为 `string[]`，读取时按需 `new Set(arr)`，写回时 `Array.from(set)`。
- **状态**：✅ 已完成（2026-06-27）

### 4-2  `useKnowledgeStore.setCurrentNode` — 连续三次 `set` 调用

- **文件**：`src/stores/useKnowledgeStore.ts` L19-L29
- **问题**：同一导航动作触发三次 Zustand 订阅者通知，导致不必要的三次重渲染。
- **修复**：合并为一次 `set((state) => ({ history, currentNode, expandedNodes }))` 原子更新。
- **状态**：✅ 已完成（2026-06-27），与 4-1 同步修复

### 4-3  `AnimationPage.AnimationCenter` — `maxTime` 忽略 `config.maxTime` 配置

- **文件**：`src/pages/AnimationPage.tsx` L49
- **问题**：`AnimationCenter` 内 `const maxTime = 30` 写死，永远不读取 `config.maxTime`；而 `useAnimationLifecycle` 已正确读取 `config?.maxTime ?? 30`。对于注册表中声明了自定义时长的动画，进度条范围将显示错误。
- **修复**：改为 `const maxTime = config.maxTime ?? 30`，与 `useAnimationLifecycle` 保持一致。
- **状态**：✅ 已完成（2026-06-27）

---

## 五、代码质量审查 — P1 可维护性问题（2026-06-27）

> 不会立即 crash，修复成本极低，建议同步处理。

### 5-1  `storage.ts` — 内部函数与公开方法同名

- **文件**：`src/utils/storage.ts` L17 & L62
- **问题**：模块内部 `async function getDB()` 返回 DB 实例；`storage.getDB<T>(key)` 返回数据。同名不同签名，搜索/跳转易混淆。
- **修复**：内部函数改名为 `getOrOpenDB()`。
- **状态**：⬜ 待处理

### 5-2  `useProgressStore.reset` — 冗余状态覆盖

- **文件**：`src/stores/useProgressStore.ts` L75-L80
- **问题**：`...initialState` 之后又手动覆盖 `viewedAnimations: []` 和 `masteredKnowledge: []`，这两个字段在 `initialState` 中已是空数组，属无效重复代码。
- **修复**：`reset: () => set({ ...initialState })`
- **状态**：⬜ 待处理

---

## 六、代码质量审查 — P2/P3 预防性优化（2026-06-27）

> 以下条目需结合具体场景判断是否处理，不强制。

| # | 条目 | 优先级 | 前提条件 | 状态 |
|---|---|:---:|---|---|
| 6-1 | `AnimationCenter` 多次独立 store 订阅合并（`useShallow` + `getState` 分离） | P2 | 结合实际渲染频率验证是否有明显开销 | ⬜ |
| 6-2 | `sidebarExtraProps` / `handleReset` memo 化 | P2 | 仅当 `SidebarExtra`/`AnimationControls` 有 `React.memo` 包装时才有收益 | ⬜ |
| 6-3 | `WrongPage.renderCard` 提取为 `React.memo` 组件 | P2 | 当 `WrongCard` 渲染开销增大时处理，当前为风格建议 | ⬜ |
| 6-4 | `src/physics/` 纯函数单元测试补充 | P3 | 优先覆盖 `dynamics.ts`、`electrostatics.ts`、`kinematics/` | ⬜ |
| 6-5 | `dynamics.ts` 拆分（31KB，1153行） | P3 | 参考 `kinematics/` 拆分模式，按子主题建子目录 | ⬜ |
| 6-6 | `animationRegistry.ts` 注册表 lazy 加载 | P3 | 需先用 bundle 分析工具确认实际包体积影响再决策 | ⬜ |
