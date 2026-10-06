# physics-learning 残留修复报告：电磁振荡复审 N1~N6 全部闭环

- 日期：2026-10-06
- 范围：`src/data/problems/electromagnetism.ts`、`src/physics/lcOscillation.ts`、`src/data/registries/electromagnetism-em-oscillation.ts`、`src/features/electromagnetism/em-oscillation/**`、`src/data/quantities/emOscillation.ts`、`src/components/Physics/ProblemDiagrams/**`、`src/pages/AnalysisPage.tsx`、`src/data/knowledge/electricity.ts`
- 前置：本次复审（P1-1~P2-4 八项）复核后遗留 6 项（N1~N6），本轮全部清零。

---

## 一、逐项处置

### N1 题库溯源元数据仍在"说谎"（主线）

| 位置 | 修复前 | 修复后 |
|---|---|---|
| 模块头 | `电磁学高考真题库（100% 官方原卷逐字核验）` | `电磁学（第6章）经典模型演练题库` + provenance 铁律 5 条 |
| `province` | `全国卷` / `浙江卷` / `浙江卷` | `全国卷模型` / `浙江卷模型` / `浙江卷模型` |
| `id` | `prob-2022-quanguo-34-1` / `prob-2021-zhejiang-02` / `prob-2020-zhejiang-03` | `prob-lc-oscillation-model` / `prob-maxwell-em-wave-model` / `prob-lc-tuning-model` |

- 命名对齐既有约定：`prob-block-board-model`（板块模型题）、`masterProblems.ts` 的 `province: '全国卷模型'`。
- `year` 保留为**命题参考年份**（`Problem.year` 为必填 number 字段），已在模块头显式声明语义，且必须与「`X卷模型`」徽标同时呈现。
- 同步 `src/data/knowledge/electricity.ts` 的 `problemIds` 双向引用（全仓已无旧 id 残留）。

**线上证据**（`/#/practice` 实测文案）：
```
2022 全国卷模型 ★★★ LC 振荡电路充放电与电场能、磁场能转化
2021 浙江卷模型 ★★  麦克斯韦电磁场理论与电磁波的基本性质
2020 浙江卷模型 ★★★ 收音机 LC 接收回路调谐与电谐振选台
```

### N2 物理层调谐 Q 双轨 + 悬空 JSDoc

- `calculateRadioResonance` 的 JSDoc 原本被 `RADIO_TUNING_THRESHOLD` 常量"截断"，且签名默认值仍是 `Q: number = 16`，与 `DEFAULT_RADIO_TUNING_Q = 14` 形成双轨。
- 修复：JSDoc 归位并更正默认值描述；签名改为 `Q: number = DEFAULT_RADIO_TUNING_Q`。
- 追加清理 4 处消费点硬编码 `14`（中屏场景、共振曲线采样、右屏看板、物理量面板），Q 默认值现在全仓仅一处定义。

### N3 注册表陈旧单位注释

- `cRx: 1.0, // 接收端调谐电容 (μF)` → 改为「相对基准 C₀ 的比例因子（无量纲；基准 C₀ 对应 100MHz 谐振点）」，与 `paramMeta.unit = 'C₀'` 及 P2-3 修订后口径一致。

### N4 文件尾多余空行

- `lcOscillation.ts` 尾部由 `}\n\n\n` 收敛为 `}\n`。

### N5 题干示意图补齐（"逆时针 → 放电"缺少图面支撑）

- 新增 `src/components/Physics/ProblemDiagrams/ProbLcOscillationModelDiagram.tsx`，注册于 `problemDiagramRegistry['prob-lc-oscillation-model']`。
- 图面**只复述题干已给条件**，零解答提示：
  - 上极板正电、下极板负电（`CapacitorPlates` 水平模式，板距 46，电荷密度 6）；
  - 六段逆时针电流矢量（顶边向左、左竖直边向下、底边左右两段向右、右侧上下引线向上）；
  - 底边中央电感 `L`、右侧支路电容 `C`。
- 几何与 `anim-lc-oscillation` 场次 0 同源，保证「题干图 ↔ 联动动画」为同一张图。
- **未绘制板间电场线**：题干已用文字给出「电场强度方向竖直向下」，且原设计下电场线箭头与极板电荷符号在 46px 板间距内互相压盖（`+` 与场线横向仅差 3.1px，`−` 与箭头落点重合），故按考卷原图惯例只保留极板电性与电流方向。
- 字号按 `1/vp.scale` 反向补偿：本图内容位于 `<g transform={vp.transform}>` 内会被整体缩放，补偿后屏幕实际字号恒等于 `FONT` 令牌值（`C`/`L` = 14px、`i` = 11px），不随容器宽度变化。
- 配套：`AnalysisPage` 的题干/配图/防透题文案改为按 `problem.verified` 区分，杜绝给模型演练题贴「真题原卷」标签（`📄 题目原文（模型演练题）：` / `📷 题干示意图：`）。

### N6 回路电流矢量未闭合

- 右侧「右上角 → 上极板」引线缺失电流矢量，导致右侧环流标注在上极板处断开、左右不对称。
- 修复：补该段矢量，并与下段共用 `rightLeadArrowLength`——长度按引线半段收敛（`min(26 + 14·i/I₀, halfLength − 8)`），否则峰值电流（40）会越过右上角（半段仅 31.5）戳出导线。
- 渲染实测（`/#/animation/anim-lc-oscillation` 吸附 T/4，电荷为零·电流最大）：

| 段 | 箭头尖端 | 方向 |
|---|---|---|
| 顶边 | (344, 50) | 向左 ✓ |
| 左竖直边 | (140, 182) | 向下 ✓ |
| 底边左段 | (256, 242) | 向右 ✓ |
| 底边右段 | (586, 242) | 向右 ✓ |
| 右侧下引线 | (620, 188.5) | 向上 ✓ |
| 右侧上引线 | (620, 59.5) | 向上 ✓ |

（右上角 y = 50，箭头尖端 59.5 未越界；两段引线箭头端点距拐角/极板各 9.5，完全对称。）

---

## 二、验证与门禁

| 项 | 结果 |
|---|---|
| `npx tsc -b` | 0 error |
| `npx vitest run` | 81 测试文件 / 979 单测全绿 |
| `npx eslint <改动文件>` | 0 error / 0 warning |
| `npm run check:architecture` | 6 项守卫全绿（font-size / viewport-legacy / large-files / no-raf / no-marker / component-reuse） |
| 浏览器实测 | `/#/analysis/prob-lc-oscillation-model` 题干与示意图正常；`/#/practice` 三题徽标为「2022 全国卷模型 / 2021 浙江卷模型 / 2020 浙江卷模型」；`/#/animation/anim-lc-oscillation` 六段电流矢量方向与对称性正确 |

---

## 三、复查中另发现的问题 → 已于同日闭环

`problemDiagramRegistry` 曾存在**孤儿键**（注册了示意图但题目 id 已不存在，对应题目因此永远不显示配图），另有一题有 id 但无配图：

| 注册表键 | 初判 | 复核实测结论 |
|---|---|---|
| `prob-2024-quanguo-21` | 「题目已改名为 `prob-block-board-model`，键未同步 → 疑似改名遗漏」 | **成立**，且同因 |
| `prob-2022-quanguo-21` | 「全仓无此题目 id → `Prob2022Quanguo21Diagram` 为死代码」 | **推翻**：题目已改名为 `prob-model-dual-rods`，组件是该 Master 模型的专属题干图 |
| `prob-2023-quanguo-19` | 「全仓无此题目 id → `Prob2023Quanguo19Diagram` 为死代码」 | **推翻**：题目已改名为 `prob-model-single-rod`，组件同上 |
| `prob-2023-quanguo-14` | 「题目存在，但注册表无对应示意图」 | **非缺陷**：2023 全国甲卷第14题为纯文字多普勒效应单选，官方原卷无附图；补图将违反「100% 官方原卷原貌」铁律，故**刻意不补** |

**根因**：这 3 个组件是「18 大 Master 压轴模型」前 3 号的专属题干示意图。题目按 provenance 铁律改名（`prob-2024-quanguo-21` → `prob-block-board-model` 等）后，**反向引用（`models.ts` 的 `relatedProblemIds`）与图示注册表主键未同步**，形成三重断裂：

1. `MasterModelCard:101` 的 `getProblemById(probId)` 返回 `undefined` → 卡片标题退化为裸 id、来源退化为 `'高考真题'`、题干摘要消失、点击跳空路由；
2. `AnalysisPage:119` 按 `problem.id`（新 id）查 `getProblemDiagram`，而注册表主键为旧 id → 3 张图永不渲染；
3. 叠加后 3 个组件成为「注册表有、永远查不到」的孤儿。

（题目侧正向指针完好：3 题的 `masterModelId` 均正确回指 model-1/2/3，故为**单向断裂**。）

**处置（同日完成，详见 `docs/agent-rules/process/logs/2026-W40.md`「10-06 链路贯通」）**：

- `models.ts` 三处 `relatedProblemIds` 改指新 id；
- `ProblemDiagrams/index.ts` 新增 3 个**主键**，原 3 键**降级为兼容别名保留**（组件不删除，旧书签/外部链接仍可命中）；
- 同步 `masterProblems.ts:8` 注释中的失效 id；
- 新增一次性链路断言 13/13 通过（含「18 模型零悬空」「注册表零孤儿主键」两条修复前必然失败的回归项），验证后已删除，不入库。
