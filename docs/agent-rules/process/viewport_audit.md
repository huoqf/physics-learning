# Viewport 双重缩放问题审计报告

## 问题定义

**双重缩放反模式**：SVG 同时使用：
1. `viewBox={`0 0 ${width} ${height}`}` ← 动态容器尺寸（由 ResizeObserver 提供）  
2. `<g transform={vp.transform}>` ← 再次手动缩放到设计坐标系

这两者相互矛盾：viewBox 定义了 SVG 的坐标系尺寸，vp.transform 又在其上重新缩放，导致：
- **首次渲染**：width/height = 设计稿默认值，scale ≈ 1，正常
- **ResizeObserver 触发后**：width/height 变为真实容器尺寸，viewBox 扩大，画面"放大"

---

## 问题文件清单（5个）

| 文件 | 模块 | 严重程度 |
|------|------|---------|
| [ElectricField.tsx](file:///d:/code/physic/physics-learning/src/features/electromagnetism/electrostatics/ElectricField.tsx) | 静电学 | 🔴 高 |
| [ReflectionAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/optics/reflection/ReflectionAnimation.tsx) | 光学-反射 | 🔴 高 |
| [RefractionAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/optics/refraction/RefractionAnimation.tsx) | 光学-折射 | 🔴 高 |
| [ThinLensAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/optics/thin-lens/ThinLensAnimation.tsx) | 光学-薄透镜 | 🔴 高 |
| [TIRAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/optics/total-internal-reflection/TIRAnimation.tsx) | 光学-全内反射 | 🔴 高 |

> ✅ **已修复**：`FieldLines.tsx`（电场线与等势面）

---

## 不受影响的文件（合法用法）

### 合法：动态 viewBox 但无 vp.transform（方式A变体）
- 热力学模块（SecondLaw、BrownianMotion、GasLaws、ClapeyronAnimation 等）
- `ACValues.tsx`（电磁感应）

这些文件用动态 viewBox 但没有 vp.transform，不存在双重缩放，但**仍有轻微的首帧跳变**（viewBox 从默认值变为真实尺寸）。

### 合法：有 vp.transform 但无 SVG viewBox（方式B正确用法）
- 力学模块（Momentum、Friction、Kepler 等大多数）
- 这些用 canvas 或 `viewBox="0 0 {固定值}"` + vp.transform，无问题

---

## 修复方案

对 5 个问题文件，统一应用 `FieldLines.tsx` 的修复模式：

```diff
// 1. viewBox 固定为设计尺寸（不再跟随容器变化）
- viewBox={`0 0 ${width} ${height}`}
+ viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`}

// 2. 移除双重缩放层
- <g transform={vp.transform}>
+ <g>

// 3. 指针事件改用 SVG 原生矩阵变换
- const x = (e.clientX - rect.left - vp.tx) / vp.scale
- const y = (e.clientY - rect.top - vp.ty) / vp.scale
+ const pt = svg.createSVGPoint()
+ pt.x = e.clientX; pt.y = e.clientY
+ const { x, y } = pt.matrixTransform(svg.getScreenCTM()!.inverse())

// 4. 移除不再需要的变量
- const { width, height, font } = canvasSize
+ const { font } = canvasSize   // width/height 不再需要

// 5. 移除不再需要的 useViewport（如果组件中 vp 只用于 transform）
- const vp = useViewport(canvasSize, { ... })
```

> **注意**：如果文件中 `vp.visibleX/Y/W/H/scale` 还有其他用途（如定位浮层），
> 则保留 `useViewport`，只移除 `vp.transform` 和 viewBox 动态尺寸部分。

---

## 根本原因 & 架构说明

```
正确理解 SVG 的坐标系：

  viewBox="0 0 700 480"   ← 定义 SVG 内部的坐标空间（设计稿尺寸）
  width="100%" height="100%"  ← 定义 SVG 在 DOM 中占据的物理空间
  preserveAspectRatio="xMidYMid meet"  ← SVG 自动居中缩放，无需手动 transform

当 viewBox 固定时，无论容器多大，SVG 内部坐标系始终是 0~700 × 0~480。
ResizeObserver 的触发不会改变任何坐标，消除跳变。
```
