import { useMemo } from 'react'
import {
  generateLatticeNodes,
  calculateSurfaceTensionForce,
  calculateCapillaryRise,
  LIQUID_SURFACE_TENSION,
  LIQUID_CONTACT_ANGLE,
  LIQUID_DENSITY,
  type CrystalLatticeNode,
} from '@/physics/thermodynamics/solidsLiquids'

export interface UseSolidsLiquidsPhysicsOptions {
  solidType: number // 0: 单晶体, 1: 多晶体, 2: 非晶体
  gamma: number // 表面张力系数 (N/m)，仅模式 1 表面张力实验可调
  capillaryRadius: number // 毛细管半径 (mm)
  isMercury: number // 0: 水 (浸润), 1: 水银 (不浸润)
}

export interface SolidsLiquidsPhysicsResult {
  latticeNodes: CrystalLatticeNode[]
  surfaceForce: number
  capillaryRise: {
    h: number
    isWetting: boolean
    meniscusType: 'concave' | 'convex' | 'flat'
  }
}

export function useSolidsLiquidsPhysics({
  solidType,
  gamma,
  capillaryRadius,
  isMercury,
}: UseSolidsLiquidsPhysicsOptions): SolidsLiquidsPhysicsResult {
  return useMemo(() => {
    // 1. 点阵微观生成
    const typeKey = solidType === 0 ? 'singleCrystal' : solidType === 1 ? 'polycrystal' : 'amorphous'
    const latticeNodes = generateLatticeNodes(typeKey, 7, 7, 24)

    // 2. 表面张力计算 (细丝框长假设 L = 0.08m，双面液膜 F = 2γL)
    const surfaceForce = calculateSurfaceTensionForce(gamma, 0.08)

    // 3. 毛细上升计算：γ、θ、ρ 均取实验液体的真实物性常数（水银 γ ≈ 0.465 N/m）
    const liquidKey = isMercury === 1 ? 'mercury' : 'water'
    const rMeters = capillaryRadius / 1000
    const capillaryRise = calculateCapillaryRise(
      LIQUID_SURFACE_TENSION[liquidKey],
      LIQUID_CONTACT_ANGLE[liquidKey],
      rMeters,
      LIQUID_DENSITY[liquidKey],
      9.8,
    )

    return {
      latticeNodes,
      surfaceForce,
      capillaryRise,
    }
  }, [solidType, gamma, capillaryRadius, isMercury])
}
