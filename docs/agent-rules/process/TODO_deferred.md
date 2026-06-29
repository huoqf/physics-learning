# 延后处理待办事项

> 最后更新：2026-06-29（架构守护脚本 + 模型单测已应用，24 文件 / 340 测试）

---

## 一、超长文件拆分（P3，随功能修改顺手拆纯计算）

> 拆分大 TSX 大组件风险高（SVG 坐标、动画状态易错），收益偏低。
> 仅在改功能时顺手抽纯计算逻辑（trajectory / geometry / scales），不建议作为主线推进。

>800 行（3 个）：

| 文件 | 行数 | 建议 |
|------|-----:|------|
| `ACValues.tsx` | 908 | 电磁交流逻辑复杂，谨慎拆分 |
| `CentripetalAnimation.tsx` | 848 | 可抽 `useCentripetalModel` 和几何计算 |
| `VectorAdditionAnimation.tsx` | 808 | 可抽向量几何与渲染 layer |

600-800 行（11 个）：

| 文件 | 行数 |
|------|-----:|
| `WeightlessnessAnimation.tsx` | 771 |
| `ThinLensAnimation.tsx` | 760 |
| `MomentumTheoremAnimation.tsx` | 757 |
| `CuttingEMF.tsx` | 753 |
| `momentum.ts`（quantities） | 740 |
| `knowledgeTree.ts` | 734 |
| `Transformer.tsx` | 724 |
| `VelocitySelector.tsx` | 720 |
| `LightRodRopeAnimation.tsx` | 719 |
| `ForceMotionSandbox.tsx` | 694 |
| `EquilibriumAnimation.tsx` | 688 |

策略：优先抽纯计算（trajectory / geometry / scales / derived quantities），不优先拆 SVG 小片段，每次只拆一个动画，拆完补纯函数单测。

---

## 二、响应式缩放（P1/P2 分级）

- **A 类** SVG 子组件硬编码 `fontSize`：15 文件 64 调用点（需加 `font` prop 由父组件传入）。待分批处理，按组件域迁移。详见 [`FONT_SIZE_AUDIT.md`](./FONT_SIZE_AUDIT.md)
- **B 类** 混合文件残留：2 文件 10 调用点（`SatelliteAnimation.tsx` 9 处、`InductionPhenomenon.tsx` 1 处）。已有部分 `font()`，补齐硬编码残留即可。
- **C 类** Tailwind `text-[Npx]`：69 处 / 31 文件。建议按域分批（sidebar → panel → CenterExtra → data card → 特殊布局例外保留），建议建立语义 class（`text-ui-xs`、`text-panel-label` 等），不建议直接映射 Tailwind 标准字号。
- **D 类** `useCanvasSize({ ... })` → `CANVAS_PRESETS`：硬编码调用 14 处（有效约 11 场景 + 1 动态 + 2 注释）。多数为合理例外，建议更新 allowlist 文档而非强行迁移。详见 [`CANVAS_PRESETS_AUDIT.md`](./CANVAS_PRESETS_AUDIT.md)

---

## 三、代码质量

### 3.1 useAnimationStore 类型安全与一致性（P1）— ✅ 已完成

新增 `AnimationParams` / `AnimationParamKey` / `AnimationParamValue` / `StoreUpdater<T>` 类型别名；`AnimationState` 拆为 `AnimationDataState`（数据）+ `AnimationState`（数据+方法）并导出；`initialState` 类型化，移除所有 `as` 断言。纯类型增强，零运行时改动。

### 3.2 AnimationPage 协调职责监控（P2，观察性）

> 当前 411 行，未超过 500 行阈值。

**当前可接受**（接近阈值但暂不拆分），以下区域最易膨胀：

| 区域 | 膨胀触发条件 |
|------|-------------|
| 参数过滤（showIf/hideIf） | 新增复杂条件表达式 |
| SidebarExtra props 组装 | 新增传递给侧边栏的 props |
| 模式切换（discovery/animation） | 新增第三种模式或更多顶部控制 |
| RightPhysicsPanel 计算逻辑 | 若 physics panel 支持更多缓存/错误态 |

**触发拆分的阈值**：行数 > 500 或职责 > 8 类。当前不拆分。

如继续增长，优先抽 hook：`useFilteredParams()`、`useSidebarExtraProps()`、`useAnimationMode()`、`useRightPhysicsPanelState()`。

### 3.3 expandedNodes 数组 → Set（P3，暂缓）

`useKnowledgeStore.ts` 中 `expandedNodes: string[]`，O(n) includes。当前知识树节点约 72 个，远未达到 500+ 阈值。

如果未来要改，不建议直接用 `Set`（序列化/persist 不方便），更建议 `expandedNodeMap: Record<string, true>`（O(1) 查询 + 可序列化 + DevTools/persist 友好）。

### 3.4 缺失场景色 token（P2）

> `#0284c7`/`#0ea5e9` 仅 `ManBoatAnimation.tsx` 2 处；`#FFFFFF` 在 theme 目录已有定义，组件中 9 处硬编码。

**注意**：当前 `SCENE_COLORS` 结构中**没有** `mechanics` 分组，现有分组为 `surface`、`mechanicsApparatus`、`materials`、`environment`。水面 token 不建议新增 `SCENE_COLORS.mechanics`，应放入 `surface` 或 `environment`。

| 文件 | 硬编码值 | 用途 | 建议 token 名 |
|------|---------|------|-------------|
| `ManBoatAnimation.tsx:269` | `#0284c7` | 水面填充色 | `SCENE_COLORS.surface.waterFill` |
| `ManBoatAnimation.tsx:273` | `#0ea5e9` | 水波纹描边 | `SCENE_COLORS.surface.waterRipple` |
| `CurvedSlotAnimation.tsx:213,221` | `#FFFFFF` | 弧形槽内弧高光 | `SCENE_COLORS.materials.edgeHighlightWhite` |
| `CentripetalAnimation.tsx:562` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.specularWhite` |
| `WorkAnimation.tsx:267,269` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.specularWhite` |
| `ThinLensAnimation.tsx:586` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.specularWhite` |
| `ParametricMagneticField.tsx:204` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.specularWhite` |
| `PrimaryCoil.tsx:153` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.specularWhite` |
| `Solenoid.tsx:161` | `#FFFFFF` | 白色高光 | `SCENE_COLORS.materials.specularWhite` |

优先：`ManBoatAnimation.tsx` 水面/水波纹 token 化。`#FFFFFF` 建议分语义处理（specularWhite / edgeHighlightWhite / panelText），不要全部归为一个 token。

### 3.5 依赖安全审计（P1/P2）

> `npm install` 输出 4 个漏洞：1 moderate、1 high、2 critical。

- [ ] 执行 `npm audit` 查看漏洞来源（生产依赖 / 开发依赖 / 传递依赖）
- [ ] 优先修复 high / critical
- [ ] 不要盲目 `npm audit fix --force`，评估破坏性
- [ ] 修复后 `npm run build && npm test` 验证

### 3.6 quantities 大文件拆分（P1/P2）

当前 quantities 文件偏大，随动画数量增长会变成第二个 registry 巨石：

| 文件 | 行数 | 备注 |
|------|-----:|------|
| `momentum.ts` | 740 | |
| `dynamics.ts` | 640 | |
| `kinematics.ts` | 602 | |
| `energy.ts` | 362 | verticalSpring/lightRodRope 已拆至 `energyCases/` |

建议按动画拆分为子目录（以 momentum 为例，8 个 case → 7 个文件）：

```text
data/quantities/momentum/
├── index.ts              # 聚合导出 + 共享类型
├── momentum.ts           # anim-momentum
├── impulse.ts            # anim-impulse + anim-impulse-concept
├── momentumConservation.ts  # anim-momentum-conservation
├── collision.ts          # anim-collision
├── curvedSlot.ts         # anim-curved-slot
├── springBlocks.ts       # anim-spring-blocks
└── manBoat.ts            # anim-man-boat
```

dynamics（640 行）和 kinematics（602 行）可按同样模式拆分。

好处：减少超长 switch/case，每个动画的 physics panel 可单测，AI 修改单个模型时上下文更小。

### 3.7 架构守护脚本（P1）— ✅ 已完成

`scripts/check-font-size.mjs`（style 对象裸 fontSize 检测，当前 0 违规）+ `scripts/check-large-files.mjs`（SOFT_LIMIT=800 / HARD_LIMIT=1000，9 个 allowlisted）+ 4 个 npm scripts（`audit:deps` / `check:font-size` / `check:large-files` / `check`）。`check-large-files.mjs` 已修复 Windows 路径分隔符问题。

### 3.8 其他

| 条目 | 前提条件 |
|---|---|
| `WrongPage.renderCard` 提取为 `React.memo` | `WrongCard` 已有 `React.memo`，但 `menuFor` 状态只影响被点击的单张卡，收益有限；视后续性能需求决定 |
| `RightPhysicsPanel` 计算逻辑抽取 | 当前 `useMemo` 与展示组件在同一文件，可抽取为独立 hook 提升测试独立性；优先级低 |

---

## 四、架构评估（2026-06-29）

### 4.1 当前优点

- 分层已合理：components / features / physics / data / stores / theme / scene / math / pages / utils
- 动画 registry 已按学科拆分（19 个文件），扩展方便
- 物理计算已有独立层（6 个子目录 + 32 个 .ts 文件）
- Chart / Physics 组件库已形成复用基础
- Zustand 状态层职责清晰（7 个 store 各司其职）
- 主题 token 系统较完整
- 单元测试基础扎实（24 文件 / 340 测试）

### 4.2 主要架构风险

| 风险 | 说明 |
|------|------|
| 单文件膨胀 | 3 个 >800 行动画混合了参数读取、物理计算、坐标换算、SVG 绘制、图表、教学逻辑 |
| physics 抽离不一致 | 部分动画已有独立 physics 模块，部分仍混合在组件中 |
| params 类型链路中断 | `AnimationConfig<P>` 已泛型化，但 store 仍退化为 `Record<string, number>` |
| quantities 文件膨胀 | momentum(740)/dynamics(640)/kinematics(602) 仍偏大，energy(362) 已拆 |
| 测试覆盖不均 | physics/utils 测试扎实，但动画视觉/坐标映射/图表同步测试偏少 |
| 主题 token 未完全收敛 | Tailwind text-[Npx] 69 处，SVG fontSize 64 处，#FFFFFF 9 处 |

### 4.3 建议目标架构

```text
features/<domain>/<topic>/
├── XxxAnimation.tsx          # 顶层容器，尽量薄
├── components/               # 局部展示组件
├── hooks/
│   ├── useXxxModel.ts
│   └── useXxxGeometry.ts
├── model/
│   ├── types.ts
│   └── viewModel.ts
└── index.ts

src/physics/<domain>/<model>.ts  # 纯计算，无 React
```

依赖方向：`math → physics → scene/chart → features → pages`

### 4.4 演进路线

**近期（1-2 周）**：~~useAnimationStore 类型增强~~（已完成）、quantities 大文件拆分

**中期（2-6 周）**：~~选 LightRodRopeAnimation 做拆分试点~~（已完成）、quantities 按动画拆分、建立 viewModel 单测模板

**长期（6 周+）**：registry + params + quantities 类型闭环、animation module 标准化、自动架构检查进入 CI

---

## 五、建议执行顺序

| 顺序 | 事项 | 风险 | 收益 | 优先级 |
|---:|------|---:|---:|---:|
| 1 | npm audit 高危/严重漏洞核查 | 中 | 高 | P1/P2 |
| 2 | quantities 大文件按动画拆分 | 中 | 高 | P1/P2 |
| 3 | `ManBoatAnimation` 水面色 token 化 | 低 | 中 | P2 |
| 4 | 更新 `CANVAS_PRESETS_AUDIT.md` allowlist | 低 | 中 | P2 |
| 5 | Tailwind `text-[Npx]` 分域替换 | 中 | 中 | P2 |
| 6 | 选 1 个大动画做拆分试点 | 中 | 高 | P2 |
| 7 | A/B 类 SVG fontSize 响应式迁移 | 中高 | 中 | P2/P3 |
| 8 | 超长文件按需抽纯计算 | 高 | 中 | P3 |
