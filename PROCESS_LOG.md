# 开发日志

## 带电粒子在磁场中运动 (BoundaryMagneticField)
- 严格遵守纯函数物理计算规约：在 `src/physics/electromagnetism.ts` 添加了 `calcParticleRadius`、`calcParticlePeriod`、`calcTrajectoryCenter` 等物理引擎函数。
- 严格遵守Canvas坐标规范：采用 `sceneScale` 与 `worldToPixel` 在 `SimulationView.tsx` 中实现了动态缩放映射。
- 实现了三屏职责分离：左侧侧边栏控制，中侧提供动画视口与速度-时间图表联动，右侧自动获取物理量及考点。
- 控制参数调整：将入射角度参数重命名为 `theta` 以符合项目中惯用的命名风格。
