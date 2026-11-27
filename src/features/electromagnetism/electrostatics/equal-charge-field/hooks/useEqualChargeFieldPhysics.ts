import { useMemo } from 'react'
import {
  COULOMB_CONSTANT,
  computeEqualChargeSnapshot,
  evaluateEqualChargePoint,
  getEqualChargePair,
  sampleEqualChargeAxisProfile,
  type EqualChargeAxisProfile,
  type EqualChargeConfig,
  type EqualChargeSnapshot,
} from '@/physics'

export interface FieldLineWorld {
  points: Array<{ x: number; y: number }>
  arrowPos: { x: number; y: number; angleDeg: number } | null
  isPositiveSource: boolean
}

export interface EquipotentialContourWorld {
  segments: Array<{ x1: number; y1: number; x2: number; y2: number }>
  opacity: number
}

export interface EqualChargeFieldPhysicsResult {
  config: EqualChargeConfig
  aM: number
  q1C: number
  q2C: number
  snapshot: EqualChargeSnapshot
  profile: EqualChargeAxisProfile
  fieldLines: FieldLineWorld[]
  equipotentials: EquipotentialContourWorld[]
  refFieldMagnitude: number
}

const WORLD_HALF_W = 0.25
const WORLD_HALF_H = 0.098
const START_OFFSET_M = 0.015

function traceWorldFieldLine(
  config: EqualChargeConfig,
  sx: number,
  sy: number,
  direction: 1 | -1,
  aM: number,
): { points: Array<{ x: number; y: number }>; hitChargeIdx: number } {
  const points: Array<{ x: number; y: number }> = [{ x: sx, y: sy }]
  let x = sx
  let y = sy
  const stepM = 0.005
  const maxSteps = 140
  let hitChargeIdx = -1

  for (let i = 0; i < maxSteps; i++) {
    const { Ex, Ey, E } = evaluateEqualChargePoint(config, x, y, 0.002)
    if (E < 1e-3) break

    x += (direction * Ex / E) * stepM
    y += (direction * Ey / E) * stepM

    if (Math.abs(x) > WORLD_HALF_W || Math.abs(y) > WORLD_HALF_H) {
      points.push({ x, y })
      break
    }

    if (Math.hypot(x + aM, y) < START_OFFSET_M * 0.85) {
      hitChargeIdx = 0
      break
    }
    if (Math.hypot(x - aM, y) < START_OFFSET_M * 0.85) {
      hitChargeIdx = 1
      break
    }

    points.push({ x, y })
  }

  return { points, hitChargeIdx }
}

/**
 * 等量电荷场线与图像模型物理计算 Hook（纯物理世界坐标，y↑ 为正，SI 单位）。
 */
export function useEqualChargeFieldPhysics({
  chargeType,
  axis,
  qMicroC,
  halfSepCm,
  time,
  showFieldLines,
  showEquipotentials,
}: {
  chargeType: number
  axis: number
  qMicroC: number
  halfSepCm: number
  time: number
  showFieldLines: boolean
  showEquipotentials: boolean
}): EqualChargeFieldPhysicsResult {
  const config = useMemo<EqualChargeConfig>(
    () => ({ chargeType, axis, qMicroC, halfSepCm }),
    [chargeType, axis, qMicroC, halfSepCm],
  )

  const pair = useMemo(() => getEqualChargePair(config), [config])

  const snapshot = useMemo(
    () => computeEqualChargeSnapshot(config, time),
    [config, time],
  )

  const profile = useMemo(
    () => sampleEqualChargeAxisProfile(config, 160),
    [config],
  )

  const fieldLines = useMemo<FieldLineWorld[]>(() => {
    if (!showFieldLines) return []

    const charges = [
      { x: -pair.aM, y: 0, q: pair.q1C, idx: 0 },
      { x: pair.aM, y: 0, q: pair.q2C, idx: 1 },
    ]
    const result: FieldLineWorld[] = []
    const lineCount = 12

    for (const ch of charges) {
      const isPos = ch.q >= 0
      const direction: 1 | -1 = isPos ? 1 : -1

      for (let i = 0; i < lineCount; i++) {
        const ang = (Math.PI * 2 * i) / lineCount
        const sx = ch.x + START_OFFSET_M * Math.cos(ang)
        const sy = ch.y + START_OFFSET_M * Math.sin(ang)

        const traced = traceWorldFieldLine(config, sx, sy, direction, pair.aM)
        if (traced.points.length < 3) continue

        // 等量异种：从 +Q 已画出连向 -Q 的场线，避免从 -Q 再逆向重绘一遍
        if (!isPos && pair.chargeType === 0 && traced.hitChargeIdx === 0) {
          continue
        }

        const ordered = isPos ? traced.points : [...traced.points].reverse()
        let arrowPos: FieldLineWorld['arrowPos'] = null
        if (ordered.length > 4) {
          const mid = Math.floor(ordered.length * 0.48)
          const p1 = ordered[mid]
          const p2 = ordered[mid + 1]
          if (p1 && p2) {
            // SVG 屏幕系 y↓，故取 -(p2.y - p1.y) 计算屏幕旋转角
            const angleDeg = (Math.atan2(-(p2.y - p1.y), p2.x - p1.x) * 180) / Math.PI
            arrowPos = { x: p1.x, y: p1.y, angleDeg }
          }
        }

        result.push({
          points: ordered,
          arrowPos,
          isPositiveSource: isPos,
        })
      }
    }

    return result
  }, [config, pair, showFieldLines])

  const equipotentials = useMemo<EquipotentialContourWorld[]>(() => {
    if (!showEquipotentials) return []

    const stepX = 0.008
    const stepY = 0.006
    const cols = Math.floor((2 * WORLD_HALF_W) / stepX)
    const rows = Math.floor((2 * WORLD_HALF_H) / stepY)

    const gridPhi: number[][] = []
    for (let r = 0; r <= rows; r++) {
      const y = -WORLD_HALF_H + r * stepY
      gridPhi[r] = []
      for (let c = 0; c <= cols; c++) {
        const x = -WORLD_HALF_W + c * stepX
        gridPhi[r][c] = evaluateEqualChargePoint(config, x, y, 0.004).phi
      }
    }

    const pPeak = (COULOMB_CONSTANT * Math.abs(pair.q1C)) / 0.018
    const targets: number[] = []
    if (pair.chargeType === 0) {
      for (let i = 0; i < 11; i++) {
        const t = -0.75 + (1.5 * i) / 10
        targets.push(pPeak * t)
      }
    } else if (pair.chargeType === 1) {
      for (let i = 1; i <= 9; i++) {
        targets.push(pPeak * (i / 9) * 1.15)
      }
    } else {
      for (let i = 1; i <= 9; i++) {
        targets.push(-pPeak * (i / 9) * 1.15)
      }
    }

    const contours: EquipotentialContourWorld[] = []

    for (const targetV of targets) {
      const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x0 = -WORLD_HALF_W + c * stepX
          const y0 = -WORLD_HALF_H + r * stepY
          const cxCell = x0 + stepX * 0.5
          const cyCell = y0 + stepY * 0.5

          if (
            Math.hypot(cxCell + pair.aM, cyCell) < START_OFFSET_M * 0.95 ||
            Math.hypot(cxCell - pair.aM, cyCell) < START_OFFSET_M * 0.95
          ) {
            continue
          }

          const v00 = gridPhi[r][c]
          const v10 = gridPhi[r][c + 1]
          const v01 = gridPhi[r + 1][c]
          const v11 = gridPhi[r + 1][c + 1]

          const interpX = (a: number, b: number) => stepX * ((targetV - a) / (b - a))
          const interpY = (a: number, b: number) => stepY * ((targetV - a) / (b - a))

          const pts: Array<[number, number]> = []
          if ((v00 < targetV) !== (v10 < targetV)) pts.push([x0 + interpX(v00, v10), y0])
          if ((v10 < targetV) !== (v11 < targetV)) pts.push([x0 + stepX, y0 + interpY(v10, v11)])
          if ((v01 < targetV) !== (v11 < targetV)) pts.push([x0 + interpX(v01, v11), y0 + stepY])
          if ((v00 < targetV) !== (v01 < targetV)) pts.push([x0, y0 + interpY(v00, v01)])

          if (pts.length === 2) {
            segments.push({
              x1: pts[0][0],
              y1: pts[0][1],
              x2: pts[1][0],
              y2: pts[1][1],
            })
          }
        }
      }

      if (segments.length > 0) {
        const rel = Math.min(1, Math.abs(targetV) / Math.max(pPeak, 1))
        contours.push({
          segments,
          opacity: Math.abs(targetV) < 1e-3 ? 0.85 : Math.max(0.18, Math.min(0.68, 0.2 + rel * 0.48)),
        })
      }
    }

    return contours
  }, [config, pair, showEquipotentials])

  const refFieldMagnitude =
    (2 * COULOMB_CONSTANT * Math.abs(pair.q1C)) / Math.max(1e-5, pair.aM * pair.aM)

  return {
    config,
    aM: pair.aM,
    q1C: pair.q1C,
    q2C: pair.q2C,
    snapshot,
    profile,
    fieldLines,
    equipotentials,
    refFieldMagnitude,
  }
}
