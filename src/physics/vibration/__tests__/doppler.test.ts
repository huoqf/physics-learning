import { describe, it, expect } from 'vitest'
import {
  calculateDopplerWavelength,
  calculateDopplerFrequency,
  generateWavefronts,
} from '../doppler'

describe('doppler (多普勒效应纯物理计算单测)', () => {
  const v = 340 // 声速 340 m/s
  const f0 = 100 // 固有频率 100 Hz

  it('静止波源与观察者：波长与频率保持不变', () => {
    const lambdaFront = calculateDopplerWavelength(v, 0, f0, 'front')
    const lambdaBack = calculateDopplerWavelength(v, 0, f0, 'back')
    expect(lambdaFront).toBeCloseTo(3.4, 4)
    expect(lambdaBack).toBeCloseTo(3.4, 4)

    const fObs = calculateDopplerFrequency(f0, v, 0, 0)
    expect(fObs).toBeCloseTo(100, 4)
  })

  it('波源运动（观察者静止）：靠近时视在频率升高，远离时视在频率降低', () => {
    const vs = 34 // vs = 0.1 v
    // 前方波长被压缩：(340 - 34) / 100 = 3.06 m
    const lambdaFront = calculateDopplerWavelength(v, vs, f0, 'front')
    expect(lambdaFront).toBeCloseTo(3.06, 4)

    // 前方观察者接收频率：100 * (340 / (340 - 34)) = 100 / 0.9 ≈ 111.11 Hz
    const fFront = calculateDopplerFrequency(f0, v, vs, 0)
    expect(fFront).toBeCloseTo(111.11, 2)

    // 后方波长被拉伸：(340 + 34) / 100 = 3.74 m
    const lambdaBack = calculateDopplerWavelength(v, vs, f0, 'back')
    expect(lambdaBack).toBeCloseTo(3.74, 4)

    // 后方观察者接收频率：100 * (340 / (340 + 34)) = 100 / 1.1 ≈ 90.91 Hz
    const fBack = calculateDopplerFrequency(f0, v, -vs, 0)
    expect(fBack).toBeCloseTo(90.91, 2)
  })

  it('观察者运动（波源静止）：迎面相向运动频率升高，背向远离频率降低', () => {
    const vo = 17 // 观察者速度
    // 相向接近：f' = 100 * (340 + 17) / 340 = 105 Hz
    const fApproach = calculateDopplerFrequency(f0, v, 0, vo)
    expect(fApproach).toBeCloseTo(105, 4)

    // 背向远离：f' = 100 * (340 - 17) / 340 = 95 Hz
    const fRecede = calculateDopplerFrequency(f0, v, 0, -vo)
    expect(fRecede).toBeCloseTo(95, 4)
  })

  it('正确生成多组时间梯度的偏心扩散波前圆环，最新圆心与波源当前位置重合', () => {
    const x0 = -20
    const currentTime = 0.1
    const vs = 50
    const wavefronts = generateWavefronts(currentTime, 340, vs, 50, x0, 60)
    expect(wavefronts.length).toBeGreaterThan(0)
    // 第一条是当前时刻发射的波前：发射圆心应等于当前时刻波源坐标 x = x0 + vs * t
    const currentSourceX = x0 + vs * currentTime
    expect(wavefronts[0].sourceX).toBeCloseTo(currentSourceX, 4)
    expect(wavefronts[0].radius).toBeCloseTo(0, 4)
  })
})
