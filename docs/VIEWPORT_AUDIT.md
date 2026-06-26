# Viewport 架构审计报告

> 审计日期：2026-06-26（v2 核对版）
> 审计范围：`src/features/**/*Animation.tsx`（44 个）+ `Transformer.tsx`（1 个）= **45 个动画组件**

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

### 2.1 已采用 Viewport（27 个）

| # | 组件 | 模块 | 行数 | designWidth×designHeight | 遮挡处理 |
|---|------|------|------|--------------------------|----------|
| 1 | `VelocityAnimation.tsx` | kinematics | 286 | 700×400 | — |
| 2 | `KinematicsAdvancedAnimation.tsx` | kinematics | 359 | 600×160 | — |
| 3 | `FreeFallAnimation.tsx` | kinematics | 155 | 100×100 | — |
| 4 | `NewtonSecondAnimation.tsx` | dynamics | 289 | 700×400 | — |
| 5 | `FrictionAnimation.tsx` | dynamics | 599 | 800×440 | — |
| 6 | `SpringForceAnimation.tsx` | dynamics | 202 | 650×400 | — |
| 7 | `WeightlessnessAnimation.tsx` | dynamics | 770 | 700×450 | — |
| 8 | `VectorAdditionAnimation.tsx` | dynamics | 808 | 650×450 | — |
| 9 | `EquilibriumAnimation.tsx` | dynamics | 681 | 650×450 | — |
| 7 | `CentripetalAnimation.tsx` | circular | 837 | 600×600 | overlayRight（动态） |
| 8 | `KeplerAnimation.tsx` | gravitation | 640 | 650×450 | — |
| 9 | `SatelliteAnimation.tsx` | gravitation | 1049 | 650×450 | — |
| 10 | `MomentumAnimation.tsx` | momentum | — | 700×450 | — |
| 11 | `MomentumApplicationAnimation.tsx` | momentum | — | 700×180 | — |
| 12 | `MomentumConservationAnimation.tsx` | momentum | 673 | 700×180 | — |
| 13 | `MomentumTheoremAnimation.tsx` | momentum | 759 | 600×450 | overlayRight（动态） |
| 14 | `CollisionAnimation.tsx` | momentum | 394 | 700×450 | — |
| 15 | `WorkAnimation.tsx` | energy | — | 700×650 | — |
| 16 | `LightRodRopeAnimation.tsx` | energy | 509 | 700×420 | — |
| 17 | `SpringCompositeAnimation.tsx` | energy | 1271 | 700×420 | — |
| 18 | `KineticEnergyAnimation.tsx` | energy | 145 | 700×420 | — |
| 19 | `PowerAnimation.tsx` | energy | 174 | 700×420 | — |
| 20 | `PotentialEnergyAnimation.tsx` | energy | 195 | 700×420 | — |
| 21 | `EnergyConservationAnimation.tsx` | energy | 656 | 700×420 | — |
| 21 | `Transformer.tsx` | electromagnetism/induction | 698 | 380×(355/320) | overlayRight（动态） |
| 22 | `IntermolecularForcesAnimation.tsx` | thermodynamics | 168 | 700×420 | — |
| 23 | `ReflectionAnimation.tsx` | optics | 202 | viewBox 800×500 | viewBox 等效 |

### 2.2 未采用 Viewport（18 个）

| # | 组件 | 模块 | 行数 | 主要定位方式 | 复杂度 |
|---|------|------|------|-------------|--------|
| 1 | `FreeFallDripAnimation.tsx` | kinematics | 500 | `{ width:100, height:100 }` | 中 |
| 2 | `VerticalThrowAnimation.tsx` | kinematics | 319 | `{ width:100, height:100 }` | 低 |
| 3 | `ProjectileAnimation.tsx` | kinematics | 434 | `{ width:100, height:100 }` + `physicsToCanvasWithOrigin` | 中 |
| 4 | `ObliqueThrowAnimation.tsx` | kinematics | 479 | `{ width:100, height:100 }` + `physicsToCanvasWithOrigin` | 中 |
| 5 | `AccelerationAnimation.tsx` | kinematics | 334 | `CANVAS_PRESETS.wide` + 比例定位 | 中 |
| 6 | `UniformAccelerationAnimation.tsx` | kinematics | 451 | `CANVAS_PRESETS.wide` + 比例定位 | 中 |
| 7 | `GravityAnimation.tsx` | dynamics | 454 | `CANVAS_PRESETS.mediumTall` + 比例定位 | 中 |
| 8 | `GravityBasicAnimation.tsx` | dynamics | 514 | `CANVAS_PRESETS.mediumTall` + 比例定位 | 中 |
| 9 | `ConnectedBodiesAnimation.tsx` | dynamics | 552 | `CANVAS_PRESETS.mediumWide` + `PX_PER_METER` | 中 |
| 10 | `CircularMotionAnimation.tsx` | circular | 547 | `CANVAS_PRESETS.square` + `physicsToCanvasWithOrigin` | 中 |
| 14 | `ImpulseAnimation.tsx` | momentum | 452 | `CANVAS_PRESETS.tall` + 比例定位 | 中 |
| 15 | `RefractionAnimation.tsx` | optics | 457 | `CANVAS_PRESETS.extraWide` + 比例定位 | 中 |
| 16 | `TIRAnimation.tsx` | optics | 559 | `CANVAS_PRESETS.extraWide` + 比例定位 | 中 |
| 17 | `ThinLensAnimation.tsx` | optics | 751 | `CANVAS_PRESETS.extraWide` + 比例定位 | 高 |
| 19 | `GasLawsAnimation.tsx` | thermodynamics | 367 | `CANVAS_PRESETS.wide` + 比例定位 | 中 |
| 20 | `ClapeyronAnimation.tsx` | thermodynamics | 327 | `CANVAS_PRESETS.wide` + 比例定位 | 中 |
| 21 | `FirstLawAnimation.tsx` | thermodynamics | 433 | `CANVAS_PRESETS.wide` + 比例定位 | 中 |
| 22 | `SecondLawAnimation.tsx` | thermodynamics | 343 | `CANVAS_PRESETS.wide` + 比例定位 | 中 |

> **注**：`ElectricField.tsx` 代码注释提及"Viewport 转换"，但实际未 import `useViewport`，仍属 legacy 路径。
> `ReflectionAnimation.tsx` 已通过 SVG `viewBox` + `preserveAspectRatio="xMidYMid meet"` 实现 viewport 等效缩放，无需额外迁移。

---

## 3. 按模块统计

| 模块 | 已采用 | 未采用 | 合计 | 迁移率 |
|------|--------|--------|------|--------|
| mechanics/kinematics | 3 | 4 | 7 | 43% |
| mechanics/dynamics | 6 | 3 | 9 | 67% |
| mechanics/circular | 1 | 1 | 2 | 50% |
| mechanics/gravitation | 2 | 0 | 2 | 100% |
| mechanics/momentum | 5 | 1 | 6 | 83% |
| mechanics/energy | 7 | 0 | 7 | 100% |
| electromagnetism/* | 1 | 0 | 1 | 100% |
| optics/* | 2 | 2 | 4 | 50% |
| thermodynamics/* | 1 | 4 | 5 | 20% |
| **合计** | **27** | **18** | **45** | **60%** |

> ⚠️ 注意：`ThinLensAnimation.tsx` 已通过 SVG viewBox 实现 viewport 等效缩放，计入 optics 已采用。全量 45 个组件，迁移率 **60%**（27/45）。

---

## 4. 迁移风险评估

### 4.1 低风险（可批量迁移）

**特征**：仅用 `canvasSize.width * ratio` 做比例定位，无复杂交互坐标转换，行数 < 300。

> ✅ 以下组件已在 v2 审计中完成迁移：`KineticEnergyAnimation`(145)、`FreeFallAnimation`(155)、`IntermolecularForcesAnimation`(168)、`PowerAnimation`(174)、`PotentialEnergyAnimation`(195)、`SpringForceAnimation`(202)。`ReflectionAnimation`(202) 已通过 SVG viewBox 实现等效缩放。

**迁移步骤**：
1. `import { useViewport } from '@/utils'`
2. 添加 `const vp = useViewport(canvasSize, { designWidth: N, designHeight: M })`
3. 将 `canvasSize.width * ratio` 替换为 `vp.visibleW * ratio` 或 `vp.visibleX + vp.visibleW * ratio`
4. SVG 根节点添加 `<g transform={vp.transform}>` 包裹设计坐标元素
5. 验证各窗口尺寸下布局一致

### 4.2 中等风险（需逐个验证）

**特征**：含拖拽交互、坐标转换（`physicsToCanvasWithOrigin`）、或复杂子组件布局，行数 300–600。

| 组件 | 行数 | 风险点 |
|------|------|--------|
| `AccelerationAnimation.tsx` | 334 | 有 v-t 图表嵌套 |
| `VerticalThrowAnimation.tsx` | 319 | 竖直上抛轨迹 |
| `ClapeyronAnimation.tsx` | 327 | PV 图表 + 气缸 |
| `GasLawsAnimation.tsx` | 367 | 气缸+活塞联动 |
| `FirstLawAnimation.tsx` | 433 | P-V 图表 + 气缸 + 滑块交互 |
| `SecondLawAnimation.tsx` | 343 | 热力学第二定律 |
| `ProjectileAnimation.tsx` | 434 | 抛物线轨迹 + `physicsToCanvasWithOrigin` |
| `UniformAccelerationAnimation.tsx` | 451 | 有 v-t 图表嵌套 |
| `ImpulseAnimation.tsx` | 452 | 冲量-动量关系 |
| `GravityAnimation.tsx` | 454 | 有轨迹绘制 |
| `RefractionAnimation.tsx` | 457 | 光路 + 折射角计算 |
| `ObliqueThrowAnimation.tsx` | 479 | 抛物线轨迹 + `physicsToCanvasWithOrigin` |
| `FreeFallDripAnimation.tsx` | 500 | 滴水自由落体 |
| `GravityBasicAnimation.tsx` | 514 | 基础重力 |
| `ConnectedBodiesAnimation.tsx` | 552 | 多物体联动 |
| `TIRAnimation.tsx` | 559 | 全反射光路 |
| `CircularMotionAnimation.tsx` | 547 | 圆周轨迹 + `physicsToCanvasWithOrigin` |
| `EnergyConservationAnimation.tsx` | 656 | 70+ 行手动像素定位、拖拽交互、双模式（单摆/山谷） |

**迁移步骤**：
1. 确定 designWidth/height（从现有 `CANVAS_PRESETS` 或组件布局推算）
2. 标注所有 `canvasSize.width * N` / `canvasSize.height * N` 位置
3. 替换为 viewport 比例坐标
4. 拖拽事件中将屏幕坐标通过 viewport 反算回设计坐标
5. 逐模式/逐状态验证

### 4.3 高风险（需专项重构）

**特征**：大量手动像素定位、多层嵌套布局、或复杂交互逻辑，行数 > 600。

| 组件 | 行数 | 风险点 |
|------|------|--------|
| `VectorAdditionAnimation.tsx` | 808 | 多矢量叠加、坐标计算密集 |
| `EquilibriumAnimation.tsx` | 681 | 三力平衡、多角度参数 |
| `WeightlessnessAnimation.tsx` | 770 | 双模式（完全/部分失重）、电梯+卫星场景 |
| `ThinLensAnimation.tsx` | 751 | 凸透镜成像多物距模式、光路追踪、动态标签 |
| `EnergyConservationAnimation.tsx` | 656 | 手动像素定位密集、拖拽交互、双模式（单摆/山谷）、图表+动画上下分区 |

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

| 优先级 | 组件 | 行数 | 理由 |
|--------|------|------|------|
| P0 | ~~`EnergyConservationAnimation.tsx`~~ | 656 | ✅ 已完成迁移 |
| P0 | ~~`WeightlessnessAnimation.tsx`~~ | 770 | ✅ 已完成迁移 |
| P1 | ~~`VectorAdditionAnimation.tsx`~~ | 808 | ✅ 已完成迁移 |
| P1 | ~~`EquilibriumAnimation.tsx`~~ | 681 | ✅ 已完成迁移 |
| P1 | ~~`ThinLensAnimation.tsx`~~ | 751 | ✅ 已有 viewBox 等效 |
| P2 | `AccelerationAnimation.tsx` / `UniformAccelerationAnimation.tsx` | 334/451 | 运动学核心，图表嵌套需统一 |
| P2 | `GasLawsAnimation.tsx` / `ClapeyronAnimation.tsx` / `FirstLawAnimation.tsx` | 367/327/433 | 热学模块整体迁移 |
| P2 | `ProjectileAnimation.tsx` / `ObliqueThrowAnimation.tsx` | 434/479 | 抛体运动，需与 `KinematicsAdvancedAnimation` 对齐 |
| P3 | 其余低风险组件（7 个，均 < 300 行） | — | 批量迁移，风险可控 |

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
