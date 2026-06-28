# 延后处理待办事项

> 最后更新：2026-06-28（架构核查后更新）

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

### 3.1 animationRegistry 懒加载（P0，已评估，待执行）

**方案**：两级拆分（core / extended），路由级预加载。

| 层级 | 内容 | 加载方式 | 预估体积 |
|------|------|----------|----------|
| Core（同步） | 力学 6 文件（kinematics/dynamics/circular-gravitation/force-motion/energy/momentum） | 首屏同步 import | ~30 KB |
| Extended（懒加载） | 电磁学 5 + 热学 4 + 光学 4 = 13 文件 | 动态 `import()` | ~37 KB |

**接口设计**：
- `getAnimationConfig(id)` — 同步，只保证 core 同步命中
- `getAnimationConfigAsync(id)` — 扩展动画统一走此异步接口
- `preloadExtendedRegistry()` — 用户进入电磁学、热学、光学模块页时调用
- `ANIMATION_COUNT` — 静态常量，不要为计数加载扩展包

**调用方改造**：
- `AnimationPage` / `useAnimationLifecycle` — 改为优先支持 async

**风险与执行策略**：

> 核心风险：同步 config 改异步后对 `AnimationPage → config 获取 → useAnimationLifecycle 初始化` 链路的时序影响。

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| config 异步中间状态 | 中 | `AnimationPage` 增加明确状态机（loading/loaded/notFound/error），不依赖 `config == null` 散落判断 |
| 路由/预加载时序 | 中 | `/animation/:id` 为统一路由，不在路由层区分 core/extended；extended registry 在组件层加载 |
| 测试 mock | 低-中 | 补 `getAnimationConfigAsync`、direct URL 访问 extended 动画、loading→loaded 生命周期时序测试 |
| count 维护 | 低 | 常量或文档约定，不影响拆分决策 |

**执行顺序**：
1. 先设计 `AnimationPage` 状态机（loading/loaded/notFound/error），确保外层传入 config 已 ready 后 `useAnimationLifecycle` 才初始化
2. 再实现 core/extended 拆分 + `getAnimationConfigAsync`
3. 最后补测试

**收益**：首屏 registry chunk 从 66.65 KB 降至 ~30 KB（减少 ~37 KB raw / ~10 KB gzip）。

工作量：2-3 天（含 loading 状态设计）。

### 3.2 params 类型安全 — 内部具名接口（P1）— ✅ 已完成

`types.ts` 新增 `ParamDefs<T>` + `normalizeParams()` 工具函数；kinematics/momentum/dynamics 三个高频构建器引入具名接口 + 默认值映射，外部签名不变。

已覆盖 3 文件 168 处 `params.xxx` 访问。剩余 21 个构建器文件可按需分批迁移。

### 3.3 AnimationConfig 泛型联动（P2）— ✅ 已完成

`AnimationConfig<P>` 泛型化，`defineAnimations<T>` 支持类型推断，19 个 registry 文件共 57 处 `defaultParams` 添加 `as const` 编译期校验。

### 3.4 useAnimationStore 类型安全与一致性（P1）— 🆕 待执行

> 2026-06-28 架构核查新增。当前 store 95 行，结构清晰，但存在以下具体问题：

**问题清单**：

| # | 问题 | 位置 | 修复方案 |
|---|------|------|---------|
| A | `params: Record<string, number>` 无类型约束，244+ 处引用无编译时保障 | line 10 | 与 3.2 `ParamDefs<T>` 联动，registry 级别约束 params 类型 |
| B | `setPhysicsState` 同时接受值和函数更新器，其他 setter 只接受值 — 接口不一致 | line 74 | 统一为函数更新器模式，或移除函数重载 |
| C | `reset()` 未重置 `lastChangedParam`，可能残留高亮状态 | line 77-94 | 在 reset 中追加 `lastChangedParam: null` |

**不在本次范围**：
- store 拆分（当前 95 行无需拆分，过早拆分增加复杂度）
- 添加 persist/devtools 中间件（按需时引入）

工作量：0.5-1 天。

### 3.5 AnimationPage 协调职责监控（P2，观察性）

> 2026-06-28 架构核查新增。当前 370 行，已提取 `AnimationCenter` / `RightPhysicsPanel` 两个内部组件隔离 Zustand 订阅。

**当前可接受**，但以下 3 个区域最易膨胀：

| 区域 | 行号 | 膨胀触发条件 |
|------|------|-------------|
| 参数过滤（showIf/hideIf） | 236-255 | 新增条件分支逻辑 |
| SidebarExtra props 组装 | 258-273 | 新增传递给侧边栏的 props |
| 模式切换（discovery/animation） | 289-307 | 新增第三种模式 |

**触发拆分的阈值**：行数 > 500 或职责 > 8 类。当前不拆分。

### 3.6 expandedNodes 数组 → Set（P3，按需）

`useKnowledgeStore.ts` 中 `expandedNodes: string[]`，O(n) includes。当前节点 < 200，无感知性能问题。节点 500+ 时再评估。

### 3.7 其他

| 条目 | 前提条件 |
|---|---|
| `WrongPage.renderCard` 提取为 `React.memo` | `WrongCard` 已有 `React.memo`，但 `menuFor` 状态只影响被点击的单张卡，收益有限；视后续性能需求决定 |
| `RightPhysicsPanel` 计算逻辑抽取 | 当前 `useMemo` 与展示组件在同一文件（AnimationPage:157-188），可抽取为独立 hook 提升测试独立性；优先级低 |
