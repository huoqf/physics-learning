/**
 * useChargeInEFieldPhysics.ts — 带电粒子在匀强电场中运动：物理计算 & 场景几何 hook
 *
 * 从 ChargeInEField.tsx 拆分：轨迹仿真、坐标映射、偏角计算、网格线渲染。
 */
import { useMemo, useEffect } from 'react'
import { useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import {
  CHARGE_EFIELD_GEOMETRY,
  calculateChargeInEFieldTrajectory,
  getChargeInEFieldTimeScale,
} from '@/physics/electromagnetism'
import { calculateVectorPixelLength } from '@/utils/vectorLength'
import type { SceneScale } from '@/scene'
import type { ViewportInfo } from '@/utils/useViewport'

// ── 物理几何常数 (SI, 复用物理层真源) ──
export const PLATE_LENGTH = CHARGE_EFIELD_GEOMETRY.plateLength // m
export const PLATE_GAP = CHARGE_EFIELD_GEOMETRY.plateGap // m
export const HALF_GAP = PLATE_GAP / 2
export const PARTICLE_MASS = CHARGE_EFIELD_GEOMETRY.particleMass // 10 mg (10e-6 kg)
export const DRIFT_LENGTH = CHARGE_EFIELD_GEOMETRY.driftLength // 无场漂移距离 m

// ── SVG 几何常量 ──
export const TERMINAL_CORE_RADIUS = 4   // 发射口圆半径
export const INTERSECTION_DOT_RADIUS = 3 // 交点标记圆半径

// ── 角度弧线绘制辅助 ──
export function drawAngleArc(
  ocx: number,
  ocy: number,
  startAngle: number,
  endAngle: number,
  radius: number,
): string {
  const x1 = ocx + radius * Math.cos(startAngle)
  const y1 = ocy + radius * Math.sin(startAngle)
  const x2 = ocx + radius * Math.cos(endAngle)
  const y2 = ocy + radius * Math.sin(endAngle)
  const largeArcFlag = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0
  const sweepFlag = endAngle > startAngle ? 1 : 0
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}`
}

// ── Hook 参数 ──

export interface ChargeInEFieldPhysicsParams {
  U: number
  v0: number
  q: number
  freq: number
  isAC: number
  useGravity: number
  phi0: number
  showScreen: number
  time: number
  showVectors: boolean
  showGrid: boolean
  vp: ViewportInfo
  /** 传入 setIsPlaying 以在动画结束时自动暂停 */
  setIsPlaying: (v: boolean) => void
}

// ── Hook 返回值 ──

export interface ChargeInEFieldPhysicsResult {
  simResult: {
    tEnd: number
    plateExitTime: number
    screenY: number | null
    points: Array<{
      t: number; x: number; y: number
      vx: number; vy: number
      ax: number; ay: number
    }>
    hitType: string
    hitsPlate: boolean
  }
  tSim: number
  ended: boolean
  currentState: {
    t: number; x: number; y: number
    vx: number; vy: number
    ax: number; ay: number
  }
  // 场景几何
  hasScreen: boolean
  inField: boolean
  midY: number
  scale: number
  startX: number
  plateEndX: number
  screenX: number
  screenSpotY: number | null
  topPlateY: number
  bottomPlateY: number
  cx: number
  cy: number
  // 电场极性
  curFieldSign: number
  // 轨迹点
  historyPoints: Array<{ x: number; y: number }>
  predictedPoints: Array<{ x: number; y: number }>
  tailPoints: Array<{ x: number; y: number }>
  // sceneScale
  sceneScale: SceneScale
  // 速度分解
  refMag: number
  velocityScaleFactor: number
  vx_px: number
  vy_px: number
  vMag: number
  totalPxLen: number
  vxPxLen: number
  vyPxLen: number
  // 偏角
  tangentData: {
    xInter: number
    cInterX: number
    pxYStart: number
    startLineX: number
    startLineY: number
    exitX: number
    exitY: number
    theta: number
    alpha: number
  } | null
  // 网格线数据
  gridLineSpecs: Array<{
    key: string
    x1: number
    y1: number
    x2: number
    y2: number
    isCenterRef?: boolean
  }>
}

export function useChargeInEFieldPhysics(
  p: ChargeInEFieldPhysicsParams,
): ChargeInEFieldPhysicsResult {
  const {
    U, v0, q, freq, isAC, useGravity, phi0, showScreen,
    time, showVectors, showGrid, vp, setIsPlaying,
  } = p

  const hasScreen = showScreen === 1 && isAC === 0

  // 1. 高精度仿真
  const simResult = useMemo(() => {
    return calculateChargeInEFieldTrajectory({
      U,
      d: PLATE_GAP,
      L: PLATE_LENGTH,
      q: q * 1e-6,
      m: PARTICLE_MASS,
      v0,
      g: useGravity === 1 ? 9.8 : 0,
      isAC: isAC === 1,
      freq,
      phi0,
      includeDriftScreen: hasScreen,
      driftLength: DRIFT_LENGTH,
    })
  }, [U, v0, q, freq, isAC, useGravity, phi0, hasScreen])

  const { tEnd, points } = simResult

  // 仿真慢放时间比例
  const TIME_SCALE = getChargeInEFieldTimeScale(tEnd, isAC === 1)
  const tSim = Math.min(time * TIME_SCALE, tEnd)
  const ended = time * TIME_SCALE >= tEnd

  // 终止自动暂停
  useEffect(() => {
    if (ended && time > 0) {
      setIsPlaying(false)
    }
  }, [ended, time, setIsPlaying])

  // 2. 对当前时刻 tSim 进行线性插值
  const currentState = useMemo(() => {
    const pts = points
    if (pts.length === 0) {
      return { t: tSim, x: 0, y: 0, vx: v0, vy: 0, ax: 0, ay: 0 }
    }
    const lastPt = pts[pts.length - 1]
    if (tSim <= 0) return pts[0]
    if (tSim >= lastPt.t) return lastPt

    const dt = pts[1].t - pts[0].t || 0.0001
    const idx = Math.floor(tSim / dt)
    const p1 = pts[Math.min(idx, pts.length - 1)]
    const p2 = pts[Math.min(idx + 1, pts.length - 1)]
    if (!p1 || !p2 || p1.t === p2.t) return p1
    const frac = (tSim - p1.t) / (p2.t - p1.t)
    return {
      t: tSim,
      x: p1.x + (p2.x - p1.x) * frac,
      y: p1.y + (p2.y - p1.y) * frac,
      vx: p1.vx + (p2.vx - p1.vx) * frac,
      vy: p1.vy + (p2.vy - p1.vy) * frac,
      ax: p1.ax + (p2.ax - p1.ax) * frac,
      ay: p1.ay + (p2.ay - p1.ay) * frac,
    }
  }, [tSim, points, v0])

  // 3. 固定设计尺寸（开启荧光屏时适当缩窄比例以容纳无场漂移区 L_drift）
  const midY = 162.5
  const scale = hasScreen ? 920 : 1300
  const startX = hasScreen ? 76 : 100
  const plateEndX = startX + PLATE_LENGTH * scale
  const screenX = startX + (PLATE_LENGTH + DRIFT_LENGTH) * scale
  const screenSpotY = simResult.screenY !== null ? midY + simResult.screenY * scale : null
  const inField = currentState.x <= PLATE_LENGTH + 1e-6

  const topPlateY = midY - HALF_GAP * scale
  const bottomPlateY = midY + HALF_GAP * scale

  const cx = startX + currentState.x * scale
  const cy = midY + currentState.y * scale

  // 4. 极板极性与电场线动态方向
  const curFieldSign = useMemo(() => {
    if (isAC && freq > 0) {
      const T = 1 / freq
      const tStart = phi0 * T
      const phase = ((tSim + tStart) % T) / T
      return phase < 0.5 ? 1 : -1
    }
    return 1
  }, [tSim, isAC, freq, phi0])

  // 5. ParticleTrajectory 所需的点集
  const historyPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    for (const pt of points) {
      if (pt.t > tSim + 1e-9) break
      pts.push({ x: startX + pt.x * scale, y: midY + pt.y * scale })
    }
    return pts
  }, [points, tSim, startX, scale])

  const predictedPoints = useMemo(() => {
    return points.map((pt) => ({ x: startX + pt.x * scale, y: midY + pt.y * scale }))
  }, [points, startX, scale])

  const tailPoints = useMemo(() => {
    const tailLen = Math.min(8, historyPoints.length)
    return historyPoints.slice(-tailLen)
  }, [historyPoints])

  // 6. sceneScale
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitV,
    anchor: 'custom',
    customOriginX: 0,
    customOriginY: 0,
    customScaleX: 1,
    customScaleY: 1,
    refMagnitudes: {
      velocity: Math.max(v0, 10),
      acceleration: Math.max(Math.abs(currentState.ay), 25),
      electricField: 10,
      electricForce: Math.max(Math.abs(currentState.ay), 25),
      gravity: Math.max(Math.abs(currentState.ay), 25),
    },
  })

  // 7. 速度分解（与限幅后的矢量箭头尖端严格对齐）
  const refMag = Math.max(v0, 10)
  const velocityScaleFactor = sceneScale.maxVectorLength / refMag

  const vMag = Math.hypot(currentState.vx, currentState.vy)
  const totalPxLen = calculateVectorPixelLength(vMag, 'velocity', sceneScale.maxVectorLength, refMag)
  const vxPxLen = vMag > 0 ? totalPxLen * (Math.abs(currentState.vx) / vMag) : 0
  const vyPxLen = vMag > 0 ? totalPxLen * (Math.abs(currentState.vy) / vMag) : 0
  const vx_px = vMag > 0 ? totalPxLen * (currentState.vx / vMag) : 0
  const vy_px = vMag > 0 ? totalPxLen * (currentState.vy / vMag) : 0

  // 8. 速度反向延长线、偏角计算（进入漂移区后 α 仍取极板出口位移偏角以保持 tanθ = 2tanα）
  const exitPoint = useMemo(() => {
    let lastInPlate = points[0]
    for (const pt of points) {
      if (pt.x <= PLATE_LENGTH + 1e-6) lastInPlate = pt
      else break
    }
    return lastInPlate ?? { x: currentState.x, y: currentState.y }
  }, [points, currentState.x, currentState.y])

  const tangentData = useMemo(() => {
    if (isAC === 1 || !showVectors) return null

    const vx = currentState.vx
    const vy = currentState.vy
    if (Math.abs(vy) < 1e-4) return null

    const k = vy / vx
    const x = currentState.x
    const y = currentState.y

    const xInter = x - y / k
    const cInterX = startX + xInter * scale

    const yStart = y - k * x
    const pxYStart = midY + yStart * scale
    const inView = pxYStart >= 0 && pxYStart <= 325
    const startLineX = inView ? startX : cInterX
    const startLineY = inView ? pxYStart : midY

    const refX = inField ? x : exitPoint.x
    const refY = inField ? y : exitPoint.y
    const exitX = startX + refX * scale
    const exitY = midY + refY * scale

    const theta = Math.atan2(vy, vx)
    const alpha = Math.atan2(refY, refX)

    return {
      xInter,
      cInterX,
      pxYStart,
      startLineX,
      startLineY,
      exitX,
      exitY,
      theta,
      alpha,
    }
  }, [currentState, isAC, showVectors, startX, scale, inField, exitPoint])

  // 9. 网格线纯数据（零 JSX）
  const gridLineSpecs = useMemo(() => {
    if (!showGrid) return []
    const lines: ChargeInEFieldPhysicsResult['gridLineSpecs'] = []
    const stepX = (plateEndX - startX) / 8
    const stepY = (bottomPlateY - topPlateY) / 4
    for (let i = 0; i <= 8; i++) {
      const gx = startX + i * stepX
      lines.push({ key: `gx-${i}`, x1: gx, y1: topPlateY, x2: gx, y2: bottomPlateY })
    }
    for (let i = 0; i <= 4; i++) {
      const gy = topPlateY + i * stepY
      lines.push({ key: `gy-${i}`, x1: startX, y1: gy, x2: plateEndX, y2: gy })
    }
    lines.push({
      key: 'mid',
      x1: startX,
      y1: midY,
      x2: hasScreen ? screenX + 16 : 840,
      y2: midY,
      isCenterRef: true,
    })
    return lines
  }, [showGrid, topPlateY, bottomPlateY, plateEndX, startX, hasScreen, screenX])

  return {
    simResult,
    tSim,
    ended,
    currentState,
    hasScreen,
    inField,
    midY,
    scale,
    startX,
    plateEndX,
    screenX,
    screenSpotY,
    topPlateY,
    bottomPlateY,
    cx,
    cy,
    curFieldSign,
    historyPoints,
    predictedPoints,
    tailPoints,
    sceneScale,
    refMag,
    velocityScaleFactor,
    vx_px,
    vy_px,
    vMag,
    totalPxLen,
    vxPxLen,
    vyPxLen,
    tangentData,
    gridLineSpecs,
  }
}
