# 延后处理待办事项

> 最后更新：2026-06-23

---

## 一、图表组件迁移

### 累计迁移（-1081 行）

| 组件 | 预设 | 减少 |
|---|---|---|
| CentripetalAnimation | RelationChart | -115 |
| GravityAnimation | RelationChart | -168 |
| MomentumAnimation | RelationChart | -135 |
| ObliqueThrowAnimation | VelocityTimeChart | -81 |
| ProjectileAnimation | VelocityTimeChart | -82 |
| EnergyConservationAnimation | RelationChart | -57 |
| PotentialEnergyAnimation | RelationChart | -100 |
| AccelerationCenterExtra | RelationChart + VelocityTimeChart | -212 |
| UniformAccelerationCenterExtra | VelocityTimeChart + children | -87 |
| UniformAccelerationAnimation | VelocityTimeChart + underlay | -44 |

### 剩余未迁移

| 组件 | 难点 |
|---|---|
| ForceMotionTripleChart | 低优 |
| ElectricPotentialChartScene | 待盘点 |
| MaxwellBoltzmannChart | 待确认 |

### 阶段结论

1. `VelocityTimeChart` 标准 V-T 预设：`mode` / `domainPoints` / 游标 / 面积 / 阶段背景 / 理论参考线 / `underlay` 插件层
2. `WorkVTChart` 保留为业务适配层，不维护底层图表逻辑
3. `WorkFSChart` 保留业务图，已完成最小底层收口，暂不迁 RelationChart

> 全量索引：[`CHART_ASSET_INDEX.md`](./CHART_ASSET_INDEX.md)

### 公共约定

- **`points` vs `domainPoints`**：`points` 用于绘制（可截断），`domainPoints` 用于坐标轴定标（推荐传完整轨迹）。已显式传 `vRange/xRange/aRange` 时 `domainPoints` 不参与计算。
- **RelationChart markers** 三轴模式：`vertical`（垂直参考线）、`horizontal`（水平参考线）、`point`（圆点标注）

### 待创建/待补充

| 项目 | 优先级 |
|---|---|
| ChartAsymptote 插件（渐近线） | 低 |
| ChartDirectionArrows 插件（段向箭头） | 低 |
| VelocityTimeChart 加 markers（horizontal） | 中 |
| VelocityTimeChart 加 subtitle | 低 |
| 渐近线 | 中 |
| 面积渐变填充 | 中 |
| 交互悬浮 | 低 |
| 双 Y 轴 | 低 |

### 教学体验优化

- GasLawsAnimation 三图同屏（P-V/V-T/P-T 同时展示）

---

## 二、动画组件拆分（P0 — 超 500 行）

| 文件 | 行数 |
|---|---|
| VerticalThrowCharts.tsx | 694 |
| PotentialEnergyAnimation.tsx | 669 |
| UniformAccelerationCenterExtra.tsx | 596 |
| FreeFallAnimation.tsx | 589 |
| MomentumAnimation.tsx | 530 |
| EnergyConservationAnimation.tsx | 513 |

---

## 三、主题/命名统一（P2-P3）— 维护中心化规范

> **2026-06-23 架构决策**：不拆分 colors.ts / sceneColors.ts。它们是项目级色彩规范中心，567 处引用是设计意图而非问题。
> 16K/30K 对配置型颜色文件可接受。目标改为：维护中心化规范，而非强行拆散。

1. ✅ 重力矢量 token 修正完成
2. 保持 colors.ts / sceneColors.ts 作为权威来源
3. 内部做清晰分区 + 注释（sceneColors.ts 当前 529 行）
4. 统一导出命名
5. 阻止组件内私自定义颜色（现有违规需逐步清理）
6. 暂缓大规模迁移 SCENE_COLORS 引用

---

## 四、响应式缩放（P1，第 0-2 步已完成）

- **A 类** SVG fontSize 裸值：已迁移 8 文件（力学 3 + 电磁学 5），剩余 11 文件纯硬编码 + 1 文件混合。详见 [`FONT_SIZE_AUDIT.md`](./FONT_SIZE_AUDIT.md)
- **C 类** Tailwind text-[Npx]：42 处 / 17+ 文件（原 16/3，sidebar/panel 面板大量使用）
- **D 类** useCanvasSize → CANVAS_PRESETS：已迁移 51/77 调用点（原 7/77），剩余 26 为占位符/紧凑子场景/唯一尺寸/动态传入，不建议替换。新增 `mediumWide: 650×400` preset。详见 [`CANVAS_PRESETS_AUDIT.md`](./CANVAS_PRESETS_AUDIT.md)

---

## 五、动画引擎层（P3）

`useAnimationLifecycle` 全局默认 `maxTime = 30` 硬编码 → 长期提到配置层；当前「显式 opt-in」策略无紧迫性

---

## 六、Viewport 架构（P1）

### 已完成

- ✅ ViewportInfo visibleX/visibleY · transform 设计稿左上角语义 · Transformer 试点
- ✅ Work / Transformer / SatelliteAnimation / KeplerAnimation / ElectricField / FieldLines / 4 光学模块 接入
- ✅ Velocity / Collision / Momentum 试点推广（overlay 避让）

### 待做

1. **沉淀 SceneLayoutProfile**：AnimationConfig.sceneLayout 接口
2. **统一 panel layout 工具**：viewport overlay 和 DOM panel 同源计算

### 硬约束

- transform 必须采用设计稿左上角语义
- overlay 和 DOM panel 尺寸来自同一计算结果
- 不让组件反向 import registry
