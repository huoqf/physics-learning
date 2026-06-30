import { calculateVelocitySelectorTrajectory } from '@/physics'
import { createSceneScale } from '@/scene'
import type { SceneConfig, SceneScale } from '@/scene'

export interface VelocitySelectorParams {
  mode: number
  v0: number
  B: number
  E: number
  qOverM: number
  q: number
  keepTrack: boolean
  showElectricField: boolean
  showHandRule: boolean
}

export interface ParticleState {
  id: number
  tEmit: number
  v0: number
  q: number
}

export interface VelocitySelectorLayout {
  cxIn: number
  cy: number
  scaleX: number
  scaleY: number
  xPlatePx: number
  wPlatePx: number
  gapPlatePx: number
  sceneScale: SceneScale
}

export interface ChartPoint {
  v: number
  y: number | null
}

export interface VelocitySelectorChartData {
  points: ChartPoint[]
  currentY: number
  vFilter: number
}

export interface VelocitySelectorChartGeometry {
  width: number
  height: number
  xOffset: number
  yOffset: number
  toChartX: (v: number) => number
  toChartY: (yVal: number) => number
}

export interface MagneticFieldSign {
  id: string
  x: number
  y: number
}

export interface HandPoseParams {
  thumbDir: { x: number; y: number }
  middleDir: { x: number; y: number }
  handActive: boolean
}

export const VELOCITY_SELECTOR_PHYSICS = {
  plateLength: 5.0,
  plateGap: 2.0,
  mass: 1.0,
} as const

export function normalizeVelocitySelectorParams(params: Record<string, number>): VelocitySelectorParams {
  return {
    mode: params.mode ?? 0,
    v0: params.v0 ?? 10.0,
    B: params.B ?? 1.0,
    E: params.E ?? 10.0,
    qOverM: params.qOverM ?? 1.0,
    q: params.q ?? 1.0,
    keepTrack: params.keepTrack === 1,
    showElectricField: params.showElectricField === 1,
    showHandRule: params.showHandRule !== 0,
  }
}

export function buildVelocitySelectorLayout(
  canvasSize: { width: number; height: number },
  mode: number,
): VelocitySelectorLayout {
  const { plateLength, plateGap } = VELOCITY_SELECTOR_PHYSICS
  const cxIn = canvasSize.width * 0.20
  const cy = mode === 0 ? canvasSize.height * 0.50 : canvasSize.height * 0.68
  const scaleX = (canvasSize.width * 0.65) / plateLength
  const scaleY = (canvasSize.height * 0.20) / plateGap
  const sceneConfig: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: cxIn,
    originY: cy,
    worldWidth: canvasSize.width / scaleX,
    worldHeight: canvasSize.height / scaleY,
    refMagnitudes: {
      force: 20,
      velocity: 20,
    },
  }

  return {
    cxIn,
    cy,
    scaleX,
    scaleY,
    xPlatePx: cxIn,
    wPlatePx: plateLength * scaleX,
    gapPlatePx: plateGap * scaleY,
    sceneScale: createSceneScale(sceneConfig),
  }
}

export function buildVelocitySelectorChartData({
  mode,
  E,
  B,
  qOverM,
  v0,
  showElectricField,
}: Pick<VelocitySelectorParams, 'mode' | 'E' | 'B' | 'qOverM' | 'v0' | 'showElectricField'>): VelocitySelectorChartData | null {
  if (mode !== 1) return null

  const { plateLength, plateGap, mass } = VELOCITY_SELECTOR_PHYSICS
  const points: ChartPoint[] = []
  const vMin = 1.0
  const vMax = 25.0
  const stepCount = 80
  const vFilter = B > 0.01 ? E / B : 0

  for (let i = 0; i <= stepCount; i++) {
    const v = vMin + ((vMax - vMin) * i) / stepCount
    const temp = calculateVelocitySelectorTrajectory(
      qOverM,
      mass,
      v,
      showElectricField ? -E : 0,
      -B,
      plateLength,
      plateGap,
      0,
    )

    let yVal: number | null = null
    if (!temp.hitsPlate) {
      const res = calculateVelocitySelectorTrajectory(
        qOverM,
        mass,
        v,
        showElectricField ? -E : 0,
        -B,
        plateLength,
        plateGap,
        temp.tOut,
      )
      yVal = res.point.y
    }
    points.push({ v, y: yVal })
  }

  const tempCurrent = calculateVelocitySelectorTrajectory(
    qOverM,
    mass,
    v0,
    showElectricField ? -E : 0,
    -B,
    plateLength,
    plateGap,
    0,
  )
  const tCurrentTarget = tempCurrent.tHit !== null ? tempCurrent.tHit : tempCurrent.tOut
  const currentRes = calculateVelocitySelectorTrajectory(
    qOverM,
    mass,
    v0,
    showElectricField ? -E : 0,
    -B,
    plateLength,
    plateGap,
    tCurrentTarget,
  )

  return { points, currentY: currentRes.point.y, vFilter }
}

export function buildVelocitySelectorChartGeometry(
  canvasSize: { height: number },
  layout: Pick<VelocitySelectorLayout, 'wPlatePx' | 'cxIn'>,
): VelocitySelectorChartGeometry {
  const width = layout.wPlatePx
  const height = canvasSize.height * 0.20
  const xOffset = layout.cxIn
  const yOffset = canvasSize.height * 0.08
  const toChartX = (v: number) => {
    const vMin = 1.0
    const vMax = 25.0
    return xOffset + ((v - vMin) / (vMax - vMin)) * width
  }
  const toChartY = (yVal: number) => {
    const halfH = height / 2
    return yOffset + halfH - (yVal / (VELOCITY_SELECTOR_PHYSICS.plateGap / 2)) * halfH
  }
  return { width, height, xOffset, yOffset, toChartX, toChartY }
}

export function buildVelocitySelectorChartPath(
  chartData: VelocitySelectorChartData,
  chartGeometry: Pick<VelocitySelectorChartGeometry, 'toChartX' | 'toChartY'>,
): string {
  let path = ''
  let isDrawing = false

  chartData.points.forEach((p) => {
    if (p.y === null) {
      isDrawing = false
      return
    }

    const sx = chartGeometry.toChartX(p.v)
    const sy = chartGeometry.toChartY(p.y)

    if (!isDrawing) {
      path += ` M ${sx.toFixed(1)} ${sy.toFixed(1)}`
      isDrawing = true
    } else {
      path += ` L ${sx.toFixed(1)} ${sy.toFixed(1)}`
    }
  })

  return path.trim()
}

export function buildMagneticFieldSigns({
  mode,
  B,
  cy,
  gapPlatePx,
  wPlatePx,
  canvasHeight,
  cxIn,
}: {
  mode: number
  B: number
  cy: number
  gapPlatePx: number
  wPlatePx: number
  canvasHeight: number
  cxIn: number
}): MagneticFieldSign[] {
  if (B <= 0.01) return []

  const cols = 8
  const rows = mode === 0 ? 5 : 3
  const startX = cxIn + 15
  const endX = cxIn + wPlatePx - 15
  const stepX = (endX - startX) / Math.max(1, cols - 1)
  const startY = mode === 0 ? cy - canvasHeight * 0.24 : cy - gapPlatePx / 2 + 15
  const endY = mode === 0 ? cy + canvasHeight * 0.24 : cy + gapPlatePx / 2 - 15
  const stepY = (endY - startY) / Math.max(1, rows - 1)
  const signs: MagneticFieldSign[] = []

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      signs.push({ id: `b-cross-${i}-${j}`, x: startX + i * stepX, y: startY + j * stepY })
    }
  }

  return signs
}

export function buildVelocitySelectorHandPose({
  mode,
  singleParticle,
  q,
  time,
}: {
  mode: number
  singleParticle: ReturnType<typeof calculateVelocitySelectorTrajectory> | null
  q: number
  time: number
}): HandPoseParams {
  let thumbDir = { x: 0, y: -1 }
  let middleDir = { x: 1, y: 0 }
  let handActive = false

  if (mode === 0 && singleParticle) {
    const { vx, vy, fx, fy } = singleParticle.point
    const qSign = q >= 0 ? 1 : -1
    handActive = time > 0

    const magV = Math.hypot(vx, vy)
    if (magV > 1e-6) {
      middleDir = { x: qSign * vx, y: -qSign * vy }
    } else {
      middleDir = { x: qSign, y: 0 }
    }

    const magF = Math.hypot(fx, fy)
    if (magF > 1e-6) {
      thumbDir = { x: fx, y: -fy }
    } else {
      thumbDir = { x: 0, y: -qSign }
    }
  } else if (mode === 1) {
    handActive = true
    thumbDir = { x: 0, y: -1 }
    middleDir = { x: 1, y: 0 }
  }

  return { thumbDir, middleDir, handActive }
}
