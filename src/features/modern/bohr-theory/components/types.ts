import { MODERN_COLORS } from '@/theme/physics/colors'

export interface IncidentParticle {
  x: number
  y: number
  vx: number
  vy: number
  energy: number
  type: 'photon' | 'electron'
  active: boolean
  hasCollided: boolean
}

export interface OutgoingPhoton {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  energy: number
  active: boolean
}

export interface CascadeStep {
  from: number
  to: number
  color: string
  e: number
}

export interface TransitionLine {
  from: number
  to: number
  color: string
  life: number
}

export interface CollisionCard {
  show: boolean
  inE: number
  absorbed: number
  remain: number
  lvl: number
}

export type AtomState = 'orbiting' | 'excited' | 'transitioning' | 'ionized'

export interface ExcitationSimProps {
  isPlaying: boolean
  time: number
  atomQuantity: number
  excitationType: number
  incidentEnergy: number
  launchTrigger: number
  clearTrigger: number
  updateParam: (key: string, value: number) => void
}

export const ENERGY_MAP: Record<string, { e: number; color: string }> = {
  '4->3': { e: 0.66, color: MODERN_COLORS.photonInfrared },
  '4->2': { e: 2.55, color: '#06b6d4' },
  '4->1': { e: 12.75, color: MODERN_COLORS.photonUltraviolet },
  '3->2': { e: 1.89, color: MODERN_COLORS.photonInfrared },
  '3->1': { e: 12.09, color: MODERN_COLORS.photonUltraviolet },
  '2->1': { e: 10.20, color: MODERN_COLORS.photoelectron },
}
