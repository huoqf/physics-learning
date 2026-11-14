import { describe, expect, it } from 'vitest'

// Batch 4：力学与引力
import { getAccelerationCriticalTimes } from '../kinematics/acceleration'
import {
  getUniformAccelerationCriticalTimes,
  getKinematicsAdvancedCriticalTimes,
} from '../kinematics/base'
import { getInclinedPlaneCriticalTimes } from '../inclined_plane'
import {
  getNewtonSecondCriticalTimes,
  getWeightlessnessCriticalTimes,
} from '../dynamics/dynamics-advanced'
import { getSystemIsolatedCriticalTimes } from '../systemIsolated'
import { getConnectedBodiesCriticalTimes } from '../dynamics/connected-body'
import { getForceMotionCriticalTimes } from '../forceMotion'
import { FORCE_MOTION_MAX_TIME } from '@/features/mechanics/force-motion/forceMotionLayout'
import { getCircularMotionCriticalTimes, getCentripetalCriticalTimes } from '../kinematics/formulas'
import { getCircularModelsCriticalTimes } from '../circularModels'
import { getSatelliteCriticalTimes } from '../celestial'
import { getBinaryStarsCriticalTimes } from '../multiStar'
import { getRelativityCriticalTimes } from '../relativity'
import { getWorkCriticalTimes } from '../work'
import { getPowerCriticalTimes } from '../power'
import { getPotentialEnergyCriticalTimes } from '../potentialEnergy'

// Batch 5：动量 + 实验 + 振动与波
import { getMomentumCriticalTimes } from '../momentum'
import { getImpulseConceptCriticalTimes } from '../impulse'
import { getMomentumTheoremCriticalTimes } from '../momentumTheorem'
import {
  getMechanicsExperimentBaseCriticalTimes,
  getExperimentMechanicalEnergyCriticalTimes,
} from '../experimentMechanics'
import { getExperimentNewtonSecondCriticalTimes } from '../experimentNewtonSecond'
import { getExperimentPendulumCriticalTimes } from '../experimentPendulum'
import {
  getMechanicalWaveCriticalTimes,
  getWaveDiffractionCriticalTimes,
  getWaveInterferenceCriticalTimes,
} from '../wave'
import { getDopplerCriticalTimes } from '../vibration/doppler'
import { getForcedResonanceCriticalTimes } from '../vibration/forcedResonance'

// Batch 6：电磁感应 + 磁场 + 热光近代
import {
  FARADAY_SCENE_CONSTANTS,
  LENZS_PLAY_DURATION_S,
  computeFaradayMagnetFlux,
  getFaradayLawCriticalTimes,
  getLenzsLawCriticalTimes,
  getCuttingEMFCriticalTimes,
} from '../induction'
import { getAmpereForceCriticalTimes } from '../magnetism/ampereForce'
import { getLorentzForceCriticalTimes } from '../magnetism/velocitySelector'
import { getMagneticCircularGeomCriticalTimes } from '../magnetism/circularGeometry'
import { ENERGY_FLOW_TIMING, getEnergyFlowCriticalTimes } from '../energyFlow'
import { CYCLE_DURATION, getFirstLawCriticalTimes } from '../firstLaw'
import { LASER_HEAT_DEFAULTS, getLaserCriticalTimes } from '../laser'
import { getNuclearDecayCriticalTimes } from '../nuclearDecay'
import { getNuclearReactionCriticalTimes } from '../chainReaction'

function expectGridAligned(times: number[], maxTime: number) {
  let prev = 0
  for (const t of times) {
    expect(t).toBeGreaterThan(0)
    expect(t).toBeLessThanOrEqual(maxTime)
    expect(Math.round(t * 100) / 100).toBeCloseTo(t, 10)
    expect(t).toBeGreaterThan(prev)
    prev = t
  }
}

describe('Batch 4-6 物理层临界时刻真源函数', () => {
  it('力学与引力（Batch 4）均对齐 0.01s 网格并按工况切换', () => {
    const acc = getAccelerationCriticalTimes({ vA: 200 }, 30)
    expect(acc).toHaveLength(1)
    expectGridAligned(acc.map((p) => p.time), 30)

    const uacc = getUniformAccelerationCriticalTimes({ v0: 4, a: -2, tTotal: 5 })
    expect(uacc.length).toBeGreaterThan(0)
    expectGridAligned(uacc.map((p) => p.time), 5)

    const kinAdv = getKinematicsAdvancedCriticalTimes({ mode: 0, vA: 6, vB: 2, x0: 12, aA: 0, aB: 1 })
    expectGridAligned(kinAdv.map((p) => p.time), 30)

    const inc = getInclinedPlaneCriticalTimes({ angle: 30, mu: 0.2, v0: 0, m: 2 })
    expectGridAligned(inc.map((p) => p.time), 30)

    const n2 = getNewtonSecondCriticalTimes({ mode: 0, F: 10, m: 2, mu: 0.2 })
    expectGridAligned(n2.map((p) => p.time), 30)

    const wl = getWeightlessnessCriticalTimes({ mode: 0, a: 2 })
    expectGridAligned(wl.map((p) => p.time), 30)

    const sys = getSystemIsolatedCriticalTimes({ mode: 0, m: 1, M: 3, theta: 30, a_wedge: 1 })
    expectGridAligned(sys.map((p) => p.time), 30)

    const cb = getConnectedBodiesCriticalTimes({ m1: 2, m2: 3, F: 15, mu: 0.1, advancedMode: 0 })
    expect(cb.length).toBe(1)
    expectGridAligned(cb.map((p) => p.time), 30)
    expect(getConnectedBodiesCriticalTimes({ m1: 2, m2: 3, F: 0, mu: 0.5 })).toEqual([])

    const fm = getForceMotionCriticalTimes({ F: 10, m: 2, mu: 0.2, v0: 0 }, FORCE_MOTION_MAX_TIME)
    expectGridAligned(fm.map((p) => p.time), FORCE_MOTION_MAX_TIME)

    const circ = getCircularMotionCriticalTimes({ omega: 2 })
    expectGridAligned(circ.map((p) => p.time), 30)

    const cent = getCentripetalCriticalTimes({ v: 3, r: 1.5 })
    expectGridAligned(cent.map((p) => p.time), 30)

    const cm = getCircularModelsCriticalTimes({ modelType: 0 })
    expectGridAligned(cm.map((p) => p.time), 30)

    const sat = getSatelliteCriticalTimes({ altitudeFactor: 1 })
    expectGridAligned(sat.map((p) => p.time), 30)

    const bin = getBinaryStarsCriticalTimes({ m1Ratio: 2, distance: 4 })
    expectGridAligned(bin.map((p) => p.time), 30)

    const rel = getRelativityCriticalTimes({ beta: 0.8 })
    expectGridAligned(rel.map((p) => p.time), 30)

    const work = getWorkCriticalTimes({ F: 10, angle: 0, s: 5, m: 2 })
    expectGridAligned(work.map((p) => p.time), 30)

    const power = getPowerCriticalTimes({ mode: 0, P_rated: 60000, F_drive: 4000, m: 1500, f_drag: 1000 })
    expect(power.length).toBeGreaterThan(0)
    expectGridAligned(power.map((p) => p.time), 30)

    const pe = getPotentialEnergyCriticalTimes({ mode: 0, h: 10, m: 2 })
    expectGridAligned(pe.map((p) => p.time), 30)
  })

  it('动量、实验与振动波（Batch 5）覆盖主要工况与边界', () => {
    expect(getMomentumCriticalTimes({ advancedMode: 0 })).toEqual([])
    const mom = getMomentumCriticalTimes({ advancedMode: 1, mA: 3, vA: 5, mB: 2, vB: -3 })
    expect(mom.length).toBeGreaterThan(0)
    expectGridAligned(mom.map((p) => p.time), 30)

    const impC = getImpulseConceptCriticalTimes({ v0: 4, F: 2, m: 1 })
    expectGridAligned(impC.map((p) => p.time), 30)

    const impT = getMomentumTheoremCriticalTimes({ mode: 0, m: 1, v0: 5, dt: 0.5 })
    expectGridAligned(impT.map((p) => p.time), 30)

    const expBase = getMechanicsExperimentBaseCriticalTimes({ h: 2 })
    expectGridAligned(expBase.map((p) => p.time), 30)

    const expEng = getExperimentMechanicalEnergyCriticalTimes({ mass: 0.2 })
    expectGridAligned(expEng.map((p) => p.time), 30)

    const expN2 = getExperimentNewtonSecondCriticalTimes({ cartMass: 0.3, weightMass: 0.05 })
    expectGridAligned(expN2.map((p) => p.time), 30)

    const expPen = getExperimentPendulumCriticalTimes({ l_line: 1.0 })
    expect(expPen.length).toBeGreaterThan(0)
    expectGridAligned(expPen.map((p) => p.time), 120)

    const mw = getMechanicalWaveCriticalTimes({ f: 1.0, v: 2 }, 40)
    expectGridAligned(mw.map((p) => p.time), 40)

    const diff = getWaveDiffractionCriticalTimes({}, 60)
    expectGridAligned(diff.map((p) => p.time), 60)

    const interf = getWaveInterferenceCriticalTimes({ a: 12 }, 60)
    expectGridAligned(interf.map((p) => p.time), 60)

    const dop = getDopplerCriticalTimes({ sourceV: 2 })
    expectGridAligned(dop.map((p) => p.time), 30)

    const res = getForcedResonanceCriticalTimes({ driveFreq: 1.0, naturalFreq: 1.0 })
    expectGridAligned(res.map((p) => p.time), 30)
  })

  it('电磁学与热光近代（Batch 6）真源计算正确且模式切换自洽', () => {
    const far0 = getFaradayLawCriticalTimes({ mode: 0, magnetV: 140 }, FARADAY_SCENE_CONSTANTS.chartDuration)
    expect(far0.length).toBeGreaterThan(0)
    expectGridAligned(far0.map((p) => p.time), FARADAY_SCENE_CONSTANTS.chartDuration)
    // 磁通量峰值时刻，磁铁中心应恰好位于线圈中心 coilX（220），两侧磁通量均严格小于中心峰值
    const coilCenteredLeftPx = FARADAY_SCENE_CONSTANTS.coilX - FARADAY_SCENE_CONSTANTS.magnetLen / 2
    const phiAtCoilCenter = computeFaradayMagnetFlux(coilCenteredLeftPx, 1.2)
    expect(phiAtCoilCenter).toBeGreaterThan(computeFaradayMagnetFlux(coilCenteredLeftPx - 20, 1.2))
    expect(phiAtCoilCenter).toBeGreaterThan(computeFaradayMagnetFlux(coilCenteredLeftPx + 20, 1.2))
    expect(getFaradayLawCriticalTimes({ mode: 1, dBdt: 0.5, B0: 0 })).toEqual([])

    const lenz = getLenzsLawCriticalTimes({}, LENZS_PLAY_DURATION_S)
    expect(lenz.length).toBe(2)
    expectGridAligned(lenz.map((p) => p.time), LENZS_PLAY_DURATION_S)

    const cut0 = getCuttingEMFCriticalTimes({ mode: 0, v: 2.0 }, 30)
    expect(cut0).toHaveLength(1)
    expect(cut0[0].time).toBe(5)
    const cut1 = getCuttingEMFCriticalTimes({ mode: 1, B: 1.5, L: 1.0, R: 2.0, F_ext: 2.0, m: 0.2 }, 30)
    expect(cut1.length).toBeGreaterThanOrEqual(1)
    expectGridAligned(cut1.map((p) => p.time), 30)

    const amp = getAmpereForceCriticalTimes({ mode: 0, I: 2, B: 1, L: 4 }, 30)
    expect(amp).toHaveLength(1)
    expectGridAligned(amp.map((p) => p.time), 30)

    const lor0 = getLorentzForceCriticalTimes({ mode: 0, q: 1, v0: 10, B: 1 }, 30)
    expect(lor0.length).toBeGreaterThanOrEqual(1)
    expectGridAligned(lor0.map((p) => p.time), 30)
    expect(getLorentzForceCriticalTimes({ mode: 1, q: 1, v0: 10, B: 1 }, 30)).toEqual([])

    const magGeom = getMagneticCircularGeomCriticalTimes({ boundaryType: 0, particleSign: 1, velocity: 3, angle: 60, magneticB: 1 })
    expect(magGeom.length).toBe(2)
    expect(magGeom[1].autoPause).toBe(true)

    const ef = getEnergyFlowCriticalTimes({ scene: 0, pv: 200, load: 90, cap: 400 }, ENERGY_FLOW_TIMING.cycleS)
    expect(ef.length).toBeGreaterThanOrEqual(3)
    expectGridAligned(ef.map((p) => p.time), ENERGY_FLOW_TIMING.cycleS)

    expect(getFirstLawCriticalTimes({ mode: 0 }, CYCLE_DURATION)).toEqual([])
    const fl = getFirstLawCriticalTimes({ mode: 1 }, CYCLE_DURATION)
    expect(fl.map((p) => p.time)).toEqual([5, 10, 15, 20])

    expect(getLaserCriticalTimes({ mode: 0 })).toEqual([])
    const laser2 = getLaserCriticalTimes({ mode: 2, material: 2, laserPower: 80, focusDiameter: 20 }, LASER_HEAT_DEFAULTS.maxSimTimeS)
    expect(laser2.length).toBeGreaterThanOrEqual(1)
    expectGridAligned(laser2.map((p) => p.time), LASER_HEAT_DEFAULTS.maxSimTimeS)

    expect(getNuclearDecayCriticalTimes({ mode: 0 })).toEqual([])
    const nd1 = getNuclearDecayCriticalTimes({ mode: 1, fieldType: 0, bField: 1.5, initVelocity: 4, showObstacles: 1 }, 30)
    expect(nd1.length).toBeGreaterThanOrEqual(2)
    expectGridAligned(nd1.map((p) => p.time), 30)

    const nr0 = getNuclearReactionCriticalTimes({ mode: 0, showMassDefectWeight: 1 }, 30)
    expect(nr0).toHaveLength(3)
    expectGridAligned(nr0.map((p) => p.time), 30)
    const nr1 = getNuclearReactionCriticalTimes({ mode: 1, reactionType: 2 }, 30)
    expect(nr1).toHaveLength(3)
    expectGridAligned(nr1.map((p) => p.time), 30)
  })
})
