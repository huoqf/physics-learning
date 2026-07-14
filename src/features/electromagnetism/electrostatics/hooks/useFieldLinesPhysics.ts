/**
 * useFieldLinesPhysics.ts — 电场线场景物理计算 hook
 *
 * 从 FieldLines.tsx 拆分：纯物理计算函数 + 所有 useMemo 逻辑。
 * 组件 JSX 零物理公式。
 */
import { useMemo } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'

// ── 物理与绘图常量 ──
const COULOMB_K = 9e9
export const CHARGE_RADIUS = 22
const PROBE_CHARGE = 1e-6 // 探针试探电荷 +1.0 μC

// ── 类型 ──
export interface Charge {
  x: number
  y: number
  q: number // 电量 μC
}

// ── 纯函数 ──

/** 计算某点处的合电场强度 (V/m = N/C) */
function electricField(charges: Charge[], px: number, py: number, mPerPx: number) {
  let ex = 0
  let ey = 0
  for (const c of charges) {
    const dx = px - c.x
    const dy = py - c.y
    const rPx = Math.sqrt(dx * dx + dy * dy)
    const rM = Math.max(0.02, rPx * mPerPx) // 防止除零，限制最小物理距离 2cm
    const qSI = c.q * 1e-6
    const mag = (COULOMB_K * qSI) / (rM * rM)
    ex += mag * (dx / rPx)
    ey += mag * (dy / rPx)
  }
  return { ex, ey }
}

/** 计算某点处的合电势 (V) */
function potential(charges: Charge[], px: number, py: number, mPerPx: number) {
  let v = 0
  for (const c of charges) {
    const dx = px - c.x
    const dy = py - c.y
    const rPx = Math.sqrt(dx * dx + dy * dy)
    const rM = Math.max(0.04, rPx * mPerPx) // 限制最小距离 4cm
    v += (COULOMB_K * c.q * 1e-6) / rM
  }
  return v
}

/** 追踪一条电场线路径 */
function traceFieldLine(
  charges: Charge[],
  sx: number,
  sy: number,
  direction: 1 | -1, // 1=顺场强, -1=逆场强
  w: number,
  h: number,
  mPerPx: number
): { points: [number, number][]; arrowPos: [number, number, number] | null } {
  const points: [number, number][] = [[sx, sy]]
  let x = sx
  let y = sy
  const stepSize = 8 // 追踪步长（像素）
  const maxSteps = 150

  for (let i = 0; i < maxSteps; i++) {
    const { ex, ey } = electricField(charges, x, y, mPerPx)
    const mag = Math.sqrt(ex * ex + ey * ey)
    if (mag < 1e-3) break

    // 沿场强方向步进
    const dx = (direction * ex) / mag
    const dy = (direction * ey) / mag
    x += dx * stepSize
    y += dy * stepSize

    // 越界退出
    if (x < -50 || x > w + 50 || y < -50 || y > h + 50) {
      points.push([x, y])
      break
    }

    // 靠近电荷退出
    let nearCharge = false
    for (const c of charges) {
      const d = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2)
      if (d < CHARGE_RADIUS * 0.9) {
        nearCharge = true
        break
      }
    }
    if (nearCharge) break

    points.push([x, y])
  }

  // 计算中间箭头的绘制位置（大约在路径 45% 处）
  let arrowPos: [number, number, number] | null = null
  if (points.length > 5) {
    const midIdx = Math.floor(points.length * 0.45)
    const p1 = points[midIdx]
    const p2 = points[midIdx + 1]
    if (p1 && p2) {
      const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0])
      arrowPos = [p1[0], p1[1], angle]
    }
  }

  return { points, arrowPos }
}

// ── Hook 参数与返回值 ──

export interface FieldLinesPhysicsParams {
  /** 拓扑模式: 0=单正, 1=单负, 2=等量异种, 3=等量同种 */
  topology: number
  /** 场源电荷 μC */
  qSource: number
  /** 是否显示电场线 */
  showFieldLines: boolean
  /** 是否显示等势线 */
  showEquipotentials: boolean
  /** 探针设计坐标 x */
  probeX: number
  /** 探针设计坐标 y */
  probeY: number
  /** 画布设计宽度 */
  w: number
  /** 画布设计高度 */
  h: number
}

export interface FieldLinesPhysicsResult {
  /** 场源电荷配置（设计坐标） */
  charges: Charge[]
  /** 电场线路径数据 */
  fieldLinesPaths: { d: string; arrow: [number, number, number] | null; color: string }[]
  /** 等势线数据 */
  equipotentialPaths:
    | { type: 'circle'; data: { cx: number; cy: number; r: number; opacity: number }[] }
    | { type: 'path'; data: { d: string; opacity: number }[] }
    | { type: 'none'; data: never[] }
  /** 探针物理计算结果 */
  probePhysics: {
    forceArrow: [number, number] | null
    phiCurrent: number
    pctEp: number
    pctEk: number
  }
  /** 物理距离/像素转换系数 (m/px) */
  mPerPx: number
}

export function useFieldLinesPhysics(p: FieldLinesPhysicsParams): FieldLinesPhysicsResult {
  const { topology, qSource, showFieldLines, showEquipotentials, probeX, probeY, w, h } = p

  const cx = w / 2
  const cy = h / 2
  const separation = 160 // 设计稿中固定的极板/电荷间距像素值
  const mPerPx = 0.8 / separation // 保持物理间距 0.8m

  // 1. 根据拓扑确定场源电荷配置 (使用设计坐标)
  const charges = useMemo<Charge[]>(() => {
    if (topology === 0) {
      return [{ x: cx, y: cy, q: qSource }]
    } else if (topology === 1) {
      return [{ x: cx, y: cy, q: -qSource }]
    } else if (topology === 2) {
      return [
        { x: cx - separation / 2, y: cy, q: qSource },
        { x: cx + separation / 2, y: cy, q: -qSource },
      ]
    } else {
      return [
        { x: cx - separation / 2, y: cy, q: qSource },
        { x: cx + separation / 2, y: cy, q: qSource },
      ]
    }
  }, [topology, qSource, cx, cy, separation])

  // 2. 计算电场线路径 (SVG Path)
  const fieldLinesPaths = useMemo(() => {
    if (!showFieldLines) return []

    const paths: { d: string; arrow: [number, number, number] | null; color: string }[] = []

    charges.forEach((ch) => {
      const isPos = ch.q > 0
      const emitAngleCount = 16
      const startRadius = CHARGE_RADIUS + 3
      const color = isPos ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge

      for (let i = 0; i < emitAngleCount; i++) {
        const angle = (i * Math.PI * 2) / emitAngleCount
        const sx = ch.x + Math.cos(angle) * startRadius
        const sy = ch.y + Math.sin(angle) * startRadius

        const direction = isPos ? 1 : -1
        let { points, arrowPos } = traceFieldLine(charges, sx, sy, direction as 1 | -1, w, h, mPerPx)
        if (points.length < 2) continue

        if (!isPos) {
          points = [...points].reverse()
          if (points.length > 5) {
            const midIdx = Math.floor(points.length * 0.45)
            const p1 = points[midIdx]
            const p2 = points[midIdx + 1]
            if (p1 && p2) {
              const ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0])
              arrowPos = [p1[0], p1[1], ang]
            }
          }
        }

        const dStr = points
          .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt[0].toFixed(1)},${pt[1].toFixed(1)}`)
          .join(' ')

        paths.push({ d: dStr, arrow: arrowPos, color })
      }
    })

    return paths
  }, [charges, showFieldLines, w, h, mPerPx])

  // 3. 计算等势线网络
  const equipotentialPaths = useMemo(() => {
    if (!showEquipotentials) return { type: 'none' as const, data: [] }

    if (topology === 0 || topology === 1) {
      const paths: { cx: number; cy: number; r: number; opacity: number }[] = []
      const ch = charges[0]
      const count = 10
      for (let i = 1; i <= count; i++) {
        const rPx = 30 + i * 28
        const opacity = Math.max(0.1, Math.min(0.65, 0.7 - (i / count) * 0.55))
        paths.push({ cx: ch.x, cy: ch.y, r: rPx, opacity })
      }
      return { type: 'circle' as const, data: paths }
    }

    const gridStep = 8
    const cols = Math.floor(w / gridStep)
    const rows = Math.floor(h / gridStep)

    const gridPotential: number[][] = []
    for (let r = 0; r <= rows; r++) {
      gridPotential[r] = []
      for (let c = 0; c <= cols; c++) {
        gridPotential[r][c] = potential(charges, c * gridStep, r * gridStep, mPerPx)
      }
    }

    const pPeak = (9000 * qSource) / 0.05
    const contourPotentials: number[] = []
    const contourCount = 14

    if (topology === 2) {
      for (let i = 0; i < contourCount; i++) {
        const t = -1.0 + (2.0 * (i + 0.5)) / contourCount
        contourPotentials.push(pPeak * t * 0.8)
      }
    } else {
      for (let i = 0; i < contourCount; i++) {
        const t = (i + 0.5) / contourCount
        contourPotentials.push(pPeak * 1.5 * t * 0.7)
      }
    }

    const paths: { d: string; opacity: number }[] = []

    contourPotentials.forEach((targetV) => {
      let dStr = ''

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v00 = gridPotential[r][c]
          const v10 = gridPotential[r][c + 1]
          const v01 = gridPotential[r + 1][c]
          const v11 = gridPotential[r + 1][c + 1]

          const cxCell = (c + 0.5) * gridStep
          const cyCell = (r + 0.5) * gridStep
          let tooClose = false
          for (const ch of charges) {
            if (Math.sqrt((cxCell - ch.x) ** 2 + (cyCell - ch.y) ** 2) < CHARGE_RADIUS * 1.1) {
              tooClose = true
              break
            }
          }
          if (tooClose) continue

          const interp = (a: number, b: number) => gridStep * ((targetV - a) / (b - a))
          const x0 = c * gridStep
          const y0 = r * gridStep

          const pts: [number, number][] = []
          if ((v00 < targetV) !== (v10 < targetV)) pts.push([x0 + interp(v00, v10), y0])
          if ((v10 < targetV) !== (v11 < targetV)) pts.push([x0 + gridStep, y0 + interp(v10, v11)])
          if ((v01 < targetV) !== (v11 < targetV)) pts.push([x0 + interp(v01, v11), y0 + gridStep])
          if ((v00 < targetV) !== (v01 < targetV)) pts.push([x0, y0 + interp(v00, v01)])

          if (pts.length === 2) {
            dStr += ` M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} L ${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)}`
          }
        }
      }

      if (dStr) {
        const relativePot = Math.min(1.0, Math.abs(targetV) / pPeak)
        const opacity = Math.max(0.12, Math.min(0.7, 0.15 + relativePot * 0.55))
        paths.push({ d: dStr, opacity })
      }
    })

    return { type: 'path' as const, data: paths }
  }, [topology, charges, showEquipotentials, qSource, w, h, mPerPx])

  // 4. 探针受力与能量分析
  const probePhysics = useMemo(() => {
    const { ex, ey } = electricField(charges, probeX, probeY, mPerPx)
    const eMag = Math.sqrt(ex * ex + ey * ey)

    const fMag = eMag * PROBE_CHARGE // 单位 N
    let forceArrow: [number, number] | null = null

    if (eMag > 1e-1) {
      const dx = ex / eMag
      const dy = ey / eMag
      const arrowLen = Math.max(35, Math.min(90, (fMag / 5) * 45 + 35))
      forceArrow = [dx * arrowLen, dy * arrowLen]
    }

    const phiCurrent = potential(charges, probeX, probeY, mPerPx)

    const pPeak = (9000 * qSource) / 0.05
    const maxPot = (topology === 0 || topology === 3)
      ? pPeak * (topology === 3 ? 1.4 : 1.0)
      : (topology === 2 ? pPeak : 0)
    const minPot = (topology === 1)
      ? -pPeak
      : (topology === 2 ? -pPeak : 0)

    const potRange = maxPot - minPot
    const pctEp = potRange > 0
      ? Math.max(3, Math.min(97, ((phiCurrent - minPot) / potRange) * 100))
      : 50
    const pctEk = 100 - pctEp

    return {
      forceArrow,
      phiCurrent,
      pctEp,
      pctEk,
    }
  }, [charges, probeX, probeY, topology, qSource, mPerPx])

  return {
    charges,
    fieldLinesPaths,
    equipotentialPaths,
    probePhysics,
    mPerPx,
  }
}
