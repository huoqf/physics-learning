# 08_THREE_PANEL_RULES — 三屏职责与侧屏组件规范

> 优先级：低于 02_UI_RULES.md，高于章节实现细节
> AI任务入口：实现或修改左侧屏、右侧屏、CenterExtra 时必须读本文件
> 最后更新：2026-10-30（新增 §2.6.6 分段器宽度/列数规则；§2.6 边界脚本化）

---

## 1. 三屏职责边界（不可违反）

三屏职责边界表、职责分离铁律及详细说明统一定义于 `02_UI_RULES.md §5.1`，本文件不再重复。以下仅列本文件特有的补充约束：

1. 章节组件不得绕过统一 UI 组件自行实现按钮组、开关、选项卡

---

## 2. 左侧屏组件规范

### 2.1 左侧屏标准结构

```text
LeftPanel                         ← AnimationPage 左屏唯一顶层容器
  ├─ LeftPanelSection             ← 同考点模型切换（左屏唯一的"手写"分区）
  ├─ ControlPanel                 ← controlMeta 中非 tip 部分（模式、开关、预设、声明式 number）
  ├─ ParamControl                 ← paramMeta 连续数值参数
  └─ ControlPanel                 ← controlMeta 的 tip 分组，恒置底（§2.6.3）
```

**布局顺序**（从上到下）：同考点模型切换 → `controlMeta`（**tip 除外**）→ `paramMeta` 数值参数 → **`tip` 恒置底**。

> ⚠️ 注意：**布局顺序**（§2.1，从上到下排列）与 **声明式优先级**（§2.2，paramMeta 优先于 controlMeta）是两个不同维度。实现新页面时以 §2.2 优先级为准（先实现 paramMeta，再补充 controlMeta），最终视觉排列遵循本节布局顺序。
>
> `tip` 之所以单列出来放在最后，是因为 §2.6.3 要求"预设的观察重点归底部 tip 承载"：提示是针对**已排好的控件**说的，排在控件前面学生会先读到结论再看到参数。实现上由 AnimationPage 分两次渲染 `ControlPanel`（非 tip 一次、tip 一次），并在 [ControlPanel.tsx](../../../src/components/UI/ControlPanel.tsx) 内部把纯提示分组再下沉一次，双重保证。

不是每章都必须全部出现，但出现时必须使用统一组件和统一样式。新页面不得重新手写左屏外层 `p-4 / border-t / rounded-xl` 容器。

> **分组标题的显示规则**（`ControlPanel.tsx`）：分组内控件数 `> 1` 时显示标题；**`tip` 分组无论几条都显示标题**（单条提示若没有「教学提示 / 操作提示」的头，会变成无归属浮卡，违反 §2.6.3 的"提示是针对已排好的控件说的"）。其余单控件分组刻意不显示标题——全库 273 处单开关分组，逐条加标题会淹没真正的分区结构。

### 2.2 声明式优先级（执行规范权威来源）

> 数据接口定义见 `ARCHITECTURE_RULES.md §8.1.3`，本节为 UI 执行层面的完整规范。

| 优先级 | 机制 | 适用内容 | 说明 |
|---:|------|----------|------|
| 1 | `paramMeta` → `ParamControl` | 连续数值型物理参数 | 速度、力、电阻、角度、质量等，可附带 `group/description/marks/importance/resetOnChange` |
| 2 | `controlMeta` → `ControlPanel` | 模式、开关、预设、提示、少量声明式 number | `segmented/toggle/preset/tip/number/action/storeToggle/modeGrid` |

> **第三档 `SidebarExtra` 已废弃**：2026-07-13 全量清零（61 → 0），详见 §4。左屏只有上面两条声明式通道，没有"自定义组件"这条退路——需要新交互形态时，优先扩 `controlMeta` 的类型，而不是恢复 `SidebarExtra`。

### 2.3 组件使用边界

| 组件 / 协议 | 语义 | 使用场景 | 判断标准 |
|------|------|----------|----------|
| `LeftPanel` | 左屏顶层控制台容器 | AnimationPage 左侧屏 | 统一 padding、gap、定位上下文 |
| `LeftPanelSection` | 左屏分区卡片 | 同考点模型切换这一处手写分区；`ControlPanel` 内部也用它包裹每个分组 | 替代手写 `border-t` / `bg-white rounded...` 容器 |
| `ParamControl` | 标准数值参数组 | registry `paramMeta` | 自动支持精确输入、step 格式化、零点/mark、分组和恢复默认 |
| `ControlPanel` | 标准非数值控制组 | registry `controlMeta` | 自动渲染模式、开关、预设、提示等 |
| `Slider` | 连续参数调节 | **仅由 `ControlPanel` 内部调用**（`controlMeta.number`） | 页面代码不得直接手写；标准参数走 `paramMeta`，声明式单值走 `controlMeta.number` |
| `SegmentedControl` | 同一维度互斥视图切换 | **仅由 `ControlPanel` 内部调用**（`controlMeta.segmented`） | 页面代码不得直接手写 |
| `OptionButton` | 参数值/预设/步进选择 | **仅由 `ControlPanel` 内部调用**（`controlMeta.preset` / `modeGrid`） | 页面代码不得直接手写 |
| `ToggleSwitch` | 布尔状态开关 | **仅由 `ControlPanel` 内部调用**（`controlMeta.toggle` / `storeToggle`） | 页面代码不得直接手写 |

**禁止**：在任何左屏代码里手写按钮组、自定义 toggle、内联开关实现、原生 `<input type="range">`。连续参数必须走 `paramMeta`（或 `controlMeta.number`），模式/开关/预设/提示必须走 `controlMeta`。这四类原子控件只允许出现在 `ControlPanel` / `ParamControl` 内部。

### 2.4 进阶模式统一规范

| 情况 | 推荐组件 | 示例 |
|------|----------|------|
| 基础/进阶是两个完整视图（CenterExtra 接管布局） | `SegmentedControl` | Velocity、UniformAcceleration、NewtonSecond |
| 进阶只是叠加显示额外控件 | `ToggleSwitch` | Projectile（空气阻力开关） |
| 进阶模式会触发中心区域布局变化 | `SegmentedControl`，切换时用 `controlMeta.resetOnChange: true` 触发 `resetAnimation()` | ConnectedBodies |

### 2.5 样式 token 规则

#### 控件状态色（必须走 UI token）

| 状态 | 样式 | 禁止 |
|------|------|------|
| 选中态 | `bg-primary-50 text-primary-700 border-primary-600` | `bg-blue-100`、`bg-amber-100`、`bg-slate-100` |
| 未选中态 | `bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50` | 自定义 hover 色 |
| 禁用态 | `opacity-40 cursor-not-allowed` | `opacity-50`、`pointer-events-none` |
| 进阶模式激活 | `bg-primary-600 text-white shadow-sm` | 自定义激活色 |

#### 物理量颜色（必须走 physics token）

物理量颜色（速度蓝、加速度红、力橙等）只用于图表曲线、矢量箭头、标签点，**不得**用于控件状态色。

#### 模块标题

统一 `text-xs font-semibold text-neutral-600`。禁止使用 `uppercase tracking-wider`（中文系统不适用）。

#### 提示信息

统一使用 `TipCard` 组件。左侧屏提示**内容边界**见 §2.6.5（可判定三档），不要凭"感觉简短"来判断。

#### 左屏卡片容器

左屏控制台卡片必须优先使用 `LeftPanelSection`；页面级左屏顶层必须使用 `LeftPanel`。分区内部若还要再分级，同样用 `LeftPanelSection`，禁止手写完整卡片样式或 `mt-4 pt-4 border-t border-neutral-200` 分隔容器。

通用内容卡片（非左屏控制台）仍可使用 `Card` 组件；`Card` 标准样式：`bg-white rounded-xl shadow-sm border border-neutral-100`。

#### 重置按钮

左屏的"恢复默认参数"按钮由 `ParamControl` 自带（`paramMeta` 非空时恒出现在参数面板右上角，功能为恢复默认参数 + 重置时间 + 暂停播放）。

`paramMeta` 为空、只有 `controlMeta` 的页面（当前仅 `anim-second-law`、`anim-nuclear-reaction`）**没有**重置入口：这两页的可变状态只有模式与开关，回到默认模式即可，不额外造按钮。若将来出现"无 paramMeta 但状态复杂"的页面，优先用 `controlMeta.preset` 提供回退锚点，而不是新增全局重置按钮。

#### 按钮交互

统一 `active:scale-[0.97]`，与 02_UI_RULES.md §7 组件 8 态规范一致。

### 2.6 典型情境预设（Preset）与教学指引（Tip）规范

左侧屏典型情境预设与教学提示是引导学生进行科学探究的关键机制，必须遵守以下核心逻辑与边界：

1. **§2.6.1 预设的本质：课题探究的“基准锚点”（Benchmark Anchor）**：
   - **绝非死板录像或全锁死模式**：预设是一键将高维参数空间初始化到最能显现该物理规律的典型工况组合（如共振工况 $f=f_0$）。
   - **绝不锁定滑块**：点击预设注入初态后，所有参数滑块必须保持可自由调节。学生必须能基于该基准点进行**“控制变量法”**单变量微调（例如保持 $f=f_0$ 不变，调节阻尼 $\gamma$ 观察峰值变化），以验证规律与主动证伪。
2. **§2.6.2 空间紧凑性与文案极简（左屏空间不富裕）**：
   - 预设项（`controlMeta.preset`）采用紧凑药丸/按钮展示，**仅保留简练名称与关键参数标注**（例如 `⚡ 共振工况 (f=f₀)`）。
   - **字数标准（可机器校验，由 `scripts/check-control-meta.mjs` 强制）**：`名称部分 ≤ 12 字` + `关键参数标注 ≤ 14 字`（参数标注须用 `（）` 或 `/` 与名称分隔），**标签总长 ≤ 22 字**。物理预设的价值就在于把 $v_0$、$\theta$、$\mu$、$f_0$ 这些量锚定到典型工况，所以参数标注是**允许且鼓励**的；要压的不是数字，而是形容词和整句。14 字是"够放两个关键量"的实测上限（如 `vₐ=300, aᵦ=10`）；只放一个量更好（如 `β=0.866`）、能放一个就别放两个，导数/由公式可推出的量（$\gamma$、$T$ 等）一律不进标签。
   - **禁止把卷别写进标签**：`2024新课标卷`、`2023全国甲卷` 等来源信息不属于左屏（真题归属 `/practice` 与 `/master-models`，见第 5 条）。溯源信息应留在真题侧（`Problem.targetAnimation.presetDescription`），由真题专区与 Master 专区展示。同理**禁止「高考标准」「真题模型」「压轴题」这类应试化措辞**——标签只描述物理工况（`⚖ 动量守恒基准（v₀=6m/s）`），不描述它的考试出身。
   - **这条禁令覆盖左屏所有可见文案，不止预设标签**：分组名（`group`）、分段器选项（`options[].label`）、滑块名称与刻度（`paramMeta[].label` / `marks[].label`）、tip 标题（`tip.title`）都会被直接画在左屏上，写成「高考典型情境一键配置」「37°高考常考」「高考考点探究指导」同样违规。`check-control-meta.mjs` 已对上述字段统一扫描（2026-10 补齐；此前只查 `preset.label`，实测漏检 43 处）。
   - 超过 22 字的补充说明下沉到 `description`（上限 85 字，见 `check-control-meta.mjs`），标签本身只留"名称 + 数字"。
   - **禁止在预设项内书写多行长文本或题解**，严禁把左屏变成大卡片列表。
3. **§2.6.3 职责分离：观察引导与条件归属于底部 Tip**：
   - 预设的物理条件、探究目的、观察重点（如“观察受迫振幅是否远大于驱动振幅、位移与驱动力的相位差”）统一由 `controlMeta` 置底的 `tip` 承载。
   - `tip` 必须结构清晰、直切要害，明确声明“预设仅载入基准初态，可自由拖动下方滑块深入探索”。
4. **§2.6.4 属性规范**：
   - 典型物理过程动画的预设必须配置 `restartOnApply: true`，确保点击后重置时间并自动播放，提供流畅的即时物理反馈。
5. **§2.6.5 严禁越界行为：左屏 tip 内容三档边界（可判定）**

   先记住一句话：**左屏只回答"看哪里、怎么调"，不回答"结果是多少"**。高中物理的认知顺序是"观察先于结论"，把结论写在左屏等于剥夺学生自己发现规律的过程；而右屏 `FormulaSection` / `ExamPointSection` 本来就是给结论用的，两头重复只会让左屏变成第二块知识板。

   | 档位 | 允许内容 | 判据（可机器校验） |
   |:---:|---|---|
   | ✅ A | **操作 / 观察引导**：告诉学生该盯哪个量、该拖哪个滑块、该比较什么 | 单句 **≤ 90 字**；分步引导（含 `1.` `①` `•`）**≤ 120 字**；**不得**出现 `= 数值` 形式的结论（如 `a_C = 2g`） |
   | ✅ B | **一句物理判据**：如"绳的拉力可突变、弹簧的弹力不可突变" | ≤ 40 字，单句，不含具体题目数据 |
   | ❌ C1 | **本题答案**：任何针对当前画面中物体给出具体数值/方向的结论 | 出现即违规（透题，见 `gaokao-enhancement/SKILL.md` 铁律 0A） |
   | ❌ C2 | **公式搬运**：把 `FormulaSection` 里的公式再写一遍（含推导、代入过程） | 出现 `a = [(x₆−x₃)−(x₃−x₀)]/9T²` 这类式子即违规 → 归右屏 |
   | ❌ C3 | **高考考点总结 / 采分点 / 秒杀结论 / 决策导图** | 出现「高考」「考点」「易错点」「高频」等词即违规 → 归右屏 `ExamPointSection` |
   | ❌ C4 | **真题题干、长篇解析、解题四步法** | 归 `/practice` 与 `/master-models` |

   > **「高频」的判定口径（2026-10 补记，务必先读再改脚本）**：上表 C3 列的「高频」指**考点出现频率**（如「高频考点」「常考高频题型」），属应试信息。**「通高频阻低频」「高频避振」「高频打点计时」「高频频率 f」等描述物理特征本身的术语不受此限**——它们是交流电路、受迫振动、打点计时器实验的核心概念，删掉就讲不成课。
   >
   > 因此机器守卫用**组合词**而非单词判定：`/(?:高考|考试|常考|命题|卷)高频/`。新增词表时请沿用这一原则——**只禁"考试语境的修饰"，不禁"物理概念本身"**。同理，「压轴」禁、「压力」不禁；「考点」禁、「考察点电荷的电场」不禁。
   >
   > 历史教训：本表曾把「高频」直接列入禁令，而 `check-control-meta.mjs` 的 `TIP_FORBIDDEN` 并未收录它，规范与实现长期不一致。若当时机械地"补齐"词表，会一次性误杀 3 处合法物理术语（`electromagnetism-ac.ts` 的两句电感/电容特性、`vibration-oscillation.ts` 的高频避振预设）。

   > **「公式」的判定口径（2026-10 补记）**：C2 禁的是**推导链**（多步变形、代入过程、结果式），不是**判据型关系式**。判据是"学生要靠它才能看懂画面"的那一句，如 `v₀ = E/B₁` 才是速度选择器的通过条件、`ΔU = W` 才说清绝热不等于等温、`FN = mg` 才说清支持力的来源——删掉就讲不成课。全库现有 12 条 tip 含这类关系式，经逐条复核**保留**。
   >
   > 分界：**一个等号 + 一个物理关系**（允许）vs **连续两个以上的等号/比例号、或出现 `∝`、`²`、`²/` 这类推导痕迹**（违规，归右屏 `FormulaSection`）。按此口径清理时逐条读语义，不要用正则批量删"含 ="的句子——那会把判据一起删掉。

   > 反例（历史遗留，已清理）：`anim-light-weight-mutation` 左屏曾有一段 216 字的"【剪断瞬间受力与加速度精炼解析】"，直接把 $a_A=g↑$、$a_C=2g↓$、$a_D=0$ 写出来——而右屏四条公式早已给出同样结论。这既违反本表 C1/C2，也让该动画失去教学价值。
   >
   > 判定口径：**左屏 tip 里出现"这个物体现在这时候是多少"，就是答案；出现"你应该看哪里"，就是引导。**

   **清理手法：优先"改写"，其次"删除"。** 越界的 tip 多数原本是有用的教学意图，只是写成了结论。正确做法是把它翻成**观察任务**——把"振幅达到峰值"改成"三个预设只差 f，各放一次，只盯振幅读数怎么变"；把"感应磁场总是与原磁场相反"改成"看箭头什么时候同向、什么时候反向"。只有当右屏 `ExamPointSection` / `FormulaSection` 已逐条给出同一内容、且改写成任务后与动画画面无关时，才直接删除，并在原处留一行 `//` 注释说明右屏哪一处已覆盖（便于后人复核，不要删了不留痕）。**严禁**为了让脚本通过而把句子截断成半句。

   以上五条由 `npm run check:control-meta` 强制：预设标签字数、左屏所有文案的卷别与应试化措辞（预设标签 / 分组名 / 选项 / 滑块名称与刻度 / tip 标题）、tip 字数与 C1/C3 关键词、`preset` 与模型选择的声明顺序，任一不合即 CI 失败。字数上限是**代理指标**，不是目的——真正的判据永远是上面那句话；脚本过了但读起来像答案，仍算违规。

6. **§2.6.6 分段器选项的宽度上限与列数规则（可机器校验）**

   左屏可用宽度是硬约束：`ThreePanel` 给 `LeftPanel` 280px（1280–1439 窄屏仅 240px），减去 `p-3`（12px×2）、`LeftPanelSection` 的 `p-3` 与 1px 边框、轨道 `p-0.5` 后，`SegmentedControl` 的**轨道内容宽实测 225px（窄屏 185px）**。每个按钮格里能放下的文字宽度就是全部预算，选项超宽会在 `line-clamp-2` 下折成两行，整组控件高度从 27px 暴增到 44px，把左屏垂直空间吃光——这不是美观问题，是直接把下方滑块挤出首屏。

   | 选项数 | 列数（宽屏/窄屏） | **文字宽上限** | 典型含义 |
   |:---:|:---:|:---:|---|
   | 2 | 2 / 2 | **90px** | 约 7 个汉字（窄屏 91.5px 单格决定） |
   | 3 | 3 / 2 | **72px** | 约 6 个汉字（宽屏 73.7px 单格决定） |
   | 4 / 5 | 3 / 2 | **72px** | 退 3 列排 2 行，**不**平均分列 |
   | 6 / 7 | 2 / 2 | **90px** | 两列三行（窄屏决定） |
   | 10 | 5 / 5 | **35px** | 仅纯数字/符号（如 `0.02s`，窄屏 35.4px 单格决定） |

   > 上表是**脚本实际卡的上限**，已乘 0.98 安全系数并取两视口的较小值：单格文字宽 × 0.98。写标签时按此表判断，不要按"单格几何宽度"（111.5 / 73.7px）留数——那会贴边即折行。
   >
   > **这张表不是手抄的**：`npm run check:control-meta -- --print-widths` 会按当前 token 现算并打印（表里同时给出宽屏/窄屏各自的列数与上限）。改了内边距或 `SEGMENTED` 之后跑一遍，把结果贴回本表——数字对不上就是文档过期。

   列数由 `SegmentedControl.columnsFor(n)` 唯一决定，**`MAX_COLS = 3` 是硬上限**。曾经按"几档就几列"实现，结果 5 档时单格仅 44px（3 个汉字都没处放），任何物理标签都必然折行；退成 3 列只多占 1 行（+27px），远优于每个按钮折两行（+40px 且参差）。

   **窄屏必须降列，不能靠继续压文案**：左屏宽度随视口跳变（`PANEL.left`：≥1440px 时 280px、1280–1439px 时 **240px**），而 1366×768 是最常见的笔记本分辨率。240px 下 3 列单格只剩 **60.3px**（5 个汉字），实测有 30 处标签被迫折行。此时 `fitColumns()` 会把列数降到 2 列（单格 91.5px），只多占 1 行。判据是**单格至少 `SEGMENTED.minCell = 72px`**（6 个汉字），低于此值即降列；10 档步骤型短标签组固定 5 列不参与降列。

   **宽度预算的整条链路都有唯一真源，禁止手写数字**：
   - `PANEL.left`（`src/theme/spacing.ts`）→ 左屏标称宽 280 / 240px；
   - `LEFT_PANEL_PADDING`（同文件）→ 四层内边距的 **Tailwind 类名**（`p-3` / `p-0.5`）。组件必须引用该 token，不允许自己写 `p-3` 字面量；
   - `LEFT_PANEL_GEOMETRY` → 由类名换算的 px（`p-3` → 12）+ `sectionBorder: 1` + `subpixel: 1`（三栏 flex 均分后左屏实测 279 / 239px，比标称窄 1px）；
   - `SEGMENTED` → 单格阈值 72px 与轨道 gap 2px。
   
   内容宽 = `PANEL.left.X − 2×(panelPad + sectionPad + sectionBorder + trackPad) − subpixel` = **225 / 185px**（Chrome 实测 `getBoundingClientRect()` 同为 225 / 185）。`check-control-meta.mjs` 每次运行都读这几个 token **现算**，并断言组件确实引用了 `LEFT_PANEL_PADDING`：改内边距必须改 token，预算会跟着重算；若有人绕开 token 写死 `p-4`，CI 直接失败。
   
   > 历史故障（这条规则的由来）：内边距从 `p-4` 改成 `p-3` 后，脚本里仍写死 `SEG_CONTENT_WIDTH = 229`，静态守卫全绿、真机全部折行。**派生数字一旦写成字面量副本，就必然与源头分叉。**

   **压缩手法（按优先级，禁止截断成半句）**：
   - 括号里的解释**下沉到紧随的 `tip`**：`分压式接法 (0~E连续可调)` → `分压式接法`，条件写进 tip。
   - 公式、读数、单位**移到右屏**：`轻核聚变 (²H+³H)` → `轻核聚变`，方程由 `FormulaSection` 承载。
   - 括号改连接号：`旋转圆 (方向变)` → `旋转圆·方向`，`偏厚·d偏大`，既短又保留区分度。
   - **分段器选项**的 `①` `②` 后不加空格（空格 3.6px，四个序号就差 14px）：`① 玻尔定态能级` → `①玻尔定态`。此条**只针对 `segmented.options`**——`preset.label` 是整行按钮、宽度不受列分割影响，保留 `① 经典外接法（推荐测法）` 这类带空格的写法。
   - 长定语的密度分层（`初学 · 光子激发入门`）整体换成 `①光子激发`，递进次序已由序号表达。
   - 删冗余后缀：`…现象` `…分析` `…模式` `…效应`——分组名或 label 已经表达了这一层。
   - **同一组选项保持对仗**：压缩时若删掉了某条的「基础：/进阶：」前缀或分隔符，同组其余条目必须同步，否则一组的风格会参差（2026-10 整改中出现过 8 组此类副作用）。

   **豁免机制**：确有必要换行（如含不可拆的长物理符号）时，在该 `options` 上方用 `//` 注释写明理由，并加 `allowWrap: true`。**没有注释的 `allowWrap` 视为违规**——它与"给脚本开后门"只有一线之隔。

   **执行时机**：两道闸都在 CI 里，不需要记着手动跑。
   - `check-control-meta`（静态模型）在 `check:architecture` 内；
   - `check:seg-wrap`（真实 DOM 实测）在 `npm run check` 末尾，自带 `vite preview`（端口 5299）+ Playwright，双视口各遍历 124 个页面，**发现折行即退出码 1**。
   - 手动复验：`npm run check:seg-wrap -- --deep`（额外点开每个分段器的每个选项，覆盖 `showIf` 切换后才渲染的控件）；`-- --width 1600` 换视口。
   - 前置：`npm run build`（preview 读 `dist/`）+ `npx playwright install chromium`。缺任一项时脚本以退出码 2 直接报出，不会静默跳过。

   > 实测数据（2026-10 全量整改）：189 个 `segmented` 中 **97 个（51%）** 在 280px 下被迫折行、125 个在 240px 下折行，最长选项 20 字使按钮高达 76px；整改后 **1440px 与 1280px 两个视口各跑一遍深度实测（含 355 次状态切换）——124 个页面、398 个按钮、0 处折行**。`anim-experiment-bulb-va` 左屏内容高度 **1381px → 1230px**。
   >
   > 另一个隐藏缺陷：旧版 `colsMap` 只声明了 2/3/4/5 档，**6/7/10 档静默回退 `grid-cols-2`**——8 个控件的列数行为当时是未定义的。当前 `columnsFor()` 对 1–10 档全覆盖，新增档位请同步扩表。

   **静态模型只是第一道闸，边界必须实测**。`charWidthPx` 的字宽来自 `canvas.measureText` 逐字符校准（中文恰好 12.00px，数字 7.4px、小写 `m` 11.78px、`+`/`=` 9.13px），并按"取跨平台较大值"向上取整。校准前它对数字与 `m` 系统性低估 7~12%，放过过 `① 结合能与质量亏损`（模型 111px / 单格 111.5px）与 `固定 100m 量程对比`（模型 104.8px / 单格 111.5px）这类"算得下、实际折"的边界案例。
   >
   > 教训：**模型误差要靠校准字宽解决，不能靠放大安全系数掩盖**——把 `SEG_SAFE` 从 0.98 压到 0.93 试过，结果误报 30 处实测正常的短标签（72px / 73.5px），等于逼着人去砍不该砍的词。真正的兜底是 `npm run check:seg-wrap`（自起 preview 服务，用 Playwright 遍历全部动画、按真实 DOM 高度判定折行，已在 CI 内），它同时支持 `--width` 换视口、`--deep` 覆盖 `showIf` 分支。底层脚本 `npm run audit:seg-wrap` 保留给「已手动起 dev server」的场景。

   以上六条由 `npm run check:control-meta` 强制：预设标签字数、左屏所有文案的卷别与应试化措辞（预设标签 / 分组名 / 选项 / 滑块名称与刻度 / tip 标题）、tip 字数与 C1/C3 关键词、`preset` 与模型选择的声明顺序、**分段器选项像素宽度（内容宽由 `PANEL.left` + `LEFT_PANEL_PADDING` 现算 = 225 / 185，× `SEG_SAFE = 0.98`，低于 `SEGMENTED.minCell = 72` 即降列）**，任一不合即 CI 失败；贴边折行的边界由 `npm run check:seg-wrap` 在真实浏览器里兜底。字数上限是**代理指标**，不是目的——真正的判据永远是上面那句话；脚本过了但读起来像答案，仍算违规。

---

## 3. 右侧屏内容规范

### 3.1 三段式结构（不可变骨架）

```text
PhysicsPanel（@/components/Formula）
  ├─ QuantitySection      ← 物理量（名称 + 符号 + 当前值 + 单位）
  ├─ FormulaSection       ← 公式（KaTeX + 适用条件 + 易错提醒）
  └─ ExamPointSection     ← 高考要点（5级重要性标签）
```

即使某些章节内容较少，也保持这三个区块，可折叠或显示"暂无"。

### 3.2 Formula 数据结构

```text
Formula
  ├─ name: string          公式名称
  ├─ latex: string         KaTeX 表达式
  ├─ condition?: string    适用条件（如"仅适用于匀变速直线运动"）
  ├─ variables?: object    变量解释
  ├─ note?: string         易错提醒
  └─ level?: string        重要性或高考频率
```

`condition` 和 `note` 字段对后续章节至关重要：
- 机械能守恒条件、动量守恒条件
- 闭合电路欧姆定律适用条件
- 法拉第电磁感应定律方向判断
- 全反射条件

> 已纳入 CI 硬约束：`npm run check:formula-condition` 会对上述守恒/定律类公式强制校验 `condition` 非空（`condition` 缺失时右屏静默不渲染条件行，学生看不到成立前提）。新增定律类公式时请同步补齐条件。

### 3.3 物理量区规范

- 每个物理量包含：名称、符号、当前值、单位
- 当前值实时联动动画状态
- 数值显示规则遵循 02_UI_RULES.md §7（正数 neutral-700、负数 danger-600、零值 neutral-400、极值 accent-600）

### 3.4 高考要点区规范

遵循 02_UI_RULES.md §6 的 5 级重要性标签体系（gaokao/hard/core/basic/extend）。

---

## 4. SidebarExtra 机制（已废弃，仅作历史说明）

> **结论先说**：本仓**没有** `SidebarExtra`。2026-07-13 全量清零（61 → 0，见 `process/PROCESS_LOG.md`），124 个动画的左屏 100% 由 `paramMeta` / `controlMeta` 声明式生成。
>
> 因此历史上存在的 `SidebarExtraProps`、`animationActions`（`resetAnimation` / `pauseAnimation` / `restartAnimation` 封装）以及配套的"禁止直接访问 store""props 注入"整套约束**都已无实现**，本节只保留这段说明，防止后来者照着旧文档去找不存在的接口。
>
> **新增交互形态时怎么办**：
> 1. 先看能否用现有 `controlMeta` 类型表达（`segmented / toggle / preset / tip / number / action / storeToggle / modeGrid`）；
> 2. 表达不了，就扩 `controlMeta` 的**类型 + ControlPanel 的渲染分支**（数据驱动，可被 guard 校验），而不是恢复"页面自带自定义组件"这条路；
> 3. 参数一律走 `paramMeta`，不要为了一个特殊页面回来手写 `Slider`。
>
> 参考先例：`modeGrid`（`anim-block-board` 等）与 `storeToggle`（显隐开关）都是后来扩出来的 `controlMeta` 类型，正是因为不走 `SidebarExtra` 才能被 `check-control-meta` 统一约束。

---

## 5. CenterExtra 职责规范

### 5.1 允许内容

- 动画组件（AnimationComponent）
- 图表（MiniChart、SVG 图表）
- 数据表（频闪数据表等）
- 实时反馈（InfoBar、状态指示）
- 与当前图像直接绑定的短公式标注（如"斜率 = a""面积 = 位移"）

### 5.2 禁止内容

- 完整公式体系和推导过程 → 移到右侧屏 FormulaSection
- 知识讲解文本 → 移到右侧屏
- 高考考点总结 → 移到右侧屏 ExamPointSection

### 5.3 容器样式

- 卡片容器统一使用 `Card` 组件（`bg-white rounded-xl shadow-sm border border-neutral-100`）
- 禁止在 CenterExtra 中直接拼接 `rounded-xl shadow-md` 等样式

### 5.4 共享子组件

| 组件 | 职责 | 优先级 |
|------|------|--------|
| `MiniChart` | 迷你时序图表（多曲线、坐标轴、当前时刻标记、图例、响应式尺寸） | P1 |
| `InfoBar` | 顶部信息条（物理量色标 + 数值 + 单位） | P2 |

---

## 6. 新章节验收检查清单

每个新章节实现完成后，必须通过以下检查：

| 检查项 | 标准 |
|--------|------|
| 左侧屏是否只包含控制类内容 | 是 |
| 参数是否通过 `paramMeta → ParamControl` 或 `controlMeta → ControlPanel` 生成 | 是 |
| 连续参数是否走 `paramMeta`（或声明式 `controlMeta.number`） | 是 |
| 模式切换是否走 `controlMeta.segmented`，无手写 `SegmentedControl` | 是 |
| 状态切换是否走 `controlMeta.toggle` / `storeToggle`，无手写 `ToggleSwitch` | 是 |
| 预设选择是否走 `controlMeta.preset`，无手写 `OptionButton` | 是 |
| 左屏是否出现任何手写按钮组/原生 `<input type="range">` | 否（原子控件只能出现在 ControlPanel/ParamControl 内部） |
| 是否存在硬编码控件状态色（bg-blue-*、bg-amber-* 等） | 否 |
| 预设标签是否符合 §2.6.2 字数与卷别约束 | 是 |
| 左屏 tip 是否符合 §2.6.5 三档内容边界（无结论性数值/矢量方向、无公式搬运） | 是 |
| 分段器选项是否在 §2.6.6 单格像素预算内（2 档 ≤90px、3/4/5 档 ≤72px、6/7 档 ≤90px、10 档 ≤35px，无 `allowWrap` 时不得折行） | 是 |
| `tip` 分组是否排在左屏最底部 | 是 |
| 右侧屏是否包含物理量、公式、高考要点三段 | 是 |
| 公式是否包含适用条件（condition） | 是（如适用） |
| CenterExtra 是否避免重复展示右侧知识内容 | 是 |
| 卡片容器是否使用 Card 组件 | 是 |
| 模块标题是否使用统一格式 | 是 |

---

## 7. 底部播放控制器（AnimationControls）规范

中间屏动画区域底部统一由 `AnimationControls` 组件渲染，行为由 `AnimationConfig.controlsMode` 控制。**不得在动画组件内部自行渲染播放按钮或速度控件**。

### 7.1 模式定义

controlsMode 的完整定义（`timed` / `loop` / `param` 三种模式的选择标准、典型示例、注意事项）见 `ARCHITECTURE_RULES.md §8.1.4`，本文件不再重复。

### 7.2 布局约束

- 三种模式底部控制区的**高度应保持一致**（`param` 信息条的 padding 应与完整控制栏齐高），避免页面切换时产生跳变
- 控制区只能出现在 `AnimationCenter` 内部，**不得**由动画组件（或任何左屏代码）自行渲染额外的播放/暂停控件
- `'loop'` 型仍可通过速度选择器改变 `speed`，只是隐藏了无意义的暂停按钮

---

## 8. 扩展预留

当前左侧屏组件体系覆盖了力学和电磁学基础参数类型。后续章节如需以下扩展，应先更新本规范再实现：

| 扩展组件 | 适用场景 | 预计章节 |
|----------|----------|----------|
| `DirectionSelector` | 方向选择（电场方向、磁场方向、速度方向） | 电磁学 |
| `VectorToggleGroup` | 多矢量显示/隐藏 | 力学、电磁学 |
| `StructureSelector` | 电路结构、光学器件结构 | 电路、光学 |
| `PresetCard` | 复杂情境预设（标题+描述+参数预览） | 电磁感应、光学 |
| `UnitNumberInput` | 精确数值输入（不适合 slider 的参数） | 电路、原子物理 |

---

## 9. 相关文档索引

| 需要查询 | 查阅位置 |
|---------|----------|
| UI 视觉铁律、token 引用 | `ui/02_UI_RULES.md` |
| Canvas/SVG/图表规范 | `ui/07_CANVAS_SVG_CHART_RULES.md` |
| 动效时长/easing | `ui/03_MOTION_RULES.md` |
| 架构细则 | `core/ARCHITECTURE_RULES.md` |
| 物理量颜色完整表 | `src/theme/physics/colors.ts` |
| 动画注册表 | `src/data/animationRegistry.ts` |
| 底部控制器模式（controlsMode） | `core/ARCHITECTURE_RULES.md §8.1.4` + 本文件 §7 |
