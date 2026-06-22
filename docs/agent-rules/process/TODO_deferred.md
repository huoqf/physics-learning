# 延后处理待办事项

> 仅保留未完成项。最后更新：2026-06-22（电磁低风险关系图第九轮批量迁移完成）

---

## 一、图表组件迁移

### 图表资产清单 / 收口状态

> 全量索引见：[`CHART_ASSET_INDEX.md`](./CHART_ASSET_INDEX.md)。`WorkFSChart` 限定评估见：[`WORK_FS_CHART_EVALUATION.md`](./WORK_FS_CHART_EVALUATION.md)。`AmpereFIChart` 限定评估见：[`AMPERE_FI_CHART_EVALUATION.md`](./AMPERE_FI_CHART_EVALUATION.md)。`MiniChart` 限定评估见：[`MINI_CHART_EVALUATION.md`](./MINI_CHART_EVALUATION.md)。`CuttingEMF` 图表限定评估见：[`CUTTING_EMF_CHART_EVALUATION.md`](./CUTTING_EMF_CHART_EVALUATION.md)。本节只保留高层状态与下一轮决策入口。
>
> 原则：先按“图表语义”收口同类图表，再决定是否迁移所有实现；`已迁入公共预设` 不等于同类图表全部闭环。
>
> **阶段结论（2026-06-22）**
> 1. `VelocityTimeChart` 正式作为标准 V-T 预设组件：已覆盖动画模式、`domainPoints` 稳定定标、游标、面积、阶段背景、理论参考线。
> 2. `WorkVTChart` 保留文件但不再保留底层图表语义：仅作为 Work 业务数据到 `VelocityTimeChart` 的薄适配层，避免业务页继续维护坐标轴、刻度、路径。
> 3. `WorkFSChart` 已归档为功页面业务教学图：不迁 `RelationChart`，不抽 `ForceDisplacementChart`，已完成 domain/scale、cursor、area fill、reference line 等最小底层收口。

| 资产/页面 | 图表语义 | 当前实现 | 标准能力核对 | 收口状态 |
|------|------|------|------|------|
| `VelocityTimeChart` | V-T 标准预设 | Chart library | `mode` / `domainPoints` / 游标 / 面积 / 阶段背景 / 理论参考线 | ✅ 标准组件 |
| `PowerCharts` | V-T / P-T / F-V / a-T | VelocityTimeChart + RelationChart + AccelerationTimeChart | V-T 已用 `domainPoints`，P-T/F-V 用 markers | ✅ 已迁移 |
| `WorkVTChart` | V-T | VelocityTimeChart 薄适配层 | `mode="animated"` + `domainPoints` + 理论参考线 + 游标 | ✅ 已迁移（保留文件作为业务适配层） |
| `WorkFSChart` | F-S / W-S 复合图 | 手写 SVG（业务图） | domain/scale、面积、参考线、游标、多线已集中收口 | ✅ 保留业务图，已完成最小底层收口；暂不迁 RelationChart，暂不抽 ForceDisplacementChart |
| `ForceMotionTripleChart` | F-T / V-T / X-T 三联图 | 自定义 SingleChart | 已补 `domainPoints`、面积；未完全进入 BasePhysicsChart | 🔶 可保留或后续拆三预设 |
| `VelocityVTChart` | V-T 滑动窗口 | VelocityTimeChart + 插件层 | tDomain / 面积 / 割线 / 切线 | ✅ 已迁移 |
| `VelocityXTChart` | X-T 滑动窗口 | DisplacementTimeChart + 插件层 | tDomain / 割线 / 切线 | ✅ 已迁移 |
| `VerticalThrowCharts` | V-T / Y-T 双图 | VelocityTimeChart + DisplacementTimeChart | 多轨对照、面积、目标高度、割线/切线 | ✅ 已迁移 |
| `KineticEnergyCharts` | Ek-x / W / Ep / a-T | RelationChart + AccelerationTimeChart | `domainPoints` / yDomain | ✅ 已迁移 |
| `FaradayChartPanel` | Φ-T / E-T | VelocityTimeChart 泛用 | 多曲线/游标 | ✅ 已迁移 |
| `AmpereFIChart` | F-I | RelationChart 业务适配层 | `F=-BIL` 符号统一 + 稳定 yDomain + 当前点 cursor | ✅ 已迁移，不改公共组件 |
| `OhmLawCenterExtra` | U-I | RelationChart 业务适配层 | 参考曲线 + 历史扫掠 + 当前点 | ✅ 第九轮已迁移 |
| `ClosedCircuitCenterExtra` | U-I / P-R | RelationChart 业务适配层 | 当前点 + 关键 marker | ✅ 第九轮已迁移 |
| `ElectricPotentialChartScene` | 电势相关曲线 | 场景内图表 | 与动画强绑定，待确认是否适合迁移 | 🔶 待盘点 |
| `IntermolecularForceChart` | F-r / Ep-r | RelationChart | markers / 多曲线 | ✅ 已迁移 |
| `MaxwellBoltzmannChart` | f(v)-v | 图表预设/自定义混合 | 待核对是否需要 RelationChart 收口 | 🔶 待盘点 |
| `MiniChart` | 小型趋势图 | UI 组件 | 消费方显式传 domain；暂无 `domainPoints` 必要；cursor 已 clamp | ✅ 第五/六轮收口完成；暂不迁目录 |

### 能力矩阵

| 能力 | 标准化要求 | 当前承载 |
|---|---|---|
| 坐标轴定标 | 必须 | BasePhysicsChart / RelationChart / `*-TimeChart` |
| `domainPoints` 稳定定标 | 必须 | VelocityTime / DisplacementTime / AccelerationTime / ForceMotionTripleChart |
| 动态渐进绘制 | 必须 | `mode="animated"` + `currentTime` |
| 游标点 | 必须 | ChartCursor / cursorX |
| 理论参考线 | 建议标准化 | VelocityTimeChart `showReferenceLine`；RelationChart markers/series 可承载 |
| 面积填充 | 建议标准化 | ChartArea / RelationChart 面积策略待统一 |
| 辅助线/标记 | 建议标准化 | RelationChart markers / 插件层 children |
| 教学注释 | 可选 | 页面业务层或 chart children |
| 嵌入主 SVG | 单独评估 | 可用 foreignObject；强绑定场景可保留自定义但需统一 scale/axis 逻辑 |

### 第二轮结论：`WorkFSChart` 保留业务图，已完成最小底层收口

> 评估已完成，详见 [`WORK_FS_CHART_EVALUATION.md`](./WORK_FS_CHART_EVALUATION.md)。结论：`WorkFSChart` 是功页面强业务教学图，暂不抽 `ForceDisplacementChart`，不迁 `RelationChart`；已在组件内部完成 domain/scale、axis/grid、cursor、area fill、reference line 等底层规则收口。

**评估问题**

| 问题 | 判定标准 |
|---|---|
| 是否存在复用场景 | 若 F-s / W-s 面积图会在功、功率、动能定理、变力做功等页面重复出现，倾向抽 `ForceDisplacementChart` |
| 是否只是强业务教学图 | 若仅服务 Work 页面特定双模式表达，优先保留自定义 SVG |
| 是否能不污染 RelationChart | 只有在 RelationChart 已天然支持所需能力时才考虑迁移，否则不把业务模式塞进通用关系图 |
| 是否可先抽底层能力 | 即便保留自定义，也要评估抽出 scale/domain、axis/grid、cursor、area fill 等公共规则 |

**`WorkFSChart` 能力清单**

| 能力 | 基础模式 | 进阶模式 | 是否应公共化 |
|---|:---:|:---:|---|
| 稳定 domain / scale | ✅ | ✅ | 必须统一规则 |
| 坐标轴 / 网格样式 | ✅ | ✅ | 建议复用 BasePhysicsChart 或抽底层 helper |
| 当前位移游标 `currentS` | ✅ | ✅ | 可公共化 |
| 理论参考线 | ✅ | ✅ | 可公共化 |
| 面积填充 | ✅ Fx·s 矩形面积 | ✅ 多曲线面积 | 需谨慎抽象 |
| 多曲线 | ❌ | ✅ WF / \|Wf\| / Wnet | 可作为 ForceDisplacementChart 语义，不宜塞入通用 RelationChart 专属逻辑 |
| 教学注释 / 图例 | ✅ | ✅ | 页面业务层或专用预设 |
| 双模式切换 | ✅ | ✅ | 属于 Work 业务，不应污染 RelationChart |

**候选决策**

| 决策 | 适用情况 | 后续动作 |
|---|---|---|
| 抽 `ForceDisplacementChart` | F-s / W-s 教学图会复用，且多页面需要面积、参考线、游标 | 新建薄预设，内部可复用 BasePhysicsChart / ChartArea / ChartCursor |
| 保留 `WorkFSChart` | 仅 Work 页面强业务表达 | 不迁移，但抽/统一 scale、axis/grid、cursor、area fill 规则 |
| 迁入 `RelationChart` | RelationChart 已无需污染即可覆盖多曲线、面积、游标、稳定 domain、参考线 | 仅做轻适配，不新增业务 mode 到 RelationChart |

### 已完成

| 组件 | 状态 |
|------|:----:|
| BasePhysicsChart | ✅ |
| ChartContext / useChartContext | ✅ |
| ChartCursor | ✅ |
| ChartArea | ✅ |
| ChartTangent | ✅ |
| VelocityTimeChart | ✅（含 `domainPoints` 定标解耦 + 多曲线 `additionalSeries`） |
| DisplacementTimeChart | ✅（含 `domainPoints` 定标解耦） |
| AccelerationTimeChart | ✅（含 `domainPoints` 定标解耦） |
| RelationChart | ✅（通用 Y=f(X)，含 `additionalSeries` / `cursorX` / `markers` 三轴模式） |
| `interpolateY` 工具 | ✅（线性插值纯函数，10 单测） |

> **公共约定（`points` vs `domainPoints`）**
> 三个 `*-TimeChart` 预设统一遵循：
> - `points`：用于**绘制**，可按 `currentTime` 截断（图表内部也会再截一次）。
> - `domainPoints?`：用于**坐标轴定标**（自动 vRange/xRange/aRange），未传时回退到 `points`。
> - **推荐传完整未截断的整段轨迹给 `domainPoints`**，否则 Y 轴会随时间扩张，重现
>   "v-t 曲线初始时刻贴着 Y 轴、被时间拉斜" 的视觉错觉。
> - 已显式传 `vRange/xRange/aRange` 时 `domainPoints` 不参与计算。
>
> 同源问题历史：见 commit `bbd1108`（V-T 治本）、`35abec4`（DT/AT 同步补齐）。

> **RelationChart markers 三轴模式（commit `6b1aee4`）**
> `RelationMarker` 通过可选的 `axis` 字段统一三种用途，按 `x`/`y` 齐全度自动推断：
> - `'vertical'`：贯穿全图的垂直参考线 + X 轴外短刻度 + 居中标签（只给 `x`）
> - `'horizontal'`：贯穿全图的水平参考线 + 右上角标签（只给 `y`）
> - `'point'`：圆点 + 右上角偏移标签（同时给 `x` 和 `y`）

### 待创建预设

| 组件 | 用途 | 优先级 |
|------|------|:------:|
| ~~PVTChart~~ | ~~P-V / V-T / P-T 热力学图~~ | ~~中~~ ❌ 决策放弃：RelationChart 已覆盖（commit cb7c88d）。若未来真有重复配置再抽薄封装 |
| ~~RelationChart~~ | ~~通用 Y=f(X) 关系图~~ | ~~中~~ ✅ |
| ChartAsymptote 插件 | 渐近线（如收尾速度） | 低 |
| ~~ChartSecant 插件~~ | ~~割线 + 斜率三角形（与 ChartTangent 平行）~~ | ✅ 已创建：`ChartSecant` 支持 ChartContext / legacy SVG 显式坐标双模式 |
| ChartDirectionArrows 插件 | 段向箭头（FirstLawCenter 循环过程方向）| 低（FirstLawCenter 已降级；箭头当前可通过角点标签 + 阶段文字替代）|

### 待补充功能

| 功能 | 说明 | 优先级 |
|------|------|:------:|
| ~~多曲线对比~~ | ~~单图表内多条曲线（如真空 vs 空气阻力）~~ | ~~中~~ ✅ |
| ~~绘制数据 / 定标数据解耦~~ | ~~VelocityTime / DisplacementTime / AccelerationTime 三个预设统一加 `domainPoints`~~ | ~~高~~ ✅ |
| 渐近线 | 收尾速度、极限值虚线标注 | 中 |
| 面积渐变填充 | linearGradient 生成面积着色 | 中 |
| ~~阶段背景着色~~ | ~~X 轴区间矩形分段填充（如 SatelliteAnimation Mode 1 发射/转弯/在轨三阶段）~~ | ~~中~~ ✅ commit `3623de6` (API) + `66df556` (迁移) |
| VelocityTimeChart 加 markers（horizontal）| 用于 SatelliteAnimation Mode 1 v-t 的 7.9/11.2 km/s 第一/第二宇宙速度水平参考线 | 中（迁移时简化为标准刻度，标记可后补） |
| VelocityTimeChart 加 subtitle | 用于副标题文案（如「(前8秒发射示意，后为开普勒轨道)」）| 低 |
| ~~VelocityTimeChart / DisplacementTimeChart 支持 tDomain + 插件层~~ | ~~滑动窗口与 underlay/children 插槽，用于 VelocityVT/VelocityXT 高难度迁移~~ | ✅ |
| 交互悬浮 | Hover 显示数值卡片 | 低 |
| 双 Y 轴 | 左右各一个 Y 轴 | 低 |
| ~~SingleChart Y 范围加 padding~~ | ~~`ForceMotionTripleChart.SingleChart` 现 `Math.max(1, ...values)` 无顶部喘气空间，曲线峰值贴图顶~~ | ~~低~~ ✅ commit `3aba5f6` |
| ~~terminal 渐近线避免与曲线重合~~ | ~~在 zeroBased=true 的 v-t 图上 `terminalValue === maxAbs`，渐近虚线与曲线峰会重叠看不清~~ | ~~低~~ ✅ 同上（顺带解决） |
| ~~MiniChart 评估 `domainPoints` 需求~~ | ✅ 已评估：当前消费方显式传 domain，暂无 `domainPoints` 必要 | ✅ |
| ~~MiniChart cursor clamp / warning~~ | ✅ 已完成：`currentXVal` 超出 xDomain 时 dev warning，游标 clamp 到图表范围内 | ✅ |
| MiniChart 是否并入 Chart/ 命名空间 | 暂不迁；如未来需要可先在 `components/Chart/index.ts` re-export | 低 |

### 页面迁移状态

**已迁移/评估：** ChargeInEField(vy-t)、CuttingEMF(v-t 已迁 VelocityTimeChart，a-t 暂留)、~~ForceMotionTripleChart(F-t/v-t/x-t 游标 + 面积)~~ ✅、MiniChart(7 个消费方)、MaxwellBoltzmannChart(f(v)-v)、ACGeneration(e-t)、~~WorkVTChart(v-t 手写 SVG → VelocityTimeChart 薄适配层)~~ ✅、~~FreeFallDripAnimation(v-t)~~ ✅、~~FreeFallAnimation(v-t 双曲线)~~ ✅、~~IntermolecularForceChart(F-r 三曲线 / Ep-r)~~ ✅、~~CoulombLaw BasicMode(F-r)~~ ✅、~~ElectricFieldBasicScene(E-r + F-r)~~ ✅、~~ThinLensAnimation(线性 + 双曲线 + 共轭法标记)~~ ✅、~~SatelliteAnimation Mode 0(v-r + T-r 画中画)~~ ✅、~~SatelliteAnimation Mode 1(v-t 三阶段)~~ ✅、~~ClapeyronAnimation(P-V 等温线 + 等温线族)~~ ✅、~~GasLawsAnimation(P-V/V-T/P-T mode 切换)~~ ✅、~~FirstLawCenterExtra(P-V 循环 + 分段高亮)~~ ✅、~~VelocityVTChart(v-t 滑动窗口+面积+割线+切线)~~ ✅、~~VelocityXTChart(x-t 割线三角形+切线)~~ ✅、~~VerticalThrowCharts(v-t/y-t 双图 + 割线/切线/目标高度/面积/双轨对照)~~ ✅、~~FaradayChartPanel(Φ-t + E-t 双图)~~ ✅、~~ACValues(I-t + Q-t 双图)~~ ✅

**未迁移：**

| 页面 | 图表类型 | 需要的预设 | 难度 |
|------|---------|------|:----:|
| ~~ACValues~~ | ~~I-t + Q-t~~ | ✅ 已迁入 VelocityTimeChart（多曲线 `additionalSeries` + tDomain + children 插件层） |
| ~~VelocityVTChart~~ | ~~v-t 滑动窗口+面积+割线+切线~~ | ✅ 已迁入 VelocityTimeChart + tDomain + underlay/children + ChartSecant/ChartTangent |
| ~~VelocityXTChart~~ | ~~x-t 切线+割线三角形~~ | ✅ 已迁入 DisplacementTimeChart + tDomain + children + ChartSecant/ChartTangent |
| ~~VerticalThrowCharts~~ | ~~v-t + y-t 双图+切线+交互~~ | ✅ 已迁入 VelocityTimeChart / DisplacementTimeChart + ChartSecant/ChartTangent 插件层 |
| ~~KineticEnergyAnimation~~ | ~~4 面板 Ek-x/W/Ep/a-t~~ | ✅ 已迁入 RelationChart + AccelerationTimeChart（KineticEnergyCharts 2×2 grid + domainPoints 定标） |
| ~~PowerAnimation~~ | ~~4 面板 v-t/P-t/F-v/a-t~~ | ✅ 已迁入 VelocityTimeChart + RelationChart + AccelerationTimeChart（PowerCharts Tab + yDomain 定标） |
| ~~FaradayChartPanel~~ | ~~Φ-t + E-t 双图~~ | ✅ 已迁入 VelocityTimeChart（全曲线 + 当前时刻游标 + E=0 提示） |
| ~~WorkFSChart~~ | ~~F-s / W-s 复合图~~ | ✅ 保留业务图，已完成最小底层收口；暂不迁 RelationChart，暂不抽 ForceDisplacementChart |
| ~~AmpereFIChart~~ | ~~F-I~~ | ✅ 已迁入 RelationChart 业务适配层；统一 `F=-BIL`，yDomain 稳定为 ±100N；未改公共组件 |
| ~~OhmLawCenterExtra~~ | ~~U-I 伏安特性图~~ | ✅ 第九轮已迁入 RelationChart 业务适配层 |
| ~~ClosedCircuitCenterExtra~~ | ~~U-I / P-R 关系图~~ | ✅ 第九轮已迁入 RelationChart 业务适配层 |
| ElectricPotentialChartScene | 电势/电场相关图 | 待盘点：若与主动画强绑定，可保留自定义但统一 scale/axis |
| MaxwellBoltzmannChart | f(v)-v | MiniChart 评估完成：保留 MiniChart，无需 RelationChart 迁移 |
| ~~MiniChart~~ | ~~小型趋势图~~ | ✅ 第五轮评估完成：暂无 `domainPoints` 必要，暂不迁目录 |

**教学体验后续优化（不阻塞主线）：**
- **GasLawsAnimation 三图同屏**：当前迁移仅保留原 mode 切换。教学上 P-V/V-T/P-T 三图同屏更有价值（让学生同时看到「哪个量不变、哪两个量成什么关系」），适合作为未来教学重构项。
- **VelocityTimeChart 加 markers（horizontal）**：用于 SatelliteAnimation Mode 1 的 7.9/11.2 km/s 第一/第二宇宙速度水平参考线
- **VelocityTimeChart 加 subtitle**：用于副标题文案

**迁移顺序：**
1. ~~FreeFallDripAnimation~~ ✅
2. ~~FreeFallAnimation~~ ✅
3. ~~创建 RelationChart 预设~~ ✅
4. ~~IntermolecularForceChart 试点（验证 markers / 多曲线 / 多模式）~~ ✅
5. ~~CoulombLaw / ElectricFieldBasicScene（验证 foreignObject 嵌入 + 多图并列）~~ ✅
6. ~~ThinLensAnimation（验证多模式切换 + 水平参考线 + 独立标记点）~~ ✅
7. ~~SatelliteAnimation Mode 0（验证画中画卡片 + foreignObject 拖拽热区分层）~~ ✅
8. ~~ForceMotionTripleChart 面积补齐（ChartArea 在非 BasePhysicsChart 容器复用）~~ ✅
9. ~~VelocityTimeChart 扩展「阶段背景着色」 + SatelliteAnimation Mode 1 迁移~~ ✅
10. ~~~~创建 PVTChart 预设~~~~ → 改为直接用 RelationChart，三个热力学页面一次性迁完 ✅
11. ~~创建 ChartSecant 插件~~ ✅ → ~~VelocityVT / VelocityXT 迁入图表预设~~ ✅ → ~~VerticalThrow 图表区拆出独立组件~~ ✅ → ~~VerticalThrowCharts 迁入 VelocityTimeChart/DisplacementTimeChart~~ ✅（高难度三件套收官）
12. ~~FaradayChartPanel Φ-t/E-t 双图迁移~~ ✅
13. ~~ACValues I-t/Q-t 双图迁移~~ ✅
14. ~~第二轮限定评估 `WorkFSChart`~~ ✅ 结论：已优先验证 `RelationChart + ChartArea + ChartCursor`，当前不能无改动干净覆盖；保留业务图；暂不抽 `ForceDisplacementChart`
15. ~~`WorkFSChart` 最小底层收口~~ ✅ 已在业务组件内部统一 scale/domain、axis/grid、cursor、area fill、reference line 样式；未改 WorkAnimation 布局，未扩大到其他图表
16. ~~第三轮限定评估 `AmpereFIChart`~~ ✅ 结论：`RelationChart` 可干净覆盖
17. ~~第四轮迁移 `AmpereFIChart`~~ ✅ 已在业务适配层内部改用 `RelationChart`，统一 `F=-BIL` 与稳定 yDomain；未改 `RelationChart`，未碰其他图表
18. ~~第五轮限定评估 `MiniChart`~~ ✅ 当前消费方显式传 domain，暂无 `domainPoints` 必要；暂不迁目录
19. ~~第六轮 MiniChart cursor clamp / warning 小修~~ ✅ 已完成；同时完成低风险项快速筛查，复杂图表继续暂缓
20. ~~第七轮限定评估 `CuttingEMF` V-T / a-T~~ ✅ V-T 可迁；a-T 无损迁移需补 `AccelerationTimeChart` 参考线/children 能力；该轮未迁移、未修既有 lint
21. ~~第八轮 `CuttingEMF` V-T 单图迁移~~ ✅ 已迁入 `VelocityTimeChart`，收尾速度渐近线用 children 自定义；a-T 暂留，公共组件未动，既有 lint 未修
22. ~~第九轮电磁低风险单曲线关系图批量收口~~ ✅ `OhmLawCenterExtra`、`ClosedCircuitCenterExtra` 已迁入 RelationChart；`CircuitAnalysisCenterExtra` / `ElectricPotentialChartScene` / `CuttingEMF a-T` 暂缓
23. 其余按需

---

## 二、动画组件拆分

**P0** — 单文件超 500 行

| 文件 | 行数 | 计划 |
|------|------|------|
| `FreeFallAnimation.tsx` | 644（V-T 迁移后已减约 65 行） | 按 JSX 块拆子组件 |
| `UniformAccelerationCenterExtra.tsx` | 669 | 已有 5 个子组件，直接搬迁 |
| ~~`VerticalThrowAnimation.tsx`~~ | ~~741~~ → 356（图表区拆至 `VerticalThrowCharts.tsx`） | ✅ 已脱离 P0 |
| `VerticalThrowCharts.tsx` | 747（已完成图表预设迁移，下一步按 VT/YT/layers 拆分） | 拆成 VerticalThrowVTChart / VerticalThrowYTChart / chartLayers |
| `AccelerationCenterExtra.tsx` | 646 | 需修复规范违反 |

> 已自然脱困（迁图后行数下降至 500 以下）：~~`ThinLensAnimation.tsx`~~ 376 行（468 → 376）

---

## 三、重复代码提取

**P2** — `MODULE_LABELS`、`moduleOf`、`toggle`、`chip`、`formatDate` 在 WrongPage/PracticePage/ScoreReport/PracticeSession 中重复 → 提取到 `src/utils/moduleHelpers.ts`

---

## 四、主题/命名统一

**P2-P3** 链式依赖，按顺序：
1. `SCENE_COLORS` 渐变 `string[]` 改语义化对象（~50 处）
2. `SCENE_COLORS`(464行) 拆为 materialColors/sceneEquipment/glowEffects
3. `COMMON_MATERIALS` / `SPHERE_COLORS` 合并为 `MATERIAL_PRESETS`
4. 明暗层命名 `{Part}{Layer}` 小写化
5. ✅ 重力矢量 token 修正：FreeFall/VerticalThrow/DripAnimation 的 `type="acceleration"` → `type="gravity"`，refMagnitudes 补充 `gravity: GRAVITY`

---

## 五、响应式缩放

**P1**（第 0-2 步已完成 ✅）

- **A 类** SVG fontSize 裸值：68 处 / 9 文件
- **C 类** Tailwind text-[Npx]：16 处 / 3 文件
- **D 类** useCanvasSize → CANVAS_PRESETS：27 处 / 25 文件
- **可选** drop-shadow 封装、SVG marker token 化

---

## 六、未使用组件

**P2** — 已清理：PageShell、Magnet、VTChart、PhysicsGraph、DataTable、UI/VectorArrow（旧版）
暂留：`ProgressBadge.tsx`（代码干净，有潜在用途）

---

## 七、动画引擎层（轻量后续项）

**P3** — 关联 commit `e9e010b`（maxTime 由 AnimationConfig 可覆盖）

- `useAnimationLifecycle` 全局默认 `maxTime = 30` 仍硬编码在 hook 里，
  长期可考虑：① 提到 `theme/motion` 等配置层；② 对未声明 `maxTime`
  的动画按类别（碰撞/抛体短时型 vs 收尾/卫星长时型）给智能默认值
- 当前策略「显式 opt-in 更长 maxTime」对维护友好，无紧迫性

---

## 八、Viewport 架构

**P1** — 动画充满显示区域，避免 overlay 后主体缩小

### 已完成

- ✅ ViewportInfo 增加 visibleX/visibleY
- ✅ transform 改为设计稿左上角语义
- ✅ Transformer 试点验证（designWidth 760→380，scale 0.58→1.0）
- ✅ Work（wide + 比例布局型）
- ✅ Transformer（同上）
- ✅ SatelliteAnimation（earthRadiusPx × vp.scale + 开普勒速度方向修正）
- ✅ KeplerAnimation（scaleBase × vp.scale，移除 0.8~1.2 clamping + 删除网格背景）

### 待做

**1. 试点推广**

| 试点 | 布局类型 | 验证目标 |
|------|---------|---------|
| Velocity | wide + 比例布局型 | `vp.visibleX/Y/W/H` 替代 `canvas.width/height` |
| Collision / Momentum | wide + top/bottom | 可选，验证几何效果 |

接入策略：比例布局型用 `vp.visibleX/Y/W/H`；常量布局型保持常量，确保不超出 `vp.visibleW/H`；新动画直接用 `<g transform={vp.transform}>`。

**2. 沉淀 SceneLayoutProfile**

AnimationConfig 增加 `sceneLayout`，组件内局部 `SCENE_LAYOUT` 逐步迁移到 registry。接口定义：
```ts
interface SceneLayoutProfile {
  designWidth: number; designHeight: number
  layout?: 'tall' | 'wide' | 'balanced'
  panelPosition?: 'right' | 'top' | 'bottom' | 'left' | 'none'
  panelSizeRatio?: number
  viewportPadding?: number
  contentBox?: { x, y, width, height }  // 延后
  fitMode?: 'contain' | 'content-contain'  // 延后
}
```

**3. 统一 panel layout 工具** — viewport overlay 和 DOM panel 来自同一计算结果，避免错位

### 硬约束

- `transform` 必须采用设计稿左上角语义
- overlay 和 DOM panel 尺寸来自同一计算结果
- 不让组件反向 import registry，避免依赖环
