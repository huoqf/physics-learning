# 物理演示项目工程日志

## 当前周期

- 当前日期：2026-W39（09-22）
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

## 最近变更摘要

| 日期 | 模块 | 类型 | 变更 |
|------|------|------|------|
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

## 日志记录规范

1. **主文件瘦身**：仅保留当前周索引 + 最近 10-20 条摘要
2. **按周归档**：详细记录存入 `./logs/YYYY-Wxx.md`，单文件 ≤ 800 行
3. **变更分类**：feature/refactor/fix/test/docs/style/compliance
4. **格式压缩**：每条 ≤ 6 bullet + 1 行涉及文件 + 1 行验证命令
5. **架构决策**：独立归档到 ADR

## 提交流程

参见 [CHECKLIST.md](./CHECKLIST.md)。
