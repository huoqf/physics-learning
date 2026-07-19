# VIEWPORT 架构统一方案

> 编写时间：2026-07-12
> 状态：**Phase 0-7 + VectorArrow 改革 Phase 1-9 + originDesign 误用修复 Phase 10 已完成（9 文件修复并验证），API 互斥化经重新评估后判定为暂不执行**
> 目标：逐步统一 VIEWPORT 实现组件，覆盖 SVG/Canvas，完成实际分辨率测量、画面映射坐标转化、坐标对齐

---

## 一、设计原则

| # | 原则 | 说明 |
|---|------|------|
| 1 | 预设设计分辨率统一设计基准 | 动画设计阶段根据页面布局选择合适的预设分辨率 |
| 2 | 页面布局按知识点特点选分屏 | 瘦高→左右分屏，矮胖→上下分屏，或默认不分屏 |
| 3 | VIEWPORT 完成坐标转换 | 根据屏幕真实分辨率把动画正确显示在显示区域 |
| 4 | VIEWPORT 用通用组件实现 | 无论 SVG/Canvas/混合渲染，都通过统一组件实现 |

---

## 二、架构分层

```
CANVAS_PRESETS（设计基准分辨率）
    ↓
useAnimationViewport（复合 Hook）
    ├── useCanvasSize（Layer 1：容器尺寸测量 + 缩放比）
    ├── useViewport（Layer 2：可视区域 + vp.transform）
    └── 返回 { containerRef, canvasSize, vp, preset }
    ↓
渲染层（Layer 3）
    ├── AnimationSvgCanvas（SVG 路径）
    ├── useCanvasViewport（Canvas 路径：transform / raw 两种模式）
    └── 混合路径（Canvas + SVG 强同步）
    ↓
useSceneScale（物理坐标 → 设计坐标）
    ├── anchor: 'viewport'（可视区域驱动）
    ├── anchor: 'center'（物理中心驱动）
    ├── anchor: 'design'（设计画布驱动）
    └── anchor: 'custom'（调用方完全控制）
```

### 坐标空间与变换

| 坐标空间 | 来源 | 单位 |
|----------|------|------|
| 物理坐标 | physics/ 计算 | m, N, m/s 等 |
| 设计坐标 | CANVAS_PRESETS 定义 | design-unit (0..preset.width × 0..preset.height) |
| 容器像素 | ResizeObserver 测量 | px |

```
物理坐标 → 设计坐标：SceneScale（scaleX/Y + originX/Y），通过 worldToDesign 调用
设计坐标 → 容器像素：vp.transform（translate(vp.tx, vp.ty) scale(vp.scale)）
容器像素 → 设计坐标：(px - vp.tx) / vp.scale
```

---

## 三、CANVAS_PRESETS ✅

| preset | 尺寸 | 用途 |
|--------|------|------|
| `full` | 840×650 | 独占中屏，无分区 |
| `splitV` | 840×325 | 上下分区（上方图表 + 下方场景） |
| `splitH` | 420×650 | 左右分区（左侧场景 + 右侧图表） |
| `square` | 650×650 | 圆周/旋转对称场景 |

### 特殊尺寸

| 尺寸 | 文件 | 处理策略 |
|------|------|---------|
| 100×100 | VerticalThrow/Projectile/ObliqueThrow | ✅ 已迁移到 `anchor: 'custom'` |
| 400×180 | CenterExtra 文件（21 个） | 侧栏图表，不需要 viewport 体系 |
| 600×160 | KinematicsAdvancedAnimation | ✅ 已迁移到 `splitV` |

---

## 四、核心规则：SceneScale 输出必须是设计坐标单位

**问题**：`vp.visibleX/Y/W/H`、`vp.centerX/Y` 是容器像素坐标。如果直接传入 SceneScale，在 `<g transform={vp.transform}>` 内使用会导致**二次缩放**。

**修复**：SceneScale 的所有输出必须是设计坐标单位。容器像素值先反算：`(px - vp.tx) / vp.scale`。

### 单位约定

| 字段 | 单位 |
|------|------|
| `SceneScale.originX/Y` | design-unit |
| `SceneScale.scaleX/Y` | design-unit / meter |
| `SceneScale.maxVectorLength` | design-unit |
| `physicsScaleDesign` | design-unit / meter |
| `physicsScalePx` | px / meter（需 `/ vp.scale` 转换后使用） |

### `worldToPixel` 函数名说明

`worldToPixel(wx, wy, scene)` 输出是**设计坐标**（函数名中的 "pixel" 是历史命名）。新代码统一使用别名 `worldToDesign`。内部 `py = originY - wy * scaleY` 已处理 y 轴翻转（物理 y↑ → SVG y↓），迁移时直接替换不需要额外处理。

### overlay 下的 `vp.designLeft` vs `visibleDesign.x`

- `vp.designLeft = -tx / scale` — 设计坐标系原点偏移
- `visibleDesign.x = (overlayLeft - tx) / scale` — 可视区域左边界在设计坐标中的位置

当 `overlayLeft > 0` 时两者不等。SceneScale 应使用 `visibleDesign.x/y`，仅在无 overlay 时等价。

---

## 五、useSceneScale — 统一入口 ✅

> 文件：`src/hooks/useSceneScale.ts`，完整 API 见源码 TypeScript interface。

### anchor 模式

| anchor | 语义 | scaleX/Y 来源 | origin 来源 |
|--------|------|--------------|------------|
| `'viewport'` | 物理世界铺满可视区域 | `visibleDesign / physicsWidth×Height` | `originSource`（默认 bottomLeft） |
| `'center'` | 中心对称场景 | `physicsScaleDesign`（直接传入） | `centerSource`（默认 viewport） |
| `'design'` | 物理世界绑定完整画布 | `preset / physicsWidth×Height` | `originSource`（默认 bottomLeft） |
| `'custom'` | 调用方完全控制 | `customScaleX/Y` | `customOriginX/Y` |

### originSource（viewport / design 模式）

| originSource | originX | originY | 适用场景 |
|-------------|---------|---------|---------|
| `'bottomLeft'`（默认） | 可视区域左/preset 左 | 可视区域底/preset 底 | 抛体、自由落体等 y>0 向上 |
| `'topLeft'` | 可视区域左/preset 左 | 可视区域顶/preset 顶 | 原点在顶部 |
| `'center'` | 可视区域中心/preset 中心 | 同左 | 中心对称 |
| `'custom'` | `originX` 参数 | `originY` 参数 | 精确控制 |

### centerSource（center 模式）

| centerSource | centerX/Y | 适用场景 |
|-------------|-----------|---------|
| `'design'` | `preset.width/2, preset.height/2` | 无 overlay 的对称场景 |
| `'viewport'`（默认） | 可视区域中心 | 有 overlay 时物理对象在可视区域中央 |
| `'custom'` | `centerX/Y` 参数 | 非标准锚点 |

### anchor 选用指南

| 场景 | 推荐 anchor | 原因 |
|------|------------|------|
| 物理世界铺满可视区域 | `viewport` | scaleX/Y 由 visibleDesign / physicsWidth 决定 |
| 物理世界只占设计画布一部分 | `design` | scaleX/Y 由 preset / physicsWidth 决定 |
| 中心对称场景（圆周、天体、电磁场） | `center` | origin 在中心，scale 由物理比例决定 |
| 非等比缩放 + 自定义原点 | `custom` | 完全控制 scaleX/Y 和 originX/Y |

### 与 `createSceneScaleFromViewport` 的映射

| 新 anchor | 旧 mode | 关键区别 |
|-----------|---------|---------|
| `viewport` | `'visibleArea'` | 新版输出设计坐标；旧版输出容器像素 |
| `design` | `'transform'` | 新版允许 `physicsWidth ≠ designWidth` |
| `center` | `'centerScale'` | 新版直接传 `physicsScaleDesign`；旧版需反推 `worldWidth` |
| `custom` | 无对应 | 新增 |

---

## 六、useCanvasViewport — Canvas 统一入口 ✅

> 文件：`src/hooks/useCanvasViewport.ts`

### 两种模式

| 模式 | ctx transform | 适用场景 |
|------|--------------|---------|
| `transform` | `dpr * vp.scale, ..., dpr * vp.tx, dpr * vp.ty` | 场景内容（stroke/text 随画面缩放） |
| `raw` | `dpr, 0, 0, dpr, 0, 0` | 波场/粒子场（线宽和字号固定屏幕尺寸） |

### 返回值

| 字段 | 用途 |
|------|------|
| `canvasRef` | 挂载到 `<canvas>` |
| `setupFrame()` | 每帧调用：重置+清除+设置 transform，返回 ctx |
| `designToPixel(dx, dy)` | 设计坐标 → 容器像素 |
| `pixelToDesign(px, py)` | 容器像素 → 设计坐标 |
| `clientToDesign(cx, cy)` | 浏览器事件坐标 → 设计坐标 |

---

## 七、剩余迁移清单

### 已全部清零（Phase 6）

- ✅ `createSceneScaleFromViewport` — 4 个文件已迁移到 `useSceneScale`
- ✅ `useCanvasSize`（非 CenterExtra）— 14 个文件已迁移到 `useAnimationViewport`
- ✅ VectorArrow `origin` → `originPixel` → `originDesign` — 44 个文件已完成

### 仍使用 `useCanvasSize` 的 CenterExtra 文件（7个，无需迁移）

400×180 侧栏小画布，不需要 viewport 体系：IntermolecularForcesCenterExtra、ClapeyronCenterExtra、WeightlessnessCenterExtra、NewtonSecondCenterExtra、FrictionCenterExtra、CircuitAnalysisCenterExtra、AccelerationCenterExtra（已迁移到 useAnimationViewport 但仍有 CanvasSize 类型引用）

### 未接入标准 VIEWPORT 路径的存量页面（已全部清零）

| 页面 | 迁移内容 | 状态 |
|------|---------|:----:|
| `ElectricPotential` | hook 输出设计坐标 + `AnimationSvgCanvas` + `vp.transform` + `useViewportPointer` | ✅ |
| `ProjectileAnimation` | `AnimationSvgCanvas` + `vp.transform`，移除手动 viewport 计算 | ✅ |

---

## 八、迁移要点

### 迁移原则

- `visibleArea` 迁移时注意 `originSource`：旧 `originX/Y = vp.visibleX/Y` 等价于 `topLeft`
- VectorArrow `origin={{ x, y: -y }}` → `originPixel={{ x, y }}`：**去掉 Y 取负**，`vector` 的 Y 取负保留
- `physicsScaleDesign = physicsScalePx / vp.scale`：容器像素比例必须转换为设计坐标比例
- `presetCompensation` 迁移分两步：先保持不变完成 API 迁移，验证视觉一致后再移除

### 已修复的双重缩放 bug

| 页面 | 问题 | 修复 |
|------|------|------|
| CircularMotionAnimation | `vp.centerX` 容器像素作 originX | `centerSource: 'design'` |
| KeplerAnimation | `vp.visibleW / scale` 反推 worldWidth | `physicsScaleDesign` 纯设计坐标 |
| useVerticalCircularPhysics | 同上 | 同上 |

### 迁移模式速查

| 旧模式 | 新模式 |
|--------|--------|
| `useCanvasSize + useViewport` | `useAnimationViewport` |
| `computeScale + physicsToCanvasWithOrigin` | `useSceneScale + worldToDesign` |
| `physicsToCanvasWithOrigin`（在 `<g transform={vp.transform}>` 内） | `physicsToDesignWithOrigin`（输出设计坐标）或 `useSceneScale + worldToDesign` |
| `physicsToCanvasWithOrigin`（原始 SVG，无 vp.transform） | 保留（输出容器像素，语义正确） |
| `createSceneScaleFromViewport('visibleArea')` | `useSceneScale({ anchor: 'viewport' })` |
| `createSceneScaleFromViewport('centerScale')` | `useSceneScale({ anchor: 'center', physicsScaleDesign })` |
| `createSceneScaleFromViewport('transform')` | `useSceneScale({ anchor: 'design' })` |
| `useCanvasDPR + 手动 ctx.setTransform` | `useCanvasViewport({ mode: 'transform' })` |

---

## 九、实施进度

| Phase | 内容 | 状态 |
|-------|------|------|
| 0 | 文档对齐 | ✅ |
| 1 | useSceneScale 统一入口 | ✅ |
| 2 | preset 贯穿 + SceneScale 验证 | ✅ |
| 3 | useCanvasViewport 标准 Hook | ✅ |
| 4 | legacy 文件分批迁移（7 批 61 文件） | ✅ |
| 4.5 | 迁移后 bug 修复（10 项） | ✅ |
| A | 文档对齐 + 遗留检测脚本 | ✅ |
| B | visibleArea/centerScale 清零 | ✅ |
| C | Canvas DPR 清零 | ✅ |
| 5 | 非标准 preset 评估 | ✅ |
| 6 | createSceneScaleFromViewport/useCanvasSize/VectorArrow origin 清零 | ✅ |
| 7 | VectorArrow 坐标体系改革 + physicsToCanvas 迁移 + 项目规范更新 | ✅ |
| 8 | 存量页面 VIEWPORT 迁移（ElectricPotential + ProjectileAnimation） | ✅ |
| 9 | `originDesign` 物理坐标误用全面扫描 + 修复（9 文件） | ✅ |
| 10 | VectorArrow / PhysicsVectorArrow API 互斥化评估 | ✅ |

### Phase 4.5 bug 修复记录

| 页面 | 问题 | 修复 |
|------|------|------|
| CuttingEMF | 导体滑轨错位 | 移除内部 viewport，改用固定 viewBox SVG；sceneScale 由父级传入 |
| CuttingEMF | 手规则过大 | 传入 identity font + canvasScale=1.0 |
| CuttingEMF | 图表消失 | `flex-shrink-0` + `height: 50%` 包裹动画区域 |
| PowerTransmission | 初次进入跳动放大 | 改用固定 viewBox SVG + identity font |
| Transformer | 基础模式空白 | 引入 scale 等比缩放因子 |
| Transformer | 进阶模式部件偏小 | scale 宽度基准 420→350；rightPanelW 30%→25%；删底部标注条 |
| CircularMotionAnimation | 双重缩放 | `centerSource: 'design'` + 纯设计坐标 physicsScaleDesign |
| KeplerAnimation | 双重缩放 | 纯设计坐标 physicsScaleDesign |
| useVerticalCircularPhysics | 双重缩放 | 同上 |
| AnimationSvgCanvas | 初始跳变溢出 | 外层 div `overflow-hidden` |

---

## 十、验收标准

| 检查项 | 标准 |
|--------|------|
| SceneScale 单位 | 所有输出为设计坐标单位，不包含容器像素值 |
| vp.visible* 使用 | 反算为设计坐标后使用，不直接传入 SceneScale |
| VectorArrow 坐标 | 在 `<g transform={vp.transform}>` 内，使用 `originDesign`（设计坐标）；`originPixel` 已 deprecated；物理矢量优先使用 `PhysicsVectorArrow` |
| Canvas transform 模式 | ctx 设置 viewport transform 后，用设计坐标绘制 |
| Canvas raw 模式 | 仅 DPR 对齐，用像素坐标绘制 |
| useSceneScale 调用 | 新页面统一使用，不再调用 createSceneScaleFrom* 的 visibleArea/centerScale |
| useCanvasViewport 调用 | Canvas 场景逐步迁移至 useCanvasViewport |
| presetCompensation | 新页面不传，旧页面迁移后移除 |
| 固定 viewBox SVG | viewport 初始值跳变时，可用固定 viewBox SVG + identity font 替代 |
| splitV 图表可见性 | 动画区域用 `flex-shrink-0` + 固定高度，防止图表被压缩 |

---

## 十一、相关文件

| 文件 | 路径 | 职责 |
|------|------|------|
| CANVAS_PRESETS | `src/theme/spacing.ts` | 预设设计分辨率定义 |
| useAnimationViewport | `src/hooks/useAnimationViewport.ts` | 复合 Hook：容器测量 + viewport |
| useViewport | `src/utils/useViewport.ts` | 可视区域计算 + vp.transform |
| useCanvasSize | `src/utils/useCanvasSize.ts` | 容器尺寸测量 |
| AnimationSvgCanvas | `src/components/Layout/AnimationSvgCanvas.tsx` | SVG 标准容器 |
| SceneScale | `src/scene/SceneScale.ts` | 物理→设计坐标缩放（visibleArea/centerScale 已 @deprecated） |
| worldToDesign | `src/scene/SceneScale.ts` | worldToPixel 语义别名 |
| useSceneScale | `src/hooks/useSceneScale.ts` | 统一 SceneScale 入口 |
| useCanvasViewport | `src/hooks/useCanvasViewport.ts` | 统一 Canvas viewport 入口 |
| VectorArrow | `src/components/Physics/VectorArrow.tsx` | 通用矢量箭头（接受 originDesign + pixelLength） |
| PhysicsVectorArrow | `src/components/Physics/PhysicsVectorArrow.tsx` | 物理矢量箭头（禁止 pixelLength，强制 refMagnitudes 归一化） |

---

## 十二、`computeScale` / `coordinate.ts` 存量页面清单

> 更新时间：2026-07-16
> 状态：**✅ 已完成**。所有旧坐标函数导入已清零，仅 `useEquilibriumLayout.ts` 保留类型导入 `CanvasBounds` / `CanvasPoint`。

### 使用 `computeScale` 的页面（6 处）

| 文件 | 导入函数 | 用途 | 迁移方案 |
|------|---------|------|---------|
| `features/mechanics/dynamics/GravityAnimation.tsx:9,45` | `computeScale` | 物理→像素比例尺 | 改用 `useSceneScale({ anchor: 'viewport' })` + `worldToDesign` |
| `features/mechanics/dynamics/OrthogonalDecompositionAnimation.tsx:9,50` | `computeScale`, `canvasToPhysics` | 斜面正交分解比例尺 + 像素→物理反算 | `useSceneScale` + `worldToDesign`；`canvasToPhysics` 改用 `pixelToDesign` |
| `features/mechanics/dynamics/VectorAdditionAnimation.tsx:8,37` | `computeScale` | 力合成平行四边形比例尺 | `useSceneScale` + `worldToDesign` |
| `features/electromagnetism/induction/dual-rods/hooks/useDualRodsPhysics.ts:3,49` | `computeScale` | 双棒模型 Canvas 像素比例尺 | Canvas 路径改用 `useCanvasViewport({ mode: 'raw' })` + `designToPixel` |
| `features/electromagnetism/magnetism/components/ForcePolygon.tsx:6,44` | `computeScale` | 安培力矢量多边形比例尺 | `useSceneScale` + `worldToDesign` |
| `features/electromagnetism/magnetism/hooks/useInclineForceLayout.ts:2,105` | `computeScale` | 斜面安培力布局比例尺 | `useSceneScale` + `worldToDesign` |

### 使用其他 `coordinate.ts` 函数的页面（6 处）

| 文件 | 导入函数 | 用途 | 迁移方案 |
|------|---------|------|---------|
| `features/electromagnetism/electrostatics/hooks/useElectricPotentialPhysics.ts:3` | `physicsToDesignWithOrigin` | 电势等势线设计坐标 | 改用 `useSceneScale` + `worldToDesign` |
| `features/mechanics/energy/EnergyConservationAnimation.tsx:15` | `physicsToDesignWithOrigin` | 机械能守恒场景坐标 | 改用 `useSceneScale` + `worldToDesign` |
| `features/electromagnetism/magnetism/combined-fields/components/DeflectScene.tsx:6` | `svgPointToPhysicsPoint` | SVG 点→物理坐标反算 | 改用 `pixelToDesign` + `designToWorld` |
| `features/electromagnetism/magnetism/combined-fields/components/SpectrometerScene.tsx:6` | `svgPointToPhysicsPoint` | 同上 | 同上 |
| `features/mechanics/dynamics/hooks/useEquilibriumLayout.ts:2-3` | `clampEndpoint`, `CanvasBounds`, `CanvasPoint` | 三力平衡端点约束 | 类型可保留，`clampEndpoint` 逻辑迁移至设计坐标 |
| `src/physics/brownianMotion.ts:4` | 注释引用 | 仅注释中提及 computeScale，无实际导入 | 无需迁移 |

### 汇总

| 类别 | 文件数 | 优先级 |
|------|:------:|--------|
| `computeScale` 直接调用 | 6 | P1（新页面规范冲突） |
| `physicsToDesignWithOrigin` / `svgPointToPhysicsPoint` | 4 | P2（功能正确但不符合新标准路径） |
| 类型导入 + 工具函数 | 1 | P3（低风险） |
| 仅注释引用 | 1 | 无需处理 |
| **合计** | **12** | — |

### 迁移注意事项

1. `OrthogonalDecompositionAnimation` 同时使用 `computeScale` + `canvasToPhysics`，需整体迁移到 `useSceneScale` + `worldToDesign` + `designToWorld`
2. `useDualRodsPhysics` 是 Canvas 路径，需改用 `useCanvasViewport({ mode: 'raw' })` + `designToPixel`，不走 `useSceneScale`
3. `useEquilibriumLayout` 的 `clampEndpoint` / `CanvasBounds` 是纯工具函数，可保留类型定义，仅迁移坐标计算逻辑
4. `physicsToDesignWithOrigin` 在新标准路径下等价于 `useSceneScale` + `worldToDesign`，迁移时直接替换

---

## 十三、VectorArrow 坐标体系改革（2026-07-14）

> 方案核心：**视觉箭头继续视觉化，物理箭头必须物理正确。**

### 改革成果

| Phase | 内容 | 状态 |
|-------|------|:----:|
| 1 | `originPixel` → `originDesign` 重命名 + deprecated alias | ✅ |
| 2 | 全量箭头分类标注（371 实例：physical-real 182, physical-schematic 124, visual-only 60） | ✅ |
| 3 | `PhysicsVectorArrow` 组件创建 + 182 个 physical-real 实例迁移 | ✅ |
| 4 | 12 个页面约 45 个 physical-schematic 实例迁移（移除 pixelLength，改用动态 refMagnitudes） | ✅ |
| 5 | 物理箭头单元测试 | ✅ |
| 6 | 截图回归 | ✅ |

### 双组件体系

| 组件 | 适用场景 | 接受 pixelLength | 接受 originDesign | 接受 origin |
|------|---------|:---:|:---:|:---:|
| `PhysicsVectorArrow` | 力/速度/加速度/电流/电场等需物理正确的矢量 | ❌ | ✅ | ✅ |
| `VectorArrow` | UI 标注/方向提示/几何图形/等长力示意 | ✅ | ✅ | ✅ |

### 动态 refMagnitudes 模式

```ts
// PhysicsVectorArrow 长度控制：refMagnitudes 归一化
const dynamicRefMagnitudes = useMemo(() => ({
  appliedForce: Math.max(F_applied, 5) * 2,  // ratio ≈ 0.5
  velocity: Math.max(Math.abs(v), 5) * 2,
  acceleration: Math.max(Math.abs(a), 5) * 2,
}), [F_applied, v, a])

const sceneScale = useSceneScale({ ..., refMagnitudes: dynamicRefMagnitudes, maxVectorLength: 120 })
```

### 保留 pixelLength 的合理场景

| 场景 | 实例数 | 原因 |
|------|:------:|------|
| 几何闭合图形（平行四边形/三角形/正交分解） | 42 | 箭头尖端必须落在几何端点 |
| 受力分析等长力 | 14 | 高中物理教学中力图常用等长表示 |
| 速度分解 vx/vy | 9 | 分量须与总量成比例维持闭合 |
| 非线性缩放（对数） | 2 | refMagnitudes 仅支持线性 |
| 通用渲染函数参数 | 2 | pixelLength 作为接口参数暴露 |

### dev warning 机制

- `originPixel` deprecated 时自动 warning
- 同时传 `origin` + `originDesign` 时 warning
- `sceneScale` 非等比缩放且未声明 `intentionalNonUniformScale` 时 warning

---

## 十四、`originDesign` 物理坐标误用修复与 API 互斥化评估（2026-07-19）

> 背景：`VectorArrow` / `PhysicsVectorArrow` 均同时暴露 `origin`（物理坐标）和 `originDesign`（设计坐标）两个互斥 prop，导致开发者频繁将物理坐标误传给 `originDesign`，引发矢量箭头起点严重偏离标注物体的 bug。

### 14.1 修复概述

**问题根因**：`originDesign` 语义为"设计坐标"（design-unit），在 `<g transform={vp.transform}>` 内直接使用；但大量调用方将其理解为"设计场景用的 origin"，把物理坐标（米）直接传入。

**修复文件（9 个）**：

| 文件 | 问题 | 修复方式 |
|------|------|---------|
| `BinaryStarsAnimation.tsx` | 双星/三星力/速度矢量的 `originDesign` 传入物理坐标 `state.pos1/pos2/pos3` | `originDesign` → `origin` |
| `SatelliteAnimation.tsx` | 卫星引力/速度矢量的 `originDesign` 传入物理坐标 `sat0PhysX/Y` | `originDesign` → `origin` |
| `ManBoatAnimation.tsx` | 人船速度矢量的 `originDesign` 传入物理坐标 `boatState.x_person1` 和 `0.85` | `originDesign` → `origin` |
| `SpringBlocksAnimation.tsx` | 滑块速度/弹力矢量的 `originDesign` 传入物理坐标 `xA_center` 和 `0.65` | `originDesign` → `origin` |
| `MomentumConservationAnimation.tsx` | 碰撞球速度矢量的 `originDesign` y 坐标错误（`basic.R_A` 而非 `groundY - R_A`） | `originDesign` → `origin` |
| `CollisionBasicScene.tsx` | 碰撞球速度矢量的 `originDesign` y 坐标错误（`R_A * 2 + 10`） | `originDesign` → `origin` |
| `CollisionAdvancedScene.tsx` | 同上 | `originDesign` → `origin` |
| `VerticalCircularScene.tsx` | 圆周运动各矢量的 `originDesign` 传入物理坐标 `x, y` | `originDesign` → `origin` |
| `CentripetalScene.tsx` | 向心力各矢量的 `originDesign` 传入物理坐标 `x, y` | `originDesign` → `origin` |

**验证结果**：TypeScript 编译零错误 / Vitest 807 passed / Playwright 截图测试 8 passed。

**逐文件坐标转换验证**（确保修复未引入新 bug）：

| 文件 | sceneScale 配置 | 修复前问题 | 修复后坐标验证 | 结论 |
|------|----------------|-----------|--------------|------|
| `BinaryStarsAnimation.tsx` | `anchor: 'center'`, `scaleX = state.scale` | `originDesign` 传入物理坐标 `state.pos1/2/3` | `origin={state.pos1}` → `x1 = 175 + pos1.x * scale`，与星体 `cx={175 + pos1.x * scale}` 一致 | ✅ 完全正确 |
| `SatelliteAnimation.tsx` | `anchor: 'custom'`, `customScaleX = scale` | `originDesign` 传入物理坐标 `sat0PhysX/Y` | `origin={sat0PhysX/Y}` → `x1 = centerX + sat0PhysX * scale = sat0X`，与卫星渲染位置一致 | ✅ 完全正确 |
| `ManBoatAnimation.tsx` | `anchor: 'custom'`, `customScaleX = pxPerMeter` | `originDesign` 传入物理坐标 `x_person1` | `origin={x_person1, 0.85}` → `x1 = originX + x_person1 * pxPerMeter = xp_px`，与人物头部一致 | ✅ 完全正确 |
| `SpringBlocksAnimation.tsx` | `anchor: 'custom'`, `customScaleX = SPRING_PX_PER_M` | `originDesign` 传入物理坐标 `xA_center` | `origin={xA_center, 0.65}` → 转换后与滑块中心一致 | ✅ 完全正确 |
| `MomentumConservationAnimation.tsx`（基础模式） | `anchor: 'custom'`, `customScaleX = 1` | `originDesign` y 坐标为 `R_A * 2 + 10`（球体上方） | `origin={{ x: posAx, y: R_A }}` → `x1 = posAx`, `y1 = groundY - R_A`。因 `scale=1`，像素值当物理坐标传碰巧正确 | ⚠️ 结果正确，语义不纯 |
| `CollisionBasicScene.tsx` | `anchor: 'custom'`, `customScaleX = 1` | `originDesign` y 坐标为 `R_A * 2 + 10` | `origin={{ x: posAx, y: R_A }}` → `x1 = posAx`, `y1 = groundY - R_A`。因 `scale=1`，像素值当物理坐标传碰巧正确 | ⚠️ 结果正确，语义不纯 |
| `CollisionAdvancedScene.tsx` | 同基础碰撞 | 同基础碰撞 | 同基础碰撞 | ⚠️ 结果正确，语义不纯 |
| `VerticalCircularScene.tsx` | `anchor: 'center'` | `originDesign` 传入物理坐标 `x, y` | `origin={{ x, y }}` → `x1 = originX + x * scaleX`, `y1 = originY - y * scaleY`，与 `ballPos = worldToDesign(x, y)` 一致 | ✅ 完全正确 |
| `CentripetalScene.tsx` | `createSceneScaleFromDesignCenter` | `originDesign` 传入物理坐标 `x, y` | `origin={{ x, y }}` → `x1 = DESIGN_CX + x * designScale`, `y1 = DESIGN_CY - y * designScale`，与 `ballPos` 一致 | ✅ 完全正确 |

> **关于 3 个「语义不纯」文件的说明**：`MomentumConservationAnimation`（基础模式）、`CollisionBasicScene`、`CollisionAdvancedScene` 这 3 个文件的 `sceneScale` 配置为 `scaleX = scaleY = 1`，因此物理坐标与设计坐标数值等价。修复后传入的 `origin` 虽然在语义上应为物理坐标（米），但实际传入的是像素值，因 `scale=1` 而结果正确。**当前配置下不会引入新 bug**，但如果将来修改 `sceneScale` 的 scale 为非 1 值，矢量起点将偏离。建议后续排期改为 `originDesign` + 正确的设计坐标值（而非当前的 `origin` + 像素值）。

### 14.2 API 互斥化评估（修正版）

**理想方案**：
- `VectorArrow`（视觉标注/几何图形）→ **仅保留 `originDesign`**，彻底禁用 `origin`
- `PhysicsVectorArrow`（物理矢量）→ **仅保留 `origin`**，彻底禁用 `originDesign`

**全量统计结果（修正后）**：

| 组件 | 使用 `origin=` 的实例数 | 使用 `originDesign=` 的实例数 |
|------|:---------------------:|:----------------------------:|
| `VectorArrow` | **0** | 56 |
| `PhysicsVectorArrow` | 23 | **~55+** |

> **修正说明**：原评估统计为 18 个 `PhysicsVectorArrow` 的 `originDesign` 实例，经重新全量搜索后发现实际为 **~55+ 个实例**，分布在 **~25+ 个文件** 中（原评估为 ~15 个文件）。遗漏主要原因是部分实例在 `PhysicsVectorArrow` 的多行 props 中被 `grep` 的默认单行模式漏检。

**关键发现：大量 `originDesign` 并非"误用"**

经逐文件分析，`PhysicsVectorArrow` 的 ~55+ 个 `originDesign` 实例中，**绝大多数传入的是正确的设计坐标（像素值）**，而非物理坐标误传。这些文件采用了一种"设计坐标优先"的渲染模式：

1. **物体位置直接在设计坐标中计算**（如 `ballCenterX = 100 + offset`），没有建立物理坐标系（米）
2. **`sceneScale` 通常配置为 `scaleX = scaleY = 1`**，物理坐标与设计坐标数值等价
3. **`PhysicsVectorArrow` 被使用是因为其物理量归一化功能**（`refMagnitudes` / `maxVectorLength`），而非因为需要物理坐标转换

代表文件：`MomentumScene.tsx`、`WorkAnimation.tsx`、`KineticEnergyScene.tsx`、`SpringCompositeAnimation.tsx`、`BlockBoardAnimation.tsx`、`ConnectedBodiesAnimation.tsx` 等 ~20 个文件。

**迁移成本分析（修正后）**：

| 变更项 | 影响实例数 | 影响文件数 | 风险等级 | 说明 |
|--------|:---------:|:---------:|:-------:|------|
| `VectorArrow` 禁用 `origin` | 0 | 0 | **零风险** | 当前全量代码中无任何 `VectorArrow` 使用 `origin` |
| `PhysicsVectorArrow` 禁用 `originDesign` | ~55+ | ~25+ | **高风险、大工作量** | 需将 ~55+ 个 `originDesign` 实例改为 `origin`。但大部分文件没有物理坐标系，需要：①建立物理坐标系（定义原点、比例尺）；②将物体位置计算从设计坐标重构为物理坐标；③使用 `worldToDesign` 转换后渲染。这不是简单的 prop 改名，而是涉及 ~20+ 个文件的核心渲染逻辑重构 |

**重新评估后的结论**：

1. **当前项目存在两种渲染模式并存**：
   - **物理坐标模式**（~10 个文件）：物体位置用物理坐标计算，通过 `sceneScale` 转换到设计坐标（如 `BinaryStarsAnimation`、`VerticalCircularScene`）
   - **设计坐标模式**（~20+ 个文件）：物体位置直接在设计坐标中计算，`sceneScale` 仅用于矢量长度归一化（`refMagnitudes`），`scale` 通常为 1

2. **`PhysicsVectorArrow` 的 `originDesign` 在设计坐标模式中是必需prop**：因为调用方没有物理坐标可传。强行禁用 `originDesign` 等于强制所有页面迁移到物理坐标模式。

3. **API 互斥化收益有限、成本极高**：
   - 收益：消除 `origin` vs `originDesign` 的语义混淆
   - 成本：需重构 ~20+ 个文件的渲染逻辑，建立物理坐标系，工作量大且极易引入新 bug
   - 性价比：**不适合当前项目状态**

**修正后的执行状态**：
- **已完成** `originDesign` 物理坐标误用修复（9 文件，其中 6 个完全正确，3 个语义不纯但在当前 scale=1 配置下结果正确）
- **API 互斥化暂不执行**。原因：`PhysicsVectorArrow` 的 `originDesign` 被 ~55+ 个实例正确使用（设计坐标模式页面没有物理坐标可传），强行禁用会导致大规模重构。
- **建议策略**：
  1. **保留现状**：`PhysicsVectorArrow` 同时支持 `origin` 和 `originDesign`，`VectorArrow` 同时支持两者
  2. **新页面规范**：新页面优先采用物理坐标模式，使用 `PhysicsVectorArrow` + `origin`
  3. **存量页面渐进优化**：设计坐标模式页面在维护时，如需调整 `sceneScale.scale`，应同步将 `origin` 修正为 `originDesign`（或建立物理坐标系）
  4. **文档强化**：在组件 JSDoc 和项目规范中明确两种模式的适用场景，降低新开发者的理解成本
