import { EARTH_RADIUS } from '@/physics/constants'

export const LAYOUT = {
  designWidth: 700,
  designHeight: 650,
  earth: { radiusPx: 70 },
  satellite: { size: 24 },
  mode0: {
    rMin: 6.37,
    rMax: 22.0,
    rNear: EARTH_RADIUS,
    rMedium: 13.0e6,
    rSync: 21.0e6,
    timeScale: 500,
  },
  mode1: {
    rLaunchRatio: 1.05,
    timeScale: 400,
    maxPhysicsTime: 7200,
    dt: 0.05,
    launchDuration: 3,
    turnDuration: 5,
    orbitEntryTime: 8,
    orbitEndAngle: Math.PI / 2,
  },
  card: {
    scaleFactor: 1.5,
    base: { width: 225, height: 145, padLeft: 42, padRight: 18, padTop: 28, padBottom: 28 },
    canvasRatio: 0.38,
    canvasRatioH: 0.36,
    x: 20,
    y: 20,
  },
  orbit: {
    background: { strokeWidth: 0.8, strokeDasharray: '4,4', opacity: 0.25 },
    active: { strokeWidth: 1.5, strokeDasharray: '5,3', opacity: 0.6 },
    predict: { strokeWidth: 1.2, strokeDasharray: '4,4', opacity: 0.6 },
    history: { strokeWidth: 1.2, opacity: 0.8 },
    reference: { strokeWidth: 1.5, opacity: 0.4 },
  }
} as const

export const VTCARD = {
  scaleFactor: LAYOUT.card.scaleFactor,
  base: { width: 240, height: 160, padLeft: 34, padRight: 12, padTop: 30, padBottom: 26 },
  canvasRatio: 0.38,
  canvasRatioH: 0.38,
}
