/**
 * @file src/physics/blockBoard.ts
 * 板块模型双体耦合运动学计算纯函数
 *
 * 物理模型：小滑块以初速度 v₀ 冲上静止长木板，两者因摩擦力耦合运动。
 * 关键判据：共速时刻、滑块是否跌落、共速后整体减速。
 */

import { GRAVITY } from './constants'

// ─── 参数接口 ──────────────────────────────────────────────────────────────

export interface BlockBoardParam {
  /** 滑块质量 (kg) */
  m: number
  /** 木板质量 (kg) */
  M: number
  /** 滑块与板间摩擦因数 */
  mu1: number
  /** 板与地面间摩擦因数 */
  mu2: number
  /** 滑块初速度 (m/s) */
  v0: number
  /** 木板长度 (m) */
  L: number
  /** 重力加速度 (m/s²)，默认 9.8 */
  g?: number
}

// ─── 状态接口 ──────────────────────────────────────────────────────────────

export interface BoardSystemState {
  /** 滑块绝对位移 (m) */
  xBlock: number
  /** 木板绝对位移 (m) */
  xBoard: number
  /** 滑块当前速度 (m/s)，≥0 */
  vBlock: number
  /** 木板当前速度 (m/s)，≥0 */
  vBoard: number
  /** 滑块是否已从木板右端跌落 */
  hasFallen: boolean
  /** 当前运动阶段：'sliding'=相对滑动, 'together'=共速整体, 'fallen'=已跌落, 'stopped'=静止 */
  phase: 'sliding' | 'together' | 'fallen' | 'stopped'
}

// ─── 辅助：运动阶段分界时间点 ─────────────────────────────────────────────

export interface BoardTimeline {
  /** 阶段1结束时间：共速时刻 or 滑块跌落时刻 or 滑块停止时刻 (s) */
  tEndPhase1: number
  /** 共速时刻 (s)，若不会共速则为 Infinity */
  tSync: number
  /** 滑块跌落时刻 (s)，若不会跌落则为 Infinity */
  tFall: number
  /** 滑块独立停止时刻 (s)（木板不动时） */
  tBlockStop: number
  /** 阶段2结束时间：整体停止时刻 (s)，仅共速后有效 */
  tStop: number
  /** 动画最大时间 (s) */
  tMax: number
  /** 木板是否会被推动 */
  boardMoves: boolean
}

/**
 * 计算板块模型的运动阶段分界时间点
 */
export function getBoardTimeline(param: BlockBoardParam): BoardTimeline {
  const { m, M, mu1, mu2, v0, L } = param
  const g = param.g ?? GRAVITY

  const a1 = -mu1 * g // 滑块加速度（向左，减速）
  const F_drive = mu1 * m * g
  const F_ground = mu2 * (M + m) * g
  const boardMoves = F_drive > F_ground
  const a2 = boardMoves ? (F_drive - F_ground) / M : 0

  // 共速时间：v0 + a1*t = a2*t  =>  t = v0 / (a2 - a1)
  const tSync = (a2 - a1 > 1e-9) ? v0 / (a2 - a1) : Infinity

  // 滑块跌落时间：xBlock - xBoard = L
  // (v0*t + 0.5*a1*t²) - (0.5*a2*t²) = L
  // 0.5*(a1 - a2)*t² + v0*t - L = 0
  const A = 0.5 * (a1 - a2)
  const B = v0
  const C = -L
  const disc = B * B - 4 * A * C
  const tFall = (disc >= 0 && A !== 0)
    ? (-B + Math.sqrt(disc)) / (2 * A)  // 取正根
    : Infinity

  // 滑块独立停止时间（木板不动时）
  const tBlockStop = -v0 / a1 // = v0 / (mu1*g)

  // 阶段1实际结束时间：取 min(tSync, tFall, tBlockStop)
  const tEndPhase1 = Math.min(tSync, tFall, tBlockStop)

  // 共速后整体减速时间
  let tStop = Infinity
  if (tSync < tFall && tSync < tBlockStop) {
    const vSync = v0 + a1 * tSync
    const aShared = -mu2 * g
    tStop = aShared < -1e-9 ? -vSync / aShared : Infinity
  }

  const tMax = Math.min(
    tEndPhase1 + (isFinite(tStop) ? tStop : 0),
    tFall < Infinity ? tFall + 3 : Infinity, // 跌落后额外 3s 观察
    tBlockStop < Infinity ? tBlockStop + 0.5 : Infinity,
  )

  return { tEndPhase1, tSync, tFall, tBlockStop, tStop, tMax, boardMoves }
}

// ─── 主计算函数 ────────────────────────────────────────────────────────────

/**
 * 经典高精度分段解析计算函数（驱动帧动画渲染）
 *
 * @param param 板块模型参数
 * @param t 当前时间 (s)
 * @returns 系统状态（位置、速度、阶段）
 */
export function getBoardSystemState(param: BlockBoardParam, t: number): BoardSystemState {
  const { m, M, mu1, mu2, v0, L } = param
  const g = param.g ?? GRAVITY

  const a1 = -mu1 * g
  const F_drive = mu1 * m * g
  const F_ground = mu2 * (M + m) * g
  const boardMoves = F_drive > F_ground
  const a2 = boardMoves ? (F_drive - F_ground) / M : 0

  const { tSync, tFall, tBlockStop } = getBoardTimeline(param)

  let xBlock = 0
  let xBoard = 0
  let vBlock = 0
  let vBoard = 0
  let phase: BoardSystemState['phase'] = 'sliding'
  let hasFallen = false

  if (t <= 0) {
    // 初始状态
    phase = 'sliding'
  } else if (tFall < tSync && tFall < tBlockStop && t >= tFall) {
    // ── 情况A：滑块在共速前跌落 ──
    hasFallen = true
    phase = 'fallen'

    // 阶段1：跌落前的运动
    const xBlkAtFall = v0 * tFall + 0.5 * a1 * tFall * tFall
    const xBrdAtFall = boardMoves ? 0.5 * a2 * tFall * tFall : 0
    const vBlkAtFall = v0 + a1 * tFall
    const vBrdAtFall = boardMoves ? a2 * tFall : 0

    if (t <= tFall) {
      xBlock = v0 * t + 0.5 * a1 * t * t
      xBoard = boardMoves ? 0.5 * a2 * t * t : 0
      vBlock = v0 + a1 * t
      vBoard = boardMoves ? a2 * t : 0
    } else {
      // 跌落后：滑块在地面独立减速
      const dt = t - tFall
      const aBlockGround = -mu1 * g // 地面摩擦（假设地面 μ 与板面相同）

      // 滑块：速度 clamp 到 0，位置 clamp 到停止时最大值
      const tStopBlock = aBlockGround < -1e-9 ? -vBlkAtFall / aBlockGround : Infinity
      if (dt >= tStopBlock) {
        vBlock = 0
        xBlock = xBlkAtFall + vBlkAtFall * tStopBlock + 0.5 * aBlockGround * tStopBlock * tStopBlock
      } else {
        vBlock = vBlkAtFall + aBlockGround * dt
        xBlock = xBlkAtFall + vBlkAtFall * dt + 0.5 * aBlockGround * dt * dt
      }

      // 木板：失去滑块压力，支持力突变为 Mg
      const F_ground_post = mu2 * M * g
      const a2_post = boardMoves ? -F_ground_post / M : 0
      const tStopBoard = a2_post < -1e-9 ? -vBrdAtFall / a2_post : Infinity
      if (dt >= tStopBoard) {
        vBoard = 0
        xBoard = xBrdAtFall + vBrdAtFall * tStopBoard + 0.5 * a2_post * tStopBoard * tStopBoard
      } else {
        vBoard = vBrdAtFall + a2_post * dt
        xBoard = xBrdAtFall + vBrdAtFall * dt + 0.5 * a2_post * dt * dt
      }
    }
  } else if (tSync < tBlockStop && tSync <= tFall && t >= tSync) {
    // ── 情况B：共速后整体减速 ──
    const t1 = tSync
    const vSync = v0 + a1 * t1
    const xBlkSync = v0 * t1 + 0.5 * a1 * t1 * t1
    const xBrdSync = boardMoves ? 0.5 * a2 * t1 * t1 : 0

    if (t <= t1) {
      xBlock = v0 * t + 0.5 * a1 * t * t
      xBoard = boardMoves ? 0.5 * a2 * t * t : 0
      vBlock = v0 + a1 * t
      vBoard = boardMoves ? a2 * t : 0
    } else {
      phase = 'together'
      const dt = t - t1
      const aShared = -mu2 * g

      // 共速后整体减速：速度 clamp 到 0，位置 clamp 到停止时最大值
      const tStopShared = aShared < -1e-9 ? -vSync / aShared : Infinity
      if (dt >= tStopShared) {
        vBlock = 0
        vBoard = 0
        xBlock = xBlkSync + vSync * tStopShared + 0.5 * aShared * tStopShared * tStopShared
        xBoard = xBrdSync + vSync * tStopShared + 0.5 * aShared * tStopShared * tStopShared
        phase = 'stopped'
      } else {
        vBlock = vSync + aShared * dt
        vBoard = vBlock
        xBlock = xBlkSync + vSync * dt + 0.5 * aShared * dt * dt
        xBoard = xBrdSync + vSync * dt + 0.5 * aShared * dt * dt
      }
    }
  } else {
    // ── 情况C：滑块在木板上减速到 0（木板不动或滑块先停） ──
    if (t <= tBlockStop) {
      xBlock = v0 * t + 0.5 * a1 * t * t
      xBoard = boardMoves ? 0.5 * a2 * t * t : 0
      vBlock = v0 + a1 * t
      vBoard = boardMoves ? a2 * t : 0
    } else {
      phase = 'stopped'
      xBlock = v0 * tBlockStop + 0.5 * a1 * tBlockStop * tBlockStop
      xBoard = boardMoves ? 0.5 * a2 * tBlockStop * tBlockStop : 0
      vBlock = 0
      vBoard = boardMoves ? Math.max(0, a2 * tBlockStop) : 0
    }
  }

  // 检查相对位移是否溢出（跌落判定）
  if (!hasFallen && (xBlock - xBoard) >= L) {
    hasFallen = true
    phase = 'fallen'
  }

  return { xBlock, xBoard, vBlock, vBoard, hasFallen, phase }
}

// ─── v-t 图数据生成 ────────────────────────────────────────────────────────

export interface VTPoint {
  t: number
  v: number
}

/**
 * 生成滑块和木板的完整 v-t 理论轨迹（用于图表定标）
 */
export function generateBRTrajectory(
  param: BlockBoardParam,
  tMax: number,
  resolution = 200,
): { blockTrajectory: VTPoint[]; boardTrajectory: VTPoint[] } {
  const blockTrajectory: VTPoint[] = []
  const boardTrajectory: VTPoint[] = []
  const dt = tMax / resolution

  for (let i = 0; i <= resolution; i++) {
    const t = i * dt
    const state = getBoardSystemState(param, t)
    blockTrajectory.push({ t, v: state.vBlock })
    boardTrajectory.push({ t, v: state.vBoard })
  }

  return { blockTrajectory, boardTrajectory }
}
