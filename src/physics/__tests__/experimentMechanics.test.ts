import { describe, it, expect } from 'vitest'
import {
  TRACK_MAX_M,
  DIFF_METHOD_MIN_DOTS,
  TICKER_FREQ_HZ,
  PHOTOGATE_A_X_M,
  countingPeriod,
  timeToReach,
  solveTrackMotion,
  buildTapeCountingDots,
  calcDiffMethodAcceleration,
  readPhotogate,
  solveHooke,
  hookeSeries,
} from '../experimentMechanics'

describe('力学基础实验纯物理模型单测', () => {
  it('计数周期 T = 5T₀ = 0.1 s（逐差法公式中的 T）', () => {
    expect(countingPeriod(TICKER_FREQ_HZ)).toBeCloseTo(0.1, 12)
  })

  it('小车到达轨道末端后位移钳制在 2.00 m、速度归零', () => {
    // v0 = 0, a = 1.5 m/s² ⇒ tEnd = √(2×2.0/1.5) ≈ 1.633 s
    const tEnd = timeToReach(0, 1.5, TRACK_MAX_M)
    expect(tEnd).toBeCloseTo(Math.sqrt((2 * TRACK_MAX_M) / 1.5), 6)

    const running = solveTrackMotion({ v0: 0, a: 1.5, time: 1.0 })
    expect(running.reachedEnd).toBe(false)
    expect(running.x).toBeCloseTo(0.75, 6)
    expect(running.v).toBeCloseTo(1.5, 6)

    // 时间远超 tEnd：位移必须停在 2.00 m，速度必须为 0（挡块吸收）
    const stopped = solveTrackMotion({ v0: 0, a: 1.5, time: 10 })
    expect(stopped.reachedEnd).toBe(true)
    expect(stopped.x).toBe(TRACK_MAX_M)
    expect(stopped.v).toBe(0)
    expect(stopped.tActive).toBeCloseTo(tEnd, 6)
  })

  it('纸带计数点覆盖到运动结束（不是固定 7 个点）', () => {
    const pxPerMeter = 300
    // 足够长的运动：tEnd ≈ 1.633 s ⇒ t = 0…1.6 s 共 17 个计数点
    const dots = buildTapeCountingDots({ v0: 0, a: 1.5, time: 10, pxPerMeter })
    expect(dots.length).toBe(17)
    // 首点（t=0）在最右端，末尾点靠近纸带左端，单调递减
    expect(dots[0]).toBeGreaterThan(dots[dots.length - 1])
    expect(dots[0]).toBeCloseTo(TRACK_MAX_M * pxPerMeter, 6)
  })

  it('逐差法反算加速度精确等于设定值', () => {
    const pxPerMeter = 300
    const T = countingPeriod(TICKER_FREQ_HZ)
    for (const a of [0.1, 1.5, 2.0, 9.8]) {
      const dots = buildTapeCountingDots({ v0: 0, a, time: 10, pxPerMeter })
      const measured = calcDiffMethodAcceleration(dots, pxPerMeter, T)
      expect(measured).not.toBeNull()
      // 论文级精度：逐差法在匀变速、无测量噪声下应精确还原 a
      expect(measured as number).toBeCloseTo(a, 6)
    }
  })

  it('计数点不足 7 个时逐差法返回 null，绝不回退成参数设定值', () => {
    const pxPerMeter = 300
    const T = countingPeriod(TICKER_FREQ_HZ)
    // 运动仅 0.5 s ⇒ 计数点 6 个（t = 0…0.5）
    const dots = buildTapeCountingDots({ v0: 0, a: 1.5, time: 0.5, pxPerMeter })
    expect(dots.length).toBeLessThan(DIFF_METHOD_MIN_DOTS)
    expect(calcDiffMethodAcceleration(dots, pxPerMeter, T)).toBeNull()
  })

  it('光电门遮光时间 ∝ d，而测得速度与 d 无关', () => {
    const base = { x: 0.25, v0: 0, a: 1.5, gateX: PHOTOGATE_A_X_M }
    const r1 = readPhotogate({ ...base, d: 0.01 })
    const r2 = readPhotogate({ ...base, d: 0.02 })

    expect(r1.velocity).toBeGreaterThan(0)
    // v = d/Δt ⇒ Δt ∝ d
    expect(r2.dtMs / r1.dtMs).toBeCloseTo(2, 6)
    expect(r2.velocity).toBeCloseTo(r1.velocity, 9)
    // 与 v² = v₀² + 2a(gateX − flagOffset) 一致
    expect(r1.velocity).toBeCloseTo(Math.sqrt(2 * 1.5 * 0.25), 9)

    // 未到达光电门时无读数
    const notYet = readPhotogate({ x: 0.1, v0: 0, a: 1.5, d: 0.01, gateX: PHOTOGATE_A_X_M })
    expect(notYet.dtMs).toBe(0)
    expect(notYet.velocity).toBe(0)
    expect(notYet.isBlocked).toBe(false)
  })

  it('胡克定律：F = mg、Δx = F/k，挂码序列过原点且斜率即 k', () => {
    const { force, extension } = solveHooke(0.05, 100)
    expect(force).toBeCloseTo(0.05 * 9.8, 9)
    expect(extension).toBeCloseTo(0.0049, 9)

    const series = hookeSeries(0.05, 100, 6)
    expect(series).toHaveLength(6)
    expect(series[0].force).toBeCloseTo(0.49, 9)
    // 各点严格共线：ΔF/Δx 恒等于 k
    for (let i = 1; i < series.length; i++) {
      const slope = (series[i].force - series[i - 1].force) / (series[i].extension - series[i - 1].extension)
      expect(slope).toBeCloseTo(100, 6)
    }
  })
})
