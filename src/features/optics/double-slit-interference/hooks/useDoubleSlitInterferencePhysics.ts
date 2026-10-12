import { useMemo } from 'react'
import {
  calculateDoubleSlitPhysics,
  DOUBLE_SLIT_BASE_READING_MM,
  MICROMETER_MAX_READING_MM,
  type DoubleSlitPhysicsState,
} from '@/physics/optics'
import { wavelengthToHex } from '@/physics/optics'

export interface UseDoubleSlitInterferencePhysicsParams {
  /** 光的波长 nm (400 ~ 700) */
  wavelength: number
  /** 双缝间距 mm (0.1 ~ 0.5) */
  slitDistance: number
  /** 缝屏距离 m (0.5 ~ 2.0) */
  screenDistance: number
  /** 模式: 0 为理论演示, 1 为高考实验 */
  mode?: number
  /** 逐差法测量的目标条纹序号 n (默认 4) */
  targetFringe?: number
  /** 当前十字分划丝瞄准的条纹序号 (默认 1) */
  currentFringe?: number
  /** 测微手轮对准微调偏移量 (mm，默认 0) */
  handwheelOffset?: number
}

export interface DoubleSlitInterferencePhysicsResult extends DoubleSlitPhysicsState {
  /** 波长对应的 HEX 颜色 */
  wavelengthColor: string
}

export { DOUBLE_SLIT_BASE_READING_MM, MICROMETER_MAX_READING_MM }

/**
 * 光的双缝干涉与高考实验测量状态 Hook
 *
 * 底层基于纯物理模块 calculateDoubleSlitPhysics，保证与右屏看板 100% 数据一致 (SSOT)。
 * 前置物理条件说明：
 * - 只有当学生将分划板十字丝切换并瞄准第 1 条亮纹 (activeFringe=1) 或第 n 条亮纹 (activeFringe=n) 时，
 *   转动手轮微调产生的对准偏移量才计入该条纹实测值，模拟高考实验中对准条纹中心的偶然误差并引发逐差波长偏差。
 */
export function useDoubleSlitInterferencePhysics({
  wavelength,
  slitDistance,
  screenDistance,
  targetFringe = 4,
  currentFringe = 1,
  handwheelOffset = 0,
}: UseDoubleSlitInterferencePhysicsParams): DoubleSlitInterferencePhysicsResult {
  return useMemo(() => {
    // 纯物理计算（含安全兜底、读数计算、逐差反求与量程判定）
    const physicsState = calculateDoubleSlitPhysics({
      wavelength,
      slitDistance,
      screenDistance,
      targetFringe,
      activeFringe: currentFringe,
      handwheelOffset,
    })

    // 视觉色彩映射
    const wavelengthColor = wavelengthToHex(wavelength)

    return {
      ...physicsState,
      wavelengthColor,
    }
  }, [wavelength, slitDistance, screenDistance, targetFringe, currentFringe, handwheelOffset])
}