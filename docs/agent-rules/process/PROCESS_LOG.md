# 物理演示项目工程日志

## 当前周期

- 当前日期：2026-W39（09-24）
- 当前里程碑：M4 电磁/热/光/原子模块
- 本周详细日志：[2026-W39.md](./logs/2026-W39.md)
- 提交流程：[CHECKLIST.md](./CHECKLIST.md)

## 历史归档（按 ISO 周）

- [2026-W31.md](./logs/2026-W31.md)（07-28 ~ 08-02）
- [2026-W28.md](./logs/2026-W28.md)（07-07 ~ ）
- [2026-W27.md](./logs/2026-W27.md)（07-01 ~ 07-06）
- [2026-W26.md](./logs/2026-W26.md)（06-22 ~ 06-30）
- 完整历史：[2026-06.md](./logs/2026-06.md)

> 2026-W32 ~ W38 无独立周日志（无该区间变更记录）。

## 相关文档

- 审查报告（修正版 v4）：[../reports/physics-learning-审查报告-2026-09-22.md](../reports/physics-learning-审查报告-2026-09-22.md)
- **待完成项登记簿**：[TODO_deferred.md](./TODO_deferred.md) —— 第九章（内容补全待办：章节扩展 / 横向基座 / 实验专题 / 题库）、第十章（页面审查遗留技术债）
- 页面符合性审查报告（2026-09-24，§1–§14）：**待归档至 `docs/reports/`**（当前存于外部会话工作区）

## 最近变更摘要

| 日期 | 模块 | 类型 | 变更 |
|------|------|------|------|
| 09-24 | batch-1~3 复审 | fix | **批次 1–3 新页面物理与规范复审修复**（27 文件）：① 固体液体——水银毛细现象误用水表面张力系数，改真实物性常数（γ 0.073→0.465 N/m、ρ=13600、θ≈140°），新增 `LIQUID_SURFACE_TENSION`/`LIQUID_CONTACT_ANGLE`/`LIQUID_DENSITY` 单一可信源（修复前 h 偏小约 6 倍）；② 静电屏蔽——`potential`/`tipChargeDensity`/击穿阈值魔法数提取为命名常量并显式标注「示意模型参数」，σ 单位 `μC/m²` → 相对值（E0 量程 50–500 V/m 物理上不可能达 3×10⁶ V/m 击穿场强），电场线与内部矢量改用具名 `VectorArrow`，内部矢量 `type` 由 `force` 修正为 `electricField` 并同步 `refMagnitudes`；③ 多普勒——超音速模式不再显示伪造的「前方接收频率 100 Hz 偏高」，改述为激波/马赫锥（新增 `isSupersonic` 判定）；④ 饱和汽——**p 由 V 推导**解耦（新增 `calculateVaporPressureWithVolume`：未饱和遵循玻意耳 p∝1/V，达 ps 后锁定且与 V 无关），气相分子数随 `vaporFraction` 缩减，3 预设与右屏看板重设，新增 3 单测；⑤ 规范——清除传感器/自感页面 65 处硬编码颜色为语义 token，蒸发凝结箭头改具名矢量组件，清理死字段。验证：`tsc -b` 0 error + ESLint 0 warning + 926 单测全绿 + 6 守门全绿 |
| 09-24 | batch-1 (ac-impedance & doppler) | feat | **批次 1 上线**：`electricity-5-5`（感抗与容抗）+ `vibration-2-3`（多普勒效应）；纯物理函数与单测；splitV 上图表下场景；人教版控制变量与声速比保真波前；动画总数 105→107，901 单测与 6 守门全绿 |
| 09-24 | electromagnetism/em-oscillation | feat | **新增章节「电磁振荡与电磁波」**：`electricity-6-1`（LC 振荡）/`6-2`（麦克斯韦电磁场理论与电磁波）/`6-3`（电磁波谱）三节点 + `LCOscillationScene`/`EMWaveScene`/`EMSpectrumScene` + `physics/lcOscillation.ts`·`emWave.ts`。**阻尼定性**（仅衰减包络 + 文案，不解二阶 RLC 方程），组件全复用（`CapacitorPlates`/`CoilBase`/`EnergyBars`/`DialMeter`…），0 悬空 0 孤儿 |
| 09-24 | scripts + skills | compliance | 新增**第 6 条守门脚本** `scripts/check-component-reuse.mjs`（151 行：unexported / unindexed / shadowed 三类检查，已实测能拦）；SKILL 新增 G 节 + 按需 reference `PHYSICAL_RULES.md`、`GAOKAO_STANDARDS.md`；`COMPONENT_REGISTRY.md` 补登记 11 个组件 |
| 09-24 | electromagnetism/em-oscillation | fix | `fada08f`：同相贯通虚线从 `combs` 门禁**解耦**（全频段生效，实测 100~1000 MHz → 2/4/6/10/7/10 条，修复前 f≥500 MHz 为 **0** 条）；`formatFrequency` **删除 THz 课标外单位**（可见光改 `5.45 × 10¹⁴ Hz`）；`formatLCEnergy` 补 30 行边界单测 |
| 09-24 | docs + components | fix | `810c009`：组件登记表 **14 行 props 校正**（其中新增 11 条原为 **11/11 全错**，如 `MagneticPoles` 漏必需 `project3D`/`layer`、`Rails` 漏 `type`）；`Spring` 组件由 `UI/` **归位** `Physics/`（13 处调用点 + 双向 barrel + `02_UI_RULES.md` 四者一致，消除双导入路径）|
| 09-22 | various | fix | 审查报告 P0 批次：**F1–F7 七条物理错误**修复（折射/全反射方向反、玻尔 r∝n²、摩擦 1.12、热力学沙箱重写为等容传热+绝热做功、H-α 谱线改可见红光）|
| 09-22 | data/quantities | docs | R1/R3/R5/R6 归类与文案：共轭法→`extend`、布儒斯特角→`extend`、碰撞"能量损失系数"→"非弹性程度"、删除空气→玻璃不可达全反射分支（**R2 复核后撤回**）|
| 09-22 | data/registries | docs | R4：统一"自转向心力放大倍数"标签，删除重复的"离心力放大倍数" controlMeta，tip 改向心力口径 |
| 09-22 | UI/animation | compliance | A7：`animation.ts` 新增 `scheduleFrame` 帧调度出口收口 rAF；标记白名单 3 项延期至 2026-12-31 |
| 09-22 | docs | docs | 审查报告逐条复核修订（v4：删误报 G2、订正 G4/§五/4B.3/R2/A6/A9/P0-1）并归档至 `docs/reports/` |
| 07-15 | UI/chart | compliance | `<foreignObject>` 规范违规清理完成：11 文件 14 处全部迁移至 HTML 层，TypeScript 0 error + Vitest 701 passed + ESLint 0 warning |
| 07-13 | UI/animation | compliance | SidebarExtra 全量清理完成（61→0），全部收敛为声明式 controlMeta |
| 07-13 | viewport | compliance | Viewport 迁移：COMPLIANT ~95 / LEGACY 动画页面仅剩 3 个，审计缺陷 11/11 清零 |
| 07-11 | electromagnetism/magnetism | refactor | 力方向纯函数扩展 P1：velocitySelector/SimulationView/ChargeInEField 迁移完成，21 单测 |
| 07-10 | electromagnetism/induction | feat | 电磁感应线框模型高考教学优化：五阶段进度看板 + 电势极性判定 + 安培力修正 |
| 07-09 | vibration/wave | feat | 机械波三动画落地：physics/wave.ts + mechanical-wave/wave-diffraction/wave-interference，16 单测 |
| 07-08 | electromagnetism/induction | feat | 新增电磁感应单杆模型页面 + singleRod.ts |
| 07-08 | mechanics/dynamics | feat | 新增传送带模型页面 + conveyor.ts |
| 07-08 | electromagnetism/magnetism | refactor | 磁场圆周几何模型分屏重构 + 矢量纠偏 |
| 07-08 | vibration | refactor | 简谐运动与单摆重构：oscillation.ts + 三模式 + 沙摆 |
| 07-08 | mechanics/gravitation | feat | 天体双星/多星模型交互动画 + celestial.ts |
| 07-08 | electromagnetism/combined-fields | feat | 复合场组合场模型：fieldsCascade.ts + resonanceLock |
| 08-02 | UI/layout | fix | 页面壳布局跳变修复：AnimationPage/ThreePanel/AnimationControls 三文件，零动画组件改动，根除所有动画页"初始偏小→播放跳变"通病 |

> 更早摘要（07-01 ~ 07-06）已归档：[2026-W27.md](./logs/2026-W27.md) / [2026-W26.md](./logs/2026-06.md)
>
> ⚠️ **超出「最近 10-20 条」约定（当前 22 条，未能裁剪）**：`07-08` ~ `07-10` 共 7 条在 `logs/2026-W28.md`、`logs/2026-W27.md` 中**均无对应章节**，删除即丢失唯一记录。
> 处理建议：下一次归档时把这 7 条**先补写为 W28 的正式章节**，再从本表移除；`08-02` 一条同理（应归入 W31）。

## 日志记录规范

1. **主文件瘦身**：仅保留当前周索引 + 最近 10-20 条摘要
2. **按周归档**：详细记录存入 `./logs/YYYY-Wxx.md`，单文件 ≤ 800 行
3. **变更分类**：feature/refactor/fix/test/docs/style/compliance
4. **格式压缩**：每条 ≤ 6 bullet + 1 行涉及文件 + 1 行验证命令
5. **架构决策**：独立归档到 ADR

## 提交流程

参见 [CHECKLIST.md](./CHECKLIST.md)。
