import { useMemo } from 'react'
import {
  calculateSaturatedVaporPressure,
  calculateRelativeHumidity,
  calculatePhaseFlux,
} from '@/physics/thermodynamics/saturatedVapor'

export interface UseSaturatedVaporPhysicsOptions {
  tempCelsius: number // 温度 (℃)
  vaporPressure: number // 蒸汽分压 (Pa)
  pistonVolume: number // 气缸相对体积标量 (0.5 ~ 2.0)
  time: number
}

export interface SaturatedVaporPhysicsResult {
  ps: number
  rh: number
  status: 'unsaturated' | 'saturated' | 'supersaturated'
  dewPoint: number
  evapFlux: number
  condFlux: number
  isBalanced: boolean
  pistonHeight: number // 活塞设计高度 (px)
  curvePoints: { x: number; y: number }[]
}

export function useSaturatedVaporPhysics({
  tempCelsius,
  vaporPressure,
  pistonVolume,
}: UseSaturatedVaporPhysicsOptions): SaturatedVaporPhysicsResult {
  return useMemo(() => {
    const humidity = calculateRelativeHumidity(vaporPressure, tempCelsius)
    const flux = calculatePhaseFlux(vaporPressure, tempCelsius)

    // 生成 ps - T 特性曲线 (0℃ ~ 60℃)
    const curvePoints: { x: number; y: number }[] = []
    for (let t = 0; t <= 60; t += 2) {
      curvePoints.push({
        x: t,
        y: +(calculateSaturatedVaporPressure(t) / 1000).toFixed(2), // 单位 kPa
      })
    }

    // 活塞高度映射
    const pistonHeight = 80 + pistonVolume * 70

    return {
      ps: humidity.ps,
      rh: humidity.rh,
      status: humidity.status,
      dewPoint: humidity.dewPoint,
      evapFlux: flux.evapFlux,
      condFlux: flux.condFlux,
      isBalanced: flux.isBalanced,
      pistonHeight,
      curvePoints,
    }
  }, [tempCelsius, vaporPressure, pistonVolume])
}
