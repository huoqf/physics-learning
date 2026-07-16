# AGENTS.md — Antigravity 工作区规则（自动加载，优先级最高）

> 本文件由 Antigravity IDE 自动加载，无需手动读取。铁律违反 = 本次任务无效。
> 详细规范见 `.trae/rules/project_rules.md` 与 `docs/agent-rules/` 下各文档。

---

## ⚡ 铁律速查（违反则任务无效）

### 铁律 1：统一来源，禁止硬编码

| ❌ 禁止 | ✅ 正确替代 |
|--------|-----------|
| 硬编码颜色 `fill="#3B82F6"` | `import { PHYSICS_COLORS } from '@/theme/physics'` |
| 硬编码尺寸 `fontSize={14}` | `font(14)`（来自 `canvasSize.font`） |
| 自造 `<marker>` / `<line>` 矢量箭头 | `PhysicsVectorArrow` 或 `VectorArrow` |
| 直接 `requestAnimationFrame(...)` | `useAnimationLifecycle` / `src/utils/animation.ts` |
| 写死 `scale = 0.8` | `useSceneScale({ vp, preset, anchor })` |
| 任何魔法数字坐标 | `worldToDesign()` from `@/scene` |

### 铁律 2：新页面布局唯一路径

```tsx
// ✅ 唯一标准写法（新页面必须）
const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
const sceneScale = useSceneScale({ vp, preset: CANVAS_PRESETS.full, anchor: 'center' })
<AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
  ...
</AnimationSvgCanvas>
```

```tsx
// ❌ 禁止（存量遗留，新建页面严禁使用）
viewBox={`0 0 ${width} ${height}`}           // 历史方式A（固定 viewBox）
createSceneScaleFromViewport({ mode: 'visibleArea' })  // deprecated
physicsToCanvas(...)                          // 仅用于维护旧组件
```

### 铁律 3：左屏控制台必须使用声明式体系

```tsx
// ✅ 正确
paramMeta → 由 registry 驱动 ParamControl（数值参数）
controlMeta → 由 registry 驱动 ControlPanel（模式/开关/提示）
// ❌ 禁止
手写 <input type="range" />   // 散乱控件
新建 SidebarExtra 放简单开关  // 仅复杂自定义才用
```

### 铁律 4：组件复用，禁止重复手写

| 场景 | 必须使用 | import |
|------|---------|--------|
| 三栏页面 | `ThreePanel` | `@/components/Layout` |
| SVG 画布容器 | `AnimationSvgCanvas` | `@/components/Layout` |
| 质点/小球 | `Ball` | `@/components/Physics` |
| 滑块/木块 | `Block` | `@/components/Physics` |
| 地面/斜面 | `PhysicsGround` | `@/components/Physics` |
| 物理矢量 | `PhysicsVectorArrow` | `@/components/Physics` |
| 视觉标注箭头 | `VectorArrow` | `@/components/Physics` |
| 粒子轨迹 | `ParticleTrajectory` | `@/components/Physics` |
| 物理图表基座 | `BasePhysicsChart` | `@/components/Chart` |
| 左屏容器 | `LeftPanel` / `LeftPanelSection` | `@/components/UI` |

### 铁律 5：HashRouter Only

禁止引入 `BrowserRouter`，路由跳转仅用 `to="/xxx"`（HashRouter 内部路径）。

### 铁律 6：物理层纯净

`src/physics/` 内禁止出现 DOM、React、window、Store 依赖。所有函数必须有 JSDoc + 单位注释。

---

## 📋 新建页面前必须确认的 5 件事

1. **选择 preset**：`full` / `splitV` / `splitH` / `square`（见 `project_rules.md §CANVAS_PRESETS`）
2. **分层结构**：`XxxAnimation.tsx`（编排）+ `hooks/useXxxPhysics.ts`（物理）+ `components/XxxScene.tsx`（渲染）
3. **颜色来源**：物理量用 `PHYSICS_COLORS`，场景器材用 `SCENE_COLORS`，图表用 `CHART_COLORS`
4. **坐标系统**：`worldToDesign()` 转换，`useSceneScale` 比例尺，禁止手写 `x * scale + offset`
5. **Registry 注册**：`data/registries/<domain>.ts` 中的 `paramMeta` / `controlMeta` 驱动左屏控件

---

## 📚 按需读取索引

| 触发条件 | 读取文档 |
|---------|---------|
| 涉及 Canvas/SVG/图表布局 | `docs/agent-rules/ui/07_CANVAS_SVG_CHART_RULES.md` |
| 涉及 UI 组件/颜色/间距 | `docs/agent-rules/ui/02_UI_RULES.md` |
| 实现左侧/右侧屏组件 | `docs/agent-rules/ui/08_THREE_PANEL_RULES.md` |
| 需要完整组件 API | `docs/agent-rules/ui/COMPONENT_REGISTRY.md` |
| 查询动画入口→场景→物理映射 | `MEMORY.md`（动画映射表） |
| 提交前验收 | `docs/agent-rules/process/CHECKLIST.md` |

---

*最后更新：2026-07-16 | 由 Antigravity 生成*
