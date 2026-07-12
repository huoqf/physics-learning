# VIEWPORT 架构统一方案

> 编写时间：2026-07-12
> 状态：**Phase 1-2 已完成，Phase 3-4 待执行**
> 目标：逐步统一 VIEWPORT 实现组件，覆盖 SVG/Canvas，完成实际分辨率测量、画面映射坐标转化、坐标对齐

**状态标记说明**：
- ✅ 已实现 — 代码已存在于仓库
- ⚠️ 待实现 — 设计完成，待编码
- 🔧 待修改 — 已有代码需调整

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
CANVAS_PRESETS（设计基准分辨率）                          ✅ 已实现
    ↓
AnimationPage 布局（CSS flex 分区：splitH / splitV / full）  ✅ 已实现
    ↓
useAnimationViewport（复合 Hook）                        ✅ 已实现
    ├── useCanvasSize（Layer 1：容器尺寸测量 + 缩放比）     ✅ 已实现
    ├── useViewport（Layer 2：可视区域 + vp.transform）    ✅ 已实现
    └── 返回 { containerRef, canvasSize, vp, preset }     ✅ 已实现（含 preset 字段）
    ↓
渲染层（Layer 3）
    ├── AnimationSvgCanvas（SVG 路径）                     ✅ 已统一
    ├── useCanvasViewport（Canvas 路径）                   ✅ 已实现
    └── 混合路径（Canvas + SVG 强同步）                    ✅ 验证通过（BoundaryMagneticField）
    ↓
useSceneScale（物理坐标 → 设计坐标）                      ✅ 已实现
    ├── anchor: 'viewport'（可视区域驱动）                  ✅ 已实现
    ├── anchor: 'center'（物理中心驱动）                    ✅ 已实现
    ├── anchor: 'design'（设计画布驱动）                    ✅ 已实现
    └── anchor: 'custom'（调用方完全控制）                  ✅ 已实现
```

### 数据流

```
preset → design coordinate system（设计坐标系）
preset + physics config → SceneScale（物理坐标 → 设计坐标）
design coordinate system + real container → Viewport（设计坐标 → 屏幕显示）
Viewport → SVG / Canvas 统一渲染
```

### 坐标空间定义

| 坐标空间 | 来源 | 单位 | 说明 |
|----------|------|------|------|
| 物理坐标 | physics/ 计算 | m, N, m/s 等 | 物理世界的真实值 |
| 设计坐标 | CANVAS_PRESETS 定义 | design-unit | 0..preset.width × 0..preset.height |
| 容器像素 | ResizeObserver 测量 | px | 真实容器尺寸 |
| 屏幕坐标 | 浏览-browser 事件 | px | clientX/clientY |

### 关键坐标变换

```
物理坐标 → 设计坐标：SceneScale（scaleX/Y + originX/Y）
设计坐标 → 容器像素：vp.transform（translate(vp.tx, vp.ty) scale(vp.scale)）
容器像素 → 设计坐标：(px - vp.tx) / vp.scale
容器像素 → 物理坐标：canvasToPhysics（逆变换）
```

---

## 三、CANVAS_PRESETS ✅

| preset | 尺寸 | 用途 | 选用规则 |
|--------|------|------|---------|
| `full` | 840×650 | 独占中屏，无分区 | 默认选择 |
| `splitV` | 840×325 | 上下分区 | 上方图表 + 下方场景 |
| `splitH` | 420×650 | 左右分区 | 左侧场景 + 右侧图表 |
| `square` | 650×650 | 圆周/旋转对称 | 圆形轨迹、向心力、天体轨道 |

基准依据：1440px 桌面中屏宽≈840px，可用高≈650px（扣除顶栏/控制条）。

### 特殊尺寸

| 尺寸 | 文件 | 处理策略 |
|------|------|---------|
| 100×100 | VerticalThrow/Projectile/ObliqueThrow | 归一化坐标系，保持现状，不迁移到 preset |
| 400×180 | StroboscopicAnimation | 条带子场景，评估是否新增 `strip` preset |
| 700×650 | SpringCompositeAnimation | 旧 full 尺寸，迁移到 full(840×650) |
| 400×350 等 | CenterExtra 文件 | 侧栏图表，不需要 viewport 体系 |

---

## 四、布局层级 ✅

```
Level 0: ThreePanel（左/中/右三栏，响应式）                ✅
    ↓
Level 1: AnimationPage（中屏内部分区）                     ✅
    ├── config.centerLayout: 'splitH' → flex-row（动画+图表左右）
    ├── config.centerLayout: 'splitV' → flex-col（图表+动画上下）
    └── 无 centerLayout → 动画独占
    ↓
Level 2: useAnimationViewport(preset)                     ✅
    ↓
Level 3: 渲染层（SVG / Canvas / 混合）
    ├── AnimationSvgCanvas                                ✅
    ├── useCanvasViewport                                 ⚠️ 待实现
    └── 混合路径                                          ⚠️ 待实现
```

### preset 与布局的关系

| centerLayout | 典型 preset | 说明 |
|-------------|-------------|------|
| `splitH` | `splitH`(420×650) | 动画只占左半区 |
| `splitV` | `splitV`(840×325) | 动画只占下半区 |
| 无 | `full`(840×650) | 动画独占 |
| 无 | `square`(650×650) | 场景需要正方形 |

**preset 是设计坐标系的基准，不是容器物理尺寸的声明** — viewport 会通过 ResizeObserver 自动适配。

---

## 五、核心规则：SceneScale 输出必须是设计坐标单位

### 问题

`vp.visibleX/Y/W/H`、`vp.centerX/Y` 是**容器像素坐标**。如果直接传入 SceneScale，输出的 `originX/Y`、`scaleX/Y` 也是容器像素单位。但 `VectorArrow` 位于 `<g transform={vp.transform}>` 内部，该 transform 将**设计坐标**映射到容器像素。因此 SceneScale 输出容器像素会导致**二次缩放**。

### 修复

SceneScale 的所有输出必须是**设计坐标单位**。容器像素值必须先反算：

```ts
const toDesign = (px: number, py: number) => ({
  dx: (px - vp.tx) / vp.scale,
  dy: (py - vp.ty) / vp.scale,
})
```

### 与已有 ViewportInfo 设计坐标字段的关系

`ViewportInfo` 已提供设计坐标字段，但语义与 SceneScale 需求**不完全一致**：

| ViewportInfo 字段 | 计算公式 | 语义 | 与 SceneScale 的差异 |
|-------------------|---------|------|---------------------|
| `vp.designVisibleW` | `visibleW / scale` | 可视区域在设计坐标中的宽度 | ✅ 等于 `visibleDesign.width` |
| `vp.designVisibleH` | `visibleH / scale` | 可视区域在设计坐标中的高度 | ✅ 等于 `visibleDesign.height` |
| `vp.designLeft` | `-tx / scale` | 设计坐标系左边界 | ⚠️ 当 `overlayLeft=0` 时等于 `visibleDesign.x`，有 overlay 时不等 |
| `vp.designTop` | `-ty / scale` | 设计坐标系上边界 | ⚠️ 同上 |

**关键区别**：`vp.designLeft` 是设计坐标系的原点偏移（`-tx/scale`），而 `visibleDesign.x` 是可视区域左边界在设计坐标中的位置（`(overlayLeft - tx) / scale`）。当 `overlayLeft > 0` 时：

```
vp.designLeft = -tx / scale
visibleDesign.x = (overlayLeft - tx) / scale = vp.designLeft + overlayLeft / scale
```

**结论**：SceneScale 的 `origin` 应使用 `visibleDesign.x/y`（可视区域边界），而非 `vp.designLeft/designTop`（设计坐标系边界）。两者仅在无 overlay 时等价。

### 单位约定

| 字段 | 单位 | 说明 |
|------|------|------|
| `SceneScale.originX/Y` | design-unit | 物理原点在设计坐标中的位置 |
| `SceneScale.scaleX/Y` | design-unit / meter | 物理单位到设计坐标的缩放 |
| `SceneScale.maxVectorLength` | design-unit | 矢量归一化上限（设计坐标） |
| `physicsScaleDesign` | design-unit / meter | 传入 useSceneScale 的物理比例 |
| `physicsScalePx` | px / meter | 容器像素比例（需转换后使用） |

### 转换公式

```ts
// 从容器像素比例转换为设计坐标比例
physicsScaleDesign = physicsScalePx / vp.scale
```

**注意 `presetCompensation` 的影响**：`vp.scale = rawScale × presetCompensation`。旧页面迁移时如果同时移除 `presetCompensation`，`vp.scale` 会变化，导致 `physicsScaleDesign` 计算结果不同。建议迁移分两步：先保持 `presetCompensation` 不变完成 API 迁移，验证视觉一致后再单独移除 `presetCompensation`。

### `worldToPixel` 函数名说明

`SceneScale.ts` 中的 `worldToPixel(wx, wy, scene)` 输出是**设计坐标**（`originX + wx * scaleX`），不是容器像素。在 `<g transform={vp.transform}>` 内使用时正确（transform 会将设计坐标映射到容器像素）。函数名中的 "pixel" 是历史命名，实际单位为 design-unit。

**别名方案**：不改名（避免大 diff），新增导出别名供新代码使用：

```ts
/** worldToPixel 的语义别名 — 输出设计坐标，不是容器像素 */
export const worldToDesign = worldToPixel
```

新代码统一使用 `worldToDesign`，旧代码逐步替换。同理 `calculateVectorPixelLength` 后续可新增别名 `calculateVectorDesignLength`。

**y-flip 兼容性**：`worldToPixel` 内部 `py = originY - wy * scaleY` 已处理 y 轴翻转（物理 y↑ → SVG y↓），与 `physicsToCanvasWithOrigin` 的 `cy = originY - y * scale` 行为一致。迁移时直接替换不需要额外处理 y-flip。

---

## 六、useSceneScale — 统一入口 ⚠️ 待实现

> **状态**：设计完成，文件 `src/hooks/useSceneScale.ts` 尚未创建。

```ts
// src/hooks/useSceneScale.ts  ⚠️ 待实现

interface UseSceneScaleOptions {
  vp: ViewportInfo
  preset: CanvasPreset

  anchor: 'viewport' | 'center' | 'design' | 'custom'

  // center 模式
  physicsScaleDesign?: number         // 设计坐标单位 (design-unit / meter)
  physicsScaleDesignX?: number        // 非等比缩放时 X 方向（可选）
  physicsScaleDesignY?: number        // 非等比缩放时 Y 方向（可选）
  centerSource?: 'viewport' | 'design' | 'custom'
  centerX?: number                    // 设计坐标
  centerY?: number                    // 设计坐标

  // viewport / design 模式
  physicsWidth?: number               // 物理世界宽度（米）
  physicsHeight?: number              // 物理世界高度（米）

  // custom 模式（anchor === 'custom' 时必填）
  customScaleX?: number               // 设计坐标单位 / meter
  customScaleY?: number               // 设计坐标单位 / meter
  customOriginX?: number              // 设计坐标
  customOriginY?: number              // 设计坐标

  // viewport / design 模式：物理原点位置
  originSource?: 'topLeft' | 'bottomLeft' | 'center' | 'custom'  // 默认 'bottomLeft'
  originX?: number                    // originSource === 'custom' 时指定（设计坐标）
  originY?: number                    // originSource === 'custom' 时指定（设计坐标）

  // 公共
  refMagnitudes?: Partial<Record<VectorType, number>>
  maxVectorLength?: number            // 设计坐标单位
  centerLayout?: 'splitH' | 'splitV'
  intentionalNonUniformScale?: boolean
}
```

### anchor 与现有 mode 的映射

| 文档 anchor | 现有 `createSceneScaleFromViewport` mode | 等价性 | 关键区别 |
|------------|----------------------------------------|--------|---------|
| `viewport` | `'visibleArea'` | 部分等价 | 新版输出设计坐标；旧版输出容器像素 |
| `design` | `'transform'` | 部分等价 | 新版允许 `physicsWidth ≠ designWidth`；旧版强制相等 |
| `center` | `'centerScale'` | 不等价 | 新版直接传 `physicsScaleDesign`；旧版需反推 `worldWidth` |
| `custom` | 无对应 | 新增 | 完全控制所有字段 |

### 各 anchor 模式的语义

#### `anchor: 'viewport'` — 可视区域驱动

物理世界铺满 viewport 可视设计区域。

```ts
// visibleDesign 完整计算（见实现代码 §六）：
visibleDesign.x = (vp.visibleX - vp.tx) / vp.scale   // 非 toDesign(vp.visibleX)，因为 visibleX 已包含 overlay 偏移
visibleDesign.y = (vp.visibleY - vp.ty) / vp.scale
visibleDesign.width = vp.visibleW / vp.scale            // 可简化为 vp.designVisibleW
visibleDesign.height = vp.visibleH / vp.scale           // 可简化为 vp.designVisibleH

scaleX = visibleDesign.width / physicsWidth
scaleY = visibleDesign.height / physicsHeight
originX = visibleDesign.x  // 可视区域左边界（设计坐标）
originY = visibleDesign.y + visibleDesign.height  // 默认 bottomLeft：可视区域底部
```

**origin 语义与 `originSource`**：

物理 y 正方向向上（VectorArrow 内部 `y1 = originY - origin.y * scaleY`，`worldToPixel` 内部 `py = originY - wy * scaleY`，均将物理 y↑ 转换为 SVG y↓）。

| `originSource` | originX | originY | 适用场景 |
|----------------|---------|---------|---------|
| `'bottomLeft'`（默认） | `visibleDesign.x` | `visibleDesign.y + visibleDesign.height` | 抛体、自由落体等 y>0 向上的场景 |
| `'topLeft'` | `visibleDesign.x` | `visibleDesign.y` | 原点在可视区域顶部，物理 y>0 画到上方（可能被裁剪） |
| `'center'` | `viewportCenterDesign.dx` | `viewportCenterDesign.dy` | 中心对称场景（同 center 模式） |
| `'custom'` | `customOriginX` | `customOriginY` | 精确控制原点位置 |

**注意**：无论 `originSource` 取何值，`worldToPixel` / `VectorArrow` 的 y 方向始终为 `py = originY - wy * scaleY`（物理 y↑ → SVG y↓）。`topLeft` 只是把物理原点放在可视区域顶部，**不会**改变 y 轴正方向。如果需要 y↓为正的坐标系，需在调用方自行翻转，当前不支持 `yDirection` 参数。

**为什么默认 `bottomLeft` 而非 `topLeft`**：大多数高中物理场景（抛体运动、自由落体、弹簧振子）的物理 y>0 向上。`topLeft` 时 `originY = visibleDesign.y`，物理 y>0 会画到可视区域上方被裁剪；`bottomLeft` 时 `originY = visibleDesign.y + visibleDesign.height`，物理 y>0 画到可视区域内。这与 `physicsToCanvasWithOrigin` 的常见用法（原点在画布底部）一致，减少迁移微调。

**VectorArrow y-flip 兼容性**：VectorArrow 内部公式 `y1 = originY - origin.y * scaleY` 已处理 y 轴翻转。无论 origin 在左上角还是中心，正 y 方向的物理矢量都会向上绘制（SVG 坐标系 y↓）。`originSource: 'center'` 时 `originY = viewportCenterDesign.dy`，VectorArrow 的 y-flip 仍然正确——正 y 矢量从中心向上画。

**`visibleArea` 与 `transform` 模式的边界**：

| 场景 | 推荐 anchor | 原因 |
|------|------------|------|
| 物理世界铺满可视区域，矢量归一化基于可视区域 | `viewport` | scaleX/Y 由 visibleDesign / physicsWidth 决定 |
| 物理世界只占设计画布的一部分（如局部放大） | `design` | scaleX/Y 由 preset / physicsWidth 决定 |
| 中心对称场景 | `center` | origin 在中心，scale 由物理比例决定 |

#### `anchor: 'center'` — 物理中心驱动

中心对称场景（圆周运动、天体轨道、电磁场）。

```ts
originX = centerSource === 'design' ? preset.width / 2
        : centerSource === 'viewport' ? viewportCenterDesign.dx
        : customCX

originY = centerSource === 'design' ? preset.height / 2
        : centerSource === 'viewport' ? viewportCenterDesign.dy
        : customCY

scaleX = physicsScaleDesignX ?? physicsScaleDesign
scaleY = physicsScaleDesignY ?? physicsScaleDesign
```

**`centerSource` 选择指南**：
- `'design'`：物理中心绑定 preset 几何中心。适合无 overlay、无 split 的对称场景。
- `'viewport'`：物理中心绑定可视区域中心。适合有 overlay 或 split 时，物理对象仍在可视区域中央。
- `'custom'`：调用方指定。适合非标准锚点（如摆的悬挂点、弹簧固定端）。

**`centerSource: 'viewport'` vs `'design'` 差异示例**：

无 overlay 时两者等价（`preset.width/2 = vp.centerX`）。有右侧 overlay 280px 时：

```ts
// preset: full (840×650), overlayRight: 280
// vp.visibleW = 840 - 280 = 560
// vp.centerX = 0 + 560 / 2 = 280
// vp.tx = (560 - 840 * scale) / 2 ≈ -140（假设 scale ≈ 0.8）

// centerSource: 'viewport'
viewportCenterDesign.dx = (280 - (-140)) / 0.8 = 525  // 可视区域中心（设计坐标）

// centerSource: 'design'
preset.width / 2 = 420  // preset 几何中心（设计坐标）

// 差异：525 vs 420，偏移 105 design-unit
// 选择 'viewport'：圆心在可视区域中央（视觉居中）
// 选择 'design'：圆心在 preset 中央（可能被 overlay 遮挡）
```

**非等比缩放**：当 `physicsScaleDesignX ≠ physicsScaleDesignY` 时（如弹簧振子 X 方向映射链长、Y 方向映射振幅），设置 `intentionalNonUniformScale: true` 以跳过 VectorArrow 的等比警告。

#### `anchor: 'design'` — 设计画布驱动

物理世界绑定完整 preset 设计画布。

```ts
scaleX = preset.width / physicsWidth
scaleY = preset.height / physicsHeight
// originSource 同 viewport 模式，默认 bottomLeft
```

| `originSource` | originX | originY | 适用场景 |
|----------------|---------|---------|---------|
| `'bottomLeft'`（默认） | `0` | `preset.height` | 抛体、自由落体等 y>0 向上 |
| `'topLeft'` | `0` | `0` | 原点在画布顶部，物理 y>0 画到上方（可能被裁剪） |
| `'center'` | `preset.width / 2` | `preset.height / 2` | 中心对称 |
| `'custom'` | `customOriginX` | `customOriginY` | 精确控制 |

#### `anchor: 'custom'` — 调用方完全控制

`center` 模式已覆盖大多数场景（`centerSource: 'custom'` 可指定自定义中心点）。`custom` 模式用于 `center` 无法覆盖的场景：**非等比缩放 + 自定义原点 + 非中心锚点**的组合。

典型用例：弹簧振子（X 方向映射链长、Y 方向映射振幅，原点在弹簧固定端而非中心）。

`anchor === 'custom'` 时 `customScaleX/Y`、`customOriginX/Y` 为必填。

### 与 `createSceneScaleFromDesignCenter` 的关系

`custom` 模式**不透传** `createSceneScaleFromDesignCenter`。原因：
1. `createSceneScaleFromDesignCenter` 不接受 `vectorBounds`，无法感知 vp.visible* 用于 `maxVectorLength` 默认计算
2. `createSceneScaleFromDesignCenter` 的 `centerX/centerY` 语义不明确（设计坐标 vs 容器像素）
3. `useSceneScale` 统一在设计坐标空间操作，不需要额外的工厂函数层

### 实现 ⚠️

```ts
function useSceneScale(options: UseSceneScaleOptions): SceneScale {
  const { vp, preset, anchor, physicsScaleDesign,
          physicsScaleDesignX, physicsScaleDesignY,
          centerSource = 'viewport', originSource = 'bottomLeft',
          centerX: customCX, centerY: customCY,
          customScaleX, customScaleY, customOriginX, customOriginY,
          originX: modeOriginX, originY: modeOriginY,
          physicsWidth, physicsHeight, refMagnitudes, maxVectorLength,
          centerLayout, intentionalNonUniformScale } = options

  // ── 参数校验 ──────────────────────────────────────────
  if (anchor === 'viewport' || anchor === 'design') {
    if (physicsWidth == null || physicsHeight == null) {
      throw new Error(`[useSceneScale] anchor "${anchor}" requires physicsWidth and physicsHeight`)
    }
  }
  if (anchor === 'center' && physicsScaleDesign == null && (physicsScaleDesignX == null || physicsScaleDesignY == null)) {
    throw new Error('[useSceneScale] anchor "center" requires physicsScaleDesign (or physicsScaleDesignX/Y)')
  }
  if (anchor === 'custom' && (customScaleX == null || customScaleY == null || customOriginX == null || customOriginY == null)) {
    throw new Error('[useSceneScale] anchor "custom" requires customScaleX, customScaleY, customOriginX, customOriginY')
  }
  if (originSource === 'custom' && (modeOriginX == null || modeOriginY == null)) {
    throw new Error('[useSceneScale] originSource "custom" requires originX and originY')
  }

  // ── 坐标计算 ──────────────────────────────────────────
  const toDesign = (px: number, py: number) => ({
    dx: (px - vp.tx) / vp.scale,
    dy: (py - vp.ty) / vp.scale,
  })

  const visibleDesign = {
    x: (vp.visibleX - vp.tx) / vp.scale,
    y: (vp.visibleY - vp.ty) / vp.scale,
    width: vp.visibleW / vp.scale,
    height: vp.visibleH / vp.scale,
  }

  const viewportCenterDesign = toDesign(vp.centerX, vp.centerY)

  // maxVectorLength 默认值（layout-aware）
  const getDefaultMaxVL = (w: number, h: number) => {
    if (centerLayout === 'splitH') return Math.min(w * 0.45, h * 0.3)
    return Math.min(w, h) * 0.3
  }

  // ── anchor 分支 ────────────────────────────────────────
  switch (anchor) {
    case 'viewport': {
      const scaleX = visibleDesign.width / physicsWidth!
      const scaleY = visibleDesign.height / physicsHeight!
      // origin 由 originSource 控制
      let ox: number, oy: number
      if (originSource === 'topLeft') {
        ox = visibleDesign.x
        oy = visibleDesign.y
      } else if (originSource === 'center') {
        ox = viewportCenterDesign.dx
        oy = viewportCenterDesign.dy
      } else if (originSource === 'custom') {
        ox = modeOriginX!
        oy = modeOriginY!
      } else {
        // bottomLeft（默认）
        ox = visibleDesign.x
        oy = visibleDesign.y + visibleDesign.height
      }
      return {
        scaleX, scaleY,
        scale: Math.min(scaleX, scaleY),
        originX: ox, originY: oy,
        maxVectorLength: maxVectorLength ?? getDefaultMaxVL(visibleDesign.width, visibleDesign.height),
        refMagnitudes,
        intentionalNonUniformScale,
      }
    }

    case 'center': {
      const resolvedCX = centerSource === 'design'
        ? preset.width / 2
        : centerSource === 'custom' ? customCX! : viewportCenterDesign.dx
      const resolvedCY = centerSource === 'design'
        ? preset.height / 2
        : centerSource === 'custom' ? customCY! : viewportCenterDesign.dy
      const sx = physicsScaleDesignX ?? physicsScaleDesign!
      const sy = physicsScaleDesignY ?? physicsScaleDesign!
      const scale = Math.min(sx, sy)
      return {
        scaleX: sx, scaleY: sy, scale,
        originX: resolvedCX, originY: resolvedCY,
        maxVectorLength: maxVectorLength ?? getDefaultMaxVL(visibleDesign.width, visibleDesign.height),
        refMagnitudes,
        intentionalNonUniformScale: intentionalNonUniformScale ?? (sx !== sy),
      }
    }

    case 'design': {
      const scaleX = preset.width / physicsWidth!
      const scaleY = preset.height / physicsHeight!
      // origin 由 originSource 控制（同 viewport，但基于 preset 画布）
      let ox: number, oy: number
      if (originSource === 'topLeft') {
        ox = 0; oy = 0
      } else if (originSource === 'center') {
        ox = preset.width / 2; oy = preset.height / 2
      } else if (originSource === 'custom') {
        ox = modeOriginX!; oy = modeOriginY!
      } else {
        // bottomLeft（默认）
        ox = 0; oy = preset.height
      }
      return {
        scaleX, scaleY,
        scale: Math.min(scaleX, scaleY),
        originX: ox, originY: oy,
        maxVectorLength: maxVectorLength ?? Math.min(preset.width, preset.height) * 0.3,
        refMagnitudes,
        intentionalNonUniformScale,
      }
    }

    case 'custom': {
      return {
        scaleX: customScaleX!,
        scaleY: customScaleY!,
        scale: Math.min(customScaleX!, customScaleY!),
        originX: customOriginX!,
        originY: customOriginY!,
        maxVectorLength: maxVectorLength ?? getDefaultMaxVL(visibleDesign.width, visibleDesign.height),
        refMagnitudes,
        intentionalNonUniformScale: intentionalNonUniformScale ?? (customScaleX !== customScaleY),
      }
    }
  }
}
```

---

## 七、useCanvasViewport — Canvas 统一入口 ⚠️ 待实现

> **状态**：设计完成，文件 `src/hooks/useCanvasViewport.ts` 尚未创建。

```ts
// src/hooks/useCanvasViewport.ts  ⚠️ 待实现

interface UseCanvasViewportOptions {
  vp: ViewportInfo
  canvasSize: CanvasSize
  mode?: 'transform' | 'raw'
}

interface CanvasViewportResult {
  canvasRef: RefObject<HTMLCanvasElement | null>
  setupFrame: () => CanvasRenderingContext2D | null
  designToPixel: (dx: number, dy: number) => { px: number; py: number }
  pixelToDesign: (px: number, py: number) => { dx: number; dy: number }
  clientToDesign: (clientX: number, clientY: number) => { dx: number; dy: number } | null
}
```

### 两种模式

| 模式 | ctx transform | 适用场景 | 注意事项 |
|------|--------------|---------|---------|
| `transform` | `dpr * vp.scale, ..., dpr * vp.tx, dpr * vp.ty` | 场景内容、物理对象、轨迹、箭头 | stroke/text 也会被缩放，线宽随画面缩放 |
| `raw` | `dpr, 0, 0, dpr, 0, 0` | 波场、粒子场、固定屏幕字号/线宽 | 线宽和字号保持屏幕固定尺寸 |

### 实现 ⚠️

```ts
function useCanvasViewport({ vp, canvasSize, mode = 'transform' }: options): CanvasViewportResult {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const setupFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const dpr = window.devicePixelRatio || 1
    const w = Math.round(canvasSize.width * dpr)
    const h = Math.round(canvasSize.height * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    // 先 reset 再 clear（clearRect 不受 transform 影响）
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 应用 viewport transform
    if (mode === 'transform') {
      ctx.setTransform(dpr * vp.scale, 0, 0, dpr * vp.scale, dpr * vp.tx, dpr * vp.ty)
    } else {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    return ctx
  }, [canvasSize.width, canvasSize.height, vp.scale, vp.tx, vp.ty, mode])

  const designToPixel = useCallback((dx: number, dy: number) => ({
    px: dx * vp.scale + vp.tx,
    py: dy * vp.scale + vp.ty,
  }), [vp.scale, vp.tx, vp.ty])

  const pixelToDesign = useCallback((px: number, py: number) => ({
    dx: (px - vp.tx) / vp.scale,
    dy: (py - vp.ty) / vp.scale,
  }), [vp.scale, vp.tx, vp.ty])

  const clientToDesign = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return pixelToDesign(clientX - rect.left, clientY - rect.top)
  }, [pixelToDesign])

  return { canvasRef, setupFrame, designToPixel, pixelToDesign, clientToDesign }
}
```

### 使用示例

```tsx
// transform 模式：直接用设计坐标绘制
const { canvasRef, setupFrame } = useCanvasViewport({ vp, canvasSize, mode: 'transform' })

const draw = useCallback(() => {
  const ctx = setupFrame()
  if (!ctx) return
  ctx.beginPath()
  ctx.arc(ballDesignX, ballDesignY, radiusDesign, 0, Math.PI * 2)
  ctx.fill()
  // 不需要手动乘 vp.scale！ctx transform 自动缩放
}, [setupFrame, ballDesignX, ballDesignY, radiusDesign])

// raw 模式：用像素坐标绘制（波场/粒子场）
const { canvasRef, setupFrame, designToPixel } = useCanvasViewport({ vp, canvasSize, mode: 'raw' })

const draw = useCallback(() => {
  const ctx = setupFrame()
  if (!ctx) return
  for (const particle of particles) {
    const { px, py } = designToPixel(particle.dx, particle.dy)
    ctx.fillRect(px - 1, py - 1, 2, 2)
  }
}, [setupFrame, designToPixel, particles])
```

### 与 `useCanvasDPR` 的关系

| | `useCanvasViewport`（新） | `useCanvasDPR`（旧） |
|---|---|---|
| 状态 | ⚠️ 待实现 | ✅ 存量 |
| DPR 处理 | 内置（`setupFrame` 自动应用 DPR） | 独立 Hook |
| viewport 对齐 | 内置（`setupFrame` 自动应用 vp.transform） | 无，调用方手动对齐 |
| 坐标转换 | 提供 `designToPixel` / `pixelToDesign` / `clientToDesign` | 无 |
| 新代码 | 统一使用 | 禁止直接调用 |
| 存量代码 | 逐步迁移 | 保留，迁移后移除 |

**`useCanvasViewport` 内部吸收 DPR 逻辑**，不再需要调用方单独使用 `useCanvasDPR`。迁移时将 `useCanvasDPR + 手动 ctx.setTransform` 替换为 `useCanvasViewport({ vp, canvasSize })` 的 `setupFrame()` 即可。

---

## 八、createSceneScaleFromViewport 处置策略 🔧

**现状**：42 个**业务文件**直接调用 `createSceneScaleFromViewport`（不含 `SceneScale.ts` 定义、`index.ts` 导出、`types.ts` 类型引用），其中：
- `visibleArea` 模式：**23 个文件**（含 NewtonSecond、Friction 通过 `SceneLayoutProfile` 传入，运行时行为与直接传字符串一致，迁移时同样处理），输出容器像素，需修复
- `centerScale` 模式：**8 个文件**（含 BoundaryMagneticField），输出容器像素，需修复
- `transform` 模式：**11 个文件**（含 SpringCompositeAnimation 自构 vp、sandboxVp、chaseVp），输出设计坐标

**`transform` 模式注意事项**：虽然输出是设计坐标（`originX=0, originY=0, scaleX=designWidth/worldWidth`），但当调用方传入 `worldWidth/worldHeight` 时，`scaleX/Y` 语义变为"物理世界不铺满画布"——此时单位仍是设计坐标，但物理世界只占画布的一部分。调用方需确保 `worldWidth` 含义与物理坐标范围一致。

**处置策略**：

1. **不废弃** `createSceneScaleFromViewport`。它是 SceneScale 的底层构造函数，`useSceneScale` 内部仍可使用其 `transform` 模式（该模式输出设计坐标，无 bug）。

2. **标记 `visibleArea` 和 `centerScale` 模式为 `@deprecated`**。新代码应通过 `useSceneScale` 使用，`useSceneScale` 内部将这两个模式的逻辑重写为设计坐标输出。标记时需同时添加：
   - JSDoc `@deprecated` 注释，明确写"输出容器像素单位，不适合在 `<g transform={vp.transform}>` 内使用，请改用 `useSceneScale`"
   - ESLint no-restricted-imports 规则或代码审查约束：**新代码禁止使用 `visibleArea`/`centerScale` 模式**，避免 deprecated 注释被忽略

3. **存量 `visibleArea`/`centerScale` 调用逐步迁移**到 `useSceneScale`，随 Phase 4 legacy 迁移批次进行。

4. **`transform` 模式保持现状**。它已经是设计坐标输出，无需修改。

---

## 九、现有页面迁移指南

### 迁移原则

**从 `visibleArea` 迁移时，不能无脑使用默认 `originSource: 'bottomLeft'`**。旧 `visibleArea` 的 `originX/Y = vp.visibleX/Y` 等价于 `topLeft` 语义。迁移时需根据旧场景的实际原点位置选择：
- 旧代码用 `physicsToCanvasWithOrigin(x, y, originX, originY, scale)` 且 `originY` 在画布底部 → `originSource: 'bottomLeft'`
- 旧代码原点在画布顶部 → `originSource: 'topLeft'`
- 旧代码原点在中心 → 改用 `anchor: 'center'`

选错会导致画面上下翻转或整体下移。

### 迁移模式

#### 模式 A：legacy → useAnimationViewport + useSceneScale

```ts
// 之前（legacy）
import { useCanvasSize, useViewport } from '@/utils'
const [ref, canvas] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
const vp = useViewport(canvas, { designWidth: 700, designHeight: 450 })
const sceneScale: SceneScale = createSceneScaleFromViewport(vp, 'visibleArea', { ... })

// 之后（标准路径）⚠️ 待 useSceneScale 实现后可用
import { useAnimationViewport } from '@/hooks'
import { useSceneScale } from '@/hooks/useSceneScale'
import type { SceneScale } from '@/scene'
const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
const sceneScale: SceneScale = useSceneScale({ vp, preset: CANVAS_PRESETS.full, anchor: 'viewport', physicsWidth: ..., physicsHeight: ... })
```

#### 模式 B：centerScale 反推 → useSceneScale center 模式

```ts
// 之前（container pixels 反推）
const scale = (vp.visibleW - padding) / (2 * rMax)
const sceneScale: SceneScale = createSceneScaleFromViewport(vp, 'centerScale', {
  worldWidth: vp.visibleW / scale,
  worldHeight: vp.visibleH / scale,
})

// 之后（design coordinates）⚠️ 待 useSceneScale 实现后可用
const physicsScalePx = (vp.visibleW - padding) / (2 * rMax)
const physicsScaleDesign = physicsScalePx / vp.scale
const sceneScale: SceneScale = useSceneScale({
  vp, preset: CANVAS_PRESETS.square,
  anchor: 'center',
  physicsScaleDesign,
  centerSource: 'viewport',
  refMagnitudes: { ... },
})
```

#### 模式 C：computeScale + physicsToCanvasWithOrigin → useSceneScale + worldToPixel

```ts
// 之前（legacy 工具）
const scale = computeScale(width, height, worldBounds)
const pos = physicsToCanvasWithOrigin(x, y, originX, originY, scale)

// 之后（标准路径）⚠️ 待 useSceneScale 实现后可用
const sceneScale: SceneScale = useSceneScale({ vp, preset, anchor: 'viewport', ... })
const { px, py } = worldToDesign(x, y, sceneScale)  // worldToDesign = worldToPixel 别名，输出设计坐标
```

### 需要修复的潜在 bug 页面

以下页面将容器像素传入 SceneScale，在有 overlay 或非标准容器比例时会产生二次缩放：

| 页面 | 问题 | 修复方式 |
|------|------|---------|
| CircularMotionAnimation | `vp.centerX` 直接作 originX | 改用 `useSceneScale` center 模式 |
| KeplerAnimation | `vp.visibleW / scale` 反推 worldWidth | 改用 `physicsScaleDesign` |
| useVerticalCircularPhysics | 同上 | 同上 |
| useCentripetalPhysics | 已用 `createSceneScaleFromDesignCenter`，输出设计坐标 | ✅ 无需改动 |

---

## 十、实施计划

### Phase 0: 文档对齐（0.5 天）✅

- 修正 `PHYSICS_ANIMATION_ARCHITECT.md` 中 preset 尺寸（700→840）
- 新增本文件 `VIEWPORT_ARCHITECTURE.md`

### Phase 1: useSceneScale 统一入口 ✅ 已完成

- 新增 `src/hooks/useSceneScale.ts`
- 所有 anchor 模式输出设计坐标单位
- `physicsScaleDesign` 单位约定
- 新增 `worldToDesign` 别名（= `worldToPixel`），新代码和迁移示例统一使用
- 标记 `createSceneScaleFromViewport` 的 `visibleArea`/`centerScale` 模式为 `@deprecated`

### Phase 2: preset 贯穿 + SceneScale 验证 ✅ 已完成

- `AnimationViewportResult` 增加 `preset` 字段 ✅
- BoundaryMagneticField SimulationView 迁移验证 ✅
  - SVG 路径：手动 `sceneScale` → `useSceneScale({ anchor: 'center' })`
  - SVG 路径：`toDesignCoords` → `worldToDesign`
  - SVG 路径：`svgSceneScale` → 直接用 `sceneScale`
  - Canvas 路径：`canvasSceneScale`（centerScale 容器像素）→ `sceneScale` + `designToPixel` ✅
  - Canvas 路径：`setupCanvasDPR` + `useDevicePixelRatio` → `useCanvasViewport({ mode: 'raw' })` ✅
  - Canvas 路径：`worldToPixel` → `toCanvasPixel`（= `worldToDesign` + `designToPixel`）✅

> `preset` 归属：`preset` 通过 `useAnimationViewport` 返回，调用方直接传入 `useSceneScale({ vp, preset, ... })`。不在 `SceneLayoutProfile` 中增加 `preset` 字段——`SceneLayoutProfile` 是声明式的布局描述，`preset` 是运行时数据，两者职责不同。

### Phase 3: useCanvasViewport 标准 Hook ✅ 已完成

- 新增 `src/hooks/useCanvasViewport.ts`
- 支持 transform/raw 两种模式
- 内置 DPR 适配 + viewport transform
- 提供 designToPixel / pixelToDesign / clientToDesign 坐标转换

### Phase 4: 51 个 legacy 文件分批迁移（2-3 周）⚠️ 待实现

**51 vs 42 的差异说明**：§八统计的 42 个文件是调用 `createSceneScaleFromViewport` 的业务文件。Phase 4 的 51 个文件是使用 `useCanvasSize + useViewport`（而非 `useAnimationViewport`）的 legacy 文件。两者有重叠但不完全相同：
- 部分 legacy 文件调用 `createSceneScaleFromViewport`（如 VelocityAnimation、FrictionAnimation）
- 部分 legacy 文件使用 `computeScale + physicsToCanvasWithOrigin` 而不调用 `createSceneScaleFromViewport`（如 BrownianMotion、CoulombLaw）
- 部分 legacy 文件只用 `useCanvasSize` 不用 `useViewport`（如 FieldLines、ClosedCircuit）

迁移时需同时处理 viewport Hook 替换和 SceneScale 单位修复。

| 批次 | 模块 | 文件数 |
|------|------|--------|
| 1 | mechanics/kinematics | 10 |
| 2 | mechanics/dynamics | 12 |
| 3 | mechanics/energy | 7 |
| 4 | mechanics/momentum | 8 |
| 5 | electromagnetism | 13 |
| 6 | thermodynamics | 5 |
| 7 | vibration + modern | 4 |

每批迁移内容：
1. `useCanvasSize + useViewport` → `useAnimationViewport`
2. `computeScale + physicsToCanvasWithOrigin` → `useSceneScale` + `worldToPixel`
3. `presetCompensation: 1.2` → 验证后移除（建议分两步：先迁 API，再移补偿）
4. 容器像素 SceneScale → 设计坐标 SceneScale

### Phase 5: 非标准 preset 评估（1 天）⚠️ 待评估

- 100×100 归一化坐标系：保持现状
- 400×180 条带：评估是否新增 preset
- CenterExtra 文件：不需要 viewport 体系

---

## 十一、验收标准

| 检查项 | 标准 |
|--------|------|
| SceneScale 单位 | 所有输出为设计坐标单位，不包含容器像素值 |
| vp.visible* 使用 | 反算为设计坐标后使用，不直接传入 SceneScale |
| VectorArrow 坐标 | 在 `<g transform={vp.transform}>` 内，坐标为设计单位 |
| Canvas transform 模式 | ctx 设置 viewport transform 后，调用方用设计坐标绘制 |
| Canvas raw 模式 | 仅 DPR 对齐，调用方用像素坐标绘制 |
| useSceneScale 调用 | 新页面统一使用，不再直接调用 createSceneScaleFrom* 的 visibleArea/centerScale 模式 |
| useCanvasViewport 调用（Phase 3 验收） | Canvas+SVG 强同步场景使用 useCanvasViewport，不再手动 setupCanvasDPR |
| useCanvasViewport 调用（长期验收） | 所有 Canvas 场景逐步迁移至 useCanvasViewport，useCanvasDPR 仅 legacy 保留 |
| presetCompensation | 新页面不传，旧页面迁移后移除（分步执行） |

---

## 十二、相关文件

| 文件 | 路径 | 状态 | 职责 |
|------|------|------|------|
| CANVAS_PRESETS | `src/theme/spacing.ts` | ✅ | 预设设计分辨率定义 |
| useAnimationViewport | `src/hooks/useAnimationViewport.ts` | ✅ | 复合 Hook：容器测量 + viewport |
| useViewport | `src/utils/useViewport.ts` | ✅ | 可视区域计算 + vp.transform |
| useCanvasSize | `src/utils/useCanvasSize.ts` | ✅ | 容器尺寸测量 |
| AnimationSvgCanvas | `src/components/Layout/AnimationSvgCanvas.tsx` | ✅ | SVG 标准容器 |
| SceneScale | `src/scene/SceneScale.ts` | 🔧 | 物理→设计坐标缩放（visibleArea/centerScale 已标记 @deprecated） |
| SceneLayoutProfile | `src/scene/SceneLayoutProfile.ts` | ✅ | 场景布局模式声明 |
| VectorArrow | `src/components/Physics/VectorArrow.tsx` | ✅ | 矢量箭头渲染 |
| useCanvasDPR | `src/hooks/useCanvasDPR.ts` | ✅ | Canvas DPR 适配（legacy，新代码用 useCanvasViewport） |
| coordinate.ts | `src/utils/coordinate.ts` | 🔧 | legacy 坐标工具（逐步淘汰） |
| worldToDesign | `src/scene/SceneScale.ts` | ✅ | worldToPixel 语义别名，输出设计坐标 |
| useSceneScale | `src/hooks/useSceneScale.ts` | ✅ | 统一 SceneScale 入口 |
| useCanvasViewport | `src/hooks/useCanvasViewport.ts` | ✅ | 统一 Canvas viewport 入口 |
