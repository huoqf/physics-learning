# presetCompensation: 1.2 迁移计划

> 生成日期：2026-07-30 | 共 21 处受影响

---

## 前置理解：presetCompensation 实际影响范围

`presetCompensation: 1.2` **只影响** `useCanvasSize` 输出的：
- `canvasSize.scale`（= rawScale × 1.2）
- `canvasSize.font(N)`（字体值偏大 20%）
- `canvasSize.px(N)`（px 值偏大 20%）

**不影响**：
- `vp.transform`（SVG 整体缩放，基于 rawScale）
- `useSceneScale` 输出的 sceneScale（物理坐标比例尺）
- SVG 内设计坐标（`worldToDesign` 输出）

因此：**删除 presetCompensation 后，SVG 内用设计坐标写的内容不受影响，只有 `font()` / `px()` / `canvasSize.scale` 会缩小约 17%（1/1.2）**。

---

## 影响分类矩阵

| 类型 | 说明 | 页数 |
|------|------|------|
| **A：无 font()/px() 用法** | 场景内全部用设计坐标，删除 compensation 零影响 | 5 页 |
| **B：仅 font() 字体缩放** | 字体通过 `font(N)` 缩放，删除后字体略缩小（在 clamp 范围内通常不明显） | 11 页 |
| **C：有自定义坐标计算** | 用 `canvasSize.height * ratio`、`vp.visibleX` 等计算布局，需逐行核查 | 5 页 |

---

## Batch A — 极低风险，可立即删除（5 页）

| 文件 | SceneScale 模式 | 说明 |
|------|----------------|------|
| [GravityBasicAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/dynamics/GravityBasicAnimation.tsx) | `anchor:'viewport'` | 无 font()/px() 用法 |
| [VectorAdditionAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/dynamics/VectorAdditionAnimation.tsx) | `anchor:'viewport'` | 无 font()/px() 用法 |
| [WeightlessnessAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/dynamics/WeightlessnessAnimation.tsx) | 无 SceneScale | 无 font()/px() 用法 |
| [IntermolecularForcesCenterExtra.tsx](file:///d:/code/physic/physics-learning/src/features/thermodynamics/kinematics/IntermolecularForcesCenterExtra.tsx) | `useCanvasSize` 直调 | CenterExtra 组件，画布内无坐标依赖 |
| [useExcitationSimulation.ts](file:///d:/code/physic/physics-learning/src/features/modern/bohr-theory/hooks/useExcitationSimulation.ts) | Canvas 绘制 | Canvas 基于真实像素，删除安全 |

**操作**：直接删除 `presetCompensation: 1.2` 一行，无需其他改动。

---

## Batch B — 低风险，删除后需视觉确认（11 页）

使用了 `font(N)` 但场景主体坐标走设计坐标系。删除 compensation 后字体约缩小 17%，在 `font()` 的 clamp 范围（7~16px）内通常不明显。

| 文件 | 注意点 |
|------|--------|
| [GravityAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/dynamics/GravityAnimation.tsx) | 较多 `font()` 标注，缩小后验证可读性 |
| [NewtonSecondAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/dynamics/NewtonSecondAnimation.tsx) | `labelFontSize` 变量来源于 font()，检查 |
| [FrictionAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/dynamics/FrictionAnimation.tsx) | 标准写法，低风险 |
| [NewtonSecondCenterExtra.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/dynamics/NewtonSecondCenterExtra.tsx) | CenterExtra 组件 |
| [WeightlessnessCenterExtra.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/dynamics/WeightlessnessCenterExtra.tsx) | CenterExtra 组件 |
| [TIRAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/optics/total-internal-reflection/TIRAnimation.tsx) | 光线场景，固定设计坐标，font() 字体验证 |
| [RefractionAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/optics/refraction/RefractionAnimation.tsx) | 同上 |
| [ScatterSim.tsx](file:///d:/code/physic/physics-learning/src/features/modern/bohr-theory/components/ScatterSim.tsx) | Canvas 绘制，安全 |
| [AccelerationAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/kinematics/AccelerationAnimation.tsx) | `font(8)`/`font(9)` 接近 clamp 下限，需验证 |
| [UniformAccelerationAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/kinematics/UniformAccelerationAnimation.tsx) | v-t 图内嵌 `font(9)` 标注 |
| [useConnectedBodiesPhysics.ts](file:///d:/code/physic/physics-learning/src/features/mechanics/dynamics/hooks/useConnectedBodiesPhysics.ts) | hook 内调用，随 Animation 一起处理 |

**操作**：删除 `presetCompensation: 1.2`，浏览器中验证字体标注仍清晰可读。如缩小过多，将对应 `font(N)` 的 N 值微调 +2 补偿。

---

## Batch C — 中等风险，需逐页重新审查（5 页）

这些页面用 `canvasSize.height * ratio` 等计算布局坐标，删除 compensation 会改变基准。

| 文件 | 风险点 | 处理方式 |
|------|--------|---------|
| [VelocityAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/kinematics/VelocityAnimation.tsx) | `groundY = canvasSize.height * 0.72`；`fontSize = canvasSize.width * 0.017` | 删除后按真实像素比例，理论更正确；fontSize 会减小，需验证 |
| [VelocityAnimationStrip.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/kinematics/VelocityAnimationStrip.tsx) | 大量 `fontSize`、`smallFont` 基于 `canvasSize.width` | 同上 |
| [EquilibriumAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/dynamics/EquilibriumAnimation.tsx) | 内嵌迷你图表，坐标依赖 `vp` 和 `canvasSize` 混合计算 | 需逐行检查图表坐标来源 |
| [OrthogonalDecompositionAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/dynamics/OrthogonalDecompositionAnimation.tsx) | 有 `fontSize={11}` 裸值（违规），与 compensation 无关但需一并修复 | 删除 compensation + 修复裸 fontSize |
| [SatelliteAnimation.tsx](file:///d:/code/physic/physics-learning/src/features/mechanics/gravitation/SatelliteAnimation.tsx) | `earthRadiusPx = LAYOUT.earth.radiusPx * vp.scale`（vp.scale 不含 compensation，安全）；font() 用于轨道标注 | 低风险，删除后轨道标注字体验证 |

**操作**：逐页分析，重点检查 `canvasSize.height/width * ratio` 的坐标计算。

---

## 执行顺序

```
Batch A（5页）→ 一次提交，零风险
Batch B（11页）→ 分 mechanics/optics/modern 三次提交，每次后视觉验证
Batch C（5页）→ 逐页审查，各自独立提交
```

### 每页标准操作步骤

1. 删除 `presetCompensation: 1.2` 一行
2. 若 `useAnimationViewport` 无其他参数则简化：`{ preset: CANVAS_PRESETS.full }`
3. `tsc --noEmit` 检查类型
4. 开发服务器打开页面，验证动画比例和字体可读性
5. 如有明显字体缩小，将 `font(N)` 的 N 值微调 +1~2 补偿

---

## 附：physicsWidth: preset.width 的备注

多个页面使用 `physicsWidth: preset.width`（840）= 物理视野 840m，这使 sceneScale ≈ 1.0（1m=1设计px）。场景内坐标直接用设计坐标数字，绕过了 `worldToDesign()` 的正式转换。

这是与 presetCompensation 独立的历史遗留问题，在当前体系下能正确工作。该问题待 Batch C 完成后再评估是否值得进一步规范化。
