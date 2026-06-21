# 延后处理待办事项

> 仅保留未完成项。最后更新：2026-06-21

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
| VelocityTimeChart | ✅ |
| DisplacementTimeChart | ✅ |
| AccelerationTimeChart | ✅ |

### 待创建预设

| 组件 | 用途 | 优先级 |
|------|------|:------:|
| PVTChart | P-V / V-T / P-T 热力学图 | 中 |
| RelationChart | 通用 Y=f(X) 关系图 | 中 |
| ChartAsymptote 插件 | 渐近线（如收尾速度） | 低 |

### 待补充功能

| 功能 | 说明 | 优先级 |
|------|------|:------:|
| ~~多曲线对比~~ | ~~单图表内多条曲线（如真空 vs 空气阻力）~~ | ~~中~~ ✅ |
| 渐近线 | 收尾速度、极限值虚线标注 | 中 |
| 面积渐变填充 | linearGradient 生成面积着色 | 中 |
| 交互悬浮 | Hover 显示数值卡片 | 低 |
| 双 Y 轴 | 左右各一个 Y 轴 | 低 |

### 页面迁移状态

**已迁移：** ChargeInEField(vy-t)、CuttingEMF(v-t/a-t)、ForceMotionTripleChart(F-t/v-t/x-t 游标)、MiniChart(7 个消费方)、MaxwellBoltzmannChart(f(v)-v)、ACGeneration(e-t)

**未迁移：**

| 页面 | 图表类型 | 难度 |
|------|---------|:----:|
| ~~FreeFallDripAnimation~~ | ~~v-t 单曲线+面积~~ | ~~低~~ ✅ |
| CoulombLaw | F-r | 低 |
| ElectricFieldBasicScene | E-r + F-r | 低 |
| ForceMotionTripleChart | 面积部分 | 低 |
| ~~FreeFallAnimation~~ | ~~v-t 双曲线+渐变面积~~ | ~~中~~ ✅ |
| SatelliteAnimation | v-t + T-r | 中 |
| ThinLensAnimation | 1/v-1/u | 中 |
| ACValues | I-t + Q-t | 中 |
| ClapeyronAnimation | P-V 等温线 | 中 |
| GasLawsAnimation | P-V / V-T / P-T | 中 |
| IntermolecularForceChart | F-r / Ep-r | 中 |
| VelocityVTChart | v-t 滑动窗口+面积+割线+切线 | 高 |
| VelocityXTChart | x-t 切线+割线三角形 | 高 |
| VerticalThrowAnimation | v-t + y-t 双图+切线+交互 | 高 |
| KineticEnergyAnimation | 4 面板 Ek-x/W/Ep/F-x/F-x/a-t | 高 |
| PowerAnimation | 4 面板 v-t/P-t/F-v/a-t | 高 |
| FaradayChartPanel | Φ-t + E-t 双图 | 高 |
| FirstLawCenterExtra | P-V 循环 | 高 |

**迁移顺序：** ~~①FreeFallDripAnimation~~ ✅ → ②CoulombLaw / ElectricFieldBasicScene → ③FreeFallAnimation → ④其余按需

---

## 二、动画组件拆分

**P0** — 单文件超 500 行

| 文件 | 行数 | 计划 |
|------|------|------|
| `FreeFallAnimation.tsx` | 709 | 按 JSX 块拆子组件 |
| `UniformAccelerationCenterExtra.tsx` | 669 | 已有 5 个子组件，直接搬迁 |
| `VerticalThrowAnimation.tsx` | 623 | 先拆图表区 |
| `AccelerationCenterExtra.tsx` | 646 | 需修复规范违反 |

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

## 七、Viewport 架构

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
