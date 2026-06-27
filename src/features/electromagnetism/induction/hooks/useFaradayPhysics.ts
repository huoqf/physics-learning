/**
 * useFaradayPhysics.ts — 法拉第电磁感应定律物理计算 hook
 *
 * 从 FaradayLaw.tsx 拆分：所有物理计算、图表数据、电路路径、电子位置。
 */
import { useMemo, useCallback } from 'react'
import { computeFaradayMagnetFlux, FaradayChartPoint } from '@/physics/electromagnetism'

// ─── 物理与几何常量 ─────────────────────────────────────────────────────────
export const MAGNET_MIN_X = 60
export const COIL_X = 220
export const COIL_RX = 35
export const COIL_RY = 60
export const MAGNET_LEN = 100
export const MAGNET_H = 30
export const MAGNET_MAX_X = 360
export const RANGE_X = MAGNET_MAX_X - MAGNET_MIN_X

export const COIL_AREA_M2 = 0.02
export const CHART_DURATION = 10
export const CHART_STEPS = 120

// ─── 辅助计算函数 ──────────────────────────────────────────────────────────

/**
 * 获取磁铁在给定时间 t 时的物理状态。
 */
export function getMagnetStateAt(t: number, N: number, B: number, v: number) {
  if (v <= 0) {
    const x = MAGNET_MIN_X
    const phi = computeFaradayMagnetFlux(x, B)
    return { x, phi, emf: 0, B }
  }

  const cycle = 2 * RANGE_X
  const dist = (v * t) % cycle
  const goingForward = dist < RANGE_X
  const x = goingForward ? MAGNET_MIN_X + dist : MAGNET_MAX_X - (dist - RANGE_X)

  const phi = computeFaradayMagnetFlux(x, B)

  const dt = 0.001
  const nextDist = (v * (t + dt)) % cycle
  const nextGoingForward = nextDist < RANGE_X
  const nextX = nextGoingForward ? MAGNET_MIN_X + nextDist : MAGNET_MAX_X - (nextDist - RANGE_X)
  const nextPhi = computeFaradayMagnetFlux(nextX, B)
  const dPhi_dt = (nextPhi - phi) / dt
  const emf = -N * dPhi_dt

  return { x, phi, emf, B }
}

/**
 * 获取匀变磁场模式下给定时间 t 的物理状态。
 */
export function getUniformStateAt(t: number, N: number, dBdt: number, B0: number) {
  const B = B0 + dBdt * t
  const phi = B * COIL_AREA_M2
  const emf = -N * dBdt * COIL_AREA_M2
  return { B, phi, emf }
}

// ─── 导出类型 ──────────────────────────────────────────────────────────────
export type { FaradayChartPoint }

// ─── Hook ──────────────────────────────────────────────────────────────────

export interface FaradayPhysicsParams {
  mode: number
  N: number
  B_magnet: number
  magnetV: number
  dBdt: number
  B0: number
  time: number
}

export interface FaradayLayoutParams {
  sandboxW: number
  H: number
  dashLeft: number
  dashRight: number
}

export interface FaradayPhysicsResult {
  tNow: number
  chartPoints: FaradayChartPoint[]
  currentState: { x: number; phi: number; emf: number; B: number }

  // 图表映射
  chartPadTop: number
  chartH: number
  yPhiMid: number
  yEmfMid: number
  chartHalfH: number
  phiMinVal: number
  phiMaxVal: number
  maxEmfVal: number
  emfIsZero: boolean
  toPhiY: (phi: number) => number
  yPhiZero: number
  toChartX: (t: number) => number
  toEmfY: (emf: number) => number
  phiPathD: string
  emfPathD: string
  indicatorX: number

  // 电路结构
  circuitRightX: number
  circuitLeftX: number
  bulbY: number
  meterY: number
  solenoidW: number
  solenoidH: number
  solenoidLeftX: number
  solenoidRightX: number
  solenoidWireY: number
  bulbScale: number
  bulbPinY: number
  meterScale: number
  meterTopY: number
  meterPinY: number
  meterPinLeftX: number
  meterPinRightX: number
  bottomWireY: number
  wirePointsA: string
  wirePointsB: string
  wirePointsC: string
  circuitPath: { x: number; y: number }[]
  totalPathLen: number
  getElectronicPos: (fraction: number) => { x: number; y: number }
  electronFlowSpeed: number
  electronParticles: { x: number; y: number }[]

  // 进阶模式
  fieldDots: { x: number; y: number }[]
  currentB: number
  B_is_in: boolean
  magneticFieldOpacity: number
  glowOpacity: number
  glowWidth: number
  inducedCurrentDir: number
}

export function useFaradayPhysics(
  p: FaradayPhysicsParams,
  layout: FaradayLayoutParams,
): FaradayPhysicsResult {
  const { mode, N, B_magnet, magnetV, dBdt, B0, time } = p
  const { sandboxW, H, dashLeft, dashRight } = layout
  const dashW = dashRight - dashLeft

  const tNow = time % CHART_DURATION

  // ── 图表背景曲线数据 ──────────────────────────────────────────────────
  const chartPoints = useMemo<FaradayChartPoint[]>(() => {
    const pts: FaradayChartPoint[] = []
    for (let i = 0; i <= CHART_STEPS; i++) {
      const t = (i / CHART_STEPS) * CHART_DURATION
      if (mode === 0) {
        const state = getMagnetStateAt(t, N, B_magnet, magnetV)
        pts.push({ t, phi: state.phi, emf: state.emf })
      } else {
        const state = getUniformStateAt(t, N, dBdt, B0)
        pts.push({ t, phi: state.phi, emf: state.emf })
      }
    }
    return pts
  }, [mode, N, B_magnet, magnetV, dBdt, B0])

  const currentState = useMemo(() => {
    if (mode === 0) {
      return getMagnetStateAt(tNow, N, B_magnet, magnetV)
    } else {
      const uState = getUniformStateAt(tNow, N, dBdt, B0)
      return { x: 0, phi: uState.phi, emf: uState.emf, B: uState.B }
    }
  }, [mode, tNow, N, B_magnet, magnetV, dBdt, B0])

  // ── 图表映射比例 ────────────────────────────────────────────────────
  const chartPadTop = 26
  const chartH = (H - chartPadTop * 3) / 2
  const yPhiMid = chartPadTop + chartH / 2
  const yEmfMid = chartPadTop * 2 + chartH + chartH / 2
  const chartHalfH = chartH * 0.42

  const phiMinVal = useMemo(() => {
    if (mode === 1) {
      const minPhi = Math.min(...chartPoints.map(p => p.phi))
      return Math.min(0, minPhi)
    }
    return Math.min(...chartPoints.map(p => p.phi))
  }, [mode, chartPoints])

  const phiMaxVal = useMemo(() => {
    if (mode === 1) {
      const maxPhi = Math.max(...chartPoints.map(p => p.phi))
      const hi = Math.max(0, maxPhi)
      const lo = Math.min(0, Math.min(...chartPoints.map(p => p.phi)))
      return hi - lo > 1e-5 ? hi : 0.05
    }
    const absMax = Math.max(...chartPoints.map(p => Math.abs(p.phi)))
    return absMax > 1e-5 ? absMax : 0.05
  }, [mode, chartPoints])

  const toPhiY = (phi: number): number => {
    if (mode === 1) {
      const range = phiMaxVal - phiMinVal
      const safeRange = range > 1e-9 ? range : 1
      return (yPhiMid + chartHalfH) - ((phi - phiMinVal) / safeRange) * (chartHalfH * 2)
    }
    return yPhiMid - (phi / phiMaxVal) * chartHalfH
  }

  const yPhiZero = toPhiY(0)

  const maxEmfVal = useMemo(() => {
    const absMax = Math.max(...chartPoints.map(p => Math.abs(p.emf)))
    return absMax > 1e-5 ? absMax : 1.0
  }, [chartPoints])
  const emfIsZero = maxEmfVal < 1e-5

  const toChartX = (t: number): number => dashLeft + (t / CHART_DURATION) * dashW
  const toEmfY   = (emf: number): number => yEmfMid - (emf / maxEmfVal) * chartHalfH

  const phiPathD = useMemo(() => {
    if (chartPoints.length < 2) return ''
    const range = phiMaxVal - phiMinVal
    const safeRange = range > 1e-9 ? range : 1
    const bottom = yPhiMid + chartHalfH
    const span   = chartHalfH * 2
    return chartPoints.map((pt, i) => {
      const cx = (dashLeft + (pt.t / CHART_DURATION) * dashW).toFixed(1)
      const cy = mode === 1
        ? (bottom - ((pt.phi - phiMinVal) / safeRange) * span).toFixed(1)
        : (yPhiMid - (pt.phi / phiMaxVal) * chartHalfH).toFixed(1)
      return `${i === 0 ? 'M' : 'L'} ${cx} ${cy}`
    }).join(' ')
  }, [chartPoints, mode, phiMinVal, phiMaxVal, dashLeft, dashW, yPhiMid, chartHalfH])

  const emfPathD = useMemo(() => {
    if (chartPoints.length < 2) return ''
    return chartPoints.map((pt, i) => {
      const cx = (dashLeft + (pt.t / CHART_DURATION) * dashW).toFixed(1)
      const cy = (yEmfMid - (pt.emf / maxEmfVal) * chartHalfH).toFixed(1)
      return `${i === 0 ? 'M' : 'L'} ${cx} ${cy}`
    }).join(' ')
  }, [chartPoints, maxEmfVal, dashLeft, dashW, yEmfMid, chartHalfH])

  const indicatorX = toChartX(tNow)

  // ── 电路结构 ────────────────────────────────────────────────────────
  const COIL_Y = H / 2 - 50
  const circuitRightX = Math.min(COIL_X + COIL_RX + 50, sandboxW - 24)
  const circuitLeftX = Math.max(COIL_X - COIL_RX - 50, 24)
  const bulbY = COIL_Y + COIL_RY + 35
  const meterY = COIL_Y + COIL_RY + 35

  const solenoidW = 60
  const solenoidH = COIL_RY * 2
  const solenoidLeftX = COIL_X - solenoidW / 2
  const solenoidRightX = COIL_X + solenoidW / 2
  const solenoidWireY = COIL_Y + 120

  const bulbScale = 0.85
  const bulbPinY = bulbY + 18 * bulbScale

  const meterScale = 50 / 120
  const meterTopY = meterY - 22
  const meterPinY = meterTopY + 100 * meterScale
  const meterPinLeftX = circuitLeftX - 30 * meterScale
  const meterPinRightX = circuitLeftX + 30 * meterScale

  const bottomWireY = Math.max(meterPinY, bulbPinY) + 10

  const wirePointsA = `${solenoidLeftX},${solenoidWireY} ${meterPinLeftX},${solenoidWireY} ${meterPinLeftX},${meterPinY}`
  const wirePointsB = `${meterPinRightX},${meterPinY} ${meterPinRightX},${bottomWireY} ${circuitRightX},${bottomWireY} ${circuitRightX},${bulbPinY}`
  const wirePointsC = `${circuitRightX},${bulbPinY} ${circuitRightX},${solenoidWireY} ${solenoidRightX},${solenoidWireY}`

  const circuitPath = useMemo(() => [
    { x: solenoidLeftX, y: solenoidWireY },
    { x: meterPinLeftX, y: solenoidWireY },
    { x: meterPinLeftX, y: meterPinY },
    { x: meterPinRightX, y: meterPinY },
    { x: meterPinRightX, y: bottomWireY },
    { x: circuitRightX, y: bottomWireY },
    { x: circuitRightX, y: bulbPinY },
    { x: circuitRightX, y: solenoidWireY },
    { x: solenoidRightX, y: solenoidWireY },
  ], [solenoidLeftX, solenoidWireY, meterPinLeftX, meterPinY, meterPinRightX, bottomWireY, circuitRightX, bulbPinY, solenoidRightX])

  const totalPathLen = useMemo(() => {
    let len = 0
    for (let i = 1; i < circuitPath.length; i++) {
      const dx = circuitPath[i].x - circuitPath[i - 1].x
      const dy = circuitPath[i].y - circuitPath[i - 1].y
      len += Math.hypot(dx, dy)
    }
    return len
  }, [circuitPath])

  const getElectronicPos = useCallback((fraction: number) => {
    const target = ((fraction % 1) + 1) % 1 * totalPathLen
    let acc = 0
    for (let i = 1; i < circuitPath.length; i++) {
      const dx = circuitPath[i].x - circuitPath[i - 1].x
      const dy = circuitPath[i].y - circuitPath[i - 1].y
      const segLen = Math.hypot(dx, dy)
      if (acc + segLen >= target) {
        const ratio = (target - acc) / segLen
        return {
          x: circuitPath[i - 1].x + dx * ratio,
          y: circuitPath[i - 1].y + dy * ratio,
        }
      }
      acc += segLen
    }
    return circuitPath[0]
  }, [circuitPath, totalPathLen])

  const electronFlowSpeed = currentState.emf * 25
  const electronCount = 10
  const electronParticles = useMemo(() => {
    if (mode !== 0 || Math.abs(currentState.emf) < 0.005) return []
    return Array.from({ length: electronCount }, (_, i) => {
      const drift = (i / electronCount + time * electronFlowSpeed / 100) % 1
      return getElectronicPos(drift)
    })
  }, [mode, currentState.emf, time, electronFlowSpeed, getElectronicPos])

  // ── 进阶模式 ────────────────────────────────────────────────────────
  const fieldDots = useMemo(() => {
    const rows = 5
    const cols = 6
    const grid: { x: number; y: number }[] = []
    const xSpacing = sandboxW / (cols + 1)
    const ySpacing = H / (rows + 1)
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        grid.push({ x: c * xSpacing, y: r * ySpacing })
      }
    }
    return grid
  }, [sandboxW, H])

  const currentB = mode === 1 ? (currentState.B ?? 0) : 0
  const B_is_in = currentB >= 0
  const magneticFieldOpacity = Math.min(0.85, Math.abs(currentB) * 0.7)
  const glowOpacity = Math.min(0.95, Math.abs(currentState.emf) * 0.8)
  const glowWidth = 3 + Math.min(6, Math.abs(currentState.emf) * 4)
  const inducedCurrentDir = currentState.emf > 0.001 ? 1 : currentState.emf < -0.001 ? -1 : 0

  return {
    tNow, chartPoints, currentState,
    chartPadTop, chartH, yPhiMid, yEmfMid, chartHalfH,
    phiMinVal, phiMaxVal, maxEmfVal, emfIsZero,
    toPhiY, yPhiZero, toChartX, toEmfY,
    phiPathD, emfPathD, indicatorX,
    circuitRightX, circuitLeftX, bulbY, meterY,
    solenoidW, solenoidH, solenoidLeftX, solenoidRightX, solenoidWireY,
    bulbScale, bulbPinY,
    meterScale, meterTopY, meterPinY, meterPinLeftX, meterPinRightX,
    bottomWireY, wirePointsA, wirePointsB, wirePointsC,
    circuitPath, totalPathLen, getElectronicPos,
    electronFlowSpeed, electronParticles,
    fieldDots, currentB, B_is_in, magneticFieldOpacity,
    glowOpacity, glowWidth, inducedCurrentDir,
  }
}
