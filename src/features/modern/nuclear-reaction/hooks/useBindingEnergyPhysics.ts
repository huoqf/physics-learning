import { useMemo } from 'react'
import type { NuclearParticle } from '../model/constants'
import type { NuclideData } from '../model/constants'

export interface BindingEnergyPhysicsResult {
  leftParticles: NuclearParticle[]
  rightParticles: NuclearParticle[]
  balanceAngle: number
  weightY: number
  isBound: boolean
  isCombining: boolean
  showFlash: boolean
  showPhotonEmitted: boolean
  photonProgress: number
  leftPlateCenter: { x: number; y: number }
  rightPlateCenter: { x: number; y: number }
  pivot: { x: number; y: number }
  beamL: number
  ropeH: number
  plateY: number
}

/**
 * 结合能与质量亏损模式的天平物理计算。
 *
 * 根据 time (0 ~ 10s) 划分为三个阶段：
 * - [0, 3.5]：分离晃动阶段
 * - [3.5, 4.5]：飞向右盘并结合阶段
 * - [4.5, 10.0]：已结合稳定阶段
 */
export function useBindingEnergyPhysics(
  currentNuclide: NuclideData,
  showMassDefectWeight: number,
  time: number,
): BindingEnergyPhysicsResult | null {
  return useMemo(() => {
    const Z = currentNuclide.Z
    const N = currentNuclide.N
    const A = Z + N

    // 天平基本几何常数 (物理坐标系，米)
    const pivot = { x: 0, y: 0.4 }
    const beamL = 2.5
    const ropeH = 1.2
    const plateY = -0.8

    const tCombineStart = 3.5
    const tCombineEnd = 4.5
    const isBound = time >= tCombineEnd
    const isCombining = time >= tCombineStart && time < tCombineEnd

    const showFlash = time >= 4.3 && time <= 4.8
    const showPhotonEmitted = time >= 4.4 && time < 5.8
    const photonProgress = showPhotonEmitted ? (time - 4.4) / 1.4 : 0

    // 计算天平倾斜角 (balanceAngle，度数)
    let balanceAngle = 0
    const weightTargetRelY = 0.12
    const weightStartRelY = 1.8
    let weightRelY = weightStartRelY

    if (time < tCombineEnd) {
      if (showMassDefectWeight === 1) {
        balanceAngle = -4.5
        weightRelY = weightTargetRelY
      } else {
        balanceAngle = 0
        weightRelY = weightStartRelY
      }
    } else {
      if (showMassDefectWeight === 0) {
        const t = Math.min(1, (time - tCombineEnd) / 0.7)
        balanceAngle = 5 * t
        weightRelY = weightStartRelY
      } else {
        if (time < 5.2) {
          const fallProgress = (time - tCombineEnd) / 0.7
          weightRelY = weightStartRelY - (weightStartRelY - weightTargetRelY) * fallProgress
          balanceAngle = 5 * fallProgress
        } else {
          weightRelY = weightTargetRelY
          const returnProgress = Math.min(1, (time - 5.2) / 0.8)
          balanceAngle = 5 - 5 * returnProgress
        }
      }
    }

    const theta = (balanceAngle * Math.PI) / 180
    const leftPlateCenter = {
      x: pivot.x - beamL * Math.cos(theta),
      y: pivot.y - beamL * Math.sin(theta) - ropeH,
    }
    const rightPlateCenter = {
      x: pivot.x + beamL * Math.cos(theta),
      y: pivot.y + beamL * Math.sin(theta) - ropeH,
    }

    const weightY = rightPlateCenter.y + weightRelY

    // 确定性伪随机抖动偏移（核子热运动）
    const getRandomOffset = (id: string, amp: number = 0.03) => {
      const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const freq = 3 + (seed % 5)
      const dx = Math.sin(time * freq + seed) * amp
      const dy = Math.cos(time * freq * 1.3 + seed) * amp
      return { dx, dy }
    }

    const leftParticles: NuclearParticle[] = []
    const rightParticles: NuclearParticle[] = []

    const getKernelPosition = (index: number) => {
      if (index === 0) return { x: 0, y: 0 }
      const goldRatio = (Math.sqrt(5) - 1) / 2
      const radius = 0.20 * Math.sqrt(index)
      const th = index * 2 * Math.PI * goldRatio
      return {
        x: radius * Math.cos(th),
        y: radius * Math.sin(th) + 0.12,
      }
    }

    const getSeparatedPosition = (index: number, total: number) => {
      const cols = Math.min(4, Math.ceil(Math.sqrt(total)))
      const col = index % cols
      const row = Math.floor(index / cols)
      const spacing = 0.25
      const xOffset = -(cols - 1) * spacing * 0.5
      return {
        x: xOffset + col * spacing,
        y: 0.15 + row * spacing,
      }
    }

    const totalParticlesCount = A

    for (let i = 0; i < totalParticlesCount; i++) {
      const isProton = i < Z
      const id = `${isProton ? 'p' : 'n'}-${i}`
      const type = isProton ? ('proton' as const) : ('neutron' as const)

      const leftBase = getSeparatedPosition(i, totalParticlesCount)
      const leftShake = getRandomOffset(id + '-left', 0.03)
      leftParticles.push({
        id: id + '-left',
        type,
        x: leftPlateCenter.x + leftBase.x + leftShake.dx,
        y: leftPlateCenter.y + leftBase.y + leftShake.dy,
      })

      const rightSep = getSeparatedPosition(i, totalParticlesCount)
      const rightShake = getRandomOffset(id + '-right-sep', 0.03)
      const boundPos = getKernelPosition(i)

      let rx = 0
      let ry = 0

      if (time < tCombineStart) {
        rx = rightPlateCenter.x + rightSep.x + rightShake.dx
        ry = rightPlateCenter.y + rightSep.y + rightShake.dy
      } else if (time >= tCombineStart && time < tCombineEnd) {
        const progress = (time - tCombineStart) / (tCombineEnd - tCombineStart)
        const ease = progress * progress * (3 - 2 * progress)
        const startRelX = rightSep.x + rightShake.dx
        const startRelY = rightSep.y + rightShake.dy
        const targetRelX = boundPos.x
        const targetRelY = boundPos.y

        const curRelX = startRelX + (targetRelX - startRelX) * ease
        const curRelY = startRelY + (targetRelY - startRelY) * ease

        rx = rightPlateCenter.x + curRelX
        ry = rightPlateCenter.y + curRelY
      } else {
        const nucShake = getRandomOffset(id + '-right-bound', 0.005)
        rx = rightPlateCenter.x + boundPos.x + nucShake.dx
        ry = rightPlateCenter.y + boundPos.y + nucShake.dy
      }

      rightParticles.push({
        id: id + '-right',
        type,
        x: rx,
        y: ry,
      })
    }

    return {
      leftParticles,
      rightParticles,
      balanceAngle,
      weightY,
      isBound,
      isCombining,
      showFlash,
      showPhotonEmitted,
      photonProgress,
      leftPlateCenter,
      rightPlateCenter,
      pivot,
      beamL,
      ropeH,
      plateY,
    }
  }, [currentNuclide, showMassDefectWeight, time])
}
