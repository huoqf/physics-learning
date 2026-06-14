# 开发日志

## 当前周期

- 当前日期：2026-W24（06-15）
- 当前里程碑：M4 电磁/热/光/原子模块
- 本周详细日志：[2026-W24.md](./docs/agent-rules/process/logs/2026-W24.md)
- 提交流程：[CHECKLIST.md](./docs/agent-rules/process/CHECKLIST.md)

## 历史归档（按 ISO 周）

- [2026-W22.md](./docs/agent-rules/process/logs/2026-W22.md)（05-26 ~ 06-01）
- [2026-W23.md](./docs/agent-rules/process/logs/2026-W23.md)（06-02 ~ 06-04）
- [2026-W24.md](./docs/agent-rules/process/logs/2026-W24.md)（06-05 ~ 06-14）

## 最近变更摘要

| 日期 | 模块 | 类型 | 说明 |
|------|------|------|------|
| 2026-06-15 | theme | refactor | 删除 colors.ts 中无消费者的迷你版 PHYSICS_COLORS 和 SCENE_COLORS（35 行），提交 `7dcfa98` |
| 2026-06-15 | theme | refactor | 统一 Block.tsx / Ball.tsx / forceMotion.ts 颜色 token 导入路径为 barrel 入口，提交 `40bc5af` |
| 2026-06-14 | anim-ampere-force | feature | 重构安培力页面为双模式物理仿真（基础+进阶），含左手定则手势与 F-I 图表 |
| 2026-06-14 | anim-lorentz-force | feature | 重构洛伦兹力页面为双模式模型（含速度选择器进阶），提取通用组件 |
| 2026-06-14 | components/Physics | refactor | 提取手指定则为通用组件（SkeletalHand + HandRule） |
| 2026-06-14 | tests | test | 修复 3 个测试文件 28 个失败，全部 242/242 通过 |
| 2026-06-14 | lint | fix | 修复 11 个 lint errors→0 |
| 2026-06-13 | anim-free-fall | refactor | P1/P2 重构：常量提取至 freeFallConfig.ts，布局逻辑迁移 |
| 2026-06-13 | architecture | refactor | 跑车模型组件提取（SportsCar.tsx）+ Block.tsx 扩展 metalCart 材质 + Ball.tsx 提取 |

## 日志记录规范

1. **主文件瘦身原则**：`PROCESS_LOG.md` 仅保留当前周索引与最近 10-20 条摘要
2. **按周归档**：详细记录按 ISO 周存入 `./docs/agent-rules/process/logs/YYYY-Wxx.md`
3. **变更分类**：每条记录需标注类型（feature/refactor/fix/test/docs/style/compliance）
4. **格式压缩**：每条记录 ≤ 6 条 bullet + 1 行涉及文件 + 1 行验证命令
5. **架构决策独立归档**：重要技术决策存入 ADR，避免在日志中过度展开设计细节
6. **重复日期合并**：同一日期下的多条记录合并在同一日期标题下

## 提交流程

参见 [CHECKLIST.md](./docs/agent-rules/process/CHECKLIST.md)。
