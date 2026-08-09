import { useMemo } from 'react'
import { wavelengthToHex } from '@/physics/optics'

interface UseDoubleSlitInterferencePhysicsParams {
  wavelength: number      // 波长 nm (400 ~ 700)
  slitDistance: number    // 双缝间距 mm (0.1 ~ 0.5)
  screenDistance: number  // 缝屏距离 m (0.5 ~ 2.0)
}

export interface DoubleSlitInterferencePhysicsResult {
  fringeSpacing: number   // 条纹物理间距 mm
  wavelengthColor: string // 波长对应的 HEX 颜色
}

/**
 * 计算光的双缝干涉物理状态（纯物理量，不含视觉布局）
 */
export function useDoubleSlitInterferencePhysics({
  wavelength,
  slitDistance,
  screenDistance,
}: UseDoubleSlitInterferencePhysicsParams): DoubleSlitInterferencePhysicsResult {
  return useMemo(() => {
    // 1. 物理条纹间距: Δx = (L / d) * λ (单位: mm)
    const fringeSpacing = (screenDistance / slitDistance) * wavelength * 1e-3

    // 2. 映射波长到颜色
    const wavelengthColor = wavelengthToHex(wavelength)

    return {
      fringeSpacing,
      wavelengthColor,
    }
  }, [wavelength, slitDistance, screenDistance])
}