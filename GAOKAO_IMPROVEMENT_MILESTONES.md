# 高考提分与真题系统升级里程碑 (GAOKAO_IMPROVEMENT_MILESTONES.md)

> 本文档用于跟踪物理可视化教学平台的高考提分扩展、真题系统建设以及 18 大 Master 压轴模型专区的开发进度。
> 所有开发过程必须严格遵守 `gaokao-enhancement` Skill 与项目铁律。

---

## 📌 核心遵从规范 (Skill Requirements)

在执行以下任意里程碑时，必须强制遵守 `.agents/skills/gaokao-enhancement/SKILL.md` 铁律：
1. **真题表达与题干纯净 (Skill 0A)**：
   - 题目原文 100% 还原高考原卷，LaTeX 准确渲染。
   - 题干初始配图 (`Problem.images` / `Problem.svgContent`) **100% 纯净**，严禁包含受力分解、辅助线、矢量箭头或轨迹提示（给学生独立思考空间）。
   - 解析步骤 (`ProblemStep.svgContent`) 展开时才展示解题辅助线与矢量受力分解。
2. **真题-动画双向联动 (Skill 0C)**：
   - 真题绑定 `targetAnimation`（含 `animId` 与 `presetParams`）。
   - 动画左屏 `controlMeta` 支持 `preset` 类型的“高考真题一键装载”。
3. **画布 Viewport 与坐标变换 (Skill 0E)**：
   - 统一使用 `useAnimationViewport` + `useSceneScale` + `<AnimationSvgCanvas transform={vp.transform}>`。
   - 物理坐标转换唯一路径：`worldToDesign({ x, y }, sceneScale)`，严禁手写比例计算。
   - SVG 字体必须使用 `font(N)` 包裹。
4. **组件单源真相 (Skill 0F)**：
   - 严禁手写原生 SVG 替代已知物理/UI组件，必须优先复用 `Ball`, `Block`, `PhysicsGround`, `PhysicsVectorArrow`, `BasePhysicsChart` 等组件。

---

## 🚩 里程碑阶段划定 (Milestones Roadmap)

### 🟢 Milestone 1: 动画高考预设与临界刻度标定 (Preset & Mark Infrastructure)
- [x] 定义 `controlMeta.preset` 数据结构与解析机制
- [x] 为重点力学/电磁学动画（板块 `anim-block-board`、单杆 `anim-induction-single-rod`、双杆 `anim-induction-dual-rods` 等）补全 `controlMeta.preset` 高考真题预设
- [x] 在 `paramMeta.marks` 中标定高考常考临界刻度（如临界滑脱点、磁场收尾速度等）

### 🟡 Milestone 2: 高考真题系统与矢量图表库建设 (Exam Problems & Pure SVG Diagrams)
- [x] 扩充 `src/data/problems/` 下真题库（成功录入 2024 全国新课标卷 21 题）
- [x] 实现真题题干纯净 SVG 配图（Skill 0A & 0B，`Prob2024Quanguo21Diagram.tsx`，题干纯净绝无求解辅助线）
- [x] 实现解题步骤分解 SVG 受力图与求解轨迹图
- [x] 校验 `targetAnimation` 预设参数与动画响应连通性

### 🟠 Milestone 3: 高考 18 大 Master 压轴模型专区搭建 (18 Master Models Special Zone)
- [ ] 整理 18 大高考必考压轴模型数据清单 (`src/data/masterModels/`)
- [ ] 构建 `/master-models` 专区主页与模型卡片组件 (包含速算秒杀公式、Katex 表达式、仿真入口)
- [ ] 实现模型同源真题变式链联动（“击破一型，通晓一类”）

### 🔵 Milestone 4: 错因归因打靶与系统级质量巡检 (Error Attribution & Quality Audit)
- [ ] 建立 4 大维度高考错因诊断系统 (概念混淆、公式误用、临界忽略、计算失误)
- [ ] 自动化架构巡检与静态类型检查 (`npm run check:architecture` & `npm run check`)
- [ ] 最终回归测试与双屏/三屏适配核验

---

*创建时间：2026-07-29 | 遵循规范：gaokao-enhancement Skill*
