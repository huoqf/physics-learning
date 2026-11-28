import { useMemo } from 'react'
import {
  AC_COIL_DC_RESISTANCE,
  BRANCH_WAVE_WINDOW_OSC,
  BRANCH_WAVE_WINDOW_SWEEP,
  FILTER_FREQUENCIES,
  SWEEP_F_MAX,
  SWEEP_F_MIN,
  TRANSIENT_DURATION,
  calculateBranchPhasor,
  calculateCapacitiveReactance,
  calculateInductiveReactance,
  calculateOscilloscopeFrequency,
  calculateSweepVisualPhase,
  calculateTransientStateAtTime,
  calculateVisualAngularFrequency,
  computeACImpedanceSnapshot,
  getVoltagePeakPositions,
  sampleACBranchWaveform,
  type ACFilterState,
  type ACFilterType,
  type ACImpedanceNamedBranch,
  type ACTransientAtTime,
  type BranchWaveformSample,
} from '@/physics/electromagnetism/acImpedance'

export interface ACImpedanceParams {
  voltage?: number // V
  frequency?: number // Hz
  inductance?: number // H
  capacitance?: number // μF
  resistance?: number // Ω
  isDC?: number // 0: AC, 1: DC
  mode?: number // 0: 扫频演示, 1: 充放交直, 2: 扼流滤波
  compareTarget?: number // 0: 电阻 vs 电容, 1: 电阻 vs 电感
  filterType?: number // 0: 低频扼流, 1: 高频扼流, 2: 高频旁路
  hasCore?: number // 0: 空心, 1: 插入铁芯
  chartType?: number // 0: I-f, 1: X-f, 2: i-t
  compareParams?: Record<string, number> | null // 锁定参考曲线参数快照
  time: number // s
}

export interface BranchState extends ACImpedanceNamedBranch {
  /** 支路当前显示电流 (A)：mode=1 直流取瞬时电流，其余取有效值 */
  displayCurrent: number
  /** 归一化瞬时电流 [-1, 1]（决定箭头方向） */
  instantCurrent: number
  /** 电容极板瞬时电荷归一化 [-1, 1] */
  instantCharge: number
  /** 支路行内示波窗完整采样波形 */
  waveSamples: BranchWaveformSample[]
  /** 直流暂态模式下已演进的采样波形 */
  revealedSamples?: BranchWaveformSample[]
  /** 实时瞬时点所在归一化横坐标 u ∈ [0, 1] */
  liveU: number
  /** liveU 处的瞬时电流 (A) */
  liveCurrent: number
  /** 峰值电流 (A)（交流为 √2·I_rms，直流为参考峰值） */
  peakCurrent: number
  /** 相位角（度），超前为正、滞后为负 */
  phaseDeg: number
}

export interface FilterWaveData {
  inputWave: { x: number; y: number }[]
  outputWave: { x: number; y: number }[]
}

export interface OscWaveData {
  i1Full: { x: number; y: number }[]
  i2Full: { x: number; y: number }[]
  i1Revealed: { x: number; y: number }[]
  i2Revealed: { x: number; y: number }[]
}

export interface CompareCurvesData {
  iLCurve?: { x: number; y: number }[]
  iCCurve?: { x: number; y: number }[]
  xlCurve?: { x: number; y: number }[]
  xcCurve?: { x: number; y: number }[]
  i2Full?: { x: number; y: number }[]
}

export interface ACImpedancePhysicsResult {
  mode: 0 | 1 | 2
  isDC: boolean
  compareTarget: 0 | 1
  filterType: ACFilterType
  hasCore: boolean
  chartType: 0 | 1 | 2
  frequency: number
  voltage: number
  inductance: number
  effectiveInductance: number
  capacitance: number
  resistance: number
  XL: number
  XC: number
  f0: number
  fixedCurrentYMax: number
  fixedOscYMax: number
  inlineWaveYMax: number
  voltagePeakUs: number[]
  branches: BranchState[]
  totalCurrent: number
  totalInstantSign: 1 | -1 | 0
  transient: ACTransientAtTime | null
  filterState: ACFilterState
  iRCurvePoints: { x: number; y: number }[]
  iLCurvePoints: { x: number; y: number }[]
  iCCurvePoints: { x: number; y: number }[]
  xlCurvePoints: { x: number; y: number }[]
  xcCurvePoints: { x: number; y: number }[]
  oscWave: OscWaveData
  mode0Wave: {
    iR: { x: number; y: number }[]
    iL: { x: number; y: number }[]
    iC: { x: number; y: number }[]
    peakXs: number[]
  }
  compareCurves: CompareCurvesData | null
  filterWave: FilterWaveData
}

function selectLockedYAxisMax(peakCurrent: number): number {
  if (peakCurrent <= 7.2) return 8
  if (peakCurrent <= 15) return 16
  return 24
}

export function useACImpedancePhysics(params: ACImpedanceParams): ACImpedancePhysicsResult {
  const {
    voltage = 100,
    frequency = 50,
    inductance = 0.4,
    capacitance = 20,
    resistance = 30,
    isDC = 0,
    mode = 0,
    compareTarget = 0,
    filterType = 0,
    hasCore = 1,
    chartType = 0,
    compareParams = null,
    time,
  } = params

  const snapshot = useMemo(
    () =>
      computeACImpedanceSnapshot(
        {
          voltage,
          frequency,
          inductance,
          capacitance,
          resistance,
          isDC,
          mode,
          compareTarget,
          filterType,
          hasCore,
          chartType,
        },
        time,
      ),
    [
      voltage,
      frequency,
      inductance,
      capacitance,
      resistance,
      isDC,
      mode,
      compareTarget,
      filterType,
      hasCore,
      chartType,
      time,
    ],
  )

  // 静态频响曲线 + 示波器全时域参考波（仅依赖静态参数，不随 time 逐帧重算）
  const staticCharts = useMemo(() => {
    const iRCurvePoints: { x: number; y: number }[] = []
    const iLCurvePoints: { x: number; y: number }[] = []
    const iCCurvePoints: { x: number; y: number }[] = []
    const xlCurvePoints: { x: number; y: number }[] = []
    const xcCurvePoints: { x: number; y: number }[] = []

    const capFarad = snapshot.capacitance * 1e-6
    const compareSeriesR =
      snapshot.mode === 1 && snapshot.compareTarget === 1 ? AC_COIL_DC_RESISTANCE : 0

    for (let f = SWEEP_F_MIN; f <= SWEEP_F_MAX; f += 2.5) {
      const curXL = calculateInductiveReactance(f, snapshot.effectiveInductance)
      const curXC = calculateCapacitiveReactance(f, capFarad)
      const curIR = calculateBranchPhasor(
        snapshot.voltage,
        snapshot.resistance,
        'resistor',
        0,
        false,
        compareSeriesR,
      ).current
      const curIL = calculateBranchPhasor(
        snapshot.voltage,
        snapshot.resistance,
        'inductor',
        curXL,
        false,
        AC_COIL_DC_RESISTANCE,
      ).current
      const curIC = calculateBranchPhasor(
        snapshot.voltage,
        snapshot.resistance,
        'capacitor',
        curXC,
        false,
        0,
      ).current

      iRCurvePoints.push({ x: f, y: curIR })
      iLCurvePoints.push({ x: f, y: curIL })
      iCCurvePoints.push({ x: f, y: curIC })
      xlCurvePoints.push({ x: f, y: Math.min(600, curXL) })
      xcCurvePoints.push({ x: f, y: Math.min(600, curXC) })
    }

    // 模式 1 完整 0~6s 示波曲线
    const i1Full: { x: number; y: number }[] = []
    const i2Full: { x: number; y: number }[] = []
    if (snapshot.mode === 1 && snapshot.branches.length >= 2) {
      const b1 = snapshot.branches[0]
      const b2 = snapshot.branches[1]
      for (let t = 0; t <= TRANSIENT_DURATION + 1e-6; t += 0.05) {
        const clampedT = Math.min(TRANSIENT_DURATION, t)
        const st = calculateTransientStateAtTime(
          {
            voltage: snapshot.voltage,
            frequency: snapshot.frequency,
            resistance: snapshot.resistance,
            effectiveInductance: snapshot.effectiveInductance,
            capacitance: snapshot.capacitance,
            isDC: snapshot.isDC,
            compareTarget: snapshot.compareTarget,
            referencePower: snapshot.referencePower,
            branch1Rms: b1.current,
            branch2Rms: b2.current,
            branch2PhaseRad: b2.phaseRad,
          },
          clampedT,
        )
        i1Full.push({ x: clampedT, y: st.i1 })
        i2Full.push({ x: clampedT, y: st.i2 })
      }
    }

    // 锁定标尺，防止调参数时坐标轴跟着缩放跳变
    const maxRmsRef = snapshot.voltage / Math.max(10, snapshot.resistance)
    const fixedCurrentYMax = selectLockedYAxisMax(maxRmsRef)
    const fixedOscYMax = selectLockedYAxisMax(
      snapshot.isDC ? maxRmsRef : Math.SQRT2 * maxRmsRef,
    )

    return {
      iRCurvePoints,
      iLCurvePoints,
      iCCurvePoints,
      xlCurvePoints,
      xcCurvePoints,
      i1Full,
      i2Full,
      fixedCurrentYMax,
      fixedOscYMax,
    }
  }, [
    snapshot.voltage,
    snapshot.resistance,
    snapshot.effectiveInductance,
    snapshot.capacitance,
    snapshot.frequency,
    snapshot.isDC,
    snapshot.mode,
    snapshot.compareTarget,
    snapshot.referencePower,
    snapshot.branches,
  ])

  // 参考曲线对比快照（仅当已锁定参考参数且存在关键参数差异时计算）
  const compareCurves = useMemo((): CompareCurvesData | null => {
    if (!compareParams) return null
    const cmpSnap = computeACImpedanceSnapshot(compareParams, 0)
    if (cmpSnap.mode !== snapshot.mode) return null

    if (snapshot.mode === 0) {
      const hasDiff =
        Math.abs(cmpSnap.voltage - snapshot.voltage) > 1e-6 ||
        Math.abs(cmpSnap.effectiveInductance - snapshot.effectiveInductance) > 1e-6 ||
        Math.abs(cmpSnap.capacitance - snapshot.capacitance) > 1e-6 ||
        Math.abs(cmpSnap.resistance - snapshot.resistance) > 1e-6
      if (!hasDiff) return null

      const iLCurve: { x: number; y: number }[] = []
      const iCCurve: { x: number; y: number }[] = []
      const xlCurve: { x: number; y: number }[] = []
      const xcCurve: { x: number; y: number }[] = []
      const capF = cmpSnap.capacitance * 1e-6

      for (let f = SWEEP_F_MIN; f <= SWEEP_F_MAX; f += 2.5) {
        const xl = calculateInductiveReactance(f, cmpSnap.effectiveInductance)
        const xc = calculateCapacitiveReactance(f, capF)
        iLCurve.push({
          x: f,
          y: calculateBranchPhasor(cmpSnap.voltage, cmpSnap.resistance, 'inductor', xl, false, AC_COIL_DC_RESISTANCE).current,
        })
        iCCurve.push({
          x: f,
          y: calculateBranchPhasor(cmpSnap.voltage, cmpSnap.resistance, 'capacitor', xc, false, 0).current,
        })
        xlCurve.push({ x: f, y: Math.min(600, xl) })
        xcCurve.push({ x: f, y: Math.min(600, xc) })
      }
      return { iLCurve, iCCurve, xlCurve, xcCurve }
    }

    if (snapshot.mode === 1 && cmpSnap.isDC === snapshot.isDC && cmpSnap.compareTarget === snapshot.compareTarget && cmpSnap.branches.length >= 2) {
      const hasDiff =
        Math.abs(cmpSnap.voltage - snapshot.voltage) > 1e-6 ||
        Math.abs(cmpSnap.frequency - snapshot.frequency) > 1e-6 ||
        Math.abs(cmpSnap.effectiveInductance - snapshot.effectiveInductance) > 1e-6 ||
        Math.abs(cmpSnap.capacitance - snapshot.capacitance) > 1e-6 ||
        Math.abs(cmpSnap.resistance - snapshot.resistance) > 1e-6
      if (!hasDiff) return null

      const b1 = cmpSnap.branches[0]
      const b2 = cmpSnap.branches[1]
      const i2Full: { x: number; y: number }[] = []
      for (let t = 0; t <= TRANSIENT_DURATION + 1e-6; t += 0.05) {
        const clampedT = Math.min(TRANSIENT_DURATION, t)
        const st = calculateTransientStateAtTime(
          {
            voltage: cmpSnap.voltage,
            frequency: cmpSnap.frequency,
            resistance: cmpSnap.resistance,
            effectiveInductance: cmpSnap.effectiveInductance,
            capacitance: cmpSnap.capacitance,
            isDC: cmpSnap.isDC,
            compareTarget: cmpSnap.compareTarget,
            referencePower: cmpSnap.referencePower,
            branch1Rms: b1.current,
            branch2Rms: b2.current,
            branch2PhaseRad: b2.phaseRad,
          },
          clampedT,
        )
        i2Full.push({ x: clampedT, y: st.i2 })
      }
      return { i2Full }
    }

    return null
  }, [compareParams, snapshot])

  return useMemo(() => {
    let totalInstant = 0

    // 模式 1：实时截断至当前播放时刻 time 的示波器扫描轨迹
    const i1Revealed: { x: number; y: number }[] = []
    const i2Revealed: { x: number; y: number }[] = []
    if (snapshot.mode === 1 && snapshot.transient && staticCharts.i1Full.length > 0) {
      const clampedT = Math.max(0, Math.min(TRANSIENT_DURATION, time))
      for (const pt of staticCharts.i1Full) {
        if (pt.x <= clampedT + 1e-6) i1Revealed.push(pt)
      }
      for (const pt of staticCharts.i2Full) {
        if (pt.x <= clampedT + 1e-6) i2Revealed.push(pt)
      }
      if (i1Revealed.length === 0 || i1Revealed[i1Revealed.length - 1].x < clampedT - 1e-4) {
        i1Revealed.push({ x: clampedT, y: snapshot.transient.i1 })
      }
      if (i2Revealed.length === 0 || i2Revealed[i2Revealed.length - 1].x < clampedT - 1e-4) {
        i2Revealed.push({ x: clampedT, y: snapshot.transient.i2 })
      }
    }

    const baseRefPeak = Math.max(100, snapshot.voltage) / Math.max(10, snapshot.resistance)
    const inlineWaveYMax =
      snapshot.mode === 1 && snapshot.isDC
        ? baseRefPeak * 1.1
        : Math.SQRT2 * baseRefPeak * 1.06

    const visualOmega = calculateVisualAngularFrequency(snapshot.frequency)
    const sweepPhase = calculateSweepVisualPhase(time)
    const oscFreq = calculateOscilloscopeFrequency(snapshot.frequency)
    const oscOmegaVis = 2 * Math.PI * oscFreq
    const oscCurrentPhase = oscOmegaVis * time
    const clampedOscT = Math.max(0, Math.min(TRANSIENT_DURATION, time))

    let voltagePeakUs: number[] = []
    if (snapshot.mode === 0) {
      voltagePeakUs = getVoltagePeakPositions(sweepPhase, visualOmega, BRANCH_WAVE_WINDOW_SWEEP)
    } else if (snapshot.mode === 1) {
      voltagePeakUs = snapshot.isDC
        ? [clampedOscT / TRANSIENT_DURATION]
        : getVoltagePeakPositions(oscCurrentPhase, oscOmegaVis, BRANCH_WAVE_WINDOW_OSC)
    }

    const branches: BranchState[] = snapshot.branches.map((b, idx) => {
      // 模式 1：基于暂态/慢放示波物理状态驱动
      if (snapshot.mode === 1 && snapshot.transient) {
        const tr = snapshot.transient
        if (snapshot.isDC) {
          const curI = idx === 0 ? tr.i1 : tr.i2
          const fullCurve = idx === 0 ? staticCharts.i1Full : staticCharts.i2Full
          const revCurve = idx === 0 ? i1Revealed : i2Revealed
          const waveSamples = fullCurve.map((pt) => ({
            u: pt.x / TRANSIENT_DURATION,
            current: pt.y,
          }))
          const revealedSamples = revCurve.map((pt) => ({
            u: pt.x / TRANSIENT_DURATION,
            current: pt.y,
          }))
          const peakCurrent =
            idx === 0
              ? b.current
              : b.deviceType === 'capacitor'
                ? snapshot.voltage / Math.max(1, snapshot.resistance)
                : b.current
          totalInstant += curI
          return {
            ...b,
            displayCurrent: curI,
            instantCurrent: curI > 0.02 ? 1 : 0,
            instantCharge: b.deviceType === 'capacitor' ? tr.capacitorChargeNorm : 0,
            waveSamples,
            revealedSamples,
            liveU: clampedOscT / TRANSIENT_DURATION,
            liveCurrent: curI,
            peakCurrent,
            phaseDeg: 0,
          }
        }

        // 模式 1 交流示波模式
        const instNorm = Math.sin(oscCurrentPhase + b.phaseRad)
        const peakCurrent = Math.SQRT2 * b.current
        const waveSamples = sampleACBranchWaveform({
          rmsCurrent: b.current,
          phaseRad: b.phaseRad,
          omegaVis: oscOmegaVis,
          currentPhaseRad: oscCurrentPhase,
          windowDuration: BRANCH_WAVE_WINDOW_OSC,
        })
        totalInstant += b.current * instNorm
        return {
          ...b,
          displayCurrent: b.current,
          instantCurrent: instNorm,
          instantCharge: b.deviceType === 'capacitor' ? tr.capacitorChargeNorm : 0,
          waveSamples,
          liveU: 1,
          liveCurrent: peakCurrent * instNorm,
          peakCurrent,
          phaseDeg: Math.round((b.phaseRad * 180) / Math.PI),
        }
      }

      // 模式 0：扫频演示模式（积分相位驱动，无波形倒流）
      const instNorm = Math.sin(sweepPhase + b.phaseRad)
      const dispNorm = -Math.cos(sweepPhase + b.phaseRad)
      const peakCurrent = Math.SQRT2 * b.current
      const waveSamples = sampleACBranchWaveform({
        rmsCurrent: b.current,
        phaseRad: b.phaseRad,
        omegaVis: visualOmega,
        currentPhaseRad: sweepPhase,
        windowDuration: BRANCH_WAVE_WINDOW_SWEEP,
      })
      totalInstant += b.current * instNorm
      return {
        ...b,
        displayCurrent: b.current,
        instantCurrent: instNorm,
        instantCharge: b.deviceType === 'capacitor' ? dispNorm : 0,
        waveSamples,
        liveU: 1,
        liveCurrent: peakCurrent * instNorm,
        peakCurrent,
        phaseDeg: Math.round((b.phaseRad * 180) / Math.PI),
      }
    })

    const totalInstantSign: 1 | -1 | 0 = snapshot.isDC
      ? Math.abs((snapshot.transient?.iTotal ?? snapshot.totalCurrent)) > 0.02
        ? 1
        : 0
      : Math.abs(totalInstant) < 0.01
        ? 0
        : totalInstant > 0
          ? 1
          : -1

    const mode0Wave =
      snapshot.mode === 0 && branches.length >= 3
        ? {
            iR: branches[0].waveSamples.map((s) => ({
              x: s.u * BRANCH_WAVE_WINDOW_SWEEP,
              y: s.current,
            })),
            iL: branches[1].waveSamples.map((s) => ({
              x: s.u * BRANCH_WAVE_WINDOW_SWEEP,
              y: s.current,
            })),
            iC: branches[2].waveSamples.map((s) => ({
              x: s.u * BRANCH_WAVE_WINDOW_SWEEP,
              y: s.current,
            })),
            peakXs: voltagePeakUs.map((u) => u * BRANCH_WAVE_WINDOW_SWEEP),
          }
        : { iR: [], iL: [], iC: [], peakXs: [] }

    // 模式 2：扼流滤波波形
    const inputWave: { x: number; y: number }[] = []
    const outputWave: { x: number; y: number }[] = []
    if (snapshot.mode === 2) {
      const { dcGain, lfGain, hfGain } = snapshot.filterState
      const scrollPhase = time * 1.4
      const dcBase = 0.55
      const lfAmp = 0.38
      const hfAmp = 0.28
      const lfScale = FILTER_FREQUENCIES.low / 500
      const hfScale = 0.75

      for (let tMs = 0; tMs <= 40; tMs += 0.4) {
        const lfTerm = Math.sin(2 * Math.PI * (lfScale * tMs - scrollPhase))
        const hfTerm = Math.sin(2 * Math.PI * (hfScale * tMs - scrollPhase * 4))
        inputWave.push({
          x: tMs,
          y: dcBase + lfAmp * lfTerm + hfAmp * hfTerm,
        })
        outputWave.push({
          x: tMs,
          y: dcBase * dcGain + lfAmp * lfGain * lfTerm + hfAmp * hfGain * hfTerm,
        })
      }
    }

    return {
      mode: snapshot.mode,
      isDC: snapshot.isDC,
      compareTarget: snapshot.compareTarget,
      filterType: snapshot.filterType,
      hasCore: snapshot.hasCore,
      chartType: snapshot.chartType,
      frequency: snapshot.frequency,
      voltage: snapshot.voltage,
      inductance: snapshot.inductance,
      effectiveInductance: snapshot.effectiveInductance,
      capacitance: snapshot.capacitance,
      resistance: snapshot.resistance,
      XL: snapshot.XL,
      XC: snapshot.XC,
      f0: snapshot.f0,
      fixedCurrentYMax: staticCharts.fixedCurrentYMax,
      fixedOscYMax: staticCharts.fixedOscYMax,
      inlineWaveYMax,
      voltagePeakUs,
      branches,
      totalCurrent:
        snapshot.mode === 1 && snapshot.isDC && snapshot.transient
          ? snapshot.transient.iTotal
          : snapshot.totalCurrent,
      totalInstantSign,
      transient: snapshot.transient,
      filterState: snapshot.filterState,
      iRCurvePoints: staticCharts.iRCurvePoints,
      iLCurvePoints: staticCharts.iLCurvePoints,
      iCCurvePoints: staticCharts.iCCurvePoints,
      xlCurvePoints: staticCharts.xlCurvePoints,
      xcCurvePoints: staticCharts.xcCurvePoints,
      oscWave: {
        i1Full: staticCharts.i1Full,
        i2Full: staticCharts.i2Full,
        i1Revealed,
        i2Revealed,
      },
      mode0Wave,
      compareCurves,
      filterWave: { inputWave, outputWave },
    }
  }, [snapshot, staticCharts, compareCurves, time])
}
