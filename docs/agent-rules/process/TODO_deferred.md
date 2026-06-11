# 延后处理待办事项

> 2026-06-11 评估确认需处理但暂不执行的项目。
> 每项标注：优先级、规范依据、影响范围、风险评估、当前状态。
>
> 2026-06-11 更新：基于实测核实，补充死代码遗漏项、修正 SVG ID 冲突分析结论、细化各项目的前置依赖关系。

---

## 1. 动画组件体积过大 — 按规范拆分

**优先级**：P0（架构合规）
**规范依据**：ARCH §12.1 "单文件超 500 行应考虑拆分"
**当前状态**：暂不执行，待 SVG ID 冲突修复后启动

### 影响范围

| 文件 | 当前行数 | 阈值 | 备注 |
|------|---------|------|------|
| `FreeFallAnimation.tsx` | ~769 | 500 | 无预定义子组件，需按 JSX 块拆分 |
| `UniformAccelerationCenterExtra.tsx` | ~722 | 500 | 已有 4 个子组件（StroboscopicAnimation/VtChartWithArea/DerivationPanel/FlashDataTable），可直接搬迁 |
| `VerticalThrowAnimation.tsx` | ~726 | 500 | 已提取 2 个 hook，建议先只拆图表区 |
| `AccelerationCenterExtra.tsx` | ~678 | 500 | 内部 IIFE 分区清晰，可不做子组件拆分，但需修复其他规范违反（见 §3.1） |

### 拆分原则

- 按渲染子组件拆分，不改 props 接口
- 子组件通过 props 接收数据，高频状态（time/params）由父组件 selector 订阅后传入
- 子组件可直接 selector 订阅稳定引用的 action（setIsPlaying 等）和低频布尔值（showVectors 等）
- 拆分后子组件放入对应子目录（如 `kinematics/free-fall/`），通过 barrel 导出
- ARCH §10 注意：禁止同一目录下存在同名 `.ts` 与 `.tsx` 文件

### 风险

- **Store 订阅扩散**：拆分后若用全量解构会导致 re-render 增加，必须用 selector 精细订阅。拆分前应建立 re-render 基线，拆分后验证不超过基线
- **`StroboscopicAnimation` 副作用越界**：该子组件内 `useEffect` 调用 `setIsPlaying(false)` 处理"小车跑出画布自动暂停"，跨越了组件边界。应上移到父组件，子组件通过 `onOffscreen` 回调通知
- **`UniformAccelerationCenterExtra` 全量 store 解构**：L22 解构 8 个字段 + L137（StroboscopicAnimation 内）再次全量解构，双重违规。拆分时必须改为 selector 精细订阅

### 前置条件

SVG ID 冲突修复（§3.3）完成后执行——避免拆分后文件数增加导致 ID 迁移范围从 17 处扩大到 20+ 处

---

## 2. 颜色硬编码清理 — 全部走 theme token

**优先级**：P1（规范合规）
**规范依据**：02_UI §2 / 07_CANVAS §2.2 "禁止组件内写 HEX/rgb 颜色"
**当前状态**：暂不执行

### 影响范围

| 硬编码类型 | 出现文件数 | 总次数 | 应替换为 | 备注 |
|-----------|-----------|--------|---------|------|
| `#FFFFFF`（材质高光/数据点描边） | 4 | 12 | `SCENE_COLORS.materials.glassHighlight`（新增）或 `canvasStyle.dataPointStroke`（新增） | 均非死代码，有实际视觉效果，不可删除 |
| `rgba(148, 163, 184, ...)` | 6 | 7 | `PHYSICS_COLORS.grid` + opacity | |
| `rgba(75, 85, 99, ...)` | 3 | 3 | `VT_CHART_COLORS.slopeTangent`（新增） | |
| `rgba(245, 158, 11, ...)` | 1 | 1 | 对应 theme token | |
| `#3B82F6` / `#EF4444` | 1（AccelerationCenterExtra） | 6 | `PHYSICS_COLORS.velocity` / `PHYSICS_COLORS.acceleration` | |
| `#CBD5E1` / `#FDBA74` / `#86EFAC` / `#475569` / `#C2410C` | 1（AccelerationCenterExtra） | 5 | 对应 theme token | |

### 处理策略

- 材质高光类（玻璃管、车窗）：在 `SCENE_COLORS.materials` 中新增 `glassHighlight` token
- 数据点描边类：在 `canvasStyle.ts` 中新增 `dataPointStroke` token
- 图表辅助色：在 `chartColors.ts` 中新增对应 token
- 可与组件拆分（§1）同步进行——拆分时自然会触及这些代码行

---

## 3. 其他延后项

### 3.1 `AccelerationCenterExtra.tsx` 规范违反

**优先级**：P1（含铁律级违反）

| 问题 | 位置 | 规范依据 | 严重程度 |
|------|------|---------|---------|
| `animate-bounce` | L657 | 02_UI §1 明确禁止 bounce 动效 | 铁律 |
| 5 处 `bg-white rounded-xl shadow-sm border border-neutral-100` 直接拼写 | L37,52,62,80,92 | 08_THREE §5.3 要求使用 Card 组件 | 中 |
| 全量 store 解构 | L31 | ARCH §5.1 要求精确订阅 | 中 |
| `#3B82F6` / `#EF4444` 硬编码 | L321,453,463,468,584,585 | 02_UI §2 / 07_CANVAS §2.2 | 中 |
| `#CBD5E1` / `#FDBA74` 等 5 色硬编码 | L648-649 | 同上 | 中 |

### 3.2 全库 store 全量解构

**优先级**：P2（系统性问题）

- 60+ 处文件使用 `useAnimationStore()` 全量解构
- 系统性问题，建议分批修正：先修正高频动画组件（kinematics/energy/circular），再扩展到其余模块
- 修正时必须用 selector 精细订阅，避免全量解构导致的 re-render

### 3.3 SVG ID 跨文件冲突

**优先级**：P2（预防性修复，当前无实际 bug）
**当前状态**：经实测确认当前不会触发冲突，但存在架构风险

#### 冲突清单

| ID | 定义文件数 | 文件列表 |
|----|-----------|---------|
| `steel-sphere-grad` | 8 | VerticalThrow, Projectile, ObliqueThrow, FreeFall, PotentialEnergy, KineticEnergy, CircularMotion, Centripetal |
| `vacuum-sphere-grad` | 5 | VerticalThrow, Projectile, ObliqueThrow, CircularMotion, Centripetal |
| `glass-tube-grad` | 2 | FreeFall, FreeFallDrip |
| `wheel-grad` | 2 | VelocityAnimation（线性渐变）, VelocityAnimationStrip（径向渐变） |

#### 当前不触发冲突的原因

逐一验证了所有可能的同屏场景：

1. **基础模式 vs 进阶模式**：所有 CenterExtra 均设 `centerExtraMode: 'advancedMode'`，`advancedMode=1` 时基础组件不渲染
2. **FreeFallAnimation vs FreeFallDripAnimation**：`FreeFallWrapper` 条件渲染，互斥
3. **VelocityAnimation vs VelocityAnimationStrip**：Strip 只在 CenterExtra 内使用，CenterExtra 挂载时 VelocityAnimation 已卸载
4. **不同动画之间**：`AnimationPage` 一次只渲染一个动画
5. **VelocityCenterExtra 内两个 Strip**：`isLandscape` 硬编码 `return true`，竖向分支是死代码（见 §3.4），不会同时挂载

#### 未来会触发冲突的场景

| 未来场景 | 冲突 ID | 表现 |
|---------|---------|------|
| 动画对比模式（同屏显示两个动画） | `steel-sphere-grad`, `vacuum-sphere-grad` | 后加载的渐变定义被浏览器忽略，球体颜色错乱 |
| Gallery/缩略图模式（同时渲染多个动画缩略图） | 同上 | 同上 |
| 页面切换动画期间新旧组件短暂共存 | 任意 | 瞬时闪烁，概率低 |
| React Suspense 边界保留旧组件 | 任意 | 加载新动画时旧动画渐变串入 |

#### 推荐修复方案：`useSvgId` hook

创建 `src/utils/useSvgId.ts`，为每个组件实例生成唯一 ID 前缀：

- 每个文件只需替换 `id="xxx"` → `id={defId('xxx')}` 和 `url(#xxx)` → `ref('xxx')}`
- 17 个定义 + 约 40 个引用需逐一修改
- 遗漏任何一处引用都会导致渐变/箭头消失（无报错，只能目视发现）

安全措施：
1. 修改前为每个受影响动画截图建立视觉基线
2. 按文件从少到多迁移：`glass-tube-grad`(2文件) → `wheel-grad`(2文件) → `vacuum-sphere-grad`(5文件) → `steel-sphere-grad`(8文件)
3. 每改一个文件立即在浏览器中验证渐变渲染
4. 完成后添加 ESLint 规则禁止 SVG `<defs>` 中使用字符串字面量 `id`

#### `wheel-grad` 特殊问题

`VelocityAnimation.tsx` 定义 `<linearGradient>`，`VelocityAnimationStrip.tsx` 定义 `<radialGradient>`，名字相同但类型不同。建议修复时将 Strip 的 ID 改为 `wheel-radial-grad` 以消除歧义。

### 3.4 `VelocityCenterExtra.tsx` 死代码分支

**优先级**：P3（代码质量，无功能影响）

| 问题 | 位置 | 说明 |
|------|------|------|
| `isLandscape` 硬编码 `return true` | L55-60 | `useMemo(() => { return true }, [model])`，`useMemo` 本身多余，应简化为 `const isLandscape = true` 或直接内联 |
| 竖向布局分支永久不可达 | L116-150 | `else` 分支约 35 行，因 `isLandscape` 恒为 `true` 永远不会执行 |

- TypeScript 无法检测（语法合法、类型正确），需人工识别逻辑死分支
- 注释暗示曾经根据模型类型选择布局方向（变加速/简谐/多阶段），后来统一改为横屏但保留了竖向分支
- 修复方式：删除 L116-150 的 `else` 分支 + 简化 `isLandscape`
- 风险：极低

### 3.5 进度文案 bug

**优先级**：P1（面向用户的错误信息）

- `HomePage.tsx:74` 显示"力学模块"，但下方数据实际统计的是全部模块（`viewedAnimations.length / Object.keys(animationRegistry).length`）
- 这是 bug，不是优化建议
- 修复方式：将"力学模块"改为"全部模块"，或更精确地显示当前模块名

### 3.6 WrongCard memo 优化

**优先级**：P1（性能）

- `WrongPage.tsx` 的 `renderCard` 内联函数是典型反模式
- 提取为 `React.memo(WrongCard)` 组件
- `menuFor` 状态保留在父组件，通过 `isMenuOpen` / `onMenuToggle` props 传入
- 父组件的回调需用 `useCallback` 包裹以保持引用稳定

### 3.7 ContentWithKatex memo

**优先级**：P1（性能，低成本高收益）

- `AnalysisPage.tsx` 的 `ContentWithKatex` 组件每次父组件渲染都重算 split + KaTeX
- 用 `React.memo` 包裹，依赖 `content` prop 不变即跳过

### 3.8 buildPhysicsQuantities 降频

**优先级**：P1（性能）

- `AnimationPage.tsx` 的 `useMemo` 依赖 `time`，每帧触发重算
- 建议将依赖改为 `Math.round(time * 10) / 10`（0.1s 精度），物理量面板不需要亚帧精度
- 拖动时间轴时用原始 `time`，播放时用 `roundedTime`

### 3.9 提取重复 filter 工具

**优先级**：P2（DRY）

- `MODULE_LABELS`、`moduleOf`、`toggle`、`chip`、`formatDate` 在 WrongPage、PracticePage、ScoreReport 三处重复
- 提取到 `src/utils/moduleHelpers.ts`

### 3.10 vendor chunk 拆分

**优先级**：P4（工程化）

- `zustand`/`idb`/`lucide-react` 应独立 chunk
- 在 `vite.config.ts` 的 `manualChunks` 中添加
- 注意：合并为 `'vendor-utils': ['zustand', 'idb', 'zod']`，`lucide-react` 单独拆（体积较大）

### 3.11 单元测试

**优先级**：P4（代码质量）

- 分批进行：第一批覆盖核心公式（kinematics.ts / dynamics.ts），第二批边界条件，第三批工具函数
- `src/physics/` 下的纯函数是最高优先级测试目标

---

## 已完成项（2026-06-11）

| 项目 | 完成内容 |
|------|---------|
| 网格纸底纹移除 | 5 个文件：UniformAccelerationCenterExtra(vt-grid引用×2)、UniformAccelerationAnimation(physics-grid定义+引用)、AccelerationAnimation(physics-grid定义+引用)、AccelerationCenterExtra(chase-grid定义+引用×2) |
| 无用 import 清理 | 3 个文件的 `OPACITY` import：UniformAccelerationAnimation、AccelerationAnimation、AccelerationCenterExtra |
| 死代码确认 | tsc --noEmit（含 noUnusedLocals + noUnusedParameters）零错误；无注释代码块；`vt-grid`/`physics-grid`/`chase-grid` 悬空引用已在网格底纹移除时清理 |
