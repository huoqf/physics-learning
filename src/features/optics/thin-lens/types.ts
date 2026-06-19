export type ThinLensMode = 0 | 1

export interface ThinLensState {
  mode: ThinLensMode
  isConcave: boolean
  u: number
  f: number
  L: number
}

export interface ChartPoint {
  x: number
  y: number
}

export interface ConjugateResult {
  u1: number
  v1: number
  u2: number
  v2: number
  valid: boolean
}

export interface ThinLensPhysicsResult {
  v: number
  m: number
  type: 'real-inverted' | 'virtual-upright' | 'none'
  valid: boolean
  chartData: ChartPoint[]
  currentChartPoint: ChartPoint
  conjugate: ConjugateResult
  totalDistance: number
}
