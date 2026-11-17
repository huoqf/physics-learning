---
name: gaokao-enhancement
description: 高考提分扩展 / 高考真题系统开发 / 增强现有页面高考功能 / 真题-动画双向联动 / 高考 Master 模型专区 / 错因归因打靶 / 真题图片复现 / 高考真题录入
---

# 高考提分与真题系统扩展 Skill

> 本 Skill 专门用于指导高考物理提分功能开发、真题系统建设、真题-动画联动以及高考 Master 压轴模型专区的搭建与重构。

---

## 📁 供按需调用的资源与范例清单 (Resources & Examples)

开发时优先直接读取或复制以下模版代码，严禁凭空空想格式：

1. **试题 TypeScript 标准数据模版**：
   - 路径：`file://.agents/skills/gaokao-enhancement/examples/problem-sample.ts`
   - 包含：已核验真题与模型演练题双范例、`verified` / `questionType` 必填规范及 `targetAnimation` 绑定。

2. **试题矢量图 React 组件标准模版**：
   - 路径：`file://.agents/skills/gaokao-enhancement/examples/DiagramSample.tsx`
   - 包含：`showAnalysis` 隔离、`PhysicsGround`、`Block`、`PhysicsVectorArrow` 复用组件以及 `canvasSize.font(N)` 规范。

3. **典型情境预设与临界刻度模版**：
   - 路径：`file://.agents/skills/gaokao-enhancement/resources/preset-meta-template.ts`
   - 包含：`controlMeta.preset` 与 `paramMeta.marks` 的临界点配置模版。

---

## 🎯 Step 0：开发前铁律与规范继承

在动手编写任何高考提分功能代码前，必须确认遵守以下铁律：

### 0A：真题溯源与防伪铁律（最核心）
1. **严禁伪造真题（防伪红线）**：
   - **只有**对照官方正式试卷或交叉核验过的网络原卷全文、且题干/选项/设问/配图均完整的真题，才允许标记 `verified: true`、`tags` 携带 `'高考真题'`，以及填写具体 `province`（如 `'全国卷'`、`'湖北卷'`）和 `source`（如 `'2025年普通高等学校招生全国统一考试（全国卷）理科综合能力测试·物理试题第14题'`）。
   - **严禁**凭记忆、套用教材模板或拼接小题来冒充具体年份、省份与第几题！
   - 凡未经原卷核验、或改编自真题思路、或自编的典型模型/巩固题，必须显式设置 `verified: false`：
     - `province` 只能写 `'模型演练'` / `'全国卷模型'` / `'基础巩固'` / `'真题改编'`，严禁写真实考区名；
     - `source` 必须写明 `'经典模型演练（...）'` 或 `'改编自 YYYY 年 XX 卷第 N 题（...）'`；
     - `tags` 与 `targetAnimation.presetDescription` 严禁出现 `'高考真题'` 或 `'真题参数'` 字样。
2. **题型与选项严格匹配（必填 `questionType`）**：
   - 必须显式声明 `questionType: 'choice' | 'calculation' | 'experiment'` 和 `verified: boolean`。
   - **严禁给实验填空题或计算解答题伪造 ABCD `optionExplanations`**！`optionExplanations` 只允许出现在 `questionType === 'choice'` 的选择题中。
   - 多选题（`optionExplanations` 中有 ≥ 2 个 `isCorrect: true`）必须在题干括号前写明`（多选）`或`（不定项）`。
3. **KaTeX 公式准确渲染**：叙述字段中所有 TeX 命令（如 `\alpha`、`\text{}`）必须用 `$...$` 或 `$$...$$` 包裹，不能裸露在中文句子中。
4. **初始态严禁透题（关键铁律）**：
   - ❌ **题干初始配图 (`Problem.images` / `ProblemDiagrams` `showAnalysis=false`)**：必须还原纯题干条件，**绝对禁止包含任何解题辅助线、受力分解矢量箭头、误差对比虚线或解答提示**；若使用 `images` 静态图，图片必须真实存在于 `public/` 目录下，严禁填写不存在的虚构路径；若题干无需图片，**严禁在文字里写“如图所示”**。
   - ❌ **练习态 `OptionVisualizer`**：练习或测试中未点开解析前不得渲染可直接高亮对错的选项提示板。
   - ❌ **动画页初始态可见文案**：左屏 `controlMeta.tip`、中屏标注、卡片副标题等不得写出结论性数值或矢量方向；结论归右屏 `FormulaSection` / `ExamPointSection`。
   - ✅ **解析步骤配图 (`showAnalysis=true` / `ProblemStep.svgContent`)**：仅在展开解析步骤后展示受力分解矢量、误差对比或求解辅助线。

### 0B：真题图片复现选型
| 复现方式 | 适用场景 | 技术路径 | 规范要求 |
|---------|---------|---------|---------|
| **方案 A：内联 React-SVG 矢量图**（首选） | 受力图、电路图、轨迹图、板块/传送带示意图 | `src/components/Physics/ProblemDiagrams/<ProblemId>Diagram.tsx` | 遵守 `showAnalysis` 隔离，调用物理组件库，电路图严格遵守 [CIRCUIT_RULES.md](file:///d:/code/physic/physics-learning/.agents/skills/refactor-animation-page/references/CIRCUIT_RULES.md)，字号用 `canvasSize.font(N)` |
| **方案 B：静态高清图片** | 复杂实物仪器图、历史物理实验照 | 存放于 `public/images/problems/` 下 | 使用 WebP 或 SVG 格式，且文件必须在仓库真实存在 |

### 0C：题目-动画双向联动规范
- 仅当题目物理模型与现有动画同构时才绑定 `targetAnimation`（概念辨析与无对应仿真场景的题不硬挂 `targetAnimation`）：
  ```typescript
  targetAnimation: {
    animId: 'anim-block-board',
    presetParams: { m: 1, M: 3, mu1: 0.3, mu2: 0.05, v0: 5, L: 2.5 },
    presetDescription: '载入板块模型临界滑脱工况参数', // 若 verified:true 可注明真题出处
  }
  ```

### 0D：三屏内容与色彩规范继承
- **左屏控件**：预设统一由 `controlMeta` 的 `preset` 类型声明，严禁手写散乱按钮。
- **色彩隔离**：物理量使用 `PHYSICS_COLORS`，器材使用 `SCENE_COLORS`，UI 使用 `@/theme/colors`，半透明使用 `withAlpha(token, opacity)`。

### 0E：VIEWPORT & 坐标变换铁律（直接调用现成体系）
1. **直接调用 Hook 与容器**：使用 `useAnimationViewport({ preset })` + `useSceneScale({ vp, preset, anchor: 'viewport' | 'center' | ... })` + `<AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>`。
2. **坐标转换唯一路径**：物理坐标通过 `worldToDesign(wx, wy, sceneScale)` 转换（返回 `{ px, py }`），严禁手写 `x * scale + offset` 或用虚构的 `anchor: 'bottom'`。
3. **禁止双重缩放**：有了 `AnimationSvgCanvas`，严禁在同一个元素上同时使用 `viewBox` 与 `vp.transform`。
4. **Preset 使用约束**：必须使用 `CANVAS_PRESETS.splitV` / `splitH` / `full` / `square`，严禁使用废弃 `wide`/`tall`。
5. **动态字号控制**：从 `useAnimationViewport` 解构 `canvasSize`，使用 `canvasSize.font(N)`（禁止从 `@/theme/spacing` 导入不存在的 `font`，也禁止写 `const font = (s: number) => s` 绕过规则）。

### 0F：组件复用铁律
开发前先查阅 [COMPONENT_REGISTRY.md](file:///d:/code/physic/physics-learning/docs/agent-rules/ui/COMPONENT_REGISTRY.md)，凡已有标准组件（`Ball`/`Block`/`PhysicsGround`/`PhysicsVectorArrow`/`ParticleTrajectory`/`DialMeter` 等）必须直接 `import` 复用。

---

## 🎯 Step 0B：适用范围与三屏职责分离边界（核心铁律）

1. **高考 Master 模型专区 (`/master-models`) 与题库练习中心 (`/practice`)**：
   - 承载题干、解析、采分步骤与 `targetAnimation` 联动，UI 必须根据 `verified === true` 明确区分「已核验真题」与「模型演练」。
2. **同步基础教学动画页面 (`/animation/:id`)**：
   - 定位是基础概念建构与规律探索，严禁在左屏堆砌高考真题题干/长篇题解，严禁在左屏用 TipCard 重复右屏 `ExamPointSection`。
   - 典型情境预设遵循 [08_THREE_PANEL_RULES.md §2.6](file:///d:/code/physic/physics-learning/docs/agent-rules/ui/08_THREE_PANEL_RULES.md#L106-L127)。

---

## 🛠️ Step 1：真题/模型与动画双向联动规范

- 点击 `targetAnimation` 后跳转至 `#/animation/:animId?params=...`（可带 `t=criticalT` 定格临界瞬间）。
- 预设参数键名必须全部存在于目标动画的 `defaultParams` 中（由 `tests/data/problemAnimationPreset.test.ts` 守卫）。

---

## 📝 Step 2：试题数据录入规范

题目存储在 `src/data/problems/` 下。完整结构见 `examples/problem-sample.ts`：
- 已核验真题：`verified: true`，填写具体 `province` 与官方 `source`；
- 模型演练/改编题：`verified: false`，`province` 写 `'模型演练'` / `'全国卷模型'` / `'基础巩固'` / `'真题改编'`，禁止虚构卷别题号。

---

## ✅ Step 3：提交前 Checklist

- [ ] 运行 `npm run check:architecture` 无报错。
- [ ] 运行 `npm test -- --run` 全部通过（含 `problemProvenance.test.ts`、`problemAnimationPreset.test.ts`、`problemTextMath.test.ts`、`experimentConsistency.test.ts`）。
- [ ] 确认 `npm run build` 构建无 TypeScript / Vite 报错。
- [ ] 确认 `verified: true` 题目逐字对照过原卷，且 `verified: false` 题目无虚假年份/省份/题号或 `'高考真题'` 标签。
- [ ] 确认非 `'choice'` 题型无伪造 `optionExplanations`，配图 `showAnalysis={false}` 初始态绝无透题元素。
