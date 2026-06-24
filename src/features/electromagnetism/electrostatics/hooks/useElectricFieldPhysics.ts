/**
 * useElectricFieldPhysics.ts — 电场强度物理计算 hook
 *
 * 从 ElectricField.tsx 拆分：所有物理计算、图表数据、电场线路径。
 */
import { useMemo } from 'react'
import { calculateElectricField } from '@/physics'

const COULOMB_K = 9e9

interface Point {
  x: number
  y: number
}

interface Charge {
  x: number
  y: number
  q: number
}

/**
 * 背景几何电场线追踪
 */
function traceSingleFieldLine(
  charges: Charge[],
  sx: number,
  sy: number,
  stepSign: number,
  w: number,
  h: number
): Point[] {
  const pts: Point[] = [{ x: sx, y: sy }]
  let cx = sx
  let cy = sy
  const step = 8
  const maxSteps = 100

  for (let i = 0; i < maxSteps; i++) {
    let ex = 0
    let ey = 0
    let nearCharge = false

    for (const c of charges) {
      const dx = cx - c.x
      const dy = cy - c.y
      const r2 = dx * dx + dy * dy

      if (r2 < 400) {
        if (i > 1) {
          nearCharge = true
          break
        }
      }

      const r = Math.sqrt(r2)
      if (r > 0.1) {
        const mag = c.q / r2
        ex += mag * (dx / r)
        ey += mag * (dy / r)
      }
    }

    if (nearCharge) break

    const eMag = Math.sqrt(ex * ex + ey * ey)
    if (eMag < 1e-6) break

    cx += stepSign * (ex / eMag) * step
    cy += stepSign * (ey / eMag) * step

    if (cx < -50 || cx > w + 50 || cy < -50 || cy > h + 50) {
      pts.push({ x: cx, y: cy })
      break
    }

    pts.push({ x: cx, y: cy })
  }
  return pts
}

export interface ElectricFieldPhysicsParams {
  mode: number
  qSource: number
  qTest: number
  q1: number
  q2: number
  chargeConfig: number
  showFieldLines: boolean
  testX: number
  testY: number
  cx: number
  cy: number
  cx1: number
  cy1: number
  cx2: number
  cy2: number
  w: number
  h: number
  pxPerCm: number
}

export interface ElectricFieldPhysicsResult {
  basicPhysics: {
    distCm: number
    distM: number
    E: number
    Ex: number
    Ey: number
    F: number
    Fx: number
    Fy: number
  }
  advancedPhysics: {
    E1x: number
    E1y: number
    E2x: number
    E2y: number
    Ex: number
    Ey: number
    E: number
    F: number
    Fx: number
    Fy: number
    distCm: number
  }
  basicArrows: {
    vectorE: { x: number; y: number }
    pixelLenE: number
    vectorF: { x: number; y: number }
    pixelLenF: number
  } | null
  advancedArrows: {
    vectorE1: { x: number; y: number }
    lenE1: number
    vectorE2: { x: number; y: number }
    lenE2: number
    vectorEnet: { x: number; y: number }
    lenEnet: number
    vectorF: { x: number; y: number }
    lenF: number
    e1Tip: { x: number; y: number }
    e2Tip: { x: number; y: number }
    enetTip: { x: number; y: number }
  } | null
  fieldLinesPaths: string[]
  /**
   * E-r / F-r 对比图所需数据 + 像素布局。
   * 重构后：物理数据（points / eMax / fMax）与渲染层（toX/toYE/path）解耦，
   * 由消费方传给 RelationChart 即可完成绘制。
   */
  chartProps: {
    /** 图表像素布局 */
    chartW: number
    chartH: number
    chartLeft: number
    topY_E: number
    topY_F: number
    /** 物理数据 */
    rMin: number
    rMax: number
    eMax: number
    fMax: number
    /** 整段曲线采样点，供 RelationChart 直接消费 */
    points: { r: number; E: number; F: number }[]
  } | null
}

export function useElectricFieldPhysics(p: ElectricFieldPhysicsParams): ElectricFieldPhysicsResult {
  const {
    mode, qSource, qTest, q1, q2, chargeConfig, showFieldLines,
    testX, testY, cx, cy, cx1, cy1, cx2, cy2,
    w, h, pxPerCm
  } = p

  // 基础模式物理计算
  const basicPhysics = useMemo(() => {
    const dx = testX - cx
    const dy = cy - testY
    const distPx = Math.sqrt(dx * dx + dy * dy)
    const distCm = distPx / pxPerCm
    const distM = distCm * 0.01

    const qSI = qSource * 1e-6
    const qTestSI = qTest * 1e-6

    const { E } = calculateElectricField(COULOMB_K, Math.abs(qSI), Math.max(0.005, distM))

    const angle = Math.atan2(dy, dx)
    const dirFactor = qSource >= 0 ? 1 : -1
    const Ex = E * dirFactor * Math.cos(angle)
    const Ey = E * dirFactor * Math.sin(angle)

    const Fx = qTestSI * Ex
    const Fy = qTestSI * Ey
    const F = Math.sqrt(Fx * Fx + Fy * Fy)

    return { distCm, distM, E, Ex, Ey, F, Fx, Fy }
  }, [testX, testY, cx, cy, qSource, qTest, pxPerCm])

  // 进阶模式物理计算
  const advancedPhysics = useMemo(() => {
    const dx1 = testX - cx1
    const dy1 = cy1 - testY
    const r1Px = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    const r1M = Math.max(0.2, r1Px / pxPerCm) * 0.01
    const E1_val = calculateElectricField(COULOMB_K, Math.abs(q1 * 1e-6), r1M).E
    const angle1 = Math.atan2(dy1, dx1)
    const dir1 = q1 >= 0 ? 1 : -1
    const E1x = E1_val * dir1 * Math.cos(angle1)
    const E1y = E1_val * dir1 * Math.sin(angle1)

    const dx2 = testX - cx2
    const dy2 = cy2 - testY
    const r2Px = Math.sqrt(dx2 * dx2 + dy2 * dy2)
    const r2M = Math.max(0.2, r2Px / pxPerCm) * 0.01
    const E2_val = calculateElectricField(COULOMB_K, Math.abs(q2 * 1e-6), r2M).E
    const angle2 = Math.atan2(dy2, dx2)
    const dir2 = q2 >= 0 ? 1 : -1
    const E2x = E2_val * dir2 * Math.cos(angle2)
    const E2y = E2_val * dir2 * Math.sin(angle2)

    const Ex = E1x + E2x
    const Ey = E1y + E2y
    const E = Math.sqrt(Ex * Ex + Ey * Ey)

    const qTestSI = qTest * 1e-6
    const Fx = qTestSI * Ex
    const Fy = qTestSI * Ey
    const F = Math.sqrt(Fx * Fx + Fy * Fy)

    const midX = (cx1 + cx2) / 2
    const midY = (cy1 + cy2) / 2
    const distCm = Math.sqrt((testX - midX) ** 2 + (testY - midY) ** 2) / pxPerCm

    return { E1x, E1y, E2x, E2y, Ex, Ey, E, F, Fx, Fy, distCm }
  }, [testX, testY, cx1, cy1, cx2, cy2, q1, q2, qTest, pxPerCm])

  // 基础模式箭头
  const basicArrows = useMemo(() => {
    const { Ex, Ey, Fx, Fy, E, F } = basicPhysics
    if (E < 1e-9) return null

    const eLen = Math.max(25, Math.min(85, (E / 5e7) * 20 + 35))
    const fLen = qTest === 0 ? 0 : Math.max(20, Math.min(110, (F / 10) * 12 + 35))

    return {
      vectorE: { x: Ex, y: Ey },
      pixelLenE: eLen,
      vectorF: { x: Fx, y: Fy },
      pixelLenF: fLen,
    }
  }, [basicPhysics, qTest])

  // 进阶模式箭头
  const advancedArrows = useMemo(() => {
    const { E1x, E1y, E2x, E2y, Ex, Ey, Fx, Fy } = advancedPhysics

    const maxE = Math.max(
      Math.sqrt(E1x * E1x + E1y * E1y),
      Math.sqrt(E2x * E2x + E2y * E2y),
      Math.sqrt(Ex * Ex + Ey * Ey)
    )
    const scale = maxE > 1e-9 ? Math.min(1.2e-6, 75 / maxE) : 1.2e-6

    const pxE1 = { x: E1x * scale, y: E1y * scale }
    const pxE2 = { x: E2x * scale, y: E2y * scale }
    const pxEnet = { x: Ex * scale, y: Ey * scale }

    const lenE1 = Math.sqrt(pxE1.x * pxE1.x + pxE1.y * pxE1.y)
    const lenE2 = Math.sqrt(pxE2.x * pxE2.x + pxE2.y * pxE2.y)
    const lenEnet = Math.sqrt(pxEnet.x * pxEnet.x + pxEnet.y * pxEnet.y)

    const F_mag = Math.sqrt(Fx * Fx + Fy * Fy)
    const lenF = qTest === 0 ? 0 : Math.max(20, Math.min(100, (F_mag / 10) * 10 + 35))

    const e1Tip = { x: testX + pxE1.x, y: testY - pxE1.y }
    const e2Tip = { x: testX + pxE2.x, y: testY - pxE2.y }
    const enetTip = { x: testX + pxEnet.x, y: testY - pxEnet.y }

    return {
      vectorE1: { x: E1x, y: E1y },
      lenE1,
      vectorE2: { x: E2x, y: E2y },
      lenE2,
      vectorEnet: { x: Ex, y: Ey },
      lenEnet,
      vectorF: { x: Fx, y: Fy },
      lenF,
      e1Tip,
      e2Tip,
      enetTip,
    }
  }, [advancedPhysics, testX, testY, qTest])

  // 电场线路径
  const fieldLinesPaths = useMemo(() => {
    if (!showFieldLines) return []

    if (mode === 0) {
      const paths: string[] = []
      const dirCount = 16
      const rInner = 20
      const rOuter = 220
      const pos = qSource >= 0

      for (let i = 0; i < dirCount; i++) {
        const a = (i * Math.PI * 2) / dirCount
        const cos = Math.cos(a)
        const sin = Math.sin(a)

        const x1 = cx + cos * (pos ? rInner : rOuter)
        const y1 = cy + sin * (pos ? rInner : rOuter)
        const x2 = cx + cos * (pos ? rOuter : rInner)
        const y2 = cy + sin * (pos ? rOuter : rInner)

        paths.push(`M ${x1.toFixed(1)},${y1.toFixed(1)} L ${x2.toFixed(1)},${y2.toFixed(1)}`)
      }
      return paths
    } else {
      const paths: string[] = []
      const charges: Charge[] = [
        { x: cx1, y: cy1, q: q1 },
        { x: cx2, y: cy2, q: q2 },
      ]

      const emitFromCharge = (ch: Charge, isPos: boolean, numLines = 12) => {
        const stepSign = isPos ? 1 : -1
        for (let i = 0; i < numLines; i++) {
          const angle = (Math.PI * 2 * i) / numLines
          const sx = ch.x + 22 * Math.cos(angle)
          const sy = ch.y + 22 * Math.sin(angle)

          let linePoints = traceSingleFieldLine(charges, sx, sy, stepSign, w, h)
          if (linePoints.length > 2) {
            if (!isPos) {
              linePoints.reverse()
            }
            const d = linePoints.map((pt, idx) =>
              (idx === 0 ? 'M' : 'L') + ` ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
            ).join(' ')
            paths.push(d)
          }
        }
      }

      if (chargeConfig === 0) {
        emitFromCharge(charges[0], q1 > 0, 16)
        // 等量异种：从画布边缘向负电荷追踪，补全远侧电场线
        const negCh = charges[1]
        const startDist = Math.max(w, h) * 0.6
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 * i) / 12
          let sx = Math.max(10, Math.min(w - 10, negCh.x + startDist * Math.cos(angle)))
          let sy = Math.max(10, Math.min(h - 10, negCh.y + startDist * Math.sin(angle)))
          const pts = traceSingleFieldLine(charges, sx, sy, 1, w, h)
          if (pts.length > 2) {
            paths.push(pts.map((p, idx) =>
              (idx === 0 ? 'M' : 'L') + ` ${p.x.toFixed(1)},${p.y.toFixed(1)}`
            ).join(' '))
          }
        }
      } else {
        emitFromCharge(charges[0], q1 > 0, 12)
        emitFromCharge(charges[1], q2 > 0, 12)
      }

      return paths
    }
  }, [mode, qSource, q1, q2, chargeConfig, showFieldLines, cx, cy, cx1, cy1, cx2, cy2, w, h])

  // 图表数据 + 像素布局（曲线生成 / Path 字符串交给 RelationChart）
  const chartProps = useMemo(() => {
    if (mode !== 0) return null

    // 像素布局：右侧图表区上下排列 E-r / F-r
    const chartW = w * 0.36
    const chartH = h * 0.45
    const chartLeft = w * 0.62
    const topY_E = h * 0.03
    const topY_F = h * 0.53

    // 物理域
    const rMin = 1.0
    const rMax = 6.0

    // Y 轴上界（用最小允许 r 的场强 / 力作上界，避免极小 r 的奇点把曲线压扁）
    const qSI = Math.abs(qSource * 1e-6)
    const { E: eMax } = calculateElectricField(COULOMB_K, qSI, 1.2 * 0.01)
    const fMax = eMax * 2.0 * 1e-6

    // 整段曲线采样（仅当 qSource / qTest 变化时重算）
    const points: { r: number; E: number; F: number }[] = []
    const step = 0.1
    for (let r = rMin; r <= rMax + 0.01; r += step) {
      const rSI = r * 0.01
      const { E } = calculateElectricField(COULOMB_K, qSI, rSI)
      const F = E * Math.abs(qTest) * 1e-6
      points.push({ r, E, F })
    }

    return {
      chartW, chartH, chartLeft, topY_E, topY_F,
      rMin, rMax, eMax, fMax, points,
    }
  }, [mode, qSource, qTest, w, h])

  return {
    basicPhysics,
    advancedPhysics,
    basicArrows,
    advancedArrows,
    fieldLinesPaths,
    chartProps,
  }
}
