# [M2] 力学完善 + 导航系统

&gt; 依赖：[M1] ✅ | 完成后解锁：[M4]
&gt; 最后更新：2026-05-29

---

## M2-1 统一交互层（所有动画页公用）

- [ ] `src/components/UI/AnimationControls.tsx` — 统一控制栏
  - 播放 / 暂停 / 重置按钮
  - 速度调节：0.25x / 0.5x / 1x / 2x
  - 时间进度条（可拖动跳转）

- [ ] `src/components/UI/PhysicsPanel.tsx` — 右侧数据看板
  - 实时显示物理量（名称/值/单位）
  - 公式展示区（KaTeX）
  - 高考要点卡片区

- [ ] `src/components/UI/ParamControl.tsx` — 左侧参数面板
  - Slider + 数值输入双绑定
  - 显示参数名称、当前值、单位、范围
  - 批量重置按钮

- [ ] `src/components/UI/VectorArrow.tsx` — 矢量箭头 SVG 组件
  - 可配置颜色/标签/比例
  - 用于速度/加速度/力的矢量显示

- [ ] `src/components/UI/PhysicsGraph.tsx` — 通用物理图像组件
  - 支持 x-t / v-t / F-x 等多种图像
  - 实时数据驱动，坐标轴自适应范围
  - 支持多曲线同时显示

### 截图功能

- [ ] `src/utils/screenshot.ts` — Canvas 截图
  - `captureCanvas(canvasEl): string → base64 PNG
  - 截图按钮集成到 AnimationControls

---

## M2-2 知识导航系统

- [ ] `src/data/knowledgeTree.ts` — 完整知识树数据
  - 按模块→章→知识点三级结构
  - 每个节点包含 importance / prerequisites / animationIds

- [ ] `src/features/knowledge/KnowledgeTree.tsx` — 树形导航组件
  - 展开/折叠章节
  - 知识点完成状态（未学习/学习中/已掌握）
  - 点击节点跳转对应 AnimationPage

- [ ] `src/features/knowledge/KnowledgeMap.tsx` — 知识图谱组件（可选，[M2]后期）
  - 以图形方式显示知识点依赖关系（prerequisites）
  - 高亮当前学习路径

- [ ] `src/pages/KnowledgePage.tsx` — 知识树浏览页
  - 左侧树形导航 + 右侧知识点详情（含关联动画入口）

---

## M2-3 学习进度系统

- [ ] `src/stores/useProgressStore.ts` — 进度状态
  ```ts
  interface ProgressState {
    viewedAnimations: Set&lt;string&gt;   // 已查看的动画id
    masteredKnowledge: Set&lt;string&gt;  // 已掌握的知识点id
    lastVisited: string             // 最近访问路由
  }
  ```

- [ ] 进度持久化到 IndexedDB（通过 `storage.setDB`）

- [ ] `src/components/UI/ProgressBadge.tsx` — 知识点掌握徽章
  - 显示在知识树节点和首页

- [ ] `src/pages/HomePage.tsx` — 完整实现
  - 学习进度总览（已学/未学/总数）
  - 继续学习按钮（跳转到 lastVisited）
  - 各模块进度条

---

## M2-4 动画效果优化

- [ ] 统一过渡动画（页面切换使用 Tailwind transition）
- [ ] Canvas 渲染优化：脏区检测，避免全量重绘
- [ ] 物理仿真精度优化：对需要数值积分的场景接入 `src/math/numerical.ts` 的 RK4

---

## 完成标准

- AnimationControls / PhysicsPanel / ParamControl 在所有力学组件中统一使用
- 知识树导航可正常浏览所有力学知识点
- 学习进度在刷新后保持（IndexedDB 持久化）
- 完成后更新 `roadmap/ROADMAP_PROGRESS.md` 中 [M2] 状态 → ✅
