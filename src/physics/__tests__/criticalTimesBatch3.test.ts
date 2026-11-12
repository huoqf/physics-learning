import { describe, it, expect } from 'vitest'
import { computeChaseMeetingMaxTime, getChaseMeetingCriticalTimes } from '../kinematics/acceleration'
import { getFreeFallCriticalTimes } from '../kinematics/trajectory'
import { getVerticalThrowCriticalTimes } from '../kinematics/vertical-throw'
import { getKeplerCriticalTimes } from '../celestial'
import { getKineticEnergyCriticalTimes } from '../kineticEnergy'
import { getMomentumConservationCriticalTimes } from '../momentumConservation'
import { getExperimentMomentumCriticalTimes } from '../experimentMomentum'
import { getChargeInEFieldCriticalTimes } from '../electrostatics'
import { getACGenerationCriticalTimes } from '../acCircuit'
import { getACValuesCriticalTimes } from '../rmsCalculator'
import { getSelfInductionCriticalTimes } from '../electromagnetism/selfInduction'
import {
  getSimpleHarmonicCriticalTimes,
  getSimplePendulumCriticalTimes,
} from '../oscillation'
import {
  getDecayMagneticOrbitCriticalTimes,
  getNuclearHalfLifeCriticalTimes,
} from '../nuclearDecay'
import { CRITICAL_TIME_STEP } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'

function expectAlignedAndOrdered(points: CriticalTimePoint[], maxTime: number) {
  expect(points.length).toBeGreaterThan(0)
  let prev = -Infinity
  for (const pt of points) {
    expect(pt.time).toBeGreaterThan(0)
    expect(pt.time).toBeLessThanOrEqual(maxTime)
    const steps = Math.round(pt.time / CRITICAL_TIME_STEP)
    expect(pt.time).toBeCloseTo(steps * CRITICAL_TIME_STEP, 10)
    expect(pt.time).toBeGreaterThanOrEqual(prev)
    prev = pt.time
  }
}

describe('第三批（P1 14 页）criticalTimes 物理层真源验证', () => {
  it('1. 自由落体：真空同步落地与常压分化落地、滴水法周期落地', () => {
    const vacuum = getFreeFallCriticalTimes({ pressure: 0, g: 9.8 }, 30)
    expect(vacuum).toHaveLength(1)
    expect(vacuum[0].label).toContain('同时落地')
    expectAlignedAndOrdered(vacuum, 30)

    const air = getFreeFallCriticalTimes({ pressure: 1, g: 9.8 }, 30)
    expect(air).toHaveLength(2)
    expect(air[0].label).toContain('先落地')
    expect(air[1].label).toContain('后落地')
    expectAlignedAndOrdered(air, 30)

    const drip = getFreeFallCriticalTimes({ advancedMode: 1, dripPeriod: 0.5, latitude: 45, altitude: 0 }, 30)
    expect(drip).toHaveLength(2)
    expectAlignedAndOrdered(drip, 30)
    const dripHigh = getFreeFallCriticalTimes({ advancedMode: 1, dripPeriod: 0.5, latitude: 45, altitude: 10 }, 30)
    expect(Math.abs(dripHigh[0].time - drip[0].time)).toBeLessThanOrEqual(0.02)
  })

  it('2. 竖直上抛：最高点必启 autoPause，进阶目标高度生成双解点', () => {
    const basic = getVerticalThrowCriticalTimes({ v0: 15, g: 9.8, airResistance: 0 }, 30)
    expectAlignedAndOrdered(basic, 30)
    const peak = basic.find((p) => p.label.includes('最高点'))
    expect(peak?.autoPause).toBe(true)

    const adv = getVerticalThrowCriticalTimes(
      { v0: 15, g: 9.8, advancedMode: 1, targetHeight: 5 },
      30,
    )
    expect(adv.length).toBeGreaterThanOrEqual(4)
    expectAlignedAndOrdered(adv, 30)
  })

  it('3. 开普勒定律：远日点 T/2 与周期 T（均不默认自动暂停）', () => {
    const pts = getKeplerCriticalTimes({ a: 4.5, mass: 36, mode: 0 }, 30)
    expectAlignedAndOrdered(pts, 30)
    expect(pts.every((p) => p.autoPause === false)).toBe(true)
    expect(pts[1].time).toBeCloseTo(pts[0].time * 2, 1)
  })

  it('4. 动能定理：恒力撤力模式与曲轨到达最低点模式', () => {
    const constF = getKineticEnergyCriticalTimes({ mode: 0, m: 2, v0: 0, F: 15, s: 6 }, 15)
    expect(constF).toHaveLength(1)
    expect(constF[0].autoPause).toBe(true)
    expectAlignedAndOrdered(constF, 15)

    const curved = getKineticEnergyCriticalTimes({ mode: 1, m: 2, v0: 0, R: 5, mu: 0.15 }, 15)
    expect(curved).toHaveLength(1)
    expect(curved[0].autoPause).toBe(true)
    expectAlignedAndOrdered(curved, 15)
  })

  it('5. 动量守恒：两球碰撞时刻与滑块木板共速/滑落分化', () => {
    const twoBall = getMomentumConservationCriticalTimes(
      { advancedMode: 0, m1: 3, v1: 5, m2: 2, v2: 0 },
      30,
    )
    expect(twoBall).toHaveLength(1)
    expect(twoBall[0].autoPause).toBe(true)
    expectAlignedAndOrdered(twoBall, 30)

    const commonVel = getMomentumConservationCriticalTimes(
      { advancedMode: 1, m_slider: 1, M_board: 3, v0: 4, mu: 0.4, L: 3 },
      30,
    )
    expect(commonVel[0].label).toContain('共速')
    expect(commonVel[0].autoPause).toBe(true)

    const fallOff = getMomentumConservationCriticalTimes(
      { advancedMode: 1, m_slider: 1, M_board: 3, v0: 8, mu: 0.2, L: 1 },
      30,
    )
    expect(fallOff[0].label).toContain('滑落')
    expect(fallOff[0].autoPause).toBe(true)
  })

  it('6. 验证动量守恒实验：光电门与碰撞里程碑顺序及网格对齐', () => {
    const pts = getExperimentMomentumCriticalTimes({ m1_exp: 0.4, m2_exp: 0.2, v1_exp: 0.8 })
    expectAlignedAndOrdered(pts, 30)
    const col = pts.find((p) => p.label.includes('碰撞'))
    expect(col?.autoPause).toBe(true)
  })

  it('7. 粒子在匀强电场偏转：直流飞出/打板，交变增加初次反向标记', () => {
    const dc = getChargeInEFieldCriticalTimes({ U: 150, v0: 15, q: 2, isAC: 0 }, 30)
    expect(dc).toHaveLength(1)
    expect(dc[0].autoPause).toBe(true)
    expectAlignedAndOrdered(dc, 30)

    const ac = getChargeInEFieldCriticalTimes({ U: 150, v0: 15, q: 2, isAC: 1, freq: 30, phi0: 0 }, 30)
    expectAlignedAndOrdered(ac, 30)
    const switch0 = ac.find((p) => p.label.includes('反向'))
    expect(switch0).toBeDefined()

    const acQuarter = getChargeInEFieldCriticalTimes({ U: 150, v0: 15, q: 2, isAC: 1, freq: 30, phi0: 0.25 }, 30)
    const switchQ = acQuarter.find((p) => p.label.includes('反向'))
    expect(switchQ).toBeDefined()
    expect(switchQ!.time).toBeCloseTo(switch0!.time * 0.5, 1)
  })

  it('13. 追及相遇动态时间轴超过 30s 时仍保留追上临界点', () => {
    const params = { chaseMode: 0, vA: 35, deltaX0: 200, t0: 1, aB: 6, vMax: 42 }
    const dynMax = computeChaseMeetingMaxTime(params)
    expect(dynMax).toBeGreaterThan(30)
    const pts = getChaseMeetingCriticalTimes(params, dynMax)
    expectAlignedAndOrdered(pts, dynMax)
    expect(pts.some((p) => p.label.includes('追上'))).toBe(true)
  })

  it('8. 交变电流产生与图像：中性面/峰值面/1个周期且支持任意初相', () => {
    const pts = getACGenerationCriticalTimes({ omega: 2, initialPhase: 0 }, 30)
    expectAlignedAndOrdered(pts, 30)
    expect(pts.every((p) => p.autoPause === false)).toBe(true)
  })

  it('9. 有效值与峰值关系：按正弦/脉冲波形给出半周/关断与周期点', () => {
    const sine = getACValuesCriticalTimes({ waveform: 0 }, 30)
    expectAlignedAndOrdered(sine, 30)
    const pulse = getACValuesCriticalTimes({ waveform: 2, duty: 0.3 }, 30)
    expectAlignedAndOrdered(pulse, 30)
    expect(pulse[0].label).toContain('脉冲关断')
  })

  it('10. 自感与涡流阻尼：通电、断电（含闪亮判断）、电磁阻尼三模式覆盖', () => {
    const turnOn = getSelfInductionCriticalTimes({ mode: 0, L: 2, RL: 2, RA: 6, switchState: 1 }, 6)
    expectAlignedAndOrdered(turnOn, 6)
    const turnOff = getSelfInductionCriticalTimes({ mode: 1, L: 2, RL: 2, RA: 6 }, 6)
    expectAlignedAndOrdered(turnOff, 6)
    expect(turnOff[0].label).toContain('闪亮')
    const eddy = getSelfInductionCriticalTimes({ mode: 2, B: 1.5, isSlotted: 0 }, 6)
    expectAlignedAndOrdered(eddy, 6)
  })

  it('11. 简谐运动与单摆：含大角单摆周期模式，均对齐 0.01s 网格', () => {
    const shm = getSimpleHarmonicCriticalTimes({ mass: 0.5, k: 20, phiDeg: 0 }, 20)
    expectAlignedAndOrdered(shm, 20)
    expect(shm.every((p) => p.autoPause === false)).toBe(true)

    const penSmall = getSimplePendulumCriticalTimes({ L: 1.5, g: 9.8, theta0: 8, mode: 0 }, 20)
    const penLarge = getSimplePendulumCriticalTimes({ L: 1.5, g: 9.8, theta0: 55, mode: 1 }, 20)
    expectAlignedAndOrdered(penSmall, 20)
    expectAlignedAndOrdered(penLarge, 20)
    expect(penLarge[penLarge.length - 1].time).toBeGreaterThanOrEqual(
      penSmall[penSmall.length - 1].time,
    )
  })

  it('12. 核衰变磁场径迹与半衰期：衰变爆发起 autoPause、半衰期按倍增标记', () => {
    const orbit = getDecayMagneticOrbitCriticalTimes({ decayType: 0, bField: 1.5 }, 30)
    expectAlignedAndOrdered(orbit, 30)
    expect(orbit[0].autoPause).toBe(true)

    const half = getNuclearHalfLifeCriticalTimes({ halfLife: 4.0 }, 15)
    expect(half.map((p) => p.time)).toEqual([4, 8, 12])
    expectAlignedAndOrdered(half, 15)
  })
})
