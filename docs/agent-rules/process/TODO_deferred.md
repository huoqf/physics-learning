# 延后处理待办事项

> **本文档是待完成计划，不是完成记录。** 已完成事项记录在 `PROCESS_LOG.md` 和 git commit 中。
>
> 最后更新：2026-06-29

---

## 〇、架构指引（拆分文件时必须遵守）

### 问题本质

长文件的风险不是"行数多"，而是**关注点混合**。一个动画文件同时包含参数读取、物理计算、坐标换算、动画状态、SVG 绘制、图表绘制、标注文本、教学逻辑、交互逻辑，导致：

- 改显示逻辑可能破坏物理计算
- 难以对关键物理公式补单元测试
- 视觉回归难以发现

### 目标架构

```text
features/<domain>/<topic>/
├── XxxAnimation.tsx          # 薄编排层：参数读取 + 组合子组件
├── components/               # 局部 SVG 场景组件（纯渲染，无物理计算）
├── hooks/
│   └── useXxxPhysics.ts     # 物理计算 + 布局几何（可独立单测）
└── index.ts

src/physics/<domain>/<model>.ts  # 纯计算函数，无 React/DOM 依赖
```

依赖方向：`math → physics → hooks → components → AnimationPage`

### 拆分原则

1. **优先抽纯计算**（trajectory / geometry / scales / derived quantities），不优先拆 SVG 小片段
2. **每次只拆一个动画**，拆完跑 `npm run check && npm test`
3. **物理 hook 零 JSX**：`hooks/useXxxPhysics.ts` 只返回数据，不含 `<` 标签
4. **组件复用优先**：场景中已有 `src/components/` 下的组件时必须直接使用（铁律 5）
5. **拆完补单测**：为提取的纯计算函数补充 `tests/physics/` 单测

---

## 一、超长文件拆分（P3，随功能修改顺手拆）

| 优先级 | 文件 | 行数 | 拆分方案 |
|:---:|------|-----:|---------|
| 1 | `CentripetalAnimation.tsx` | 848 | 提取 `useCentripetalPhysics` hook + 拆 `CentripetalScene` |
| 2 | `MomentumTheoremAnimation.tsx` | 836 | 提取 `useMomentumTheoremPhysics` hook（基础+进阶场景） |
| 3 | `WeightlessnessAnimation.tsx` | 829 | 提取 `useWeightlessnessPhysics` hook + 拆 `WeightlessnessChart` |
| 4 | `VelocitySelector.tsx` | 820 | 提取 `useVelocitySelectorPhysics` hook + Canvas 粒子渲染分离 |
| 5 | `LightRodRopeAnimation.tsx` | 719 | 提取 `useLightRodRopePhysics` hook（轨迹+受力+图表数据） |

> 已有 hook 但渲染层待拆：`VectorAdditionAnimation.tsx`(859行)、`ThinLensAnimation.tsx`(820行)
> 600-800 行暂不动：`Transformer.tsx`(724)、`ForceMotionSandbox.tsx`(694)、`EquilibriumAnimation.tsx`(688)

---

## 二、响应式缩放（P1/P2 分级）

| 类别 | 问题 | 规模 | 方案 |
|:---:|------|------|------|
| A | SVG 子组件硬编码 `fontSize` | 15 文件 64 处 | 加 `font` prop 由父组件传入，按组件域分批迁移 |
| B | 混合文件残留 | 2 文件 10 处 | 补齐 `SatelliteAnimation`(9)、`InductionPhenomenon`(1) 硬编码残留 |
| C | Tailwind `text-[Npx]` | 31 文件 69 处 | 按域分批替换，建立语义 class（`text-ui-xs`、`text-panel-label` 等） |
| D | `useCanvasSize({ ... })` 硬编码 | 14 处 | 多数为合理例外，更新 allowlist 文档即可 |

详见 [`FONT_SIZE_AUDIT.md`](./FONT_SIZE_AUDIT.md)、[`CANVAS_PRESETS_AUDIT.md`](./CANVAS_PRESETS_AUDIT.md)

---

## 三、代码质量

### 3.1 缺失场景色 token（P2）

> `#0284c7`/`#0ea5e9` 仅 2 处；`#FFFFFF` 9 处硬编码。

| 文件 | 硬编码值 | 用途 | 建议 token 名 |
|------|---------|------|-------------|
| `ManBoatAnimation.tsx:269` | `#0284c7` | 水面填充色 | `SCENE_COLORS.surface.waterFill` |
| `ManBoatAnimation.tsx:273` | `#0ea5e9` | 水波纹描边 | `SCENE_COLORS.surface.waterRipple` |
| `CurvedSlotAnimation.tsx:213,221` | `#FFFFFF` | 弧形槽高光 | `SCENE_COLORS.materials.edgeHighlightWhite` |
| `CentripetalAnimation.tsx:562` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.specularWhite` |
| `WorkAnimation.tsx:267,269` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.specularWhite` |
| `ThinLensAnimation.tsx:586` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.specularWhite` |
| `ParametricMagneticField.tsx:204` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.specularWhite` |
| `PrimaryCoil.tsx:153` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.specularWhite` |
| `Solenoid.tsx:161` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.specularWhite` |

**注意**：`SCENE_COLORS` 无 `mechanics` 分组，水面 token 应放入 `surface` 或 `environment`。`#FFFFFF` 建议分语义处理，不要全部归为一个 token。

### 3.2 AnimationPage 协调职责监控（P2，观察性）

> 当前 411 行，未超过 500 行阈值。触发拆分条件：行数 > 500 或职责 > 8 类。

膨胀触发区域：参数过滤（showIf/hideIf）、SidebarExtra props 组装、模式切换、RightPhysicsPanel 计算逻辑。
如继续增长，优先抽 hook：`useFilteredParams()`、`useSidebarExtraProps()`、`useAnimationMode()`。

### 3.3 其他（P3，暂缓）

| 条目 | 前提条件 |
|------|---------|
| `expandedNodes: string[]` → `Record<string, true>` | 当前 72 节点，远未达 500+ 阈值 |
| `WrongPage.renderCard` 提取 `React.memo` | `menuFor` 状态只影响单张卡，收益有限 |
| `RightPhysicsPanel` 计算逻辑抽取 | 可抽取独立 hook，优先级低 |

---

## 四、执行优先级

| 顺序 | 事项 | 风险 | 收益 | 优先级 |
|:---:|------|:---:|:---:|:---:|
| 1 | `ManBoatAnimation` 水面色 token 化 | 低 | 中 | P2 |
| 2 | 更新 `CANVAS_PRESETS_AUDIT.md` allowlist | 低 | 中 | P2 |
| 3 | Tailwind `text-[Npx]` 分域替换 | 中 | 中 | P2 |
| 4 | 选 1 个大动画做拆分试点 | 中 | 高 | P2 |
| 5 | A/B 类 SVG fontSize 响应式迁移 | 中高 | 中 | P2/P3 |
| 6 | 超长文件按需抽纯计算 | 高 | 中 | P3 |
