# VIEWPORT 架构迁移整改计划

> 创建时间：2026-08-01
> 目标：将所有动画页面迁移至标准 VIEWPORT 架构（useAnimationViewport + AnimationSvgCanvas + useSceneScale + worldToDesign）
> 状态：计划制定完成，P1 整改进行中

---

## 总体原则

标准架构路径：
```
useAnimationViewport({ preset }) → 获取 { containerRef, canvasSize, vp, preset }
useSceneScale({ vp, preset, anchor, physicsWidth, physicsHeight }) → SceneScale
AnimationSvgCanvas(containerRef, transform={vp.transform}) → SVG 容器
worldToDesign({ x, y }, sceneScale) → 物理坐标 → 设计坐标
PhysicsVectorArrow/VectorArrow → 矢量箭头（在 AnimationSvgCanvas 内部使用）
```

设计分辨率由 CANVAS_PRESETS 确定 → 动画按预设分辨率设计 → 通过 viewport/坐标变换/矢量组件保证不同分辨率设备正常显示。

---

## 优先级

| 优先级 | 范围 | 文件数 | 说明 |
|--------|------|:------:|------|
| **P1** | 主动画页面（完全未采用标准架构） | 7 | 无 useAnimationViewport 或虽有用但无 AnimationSvgCanvas |
| **P2** | 中屏扩展区/侧面板（CenterExtra） | 9 | 直接 useCanvasSize 或手写 viewBox |
| **P3** | 其他违规（字体/矢量箭头） | 2 | fontSize 裸值 / 手写 marker |

---

## P1 文件清单及整改方案

### 1. PowerTransmission.tsx — 远距离输电

**路径**：`src/features/electromagnetism/induction/PowerTransmission.tsx`
**现状**：完全自定义实现，无 useAnimationViewport，无 AnimationSvgCanvas，手写 font 函数，手写 viewBox SVG
**风险**：**高**。该组件使用自定义 ref-based 动画循环 + 多段 SVG 渲染，结构复杂
**方案**：
  1. 引入 useAnimationViewport + AnimationSvgCanvas
  2. 将手写 viewBox SVG 迁移至 AnimationSvgCanvas 内部
  3. 替换 font 函数为 canvasSize.font
  4. 将颜色转为 theme token
  5. 使用 useSceneScale + worldToDesign 替代手动坐标计算

### 2. LightRodRopeAnimation.tsx — 轻杆轻绳

**路径**：`src/features/mechanics/energy/LightRodRopeAnimation.tsx`
**现状**：无 useAnimationViewport，自定义 flex 布局，左 SVG viewBox="0 0 360 650" + 右图表
**风险**：**中高**。布局为自定义左右分栏，需要保持相同布局效果
**方案**：
  1. 引入 useAnimationViewport + AnimationSvgCanvas 包裹左半部分 SVG
  2. 保持 flex 布局结构不变，仅替换内部 SVG 渲染方式
  3. 替换 viewBox 依赖为 vp.transform 设计坐标

### 3. CuttingEMF.tsx — 切割磁感线

**路径**：`src/features/electromagnetism/induction/CuttingEMF.tsx`
**现状**：有 useAnimationViewport 但无 AnimationSvgCanvas，CuttingEMFScene 子组件手写 viewBox
**风险**：**中**。已使用 useAnimationViewport，主要迁移场景组件
**方案**：
  1. 在 CuttingEMF.tsx 中引入 AnimationSvgCanvas 包裹场景
  2. 修改 CuttingEMFScene 从接收 raw SVG props 改为接收 vp.transform 场景参数
  3. 移除 CuttingEMFScene 中的 viewBox

### 4. AmpereForce.tsx — 安培力

**路径**：`src/features/electromagnetism/magnetism/AmpereForce.tsx`
**现状**：有 useAnimationViewport 但无 AnimationSvgCanvas，多个 viewBox 分区 SVG
**风险**：**中**。有多分区布局（上下分区 + 卡片），需保持原布局
**方案**：
  1. 为每个 SVG 分区引入独立的 AnimationSvgCanvas 或统一使用 vp.transform
  2. 移除 hand-coded viewBox
  3. 使用 worldToDesign 替代手动坐标

### 5. CircularGeometryModel.tsx — 圆形边界磁场

**路径**：`src/features/electromagnetism/magnetism/CircularGeometryModel/CircularGeometryModel.tsx`
**现状**：有 useAnimationViewport 但无 AnimationSvgCanvas，viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`} 双重缩放反模式
**风险**：**中**。双重缩放反模式（viewBox + vp.transform 同时使用）
**方案**：
  1. 引入 AnimationSvgCanvas 替代手写 viewBox SVG
  2. 移除 viewBox 属性，依赖 vp.transform 完成缩放
  3. 使用 worldToDesign 替代手动坐标计算

### 6. FreeFallDripAnimation.tsx — 自由落体（滴漏）

**路径**：`src/features/mechanics/kinematics/FreeFallDripAnimation.tsx`
**现状**：有 useAnimationViewport 但无 AnimationSvgCanvas，FreeFallScene 子组件手写 viewBox
**风险**：**中低**。已有 useAnimationViewport，主要迁移场景组件
**方案**：
  1. 在 FreeFallDripAnimation 中引入 AnimationSvgCanvas
  2. 修改 FreeFallScene 移除 viewBox，接收 vp 参数
  3. 替换 FONT.* 常量使用为 font() 函数

### 7. UniformAccelerationAnimation.tsx — 匀变速直线运动

**路径**：`src/features/mechanics/kinematics/UniformAccelerationAnimation.tsx`
**现状**：有 useAnimationViewport 但无 AnimationSvgCanvas，手写 viewBox SVG
**风险**：**中低**。已有 useAnimationViewport，结构相对简单
**方案**：
  1. 引入 AnimationSvgCanvas 替代手写 viewBox SVG
  2. 移除 viewBox 属性，依赖 vp.transform 完成缩放
  3. 使用 worldToDesign 替代手动坐标计算

---

## P2 文件清单及整改方案

### 1. 直接 useCanvasSize 的 CenterExtra（5 个）

| 文件 | 路径 | 方案 |
|------|------|------|
| IntermolecularForcesCenterExtra | `src/features/thermodynamics/kinematics/IntermolecularForcesCenterExtra.tsx` | 替换为 useAnimationViewport |
| CircuitAnalysisCenterExtra | `src/features/electromagnetism/dc-circuits/CircuitAnalysisCenterExtra.tsx` | 替换为 useAnimationViewport |
| FrictionCenterExtra | `src/features/mechanics/dynamics/FrictionCenterExtra.tsx` | 替换为 useAnimationViewport |
| NewtonSecondCenterExtra | `src/features/mechanics/dynamics/NewtonSecondCenterExtra.tsx` | 替换为 useAnimationViewport |
| WeightlessnessCenterExtra | `src/features/mechanics/dynamics/WeightlessnessCenterExtra.tsx` | 替换为 useAnimationViewport |

### 2. 有 useAnimationViewport 但手写 viewBox 的 CenterExtra（4 个）

| 文件 | 路径 | 方案 |
|------|------|------|
| SpringForceCenterExtra | `src/features/mechanics/dynamics/SpringForceCenterExtra.tsx` | 引入 AnimationSvgCanvas |
| AccelerationCenterExtra | `src/features/mechanics/kinematics/AccelerationCenterExtra.tsx` | 引入 AnimationSvgCanvas |
| MultimeterCenterExtra | `src/features/electromagnetism/dc-circuits/MultimeterCenterExtra.tsx` | 引入 AnimationSvgCanvas |
| FirstLawCenterExtra | `src/features/thermodynamics/firstLaw/FirstLawCenterExtra.tsx` | 引入 useAnimationViewport + AnimationSvgCanvas |

---

## P3 文件清单

| 文件 | 问题 | 方案 |
|------|------|------|
| Capacitor.tsx | 手写 `<marker>` 矢量箭头 | 替换为 VectorArrow 组件 |
| OrbitTransferAnimation.tsx | `fontSize={9}` 裸值 | 替换为 `font(9)` |

---

## 验收标准

所有迁移完成后：
1. `tsc --noEmit` 类型检查通过
2. 无 viewBox 属性的主动画页面（场景内 marker viewBox 可接受）
3. 所有主动画页面使用 `useAnimationViewport` + `AnimationSvgCanvas` 标准路径
4. 无 `useCanvasSize` 直接调用（CenterExtra 内图表组件除外）
5. 无 `fontSize={N}` 裸值
6. 同屏对比迁移前后视觉效果一致