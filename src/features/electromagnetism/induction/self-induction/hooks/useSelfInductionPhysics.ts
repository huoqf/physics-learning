import { useMemo } from 'react'
import {
  calcTurnOnCurrent,
  calcTurnOffCurrent,
  checkFlashCondition,
  calcSelfInductanceEMF,
  calcEddyDampingOscillation,
} from '@/physics/electromagnetism/selfInduction'

export interface SelfInductionPhysicsParams {
  mode: number
  E?: number
  L?: number
  RL?: number
  RA?: number
  B?: number
  isSlotted?: number
  switchState?: number
  time: number
}

export interface SelfInductionPhysicsResult {
  mode: number
  // 通电/断电自感状态
  iCoil: number
  iLamp1: number
  iLamp2: number
  powerLamp1: number
  powerLamp2: number
  emfL: number
  willFlash: boolean
  flashRatio: number
  switchClosed: boolean
  // 电磁阻尼状态
  theta: number
  omega: number
  energyRatio: number
  isSlottedBool: boolean
  isInMagneticField: boolean
  // 图表点集
  chartSeries1: { x: number; y: number }[]
  chartSeries2: { x: number; y: number }[]
  tMax: number
}

export function useSelfInductionPhysics({
  mode = 0,
  E = 12,
  L = 2.0,
  RL = 2.0,
  RA = 6.0,
  B = 1.5,
  isSlotted = 0,
  switchState = 1,
  time,
}: SelfInductionPhysicsParams): SelfInductionPhysicsResult {
  return useMemo(() => {
    const isSlottedBool = isSlotted === 1
    const switchClosed = switchState === 1
    const { willFlash, ratio: flashRatio } = checkFlashCondition(RL, RA)

    let iCoil = 0
    let iLamp1 = 0
    let iLamp2 = 0
    let powerLamp1 = 0
    let powerLamp2 = 0
    let emfL = 0

    const tMax = mode === 2 ? 8 : 4
    const chartSeries1: { x: number; y: number }[] = []
    const chartSeries2: { x: number; y: number }[] = []
    const sampleSteps = 80

    if (mode === 0) {
      // Mode 0: 通电自感实验
      // 支路 1: 纯电阻变阻器 R0 + 灯泡 A1 (总阻值匹配至 RL + RA 使稳态亮度一致)
      // 支路 2: 线圈 L(内阻 RL) + 灯泡 A2(阻值 RA)
      const rBranch = RL + RA
      const iSteady = E / rBranch
      const ratedLampPower = iSteady * iSteady * RA

      if (switchClosed) {
        iLamp1 = iSteady
        powerLamp1 = 1.0 // 纯阻支路瞬时达到额定功率

        // 线圈支路电流逐渐爬升: I(t) = iSteady * (1 - exp(-t / tau))
        iCoil = calcTurnOnCurrent(time, E, rBranch, L)
        iLamp2 = iCoil
        const actualPower2 = iLamp2 * iLamp2 * RA
        // 严格平方律平滑变亮
        powerLamp2 = ratedLampPower > 0 ? Math.min(1.0, actualPower2 / ratedLampPower) : 0
        emfL = calcSelfInductanceEMF(time, E, rBranch, L)
      } else {
        iLamp1 = 0
        iLamp2 = 0
        powerLamp1 = 0
        powerLamp2 = 0
        iCoil = 0
        emfL = 0
      }

      for (let i = 0; i <= sampleSteps; i++) {
        const t = (i / sampleSteps) * tMax
        chartSeries1.push({ x: t, y: iSteady })
        chartSeries2.push({ x: t, y: calcTurnOnCurrent(t, E, rBranch, L) })
      }
    } else if (mode === 1) {
      // Mode 1: 断电自感实验
      // 开关闭合前稳态: 线圈电流 IL0 = E/RL, 灯泡电流 IA0 = E/RA
      // 断开瞬间: 线圈反向向灯泡放电, 初电流为 IL0
      const IL0 = E / RL
      const IA0 = E / RA
      const normalPower = IA0 * IA0 * RA

      if (switchClosed && time === 0) {
        // 尚未断开时，稳定通电发光
        iCoil = IL0
        iLamp1 = IA0
        powerLamp1 = 1.0
        emfL = 0
      } else {
        // 断开后局部回路放电 (以 time 为放电衰减时间)
        iCoil = calcTurnOffCurrent(time, E, RL, RA, L)
        iLamp1 = iCoil // 串联在同一放电回路
        emfL = iCoil * (RL + RA)

        // 发光功率平方律: P = I^2 * RA
        const currentPower = iLamp1 * iLamp1 * RA
        // 若 RL < RA, 则断开瞬间 currentPower / normalPower = (RA/RL)^2 > 1 (闪亮)
        powerLamp1 = normalPower > 0 ? currentPower / normalPower : 0
      }

      for (let i = 0; i <= sampleSteps; i++) {
        const t = (i / sampleSteps) * tMax
        chartSeries1.push({ x: t, y: calcTurnOffCurrent(t, E, RL, RA, L) })
      }
    } else {
      // Mode 2: 电磁阻尼摆动
      const theta0 = 0.45
      for (let i = 0; i <= sampleSteps; i++) {
        const t = (i / sampleSteps) * tMax
        const res = calcEddyDampingOscillation(t, theta0, B, isSlottedBool)
        chartSeries1.push({ x: t, y: res.theta })
      }
    }

    // 阻尼动力学与磁场空间边界判定
    const dampingRes = calcEddyDampingOscillation(time, 0.45, B, isSlottedBool)
    // 磁场区域位于摆角 |theta| <= 0.22 rad 范围内
    const isInMagneticField = Math.abs(dampingRes.theta) <= 0.22

    return {
      mode,
      iCoil,
      iLamp1,
      iLamp2,
      powerLamp1,
      powerLamp2,
      emfL,
      willFlash,
      flashRatio,
      switchClosed,
      theta: dampingRes.theta,
      omega: dampingRes.omega,
      energyRatio: dampingRes.energyRatio,
      isSlottedBool,
      isInMagneticField,
      chartSeries1,
      chartSeries2,
      tMax,
    }
  }, [mode, E, L, RL, RA, B, isSlotted, switchState, time])
}
