# 延后处理待办事项

> 仅保留未完成项。最后更新：2026-06-21（RelationChart 预设 + 5 个页面迁移完成 + ForceMotion 面积补齐）

---

## 一、图表组件迁移

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
| PVTChart | P-V / V-T / P-T 热力学图 | 中（解锁 Clapeyron/GasLaws/FirstLawCenter 3 个页面） |
| ~~RelationChart~~ | ~~通用 Y=f(X) 关系图~~ | ~~中~~ ✅ |
| ChartAsymptote 插件 | 渐近线（如收尾速度） | 低 |
| ChartSecant 插件 | 割线 + 斜率三角形（与 ChartTangent 平行） | 中（VelocityVTChart/VelocityXTChart/VerticalThrow 三个高难度页面都需要） |

### 待补充功能

| 功能 | 说明 | 优先级 |
|------|------|:------:|
| ~~多曲线对比~~ | ~~单图表内多条曲线（如真空 vs 空气阻力）~~ | ~~中~~ ✅ |
| ~~绘制数据 / 定标数据解耦~~ | ~~VelocityTime / DisplacementTime / AccelerationTime 三个预设统一加 `domainPoints`~~ | ~~高~~ ✅ |
| 渐近线 | 收尾速度、极限值虚线标注 | 中 |
| 面积渐变填充 | linearGradient 生成面积着色 | 中 |
| **阶段背景着色** | X 轴区间矩形分段填充（如 SatelliteAnimation Mode 1 发射/转弯/在轨三阶段）| 中（已被 SatelliteAnimation Mode 1 v-t 阻塞）|
| 交互悬浮 | Hover 显示数值卡片 | 低 |
| 双 Y 轴 | 左右各一个 Y 轴 | 低 |
| ~~SingleChart Y 范围加 padding~~ | ~~`ForceMotionTripleChart.SingleChart` 现 `Math.max(1, ...values)` 无顶部喘气空间，曲线峰值贴图顶~~ | ~~低~~ ✅ commit `3aba5f6` |
| ~~terminal 渐近线避免与曲线重合~~ | ~~在 zeroBased=true 的 v-t 图上 `terminalValue === maxAbs`，渐近虚线与曲线峰会重叠看不清~~ | ~~低~~ ✅ 同上（顺带解决） |
| MiniChart 评估 `domainPoints` 需求 | 已有 7 个消费方，需逐个看是否按 `time` 截断 points 再决定是否补齐 | 中 |
| MiniChart 是否并入 Chart/ 命名空间 | 现位于 `components/UI/`，语义更像图表预设 | 低 |

### 页面迁移状态

**已迁移：** ChargeInEField(vy-t)、CuttingEMF(v-t/a-t)、~~ForceMotionTripleChart(F-t/v-t/x-t 游标 + 面积)~~ ✅、MiniChart(7 个消费方)、MaxwellBoltzmannChart(f(v)-v)、ACGeneration(e-t)、~~FreeFallDripAnimation(v-t)~~ ✅、~~FreeFallAnimation(v-t 双曲线)~~ ✅、~~IntermolecularForceChart(F-r 三曲线 / Ep-r)~~ ✅、~~CoulombLaw BasicMode(F-r)~~ ✅、~~ElectricFieldBasicScene(E-r + F-r)~~ ✅、~~ThinLensAnimation(线性 + 双曲线 + 共轭法标记)~~ ✅、~~SatelliteAnimation Mode 0(v-r + T-r 画中画)~~ ✅

**未迁移：**

| 页面 | 图表类型 | 需要的预设 | 难度 |
|------|---------|------|:----:|
| SatelliteAnimation Mode 1 | v-t 三阶段时间曲线 | VelocityTimeChart + **阶段背景着色扩展** | 中 |
| ACValues | I-t + Q-t | VelocityTimeChart 变体 | 中 |
| ClapeyronAnimation | P-V 等温线 | **PVTChart** | 中 |
| GasLawsAnimation | P-V / V-T / P-T | **PVTChart** | 中 |
| VelocityVTChart | v-t 滑动窗口+面积+割线+切线 | VelocityTimeChart + ChartTangent + **ChartSecant** | 高 |
| VelocityXTChart | x-t 切线+割线三角形 | DisplacementTimeChart + ChartTangent + **ChartSecant** | 高 |
| VerticalThrowAnimation | v-t + y-t 双图+切线+交互 | VelocityTimeChart + DisplacementTimeChart + ChartTangent | 高 |
| KineticEnergyAnimation | 4 面板 Ek-x/W/Ep/F-x/F-x/a-t | RelationChart + AccelerationTimeChart | 高 |
| PowerAnimation | 4 面板 v-t/P-t/F-v/a-t | 多个预设组合 | 高 |
| FaradayChartPanel | Φ-t + E-t 双图 | 通用 t-* 预设 | 高 |
| FirstLawCenterExtra | P-V 循环 | **PVTChart** | 高 |

**迁移顺序：**
1. ~~FreeFallDripAnimation~~ ✅
2. ~~FreeFallAnimation~~ ✅
3. ~~创建 RelationChart 预设~~ ✅
4. ~~IntermolecularForceChart 试点（验证 markers / 多曲线 / 多模式）~~ ✅
5. ~~CoulombLaw / ElectricFieldBasicScene（验证 foreignObject 嵌入 + 多图并列）~~ ✅
6. ~~ThinLensAnimation（验证多模式切换 + 水平参考线 + 独立标记点）~~ ✅
7. ~~SatelliteAnimation Mode 0（验证画中画卡片 + foreignObject 拖拽热区分层）~~ ✅
8. ~~ForceMotionTripleChart 面积补齐（ChartArea 在非 BasePhysicsChart 容器复用）~~ ✅
9. **VelocityTimeChart 扩展「阶段背景着色」** → 解锁 SatelliteAnimation Mode 1 v-t 三阶段曲线
10. **创建 PVTChart 预设** → 批量解锁 ClapeyronAnimation / GasLawsAnimation / FirstLawCenterExtra
11. **创建 ChartSecant 插件** → 启动高难度三件套（VelocityVT / VelocityXT / VerticalThrow）
12. 其余按需

---

## 二、动画组件拆分

**P0** — 单文件超 500 行

| 文件 | 行数 | 计划 |
|------|------|------|
| `FreeFallAnimation.tsx` | 644（V-T 迁移后已减约 65 行） | 按 JSX 块拆子组件 |
| `UniformAccelerationCenterExtra.tsx` | 669 | 已有 5 个子组件，直接搬迁 |
| `VerticalThrowAnimation.tsx` | 697 | 先拆图表区（依赖 ChartSecant 预设） |
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

### 待做

**1. 试点推广**

| 试点 | 布局类型 | 验证目标 |
|------|---------|---------|
| Work | wide + 比例布局型 | `vp.visibleX/Y/W/H` 替代 `canvas.width/height` |
| Velocity | wide + 比例布局型 | 同上 |
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
