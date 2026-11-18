# 三屏与画布防撞历史整改归档（2026-10 ~ 2026-11）

> 本文件归档原记录于 `docs/agent-rules/ui/08_THREE_PANEL_RULES.md` 中的历史普查数据、逐批整改过程与问题排查案例，供追溯背景使用；现行开发规范与可执行判据仍以 `08_THREE_PANEL_RULES.md` 为准。

---

## 一、左屏分段器折行普查与整改记录（2026-10）

- 189 个 `segmented` 中曾有 97 个（51%）在 280px 下折行、125 个在 240px 下折行，最长选项 20 字使按钮高达 76px；整改后 1440px 与 1280px 双视口深度实测（含 355 次状态切换）实现 124 页、398 个按钮 0 折行。
- `anim-experiment-bulb-va` 左屏内容高度从 1381px 降至 1230px。
- 历史 `colsMap` 仅声明 2/3/4/5 档导致 6/7/10 档静默回退 `grid-cols-2`，现已在 `SegmentedControl.columnsFor(n)` 覆盖 1–10 档。
- 历史曾尝试静态 `charWidthPx` 字宽估算模型与 `--print-widths`，因真机字形偏差与双重维护成本已废除，统一交由 `npm run check:runtime`（含 `seg-wrap`）真实浏览器 DOM 测高把关，`scripts/probe-seg-wrap.mjs` 保留用于 dev server 调试。

---

## 二、中屏字符级碰撞与溢出画布普查记录（2026-10-31 ~ 2026-11-01）

- 2026-10-31 单视口 1440 普查：124 页 / 2892 个 text，检出 63 处碰撞 / 40 页；扩为 1440+1280 双视口后为 65 处 / 40 页（5737 个 text）。
- 逐批清零过程：第一批（多系列共用通道，-8 处）→ 第二批（图表底部标注行，-12 处）→ 第三批（刻度单位收敛至轴名，-7 处）→ 第 0/1 层根因治理（`extraBottomRows`、`contentInset`、`tickLayout.ts`、`labelFit.ts`、`DialMeter` 重排，压字降至 27 处；同期补「被裁/溢出画布」判据，检出 62 处后清至 23 处）→ 第 2/3 层收尾（2026-11-01）：121 页 / 5664 个 text，双视口并集 **压字 0 处、被裁 0 处**，基线 `scripts/text-overlap-baseline.json` 清空，`FAIL_ON_CLIP` 置 `true` 转为硬门禁。

---

## 三、典型病灶与根因复盘

1. **多系列共用标注通道**：`ChartCursor` 站位 0.7 倍字号小于行高；`RelationChart` 曾将主曲线 `cursorLabel` 套用于附加系列；`FreeFallScene` 手摆比例扛不住文本宽度变化（已改按字符宽度顺序排布）。
2. **图表底部无标注空间**：`BasePhysicsChart` 新增 `extraBottomRows`；`RelationChart` 对竖直参考线自动换行；point 标注按实际左右边缘判重并取 1.5 倍字号行距；测量点图传 `cursorLabel={() => null}`。
3. **刻度与坐标轴混杂**：刻度只保留数值、单位归轴名（卡片边缘无余量时如共点力平衡图允许保留在刻度上）；手写标注严禁落入 `PhysicsGround`（`y + tickLen + 14`）与 `VectorGrid`（`centerY + 16`）刻度行。
4. **Canvas 2D 画字盲区案例**：`AlphaScatterAnimation` 曾未 `save/restore` 污染后续 `textAlign`/`textBaseline`；深色底板误用浅底色 `CANVAS_COLORS.labelTextLight`；玻尔页 `n=2` 标号曾放在电子驻留处 `angle = 0`；30px 直径表盘内读数不可再拼单位。
5. **溢出与排版盒偏差**：`anim-oblique-throw` 曾因 `originSource: 'bottomLeft'` 导致地面线与横轴刻度掉出画布；判裁切需按 `0.25 × 字号` 扣除排版盒留白；水印豁免需计算 `opacity × fill-opacity × fill alpha`。
