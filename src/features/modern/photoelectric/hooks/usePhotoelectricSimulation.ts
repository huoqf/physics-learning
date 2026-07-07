import { useRef, useCallback } from 'react'
import { useSimulationFrame } from '@/utils/animation'
import {
  frequencyToPhotonEnergy,
  calculateMaxKineticEnergy,
  calculateStoppingVoltage,
  intensityToSaturationCurrent,
} from '@/physics/photoelectric'

export interface Photoelectron {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  initVx: number
  active: boolean
}

export interface PhotonParticle {
  id: number
  x: number
  y: number
  vx: number
  active: boolean
}

interface SimulationParams {
  frequency: number     // ×10¹⁴ Hz
  intensity: number     // 0~100%
  voltage: number       // V (负值 = 反向)
  mode: number          // 0=初学, 1=通关
  showPhotonModel: number
  workFunction?: number // eV (default 2.14 Cs)
}

interface SimulationState {
  photoelectrons: Photoelectron[]
  photonParticles: PhotonParticle[]
}

/** 铯逸出功 (eV) */
const DEFAULT_W0 = 2.14

/** 极板区域像素范围（相对于画布中心） */
const PLATE_GAP = 100    // K-A 极板间距 (px)
const PLATE_HALF_H = 50  // 极板半高 (px)

/**
 * 光电效应粒子仿真 Hook
 *
 * 使用 useSimulationFrame 驱动粒子状态更新。
 * Canvas 组件消费返回的粒子数组进行渲染。
 */
export function usePhotoelectricSimulation(
  params: SimulationParams,
  canvasWidth: number,
  canvasHeight: number,
) {
  const W0 = params.workFunction ?? DEFAULT_W0

  // 派生物理量
  const hv = frequencyToPhotonEnergy(params.frequency)
  const isPE = hv >= W0
  const Ekm = calculateMaxKineticEnergy(hv, W0)
  const Uc = calculateStoppingVoltage(Ekm)
  const Imax = intensityToSaturationCurrent(params.intensity)

  // 粒子状态 (useRef 避免每帧重渲染)
  const stateRef = useRef<SimulationState>({
    photoelectrons: [],
    photonParticles: [],
  })
  const nextIdRef = useRef(0)
  const lastEmitTimeRef = useRef(0)

  // 清空粒子（参数变化时）
  const resetParticles = useCallback(() => {
    stateRef.current = { photoelectrons: [], photonParticles: [] }
    nextIdRef.current = 0
    lastEmitTimeRef.current = 0
  }, [])

  // Canvas 中心坐标
  const cx = canvasWidth / 2
  const cy = canvasHeight / 2
  const kPlateX = cx - PLATE_GAP / 2
  const aPlateX = cx + PLATE_GAP / 2

  // useSimulationFrame 驱动粒子更新
  useSimulationFrame((deltaTimeMs) => {
    const dt = Math.min(deltaTimeMs / 1000, 0.033) // 钳制到 ~30fps
    const state = stateRef.current

    // ─── 发射光电子 ───
    if (isPE && params.intensity > 0) {
      const now = performance.now()
      // 发射间隔与光强成反比 (50ms ~ 500ms)
      const emitInterval = 500 - (params.intensity / 100) * 450
      if (now - lastEmitTimeRef.current > emitInterval) {
        // 初速度正比于 sqrt(Ekm)（映射为像素速度 2~6 px/frame）
        const baseVel = isPE ? 2.0 + Math.sqrt(Ekm) * 1.5 : 2.0
        const randY = cy - PLATE_HALF_H * 0.8 + Math.random() * PLATE_HALF_H * 1.6

        state.photoelectrons.push({
          id: nextIdRef.current++,
          x: kPlateX + 5,
          y: randY,
          vx: baseVel,
          vy: (Math.random() - 0.5) * 0.6,
          initVx: baseVel,
          active: true,
        })
        lastEmitTimeRef.current = now
      }
    }

    // ─── 发射光子微粒（仅微粒模式） ───
    if (params.showPhotonModel === 1) {
      const now = performance.now()
      if (now - lastEmitTimeRef.current > 120) {
        state.photonParticles.push({
          id: nextIdRef.current++,
          x: kPlateX - 120,
          y: cy + (Math.random() - 0.5) * 30,
          vx: 4.0,
          active: true,
        })
        lastEmitTimeRef.current = now
      }
    }

    // ─── 更新光电子运动 ───
    // 反向电场加速度: a = -eU/(md)，简化为 a = -k * U
    // 当 U > 0（正向加速），a > 0
    // 当 U < 0（反向减速），a < 0
    const effectiveVoltage = params.mode === 1 ? params.voltage : 0
    const ax = -0.15 * effectiveVoltage // 负 U 产生向左加速度

    for (const p of state.photoelectrons) {
      if (!p.active) continue

      // 受电场加速/减速
      p.vx += ax * dt * 60 // 归一化到帧率
      p.x += p.vx
      p.y += p.vy

      // 到达阳极 A → 被吸收
      if (p.x >= aPlateX) {
        p.active = false
      }
      // 折返回阴极 K → 被吸收
      else if (p.vx <= 0 && p.x <= kPlateX) {
        p.active = false
      }
      // 超出上下边界
      else if (p.y < cy - PLATE_HALF_H - 20 || p.y > cy + PLATE_HALF_H + 20) {
        p.active = false
      }
    }

    // ─── 更新光子微粒 ───
    for (const ph of state.photonParticles) {
      if (!ph.active) continue
      ph.x += ph.vx
      // 到达阴极板 → 消失
      if (ph.x >= kPlateX) {
        ph.active = false
      }
    }

    // ─── 清理非活跃粒子（保留最近 200 个） ───
    state.photoelectrons = state.photoelectrons.filter(p => p.active).slice(-200)
    state.photonParticles = state.photonParticles.filter(p => p.active).slice(-100)
  })

  return {
    /** 当前光电子列表（仅 active=true 的） */
    getPhotoelectrons: () => stateRef.current.photoelectrons.filter(p => p.active),
    /** 当前光子微粒列表 */
    getPhotonParticles: () => stateRef.current.photonParticles.filter(p => p.active),
    /** 清空所有粒子 */
    resetParticles,
    /** 派生物理量 */
    derived: {
      hv,
      isPE,
      Ekm,
      Uc,
      Imax,
      kPlateX,
      aPlateX,
      cx,
      cy,
    },
  }
}
