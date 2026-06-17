# 物理演示项目工程日志

## 当前周期

- 当前日期：2026-W24（06-17）
- 当前里程碑：M4 电磁/热/光/原子模块
- 本周详细日志：[2026-W24.md](./logs/2026-W24.md)
- 进行中：[左侧面板统一风格](./logs/2026-W24-sidebar-unify.md)（13 文件，Step 1/4）
- 提交流程：[CHECKLIST.md](./CHECKLIST.md)

## 历史归档（按 ISO 周）

- [2026-W23.md](./logs/2026-W23.md)（06-02 ~ 06-04）
- [2026-W24.md](./logs/2026-W24.md)（06-05 ~ 06-15）
- 完整历史：[2026-06.md](./logs/2026-06.md)

## 最近变更摘要

| 日期 | 模块 | 类型 | 变更 |
|------|------|------|------|
| 06-16 | electromagnetism | feature | 法拉第电磁感应定律三屏联动与双模式重构，支持 O(1) 解析式实时图表绘制 |
| 06-15 | theme | refactor | 删除 tailwindColors 死代码；neutral[0]→neutral.white（17文件64处）；CANVAS_COLORS 8个 neutral 映射改为引用 colors.* |
| 06-15 | theme | fix | 4 个 Physics 通用组件 10 处硬编码颜色违规修复（Block/SportsCar/LightBulb/DialMeter） |
| 06-15 | kinematics | fix | AccelerationCenterExtra：animate-bounce→pulse、Card 组件、selector 订阅、颜色 token |
| 06-15 | stores | refactor | 全库 useAnimationStore selector 迁移：67 文件全量解构→selector/useShallow |
| 06-15 | docs | cleanup | TODO_deferred.md 精简：删除已完成项，新增 §8-11 颜色治理后续项 |
| 06-15 | theme | refactor | 删除 colors.ts 迷你版 PHYSICS_COLORS/SCENE_COLORS；统一 Block/Ball/forceMotion 导入路径 |
| 06-14 | components | refactor | 手指定则提取为通用组件（SkeletalHand/HandRule）；删除 shared/ 目录 |
| 06-14 | tests | fix | 修复 3 个测试文件 28 个失败；lint errors 11→0 |
| 06-14 | electromagnetism | feature | 安培力双模式重构；洛伦兹力双模式重构；速度选择器并入 |

## 日志记录规范

1. **主文件瘦身**：仅保留当前周索引 + 最近 10-20 条摘要
2. **按周归档**：详细记录存入 `./logs/YYYY-Wxx.md`，单文件 ≤ 800 行
3. **变更分类**：feature/refactor/fix/test/docs/style/compliance
4. **格式压缩**：每条 ≤ 6 bullet + 1 行涉及文件 + 1 行验证命令
5. **架构决策**：独立归档到 ADR

## 提交流程

参见 [CHECKLIST.md](./CHECKLIST.md)。
