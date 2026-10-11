import { describe, it, expect } from 'vitest'
import {
  solveRefractionExperiment,
  generateRefractionSeries,
  degToRad,
  radToDeg,
} from '../experimentRefraction'

describe('高考实验：插针法测定玻璃折射率物理引擎单测', () => {
  it('标准条件下 (无画偏误差)，测得折射率严格等于理论真实折射率', () => {
    const res = solveRefractionExperiment({
      theta1Deg: 45,
      nReal: 1.5,
      dMm: 50,
      pinDistMm: 45,
      errorOffsetMm: 0,
    })

    expect(res.theta2Deg).toBeCloseTo(radToDeg(Math.asin(Math.sin(degToRad(45)) / 1.5)), 6)
    expect(res.theta2MeasDeg).toBeCloseTo(res.theta2Deg, 6)
    expect(res.nMeas).toBeCloseTo(1.5, 6)
    expect(res.nCircleMeas).toBeCloseTo(1.5, 6)
    expect(res.relativeErrorPercent).toBeCloseTo(0, 6)
  })

  it('大头针定位：P1、P2 落在入射线上，P3、P4 落在出射线上且与入射线平行', () => {
    const res = solveRefractionExperiment({
      theta1Deg: 30,
      nReal: 1.6,
      dMm: 40,
      pinDistMm: 50,
    })

    // 入射线斜率与出射线斜率必须相等（平行出射）
    const slopeIn = (res.pinP2.y - res.pinP1.y) / (res.pinP2.x - res.pinP1.x)
    const slopeOut = (res.pinP4.y - res.pinP3.y) / (res.pinP4.x - res.pinP3.x)
    expect(slopeIn).toBeCloseTo(slopeOut, 6)
    expect(slopeIn).toBeCloseTo(1 / Math.tan(degToRad(30)), 6)

    // 大头针间距必须满足设定
    const distP1P2 = Math.hypot(res.pinP2.x - res.pinP1.x, res.pinP2.y - res.pinP1.y)
    const distP3P4 = Math.hypot(res.pinP4.x - res.pinP3.x, res.pinP4.y - res.pinP3.y)
    expect(distP1P2).toBeCloseTo(50, 6)
    expect(distP3P4).toBeCloseTo(50, 6)
  })

  it('高考核心陷阱：下边界 bb\' 画窄 (errorOffset < 0) 时，测得折射角偏小，测得折射率偏大', () => {
    const resNarrow = solveRefractionExperiment({
      theta1Deg: 45,
      nReal: 1.5,
      dMm: 50,
      pinDistMm: 45,
      errorOffsetMm: -5, // 画窄 5mm
    })

    // 测得折射角小于真实折射角
    expect(resNarrow.theta2MeasDeg).toBeLessThan(resNarrow.theta2Deg)
    // 测得折射率大于真实折射率 (n_meas > 1.5)
    expect(resNarrow.nMeas).toBeGreaterThan(1.5)
    expect(resNarrow.relativeErrorPercent).toBeGreaterThan(0)
  })

  it('高考核心陷阱：下边界 bb\' 画宽 (errorOffset > 0) 时，测得折射角偏大，测得折射率偏小', () => {
    const resWide = solveRefractionExperiment({
      theta1Deg: 45,
      nReal: 1.5,
      dMm: 50,
      pinDistMm: 45,
      errorOffsetMm: 5, // 画宽 5mm
    })

    // 测得折射角大于真实折射角
    expect(resWide.theta2MeasDeg).toBeGreaterThan(resWide.theta2Deg)
    // 测得折射率小于真实折射率 (n_meas < 1.5)
    expect(resWide.nMeas).toBeLessThan(1.5)
    expect(resWide.relativeErrorPercent).toBeLessThan(0)
  })

  it('单位圆法：AA\' / BB\' 严格重现折射率', () => {
    const res = solveRefractionExperiment({
      theta1Deg: 60,
      nReal: 1.732,
      dMm: 60,
      pinDistMm: 40,
      circleRadiusMm: 30,
    })

    expect(res.distAAPrimeMm).toBeCloseTo(30 * Math.sin(degToRad(60)), 6)
    expect(res.nCircleMeas).toBeCloseTo(1.732, 2)
  })

  it('生成多组数据点序列：sin θ₁ 与 sin θ₂ 比值恒等于 nReal', () => {
    const series = generateRefractionSeries(1.5, 0, 50)
    expect(series.length).toBe(7)
    for (const pt of series) {
      expect(pt.sinTheta1 / pt.sinTheta2Real).toBeCloseTo(1.5, 6)
    }
  })
})
