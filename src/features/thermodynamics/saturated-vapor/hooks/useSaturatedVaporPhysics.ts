import { useMemo } from 'react'
import {
  calculateRelativeHumidity,
  calculatePhaseFlux,
  calculateVaporPressureWithVolume,
} from '@/physics/thermodynamics/saturatedVapor'

export interface UseSaturatedVaporPhysicsOptions {
  tempCelsius: number // 温度 (℃)
  referencePressure: number // V = 1 时的水蒸气分压基准值 (Pa)，正比于水蒸气物质的量
  pistonVolume: number // 气缸容积标量 (0.5 ~ 2.0)
}

export interface SaturatedVaporPhysicsResult {
  vaporPressure: number // 实际水蒸气分压 p (Pa)
  ps: number // 当前温度饱和汽压 (Pa)
  isSaturated: boolean // 是否已达饱和（继续压缩将导致蒸汽液化）
  vaporFraction: number // 气相中剩余蒸汽占比 (0 ~ 1)
  rh: number
  dewPoint: number
  evapFlux: number
  condFlux: number
  pistonHeight: number // 活塞设计高度 (px)
}

export function useSaturatedVaporPhysics({
  tempCelsius,
  referencePressure,
  pistonVolume,
}: UseSaturatedVaporPhysicsOptions): SaturatedVaporPhysicsResult {
  return useMemo(() => {
    // 1. 等温 p-V 关系：未饱和时遵循玻意耳定律，达到 ps 后压强锁定
    const state = calculateVaporPressureWithVolume(
      referencePressure,
      pistonVolume,
      tempCelsius,
    )

    // 2. 以真实分压 p 计算相对湿度与相变通量
    const humidity = calculateRelativeHumidity(state.p, tempCelsius)
    const flux = calculatePhaseFlux(state.p, tempCelsius)

    // 活塞高度与气体体积成正比（气缸截面积恒定）
    const pistonHeight = 80 + pistonVolume * 70

    return {
      vaporPressure: state.p,
      ps: state.ps,
      isSaturated: state.isSaturated,
      vaporFraction: state.vaporFraction,
      rh: humidity.rh,
      dewPoint: humidity.dewPoint,
      evapFlux: flux.evapFlux,
      condFlux: flux.condFlux,
      pistonHeight,
    }
  }, [tempCelsius, referencePressure, pistonVolume])
}
