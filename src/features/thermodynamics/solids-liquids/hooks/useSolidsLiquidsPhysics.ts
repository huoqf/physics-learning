import { useMemo } from 'react'
import {
  generateLatticeNodes,
  calculateSurfaceTensionForce,
  calculateCapillaryRise,
  type CrystalLatticeNode,
} from '@/physics/thermodynamics/solidsLiquids'

export interface UseSolidsLiquidsPhysicsOptions {
  mode: number // 0: 晶体/非晶体, 1: 表面张力, 2: 浸润毛细
  solidType: number // 0: 单晶体, 1: 多晶体, 2: 非晶体
  gamma: number // 表面张力系数 (N/m)
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
  mode: _mode,
  solidType,
  gamma,
  capillaryRadius,
  isMercury,
}: UseSolidsLiquidsPhysicsOptions): SolidsLiquidsPhysicsResult {
  return useMemo(() => {
    // 1. 点阵微观生成
    const typeKey = solidType === 0 ? 'singleCrystal' : solidType === 1 ? 'polycrystal' : 'amorphous'
    const latticeNodes = generateLatticeNodes(typeKey, 7, 7, 24)

    // 2. 表面张力计算 (细丝框长假设 L = 0.08m)
    const surfaceForce = calculateSurfaceTensionForce(gamma, 0.08)

    // 3. 毛细上升计算
    const theta = isMercury === 1 ? (140 * Math.PI) / 180 : 0
    const rho = isMercury === 1 ? 13600 : 1000
    const rMeters = (capillaryRadius / 1000)
    const capillaryRise = calculateCapillaryRise(gamma, theta, rMeters, rho, 9.8)

    return {
      latticeNodes,
      surfaceForce,
      capillaryRise,
    }
  }, [solidType, gamma, capillaryRadius, isMercury])
}
