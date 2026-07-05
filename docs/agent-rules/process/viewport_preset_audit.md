# Viewport & CANVAS_PRESETS 规范审计报告

> 检查时间：2026-07-05 | 基准文档：`project_rules.md §CANVAS_PRESETS`

---

## 有效 Preset 规格（当前）

| preset | viewBox 设计坐标 | 高度基准 | 选用条件 |
|--------|----------------|---------|---------|
| `full`   | 700×650 | 650 | 动画独占中屏全区域 |
| `splitV` | 700×325 | 325 = 650/2 | 中屏上下并列 |
| `splitH` | 350×650 | 650 | 中屏左右并列 |
| `square` | **650×650** | 650 | 圆周/旋转对称场景 |

> 四个有效 preset 高度基准统一为 650（或其一半），体系自洽。

---

## 问题三：`square` 文档/代码不一致 ✅ 已修复

**原状态**：`spacing.ts` 写 `600×600`，`project_rules.md` 写 `650×650`，不一致。

**决策**：650 是中屏可用高度基准，`full/splitV/splitH` 均以此对齐，`square` 取高度 650 做正方形在架构上更合理，600 是历史错误设计。以文档（650×650）为准修正代码。

**已改动文件**：

| 文件 | 改动 |
|------|------|
| [`spacing.ts` L83](file:///d:/code/physic/physics-learning/src/theme/spacing.ts#L83) | `square: 600×600 → 650×650`，注释同步更新 |
| [`CircularMotionAnimation.tsx` L20](file:///d:/code/physic/physics-learning/src/features/mechanics/circular/CircularMotionAnimation.tsx#L20) | `CIRCULAR_DESIGN: 600×600 → 650×650` |
| [`useCentripetalPhysics.ts` L146-147](file:///d:/code/physic/physics-learning/src/features/mechanics/circular/hooks/useCentripetalPhysics.ts#L146-L147) | `designWidth/Height: 600 → 650` |

> `SimulationView.tsx` 走 Canvas 直接渲染，不用 `useViewport`，无需改动。

---

## 问题一、二：使用废弃 Preset（`wide` / `tall`）⚠️ 暂不迁移

### 现状

`spacing.ts` 中已标注「历史预设，迁移完成后删除」，但仍有大量文件引用：

- **`wide`（700×400）**：约 33 个文件
- **`tall`（700×450）**：约 16 个文件

规范要求新组件只能用四个有效 preset。

### 迁移收益与风险分析

#### 关键机制：`wide/tall` 的隐性放大效果

在标准 1440px 桌面下，中屏容器实测约 **840×650 px**。

`useCanvasSize` 的 `scale = min(容器W / presetW, 容器H / presetH)`：

| preset | scale 计算 | 实际 scale | `font()`/`px()` 效果 |
|--------|-----------|-----------|---------------------|
| `wide` 700×400 | min(840/700, 650/400) | **1.20** | 放大 20% |
| `tall` 700×450 | min(840/700, 650/450) | **1.20** | 放大 20% |
| `full` 700×650 | min(840/700, 650/650) | **1.00** | 无放大，1:1 |

**`wide/tall` 实质上是靠缩小 preset 基准来人为放大字体和元素尺寸的。**
迁移到 `full` 后 `scale` 从 1.20 降到 1.00，**所有 `font()` / `px()` 调用结果缩小 17%**。

#### 迁移方案对比

| 操作方案 | 代码改动量 | 视觉变化 | 风险 |
|---------|-----------|---------|------|
| 只改 preset，不改 designHeight | ~50 行 | 所有文字缩小 17% | 中（需全量视觉回归） |
| 改 preset + 改 designHeight | ~100 行 | 使用 `vp.transform` 的场景缩水 38% | 高（需逐组件调参） |
| 改 preset + 改 designHeight + 重调坐标 | 数百行 | 需全部重新排布 | 极高（相当于重画） |

#### 高风险子集：使用 `vp.transform` 的 SVG 设计坐标组件

若同时修改 `designHeight: 400 → 650`，`vp.transform` 的 scale 从 1.625 降到 1.0，**SVG 画面整体缩水 38%**。

涉及文件（11 个）：
- [TIRAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/optics/total-internal-reflection/TIRAnimation.tsx)
- [RefractionAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/optics/refraction/RefractionAnimation.tsx)
- [SpringBlocksAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/momentum/SpringBlocksAnimation.tsx)
- [MomentumConservationAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/momentum/MomentumConservationAnimation.tsx)
- [ManBoatAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/momentum/ManBoatAnimation.tsx)
- [CurvedSlotAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/momentum/CurvedSlotAnimation.tsx)
- [CollisionAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/momentum/CollisionAnimation.tsx)
- [KinematicsAdvancedAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/kinematics/KinematicsAdvancedAnimation.tsx)
- [SpringCompositeAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/energy/SpringCompositeAnimation.tsx)
- [LightRodRopeAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/energy/LightRodRopeAnimation.tsx)
- [CentripetalAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/circular/CentripetalAnimation.tsx)

### 决策

> **暂不迁移。**

收益仅为规范整洁性，零功能改善。`wide/tall` 当前实际充当"字体放大修正"角色，强迁移需大规模视觉回归，性价比极低。

若未来逐组件迁移，正确路径：

```
迁移一个组件 = 改 preset → 改 designHeight → 把所有 font(N) 的 N 乘 1.2 → 视觉对比验证
```

不适合批量处理，需逐文件手动校准。

---

## 待办

- [ ] 按需逐组件迁移 `wide/tall` → `full`（低优先级）
- [ ] 所有组件迁移完成后删除 `spacing.ts` 中 `wide` 和 `tall` 定义
