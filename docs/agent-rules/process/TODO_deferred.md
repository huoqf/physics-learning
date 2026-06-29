# 延后处理待办事项

> 最后更新：2026-06-29（按实际代码核对修正：超长文件行数、fontSize 裸值 3 处、AnimationPage 411 行、useAnimationStore 82 行）

---

## 一、超长文件拆分（P0/P1）— ⚠️ 需重新评估

> 原记录"全部完成"已过期。当前仍存在多个 800+ 行 TSX/TS 文件。
> 建议先按"高变更频率 + 高复杂度 + 可安全拆分"排序，而非单纯按行数拆分。

重点关注（>800 行）：
- `ACValues.tsx` 885 行
- `LightRodRopeAnimation.tsx` 849 行
- `CentripetalAnimation.tsx` 848 行
- `VectorAdditionAnimation.tsx` 808 行

其他 600-800 行：
- `WeightlessnessAnimation.tsx` 771 行
- `ThinLensAnimation.tsx` 760 行
- `MomentumTheoremAnimation.tsx` 757 行
- `CuttingEMF.tsx` 753 行
- `momentum.ts` 740 行
- `knowledgeTree.ts` 734 行
- `Transformer.tsx` 724 行
- `VelocitySelector.tsx` 720 行
- `lightRodRope/trajectory.ts` 587 行

---

## 二、响应式缩放（P1）

- **A 类** SVG fontSize 裸值：3 处 / 3 文件（`AmpereFIChart.tsx`、`WorkVTChart.tsx`、`FaradayChartPanel.tsx`）。其余均使用 `font()` 函数。详见 [`FONT_SIZE_AUDIT.md`](./FONT_SIZE_AUDIT.md)
- **C 类** Tailwind text-[Npx]：69 处 / 31 文件。主要集中在 sidebar、panel、内嵌数据卡片和 CenterExtra。建议按组件域逐批替换为 Tailwind 标准字号或主题化 class
- **D 类** useCanvasSize → CANVAS_PRESETS：`CANVAS_PRESETS` 调用 67 处，硬编码对象调用 14 处（有效约 11 个场景 + 1 个 BasePhysicsChart 动态调用 + 2 个注释示例）。详见 [`CANVAS_PRESETS_AUDIT.md`](./CANVAS_PRESETS_AUDIT.md)

---

## 三、代码质量（P2 预防性优化）

### 3.1 animationRegistry 懒加载（P0，路由级预加载 ✅ 已完成）

> 核心拆分（core/extended 两级）+ `getAnimationConfigAsync` 已在之前完成。
> 2026-06-28 新增路由级预加载，解决首次加载 chunk 失败白屏问题。
> 2026-06-29 复核：19/19 registry 文件仍使用 lazyWithPreload；`fallback={null}` 当前为 0。

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

> 2026-06-28 架构核查新增。当前 store 82 行，结构清晰，但存在以下具体问题：

**问题清单**：

| # | 问题 | 位置 | 修复方案 |
|---|------|------|---------|
| A | `params: Record<string, number>` 无类型约束，244+ 处引用无编译时保障 | line 11 | 与 3.2 `ParamDefs<T>` 联动，registry 级别约束 params 类型 |
| B | `setPhysicsState` 同时接受值和函数更新器，其他 setter 只接受值 — 接口不一致 | line 78 | 统一为函数更新器模式，或移除函数重载 |
| C | `reset()` 是否重置 `lastChangedParam` | line 81 | 当前 `reset: () => set(initialState)` 已会恢复 `lastChangedParam: null`，无需单独修复 |

**不在本次范围**：
- store 拆分（当前 82 行无需拆分，过早拆分增加复杂度）
- 添加 persist/devtools 中间件（按需时引入）

工作量：0.5-1 天。

### 3.5 AnimationPage 协调职责监控（P2，观察性）

> 2026-06-28 架构核查新增。当前 411 行，已提取 `AnimationCenter` / `RightPhysicsPanel` 两个内部组件隔离 Zustand 订阅。

**当前可接受**（接近阈值但暂不拆分），以下区域最易膨胀：

| 区域 | 当前行号 | 膨胀触发条件 |
|------|---------|-------------|
| 参数过滤（showIf/hideIf） | 266-286 | 新增复杂条件表达式 |
| SidebarExtra props 组装 | 288-304 | 新增传递给侧边栏的 props |
| 模式切换（discovery/animation） | 320-338 | 新增第三种模式或更多顶部控制 |
| RightPhysicsPanel 计算逻辑 | 159-188 | 若 physics panel 支持更多缓存/错误态，可抽 hook |

**触发拆分的阈值**：行数 > 500 或职责 > 8 类。当前不拆分。

### 3.6 expandedNodes 数组 → Set（P3，按需）

`useKnowledgeStore.ts` 中 `expandedNodes: string[]`，O(n) includes。当前知识树规模仍不大，性能风险低；节点数达到 500+ 或出现频繁 includes 性能问题时再评估。

### 3.7 其他

| 条目 | 前提条件 |
|---|---|
| `WrongPage.renderCard` 提取为 `React.memo` | `WrongCard` 已有 `React.memo`，但 `menuFor` 状态只影响被点击的单张卡，收益有限；视后续性能需求决定 |
| `RightPhysicsPanel` 计算逻辑抽取 | 当前 `useMemo` 与展示组件在同一文件（AnimationPage:157-188），可抽取为独立 hook 提升测试独立性；优先级低 |

### 3.8 缺失场景色 token（P2）

2026-06-29 复核：`#0284c7`/`#0ea5e9` 仅 `ManBoatAnimation.tsx` 2 处；`#FFFFFF` 在 theme 目录已有定义，组件中仅 7 处硬编码。

| 文件 | 硬编码值 | 用途 | 建议 token 名 |
|------|---------|------|-------------|
| `ManBoatAnimation.tsx:269` | `#0284c7` | 水面填充色 | `SCENE_COLORS.mechanics.waterSurface` |
| `ManBoatAnimation.tsx:273` | `#0ea5e9` | 水波纹描边 | `SCENE_COLORS.mechanics.waterRipple` |
| `CurvedSlotAnimation.tsx:213,221` | `#FFFFFF` | 弧形槽内弧高光 | `SCENE_COLORS.materials.highlightWhite` |
| `CentripetalAnimation.tsx:562` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.highlightWhite` |
| `WorkAnimation.tsx:267,269` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.highlightWhite` |
| `ThinLensAnimation.tsx:586` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.highlightWhite` |
| `ParametricMagneticField.tsx:204` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.highlightWhite` |
| `PrimaryCoil.tsx:153` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.highlightWhite` |
| `Solenoid.tsx:161` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.highlightWhite` |

优先：`ManBoatAnimation.tsx` 水面/水波纹进入 `SCENE_COLORS.mechanics`；电磁组件白色高光统一 `SCENE_COLORS.materials.highlightWhite`。

### 3.9 竖直弹簧复合模型修复验证（P1）— 🆕 待验证

已生成并应用 `vertical-spring-fixes.patch`，覆盖：
- mode=1 物理量分析面板同步
- y-E 高度映射同步
- v-x 图速度轴上限改为轨迹真实 max(|v|)
- 合外力"向下为正"标注
- A/B/C/D 命名规范化
- 高考公式补充

待执行：
- `npm install`
- `npm run build`
- `npm test`
- 手动检查 `anim-vertical-spring` 两个模式下动画、能量图、F/v-x 图同步
