import { useMemo } from 'react'
import { calculateNonUniformEField } from '@/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'

/**
 * 电势与电势能物理计算 hook
 * 负责所有物理量计算，包括电势、电势能、电场力、粒子运动轨迹、图表数据等
 */

// 物理常量 (米制单位)
const Q_SOURCE = 2.0e-6 // 场源正电荷 +2.0 μC
const X_Q = 3.5 // 场源 x 坐标 (m)
const Y_Q = 2.2 // 场源 y 坐标 (m)
const X_A = 1.5 // A点 x 坐标 (m)
const Y_A = 1.2 // A点 y 坐标 (m)
const X_B = 5.5 // B点 x 坐标 (m)
const Y_B = 1.2 // B点 y 坐标 (m)
const X_REF = 3.5 // 匀强电场零势参考面 x 坐标 (m)
const X_GROUND = 3.5 // 接地参考 x 坐标 (m)
const Y_GROUND = 0.0 // 接地参考 y 坐标 (m)

// 物理空间域 (m) 与 splitV 设计坐标尺寸 (840×325)
export const POTENTIAL_PHYS_W = 7.0
export const POTENTIAL_PHYS_H = 3.5
export const POTENTIAL_DESIGN_W = CANVAS_PRESETS.splitV.width
export const POTENTIAL_DESIGN_H = CANVAS_PRESETS.splitV.height

// 粒子滑行最大时长
const RUN_DURATION = 5.0 // 5.0 秒滑行完

export interface PathPoint {
  x: number // 物理 x (m)
  y: number // 物理 y (m)
}

interface UseElectricPotentialPhysicsParams {
  baseEField: number // V/m
  qProbe: number // μC
  zeroRef: number // 0=无穷远, 1=大地
  drawMode: number // 0=直线, 1=手绘
  hoverX: number // 0..1
  activePath: PathPoint[]
  runProgress: number // 0..1
  phiA: number // 从 store 同步
}

export interface ElectricPotentialPhysicsResult {
  posA: { cx: number; cy: number }
  posB: { cx: number; cy: number }
  posQ: { cx: number; cy: number }

  pathDistances: { dists: number[]; total: number }

  particlePhysicsPos: PathPoint
  particleCanvasPos: { cx: number; cy: number }

  particlePhysics: {
    phi: number
    Ex: number
    Ey: number
    E: number
    Ep: number
    Ek: number
    pctEp: number
    pctEk: number
  }

  chartPoints: { xPhys: number; phi: number }[]
  chartYLimit: { min: number; max: number }
  chartPathD: string
  chartPadding: { left: number; right: number; top: number; bottom: number }
  chartWidth: number
  chartHeight: number
  chartPhysToCanvas: (xp: number, phi: number) => { cx: number; cy: number }

  hoverPhysX: number
  hoverPhysics: { phi: number; Ex: number; slope: number }
  tangentLinePath: { x1: number; y1: number; x2: number; y2: number }

  eFieldVectors: { cx: number; cy: number; dx: number; dy: number; length: number; opacity: number }[]

  hoverIndicator: { cx: number; cy: number; dx: number; dy: number; eMag: number; thickness: number }

  particleForceArrow: { dx: number; dy: number } | null

  handPathD: string

  physicsToDesign: (xp: number, yp: number) => { cx: number; cy: number }
  designToPhysics: (dx: number, dy: number) => { xp: number; yp: number }
}

export function useElectricPotentialPhysics({
  baseEField,
  qProbe,
  zeroRef,
  hoverX,
  activePath,
  runProgress,
  phiA,
}: UseElectricPotentialPhysicsParams): ElectricPotentialPhysicsResult {
  const zeroRefStr: 'infinity' | 'ground' = zeroRef === 1 ? 'ground' : 'infinity'

  // 物理坐标 ↔ 设计坐标（splitV 840×325，严格互逆，原点在动画区左下角）
  const physicsToDesign = useMemo(() => {
    const scaleX = POTENTIAL_DESIGN_W / POTENTIAL_PHYS_W
    const scaleY = POTENTIAL_DESIGN_H / POTENTIAL_PHYS_H
    return (xp: number, yp: number) => ({
      cx: xp * scaleX,
      cy: POTENTIAL_DESIGN_H - yp * scaleY,
    })
  }, [])

  const designToPhysics = useMemo(() => {
    const scaleX = POTENTIAL_DESIGN_W / POTENTIAL_PHYS_W
    const scaleY = POTENTIAL_DESIGN_H / POTENTIAL_PHYS_H
    return (dx: number, dy: number) => ({
      xp: dx / scaleX,
      yp: (POTENTIAL_DESIGN_H - dy) / scaleY,
    })
  }, [])

  // A、B、Q 设计坐标
  const posA = useMemo(() => physicsToDesign(X_A, Y_A), [physicsToDesign])
  const posB = useMemo(() => physicsToDesign(X_B, Y_B), [physicsToDesign])
  const posQ = useMemo(() => physicsToDesign(X_Q, Y_Q), [physicsToDesign])

  // 路径距离
  const pathDistances = useMemo(() => {
    const dists: number[] = [0]
    let total = 0
    for (let i = 0; i < activePath.length - 1; i++) {
      const p1 = activePath[i]
      const p2 = activePath[i + 1]
      const d = Math.hypot(p2.x - p1.x, p2.y - p1.y)
      total += d
      dists.push(total)
    }
    return { dists, total }
  }, [activePath])

  // 粒子物理位置
  const particlePhysicsPos = useMemo<PathPoint>(() => {
    const targetD = runProgress * pathDistances.total
    const dists = pathDistances.dists

    let idx = 0
    for (let i = 0; i < dists.length - 1; i++) {
      if (targetD >= dists[i] && targetD <= dists[i + 1]) {
        idx = i
        break
      }
    }

    const p1 = activePath[idx]
    const p2 = activePath[idx + 1]
    if (!p1 || !p2) return { x: X_A, y: Y_A }

    const segmentD = dists[idx + 1] - dists[idx]
    if (segmentD === 0) return p1

    const ratio = (targetD - dists[idx]) / segmentD
    return {
      x: p1.x + ratio * (p2.x - p1.x),
      y: p1.y + ratio * (p2.y - p1.y),
    }
  }, [runProgress, activePath, pathDistances])

  // 路径最低电势能基准（确保负电荷 Ep < 0 时能量柱依然正常互补变化）
  const pathMinEp = useMemo(() => {
    let minEp = qProbe * 1e-6 * phiA
    for (const pt of activePath) {
      const r = calculateNonUniformEField(
        pt.x, pt.y, baseEField, X_Q, Y_Q, Q_SOURCE, zeroRefStr, X_REF, X_GROUND, Y_GROUND
      )
      const epVal = qProbe * 1e-6 * r.phi
      if (epVal < minEp) minEp = epVal
    }
    return minEp
  }, [activePath, baseEField, zeroRefStr, qProbe, phiA])

  // 粒子物理量
  const particlePhysics = useMemo(() => {
    const pos = particlePhysicsPos
    const res = calculateNonUniformEField(
      pos.x, pos.y, baseEField, X_Q, Y_Q, Q_SOURCE, zeroRefStr, X_REF, X_GROUND, Y_GROUND
    )

    const Ep = qProbe * 1e-6 * res.phi
    const EpStart = qProbe * 1e-6 * phiA
    const EkStart = 2.0e-3
    const Ek = Math.max(0, EkStart + (EpStart - Ep))

    const epShift = Math.min(0, pathMinEp, EpStart, Ep)
    const epShifted = Math.max(0, Ep - epShift)
    const denom = Math.max(epShifted + Ek, 1e-9)
    const pctEp = Math.max(3, Math.min(97, (epShifted / denom) * 100))
    const pctEk = 100 - pctEp

    return { phi: res.phi, Ex: res.Ex, Ey: res.Ey, E: res.E, Ep, Ek, pctEp, pctEk }
  }, [particlePhysicsPos, baseEField, zeroRefStr, qProbe, phiA, pathMinEp])

  // φ-x 图表数据
  const xStartPhys = 1.0
  const xEndPhys = 6.0

  const chartPoints = useMemo(() => {
    const pointsCount = 100
    const pts: { xPhys: number; phi: number }[] = []
    for (let i = 0; i <= pointsCount; i++) {
      const xp = xStartPhys + (i / pointsCount) * (xEndPhys - xStartPhys)
      const res = calculateNonUniformEField(
        xp, Y_A, baseEField, X_Q, Y_Q, Q_SOURCE, zeroRefStr, X_REF, X_GROUND, Y_GROUND
      )
      pts.push({ xPhys: xp, phi: res.phi })
    }
    return pts
  }, [baseEField, zeroRefStr])

  const chartYLimit = useMemo(() => {
    const phis = chartPoints.map((p) => p.phi)
    const min = Math.min(...phis)
    const max = Math.max(...phis)
    const diff = max - min
    const pad = diff > 0 ? diff * 0.15 : 10.0
    return { min: min - pad, max: max + pad }
  }, [chartPoints])

  const chartPadding = { left: 60, right: 40, top: 30, bottom: 40 }
  const chartWidth = POTENTIAL_DESIGN_W - chartPadding.left - chartPadding.right
  const chartHeight = POTENTIAL_DESIGN_H - chartPadding.top - chartPadding.bottom

  const chartPhysToCanvas = useMemo(() => {
    return (xp: number, phi: number) => {
      const xPct = (xp - xStartPhys) / (xEndPhys - xStartPhys)
      const yPct = (phi - chartYLimit.min) / (chartYLimit.max - chartYLimit.min)
      return {
        cx: chartPadding.left + xPct * chartWidth,
        cy: chartPadding.top + (1 - yPct) * chartHeight,
      }
    }
  }, [chartYLimit, chartWidth, chartHeight, chartPadding.left, chartPadding.top])

  const chartPathD = useMemo(() => {
    return chartPoints
      .map((p, idx) => {
        const { cx, cy } = chartPhysToCanvas(p.xPhys, p.phi)
        return `${idx === 0 ? 'M' : 'L'} ${cx.toFixed(1)},${cy.toFixed(1)}`
      })
      .join(' ')
  }, [chartPoints, chartPhysToCanvas])

  // Hover 物理
  const hoverPhysX = xStartPhys + hoverX * (xEndPhys - xStartPhys)
  const hoverPhysics = useMemo(() => {
    const res = calculateNonUniformEField(
      hoverPhysX, Y_A, baseEField, X_Q, Y_Q, Q_SOURCE, zeroRefStr, X_REF, X_GROUND, Y_GROUND
    )
    const slope = -res.Ex
    return { phi: res.phi, Ex: res.Ex, slope }
  }, [hoverPhysX, baseEField, zeroRefStr])

  const tangentLinePath = useMemo(() => {
    const xp = hoverPhysX
    const phi = hoverPhysics.phi
    const k = hoverPhysics.slope

    const x1 = xp - 0.8
    const y1 = phi + k * (x1 - xp)
    const x2 = xp + 0.8
    const y2 = phi + k * (x2 - xp)

    const p1 = chartPhysToCanvas(x1, y1)
    const p2 = chartPhysToCanvas(x2, y2)
    return { x1: p1.cx, y1: p1.cy, x2: p2.cx, y2: p2.cy }
  }, [hoverPhysX, hoverPhysics, chartPhysToCanvas])

  // 场强矢量网格
  const eFieldVectors = useMemo(() => {
    const vectors: { cx: number; cy: number; dx: number; dy: number; length: number; opacity: number }[] = []
    const cols = 9
    const rows = 5
    for (let c = 1; c < cols; c++) {
      for (let r = 1; r < rows; r++) {
        const xp = (c / cols) * POTENTIAL_PHYS_W
        const yp = (r / rows) * POTENTIAL_PHYS_H

        if (Math.hypot(xp - X_Q, yp - Y_Q) < 0.45) continue

        const res = calculateNonUniformEField(
          xp, yp, baseEField, X_Q, Y_Q, Q_SOURCE, zeroRefStr, X_REF, X_GROUND, Y_GROUND
        )

        const eMag = res.E
        if (eMag < 1.0) continue

        const angle = Math.atan2(res.Ey, res.Ex)
        const arrowLen = Math.max(8, Math.min(22, (eMag / 400) * 14 + 8))
        const opacity = Math.max(0.1, Math.min(0.4, (eMag / 400) * 0.3 + 0.1))

        const designPos = physicsToDesign(xp, yp)
        vectors.push({
          cx: designPos.cx,
          cy: designPos.cy,
          dx: Math.cos(angle) * arrowLen,
          dy: -Math.sin(angle) * arrowLen,
          length: arrowLen,
          opacity,
        })
      }
    }
    return vectors
  }, [baseEField, zeroRefStr, physicsToDesign])

  // Hover 指示器
  const hoverIndicator = useMemo(() => {
    const xp = hoverPhysX
    const yp = Y_A
    const designPos = physicsToDesign(xp, yp)

    const res = calculateNonUniformEField(
      xp, yp, baseEField, X_Q, Y_Q, Q_SOURCE, zeroRefStr, X_REF, X_GROUND, Y_GROUND
    )

    const eMag = res.E
    const angle = Math.atan2(res.Ey, res.Ex)
    const arrowLen = Math.max(15, Math.min(60, (eMag / 400) * 35 + 15))
    const thickness = Math.max(1.5, Math.min(5.0, (eMag / 400) * 3.5 + 1.5))

    return {
      cx: designPos.cx,
      cy: designPos.cy,
      dx: Math.cos(angle) * arrowLen,
      dy: -Math.sin(angle) * arrowLen,
      eMag,
      thickness,
    }
  }, [hoverPhysX, baseEField, zeroRefStr, physicsToDesign])

  const particleCanvasPos = physicsToDesign(particlePhysicsPos.x, particlePhysicsPos.y)

  const particleForceArrow = useMemo(() => {
    const eMag = particlePhysics.E
    if (eMag < 1.0 || qProbe === 0) return null

    const directionFactor = qProbe >= 0 ? 1 : -1
    const angle = Math.atan2(particlePhysics.Ey, particlePhysics.Ex) + (directionFactor === -1 ? Math.PI : 0)
    const arrowLen = Math.max(18, Math.min(50, (Math.abs(qProbe) * eMag / 400) * 25 + 18))

    return {
      dx: Math.cos(angle) * arrowLen,
      dy: -Math.sin(angle) * arrowLen,
    }
  }, [particlePhysics.E, particlePhysics.Ex, particlePhysics.Ey, qProbe])

  const handPathD = ''

  return {
    posA,
    posB,
    posQ,
    pathDistances,
    particlePhysicsPos,
    particleCanvasPos,
    particlePhysics,
    chartPoints,
    chartYLimit,
    chartPathD,
    chartPadding,
    chartWidth,
    chartHeight,
    chartPhysToCanvas,
    hoverPhysX,
    hoverPhysics,
    tangentLinePath,
    eFieldVectors,
    hoverIndicator,
    particleForceArrow,
    handPathD,
    physicsToDesign,
    designToPhysics,
  }
}

export { Q_SOURCE, X_Q, Y_Q, X_A, Y_A, X_B, Y_B, X_REF, X_GROUND, Y_GROUND, RUN_DURATION }
