/**
 * @file src/physics/bulletBlock.ts
 * 子弹打木块模型纯物理计算模块
 *
 * 物理模型：子弹以初速度 v₀ 打入静止木块，受恒定阻力 f 作用。
 * 留存模式：子弹不穿出，最终与木块共速。
 * 穿透模式：子弹穿过木块（厚度 L），穿出后各自匀速。
 *
 * 所有函数均为纯函数，无副作用，无 React/DOM/window 依赖。
 * 单位制：SI（kg, m, m/s, N, s, J）
 */

// ─── 参数接口 ──────────────────────────────────────────────────────────────

export interface BulletBlockParam {
  /** 子弹质量 (kg) */
  m: number
  /** 木块质量 (kg) */
  M: number
  /** 子弹初速度 (m/s)，方向向右为正 */
  v0: number
  /** 恒定阻力 (N)，子弹在木块内受到的阻力 */
  f: number
  /** 木块厚度 (m)，穿透模式下的判定条件 */
  L: number
}

export type BulletBlockMode = 'retain' | 'penetrate'

// ─── 状态接口 ──────────────────────────────────────────────────────────────

export interface BulletBlockState {
  /** 当前时间 (s) */
  t: number
  /** 子弹对地位移 (m) */
  bulletX: number
  /** 木块对地位移 (m) */
  blockX: number
  /** 子弹当前速度 (m/s) */
  bulletV: number
  /** 木块当前速度 (m/s) */
  blockV: number
  /** 子弹加速度 (m/s²) */
  bulletA: number
  /** 木块加速度 (m/s²) */
  blockA: number
  /** 子弹进入木块的相对深度 (m) */
  relativeDepth: number
  /** 当前运动阶段 */
  phase: 'penetrating' | 'synced' | 'exited'
  /** 系统内能 Q = f·Δx (J) */
  Q: number
  /** 子弹动能 (J) */
  EkBullet: number
  /** 木块动能 (J) */
  EkBlock: number
  /** 系统总动能 (J) */
  EkTotal: number
}

// ─── Timeline 接口 ─────────────────────────────────────────────────────────

export interface BulletBlockTimeline {
  /** 共速时刻 (s) */
  tSync: number
  /** 共速速度 (m/s) */
  vSync: number
  /** 共速时相对位移 (m) */
  deltaXSync: number
  /** 穿出时刻 (s)，若不会穿出则为 Infinity */
  tExit: number
  /** 穿出时子弹速度 (m/s) */
  vExitBullet: number
  /** 穿出时木块速度 (m/s) */
  vExitBlock: number
  /** 最大相对位移 (m) */
  deltaXMax: number
  /** 动画建议最大时长 (s) */
  tMax: number
  /** 刚好穿透的临界初速度 (m/s) */
  vCrit: number
}

// ─── 辅助计算 ──────────────────────────────────────────────────────────────

/**
 * 计算刚好能穿透的临界初速度 (m/s)
 */
export function getCriticalVelocity(param: Omit<BulletBlockParam, 'v0'>): number {
  const { m, M, f, L } = param
  if (m <= 0 || M <= 0 || f <= 0 || L <= 0) return 0
  return Math.sqrt((2 * f * L * (m + M)) / (m * M))
}

/**
 * 计算子弹打木块模型的关键时间线节点
 */
export function getBulletBlockTimeline(
  param: BulletBlockParam,
  mode: BulletBlockMode,
): BulletBlockTimeline {
  const { m, M, v0, f, L } = param

  const aBullet = -f / m
  const aBlock = f / M
  const aRel = aBullet - aBlock // 相对加速度（负值，减速）

  // 共速时刻：v0 + aBullet*t = aBlock*t
  const tSync = v0 / (f / m + f / M)
  const vSync = (f / M) * tSync // = v0 * m / (m + M)

  // 共速时相对位移
  const deltaXSync = v0 * tSync + 0.5 * aRel * tSync * tSync

  // 最大相对位移（抛物线顶点）
  const deltaXMax = deltaXSync

  // 穿出时刻：解 v0*t + 0.5*aRel*t^2 = L
  // 0.5*|aRel|*t^2 - v0*t + L = 0（因 aRel<0，写成标准二次形式）
  let tExit = Infinity
  let vExitBullet = 0
  let vExitBlock = 0

  if (mode === 'penetrate' && L > 0 && L < deltaXMax) {
    const A = -0.5 * aRel // > 0
    const B = -v0
    const C = L
    const disc = B * B - 4 * A * C
    if (disc >= 0) {
      // 取较小的正根（第一次达到 L）
      const sqrtDisc = Math.sqrt(disc)
      const t1 = (-B - sqrtDisc) / (2 * A)
      const t2 = (-B + sqrtDisc) / (2 * A)
      tExit = Math.min(t1, t2)
      if (tExit > 0) {
        vExitBullet = v0 + aBullet * tExit
        vExitBlock = aBlock * tExit
      }
    }
  }

  // 物理最大时长：
  // 留存模式下为共速时刻的 3.0 倍（保证匀速观察期为 66.7%，凸显木块的滑行位移）
  // 穿透模式下如果能穿透，则为穿出时刻的 2.5 倍（给穿出后各自匀速留足 60% 观察期）
  // 穿透模式下如果不能穿透，则同留存模式
  const tEnd = mode === 'retain'
    ? tSync * 3.0
    : (isFinite(tExit) ? tExit * 2.5 : tSync * 3.0)

  const vCrit = getCriticalVelocity(param)

  return {
    tSync,
    vSync,
    deltaXSync,
    tExit,
    vExitBullet,
    vExitBlock,
    deltaXMax,
    tMax: tEnd,
    vCrit,
  }
}

/**
 * 计算子弹打木块模型在时刻 t 的状态
 *
 * @param param 物理参数
 * @param t 当前时间 (s)
 * @param mode 运动模式
 * @returns 系统完整状态
 */
export function getBulletBlockState(
  param: BulletBlockParam,
  t: number,
  mode: BulletBlockMode,
): BulletBlockState {
  const { m, M, v0, f } = param

  const aBullet = -f / m
  const aBlock = f / M

  const timeline = getBulletBlockTimeline(param, mode)
  const { tSync, tExit, deltaXMax } = timeline

  let bulletX = 0
  let blockX = 0
  let bulletV = 0
  let blockV = 0
  let phase: BulletBlockState['phase'] = 'penetrating'

  if (t <= 0) {
    bulletV = v0
    blockV = 0
    bulletX = 0
    blockX = 0
  } else if (mode === 'penetrate' && isFinite(tExit) && t >= tExit) {
    // ── 穿透模式：已穿出，各自匀速 ──
    phase = 'exited'
    const dt = t - tExit
    // 穿出瞬间的位置和速度
    const xBulletExit = v0 * tExit + 0.5 * aBullet * tExit * tExit
    const xBlockExit = 0.5 * aBlock * tExit * tExit
    const vBulletExit = v0 + aBullet * tExit
    const vBlockExit = aBlock * tExit

    bulletX = xBulletExit + vBulletExit * dt
    blockX = xBlockExit + vBlockExit * dt
    bulletV = vBulletExit
    blockV = vBlockExit
  } else if (t >= tSync) {
    // ── 共速后一起匀速运动 ──
    phase = 'synced'
    const dt = t - tSync
    const xBulletSync = v0 * tSync + 0.5 * aBullet * tSync * tSync
    const xBlockSync = 0.5 * aBlock * tSync * tSync

    bulletX = xBulletSync + timeline.vSync * dt
    blockX = xBlockSync + timeline.vSync * dt
    bulletV = timeline.vSync
    blockV = timeline.vSync
  } else {
    // ── 穿透阶段 ──
    phase = 'penetrating'
    bulletX = v0 * t + 0.5 * aBullet * t * t
    blockX = 0.5 * aBlock * t * t
    bulletV = v0 + aBullet * t
    blockV = aBlock * t
  }

  const relativeDepth = phase === 'exited'
    ? param.L
    : Math.min(Math.max(bulletX - blockX, 0), deltaXMax)
  const Ek0 = 0.5 * m * v0 * v0
  const EkBullet = 0.5 * m * bulletV * bulletV
  const EkBlock = 0.5 * M * blockV * blockV
  const EkTotal = EkBullet + EkBlock
  const Q = Math.min(f * relativeDepth, Ek0 - EkTotal + 1e-9)

  return {
    t,
    bulletX,
    blockX,
    bulletV,
    blockV,
    bulletA: phase === 'penetrating' ? aBullet : 0,
    blockA: phase === 'penetrating' ? aBlock : 0,
    relativeDepth,
    phase,
    Q,
    EkBullet,
    EkBlock,
    EkTotal,
  }
}

// ─── v-t 图数据生成 ────────────────────────────────────────────────────────

export interface VTPoint {
  t: number
  v: number
}

/**
 * 生成子弹和木块的 v-t 理论轨迹数据
 */
export function generateBulletBlockVT(
  param: BulletBlockParam,
  mode: BulletBlockMode,
  resolution = 200,
): { bulletVT: VTPoint[]; blockVT: VTPoint[] } {
  const timeline = getBulletBlockTimeline(param, mode)
  const dt = timeline.tMax / resolution
  const bulletVT: VTPoint[] = []
  const blockVT: VTPoint[] = []

  for (let i = 0; i <= resolution; i++) {
    const t = i * dt
    const state = getBulletBlockState(param, t, mode)
    bulletVT.push({ t, v: state.bulletV })
    blockVT.push({ t, v: state.blockV })
  }

  return { bulletVT, blockVT }
}

// ─── 能量数据生成 ──────────────────────────────────────────────────────────

export interface EnergyPoint {
  t: number
  /** 系统总动能 (J) */
  ekTotal: number
  /** 内能 Q (J) */
  Q: number
  /** 子弹动能 (J) */
  ekBullet: number
  /** 木块动能 (J) */
  ekBlock: number
}

/**
 * 生成能量随时间变化的数据
 */
export function generateBulletBlockEnergy(
  param: BulletBlockParam,
  mode: BulletBlockMode,
  resolution = 200,
): EnergyPoint[] {
  const timeline = getBulletBlockTimeline(param, mode)
  const dt = timeline.tMax / resolution
  const points: EnergyPoint[] = []

  for (let i = 0; i <= resolution; i++) {
    const t = i * dt
    const state = getBulletBlockState(param, t, mode)
    points.push({
      t,
      ekTotal: state.EkTotal,
      Q: state.Q,
      ekBullet: state.EkBullet,
      ekBlock: state.EkBlock
    })
  }

  return points
}
