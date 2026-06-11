import type { ForceMotionState } from '@/physics'

export interface ForceMotionViewData {
  state: ForceMotionState
  trajectory: ForceMotionState[]
  chartPoints: Array<{ t: number; F: number; v: number; x: number; y: number }>
}

export interface ForceMotionModeOption {
  value: number
  label: string
  description: string
  category: 'basic' | 'curve' | 'circular' | 'variable' | 'terminal'
}

export interface ForceMotionEnvConfig {
  label: string
  min: number
  max: number
  step: number
  unit: string
}

export interface ForceMotionParamConfig {
  key: string
  label: string
  min: number
  max: number
  step: number
  unit: string
  defaultValue: number
}

export interface ModeParamConfig {
  modeIndex: number
  params: ForceMotionParamConfig[]
}
