/**
 * src/physics/alphaScatter.ts
 * α 粒子散射（卢瑟福库仑散射）纯物理计算 —— 无 React / DOM / window 依赖。
 *
 * ── 物理模型 ──────────────────────────────────────────────────────────────
 * α 粒子（电荷 +2e）自左向右以初速度 v₀ 射向静止的金原子核（电荷 +79e）。
 * 二者均带正电，相互作用的库仑斥力 F = k_e·(2e)(79e)/r² 为平方反比有心力，
 * 粒子轨迹为双曲线（金核位于焦点），散射角满足卢瑟福公式：
 *
 *     tan(θ/2) = a / b,      a = k/(m v₀²),  b 为碰撞参数
 *
 * 其中 a 为“库仑作用尺度”：当 b = a 时 θ 恰为 90°（双曲线退化为直角渐近线）。
 *
 * ── 单位约定（场景设计坐标）───────────────────────────────────────────────
 * 本模块位于设计坐标系（px / 帧），只保证**轨迹几何与相对关系**物理正确；
 * 真实的 fm / MeV 量级数值由 data/quantities 层负责展示（跨尺度双层映射）。
 *
 * ── 为什么由 a 反解 k，而不是直接给库仑强度常数 ─────────────────────────
 * 若直接硬编码力的系数，其量级与画布尺度、粒子速度强耦合，极易失配：
 * 系数过大会使**所有**碰撞参数都被弹回（100% 反弹），无法复现
 * “绝大多数直穿、少数偏转、极少数反弹”的实验事实。因此这里改为
 * 先声明“作用尺度 a（px）”，再由 a = k/v₀² 反解出 k，保证二者永远自洽。
 *
 * @agent-rule 铁律 2：物理层纯函数、可序列化、有 JSDoc + 单位注释
 */

/** α 粒子初速度（设计坐标 px/帧） */
export const ALPHA_SPEED_PX_PER_FRAME = 4.5

/**
 * 库仑作用尺度 a = k/(m v₀²)，单位 px。
 *
 * 当碰撞参数 b = a 时散射角恰为 90°。
 * 取值 4px 的依据：设计画布高 650px，左右对称入射的均匀束流对应
 * b ∈ [0, 325]px，a = 4px 使该区间完整覆盖 180° → 约 1.8° 的散射区间，
 * 统计结果约为 直穿 72% / 偏转 27% / 反弹 1%，与卢瑟福实验的定性规律一致。
 */
export const SCATTER_SCALE_PX = 4

/** 有效库仑系数 k = a·v₀²（px³/帧²）；由 a 反解，保证 a ≡ k/v₀² 自洽 */
export const COULOMB_K = SCATTER_SCALE_PX * ALPHA_SPEED_PX_PER_FRAME ** 2

/**
 * 软化半径平方（px²）。
 * 仅用于规避 r → 0 时的数值奇点；物理上被散射粒子的最近接近距离
 * r_min ≥ a = 4px，故软化区（0.6px）不会被真实轨迹触及。
 */
export const COULOMB_SOFTENING_R2 = 0.36

/** 每个渲染帧内的积分子步数：使近核区位置步长 ≈ v₀/16 ≈ 0.28px << a */
export const INTEGRATION_SUBSTEPS = 16

/** 判定为“几乎直穿”的散射角上限（度） */
export const STRAIGHT_ANGLE_MAX_DEG = 5

/** 判定为“反弹（大角度散射）”的散射角下限（度） */
export const REBOUND_ANGLE_MIN_DEG = 90

/** 散射行为分类 */
export type ScatterClass = 'straight' | 'deflected' | 'rebound'

/** 粒子运动状态（设计坐标，可序列化） */
export interface ScatterParticleState {
  /** 位置 x（px） */
  x: number
  /** 位置 y（px） */
  y: number
  /** 速度 vx（px/帧） */
  vx: number
  /** 速度 vy（px/帧） */
  vy: number
}

/**
 * 由散射角判定散射行为分类。
 * 中屏统计看板与右屏物理量看板共用此判定，避免两处阈值漂移。
 *
 * @param angleDeg 散射角（度）
 */
export function classifyScatterAngle(angleDeg: number): ScatterClass {
  if (angleDeg < STRAIGHT_ANGLE_MAX_DEG) return 'straight'
  if (angleDeg < REBOUND_ANGLE_MIN_DEG) return 'deflected'
  return 'rebound'
}

/**
 * 卢瑟福散射角解析解。
 *
 *     θ = 2·arctan(a / b)
 *
 * b → 0（正对对心）时 θ → 180°（原路返回）；b → ∞ 时 θ → 0°（几乎直穿）。
 *
 * @param b 碰撞参数（px）
 * @param scalePx 库仑作用尺度 a（px），默认 {@link SCATTER_SCALE_PX}
 * @returns 散射角（度），范围 (0, 180]
 */
export function scatterAngleDeg(b: number, scalePx: number = SCATTER_SCALE_PX): number {
  if (b <= 0) return 180
  return (2 * Math.atan(scalePx / b) * 180) / Math.PI
}

/**
 * 最近接近距离（px）：r_min = a + √(a² + b²)。
 * 对心入射（b = 0）时 r_min = 2a，对应高中模型“初动能全部转化为库仑电势能”的位置。
 *
 * @param b 碰撞参数（px）
 * @param scalePx 库仑作用尺度 a（px）
 */
export function closestApproachPx(b: number, scalePx: number = SCATTER_SCALE_PX): number {
  return scalePx + Math.hypot(scalePx, b)
}

/**
 * 由末速度反解偏转角：初速度沿 +x，故 θ = arccos(vₓ / |v|)。
 *
 * @param vx 末速度 x 分量（px/帧）
 * @param vy 末速度 y 分量（px/帧）
 * @returns 相对初速度方向的偏转角（度），范围 [0, 180]
 */
export function velocityDeflectionDeg(vx: number, vy: number): number {
  const speed = Math.hypot(vx, vy)
  if (speed <= 0) return 0
  const cosTheta = Math.max(-1, Math.min(1, vx / speed))
  return (Math.acos(cosTheta) * 180) / Math.PI
}

/**
 * 单帧积分（内部执行 {@link INTEGRATION_SUBSTEPS} 个子步）。
 *
 * 采用半隐式欧拉：先更新速度再更新位置，配合子步细分，
 * 使数值轨迹与卢瑟福解析双曲线的散射角误差 < 1°。
 *
 * 库仑斥力方向沿“核 → 粒子”方向，即 (dx, dy) 为正，故加速度取正号。
 *
 * @param state 当前粒子状态（设计坐标）
 * @param nucleusX 金原子核 x（px）
 * @param nucleusY 金原子核 y（px）
 * @returns 更新后的粒子状态（纯函数，不修改入参）
 */
export function integrateAlphaScatterFrame(
  state: ScatterParticleState,
  nucleusX: number,
  nucleusY: number,
): ScatterParticleState {
  const dt = 1 / INTEGRATION_SUBSTEPS
  let { x, y, vx, vy } = state

  for (let step = 0; step < INTEGRATION_SUBSTEPS; step++) {
    const dx = x - nucleusX
    const dy = y - nucleusY
    const r2 = dx * dx + dy * dy
    const r = Math.sqrt(r2)
    const accel = COULOMB_K / Math.max(r2, COULOMB_SOFTENING_R2)
    vx += accel * (dx / r) * dt
    vy += accel * (dy / r) * dt
    x += vx * dt
    y += vy * dt
  }

  return { x, y, vx, vy }
}
