# 物理演示项目工程日志

## 当前周期

- 当前日期：2026-W28（07-07）
- 当前里程碑：M4 电磁/热/光/原子模块
- 本周详细日志：[2026-W28.md](./logs/2026-W28.md)
- 提交流程：[CHECKLIST.md](./CHECKLIST.md)

## 历史归档（按 ISO 周）

- [2026-W28.md](./logs/2026-W28.md)（07-07 ~ ）
- [2026-W27.md](./logs/2026-W27.md)（07-01 ~ 07-06）
- [2026-W26.md](./logs/2026-W26.md)（06-22 ~ 06-30）
- 完整历史：[2026-06.md](./logs/2026-06.md)

## 最近变更摘要

| 日期 | 模块 | 类型 | 变更 |
|------|------|------|------|
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
| 07-06 | modern/bohr-theory | refactor | 原子结构与玻尔理论教学规范化重构 |
| 07-05 | electromagnetism/electrostatics | refactor | ChargeInEField 高考优化 + CoulombLaw 拆分（708→28+290+288） |
| 07-03 | various | refactor | 超长文件拆分：MomentumConservation(743→329)、Kepler(673→460)、PowerTransmission(696→256) |
| 07-01 | UI/animation | refactor | SidebarExtra→controlMeta 第一阶段：32 个迁移，LeftPanel 容器统一，ParamMeta 扩展 |

## 日志记录规范

1. **主文件瘦身**：仅保留当前周索引 + 最近 10-20 条摘要
2. **按周归档**：详细记录存入 `./logs/YYYY-Wxx.md`，单文件 ≤ 800 行
3. **变更分类**：feature/refactor/fix/test/docs/style/compliance
4. **格式压缩**：每条 ≤ 6 bullet + 1 行涉及文件 + 1 行验证命令
5. **架构决策**：独立归档到 ADR

## 提交流程

参见 [CHECKLIST.md](./CHECKLIST.md)。
