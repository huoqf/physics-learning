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
| VerticalThrowCharts.tsx | 741 |
| PotentialEnergyAnimation.tsx | 736 |
| FreeFallAnimation.tsx | 645 |
| UniformAccelerationCenterExtra.tsx | 644 |
| MomentumAnimation.tsx | 577 |
| EnergyConservationAnimation.tsx | 566 |
| ObliqueThrowAnimation.tsx | 530 |
| AccelerationCenterExtra.tsx | 522 |
| UniformAccelerationAnimation.tsx | 518 |

> 已脱困：< 500 行：ThinLensAnimation(376)、GravityAnimation(482)、ProjectileAnimation(479)、CentripetalAnimation(389)

---

## 三、重复代码提取（P2）

`MODULE_LABELS`、`moduleOf`、`toggle`、`chip`、`formatDate` 在 WrongPage/PracticePage/ScoreReport/PracticeSession 中重复 → 提取到 `src/utils/moduleHelpers.ts`

---

## 四、主题/命名统一（P2-P3）

1. `SCENE_COLORS` 渐变 `string[]` → 语义化对象（~50 处）
2. `SCENE_COLORS`(464行) → materialColors / sceneEquipment / glowEffects
3. `COMMON_MATERIALS` / `SPHERE_COLORS` → `MATERIAL_PRESETS`
4. 明暗层命名 `{Part}{Layer}` 小写化
5. ✅ 重力矢量 token 修正完成

---

## 五、响应式缩放（P1，第 0-2 步已完成）

- **A 类** SVG fontSize 裸值：68 处 / 9 文件
- **C 类** Tailwind text-[Npx]：16 处 / 3 文件
- **D 类** useCanvasSize → CANVAS_PRESETS：27 处 / 25 文件

---

## 六、未使用组件（P2）

已清理：PageShell、Magnet、VTChart、PhysicsGraph、DataTable、UI/VectorArrow（旧版）
暂留：`ProgressBadge.tsx`

---

## 七、动画引擎层（P3）

`useAnimationLifecycle` 全局默认 `maxTime = 30` 硬编码 → 长期提到配置层；当前「显式 opt-in」策略无紧迫性

---

## 八、Viewport 架构（P1）

### 已完成

- ✅ ViewportInfo visibleX/visibleY · transform 设计稿左上角语义 · Transformer 试点
- ✅ Work / Transformer / SatelliteAnimation / KeplerAnimation 接入

### 待做

1. **试点推广**：Velocity(wide)、Collision/Momentum(top/bottom)
2. **沉淀 SceneLayoutProfile**：AnimationConfig.sceneLayout 接口
3. **统一 panel layout 工具**：viewport overlay 和 DOM panel 同源计算

### 硬约束

- transform 必须采用设计稿左上角语义
- overlay 和 DOM panel 尺寸来自同一计算结果
- 不让组件反向 import registry
