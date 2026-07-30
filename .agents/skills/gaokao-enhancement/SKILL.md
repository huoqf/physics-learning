---
name: gaokao-enhancement
description: 高考提分扩展 / 高考真题系统开发 / 增强现有页面高考功能 / 真题-动画双向联动 / 高考18大Master模型专区 / 错因归因打靶 / 真题图片复现 / 高考真题录入
---

# 高考提分与真题系统扩展 Skill

> 本 Skill 专门用于指导高考物理提分功能开发、真题系统建设、真题-动画联动以及高考 18 大压轴模型专区的搭建与重构。

---

## 📁 供按需调用的资源与范例清单 (Resources & Examples)

开发时优先直接读取或复制以下模版代码，严禁凭空空想格式：

1. **高考真题 TypeScript 标准数据模版**：
   - 路径：`file://.agents/skills/gaokao-enhancement/examples/problem-sample.ts`
   - 包含：完整的真题原文、LaTeX 渲染、真题图片路径、`targetAnimation` 预设绑定及采分点步骤。

2. **高考真题矢量图 React 组件标准模版**：
   - 路径：`file://.agents/skills/gaokao-enhancement/examples/DiagramSample.tsx`
   - 包含：`PhysicsGround`、`Block`、`PhysicsVectorArrow` 复用组件以及 `font(14)` 包裹规范。

3. **高考真题一键预设与临界刻度模版**：
   - 路径：`file://.agents/skills/gaokao-enhancement/resources/preset-meta-template.ts`
   - 包含：`controlMeta.preset` 真题装载以及 `paramMeta.marks` 的临界点配置模版。

---

## 🎯 Step 0：开发前铁律与规范继承

在动手编写任何高考提分功能代码前，必须确认遵守以下 4 条铁律：

### 0A：真题表达与配图严谨性铁律（严禁透题）
1. **题目原文 100% 一致**：高考真题内容、选项及限制条件必须与原卷完全一致，严禁擅自修改字句或省略“恰好”、“滑动”、“光滑”等关键限定词。
2. **KaTeX 公式准确渲染**：必须使用 `<KatexFormula formula="..." />` 或 `$v_0 = 10 \text{ m/s}$` 的行内/块级 LaTeX 语法渲染物理公式与符号。
3. **真题初始配图严禁透题（关键铁律）**：
   - ❌ **题干初始配图 (`Problem.images` / `Problem.svgContent`)**：必须与高考原卷卷面 $100\%$ 一致！**绝对禁止包含任何解题辅助线、受力分解矢量箭头、求解轨迹或解答提示**，确保还原考场原貌，给孩子独立思考空间。
   - ✅ **解析步骤配图 (`ProblemStep.svgContent`)**：只有当学生展开查看具体的解题步骤（如 `Step 1: 受力分析`）时，才在对应步骤下方展示受力分解矢量、辅助线或解题轨迹图。

### 0B：真题图片复现选型
| 复现方式 | 适用场景 | 技术路径 | 规范要求 |
|---------|---------|---------|---------|
| **方案 A：内联 React-SVG 矢量图**（首选） | 受力图、电路图、轨迹图、板块/传送带示意图 | `src/components/Physics/ProblemDiagrams/<ProblemId>Diagram.tsx` | 调用物理组件库（`PhysicsVectorArrow`/`Ball`/`Block`等），文本用 `font(14)` |
| **方案 B：静态高清图片** | 复杂实物仪器图、历史物理实验照 | 存放于 `public/images/problems/` 下 | 使用 WebP 或 SVG 格式，响应式适配卡片宽度 |

### 0C：真题-动画双向联动规范
- 每道真题如具备对应仿真动画，必须包含 `targetAnimation` 字典：
  ```typescript
  targetAnimation: {
    animId: 'anim-block-board',
    presetParams: { m1: 1, m2: 2, mu1: 0.2, v0: 6 },
    presetDescription: '载入2024新课标卷真题初始参数'
  }
  ```

### 0D：三屏内容与色彩规范继承
- **左屏控件**：真题一键预设统一由 `controlMeta` 的 `preset` 类型声明，严禁手写散乱按钮。
- **色彩隔离**：物理量使用 `PHYSICS_COLORS`，器材使用 `SCENE_COLORS`，UI使用 `@/theme/colors`，半透明使用 `withAlpha(token, opacity)`。

### 0E：VIEWPORT & 坐标变换铁律（直接调用现成体系）
在开发真题示意图或动画场景时，**直接调用项目现有的 Viewport 与组件体系**，无需手写繁琐的比例计算：
1. **直接调用 Hook 与容器**：直接使用 `useAnimationViewport({ preset })` + `useSceneScale(...)` + `<AnimationSvgCanvas transform={vp.transform}>`，容器会自动处理好响应式缩放。
2. **坐标转换唯一路径**：物理坐标转换统一通过 `worldToDesign(x, y, sceneScale)` 转换（返回 `{ px, py }`），**严禁手写 `x * scale + offset` 或 `x * (width / physicsWidth)` 物理比例计算**。
3. **禁止双重缩放**：有了 `AnimationSvgCanvas`，**严禁在同一个元素上同时使用 `viewBox` 与 `vp.transform`**。
4. **Preset 使用约束**：必须使用标准的 `CANVAS_PRESETS.splitV` / `splitH` / `full` / `square`，**严禁使用 `wide`/`tall` 废弃 preset**，严禁手写 `width={840}` 等固定像素。
5. **动态字号控制**：SVG 文本字号必须包裹 `font(N)`（如 `fontSize={font(14)}`）。

### 0F：组件复用铁律（先查阅索引，能用组件决不手写）
项目已建立完善的物理与 UI 组件库，**严禁手写原生 SVG 替代已知组件**：
1. **组件单源真相 (SSOT)**：开发前必须先查阅组件索引文档 [COMPONENT_REGISTRY.md](file:///d:/code/physic/physics-learning/docs/agent-rules/ui/COMPONENT_REGISTRY.md) 或查看 `@/components/Physics` / `@/components/Chart` / `@/components/UI` 导出清单。
2. **动态复用原则**：凡是索引中列出或 `@/components/` 导出的标准组件（小球/滑块/斜面/矢量/弹簧/轨迹/电磁器件/电表/关系图表等），必须直接 `import` 引用。
3. **扩展免维护**：新增任何公共组件只需存放在 `@/components/` 并维护在 `COMPONENT_REGISTRY.md` 中，Skill 自动继承并生效，无需频繁修改 Skill 本身。

---

## 🛠️ Step 1：为现有物理动画添加高考真题预设与临界刻度

当为已有 93 个物理动画增加高考提分属性时，修改对应的 `src/data/registries/<domain>.ts`：

### 1.1 增加高考真题预设 (`controlMeta.preset`)
```typescript
// 示例：在 controlMeta 中添加真题一键预设
export const blockBoardControlMeta: ControlMeta[] = [
  {
    type: 'preset',
    label: '📋 2024新课标卷第21题（板块相对滑动）',
    description: 'm1=1kg, m2=2kg, μ1=0.2, v0=6m/s',
    params: { m1: 1, m2: 2, mu1: 0.2, v0: 6 },
    restartOnApply: true,
  },
  // ...其它常规控件
]
```

### 1.2 标记高考临界刻度 (`paramMeta.marks`)
```typescript
// 示例：在 paramMeta 中标注高考关键临界点
export const blockBoardParamMeta: ParamMeta[] = [
  {
    key: 'v0',
    label: '初速度 v0',
    min: 0,
    max: 12,
    unit: 'm/s',
    marks: [
      { value: 0, label: '0' },
      { value: 4.5, label: '临界: 恰好滑脱', variant: 'critical' }, // 高考临界点
      { value: 10, label: '推荐' },
    ],
  },
]
```

---

## 📝 Step 2：真题数据录入规范

真题集中存储在 `src/data/problems/<module>/` 目录下，并导出统一数据规范：

```typescript
import type { Problem } from '../types'

export const mechanicsGaokaoProblems: Problem[] = [
  {
    id: 'prob-2024-quanguo-21',
    year: 2024,
    province: '全国新课标卷',
    source: '2024年高考全国新课标卷第21题',
    title: '板块模型与临界相对滑动分析',
    content: '如图所示，质量 $m_1 = 1\\text{ kg}$ 的长木板置于光滑水平面上...',
    images: ['/images/problems/2024_quanguo_21.svg'], // 方案 B 原图
    difficulty: 4,
    knowledgeIds: ['kn-block-board'],
    masterModelId: 'model-block-board',
    tags: ['高考压轴', '板块模型', '临界受力'],
    targetAnimation: {
      animId: 'anim-block-board',
      presetParams: { m1: 1, m2: 2, mu1: 0.2, v0: 6 },
    },
    steps: [
      {
        id: 'step-1',
        description: '受力分析与临界加速度判断',
        keyCondition: '滑块与木板恰好不相对滑动时，静摩擦力达到最大值 f_max = μ1*m1*g',
        scorePoints: 3,
        formula: 'a_{\\text{max}} = \\mu_1 g',
        explanation: '当系统加速度超过 a_max 时，两者发生相对滑动。',
      },
    ],
  },
]
```

---

## 🎨 Step 3：高考 18 大 Master 模型专区卡片组件规范

开发 `/master-models` 专区组件时，遵守以下卡片结构规范：

1. **头部**：模型标题 + 高考频次勋章（`5年12考` / `高考压轴`）。
2. **核心体验区**：【🎥 物理仿真动画入口】与【📋 真题一键装载】。
3. **秒杀公式与口诀**：用 `KatexFormula` 展示高考常考速算模型表达式。
4. **真题变式链**：展示同源变式题入口，实现“击破一个模型，通晓一类真题”。

---

## ✅ Step 4：提交前 Checklist

在完成高考提分功能开发后，必须进行以下检查：

- [ ] 运行 `npm run check:architecture` 无报错（Viewport、Font-size、No-Marker、No-RAF 等规则）。
- [ ] 运行 `npm run check` 测试与构建全部通过。
- [ ] **真题题干初始配图纯净性校验**：确认 `Problem.images` / `Problem.svgContent` 无任何解题辅助线、受力分解矢量或解答提示，与高考原卷 100% 一致。
- [ ] 坐标转换统一通过 `worldToDesign({ x, y }, sceneScale)`，零手写比例与魔法数字。
- [ ] 严格复用物理组件（小球使用 `Ball`、滑块使用 `Block`、矢量使用 `PhysicsVectorArrow`/`VectorArrow`、轨迹使用 `ParticleTrajectory`、电表使用 `DialMeter` 等），无违规手写原生 SVG 替代。
- [ ] 真题描述与 LaTeX 公式无渲染错乱或格式混淆。
- [ ] 按钮与色调符合 `colors.primary` / `PHYSICS_COLORS` 规范。
