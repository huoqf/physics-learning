import { describe, it, expect } from 'vitest'
import {
  initHeatConductionParticles,
  initDiffusionParticles,
  stepParticles,
  computeMicrostates,
  temperatureToColor,
  computeTemperatureDiff,
  computeParticleDistribution,
} from '@/physics/secondLaw'
import type { Particle } from '@/physics/secondLaw'

// ─── 测试用常量 ─────────────────────────────────────────────────────
const X_MIN = 0
const X_MAX = 10
const Y_MIN = 0
const Y_MAX = 4

describe('initHeatConductionParticles', () => {
  it('应生成指定数量的粒子', () => {
    const particles = initHeatConductionParticles(50, X_MIN, X_MAX, Y_MIN, Y_MAX)
    expect(particles).toHaveLength(50)
  })

  it('左侧粒子应为高温，右侧粒子应为低温', () => {
    const particles = initHeatConductionParticles(100, X_MIN, X_MAX, Y_MIN, Y_MAX, 0.5, 42)
    const hotParticles = particles.filter((p) => p.x < X_MAX * 0.5)
    const coldParticles = particles.filter((p) => p.x > X_MAX * 0.5)

    for (const p of hotParticles) {
      expect(p.temperature).toBe(500)
    }
    for (const p of coldParticles) {
      expect(p.temperature).toBe(200)
    }
  })

  it('相同种子应产生相同结果（可重现）', () => {
    const a = initHeatConductionParticles(20, X_MIN, X_MAX, Y_MIN, Y_MAX, 0.5, 42)
    const b = initHeatConductionParticles(20, X_MIN, X_MAX, Y_MIN, Y_MAX, 0.5, 42)
    expect(a).toEqual(b)
  })

  it('不同种子应产生不同结果', () => {
    const a = initHeatConductionParticles(20, X_MIN, X_MAX, Y_MIN, Y_MAX, 0.5, 42)
    const b = initHeatConductionParticles(20, X_MIN, X_MAX, Y_MIN, Y_MAX, 0.5, 99)
    expect(a).not.toEqual(b)
  })

  it('所有粒子应在容器边界内', () => {
    const particles = initHeatConductionParticles(100, X_MIN, X_MAX, Y_MIN, Y_MAX)
    for (const p of particles) {
      expect(p.x).toBeGreaterThanOrEqual(X_MIN)
      expect(p.x).toBeLessThanOrEqual(X_MAX)
      expect(p.y).toBeGreaterThanOrEqual(Y_MIN)
      expect(p.y).toBeLessThanOrEqual(Y_MAX)
    }
  })
})

describe('initDiffusionParticles', () => {
  it('应生成指定数量的粒子', () => {
    const particles = initDiffusionParticles(80, X_MIN, X_MAX, Y_MIN, Y_MAX)
    expect(particles).toHaveLength(80)
  })

  it('所有粒子应在左侧半区', () => {
    const particles = initDiffusionParticles(100, X_MIN, X_MAX, Y_MIN, Y_MAX)
    for (const p of particles) {
      expect(p.x).toBeLessThan(X_MIN + (X_MAX - X_MIN) * 0.5)
    }
  })

  it('粒子温度应为 300K', () => {
    const particles = initDiffusionParticles(50, X_MIN, X_MAX, Y_MIN, Y_MAX)
    for (const p of particles) {
      expect(p.temperature).toBe(300)
    }
  })

  it('相同种子应产生相同结果', () => {
    const a = initDiffusionParticles(20, X_MIN, X_MAX, Y_MIN, Y_MAX, 123)
    const b = initDiffusionParticles(20, X_MIN, X_MAX, Y_MIN, Y_MAX, 123)
    expect(a).toEqual(b)
  })
})

describe('stepParticles', () => {
  it('热传导：粒子应在容器边界内', () => {
    const particles = initHeatConductionParticles(30, X_MIN, X_MAX, Y_MIN, Y_MAX)
    stepParticles(particles, 0.016, 'heat-conduction', X_MIN, X_MAX, Y_MIN, Y_MAX)
    for (const p of particles) {
      expect(p.x).toBeGreaterThanOrEqual(X_MIN)
      expect(p.x).toBeLessThanOrEqual(X_MAX)
      expect(p.y).toBeGreaterThanOrEqual(Y_MIN)
      expect(p.y).toBeLessThanOrEqual(Y_MAX)
    }
  })

  it('气体扩散：粒子应在容器边界内', () => {
    const particles = initDiffusionParticles(30, X_MIN, X_MAX, Y_MIN, Y_MAX)
    stepParticles(particles, 0.016, 'gas-diffusion', X_MIN, X_MAX, Y_MIN, Y_MAX, 0)
    for (const p of particles) {
      expect(p.x).toBeGreaterThanOrEqual(X_MIN)
      expect(p.x).toBeLessThanOrEqual(X_MAX)
      expect(p.y).toBeGreaterThanOrEqual(Y_MIN)
      expect(p.y).toBeLessThanOrEqual(Y_MAX)
    }
  })

  it('隔板关闭时气体不应穿过隔板', () => {
    const particles = initDiffusionParticles(50, X_MIN, X_MAX, Y_MIN, Y_MAX)
    // 初始全部在左侧，隔板关闭
    stepParticles(particles, 0.016, 'gas-diffusion', X_MIN, X_MAX, Y_MIN, Y_MAX, 0)
    const midX = (X_MIN + X_MAX) / 2
    // 隔板关闭时右侧粒子数应为 0 或极少（边界附近可能有少量）
    const rightCount = particles.filter((p) => p.x > midX + 0.1).length
    expect(rightCount).toBe(0)
  })

  it('隔板全开时气体应扩散到右侧', () => {
    const particles = initDiffusionParticles(80, X_MIN, X_MAX, Y_MIN, Y_MAX)
    // 多步演化后粒子应扩散
    for (let i = 0; i < 500; i++) {
      stepParticles(particles, 0.016, 'gas-diffusion', X_MIN, X_MAX, Y_MIN, Y_MAX, 1)
    }
    const midX = (X_MIN + X_MAX) / 2
    const rightCount = particles.filter((p) => p.x > midX).length
    // 经过足够步数后应有粒子在右侧
    expect(rightCount).toBeGreaterThan(0)
  })

  it('热传导：温度应趋向均匀', () => {
    const particles = initHeatConductionParticles(60, X_MIN, X_MAX, Y_MIN, Y_MAX)
    // 大量步进后温差应减小
    for (let i = 0; i < 1000; i++) {
      stepParticles(particles, 0.016, 'heat-conduction', X_MIN, X_MAX, Y_MIN, Y_MAX)
    }
    const { deltaT } = computeTemperatureDiff(particles, X_MIN, X_MAX)
    // 初始温差 300K，经过大量步进后应显著减小
    expect(deltaT).toBeLessThan(300)
  })
})

describe('computeMicrostates', () => {
  it('空粒子数组应返回 0', () => {
    const result = computeMicrostates([], X_MIN, X_MAX, Y_MIN, Y_MAX)
    expect(result.lnOmega).toBe(0)
    expect(result.normalizedEntropy).toBe(0)
  })

  it('所有粒子在同一格子时归一化熵应接近 0', () => {
    // 创建所有粒子在同一个位置的数组
    const particles: Particle[] = Array.from({ length: 50 }, () => ({
      x: X_MIN + 0.1,
      y: Y_MIN + 0.1,
      vx: 0,
      vy: 0,
      temperature: 300,
    }))
    const result = computeMicrostates(particles, X_MIN, X_MAX, Y_MIN, Y_MAX, 8)
    expect(result.normalizedEntropy).toBeCloseTo(0, 1)
  })

  it('均匀分布时归一化熵应较高', () => {
    // 创建均匀分布的粒子
    const particles: Particle[] = []
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        particles.push({
          x: X_MIN + (i + 0.5) * (X_MAX - X_MIN) / 8,
          y: Y_MIN + (j + 0.5) * (Y_MAX - Y_MIN) / 8,
          vx: 0,
          vy: 0,
          temperature: 300,
        })
      }
    }
    const result = computeMicrostates(particles, X_MIN, X_MAX, Y_MIN, Y_MAX, 8)
    expect(result.normalizedEntropy).toBeGreaterThan(0.7)
  })

  it('lnOmega 应始终非负', () => {
    const particles = initHeatConductionParticles(40, X_MIN, X_MAX, Y_MIN, Y_MAX)
    const result = computeMicrostates(particles, X_MIN, X_MAX, Y_MIN, Y_MAX)
    expect(result.lnOmega).toBeGreaterThanOrEqual(0)
  })

  it('归一化熵应在 [0, 1] 范围内', () => {
    const particles = initHeatConductionParticles(40, X_MIN, X_MAX, Y_MIN, Y_MAX)
    const result = computeMicrostates(particles, X_MIN, X_MAX, Y_MIN, Y_MAX)
    expect(result.normalizedEntropy).toBeGreaterThanOrEqual(0)
    expect(result.normalizedEntropy).toBeLessThanOrEqual(1)
  })
})

describe('temperatureToColor', () => {
  it('高温应返回偏红色', () => {
    const color = temperatureToColor(500, 500, 200)
    // 红色通道应较高
    const match = color.match(/rgb\((\d+),(\d+),(\d+)\)/)
    expect(match).not.toBeNull()
    if (match) {
      const r = parseInt(match[1])
      const b = parseInt(match[3])
      expect(r).toBeGreaterThan(b)
    }
  })

  it('低温应返回偏蓝色', () => {
    const color = temperatureToColor(200, 500, 200)
    const match = color.match(/rgb\((\d+),(\d+),(\d+)\)/)
    expect(match).not.toBeNull()
    if (match) {
      const r = parseInt(match[1])
      const b = parseInt(match[3])
      expect(b).toBeGreaterThan(r)
    }
  })

  it('中温应返回紫色调', () => {
    const color = temperatureToColor(350, 500, 200)
    expect(color).toMatch(/^rgb\(\d+,\d+,\d+\)$/)
  })

  it('超出范围应被截断', () => {
    const colorHigh = temperatureToColor(600, 500, 200)
    const colorLow = temperatureToColor(100, 500, 200)
    expect(colorHigh).toMatch(/^rgb\(/)
    expect(colorLow).toMatch(/^rgb\(/)
  })
})

describe('computeTemperatureDiff', () => {
  it('应正确计算左右两侧温差', () => {
    const particles: Particle[] = [
      { x: 1, y: 1, vx: 0, vy: 0, temperature: 500 },
      { x: 2, y: 1, vx: 0, vy: 0, temperature: 500 },
      { x: 8, y: 1, vx: 0, vy: 0, temperature: 200 },
      { x: 9, y: 1, vx: 0, vy: 0, temperature: 200 },
    ]
    const result = computeTemperatureDiff(particles, X_MIN, X_MAX)
    expect(result.hotAvg).toBe(500)
    expect(result.coldAvg).toBe(200)
    expect(result.deltaT).toBe(300)
  })

  it('温度均匀时温差应为 0', () => {
    const particles: Particle[] = [
      { x: 1, y: 1, vx: 0, vy: 0, temperature: 300 },
      { x: 9, y: 1, vx: 0, vy: 0, temperature: 300 },
    ]
    const result = computeTemperatureDiff(particles, X_MIN, X_MAX)
    expect(result.deltaT).toBe(0)
  })
})

describe('computeParticleDistribution', () => {
  it('应正确统计左右粒子数', () => {
    const particles: Particle[] = [
      { x: 1, y: 1, vx: 0, vy: 0, temperature: 300 },
      { x: 2, y: 1, vx: 0, vy: 0, temperature: 300 },
      { x: 8, y: 1, vx: 0, vy: 0, temperature: 300 },
    ]
    const result = computeParticleDistribution(particles, X_MIN, X_MAX)
    expect(result.leftCount).toBe(2)
    expect(result.rightCount).toBe(1)
  })

  it('均匀分布时 ratio 应接近 0', () => {
    const particles: Particle[] = [
      { x: 2, y: 1, vx: 0, vy: 0, temperature: 300 },
      { x: 8, y: 1, vx: 0, vy: 0, temperature: 300 },
    ]
    const result = computeParticleDistribution(particles, X_MIN, X_MAX)
    expect(result.ratio).toBe(0)
  })

  it('全部在左侧时 ratio 应为 1', () => {
    const particles: Particle[] = [
      { x: 1, y: 1, vx: 0, vy: 0, temperature: 300 },
      { x: 2, y: 1, vx: 0, vy: 0, temperature: 300 },
    ]
    const result = computeParticleDistribution(particles, X_MIN, X_MAX)
    expect(result.leftCount).toBe(2)
    expect(result.rightCount).toBe(0)
    expect(result.ratio).toBe(1)
  })

  it('空数组应返回 ratio 为 1', () => {
    const result = computeParticleDistribution([], X_MIN, X_MAX)
    expect(result.ratio).toBe(1)
  })
})
