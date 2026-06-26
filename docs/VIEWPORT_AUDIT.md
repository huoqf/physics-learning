# Viewport 架构审计报告

> 审计日期：2026-06-26
> 审计范围：`src/features/**/*Animation.tsx`（44 个动画组件）

---

## 1. 架构定义

| 层级 | 入口 | 职责 |
|------|------|------|
| Scene | 组件内部 | 物理场景数据 |
| **Viewport** | `useViewport(canvas, opts)` | 设计稿→可视区域映射、contain 缩放、overlay 遮挡扣除 |
| Renderer | SVG `<g transform={vp.transform}>` | 最终渲染 |

- **已采用**：组件同时调用 `useCanvasSize` + `useViewport`，通过 `vp.visibleW/H`、`vp.transform` 定位
- **未采用**：仅调用 `useCanvasSize`，组件内用 `canvasSize.width * ratio` 或硬编码像素定位

---

## 2. 逐组件审计

### 2.1 已采用 Viewport（16 个）

| # | 组件 | 模块 | designWidth×designHeight | 遮挡处理 |
|---|------|------|--------------------------|----------|
| 1 | `VelocityAnimation.tsx` | kinematics | — | — |
| 2 | `KinematicsAdvancedAnimation.tsx` | kinematics | — | overlayRight |
| 3 | `NewtonSecondAnimation.tsx` | dynamics | — | — |
| 4 | `FrictionAnimation.tsx` | dynamics | 800×440 | — |
| 5 | `CentripetalAnimation.tsx` | circular | — | overlayRight |
| 6 | `KeplerAnimation.tsx` | gravitation | — | overlayRight |
| 7 | `SatelliteAnimation.tsx` | gravitation | — | overlayRight |
| 8 | `MomentumAnimation.tsx` | momentum | 700×450 | — |
| 9 | `MomentumApplicationAnimation.tsx` | momentum | 700×450 | — |
| 10 | `MomentumConservationAnimation.tsx` | momentum | 700×180 | — |
| 11 | `MomentumTheoremAnimation.tsx` | momentum | — | overlayRight |
| 12 | `CollisionAnimation.tsx` | momentum | — | — |
| 13 | `WorkAnimation.tsx` | energy | 700×650 | — |
| 14 | `LightRodRopeAnimation.tsx` | energy | — | — |
| 15 | `SpringCompositeAnimation.tsx` | energy | — | overlayRight |
| 16 | `Transformer.tsx` | electromagnetism/induction | — | overlayRight |

### 2.2 未采用 Viewport（28 个）

| # | 组件 | 模块 | 主要定位方式 | 复杂度 |
|---|------|------|-------------|--------|
| 1 | `FreeFallAnimation.tsx` | kinematics | `{ width:100, height:100 }` + `physicsToCanvasWithOrigin` | 低 |
| 2 | `FreeFallDripAnimation.tsx` | kinematics | `{ width:100, height:100 }` | 低 |
| 3 | `VerticalThrowAnimation.tsx` | kinematics | `{ width:100, height:100 }` | 低 |
| 4 | `ProjectileAnimation.tsx` | kinematics | `{ width:100, height:100 }` + `physicsToCanvasWithOrigin` | 中 |
| 5 | `ObliqueThrowAnimation.tsx` | kinematics | `{ width:100, height:100 }` + `physicsToCanvasWithOrigin` | 中 |
| 6 | `AccelerationAnimation.tsx` | kinematics | `CANVAS_PRESETS.wide` + 比例定位 | 中 |
| 7 | `UniformAccelerationAnimation.tsx` | kinematics | `CANVAS_PRESETS.wide` + 比例定位 | 中 |
| 8 | `GravityAnimation.tsx` | dynamics | `CANVAS_PRESETS.mediumTall` + 比例定位 | 中 |
| 9 | `GravityBasicAnimation.tsx` | dynamics | `CANVAS_PRESETS.mediumTall` + 比例定位 | 低 |
| 10 | `SpringForceAnimation.tsx` | dynamics | `CANVAS_PRESETS.mediumWide` + 比例定位 | 中 |
| 11 | `ConnectedBodiesAnimation.tsx` | dynamics | `CANVAS_PRESETS.mediumWide` + `PX_PER_METER` | 中 |
| 12 | `VectorAdditionAnimation.tsx` | dynamics | `CANVAS_PRESETS.mediumTall` + 比例定位 | 低 |
| 13 | `EquilibriumAnimation.tsx` | dynamics | `CANVAS_PRESETS.mediumTall` + 比例定位 | 低 |
| 14 | `WeightlessnessAnimation.tsx` | dynamics | `CANVAS_PRESETS.tall` + 比例定位 | 中 |
| 15 | `CircularMotionAnimation.tsx` | circular | `CANVAS_PRESETS.square` + `physicsToCanvasWithOrigin` | 中 |
| 16 | `ImpulseAnimation.tsx` | momentum | `CANVAS_PRESETS.tall` + 比例定位 | 中 |
| 17 | `EnergyConservationAnimation.tsx` | energy | `CANVAS_PRESETS.standard` + 手动像素定位 | 高 |
| 18 | `PotentialEnergyAnimation.tsx` | energy | `CANVAS_PRESETS.standard` + 比例定位 | 中 |
| 19 | `KineticEnergyAnimation.tsx` | energy | `CANVAS_PRESETS.standard` + 比例定位 | 中 |
| 20 | `PowerAnimation.tsx` | energy | `CANVAS_PRESETS.standard` + 比例定位 | 中 |
| 21 | `ReflectionAnimation.tsx` | optics | `CANVAS_PRESETS.extraWide` + 比例定位 | 中 |
| 22 | `RefractionAnimation.tsx` | optics | `CANVAS_PRESETS.extraWide` + 比例定位 | 中 |
| 23 | `TIRAnimation.tsx` | optics | `CANVAS_PRESETS.extraWide` + 比例定位 | 中 |
| 24 | `ThinLensAnimation.tsx` | optics | `CANVAS_PRESETS.extraWide` + 比例定位 | 高 |
| 25 | `IntermolecularForcesAnimation.tsx` | thermodynamics | `CANVAS_PRESETS.standard` + 比例定位 | 中 |
| 26 | `GasLawsAnimation.tsx` | thermodynamics | `CANVAS_PRESETS.wide` + 比例定位 | 中 |
| 27 | `ClapeyronAnimation.tsx` | thermodynamics | `CANVAS_PRESETS.wide` + 比例定位 | 中 |
| 28 | `FirstLawAnimation.tsx` | thermodynamics | `CANVAS_PRESETS.wide` + 比例定位 | 高 |

> **注**：`ElectricField.tsx` 代码注释提及"Viewport 转换"，但实际未 import `useViewport`，仍属 legacy 路径。

---

## 3. 按模块统计

| 模块 | 已采用 | 未采用 | 迁移率 |
|------|--------|--------|--------|
| mechanics/kinematics | 2 | 5 | 29% |
| mechanics/dynamics | 2 | 7 | 22% |
| mechanics/circular | 1 | 1 | 50% |
| mechanics/gravitation | 2 | 0 | 100% |
| mechanics/momentum | 5 | 1 | 83% |
| mechanics/energy | 3 | 4 | 43% |
| electromagnetism/* | 1 | 0 | 100% |
| optics/* | 0 | 4 | 0% |
| thermodynamics/* | 0 | 4 | 0% |
| **合计** | **16** | **26** | **38%** |

---

## 4. 迁移风险评估

### 4.1 低风险（可批量迁移）

**特征**：仅用 `canvasSize.width * ratio` 做比例定位，无复杂交互坐标转换。

| 组件 | 行数 | 风险点 |
|------|------|--------|
| `GravityBasicAnimation.tsx` | ~200 | 无拖拽，纯展示 |
| `VectorAdditionAnimation.tsx` | ~250 | 无拖拽 |
| `EquilibriumAnimation.tsx` | ~200 | 无拖拽 |
| `PotentialEnergyAnimation.tsx` | ~300 | 无拖拽 |
| `KineticEnergyAnimation.tsx` | ~300 | 无拖拽 |
| `PowerAnimation.tsx` | ~350 | 无拖拽 |
| `ImpulseAnimation.tsx` | ~350 | 无拖拽 |

**迁移步骤**：
1. `import { useViewport } from '@/utils'`
2. 添加 `const vp = useViewport(canvasSize, { designWidth: N, designHeight: M })`
3. 将 `canvasSize.width * ratio` 替换为 `vp.visibleW * ratio` 或 `vp.visibleX + vp.visibleW * ratio`
4. SVG 根节点添加 `<g transform={vp.transform}>` 包裹设计坐标元素
5. 验证各窗口尺寸下布局一致

### 4.2 中等风险（需逐个验证）

**特征**：含拖拽交互、坐标转换（`physicsToCanvasWithOrigin`）、或复杂子组件布局。

| 组件 | 行数 | 风险点 |
|------|------|--------|
| `AccelerationAnimation.tsx` | ~400 | 有 v-t 图表嵌套 |
| `UniformAccelerationAnimation.tsx` | ~400 | 有 v-t 图表嵌套 |
| `GravityAnimation.tsx` | ~350 | 有轨迹绘制 |
| `SpringForceAnimation.tsx` | ~350 | 弹簧形变需坐标联动 |
| `ConnectedBodiesAnimation.tsx` | ~400 | 多物体联动 |
| `WeightlessnessAnimation.tsx` | ~350 | 双模式布局 |
| `CircularMotionAnimation.tsx` | ~400 | 圆周轨迹 + `physicsToCanvasWithOrigin` |
| `ProjectileAnimation.tsx` | ~300 | 抛物线轨迹 + `physicsToCanvasWithOrigin` |
| `ObliqueThrowAnimation.tsx` | ~300 | 抛物线轨迹 + `physicsToCanvasWithOrigin` |
| `IntermolecularForcesAnimation.tsx` | ~350 | 粒子动画 |
| `GasLawsAnimation.tsx` | ~400 | 气缸+活塞联动 |
| `ClapeyronAnimation.tsx` | ~400 | PV 图表 + 气缸 |
| `ReflectionAnimation.tsx` | ~350 | 光路 + 镜面交互 |
| `RefractionAnimation.tsx` | ~350 | 光路 + 折射角计算 |

**迁移步骤**：
1. 确定 designWidth/height（从现有 `CANVAS_PRESETS` 或组件布局推算）
2. 标注所有 `canvasSize.width * N` / `canvasSize.height * N` 位置
3. 替换为 viewport 比例坐标
4. 拖拽事件中将屏幕坐标通过 viewport 反算回设计坐标
5. 逐模式/逐状态验证

### 4.3 高风险（需专项重构）

**特征**：大量手动像素定位、多层嵌套布局、或复杂交互逻辑。

| 组件 | 行数 | 风险点 |
|------|------|--------|
| `EnergyConservationAnimation.tsx` | 717 | 70+ 行手动像素定位、拖拽交互、双模式（单摆/山谷）、图表+动画上下分区 |
| `ThinLensAnimation.tsx` | ~500 | 凸透镜成像多物距模式、光路追踪、动态标签 |
| `FirstLawAnimation.tsx` | ~500 | P-V 图表 + 气缸 + 滑块交互 + 三模式切换 |

**迁移步骤**：
1. 先梳理所有硬编码像素值（`padding`、`groundY`、`chartLeft` 等），建立布局常量表
2. 定义 designWidth/designHeight（建议 800×600 或 900×700）
3. 将布局常量从绝对像素改为 viewport 比例
4. 拖拽坐标转换需逐个处理
5. 编写视觉回归测试对比迁移前后截图

---

## 5. 未迁移的共性风险

### 5.1 响应式布局不一致

未采用 Viewport 的组件在窗口缩放时，可能出现：
- 元素重叠（窄屏时图表/场景区挤压）
- 元素溢出（宽屏时内容未居中）
- 字体/箭头大小不随容器缩放

### 5.2 与 AnimationPage 的 ThreePanel 冲突

`AnimationPage.tsx:292` 使用 `calc(100vh - 56px)` 限制高度。未采用 Viewport 的组件在三栏布局下：
- 左侧参数面板折叠/展开时，画布尺寸突变但组件未重算布局
- 移动端右侧下移时，画布高度骤降但组件仍按原始比例定位

### 5.3 VectorArrow 长度不规范

`FrictionAnimation.tsx:70` 使用 `createSceneScaleFromViewport(vp, sceneProfile)` 归一化矢量长度。未迁移组件使用 `createSceneScale`（基于 `canvasSize`），在不同容器尺寸下矢量箭头长度比例不一致。

---

## 6. 建议迁移优先级

| 优先级 | 组件 | 理由 |
|--------|------|------|
| P0 | `EnergyConservationAnimation.tsx` | 717 行最大文件，硬编码最多，用户高频使用 |
| P1 | `AccelerationAnimation.tsx` / `UniformAccelerationAnimation.tsx` | 运动学核心动画，图表嵌套需统一 |
| P1 | `ThinLensAnimation.tsx` | 光学唯一组件，复杂度高但数量少 |
| P2 | `GasLawsAnimation.tsx` / `ClapeyronAnimation.tsx` / `FirstLawAnimation.tsx` | 热学模块整体迁移 |
| P2 | `ProjectileAnimation.tsx` / `ObliqueThrowAnimation.tsx` | 抛体运动，需与 `KinematicsAdvancedAnimation` 对齐 |
| P3 | 其余低风险组件 | 批量迁移，风险可控 |

---

## 7. 迁移检查清单

每个组件迁移后需验证：

- [ ] 窗口拖拽缩放时布局无溢出/重叠
- [ ] 三栏布局（左面板展开/折叠）下动画区自适应
- [ ] 移动端断点下右侧下移时布局正常
- [ ] 拖拽交互（如有）坐标转换正确
- [ ] 矢量箭头长度在不同尺寸下比例一致
- [ ] 字体大小在小屏下可读（≥7px clamp）
- [ ] 图表区域（如有）不与场景区重叠
- [ ] `createSceneScaleFromViewport` 替代 `createSceneScale`
- [ ] TypeScript 编译通过
- [ ] 视觉回归测试通过

---

*审计人：MiMo Code Agent | 审计方法：grep + glob + 逐文件 Read*
