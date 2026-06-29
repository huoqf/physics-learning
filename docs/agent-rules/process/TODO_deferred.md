# 延后处理待办事项

> 最后更新：2026-06-28（矢量审计完成、懒加载预加载完成后更新）

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

### 3.1 animationRegistry 懒加载（P0，路由级预加载 ✅ 已完成）

> 核心拆分（core/extended 两级）+ `getAnimationConfigAsync` 已在之前完成。
> 2026-06-28 新增路由级预加载，解决首次加载 chunk 失败白屏问题。

**已完成**：
- `src/utils/lazyWithPreload.ts` — 包装 `React.lazy`，自动暴露 `preload()` 方法
- 19 个 registry 文件：`import { lazy }` → `import { lazyWithPreload as lazy }`
- `KnowledgeTree.tsx`：`onMouseEnter` 触发 `config.Component.preload?.()`
- `AnimationPage.tsx`：3 处 `Suspense fallback={null}` → 可见 loading 态
- `AnimationConfig.Component` 类型扩展 `preload?` 方法

**效果**：用户 hover 知识点卡片时预取 chunk，首次进入时大概率已缓存。配合 visible fallback + ErrorBoundary retry，白屏体验彻底消除。

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

### 3.8 缺失场景色 token（P2）

| 文件 | 硬编码值 | 用途 | 建议 token 名 |
|------|---------|------|-------------|
| `ManBoatAnimation.tsx:269` | `#0284c7` | 水面填充色 | `SCENE_COLORS.mechanics.waterSurface` |
| `ManBoatAnimation.tsx:273` | `#0ea5e9` | 水波纹描边 | `SCENE_COLORS.mechanics.waterRipple` |
| `CurvedSlotAnimation.tsx:213,221` | `#FFFFFF` | 弧形槽内弧高光 | `SCENE_COLORS.materials.slotHighlight`（通用白色高光，优先级低） |

> 待 `src/theme/physics/scene/mechanics.ts` 新增对应 token 后替换。
