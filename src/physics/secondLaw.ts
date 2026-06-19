/**
 * 热力学第二定律 — 可视化辅助纯函数。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 *
 * 核心物理模型：
 * - 热传导：粒子碰撞时温度混合（傅里叶热传导离散化）
 * - 气体扩散：粒子自由运动填充真空容器
 * - 微观态数 Ω：统计粒子空间分布均匀度
 */

/**
 * 确定性伪随机数生成器（mulberry32）。
 * 用于替代 Math.random()，确保可重现。
 *
 * @param seed 随机种子
 * @returns 0-1 之间的伪随机数
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 粒子数据结构 */
export interface Particle {
  /** 归一化 x 坐标 0-1（左→右） */
  x: number
  /** 归一化 y 坐标 0-1（上→下） */
  y: number
  /** x 方向速度 */
  vx: number
  /** y 方向速度 */
  vy: number
  /** 该粒子代表的温度 (K)，用于颜色映射 */
  temperature: number
}

/** 场景类型 */
export type Scenario = 'heat-conduction' | 'gas-diffusion'

/** 热传导默认参数 */
const TH_T_HOT = 500
const TH_T_COLD = 200
const TH_SPEED = 0.8

/** 气体扩散默认参数 */
const DG_SPEED = 1.0

/**
 * 初始化热传导粒子：左侧高温、右侧低温。
 *
 * @param count 总粒子数
 * @param hotRatio 左侧高温粒子占比（默认 0.5）
 * @param seed 随机种子（确保可重现）
 * @returns 粒子数组
 */
export function initHeatConductionParticles(
  count: number,
  hotRatio: number = 0.5,
  seed: number = 42,
): Particle[] {
  const rng = mulberry32(seed)
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const isHot = i < count * hotRatio
    particles.push({
      x: isHot ? rng() * 0.48 : 0.52 + rng() * 0.48,
      y: rng(),
      vx: (rng() - 0.5) * 2 * TH_SPEED,
      vy: (rng() - 0.5) * 2 * TH_SPEED,
      temperature: isHot ? TH_T_HOT : TH_T_COLD,
    })
  }
  return particles
}

/**
 * 初始化气体扩散粒子：全部在左侧半区。
 *
 * @param count 粒子数
 * @param seed 随机种子
 * @returns 粒子数组
 */
export function initDiffusionParticles(
  count: number,
  seed: number = 123,
): Particle[] {
  const rng = mulberry32(seed)
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: rng() * 0.48,
      y: rng(),
      vx: (rng() - 0.5) * 2 * DG_SPEED,
      vy: (rng() - 0.5) * 2 * DG_SPEED,
      temperature: 300,
    })
  }
  return particles
}

/**
 * 单步粒子演化（正向物理）。
 *
 * - 弹性壁面反射
 * - 热传导：相邻粒子温度混合
 * - 粒子间弹性碰撞（简化版）
 *
 * @param particles 粒子数组（in-place 修改）
 * @param dt 时间步长 (s)
 * @param scenario 场景类型
 * @param partitionOpen 隔板是否打开（仅 gas-diffusion 使用）
 * @param temperatureDiffusionRate 温度扩散速率（默认 0.02）
 */
export function stepParticles(
  particles: Particle[],
  dt: number,
  scenario: Scenario,
  partitionOpen: boolean = true,
  temperatureDiffusionRate: number = 0.02,
): void {
  for (const p of particles) {
    p.x += p.vx * dt
    p.y += p.vy * dt

    // 壁面弹性反射
    if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx) }
    if (p.x > 1) { p.x = 1; p.vx = -Math.abs(p.vx) }
    if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy) }
    if (p.y > 1) { p.y = 1; p.vy = -Math.abs(p.vy) }

    // 气体扩散：隔板未打开时，粒子限制在左半区
    if (scenario === 'gas-diffusion' && !partitionOpen) {
      if (p.x > 0.48) { p.x = 0.48; p.vx = -Math.abs(p.vx) }
    }

    // 热传导：隔板处反射
    if (scenario === 'heat-conduction') {
      if (p.x > 0.48 && p.x < 0.52) {
        p.vx = p.vx > 0 ? -Math.abs(p.vx) : Math.abs(p.vx)
      }
    }
  }

  // 热传导：温度混合（简化傅里叶热传导）
  if (scenario === 'heat-conduction') {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 0.08) {
          const avgT = (particles[i].temperature + particles[j].temperature) / 2
          const mix = temperatureDiffusionRate * dt * 10
          particles[i].temperature += (avgT - particles[i].temperature) * mix
          particles[j].temperature += (avgT - particles[j].temperature) * mix
        }
      }
    }
  }
}

/**
 * 计算微观态数 Ω（统计粒子分布均匀度）。
 *
 * 将容器分为 numBins 个空间格子，统计每格粒子数。
 * 用 Stirling 近似计算 ln Ω = ln(N!) - Σ ln(n_i!)
 *
 * @param particles 粒子数组
 * @param numBins 空间分格数（默认 8）
 * @returns lnOmega（对数值）和归一化无序度 0-1
 */
export function computeMicrostates(
  particles: Particle[],
  numBins: number = 8,
): { lnOmega: number; normalizedEntropy: number } {
  const N = particles.length
  if (N === 0) return { lnOmega: 0, normalizedEntropy: 0 }

  // 统计每个格子的粒子数
  const bins = new Array(numBins * numBins).fill(0)
  for (const p of particles) {
    const bx = Math.min(numBins - 1, Math.floor(p.x * numBins))
    const by = Math.min(numBins - 1, Math.floor(p.y * numBins))
    bins[by * numBins + bx]++
  }

  // ln(N!) — Stirling 近似
  const lnNFact = N > 0 ? N * Math.log(N) - N + 0.5 * Math.log(2 * Math.PI * N) : 0

  // Σ ln(n_i!)
  let lnBinSum = 0
  for (const n of bins) {
    if (n > 1) {
      lnBinSum += n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n)
    }
  }

  const lnOmega = lnNFact - lnBinSum

  // 归一化：完全有序（所有粒子在一个格子）→ lnOmega = 0
  // 完全均匀分布 → lnOmega 最大
  const maxLnOmega = N > 0 ? N * Math.log(numBins * numBins) : 1
  const normalizedEntropy = maxLnOmega > 0
    ? Math.max(0, Math.min(1, lnOmega / maxLnOmega))
    : 0

  return { lnOmega, normalizedEntropy }
}

/**
 * 温度→颜色插值。
 * 高温端红色 → 中温紫色 → 低温端蓝色。
 *
 * @param T 当前温度 (K)
 * @param THigh 高温参考值 (K)
 * @param TLow 低温参考值 (K)
 * @returns CSS 颜色字符串
 */
export function temperatureToColor(
  T: number,
  THigh: number = TH_T_HOT,
  TLow: number = TH_T_COLD,
): string {
  const t = Math.max(0, Math.min(1, (T - TLow) / (THigh - TLow)))

  let r: number, g: number, b: number
  if (t < 0.5) {
    // 蓝 (59,130,246) → 紫 (168,85,247)
    const s = t / 0.5
    r = Math.round(59 + s * (168 - 59))
    g = Math.round(130 + s * (85 - 130))
    b = Math.round(246 + s * (247 - 246))
  } else {
    // 紫 (168,85,247) → 红 (239,68,68)
    const s = (t - 0.5) / 0.5
    r = Math.round(168 + s * (239 - 168))
    g = Math.round(85 + s * (68 - 85))
    b = Math.round(247 + s * (68 - 247))
  }
  return `rgb(${r},${g},${b})`
}

/**
 * 计算两侧平均温度差（热传导场景）。
 *
 * @param particles 粒子数组
 * @returns { hotAvg, coldAvg, deltaT }
 */
export function computeTemperatureDiff(particles: Particle[]): {
  hotAvg: number
  coldAvg: number
  deltaT: number
} {
  let hotSum = 0, hotCount = 0
  let coldSum = 0, coldCount = 0

  for (const p of particles) {
    if (p.x < 0.5) {
      hotSum += p.temperature
      hotCount++
    } else {
      coldSum += p.temperature
      coldCount++
    }
  }

  const hotAvg = hotCount > 0 ? hotSum / hotCount : TH_T_HOT
  const coldAvg = coldCount > 0 ? coldSum / coldCount : TH_T_COLD
  return { hotAvg, coldAvg, deltaT: Math.abs(hotAvg - coldAvg) }
}

/**
 * 计算左右粒子数比（气体扩散场景）。
 *
 * @param particles 粒子数组
 * @returns { leftCount, rightCount, ratio }
 */
export function computeParticleDistribution(particles: Particle[]): {
  leftCount: number
  rightCount: number
  ratio: number
} {
  let leftCount = 0
  let rightCount = 0

  for (const p of particles) {
    if (p.x < 0.5) {
      leftCount++
    } else {
      rightCount++
    }
  }

  const total = leftCount + rightCount
  const ratio = total > 0 ? Math.abs(leftCount - rightCount) / total : 1
  return { leftCount, rightCount, ratio }
}
