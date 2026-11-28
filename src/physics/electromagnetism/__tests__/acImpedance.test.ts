import { describe, it, expect } from 'vitest'
import {
  AC_AIR_CORE_RATIO,
  AC_COIL_DC_RESISTANCE,
  SWEEP_DURATION,
  SWEEP_F_MAX,
  SWEEP_F_MIN,
  TRANSIENT_DURATION,
  calculateBranchCurrentAndPower,
  calculateBranchPhasor,
  calculateCapacitiveReactance,
  calculateEffectiveInductance,
  calculateFilterState,
  calculateImpedance,
  calculateInductiveReactance,
  calculateParallelTotalCurrent,
  calculateResonanceFrequency,
  calculateSweepVisualPhase,
  calculateTransientStateAtTime,
  calculateTransientTimeConstants,
  calculateVisualAngularFrequency,
  computeACImpedanceSnapshot,
  getACImpedanceCriticalTimes,
  getVoltagePeakPositions,
  mapBulbDisplayPower,
  sampleACBranchWaveform,
  sweepFrequencyAtTime,
  sweepTimeForFrequency,
} from '../acImpedance'
import { buildACImpedanceQuantities } from '@/data/quantities/electromagnetism/acImpedance'

describe('acImpedance (纯物理计算单元测试)', () => {
  it('正确计算感抗 X_L = 2πfL', () => {
    const xl = calculateInductiveReactance(50, 0.5)
    expect(xl).toBeCloseTo(157.08, 1)

    expect(calculateInductiveReactance(0, 0.5)).toBe(0)
    expect(calculateInductiveReactance(50, 0)).toBe(0)
  })

  it('正确计算电容容抗 X_C = 1 / (2πfC)', () => {
    const xc = calculateCapacitiveReactance(50, 1e-4)
    expect(xc).toBeCloseTo(31.83, 1)

    expect(calculateCapacitiveReactance(0, 1e-4)).toBe(Number.POSITIVE_INFINITY)
  })

  it('正确计算综合阻抗 Z = √(R² + X²)', () => {
    expect(calculateImpedance(30, 40)).toBeCloseTo(50, 4)
    expect(calculateImpedance(30, Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
  })

  it('正确计算支路有效值电流与灯泡消耗功率', () => {
    const resAC = calculateBranchCurrentAndPower(100, 30, 40, false)
    expect(resAC.current).toBeCloseTo(2, 4)
    expect(resAC.power).toBeCloseTo(120, 4)

    const resDC_C = calculateBranchCurrentAndPower(100, 30, Number.POSITIVE_INFINITY, true)
    expect(resDC_C.current).toBe(0)
    expect(resDC_C.power).toBe(0)

    const resDC_L = calculateBranchCurrentAndPower(100, 30, 0, true, 10)
    expect(resDC_L.current).toBeCloseTo(2.5, 4)
    expect(resDC_L.power).toBeCloseTo(187.5, 4)
  })

  it('正确计算谐振频率 f0 = 1 / (2π√(LC))', () => {
    const f0 = calculateResonanceFrequency(0.1, 1e-5)
    expect(f0).toBeCloseTo(159.15, 1)
  })

  it('扫频时间与频率可逆互转，默认 L=0.4H / C=20μF 的等电抗点居中', () => {
    expect(sweepFrequencyAtTime(0)).toBe(SWEEP_F_MIN)
    expect(sweepFrequencyAtTime(SWEEP_DURATION)).toBe(SWEEP_F_MAX)
    expect(sweepFrequencyAtTime(SWEEP_DURATION / 2)).toBeCloseTo(80, 6)
    expect(sweepTimeForFrequency(80)).toBeCloseTo(SWEEP_DURATION / 2, 6)

    const f0 = calculateResonanceFrequency(0.4, 20e-6)
    expect(f0).toBeGreaterThan(45)
    expect(f0).toBeLessThan(70)
  })

  it('铁芯开关正确按倍率缩放有效自感 L_eff', () => {
    expect(calculateEffectiveInductance(0.4, true)).toBeCloseTo(0.4, 6)
    expect(calculateEffectiveInductance(0.4, false)).toBeCloseTo(0.4 * AC_AIR_CORE_RATIO, 6)
  })

  it('支路相量与并联干路相量合成符合交流电矢量叠加规律', () => {
    const bR = calculateBranchPhasor(100, 30, 'resistor', 0, false, 0)
    const bL = calculateBranchPhasor(100, 30, 'inductor', 100, false, AC_COIL_DC_RESISTANCE)
    const bC = calculateBranchPhasor(100, 30, 'capacitor', 100, false, 0)

    expect(bR.phaseRad).toBe(0)
    expect(bL.phaseRad).toBeLessThan(0)
    expect(bC.phaseRad).toBeGreaterThan(0)

    const phasorSum = calculateParallelTotalCurrent([bL, bC])
    expect(phasorSum).toBeLessThan(bL.current + bC.current)

    const samePhaseSum = calculateParallelTotalCurrent([bR, bR])
    expect(samePhaseSum).toBeCloseTo(bR.current * 2, 6)
  })

  it('直流接通暂态正确表现电容充电脉冲衰减归零与电感阻滞爬升', () => {
    const { tauC, tauL } = calculateTransientTimeConstants(30, 0.4, 20)
    expect(tauC).toBeGreaterThan(0.2)
    expect(tauL).toBeGreaterThan(0.2)

    // 电容直流接通：t=0 电流峰值 U/R，t=5τ 时几乎归零、极板充满
    const cStart = calculateTransientStateAtTime(
      {
        voltage: 100,
        frequency: 0,
        resistance: 30,
        effectiveInductance: 0.4,
        capacitance: 20,
        isDC: true,
        compareTarget: 0,
        referencePower: 333,
        branch1Rms: 100 / 30,
        branch2Rms: 0,
        branch2PhaseRad: 0,
      },
      0,
    )
    const cEnd = calculateTransientStateAtTime(
      {
        voltage: 100,
        frequency: 0,
        resistance: 30,
        effectiveInductance: 0.4,
        capacitance: 20,
        isDC: true,
        compareTarget: 0,
        referencePower: 333,
        branch1Rms: 100 / 30,
        branch2Rms: 0,
        branch2PhaseRad: 0,
      },
      5 * tauC,
    )
    expect(cStart.i2).toBeCloseTo(100 / 30, 3)
    expect(cStart.capacitorChargeNorm).toBeCloseTo(0, 4)
    expect(cEnd.i2).toBeLessThan(0.05)
    expect(cEnd.capacitorChargeNorm).toBeGreaterThan(0.99)

    // 电感直流接通：t=0 电流为 0，t=5τ 趋近稳态 U/(R+15)
    const lStart = calculateTransientStateAtTime(
      {
        voltage: 100,
        frequency: 0,
        resistance: 30,
        effectiveInductance: 0.4,
        capacitance: 20,
        isDC: true,
        compareTarget: 1,
        referencePower: 200,
        branch1Rms: 100 / 45,
        branch2Rms: 100 / 45,
        branch2PhaseRad: 0,
      },
      0,
    )
    const lEnd = calculateTransientStateAtTime(
      {
        voltage: 100,
        frequency: 0,
        resistance: 30,
        effectiveInductance: 0.4,
        capacitance: 20,
        isDC: true,
        compareTarget: 1,
        referencePower: 200,
        branch1Rms: 100 / 45,
        branch2Rms: 100 / 45,
        branch2PhaseRad: 0,
      },
      5 * tauL,
    )
    expect(lStart.i2).toBeCloseTo(0, 6)
    expect(lEnd.i2).toBeCloseTo(100 / 45, 1)
  })

  it('慢放可视化角速度单调递增且灯泡显示功率在有效非饱和区间', () => {
    const w10 = calculateVisualAngularFrequency(10)
    const w50 = calculateVisualAngularFrequency(50)
    const w150 = calculateVisualAngularFrequency(150)
    expect(w10).toBeGreaterThan(0)
    expect(w50).toBeGreaterThan(w10)
    expect(w150).toBeGreaterThan(w50)
    expect(w150 / (2 * Math.PI)).toBeLessThan(5)

    const pLow = mapBulbDisplayPower(11, 333)
    const pMid = mapBulbDisplayPower(148, 333)
    const pHigh = mapBulbDisplayPower(333, 333)
    expect(pLow).toBeGreaterThan(0)
    expect(pMid).toBeGreaterThan(pLow)
    expect(pHigh).toBeGreaterThan(pMid)
    expect(pHigh).toBeLessThan(7)
    expect(mapBulbDisplayPower(0, 333)).toBe(0)
  })

  it('三种滤波电路满足高中物理选频单调性', () => {
    const lfChoke = calculateFilterState(0, 0.4, 20, 30)
    expect(lfChoke.dcGain).toBeGreaterThan(0.5)
    expect(lfChoke.lfGain).toBeLessThan(0.05)
    expect(lfChoke.hfGain).toBeLessThan(lfChoke.lfGain)

    const hfChoke = calculateFilterState(1, 0.4, 20, 30)
    expect(hfChoke.dcGain).toBe(1)
    expect(hfChoke.lfGain).toBeGreaterThan(0.95)
    expect(hfChoke.hfGain).toBeLessThan(0.35)

    const hfBypass = calculateFilterState(2, 0.4, 20, 30)
    expect(hfBypass.dcGain).toBe(1)
    expect(hfBypass.lfGain).toBeGreaterThan(0.95)
    expect(hfBypass.hfGain).toBeLessThan(0.5)
  })

  it('criticalTimes 在所有 timed 模式下均落在 0.01s 网格且严格升序', () => {
    const cases = [
      { mode: 0, inductance: 0.4, capacitance: 20, hasCore: 1 },
      { mode: 0, inductance: 0.4, capacitance: 20, hasCore: 0 },
      { mode: 1, isDC: 0, compareTarget: 0, frequency: 50 },
      { mode: 1, isDC: 1, compareTarget: 0, capacitance: 20, resistance: 30 },
      { mode: 1, isDC: 1, compareTarget: 1, inductance: 0.4, resistance: 30 },
    ]
    for (const c of cases) {
      const maxTime = c.mode === 0 ? SWEEP_DURATION : TRANSIENT_DURATION
      const pts = getACImpedanceCriticalTimes(c)
      expect(pts.length).toBeGreaterThan(0)
      let prev = 0
      for (const pt of pts) {
        expect(pt.time).toBeGreaterThan(prev)
        expect(pt.time).toBeLessThanOrEqual(maxTime)
        expect(Math.abs(Math.round(pt.time * 100) - pt.time * 100)).toBeLessThan(1e-6)
        prev = pt.time
      }
    }
    expect(getACImpedanceCriticalTimes({ mode: 2 })).toEqual([])
  })

  it('computeACImpedanceSnapshot 与右屏看板在扫频随时间联动及各模式下严格单一真源', () => {
    // mode=0：time=0 (10Hz) vs time=5 (80Hz) 右屏频率与电流同步更新
    const snapT0 = computeACImpedanceSnapshot({ mode: 0 }, 0)
    const snapT5 = computeACImpedanceSnapshot({ mode: 0 }, 5)
    const panelT0 = buildACImpedanceQuantities('anim-ac-lc-impedance', { mode: 0 }, 0)!
    const panelT5 = buildACImpedanceQuantities('anim-ac-lc-impedance', { mode: 0 }, 5)!
    expect(panelT0.quantities.find((q) => q.symbol === 'f')?.value).toBeCloseTo(10, 1)
    expect(panelT5.quantities.find((q) => q.symbol === 'f')?.value).toBeCloseTo(80, 1)
    expect(panelT5.quantities.find((q) => q.symbol === 'I_C')?.value).toBeCloseTo(snapT5.branches[2].current, 2)
    expect(snapT5.branches[2].current).toBeGreaterThan(snapT0.branches[2].current)
    expect(snapT5.branches[1].current).toBeLessThan(snapT0.branches[1].current)

    // mode=1 交流与 mode=2 滤波一致性
    const snapOsc = computeACImpedanceSnapshot({ mode: 1, isDC: 0, compareTarget: 0, frequency: 60 }, 1)
    const panelOsc = buildACImpedanceQuantities('anim-ac-lc-impedance', { mode: 1, isDC: 0, compareTarget: 0, frequency: 60 }, 1)!
    expect(panelOsc.quantities.length).toBeLessThanOrEqual(8)
    expect(panelOsc.quantities.find((q) => q.symbol === 'I_2')?.value).toBeCloseTo(snapOsc.branches[1].current, 2)

    const snapFilter = computeACImpedanceSnapshot({ mode: 2, filterType: 2, capacitance: 30 }, 0)
    const panelFilter = buildACImpedanceQuantities('anim-ac-lc-impedance', { mode: 2, filterType: 2, capacitance: 30 }, 0)!
    expect(panelFilter.quantities.find((q) => q.symbol === 'η_高')?.value).toBeCloseTo(snapFilter.filterState.hfGain * 100, 1)
  })

  it('支路行内波形采样与扫频积分相位满足超前滞后、峰值对齐与递增单调性', () => {
    expect(calculateSweepVisualPhase(0)).toBe(0)
    const p1 = calculateSweepVisualPhase(2)
    const p2 = calculateSweepVisualPhase(5)
    expect(p1).toBeGreaterThan(0)
    expect(p2).toBeGreaterThan(p1)

    // 数值导数应吻合 calculateVisualAngularFrequency(sweepFrequencyAtTime(t))
    const tMid = 4
    const dt = 1e-5
    const numDeriv = (calculateSweepVisualPhase(tMid + dt) - calculateSweepVisualPhase(tMid - dt)) / (2 * dt)
    const exactOmega = calculateVisualAngularFrequency(sweepFrequencyAtTime(tMid))
    expect(numDeriv).toBeCloseTo(exactOmega, 3)

    // 波形振幅等于 √2 * I_rms，且电容峰在电阻峰左侧（超前），电感峰在电阻峰右侧（滞后）
    const omega = 2 * Math.PI * 1.0
    const windowDuration = 2.0
    // currentPhaseRad = 2.5π 时，电阻峰正好落在窗中心 u = 0.50
    const currentPhaseRad = Math.PI * 2.5
    const waveR = sampleACBranchWaveform({
      rmsCurrent: 2,
      phaseRad: 0,
      omegaVis: omega,
      currentPhaseRad,
      windowDuration,
      samples: 200,
    })
    const waveC = sampleACBranchWaveform({
      rmsCurrent: 2,
      phaseRad: Math.PI / 3,
      omegaVis: omega,
      currentPhaseRad,
      windowDuration,
      samples: 200,
    })
    const waveL = sampleACBranchWaveform({
      rmsCurrent: 2,
      phaseRad: -Math.PI / 3,
      omegaVis: omega,
      currentPhaseRad,
      windowDuration,
      samples: 200,
    })

    const maxR = Math.max(...waveR.map((s) => s.current))
    expect(maxR).toBeCloseTo(2 * Math.SQRT2, 2)
    expect(waveR[waveR.length - 1].current).toBeCloseTo(2 * Math.SQRT2 * Math.sin(currentPhaseRad), 4)

    // 在 [0.25, 0.75] 窗中心区间寻找各自正峰位置
    const findPeakU = (samples: typeof waveR) => {
      const mid = samples.filter((s) => s.u >= 0.25 && s.u <= 0.75)
      return mid.reduce((best, cur) => (cur.current > best.current ? cur : best), mid[0]).u
    }
    const uPeakR = findPeakU(waveR)
    const uPeakC = findPeakU(waveC)
    const uPeakL = findPeakU(waveL)
    expect(uPeakC).toBeLessThan(uPeakR)
    expect(uPeakL).toBeGreaterThan(uPeakR)

    // 电源 u(t) 峰值坐标验证：所有返回点均满足 sin(angle) ≈ 1，且高频时峰数更多
    const peaksLow = getVoltagePeakPositions(currentPhaseRad, 2 * Math.PI * 0.6, windowDuration)
    const peaksHigh = getVoltagePeakPositions(currentPhaseRad, 2 * Math.PI * 2.4, windowDuration)
    expect(peaksLow.length).toBeGreaterThan(0)
    expect(peaksHigh.length).toBeGreaterThan(peaksLow.length)
    for (const u of peaksHigh) {
      const angle = currentPhaseRad - (2 * Math.PI * 2.4) * (1 - u) * windowDuration
      expect(Math.sin(angle)).toBeCloseTo(1, 6)
    }

    // chartType === 2 在快照中合法保留
    const snapWaveTab = computeACImpedanceSnapshot({ mode: 0, chartType: 2 }, 5)
    expect(snapWaveTab.chartType).toBe(2)
  })
})
