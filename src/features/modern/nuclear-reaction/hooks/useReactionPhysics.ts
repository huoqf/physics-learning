import { useMemo } from 'react'
import type { NuclearParticle } from '../model/constants'

/** 核反应粒子群返回类型（聚变/裂变共用） */
export interface ReactionParticleResult {
  particles: NuclearParticle[]
  showFlash: boolean
  showLabel: boolean
  isReacted: boolean
  impactPoint: { x: number; y: number }
  labelPos: { x: number; y: number }
  reactionName: string
}

/** 链式反应铀核状态 */
export interface ChainReactorState {
  id: string
  gen: number
  x: number
  y: number
  tHit: number
  isHit: boolean
  isFissioned: boolean
  isShaking: boolean
}

/** 链式反应核子相对偏移 */
export interface SubNucleon {
  dx: number
  dy: number
  isProton: boolean
}

/** 链式反应冲击波 */
export interface Shockwave {
  x: number
  y: number
  radius: number
  opacity: number
}

/** 链式反应中子 */
export interface ChainNeutron {
  id: string
  x: number
  y: number
  vx?: number
  vy?: number
}

/** 链式反应完整返回类型 */
export interface ChainReactionPhysicsResult {
  reactorsState: ChainReactorState[]
  subNucleons: SubNucleon[]
  neutrons: ChainNeutron[]
  shockwaves: Shockwave[]
  reactionName: string
}

/**
 * 核反应模式的物理粒子动画计算 (mode === 1)。
 *
 * 根据 reactionType 分为三种子模式：
 * - 0: 轻核聚变 (D-T)
 * - 1: 重核单次裂变 (n + U-235)
 * - 2: 铀核链式反应
 */
export function useReactionPhysics(
  reactionType: number,
  time: number,
): ReactionParticleResult | ChainReactionPhysicsResult | null {
  return useMemo(() => {
    // ─── 子模式 0：轻核聚变 ───
    if (reactionType === 0) {
      return computeFusion(time)
    }

    // ─── 子模式 1：重核单次裂变 ───
    if (reactionType === 1) {
      return computeFission(time)
    }

    // ─── 子模式 2：铀核链式反应 ───
    return computeChainReaction(time)
  }, [reactionType, time])
}

/** 轻核聚变：氘(²H) + 氚(³H) -> 氦(⁴He) + 中子(n) + 17.6 MeV */
function computeFusion(time: number): ReactionParticleResult {
  const particles: NuclearParticle[] = []
  const showFlash = time >= 3.0 && time <= 3.6
  const showLabel = time >= 3.3
  const isReacted = time >= 3.2

  const tImpact = 3.0
  const tSeparate = 3.5

  const dCenter = { x: -3.5, y: 0 }
  const tCenter = { x: 3.5, y: 0 }
  const heTargetDir = { x: 0.8, y: -0.4 }
  const nTargetDir = { x: -1.6, y: 0.8 }

  const dNucleons = [
    { type: 'proton' as const, dx: -0.12, dy: 0.1 },
    { type: 'neutron' as const, dx: 0.12, dy: -0.1 },
  ]
  const tNucleons = [
    { type: 'proton' as const, dx: 0.0, dy: 0.15 },
    { type: 'neutron' as const, dx: -0.15, dy: -0.1 },
    { type: 'neutron' as const, dx: 0.15, dy: -0.1 },
  ]
  const heNucleons = [
    { type: 'proton' as const, dx: -0.13, dy: -0.1 },
    { type: 'proton' as const, dx: 0.13, dy: 0.1 },
    { type: 'neutron' as const, dx: -0.13, dy: 0.1 },
    { type: 'neutron' as const, dx: 0.13, dy: -0.1 },
  ]

  if (time < tImpact) {
    const progress = time / tImpact
    const curDX = dCenter.x + (0.0 - dCenter.x) * progress
    const curTX = tCenter.x + (0.0 - tCenter.x) * progress

    dNucleons.forEach((n, idx) => {
      particles.push({ id: `d-${idx}`, type: n.type, x: curDX + n.dx, y: dCenter.y + n.dy })
    })
    tNucleons.forEach((n, idx) => {
      particles.push({ id: `t-${idx}`, type: n.type, x: curTX + n.dx, y: tCenter.y + n.dy })
    })
  } else if (time >= tImpact && time < tSeparate) {
    const shakeAmp = 0.08 * Math.sin((time - tImpact) * 45)
    const combinedNucleons = [
      { type: 'proton' as const, dx: -0.12, dy: -0.1 },
      { type: 'proton' as const, dx: 0.12, dy: 0.1 },
      { type: 'neutron' as const, dx: -0.12, dy: 0.12 },
      { type: 'neutron' as const, dx: 0.12, dy: -0.12 },
      { type: 'neutron' as const, dx: 0.0, dy: 0.2 },
    ]
    combinedNucleons.forEach((n, idx) => {
      particles.push({
        id: `combined-${idx}`,
        type: n.type,
        x: 0.0 + n.dx + shakeAmp,
        y: 0.0 + n.dy + shakeAmp * 0.7,
      })
    })
  } else {
    const dt = time - tSeparate
    const heX = heTargetDir.x * dt
    const heY = heTargetDir.y * dt
    const nX = nTargetDir.x * dt
    const nY = nTargetDir.y * dt

    heNucleons.forEach((n, idx) => {
      particles.push({ id: `he-${idx}`, type: n.type, x: heX + n.dx, y: heY + n.dy })
    })
    particles.push({ id: 'emitted-n', type: 'neutron', x: nX, y: nY, vx: nTargetDir.x, vy: nTargetDir.y })
  }

  return {
    particles,
    showFlash,
    showLabel,
    isReacted,
    impactPoint: { x: 0, y: 0 },
    labelPos: { x: 0.5, y: 0.8 },
    reactionName: '轻核聚变 (D-T 聚变)',
  }
}

/** 重核单次裂变：n + ²³⁵U -> ¹⁴⁴Ba + ⁸⁹Kr + 3n + 200 MeV */
function computeFission(time: number): ReactionParticleResult {
  const particles: NuclearParticle[] = []
  const showFlash = time >= 3.8 && time <= 4.4
  const showLabel = time >= 4.0
  const isReacted = time >= 3.8

  const tImpact = 2.5
  const tSeparate = 3.8

  const initNeutronStart = { x: -4.5, y: 0 }
  const u235Center = { x: 0.5, y: 0 }

  const getU235Nucleons = () => {
    const uParticles = []
    const count = 38
    const rMax = 0.8
    for (let i = 0; i < count; i++) {
      const isProton = i % 2.3 < 1.0
      const type = isProton ? ('proton' as const) : ('neutron' as const)
      const goldRatio = (Math.sqrt(5) - 1) / 2
      const radius = rMax * Math.sqrt(i / count)
      const theta = i * 2 * Math.PI * goldRatio
      uParticles.push({
        id: `u-${i}`,
        type,
        rx: radius * Math.cos(theta),
        ry: radius * Math.sin(theta),
      })
    }
    return uParticles
  }

  const uNucleons = getU235Nucleons()

  const getBaNucleons = () => {
    const pts = []
    for (let i = 0; i < 18; i++) {
      const isProton = i % 2.5 < 1.0
      const radius = 0.45 * Math.sqrt(i / 18)
      const theta = i * 2 * Math.PI * 0.618
      pts.push({ type: isProton ? 'proton' as const : 'neutron' as const, dx: radius * Math.cos(theta), dy: radius * Math.sin(theta) })
    }
    return pts
  }

  const getKrNucleons = () => {
    const pts = []
    for (let i = 0; i < 12; i++) {
      const isProton = i % 2.8 < 1.0
      const radius = 0.35 * Math.sqrt(i / 12)
      const theta = i * 2 * Math.PI * 0.618
      pts.push({ type: isProton ? 'proton' as const : 'neutron' as const, dx: radius * Math.cos(theta), dy: radius * Math.sin(theta) })
    }
    return pts
  }

  const baNucleons = getBaNucleons()
  const krNucleons = getKrNucleons()

  const nDirs = [
    { x: -1.2, y: 1.0 },
    { x: -0.8, y: -1.2 },
    { x: 1.4, y: 0.9 },
  ]
  const baDir = { x: -0.4, y: -0.6 }
  const krDir = { x: 0.6, y: -0.4 }

  if (time < tImpact) {
    const progress = time / tImpact
    const nx = initNeutronStart.x + (u235Center.x - 0.7 - initNeutronStart.x) * progress
    particles.push({ id: 'incident-n', type: 'neutron', x: nx, y: 0 })
    uNucleons.forEach((n) => {
      const shake = Math.sin(time * 5 + parseFloat(n.id.split('-')[1])) * 0.015
      particles.push({ id: n.id, type: n.type, x: u235Center.x + n.rx + shake, y: u235Center.y + n.ry + shake * 0.8 })
    })
  } else if (time >= tImpact && time < tSeparate) {
    const progress = (time - tImpact) / (tSeparate - tImpact)
    const stretchX = 1.0 + progress * 0.7
    const shrinkY = 1.0 - progress * 0.3
    const shakeAmp = 0.06 * Math.sin((time - tImpact) * 50)

    uNucleons.forEach((n) => {
      const rx = n.rx * stretchX + shakeAmp
      const ry = n.ry * shrinkY + shakeAmp * 0.8
      particles.push({ id: n.id, type: n.type, x: u235Center.x + rx, y: u235Center.y + ry })
    })
    particles.push({
      id: 'incident-n-merged',
      type: 'neutron',
      x: u235Center.x + shakeAmp * 1.2,
      y: u235Center.y + shakeAmp * 0.5,
    })
  } else {
    const dt = time - tSeparate
    const baX = u235Center.x + baDir.x * dt - 0.3
    const baY = u235Center.y + baDir.y * dt
    const krX = u235Center.x + krDir.x * dt + 0.3
    const krY = u235Center.y + krDir.y * dt

    baNucleons.forEach((n, idx) => {
      particles.push({ id: `ba-${idx}`, type: n.type, x: baX + n.dx, y: baY + n.dy })
    })
    krNucleons.forEach((n, idx) => {
      particles.push({ id: `kr-${idx}`, type: n.type, x: krX + n.dx, y: krY + n.dy })
    })
    nDirs.forEach((dir, idx) => {
      particles.push({
        id: `fast-n-${idx}`,
        type: 'neutron',
        x: u235Center.x + dir.x * dt,
        y: u235Center.y + dir.y * dt,
        vx: dir.x,
        vy: dir.y,
      })
    })
  }

  return {
    particles,
    showFlash,
    showLabel,
    isReacted,
    impactPoint: u235Center,
    labelPos: { x: u235Center.x, y: u235Center.y + 0.8 },
    reactionName: '重核裂变 (铀-235 裂变)',
  }
}

/** 铀核链式反应：多代裂变网络 */
function computeChainReaction(time: number): ChainReactionPhysicsResult {
  const chainReactors = [
    { id: 'u-g1-0', gen: 1, x: -3.0, y: 0, tHit: 1.0 },
    { id: 'u-g2-0', gen: 2, x: -0.5, y: -1.3, tHit: 2.8 },
    { id: 'u-g2-1', gen: 2, x: -0.5, y: 0, tHit: 2.8 },
    { id: 'u-g2-2', gen: 2, x: -0.5, y: 1.3, tHit: 2.8 },
    { id: 'u-g3-0', gen: 3, x: 2.2, y: -2.0, tHit: 4.6 },
    { id: 'u-g3-1', gen: 3, x: 2.2, y: -1.5, tHit: 4.6 },
    { id: 'u-g3-2', gen: 3, x: 2.2, y: -1.0, tHit: 4.6 },
    { id: 'u-g3-3', gen: 3, x: 2.2, y: -0.5, tHit: 4.6 },
    { id: 'u-g3-4', gen: 3, x: 2.2, y: 0, tHit: 4.6 },
    { id: 'u-g3-5', gen: 3, x: 2.2, y: 0.5, tHit: 4.6 },
    { id: 'u-g3-6', gen: 3, x: 2.2, y: 1.0, tHit: 4.6 },
    { id: 'u-g3-7', gen: 3, x: 2.2, y: 1.5, tHit: 4.6 },
    { id: 'u-g3-8', gen: 3, x: 2.2, y: 2.0, tHit: 4.6 },
  ]

  const subNucleons: SubNucleon[] = [
    { dx: 0, dy: 0, isProton: true },
    { dx: -0.14, dy: 0.08, isProton: false },
    { dx: 0.14, dy: 0.08, isProton: true },
    { dx: -0.08, dy: -0.14, isProton: false },
    { dx: 0.08, dy: -0.14, isProton: true },
    { dx: -0.14, dy: -0.06, isProton: false },
    { dx: 0.14, dy: -0.06, isProton: true },
    { dx: 0, dy: 0.14, isProton: false },
  ]

  const reactorsState: ChainReactorState[] = chainReactors.map((r) => ({
    ...r,
    isHit: time >= r.tHit,
    isFissioned: time >= r.tHit + 0.5,
    isShaking: time >= r.tHit && time < r.tHit + 0.5,
  }))

  const neutrons: ChainNeutron[] = []

  if (time < 1.0) {
    const progress = time / 1.0
    neutrons.push({
      id: 'init-n',
      x: -5.0 + (chainReactors[0].x - -5.0) * progress,
      y: 0,
    })
  }

  if (time >= 1.5 && time < 2.8) {
    const progress = (time - 1.5) / 1.3
    const startX = chainReactors[0].x
    const startY = chainReactors[0].y
    chainReactors.slice(1, 4).forEach((target, idx) => {
      neutrons.push({
        id: `n-g1-${idx}`,
        x: startX + (target.x - startX) * progress,
        y: startY + (target.y - startY) * progress,
      })
    })
  }

  if (time >= 3.3 && time < 4.6) {
    const progress = (time - 3.3) / 1.3
    const sourceReactors = chainReactors.slice(1, 4)
    const targetReactors = chainReactors.slice(4, 13)

    sourceReactors.forEach((src, sIdx) => {
      for (let i = 0; i < 3; i++) {
        const tIdx = sIdx * 3 + i
        const target = targetReactors[tIdx]
        neutrons.push({
          id: `n-g2-${sIdx}-${i}`,
          x: src.x + (target.x - src.x) * progress,
          y: src.y + (target.y - src.y) * progress,
        })
      }
    })
  }

  if (time >= 5.1) {
    const progress = Math.min(1, (time - 5.1) / 2.0)
    const targetReactors = chainReactors.slice(4, 13)
    targetReactors.forEach((src, idx) => {
      const angles = [-0.4, 0, 0.4]
      angles.forEach((angle, aIdx) => {
        const dx = progress * 4.0
        const dy = progress * 4.0 * Math.sin(angle)
        neutrons.push({
          id: `n-g3-${idx}-${aIdx}`,
          x: src.x + dx,
          y: src.y + dy,
        })
      })
    })
  }

  const shockwaves: Shockwave[] = []
  reactorsState.forEach((r) => {
    if (time >= r.tHit && time < r.tHit + 0.8) {
      const dt = time - r.tHit
      shockwaves.push({
        x: r.x,
        y: r.y,
        radius: dt * 1.5,
        opacity: 1.0 - dt / 0.8,
      })
    }
  })

  return {
    reactorsState,
    subNucleons,
    neutrons,
    shockwaves,
    reactionName: '铀核链式反应',
  }
}
