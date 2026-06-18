# 延后处理待办事项

> 仅保留未完成项。上次精简：2026-06-18。

---

## 1. 动画组件体积过大 — 按规范拆分

**优先级**：P0（ARCH §12.1 单文件超 500 行）

| 文件 | 当前行数 | 备注 |
|------|---------|------|
| `FreeFallAnimation.tsx` | 709 | 已提取 2 个 hook，仍需按 JSX 块拆分 |
| `UniformAccelerationCenterExtra.tsx` | 669 | 已有 5 个子组件，可直接搬迁 |
| `VerticalThrowAnimation.tsx` | 623 | 已提取 2 个 hook，建议先拆图表区 |
| `AccelerationCenterExtra.tsx` | 646 | 需修复规范违反（见 §3） |

原则：按渲染子组件拆分，不改 props 接口；ARCH §10 禁止同目录同名 `.ts`/`.tsx`。

---

## 2. 提取重复 filter 工具

**优先级**：P2（DRY）

`MODULE_LABELS`、`moduleOf`、`toggle`、`chip`、`formatDate` 在 WrongPage、PracticePage、ScoreReport、PracticeSession 中重复定义。提取到 `src/utils/moduleHelpers.ts`。

---

## 3. 渐变/材质/命名统一

**优先级**：P2-P3（开发体验 + 架构清晰度）

链式依赖，按顺序执行：

1. **渐变数组对象化**（P2）：`SCENE_COLORS` 中 `string[]` 渐变改为语义化对象（`grad.mid`）。影响 ~50 处调用。
2. **SCENE_COLORS 拆分**（P3）：464 行拆为 `materialColors.ts`、`sceneEquipment.ts`、`glowEffects.ts`。
3. **COMMON_MATERIALS / SPHERE_COLORS 合并**（P3）：合并为 `MATERIAL_PRESETS`。
4. **命名规范统一**（P3）：明暗层命名 `{Part}{Layer}` 小写化。

---

## 4. 响应式缩放 — 剩余违规

**优先级**：P1（第 0+1+2 步已完成 ✅）

剩余未迁移项：

- **A 类 SVG fontSize 裸值**（68 处，9 文件）：KeplerAnimation(22), SatelliteAnimation(10), FaradayLaw(9), CircularMotion(6), Centripetal(6), PowerTransmission(7), Transformer(3), CuttingEMF(3), ACGeneration(2)
- **C 类 Tailwind text-[Npx]**（16 处，3 文件）：CircuitAnalysis(4), OhmLawCenterExtra(4), ClosedCircuitCenterExtra(8)
- **D 类 useCanvasSize → CANVAS_PRESETS**（27 处，25 文件）
- **第 3 步可选**：drop-shadow 封装、SVG marker token 化、Tailwind arbitrary values 清理

---

## 5. 未使用组件清理

**优先级**：P2（2026-06-18 审计）
**已删除**：PageShell、Magnet、VTChart、PhysicsGraph、DataTable、UI/VectorArrow（旧版）

| 保留 | 说明 |
|------|------|
| `components/UI/ProgressBadge.tsx` | 掌握/未掌握图标，代码干净，暂无消费者但有潜在用途 |

删除后同步清理了 barrel 导出（Layout/index.ts、Physics/index.ts、UI/index.ts）。
