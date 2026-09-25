import { useMemo } from 'react'
import {
  calculateThinFilmInterference,
  calculateWedgeFringeSpacing,
  calculateNewtonRingRadius,
  type ThinFilmPhysicsResult,
} from '@/physics'

export interface ThinFilmInterferenceParams {
  mode: number            // 0=增透膜, 1=劈尖等厚干涉, 2=牛顿环
  wavelength: number      // nm (400 ~ 700)
  filmThickness: number   // nm (50 ~ 600, 用于增透膜模式)
  n_film: number          // 薄膜折射率 (1.2 ~ 2.0)
  wedgeAngle_mrad?: number // 劈尖倾角 (毫弧度 mrad, 用于劈尖模式, 0.1 ~ 1.0)
  defect?: number         // 工件表面缺陷 (0=平整, 1=凹陷, 2=凸起)
  time?: number           // 时间 (用于波动光场微相位流动动画)
}

export interface ThinFilmInterferenceHookResult {
  // 增透膜物理结果
  thinFilm: ThinFilmPhysicsResult
  // 劈尖干涉条纹间距 (mm)
  wedgeSpacing_mm: number
  // 劈尖干涉条纹周期像素跨度 (设计像素)
  wedgeSpacingPx: number
  // 牛顿环前 6 级暗环半径 (mm 与设计像素)
  newtonRings: Array<{ m: number; r_mm: number; r_px: number }>
  // 光波动态相位偏移 (0 ~ 2π)
  wavePhase: number
}

export function useThinFilmInterferencePhysics({
  mode: _mode,
  wavelength,
  filmThickness,
  n_film,
  wedgeAngle_mrad = 0.3,
  time = 0,
}: ThinFilmInterferenceParams): ThinFilmInterferenceHookResult {
  return useMemo(() => {
    // 1. 计算薄膜干涉核心量 (基底默认玻璃 n=1.52)
    const thinFilm = calculateThinFilmInterference({
      wavelength_nm: wavelength,
      filmThickness_nm: filmThickness,
      n_film,
      n_substrate: 1.52,
      theta_i_deg: 0,
    })

    // 2. 劈尖干涉条纹间距
    const angle_rad = Math.max(1e-5, (wedgeAngle_mrad || 0.3) * 1e-3)
    const wedgeSpacing_mm = calculateWedgeFringeSpacing(wavelength, angle_rad, 1.0)
    // 视觉映射：设定 1mm 对应约 35 设计像素，并在合理范围 clamp
    const wedgeSpacingPx = Math.max(18, Math.min(120, wedgeSpacing_mm * 35))

    // 3. 牛顿环暗环半径（设透镜曲率半径 R = 2.0 m）
    const R_lens = 2.0
    const newtonRings = [1, 2, 3, 4, 5, 6, 7, 8].map((m) => {
      const r_mm = calculateNewtonRingRadius(m, R_lens, wavelength)
      // 视觉映射：放大 120 倍映射到 SVG 设计像素
      const r_px = r_mm * 120
      return { m, r_mm, r_px }
    })

    // 4. 波动微动画相位
    const wavePhase = (time * 4) % (2 * Math.PI)

    return {
      thinFilm,
      wedgeSpacing_mm,
      wedgeSpacingPx,
      newtonRings,
      wavePhase,
    }
  }, [wavelength, filmThickness, n_film, wedgeAngle_mrad, time])
}
