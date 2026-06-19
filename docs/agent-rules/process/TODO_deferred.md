# 延后处理待办事项

> 仅保留未完成项。上次精简：2026-06-18。

---

## 1. 动画组件体积过大 — 按规范拆分

**优先级**：P0（ARCH §12.1 单文件超 500 行）

| 文件 | 当前行数 | 备注 |
|------|---------|------|
| `FreeFallAnimation.tsx` | 709 | 已提取 2 个 hook，仍需按 JSX 块拆分 |
| `UniformAccelerationCenterExtra.tsx` | 669 | 已有 5 个子组件，可直接搬迁 |
| `VerticalThrowAnimation.tsx` | 623 | 已提取 2 个 hook，建议先拆图表区 |
| `AccelerationCenterExtra.tsx` | 646 | 需修复规范违反（见 §3） |

原则：按渲染子组件拆分，不改 props 接口；ARCH §10 禁止同目录同名 `.ts`/`.tsx`。

---

## 2. 提取重复 filter 工具

**优先级**：P2（DRY）

`MODULE_LABELS`、`moduleOf`、`toggle`、`chip`、`formatDate` 在 WrongPage、PracticePage、ScoreReport、PracticeSession 中重复定义。提取到 `src/utils/moduleHelpers.ts`。

---

## 3. 渐变/材质/命名统一

**优先级**：P2-P3（开发体验 + 架构清晰度）

链式依赖，按顺序执行：

1. **渐变数组对象化**（P2）：`SCENE_COLORS` 中 `string[]` 渐变改为语义化对象（`grad.mid`）。影响 ~50 处调用。
2. **SCENE_COLORS 拆分**（P3）：464 行拆为 `materialColors.ts`、`sceneEquipment.ts`、`glowEffects.ts`。
3. **COMMON_MATERIALS / SPHERE_COLORS 合并**（P3）：合并为 `MATERIAL_PRESETS`。
4. **命名规范统一**（P3）：明暗层命名 `{Part}{Layer}` 小写化。

---

## 4. 响应式缩放 — 剩余违规

**优先级**：P1（第 0+1+2 步已完成 ✅）

剩余未迁移项：

- **A 类 SVG fontSize 裸值**（68 处，9 文件）：KeplerAnimation(22), SatelliteAnimation(10), FaradayLaw(9), CircularMotion(6), Centripetal(6), PowerTransmission(7), Transformer(3), CuttingEMF(3), ACGeneration(2)
- **C 类 Tailwind text-[Npx]**（16 处，3 文件）：CircuitAnalysis(4), OhmLawCenterExtra(4), ClosedCircuitCenterExtra(8)
- **D 类 useCanvasSize → CANVAS_PRESETS**（27 处，25 文件）
- **第 3 步可选**：drop-shadow 封装、SVG marker token 化、Tailwind arbitrary values 清理

---

## 5. 未使用组件清理

**优先级**：P2（2026-06-18 审计）
**已删除**：PageShell、Magnet、VTChart、PhysicsGraph、DataTable、UI/VectorArrow（旧版）

| 保留 | 说明 |
|------|------|
| `components/UI/ProgressBadge.tsx` | 掌握/未掌握图标，代码干净，暂无消费者但有潜在用途 |

删除后同步清理了 barrel 导出（Layout/index.ts、Physics/index.ts、UI/index.ts）。

---

## 6. Viewport 架构演进 — 动画充满显示区域

**优先级**：P1（架构优化）
**目标**：让不同比例的动画（瘦高/矮胖/均衡）都能充分利用显示区域，避免 overlay 后主体缩小。

### 阶段 0：修正 useViewport 几何语义（前置）✅ 已完成

- [x] `ViewportInfo` 增加 `visibleX` / `visibleY`（可视区域原点）
- [x] `transform` 改为设计坐标左上角语义（当前 `tx = centerX` 会导致设计稿偏移）
- [x] `visibleW` / `visibleH` 做非负保护 `Math.max(0, ...)`
- [x] 确认 Transformer 当前不依赖旧 transform（已验证：未使用）

**核心计算修正**：
```ts
const tx = visibleX + (visibleW - designWidth * scale) / 2
const ty = visibleY + (visibleH - designHeight * scale) / 2
```

**完成时间**：2026-06-19

### 阶段 1：局部试点（不改全局）

试点动画内部声明 `SCENE_LAYOUT` 常量，不修改 AnimationConfig。

**试点选择修正**：
- Weightlessness 有 `centerExtraMode: 'advancedMode'`，进阶模式下 CenterExtra 接管全屏，动画组件不需要处理 overlay，**不适合作为 viewport 试点**
- Work 是比例布局型，但没有组件内部 overlay 面板，**适合作为 vp.visibleX/Y/W/H 试点**

| 试点 | 布局类型 | 验证目标 |
|------|---------|---------|
| Transformer | balanced + right overlay | 现有机制验证 ✅ 已完成 |
| Work | wide + 比例布局型 | `vp.visibleX/Y/W/H` 替代 `canvas.width/height` |
| Velocity | wide + 比例布局型 | 同上 |
| Collision / Momentum | wide + top/bottom | 可选，用临时 overlay 验证几何效果 |

**接入策略矩阵**：

| 布局类型 | 接入方式 |
|---------|---------|
| 比例布局型 | 用 `vp.visibleX/Y/W/H` 替代 `canvas.width/height` |
| 常量布局型 | 保持常量，确保不超出 `vp.visibleW/H` |
| 自定义 Hook 型 | 让 hook 接收 viewport info，不替换 hook |
| 新动画 | 可直接使用 `<g transform={vp.transform}>` |

**试点前提**：需要先找到有组件内部 overlay 面板的动画（类似 Transformer 的右面板），才能真正验证 viewport 的 overlay 机制。当前 Weightlessness 的 overlay 由 CenterExtra 接管，不符合试点条件。

### 关键发现：designWidth/designHeight 不等于画布尺寸

**问题**：Transformer 的视觉主体只占设计稿的 35%×55%，导致主体显小。

**分析**：
- 画布尺寸：760×440
- 主体边界：约 266×241（铁芯+电表+电源+负载）
- 主体占比：35%×55%

**解决**：将 `designWidth/designHeight` 改为更接近主体边界的值。

**当前调整**：
```ts
// Transformer.tsx
useViewport(canvas, {
  designWidth: 380,  // 从 760 改为 380
  designHeight: 320, // 从 440 改为 320
  overlayRight: rightPanelW,
})
```

**效果**：
- 基础模式：scale 从 0.58 提升到 1.0，主体大小翻倍
- 进阶模式：scale 从 0.41 提升到 0.70，主体大小提升 70%

**后续**：如果视觉效果仍不理想，可继续调整：
- 更小：`designWidth: 340, designHeight: 290`
- 更大：`designWidth: 420, designHeight: 340`

**结论**：
```txt
760×440 是外层画布尺寸，不应该直接等同于动画的视觉适配尺寸。
每个动画应该有自己的 designWidth/designHeight，反映其视觉主体的实际边界。
```

### 阶段 2：沉淀 SceneLayoutProfile

```ts
interface SceneLayoutProfile {
  designWidth: number
  designHeight: number
  layout?: 'tall' | 'wide' | 'balanced'  // 可选，默认由宽高比推导
  panelPosition?: 'right' | 'top' | 'bottom' | 'left' | 'none'  // 默认 none
  panelSizeRatio?: number  // right/left 默认 0.30，top/bottom 默认 0.25
  viewportPadding?: number
  contentBox?: { x, y, width, height }  // 延后启用
  fitMode?: 'contain' | 'content-contain'  // 延后启用
}
```

- [ ] `AnimationConfig` 增加 `sceneLayout?: SceneLayoutProfile`
- [ ] 渲染管线注入 `sceneLayout` prop（`AnimationPage` → `AnimationComponent`）
- [ ] 组件内局部 `SCENE_LAYOUT` 逐步迁移到 registry

**注意**：不要让组件反向 import registry，避免依赖环。

### 阶段 3：统一 panel layout 工具

```ts
function calculateViewportPanelLayout(options): {
  overlay: { overlayLeft?, overlayRight?, overlayTop?, overlayBottom? }
  panelStyle?: React.CSSProperties
  panelSize: number
}
```

确保 viewport overlay 和 DOM panel 尺寸来自同一计算结果，避免错位。

### 阶段 4：按需 contentBox / useSceneViewport

**触发条件**（全部满足才引入）：
- designWidth/designHeight 已合理
- panelPosition 已正确
- transform / visibleX/Y 已正确
- 但主体仍然明显偏小

**目标对象**：常量布局型动画（内部固定 px 常量导致设计稿空白不均匀）。

### 硬约束

1. `ViewportInfo` 必须暴露 `visibleX` / `visibleY`
2. `transform` 必须采用设计稿左上角语义
3. overlay 尺寸和 DOM panel 尺寸必须来自同一计算结果

### 时间线

```
第 1-2 周：修正 ViewportInfo 语义
第 3-4 周：2-3 个试点验证
第 5-6 周：沉淀 AnimationConfig + 渲染管线
第 7 周起：批量迁移有 overlay 需求的动画
```

---
