import { useMemo } from 'react'
import {
  calculateElectrostaticShielding,
  type ElectrostaticShieldingResult,
} from '@/physics/electromagnetism/electrostaticShielding'

export interface UseElectrostaticShieldingPhysicsOptions {
  E0: number
  mode: number
  isGrounded?: number
  tipRadius?: number
  showFieldLines?: number
}

export interface ElectrostaticShieldingPhysicsResult {
  shielding: ElectrostaticShieldingResult
  /** 场线路径数据 (在设计坐标系下自适应生成) */
  fieldLineOffsets: number[]
}

export function useElectrostaticShieldingPhysics({
  E0,
  mode,
  isGrounded,
  tipRadius,
}: UseElectrostaticShieldingPhysicsOptions): ElectrostaticShieldingPhysicsResult {
  return useMemo(() => {
    const shielding = calculateElectrostaticShielding({
      E0,
      mode,
      isGrounded,
      tipRadius,
    })

    // 生成 7 条横穿场景的基准 Y 偏移
    const fieldLineOffsets = [-150, -100, -50, 0, 50, 100, 150]

    return {
      shielding,
      fieldLineOffsets,
    }
  }, [E0, mode, isGrounded, tipRadius])
}
