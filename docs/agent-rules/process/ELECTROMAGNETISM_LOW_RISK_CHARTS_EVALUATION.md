# 电磁低风险单曲线图表批量评估与迁移

> 日期：2026-06-22  
> 范围：仅电磁低风险单曲线/少量曲线关系图表。  
> 不含：`CuttingEMF` a-T、`ElectricPotentialChartScene`、`ForceMotionTripleChart`、公共组件 API 扩展、全量 lint 清理。

---

## 1. 候选筛选标准

| 判断项 | 低风险信号 | 高风险信号 |
|---|---|---|
| 图表结构 | 单图、单曲线、少量参考线 | 多图同步、三联图、叠加场景 |
| 交互 | 无交互或只有 cursor | hover 求导、拖拽、点击状态切换 |
| 坐标 | 普通 x-y 或 t-y | 非线性几何投影、特殊坐标 |
| 语义 | 关系曲线、时间曲线 | 教学场景、构造动画、面积推导 |
| 迁移目标 | `RelationChart` / `VelocityTimeChart` 可直接承载 | 需要扩公共 API 才能承载 |

---

## 2. 本轮候选与结论

| 候选 | 图表语义 | 当前实现 | 风险 | 结论 |
|---|---|---|---|---|
| `OhmLawCenterExtra` | U-I 伏安特性曲线 | 手写 SVG 坐标图 + 历史扫掠点 | 低 | ✅ 已迁入 `RelationChart` 业务适配层 |
| `ClosedCircuitCenterExtra` | U-I / P-R 关系图 | 手写 SVG 坐标图 | 低 | ✅ 已迁入 `RelationChart` 业务适配层 |
| `CircuitAnalysisCenterExtra` | 电压/电流分配柱状图 | 手写 SVG 双柱状图 | 中 | 暂缓：不是单曲线关系图，属于柱状对比图 |
| `ElectricPotentialChartScene` | φ-x + hover 切线 | 手写 SVG + 鼠标求导 | 高 | 暂缓复杂交互图 |
| `CuttingEMF` a-T | a-T 时间图 | `BasePhysicsChart` 局部封装 | 中 | 暂缓：无损迁移需 `AccelerationTimeChart` 参考线/children 能力 |

---

## 3. 迁移结果

### 3.1 `OhmLawCenterExtra`

保留业务适配文件，内部将手写 U-I 图改为 `RelationChart`：

- 主曲线：定值电阻或小灯泡参考曲线；
- `additionalSeries`：用户扫掠历史轨迹；
- `markers`：历史采样点；
- `cursorX`：当前电压 U 对应的当前工作点；
- 保留实时数据浮动卡片；
- 不改 `OhmLaw` 主动画，不改公共组件。

### 3.2 `ClosedCircuitCenterExtra`

保留业务适配文件，按 mode 切换 `RelationChart`：

- 基础模式：U-I 关系图 `U = E - Ir`；
- 进阶模式：P-R 输出功率曲线；
- `cursorX` 表达当前工作点；
- `markers` 表达断路电压、短路电流或最大功率点；
- 保留电路即时状态浮动卡片；
- 不改 `ClosedCircuit` 主动画，不改公共组件。

---

## 4. 暂缓对象说明

| 对象 | 暂缓原因 |
|---|---|
| `CircuitAnalysisCenterExtra` | 双柱状对比图，不是 RelationChart 擅长的单曲线关系图 |
| `ElectricPotentialChartScene` | hover 切线 + 鼠标求导 + 场景同步，属于复杂交互图 |
| `CuttingEMF` a-T | 需要完整理论参考线；当前 `AccelerationTimeChart` 无 reference line / children 能力 |
| `ForceMotionTripleChart` | 三联图 + 面积 + 游标，复杂图表，继续暂缓 |

---

## 5. 验收范围

本轮只验收：

```txt
OhmLawCenterExtra U-I 图仍显示参考曲线、历史轨迹、当前工作点；
ClosedCircuitCenterExtra U-I / P-R 图仍显示当前点与关键标记；
RelationChart 未新增业务逻辑；
公共组件未改；
其他电磁图表未动。
```
