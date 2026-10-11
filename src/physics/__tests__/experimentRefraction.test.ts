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

  it('入射角上限钳制：θ₁ 超出黄金区间 [15°, 65°] 时被 SSOT 收拢到边界', () => {
    const over = solveRefractionExperiment({ theta1Deg: 75, nReal: 1.5, dMm: 50, pinDistMm: 45 })
    expect(over.theta1Deg).toBe(65)

    const under = solveRefractionExperiment({ theta1Deg: 5, nReal: 1.5, dMm: 50, pinDistMm: 45 })
    expect(under.theta1Deg).toBe(15)

    // 钳制后必须与直接传 65° 的结果完全一致（保证 UI 上限与 SSOT 口径统一）
    const at65 = solveRefractionExperiment({ theta1Deg: 65, nReal: 1.5, dMm: 50, pinDistMm: 45 })
    expect(over.theta2Deg).toBeCloseTo(at65.theta2Deg, 10)
    expect(over.nMeas).toBeCloseTo(at65.nMeas, 10)
  })

  it('极限画窄参数：SSOT 安全钳制生效，杜绝作图光线跨越法线或数值爆炸', () => {
    // 极端输入：θ₁ 传 75°（超上限，先被钳制到 65°）, n=1.8, d=35mm, 强行画窄 10mm（再被有效域钳制）
    const resExtreme = solveRefractionExperiment({
      theta1Deg: 75,
      nReal: 1.8,
      dMm: 35,
      pinDistMm: 45,
      errorOffsetMm: -10,
    })

    // 必须标记被模型安全钳制
    expect(resExtreme.clampedByModel).toBe(true)
    // 画出的交点必须在法线同侧且具有正横坐标
    expect(resExtreme.pointODrawn.x).toBeGreaterThan(0)
    expect(resExtreme.pointODrawn.y).toBeGreaterThan(15)
    // 测得折射角处于健康的几何正角度区间
    expect(resExtreme.theta2MeasDeg).toBeGreaterThan(3)
    expect(resExtreme.theta2MeasDeg).toBeLessThan(90)
    // 测得折射率必须为有限真实值，杜绝爆炸和虚假兜底
    expect(Number.isFinite(resExtreme.nMeas)).toBe(true)
    expect(resExtreme.nMeas).toBeGreaterThan(1.5)
    expect(resExtreme.nMeas).toBeLessThan(4.5)
    expect(resExtreme.nCircleMeas).toBeCloseTo(resExtreme.nMeas, 4)
  })

  it('全反射临界角：C = arcsin(1/n)，从空气射入玻璃时 θ₂ < C 恒成立', () => {
    const res1 = solveRefractionExperiment({ theta1Deg: 45, nReal: 1.5, dMm: 50, pinDistMm: 45 })
    // n=1.5 时 C ≈ 41.81°
    expect(res1.criticalAngleDeg).toBeCloseTo(41.8103, 3)
    expect(res1.theta2Deg).toBeLessThan(res1.criticalAngleDeg)

    // 极端大入射角 θ₁ 传 75°（被钳制到上限 65°），折射角仍严格小于临界角
    const res2 = solveRefractionExperiment({ theta1Deg: 75, nReal: 1.3, dMm: 50, pinDistMm: 45 })
    expect(res2.theta2Deg).toBeLessThan(res2.criticalAngleDeg)

    // 侧移量公式验证：Δx = d * sin(θ₁ - θ₂) / cos(θ₂)
    const expectedOffset =
      (50 * Math.sin(res2.theta1Rad - res2.theta2Rad)) / Math.cos(res2.theta2Rad)
    expect(res2.lateralOffsetMm).toBeCloseTo(expectedOffset, 6)
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

  it('生成多组数据点序列：sin θ₁ 与 sin θ₂ 比值恒等于 nReal 且所有点在正弦域内', () => {
    const series = generateRefractionSeries(1.5, 0, 50)
    expect(series.length).toBe(6)
    for (const pt of series) {
      expect(pt.sinTheta1 / pt.sinTheta2Real).toBeCloseTo(1.5, 6)
      expect(pt.sinTheta1).toBeGreaterThan(0)
      expect(pt.sinTheta1).toBeLessThan(1)
      expect(pt.sinTheta2Meas).toBeGreaterThan(0)
      expect(pt.sinTheta2Meas).toBeLessThan(1)
    }
  })

  it('全参数空间网格扫描：覆盖 700+ 组参数组合，断言全域数值稳健无异常', () => {
    const thetas = [15, 30, 45, 60, 75]
    const nReals = [1.30, 1.45, 1.50, 1.65, 1.80]
    const dList = [35, 45, 55, 65]
    const errors = [-10, -6, -3, 0, 3, 6, 10]

    for (const th of thetas) {
      for (const n of nReals) {
        for (const d of dList) {
          for (const err of errors) {
            const r = solveRefractionExperiment({
              theta1Deg: th,
              nReal: n,
              dMm: d,
              pinDistMm: 40,
              errorOffsetMm: err,
            })

            // 1. 所有折射率与角必须是有限数
            expect(Number.isFinite(r.nMeas)).toBe(true)
            expect(Number.isFinite(r.nCircleMeas)).toBe(true)
            expect(Number.isFinite(r.theta2MeasDeg)).toBe(true)

            // 2. 测得折射率处于合理的物理数值区间 [0.8, 4.0]
            expect(r.nMeas).toBeGreaterThan(0.8)
            expect(r.nMeas).toBeLessThan(4.0)

            // 3. 单位圆法测得折射率与常规测得折射率保持一致
            expect(r.nCircleMeas).toBeCloseTo(r.nMeas, 3)

            // 4. 几何交点严格在法线同侧
            expect(r.pointODrawn.x).toBeGreaterThan(0)
            expect(r.pointODrawn.y).toBeGreaterThan(0)
          }
        }
      }
    }
  })
})
