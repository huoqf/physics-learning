# 物理演示项目工程日志

## 当前周期

- 当前日期：2026-W24（06-08）
- 当前里程碑：M1 力学动画 / M2 架构完善
- 本周详细日志：[2026-W24.md](./logs/2026-W24.md)
- 提交流程：[CHECKLIST.md](./CHECKLIST.md)

## 历史归档（按 ISO 周）

- [2026-W22.md](./logs/2026-W22.md)（05-26 ~ 06-01）
- [2026-W23.md](./logs/2026-W23.md)（06-02 ~ 06-04）
- [2026-W24.md](./logs/2026-W24.md)（06-05 ~ 06-08）

完整未压缩历史备份：[2026-06.md](./logs/2026-06.md)

## 最近变更摘要

| 日期 | 模块 | 类型 | 摘要 |
|------|------|------|------|
| 2026-06-08 | docs | docs | 规范体系优化：PROCESS_LOG 按周归档 + 新增 CHECKLIST + 07_CANVAS_SVG_CHART_RULES.md + 精简 project_rules.md |
| 2026-06-08 | anim-satellite | feature | 人造卫星双模式与轨道发射模拟 |
| 2026-06-08 | anim-gravity | feature | 万有引力双模式与 F-r 图表联动 |
| 2026-06-08 | anim-kepler | feature | 开普勒定律三模式与 T²-a³ 图表 |
| 2026-06-07 | anim-centripetal | feature | 向心力与向心加速度 F-a 图表 |
| 2026-06-07 | anim-circular-motion | feature | 匀速圆周运动与简谐投影 |
| 2026-06-07 | anim-oblique-throw | feature | 斜抛运动空气阻力进阶 |
| 2026-06-07 | anim-projectile | feature | 平抛运动双模式与 v-t 图表 |
| 2026-06-07 | anim-weightlessness | fix | 超重失重 N-a 图同步修复 |
| 2026-06-07 | anim-connected-bodies | refactor | 连接体问题物理模型修正 |
| 2026-06-07 | utils | refactor | 死代码清理与预留函数规范化 |
| 2026-06-06 | anim-gravity-basic | feature | 新增重力与重心教学演示 |
| 2026-06-06 | anim-friction | feature | 摩擦力双模式重构美化 |

## 日志记录规范

1. **主文件瘦身原则**：`PROCESS_LOG.md` 仅保留当前周索引与最近 10-20 条摘要
2. **按周归档**：详细记录按 ISO 周存入 `./logs/YYYY-Wxx.md`，单文件不超过 800 行
3. **变更分类**：每条记录需标注类型（feature/refactor/fix/test/docs/style/compliance）
4. **格式压缩**：每条记录 ≤ 6 条 bullet + 1 行涉及文件 + 1 行验证命令
5. **架构决策独立归档**：重要技术决策存入 ADR，避免在日志中过度展开设计细节
6. **重复日期合并**：同一日期下的多条记录合并在同一日期标题下

## 提交流程

参见 [CHECKLIST.md](./CHECKLIST.md)。
