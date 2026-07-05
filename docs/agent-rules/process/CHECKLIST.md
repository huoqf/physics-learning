# 提交流程 Checklist

## 通用检查

- [ ] TypeScript 严格编译检查通过 (`npx tsc --noEmit`)
- [ ] 无硬编码颜色值（全部来自 `@/theme/colors` 或 `@/theme/physics`，含 `CANVAS_COLORS`/`SCENE_COLORS`）
- [ ] 无硬编码视觉尺寸、间距、圆角、阴影（全部来自主题 token）
- [ ] 无重复代码，可复用部分已抽取
- [ ] 更新了 `PROCESS_LOG.md`（当前周期摘要）
- [ ] 更新了相关文档（如适用）

## 架构检查

- [ ] `physics/` 模块不依赖 React、DOM、window/document
- [ ] 状态管理仅使用 Zustand，符合 `useAnimationStore`/`useProblemStore` 等约定
- [ ] 组件分层清晰：页面 → 功能组件 → 通用组件
- [ ] 计算型 Hook 符合规范（无 JSX，纯计算逻辑）

## 动画组件检查

- [ ] 动画调度通过 `src/utils/animation.ts`，未直接调用 `requestAnimationFrame`（详见 `ARCHITECTURE_RULES.md §7`）
- [ ] Canvas 坐标转换通过 `src/utils/coordinate.ts`，未手写坐标计算
- [ ] **按布局体系选型（方式 A/B/C）**：方式 A（固定 viewBox，无 JS 几何裁切时豁免调用 useViewport）；方式 B（容器 viewBox + `<g transform={vp.transform}>`，必须声明 overlay 参数）；方式 C（基于 `vp.visible*` 与 `createSceneScaleFromViewport` 快捷字面量在像素区自适应定位）；详见 `07_CANVAS_SVG_CHART_RULES.md §2.4`
- [ ] **交互拖拽坐标转换**：方式 A/B 必须使用 `clientToSvgPoint(clientX, clientY, svg)` 原生矩阵逆变换映射；方式 C 统一使用 `clientToContainerPoint`；严禁在业务层散落 `clientX - rect.left - vp.tx` 等硬算公式
- [ ] **存量废弃 preset 迁移**：将 `wide/tall` 迁移至 `full` (700×650) 时，在 `useCanvasSize` 调用中配置 `{ presetCompensation: 1.2 }` 平滑代偿缩放比
- [ ] Canvas 元素 ≤ 7 个（黄金法则）
- [ ] Canvas 文字标注 ≤ 5 个
- [ ] 物理量颜色符合 `PHYSICS_COLORS` 语义规范
- [ ] 参数区 ≤ 5 个控制项

## Canvas/SVG/图表检查

- [ ] 使用容器尺寸 + 主题 token + min/max 约束，无硬编码最终尺寸
- [ ] SVG 路径与样式通过主题 token，无硬编码颜色或尺寸
- [ ] 图表坐标轴、标注、图例符合规范
- [ ] 可读性边界已设置（min/max 尺寸）
- [ ] 新增图表使用 `BasePhysicsChart` + 插件体系，无手写 `toSvgX/toSvgY`
- [ ] 图表颜色使用 `ChartReferenceVariant`/`ChartSeriesVariant`/`ChartAreaVariant` 枚举
- [ ] 图表组件从 `@/components/Chart` barrel import

## 物理计算检查

- [ ] 新增物理计算函数有 JSDoc + 单位注释
- [ ] 物理计算纯函数有相应的单元测试
- [ ] 物理计算逻辑正确，验证过边界情况

## 数据与注册表检查

- [ ] 新增动画/解析已在 `animationRegistry.ts`/`analysisRegistry.ts` 注册
- [ ] 新增知识点已在 `knowledgeTree.ts` 更新（如适用）
- [ ] 新增数据结构可序列化，符合类型安全

## 测试与构建检查

- [ ] Vitest 测试通过（`npm run test` 或 `vitest`）
- [ ] 生产构建成功（`npm run build`）
- [ ] 无控制台报错（打开开发服务器检查）

## 文档与日志检查

- [ ] 新功能在 `PROCESS_LOG.md` 有摘要记录
- [ ] 详细记录已更新到对应月份的 `./logs/YYYY-MM.md`
- [ ] 重要架构决策考虑是否需要新增 ADR（Architecture Decision Record）

## 特殊场景额外检查

### AnalysisPage 开发额外检查
- [ ] 题干区与解析区布局符合规范
- [ ] 同时展开步骤 ≤ 2 个
- [ ] SVG 小图元素 ≤ 5 个
- [ ] 关联知识点链接正确
- [ ] URL hash 状态保存正确

### 错题本功能额外检查
- [ ] IndexedDB 读写操作正确
- [ ] 错误状态 UI 反馈正确
- [ ] 重练流程顺畅

### 导航与路由
- [ ] 仅使用 HashRouter，未引入 BrowserRouter
- [ ] 路由跳转正确，无 404 错误
- [ ] 刷新后状态保存正确（如适用）
