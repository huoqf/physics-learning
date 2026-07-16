---
name: refactor-animation-page
description: 重构动画页面 / 重构已有组件 / 迁移旧动画 / 修复动画规范违规 / 优化现有动画页面 / 迁移 wide/tall preset
---

# 重构动画页面 Skill

> 本 Skill 触发于：重构、迁移、优化、修复现有动画页面。
> 重构的核心原则：**只改违规处，不重写正确处**。

---

## Step 0：重构前必读——存量代码识别规则

### ✅ 可以保留的遗留模式（无需迁移）

| 模式 | 说明 |
|------|------|
| `useCanvasSize(CANVAS_PRESETS.xxx)` | 旧组件维护时可用，新增代码不用 |
| `physicsToCanvas(...)` | 仅用于旧组件维护，不扩展 |
| `createSceneScaleFromViewport({ mode: 'transform' })` | 可保留（输出设计坐标） |
| 固定 `viewBox` 但**未同时使用** `vp.transform` | 历史方式A，允许维护 |

### ❌ 必须修复的违规模式（发现即修）

| 违规 | 修复方案 |
|------|---------|
| `viewBox={...}` + `vp.transform` 同时使用（双重缩放） | 移除 `viewBox`，改用 `AnimationSvgCanvas` |
| `createSceneScaleFromViewport({ mode: 'visibleArea/centerScale' })` | 替换为 `useSceneScale` |
| `requestAnimationFrame(...)` 裸调用 | 改用 `useAnimationLifecycle` |
| 手写 `<line>` + `<marker>` 箭头 | 替换为 `VectorArrow` / `PhysicsVectorArrow` |
| `originPixel` prop（已 deprecated） | 改为 `originDesign` |
| 硬编码颜色 `fill="#..."` / `stroke="red"` | 替换为主题 token |
| `fontSize={14}` 直接写死 | 改为 `font(14)` |
| 左屏手写 `<input type="range">` | 改为 `paramMeta` 声明式 |
| `<foreignObject>` 内嵌 React 图表组件 | 改为 HTML 层 flex 分区 |

---

## Step 1：渐进式迁移路径（wide/tall → full）

如遇 `CANVAS_PRESETS.wide` / `CANVAS_PRESETS.tall` 等废弃 preset：

```tsx
// 迁移前（废弃）
const { canvasSize } = useCanvasSize(CANVAS_PRESETS.wide)

// 迁移后（标准路径）
const { containerRef, canvasSize, vp } = useAnimationViewport({
  preset: CANVAS_PRESETS.full,
  // 平滑代偿：原 wide 宽度比 full 宽，需补偿缩放
  // presetCompensation: 1.2,  // ← 如视觉跑偏再加
})
```

---

## Step 2：坐标系统迁移对照

| 旧写法 | 新写法 |
|-------|-------|
| `physicsToCanvas(x, y, width, height)` | `worldToDesign({ x, y }, sceneScale)` |
| `x * (canvasWidth / physicsWidth)` | `worldToDesign({ x, y }, sceneScale).x` |
| `sceneScale.toPixel(x)` | `worldToDesign({ x, y }, sceneScale).x` |
| Canvas 路径：直接用 `sceneScale.scaleX` | `designToPixel(worldToDesign({x,y}, ss), vp)` |

---

## Step 3：颜色违规速查与修复

```tsx
// ❌ 常见违规
fill="#3B82F6"          → fill={PHYSICS_COLORS.velocity}
stroke="red"            → stroke={PHYSICS_COLORS.force}
fill="#22C55E"          → fill={PHYSICS_COLORS.energy}
fill="rgba(0,0,0,0.3)"  → fill={withAlpha(PHYSICS_COLORS.black, 0.3)}

// ❌ SCENE_COLORS 场景器材色
fill="#8B4513"          → fill={SCENE_COLORS.wood}
fill="#C0C0C0"          → fill={SCENE_COLORS.metal}
```

---

## Step 4：重构 Checklist（改后必过）

### 核心约束
- [ ] 双重缩放反模式已消除（`viewBox` + `vp.transform` 不共存）
- [ ] `originPixel` → `originDesign` 已全部替换
- [ ] 所有裸 `requestAnimationFrame` 已替换
- [ ] 手写矢量箭头 `<line>+<marker>` 已替换
- [ ] 硬编码颜色已替换为主题 token

### 保持不变（禁止过度重构）
- [ ] 未改动与本次任务无关的文件
- [ ] 未把正确的遗留模式升级为"新标准"（除非任务明确要求迁移）
- [ ] 未删除有效的 JSDoc / 注释

### 验证
- [ ] `tsc --noEmit` 通过
- [ ] 开发服务器无控制台报错
- [ ] 动画播放/暂停/重置正常

---

## 关键原则

> [!IMPORTANT]
> 重构时严禁"顺手重写"——只修复明确违规的部分，其余代码保持原样。
> 如发现需要大范围重构，必须先与用户确认范围再动手。
