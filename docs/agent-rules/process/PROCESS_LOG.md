# 物理演示项目工程日志

## 当前周期

- 当前日期：2026-W25（06-18）
- 当前里程碑：M4 电磁/热/光/原子模块
- 本周详细日志：[2026-W25.md](./logs/2026-W25.md)
- 提交流程：[CHECKLIST.md](./CHECKLIST.md)

## 历史归档（按 ISO 周）

- [2026-W23.md](./logs/2026-W23.md)（06-02 ~ 06-04）
- [2026-W24.md](./logs/2026-W24.md)（06-05 ~ 06-15）
- [2026-W24-sidebar-unify.md](./logs/2026-W24-sidebar-unify.md)（侧屏统一风格）
- 完整历史：[2026-06.md](./logs/2026-06.md)

## 最近变更摘要

| 日期 | 模块 | 类型 | 变更 |
|------|------|------|------|
| 06-22 | mechanics/kinematics | refactor | VerticalThrow 图表区拆分：新增 VerticalThrowCharts.tsx 承接右侧 v-t/y-t 双图、ChartSecant/ChartTangent 插件、目标高度/面积/双轨对照标记和图表交互热区；VerticalThrowAnimation.tsx 741→415 行，脱离 P0 超长文件；test/build 通过，lint 剩余非本次 5 个 error |
| 06-22 | components/Chart + mechanics/kinematics | refactor | VelocityTimeChart / DisplacementTimeChart 增加 tDomain 滑动窗口与 underlay/children 插件层；VelocityVTChart 迁入 VelocityTimeChart，保留 Δt 面积、平均速度线、割线/切线加速度语义；VelocityXTChart 迁入 DisplacementTimeChart，保留 x-t 割线三角形、切线与 Δt→0 提示；test/build 通过，lint 剩余非本次 5 个 error |
| 06-21 | components/Chart + mechanics/kinematics | feature | 创建 ChartSecant 插件（割线+斜率三角形，支持 ChartContext 与 legacy SVG 显式坐标）；ChartTangent 扩展 color/stroke/opacity/dash/showPoint；VelocityVT 接入 v-t 割线/切线读平均/瞬时加速度；VelocityXT 接入 x-t 割线三角形与切线；VerticalThrow 启动图表插件化（v-t 最高点切线、y-t 割线/切线）；修复 ChartArea/MiniChart 条件 Hook 顺序问题；test/build 通过，lint 剩余非本次 5 个 error |
| 06-19 | thermodynamics | feature | 热力学第二定律动画模块：secondLaw.ts（粒子碰撞热传导/气体扩散/Ω微观态数计算/温度→颜色映射）；SecondLawAnimation.tsx（Canvas粒子+SVG叠加+逆向警告框）；SecondLawSidebar.tsx（场景切换+正向/逆向按钮）；SecondLawCenterExtra.tsx（MiniChart无序度时序图）；useAnimationStore新增direction字段；types.ts AnimationActions新增setDirection；useAnimationLifecycle支持方向乘数；tsc零错误，build成功 |
| 06-19 | hooks/animation | fix | useAnimationLifecycle rAF首帧零delta触发<=0守卫导致动画无法播放：首帧deltaTime=0使time保持0，新加<=0守卫立即禁止播放。修复：direction===-1条件限定，仅逆向时触发。useAnimationLifecycle.ts 1行改动 |
| 06-18 | physics | feature | 光学纯函数库 optics.ts：calculateRefraction（斯涅尔定律）、calculateCriticalAngle（全反射临界角）、calculateThinLens（薄透镜成像）；注册 index.ts，tsc 零错误 |
| 06-18 | physics | feature | 热学纯函数库 thermodynamics.ts：calculateIdealGas（理想气体三大定律）、calculateInternalEnergy（热力学第一定律）、calculateThermoProcess（等温/等容/等压过程功热量计算）；注册 index.ts，tsc 零错误 |
| 06-17 | data/quantities | fix | electromagnetism.ts 颜色硬编码修复：41 处十六进制颜色值 → PHYSICS_COLORS token（electricCurrent/magnetSouth/magneticField/velocity/acceleration/lorentzForce 等）；剩余 2 处（#EAB308/#64748B）无直接 token 映射，待后续评估 |
| 06-17 | electromagnetism | fix | 变压器规范合规修复：回退 colors.ts 新增 token（primaryCircuit/secondaryCircuit/magneticFlux → electricCurrent/magnetSouth/magneticField）；InfoBar 硬编码字号 → font(FONT.xxx)；w-52 → px(208)；CSS 动画 -24px → CSS 变量 + px()；fluxStrokeW 魔法数字 → 整体 px()；透明度魔法数字 → HIGHLIGHT_ALPHA 常量 |
| 06-17 | electromagnetism | feature | 变压器原理三屏联动重构：新增 TransformerSidebarExtra（基础/进阶模式切换）、4 只 DialMeter 电表 + Rheostat 负载、原副边红蓝配色、InfoBar 功率配平 + 动态因果链多米诺高亮；quantities builder 补充公式/高考要点/易错警示；全部布局值 px() 缩放 |
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
