export type ForceMotionMode =
  | 'balance'
  | 'uniform-accel-line'
  | 'uniform-decel-line'
  | 'constant-angle-curve'
  | 'projectile-like'
  | 'uniform-circular'
  | 'variable-circular'
  | 'simple-harmonic'
  | 'linear-variable-force'
  | 'terminal-variable-force'

export interface ForceMotionState {
  mode: ForceMotionMode
  t: number
  x: number
  y: number
  vx: number
  vy: number
  v: number
  ax: number
  ay: number
  a: number
  Fx: number
  Fy: number
  F: number
  p: number
  work: number
  impulse: number
  chartValueF: number
  chartValueV: number
  chartValueX: number
  slopeTextF: string
  slopeTextV: string
  slopeTextX: string
  areaTextF: string
  areaTextV: string
  areaTextX: string
  terminalVelocity?: number
  isTerminal: boolean
  pauseReason?: 'boundary' | 'terminal' | 'brake' | 'none'
}

export interface ForceMotionSample {
  t: number
  F: number
  v: number
  x: number
  y: number
}

export interface ModeResult {
  x: number
  y: number
  vx: number
  vy: number
  ax: number
  ay: number
  Fx: number
  Fy: number
  work: number
  impulse: number
  terminalVelocity?: number
  isTerminal: boolean
  pauseReason?: ForceMotionState['pauseReason']
}
