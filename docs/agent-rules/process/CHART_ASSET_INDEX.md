# 图表资产索引（Chart Asset Index）

> 生成时间：2026-06-22  
> 目的：**只做全量索引与类型分组，不做迁移、不改实现。**  
> 原则：后续重构按图表语义分组推进，避免逐页“看到一个修一个”。

---

## 0. 扫描范围

本索引基于以下来源建立：

```txt
*Chart.tsx
*Charts.tsx
*Diagram.tsx
*Scene.tsx 中带坐标轴 / 网格 / 曲线的 SVG 图表
BasePhysicsChart / RelationChart / VelocityTimeChart / DisplacementTimeChart / AccelerationTimeChart / MiniChart 使用点
内联 <svg> + axis/grid/path/line/polyline 的图表型片段
```

说明：大量动画主场景也会使用 `<svg>`、`line`、`path`、`grid`，但不一定是“图表”。本索引只收录具有明确坐标轴、曲线、统计分布、时序曲线或关系图语义的资产；纯物理场景、受力示意、光路图、回路图等暂不作为图表资产处理。

---

## 1. 公共图表基础设施

| 组件 | 角色 | 当前状态 | 备注 |
|---|---|---|---|
| `BasePhysicsChart` | 坐标轴 / 网格 / 刻度 / ChartContext 基座 | ✅ 标准基础设施 | `RelationChart`、`MiniChart`、`*-TimeChart` 等复用 |
| `VelocityTimeChart` | 标准 V-T 预设 | ✅ 标准组件 | 已覆盖 `mode`、`domainPoints`、游标、面积、阶段背景、理论参考线 |
| `DisplacementTimeChart` | 标准 X/Y-T 预设 | ✅ 标准组件 | 已覆盖 `domainPoints`、游标、面积、插件层 |
| `AccelerationTimeChart` | 标准 a-T 预设 | ✅ 标准组件 | 已覆盖 `domainPoints`、游标、面积 |
| `RelationChart` | 通用 Y=f(X) 关系图 | ✅ 标准组件 | 多曲线、markers、cursorX；不应承载过重业务 mode |
| `MiniChart` | 迷你趋势 / 时序图 | ✅ 已收口 | 基于 `BasePhysicsChart`；消费方显式传 domain，暂不需要 `domainPoints`；已补 cursor clamp / warning；暂不迁目录 |
| `ChartArea` | 面积填充插件 | ✅ 可复用 | 已被 `VelocityTimeChart`、`ForceMotionTripleChart` 等使用 |
| `ChartCursor` | 游标插件 | ✅ 可复用 | 标准游标层 |
| `ChartTangent` | 切线插件 | ✅ 可复用 | 用于高难度运动学图表 |
| `ChartSecant` | 割线插件 | ✅ 可复用 | 支持 ChartContext / legacy 显式坐标双模式 |

---

## 2. 按图表语义分组的资产索引

### 2.1 V-T / 速度-时间类

| 图表 | 页面 / 文件 | 类型 | 实现方式 | 是否动态 | 是否需 `domainPoints` | 状态 |
|---|---|---|---|:---:|:---:|---|
| `VelocityTimeChart` | `src/components/Chart/VelocityTimeChart.tsx` | V-T 标准预设 | 公共组件 | ✅ | ✅ 动画模式必需 | ✅ 标准组件 |
| `WorkVTChart` | 功 / `WorkVTChart.tsx` | V-T | `VelocityTimeChart` 薄适配层 | ✅ | ✅ 已传 | ✅ 已收口，保留业务适配文件 |
| `PowerCharts` V-T | 功率 / `PowerCharts.tsx` | V-T | `VelocityTimeChart` | ✅ | ✅ 已传 | ✅ 已收口 |
| `FreeFallAnimation` V-T | 自由落体 / `FreeFallAnimation.tsx` | V-T | `VelocityTimeChart` | ✅ | ✅ 已传 | ✅ 已收口 |
| `FreeFallDripAnimation` V-T | 频闪自由落体 / `FreeFallDripAnimation.tsx` | V-T | `VelocityTimeChart` | ✅ | ✅ 已传 | ✅ 已收口 |
| `VelocityVTChart` | 速度概念 / `VelocityVTChart.tsx` | V-T 滑动窗口 | `VelocityTimeChart` + `ChartArea`/`ChartSecant`/`ChartTangent` | ✅ | ✅ 已传 | ✅ 已收口 |
| `VerticalThrowCharts` V-T | 竖直上抛 / `VerticalThrowCharts.tsx` | V-T | `VelocityTimeChart` + 插件层 | ✅ | ✅ 已传 | ✅ 已收口 |
| `SatelliteAnimation` Mode 1 V-T | 卫星 / `SatelliteAnimation.tsx` | V-T 三阶段 | `VelocityTimeChart` + stages | ✅ | 待复核 | ✅ 已迁移，markers 可后补 |
| `ChargeInEField` vy-T | 电场中带电粒子 / `ChargeInEField.tsx` | vy-T | `VelocityTimeChart` | ✅ | 显式 `vRange`，不依赖 | ✅ 已用标准组件 |
| `CuttingEMF` V-T | 导体棒切割磁感线 / `CuttingEMF.tsx` | V-T | `VelocityTimeChart` + children 渐近线 | ✅ | `domainPoints` + `vRange` | ✅ 第八轮已迁移 |
| `ConnectedBodiesCenterExtra` V-T | 连接体 / `ConnectedBodiesCenterExtra.tsx` | V-T mini | `MiniChart` | ✅ | 已评估 | ✅ MiniChart 低风险 |
| `NewtonSecondCenterExtra` V-T | 牛顿第二定律 / `NewtonSecondCenterExtra.tsx` | V-T mini | `MiniChart` | ✅ | 已评估 | ✅ MiniChart 低风险 |
| `WeightlessnessCenterExtra` V-T | 超重失重 / `WeightlessnessCenterExtra.tsx` | V-T mini | `MiniChart` | ✅ | 已评估 | ✅ MiniChart 低风险 |

### 2.2 X/Y-T / 位移-时间类

| 图表 | 页面 / 文件 | 类型 | 实现方式 | 是否动态 | 是否需 `domainPoints` | 状态 |
|---|---|---|---|:---:|:---:|---|
| `DisplacementTimeChart` | `src/components/Chart/DisplacementTimeChart.tsx` | X/Y-T 标准预设 | 公共组件 | ✅ | ✅ 动画模式必需 | ✅ 标准组件 |
| `VelocityXTChart` | 速度概念 / `VelocityXTChart.tsx` | X-T 滑动窗口 | `DisplacementTimeChart` + `ChartSecant`/`ChartTangent` | ✅ | ✅ 已传 | ✅ 已收口 |
| `VerticalThrowCharts` Y-T | 竖直上抛 / `VerticalThrowCharts.tsx` | Y-T | `DisplacementTimeChart` + 插件层 | ✅ | ✅ 已传 | ✅ 已收口 |

### 2.3 a-T / 加速度-时间类

| 图表 | 页面 / 文件 | 类型 | 实现方式 | 是否动态 | 是否需 `domainPoints` | 状态 |
|---|---|---|---|:---:|:---:|---|
| `AccelerationTimeChart` | `src/components/Chart/AccelerationTimeChart.tsx` | a-T 标准预设 | 公共组件 | ✅ | ✅ 动画模式必需 | ✅ 标准组件 |
| `PowerCharts` a-T | 功率 / `PowerCharts.tsx` | a-T | `AccelerationTimeChart` | ✅ | 待复核 | ✅ 已迁移 |
| `KineticEnergyCharts` a-T | 动能 / `KineticEnergyCharts.tsx` | a-T | `AccelerationTimeChart` | ✅ | 待复核 | ✅ 已迁移 |
| `CuttingEMF` a-T | 导体棒切割磁感线 / `CuttingEMF.tsx` | a-T | `BasePhysicsChart` 局部封装 `ChartSVG` | ✅ | 显式 domain | ✅ 第七轮评估完成：可部分复用 AccelerationTimeChart；无损迁移需参考线/children 能力 |
| `ConnectedBodiesCenterExtra` a-T | 连接体 / `ConnectedBodiesCenterExtra.tsx` | a-T mini | `MiniChart` | ✅ | 已评估 | ✅ MiniChart 低风险 |
| `NewtonSecondCenterExtra` a-T | 牛顿第二定律 / `NewtonSecondCenterExtra.tsx` | a-T mini | `MiniChart` | ✅ | 已评估 | ✅ MiniChart 低风险 |
| `WeightlessnessCenterExtra` a-T | 超重失重 / `WeightlessnessCenterExtra.tsx` | a-T mini | `MiniChart` | ✅ | 已评估 | ✅ MiniChart 低风险 |

### 2.4 F-S / W-S / 做功面积类

| 图表 | 页面 / 文件 | 类型 | 实现方式 | 是否动态 | 是否需 `domainPoints` | 状态 |
|---|---|---|---|:---:|:---:|---|
| `WorkFSChart` 基础模式 | 功 / `WorkFSChart.tsx` | F-S / 面积 `Fx·s` | 手写 SVG（业务图） | ✅ | 已收口 | ✅ 保留业务图，已完成最小底层收口 |
| `WorkFSChart` 进阶模式 | 功 / `WorkFSChart.tsx` | W-S 复合图：`WF` / `|Wf|` / `Wnet` | 手写 SVG（业务图） | ✅ | 已收口 | ✅ 保留业务图，已完成最小底层收口 |
| 候选 `ForceDisplacementChart` | 尚未创建 | F-S / W-S 专用预设 | 无 | - | - | ❓ 是否创建由第二轮评估决定 |

> 评估结论见 [`WORK_FS_CHART_EVALUATION.md`](./WORK_FS_CHART_EVALUATION.md)：已优先验证 `RelationChart + ChartArea + ChartCursor`，但当前 `RelationChart` 缺少插件插槽，且面积/动态揭示不能无改动干净覆盖；`WorkFSChart` 保留为功页面业务教学图，暂不抽 `ForceDisplacementChart`。现已在业务组件内部完成 domain/scale、axis/grid、cursor、area fill、reference line 等最小底层收口。

### 2.5 力 / 运动三联图与力学 mini 图

| 图表 | 页面 / 文件 | 类型 | 实现方式 | 是否动态 | 是否需 `domainPoints` | 状态 |
|---|---|---|---|:---:|:---:|---|
| `ForceMotionTripleChart` F-T | 力与运动 / `ForceMotionTripleChart.tsx` | F-T | 自定义 `SingleChart` + `ChartArea`/`ChartCursor` | ✅ | ✅ 已传 | 🔶 可保留或后续拆预设 |
| `ForceMotionTripleChart` V-T | 力与运动 / `ForceMotionTripleChart.tsx` | V-T | 自定义 `SingleChart` + 公共插件 | ✅ | ✅ 已传 | 🔶 可保留或后续拆预设 |
| `ForceMotionTripleChart` X-T | 力与运动 / `ForceMotionTripleChart.tsx` | X-T | 自定义 `SingleChart` + 公共插件 | ✅ | ✅ 已传 | 🔶 可保留或后续拆预设 |
| `ConnectedBodiesCenterExtra` T-T / T-μ / T-F | 连接体 | 张力关系 mini 图 | `MiniChart` | ✅/静态混合 | 已评估 | ✅ MiniChart 低风险 |
| `NewtonSecondCenterExtra` F-T | 牛顿第二定律 | F-T mini | `MiniChart` | ✅ | 已评估 | ✅ MiniChart 低风险 |
| `WeightlessnessCenterExtra` N-T | 超重失重 | 支持力/视重-T mini | `MiniChart` | ✅ | 已评估 | ✅ MiniChart 低风险 |

### 2.6 能量 / 功率关系图

| 图表 | 页面 / 文件 | 类型 | 实现方式 | 是否动态 | 是否需 `domainPoints` | 状态 |
|---|---|---|---|:---:|:---:|---|
| `KineticEnergyCharts` Ek-x | 动能 / `KineticEnergyCharts.tsx` | Ek-x | `RelationChart` | ✅ | 显式 domain / yDomain | ✅ 已迁移 |
| `KineticEnergyCharts` W-x | 动能 / `KineticEnergyCharts.tsx` | W-x | `RelationChart` | ✅ | 显式 domain / yDomain | ✅ 已迁移 |
| `KineticEnergyCharts` Ep-x | 动能 / `KineticEnergyCharts.tsx` | Ep-x | `RelationChart` | ✅ | 显式 domain / yDomain | ✅ 已迁移 |
| `PowerCharts` P-T | 功率 / `PowerCharts.tsx` | P-T | `RelationChart` + marker | ✅ | 显式 yDomain | ✅ 已迁移 |
| `PowerCharts` F-V | 功率 / `PowerCharts.tsx` | F-V | `RelationChart` + marker | 静态/随参 | 自动/显式 | ✅ 已迁移 |

### 2.7 电磁图表

| 图表 | 页面 / 文件 | 类型 | 实现方式 | 是否动态 | 是否需 `domainPoints` | 状态 |
|---|---|---|---|:---:|:---:|---|
| `CoulombLaw` F-r | 库仑定律 / `CoulombLaw.tsx` | F-r | `RelationChart` | 随参 | 不适用 | ✅ 已迁移 |
| `ElectricFieldBasicScene` E-r | 电场强度 / `ElectricFieldBasicScene.tsx` | E-r | `RelationChart` | 随参 | 不适用 | ✅ 已迁移 |
| `ElectricFieldBasicScene` F-r | 电场强度 / `ElectricFieldBasicScene.tsx` | F-r | `RelationChart` | 随参 | 不适用 | ✅ 已迁移 |
| `ElectricPotentialChartScene` φ-x | 电势 / `ElectricPotentialChartScene.tsx` | φ-x + hover 切线 | 手写 SVG | ✅ hover/播放 | 待评估 | 🔶 场景强绑定，待盘点 |
| `AmpereFIChart` F-I | 安培力 / `AmpereFIChart.tsx` | F-I | RelationChart 业务适配层 | 随参 | 已收口 | ✅ 已迁移：统一 `F=-BIL`，稳定 yDomain ±100N，当前点 cursor |
| `OhmLawCenterExtra` U-I | 欧姆定律 / `OhmLawCenterExtra.tsx` | U-I 伏安特性 | RelationChart 业务适配层 | 随参/扫掠 | 显式 domain | ✅ 第九轮已迁移 |
| `ClosedCircuitCenterExtra` U-I / P-R | 闭合电路 / `ClosedCircuitCenterExtra.tsx` | U-I / P-R 关系图 | RelationChart 业务适配层 | 随参 | 显式 domain | ✅ 第九轮已迁移 |
| `CircuitAnalysisCenterExtra` U/I 柱状图 | 串并联电路 / `CircuitAnalysisCenterExtra.tsx` | 电压/电流分配柱状图 | 手写 SVG | 随参 | 显式 domain | 🔶 暂缓：非单曲线关系图 |
| `CuttingEMF` V-T / a-T | 电磁感应 / `CuttingEMF.tsx` | V-T + a-T | V-T 已迁 `VelocityTimeChart`；a-T 保留 `BasePhysicsChart` 局部封装 | ✅ | 显式 domain / domainPoints | ✅ V-T 已迁；a-T 无损迁移需补参考线/children 能力 |
| `FaradayChartPanel` Φ-T | 法拉第电磁感应 / `FaradayChartPanel.tsx` | Φ-T | `VelocityTimeChart` 泛用 | ✅ | ✅ 已传 | ✅ 已迁移 |
| `FaradayChartPanel` E-T | 法拉第电磁感应 / `FaradayChartPanel.tsx` | E-T | `VelocityTimeChart` 泛用 | ✅ | ✅ 已传 | ✅ 已迁移 |
| `ACGeneration` Φ-T / e-T | 交流电产生 / `ACGeneration.tsx` | Φ/e-T mini | `MiniChart` | ✅ | 已评估 | ✅ MiniChart 低风险 |
| `ACValues` I-T | 交流电有效值 / `ACValues.tsx` | I-T | `VelocityTimeChart` 泛用 + `ChartCursor` | ✅ | ✅ 已传 | ✅ 已迁移 |
| `ACValues` Q-T | 交流电有效值 / `ACValues.tsx` | Q-T | `VelocityTimeChart` 泛用 + `ChartCursor` | ✅ | ✅ 已传 | ✅ 已迁移 |

### 2.8 光学图表

| 图表 | 页面 / 文件 | 类型 | 实现方式 | 是否动态 | 是否需 `domainPoints` | 状态 |
|---|---|---|---|:---:|:---:|---|
| `ThinLensAnimation` 1/v-1/u | 薄透镜 / `ThinLensAnimation.tsx` | 线性关系图 | `RelationChart` | 随参 | 不适用 | ✅ 已迁移 |
| `ThinLensAnimation` v-u | 薄透镜 / `ThinLensAnimation.tsx` | 双曲线关系图 | `RelationChart` | 随参 | 不适用 | ✅ 已迁移 |

### 2.9 热学 / 热力学图表

| 图表 | 页面 / 文件 | 类型 | 实现方式 | 是否动态 | 是否需 `domainPoints` | 状态 |
|---|---|---|---|:---:|:---:|---|
| `ClapeyronAnimation` P-V | 克拉珀龙方程 / `ClapeyronAnimation.tsx` | P-V 等温线 | `RelationChart` | 随参 | 不适用 | ✅ 已迁移 |
| `GasLawsAnimation` P-V / V-T / P-T | 气体实验定律 / `GasLawsAnimation.tsx` | 热学关系图 mode 切换 | `RelationChart` | 随参 | 不适用 | ✅ 已迁移 |
| `FirstLawCenterExtra` P-V | 热力学第一定律 / `FirstLawCenterExtra.tsx` | P-V 循环 | `RelationChart` | 阶段高亮 | 不适用 | ✅ 已迁移 |
| `IntermolecularForceChart` F-r | 分子间作用力 / `IntermolecularForceChart.tsx` | F-r | `RelationChart` | 随模式 | 不适用 | ✅ 已迁移 |
| `IntermolecularForceChart` Ep-r | 分子势能 / `IntermolecularForceChart.tsx` | Ep-r | `RelationChart` | 随模式 | 不适用 | ✅ 已迁移 |
| `MaxwellBoltzmannChart` f(v)-v | 麦克斯韦速率分布 / `MaxwellBoltzmannChart.tsx` | 统计分布 | `MiniChart` | 随温度/粒径 | 不适用 | ✅ 已评估：保留 MiniChart |
| `SecondLawCenterExtra` S-T | 热力学第二定律 / `SecondLawCenterExtra.tsx` | 无序度-T mini | `MiniChart` | ✅ | 已评估 | ✅ MiniChart 低风险 |

---

## 3. 状态汇总

| 状态 | 含义 | 当前代表 |
|---|---|---|
| ✅ 已收口 | 已使用标准预设或公共基座，且语义清楚 | V-T 主线、RelationChart 主线、`AmpereFIChart` |
| ✅ 第五/六轮收口 | 消费方显式传 domain，暂无 `domainPoints` 必要；已补 cursor clamp / warning | `MiniChart` |
| 🔶 待评估 | 已发现资产，但不立即迁移 | `ElectricPotentialChartScene` |
| ❓ 候选创建 | 是否抽新预设未定 | `ForceDisplacementChart` |

---

## 4. 后续推进顺序

```txt
1. 冻结功页面图表：V-T 已公共组件化收口；F-S/W-S 保留业务图但底层规则已收口。
2. 先做功页面视觉验收，不继续改 WorkVTChart / WorkFSChart。
3. 按图表语义分组推进，不按页面逐个重构。
4. 若继续图表组件化，第三轮从低风险候选中先评估再实现。
5. 暂不把全量 lint 清理混入图表收口任务。
```

---

## 5. 功页面图表验收冻结清单

| 场景 | 验收点 |
|---|---|
| 基础模式：`Fx > 0` | 当前线、面积、游标均随 `currentS` 增长；完整参考线区分清楚 |
| 基础模式：`Fx < 0` | Y 轴包含负值；负功面积和游标位置正确 |
| 基础模式：`sTarget > 20m` | X domain 自动扩展，不再被旧硬编码窗口截断 |
| 进阶模式：有摩擦 | `WF` / `|Wf|` 面积与当前曲线随 `currentS` 揭示；`Wnet` 作为参考虚线清晰 |
| 进阶模式：`currentS = 0` | 不出现异常面积；游标在起点 |
| 进阶模式：`currentS` 接近终点 | 当前曲线/面积接近完整理论曲线；Y 轴不抖动 |
| 暂停 / 重播 / 拖动进度 | 曲线、面积、游标由同一个 `currentS` 驱动，状态一致 |

---

## 6. 第三/四轮结论：`AmpereFIChart`

> 评估文档见：[`AMPERE_FI_CHART_EVALUATION.md`](./AMPERE_FI_CHART_EVALUATION.md)。  
> 结论：`AmpereFIChart` 是低风险单曲线 F-I 关系图，`RelationChart` 可干净覆盖核心语义；第四轮已在业务适配层内部完成迁移，未改公共组件。

### 6.1 选择原因

| 条件 | 结果 |
|---|---|
| 单图 | ✅ 独立 F-I 关系图 |
| 单曲线或少量曲线 | ✅ 线性关系，当前点随参数变化 |
| 复杂教学交互 | ✅ 无 hover 求导、无面积证明、无三联结构 |
| 场景绑定 | ✅ 仅为右侧 SVG 卡片布局绑定，不与主场景共享物理 scale |
| RelationChart 适配价值 | ✅ 已在 `AmpereFIChart` 业务适配层中验证并迁移 |

### 6.2 迁移结果

| 问题 | 结果 |
|---|---|
| 是否单曲线 | ✅ 单条 F-I 线性关系 + 当前点 |
| 是否动态 | ✅ 随 `I/B/L` 参数变化整体重算，不是渐进增长 |
| 是否需要稳定 domain | ✅ 已修正为稳定 yDomain ±100N，覆盖参数面板极值 |
| 是否有面积 / hover / 复杂交互 | ✅ 无，适合 `RelationChart` |
| 是否有特殊坐标轴 | ✅ 用 `showZeroLine` + vertical marker 表达 0 参考线；不为箭头轴污染 RelationChart |
| 是否场景强绑定 | ✅ 通过 `foreignObject` 保留右侧 SVG 卡片布局 |
| RelationChart 是否无污染覆盖 | ✅ 已完成；未新增业务 mode 或公共能力 |
| F-I 符号语义 | ✅ 已统一为 `F = -BIL`，与 `solveBasicAmpere` 一致 |

### 6.3 归档结论

| 结论 | 状态 |
|---|---|
| `RelationChart` 可干净覆盖 | ✅ 已迁移 |
| 有业务表达但不复杂 | 已保留 `AmpereFIChart` 文件作为业务适配层 |
| 需要扩展公共能力 | 不成立；未改公共组件 |

---

## 7. 第三轮低风险候选选择标准

| 标准 | 说明 |
|---|---|
| 单图 | 不优先碰三联图或场景强绑定图 |
| 单曲线或少量曲线 | 优先关系图或简单时序图 |
| 没有复杂教学交互 | 暂缓 hover 求导、强动画嵌入、复杂面积证明 |
| 存在明显 domain/scale 风险 | 优先解决定标不一致风险 |
| 先评估再实现 | 第三轮仍只先做限定评估，不直接迁移 |

---

## 8. 第五/六轮结论：`MiniChart`

> 评估文档见：[`MINI_CHART_EVALUATION.md`](./MINI_CHART_EVALUATION.md)。  
> 结论：当前 `MiniChart` 消费方整体低动态定标风险；暂不需要 `domainPoints`，暂不迁入 `components/Chart`；第六轮已补 cursor clamp / warning。

### 8.1 关键判断

| 问题 | 结论 |
|---|---|
| 是否存在类似 VelocityTimeChart 的 y 轴动态抖动风险 | 当前低风险 |
| 是否有消费方把截断 points 用于自动定标 | 否；`MiniChart` 不从 points 自动定标 |
| 是否需要立即补 `domainPoints` | 不需要 |
| 是否应迁到 `components/Chart` | 暂不迁 |
| cursor 越界处理 | ✅ 已补 clamp + dev warning |
| 后续若实现 | 暂无 `domainPoints` 任务；如出现自动 domain 需求再重评 |

### 8.2 消费方风险概览

| 消费方 | 风险等级 | 说明 |
|---|---|---|
| `ACGeneration` | 低 | points 是滑动历史窗口，但 yDomain 由参数 `Em` 稳定推导 |
| `ConnectedBodiesCenterExtra` | 低 | 完整离线 points / 完整关系 points，显式 domain |
| `NewtonSecondCenterExtra` | 低 | 完整 10s points，limits 从完整 points 计算 |
| `WeightlessnessCenterExtra` | 低 | 完整 points，limits 从完整 points 计算 |
| `MaxwellBoltzmannChart` | 低 | 非时间轴分布图，完整 curve 定标 |
| `SecondLawCenterExtra` | 低 | 固定 domain；cursor 超界已由 MiniChart clamp / warning 覆盖 |

---

## 9. 第六轮低风险项快速筛查

| 对象 | 快速结论 | 动作 |
|---|---|---|
| `MiniChart` cursor 越界 | 明显小问题 | ✅ 同轮小修：cursor clamp 到 xDomain，dev mode 越界 warning |
| `SecondLawCenterExtra` currentXVal 越界 | 由 MiniChart 统一修复 | ✅ 不改消费方 |
| `CuttingEMF` V-T / a-T | 第七轮已单独评估；第八轮已迁 V-T，a-T 暂留，文件仍有既有 lint 问题 | ✅ V-T 已收口；a-T 后续单独评估，不混入低风险批处理 |
| `ElectricPotentialChartScene` | hover 切线 + 鼠标求导 + 场景交互 | 暂缓复杂图表 |
| `ForceMotionTripleChart` | 三联图 + 面积 + 游标 + 自定义 SingleChart | 暂缓复杂图表 |
| `SatelliteAnimation` markers/subtitle | 已迁移到 VelocityTimeChart，属于教学增强 | 暂不作为收口任务 |

结论：第六轮只落地 `MiniChart` cursor 小修；结构性图表继续保留为后续限定评估对象。

---

## 10. 第七/八轮结论：`CuttingEMF` V-T / a-T

> 评估文档见：[`CUTTING_EMF_CHART_EVALUATION.md`](./CUTTING_EMF_CHART_EVALUATION.md)。  
> 第七轮只评估 `CuttingEMF.tsx` 内 V-T / a-T 图表是否可复用 `VelocityTimeChart` / `AccelerationTimeChart`；第八轮只迁移 V-T，a-T 暂留，未修既有 lint，未碰其他电磁图表。

| 图表 | 结论 | 后续动作 |
|---|---|---|
| V-T | ✅ 已迁入 `VelocityTimeChart` | 收尾速度渐近线使用 children 自定义；a-T 未动 |
| a-T | ⚠️ 可复用 `AccelerationTimeChart` 的动态与定标能力，但无损迁移缺参考线/children 能力 | 暂不强迁；若要无损迁移，先补通用参考线能力或接受视觉简化 |

结论：`CuttingEMF` 当前已基于 `BasePhysicsChart`，不是裸手写坐标轴；后续不建议一轮强迁两图。

---

## 11. 第九轮电磁低风险关系图批量收口

> 评估文档见：[`ELECTROMAGNETISM_LOW_RISK_CHARTS_EVALUATION.md`](./ELECTROMAGNETISM_LOW_RISK_CHARTS_EVALUATION.md)。

| 对象 | 结论 |
|---|---|
| `OhmLawCenterExtra` U-I | ✅ 已迁入 `RelationChart` 业务适配层 |
| `ClosedCircuitCenterExtra` U-I / P-R | ✅ 已迁入 `RelationChart` 业务适配层 |
| `CircuitAnalysisCenterExtra` U/I 柱状图 | 暂缓：非单曲线关系图 |
| `ElectricPotentialChartScene` | 暂缓：hover 切线 + 场景同步 |
| `CuttingEMF` a-T | 暂缓：无损迁移需 `AccelerationTimeChart` 补参考线/children 能力 |

本轮未改公共组件，未处理全量 lint，未碰复杂交互图。
