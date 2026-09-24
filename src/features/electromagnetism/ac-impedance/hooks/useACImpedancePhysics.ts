import { useMemo } from 'react'
import {
  calculateInductiveReactance,
  calculateCapacitiveReactance,
  calculateBranchCurrentAndPower,
  calculateResonanceFrequency,
} from '@/physics/electromagnetism/acImpedance'

export interface ACImpedanceParams {
  voltage?: number // V
  frequency?: number // Hz
  inductance?: number // H
  capacitance?: number // μF
  resistance?: number // Ω (灯泡内阻)
  isDC?: number // 0: AC, 1: DC
  mode?: number // 0: R vs L, 1: R vs C, 2: L vs C
  time: number // s
}

export interface BranchState {
  label: string
  deviceType: 'resistor' | 'inductor' | 'capacitor'
  reactance: number // Ω
  impedance: number // Ω
  current: number // A (有效值)
  power: number // W (灯泡功率)
  relativeBrightness: number // 0~1 归一化亮度
  instantCurrentPhase: number // 瞬时电流相位用于粒子位移
}

export interface ACImpedancePhysicsResult {
  frequency: number
  voltage: number
  isDC: boolean
  mode: number
  XL: number
  XC: number
  f0: number
  branchA: BranchState
  branchB: BranchState
  xlCurvePoints: { x: number; y: number }[]
  xcCurvePoints: { x: number; y: number }[]
}

const BASE_POWER_NORM = 200 // 标称归一化功率标准

export function useACImpedancePhysics(params: ACImpedanceParams): ACImpedancePhysicsResult {
  const {
    voltage = 100,
    frequency = 50,
    inductance = 0.5,
    capacitance = 100, // 100 μF
    resistance = 30, // 灯泡电阻
    isDC: isDCParam = 0,
    mode = 0,
    time,
  } = params

  const isDC = isDCParam === 1
  const capFarad = Math.max(1e-6, capacitance * 1e-6)

  return useMemo(() => {
    const effectiveFreq = isDC ? 0 : Math.max(1, frequency)
    const XL = calculateInductiveReactance(effectiveFreq, inductance)
    const XC = calculateCapacitiveReactance(effectiveFreq, capFarad)
    const f0 = calculateResonanceFrequency(inductance, capFarad)

    // 人教版控制变量法基准：
    // 线圈具备固有的直流电阻 R_coil (15 Ω)
    // 纯电阻支路选用阻值等于 R_coil 的定值电阻作为严格对照
    const coilDCR = 15

    let typeA: 'resistor' | 'inductor' | 'capacitor' = 'resistor'
    let typeB: 'resistor' | 'inductor' | 'capacitor' = 'inductor'
    let labelA = '支路 1: 对照电阻 (R=15Ω)'
    let labelB = '支路 2: 电感线圈 (L, r=15Ω)'

    if (mode === 1) {
      typeA = 'resistor'
      typeB = 'capacitor'
      labelA = '支路 1: 对照电阻 (R=15Ω)'
      labelB = '支路 2: 电容器 C'
    } else if (mode === 2) {
      typeA = 'inductor'
      typeB = 'capacitor'
      labelA = '支路 1: 电感线圈 L'
      labelB = '支路 2: 电容器 C'
    }

    const getBranchState = (
      type: 'resistor' | 'inductor' | 'capacitor',
      label: string,
    ): BranchState => {
      let reactance = 0
      let phaseShift = 0
      let seriesRes = 0

      if (type === 'resistor') {
        seriesRes = coilDCR
      } else if (type === 'inductor') {
        reactance = XL
        phaseShift = -Math.PI / 4
        seriesRes = coilDCR
      } else if (type === 'capacitor') {
        reactance = XC
        phaseShift = Math.PI / 4
        seriesRes = 0
      }

      // 计算有效值电流与灯泡消耗功率
      const totalR = resistance + seriesRes
      const calc = calculateBranchCurrentAndPower(
        voltage,
        totalR,
        reactance,
        isDC,
        0,
      )

      // 灯泡本身分担的功率 P = I² * resistance
      const bulbPower = calc.current * calc.current * resistance
      const relativeBrightness = Math.min(1, Math.max(0, bulbPower / BASE_POWER_NORM))

      // 瞬时载流子运动相位
      const omega = isDC ? 0 : 2 * Math.PI * effectiveFreq
      const instantCurrentPhase = isDC
        ? calc.current > 0
          ? 1
          : 0
        : Math.sin(omega * time + phaseShift)

      return {
        label,
        deviceType: type,
        reactance,
        impedance: calc.impedance,
        current: calc.current,
        power: bulbPower,
        relativeBrightness,
        instantCurrentPhase,
      }
    }

    const branchA = getBranchState(typeA, labelA)
    const branchB = getBranchState(typeB, labelB)

    // 构建频响特性曲线 (f 从 5 Hz 到 150 Hz)
    const xlCurvePoints: { x: number; y: number }[] = []
    const xcCurvePoints: { x: number; y: number }[] = []
    const fMax = 150
    const step = 2.5
    for (let f = 5; f <= fMax; f += step) {
      const curXL = calculateInductiveReactance(f, inductance)
      const curXC = calculateCapacitiveReactance(f, capFarad)
      xlCurvePoints.push({ x: f, y: Math.min(600, curXL) })
      xcCurvePoints.push({ x: f, y: Math.min(600, curXC) })
    }

    return {
      frequency: effectiveFreq,
      voltage,
      isDC,
      mode,
      XL,
      XC,
      f0,
      branchA,
      branchB,
      xlCurvePoints,
      xcCurvePoints,
    }
  }, [voltage, frequency, inductance, capFarad, resistance, isDC, mode, time])
}
