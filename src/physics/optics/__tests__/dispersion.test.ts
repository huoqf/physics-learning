import { describe, test, expect } from 'vitest'
import {
  CAUCHY_REFERENCE_WAVELENGTH_UM,
  CROWN_GLASS_N_D,
  EQUILATERAL_PRISM_APEX_DEG,
  SPECTRUM_RED_NM,
  SPECTRUM_VIOLET_NM,
  buildDispersionExtremeMatrix,
  buildPrismLocalGeometry,
  criticalAngleInMedium,
  doubleSlitFringeSpacingMm,
  photonEnergyEv,
  prismMinDeviationIncidenceDeg,
  prismMinimumDeviationDeg,
  refractiveIndexOfCauchyMedium,
  sampleDispersion,
  speedInMedium,
  tracePrismRay,
  type Vec2,
} from '../dispersion'

const APEX = EQUILATERAL_PRISM_APEX_DEG
const N_RED = refractiveIndexOfCauchyMedium(SPECTRUM_RED_NM)
const N_VIOLET = refractiveIndexOfCauchyMedium(SPECTRUM_VIOLET_NM)

/** 入射角全量程（与注册表 paramMeta 一致） */
const INCIDENCE_SWEEP = Array.from({ length: 26 }, (_, i) => 45 + i)

describe('柯西经验色散律', () => {
  test('589.3nm 处折射率恰为标定值 n_D', () => {
    const n = refractiveIndexOfCauchyMedium(CAUCHY_REFERENCE_WAVELENGTH_UM * 1e3)
    expect(n).toBeCloseTo(CROWN_GLASS_N_D, 10)
  })

  test('折射率随波长增大而单调减小（色散的方向性）', () => {
    let prev = Infinity
    for (let wl = 400; wl <= 700; wl += 5) {
      const n = refractiveIndexOfCauchyMedium(wl)
      expect(n).toBeLessThan(prev)
      prev = n
    }
  })

  test('冕牌玻璃红紫折射率差约为 0.018', () => {
    expect(N_VIOLET).toBeGreaterThan(N_RED)
    expect(N_VIOLET - N_RED).toBeCloseTo(0.018, 2)
  })

  test('参数非法时返回 NaN', () => {
    expect(Number.isNaN(refractiveIndexOfCauchyMedium(0))).toBe(true)
    expect(Number.isNaN(refractiveIndexOfCauchyMedium(-10))).toBe(true)
  })
})

describe('介质光学量', () => {
  test('玻璃中光速 v = c/n，红端快于紫端', () => {
    const vRed = speedInMedium(N_RED)
    const vViolet = speedInMedium(N_VIOLET)
    expect(vRed).toBeGreaterThan(vViolet)
    expect(vRed).toBeCloseTo(2.998e8 / N_RED, 6)
  })

  test('全反射临界角 C = arcsin(1/n)，红端大于紫端', () => {
    const cRed = criticalAngleInMedium(N_RED)
    const cViolet = criticalAngleInMedium(N_VIOLET)
    expect(cRed).toBeGreaterThan(cViolet)
    expect(cRed).toBeCloseTo(41.59, 1)
  })

  test('光子能量 E = hc/λ，紫端大于红端', () => {
    expect(photonEnergyEv(SPECTRUM_VIOLET_NM)).toBeGreaterThan(photonEnergyEv(SPECTRUM_RED_NM))
    expect(photonEnergyEv(SPECTRUM_RED_NM)).toBeCloseTo(1.771, 3)
  })

  test('双缝条纹间距 Δx = Lλ/d，参考装置下红 3.50mm / 紫 2.00mm', () => {
    expect(doubleSlitFringeSpacingMm(SPECTRUM_RED_NM)).toBeCloseTo(3.5, 6)
    expect(doubleSlitFringeSpacingMm(SPECTRUM_VIOLET_NM)).toBeCloseTo(2.0, 6)
  })
})

describe('三棱镜光路追踪（两次折射）', () => {
  test('棱镜局部几何：底边水平、顶点朝上、外法线单位化', () => {
    const geo = buildPrismLocalGeometry(APEX)
    expect(geo.apex.x).toBeCloseTo(0, 10)
    expect(geo.apex.y).toBeLessThan(0)
    expect(geo.baseLeft).toEqual({ x: -0.5, y: 0 })
    expect(geo.baseRight).toEqual({ x: 0.5, y: 0 })
    const len = Math.hypot(geo.leftOutwardNormal.x, geo.leftOutwardNormal.y)
    expect(len).toBeCloseTo(1, 10)
  })

  test('全量程入射角均能求解出射光路（无全反射、无几何越界）', () => {
    for (const incidence of INCIDENCE_SWEEP) {
      const red = tracePrismRay({ incidenceDeg: incidence, n: N_RED, apexDeg: APEX })
      const violet = tracePrismRay({ incidenceDeg: incidence, n: N_VIOLET, apexDeg: APEX })
      expect(red.valid).toBe(true)
      expect(violet.valid).toBe(true)
      expect(red.totalInternalReflection).toBe(false)
      expect(violet.totalInternalReflection).toBe(false)
    }
  })

  test('几何恒等式 r₁ = arcsin(sin i / n)、r₂ = A − r₁、δ = i + i₂ − A', () => {
    for (const incidence of INCIDENCE_SWEEP) {
      for (const n of [N_RED, N_VIOLET]) {
        const t = tracePrismRay({ incidenceDeg: incidence, n, apexDeg: APEX })
        const expectedR1 = (Math.asin(Math.sin((incidence * Math.PI) / 180) / n) * 180) / Math.PI
        expect(t.r1Deg).toBeCloseTo(expectedR1, 6)
        expect(t.r2Deg).toBeCloseTo(APEX - expectedR1, 6)
        expect(t.deviationDeg).toBeCloseTo(incidence + t.exitAngleDeg - APEX, 6)
      }
    }
  })

  test('出射方向与入/出射角一致（向量解与角度解不自相矛盾）', () => {
    for (const incidence of INCIDENCE_SWEEP) {
      const t = tracePrismRay({ incidenceDeg: incidence, n: N_RED, apexDeg: APEX })
      const inAngle = (Math.atan2(t.inDir.y, t.inDir.x) * 180) / Math.PI
      const outAngle = (Math.atan2(t.outDir.y, t.outDir.x) * 180) / Math.PI
      expect(outAngle - inAngle).toBeCloseTo(t.deviationDeg, 6)
    }
  })

  test('入射/出射点始终落在棱镜界面上', () => {
    for (const incidence of INCIDENCE_SWEEP) {
      const t = tracePrismRay({ incidenceDeg: incidence, n: N_VIOLET, apexDeg: APEX })
      const line = (a: Vec2, b: Vec2, p: Vec2) =>
        (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
      const geo = buildPrismLocalGeometry(APEX)
      expect(Math.abs(line(geo.baseLeft, geo.apex, t.entryPoint))).toBeLessThan(1e-9)
      expect(Math.abs(line(geo.baseRight, geo.apex, t.exitPoint))).toBeLessThan(1e-9)
    }
  })

  test('第二界面入射角随 r₂ 增大可触发全反射（小入射角极限）', () => {
    const t = tracePrismRay({ incidenceDeg: 20, n: N_VIOLET, apexDeg: APEX })
    expect(t.totalInternalReflection).toBe(true)
    expect(Number.isNaN(t.deviationDeg)).toBe(true)
    // 全反射时仍给出第二界面的反射方向（单位向量）
    expect(Math.hypot(t.outDir.x, t.outDir.y)).toBeCloseTo(1, 10)
  })
})

describe('最小偏向角与色散极值', () => {
  test('δ_min 与 i_min 满足对称光路关系 i_min = (A + δ_min)/2', () => {
    for (const n of [N_RED, N_VIOLET]) {
      const deltaMin = prismMinimumDeviationDeg(n, APEX)
      const iMin = prismMinDeviationIncidenceDeg(n, APEX)
      expect(iMin).toBeCloseTo((APEX + deltaMin) / 2, 10)
    }
  })

  test('全量程内 δ(i) 恒不小于 δ_min，且实际极小点与 i_min 吻合', () => {
    const iMin = prismMinDeviationIncidenceDeg(N_VIOLET, APEX)
    const deltaMin = prismMinimumDeviationDeg(N_VIOLET, APEX)
    let bestI = 0
    let bestDelta = Infinity
    for (let i = 35; i <= 70; i += 0.05) {
      const delta = tracePrismRay({ incidenceDeg: i, n: N_VIOLET, apexDeg: APEX }).deviationDeg
      expect(delta).toBeGreaterThanOrEqual(deltaMin - 1e-6)
      if (delta < bestDelta) {
        bestDelta = delta
        bestI = i
      }
    }
    expect(bestI).toBeCloseTo(iMin, 1)
  })

  test('δ 随入射角先减后增（偏向角曲线非单调）', () => {
    const at = (i: number) => tracePrismRay({ incidenceDeg: i, n: N_RED, apexDeg: APEX }).deviationDeg
    expect(at(46)).toBeLessThan(at(45))
    expect(at(60)).toBeGreaterThan(at(50))
  })

  test('紫光偏向角恒大于红光（色散方向不可颠倒）', () => {
    for (const incidence of INCIDENCE_SWEEP) {
      const red = tracePrismRay({ incidenceDeg: incidence, n: N_RED, apexDeg: APEX })
      const violet = tracePrismRay({ incidenceDeg: incidence, n: N_VIOLET, apexDeg: APEX })
      expect(violet.deviationDeg).toBeGreaterThan(red.deviationDeg)
    }
  })
})

describe('七大物理量红紫极值矩阵', () => {
  const matrix = buildDispersionExtremeMatrix(50, APEX)

  test('矩阵包含完整七行', () => {
    expect(matrix.map((r) => r.key)).toEqual([
      'wavelength',
      'frequency',
      'refractiveIndex',
      'speed',
      'criticalAngle',
      'fringeSpacing',
      'photonEnergy',
    ])
  })

  test('极值极性：λ红>λ紫，ν/n/E 红<紫，v/C/Δx 红>紫', () => {
    const byKey = (key: string) => matrix.find((r) => r.key === key)!
    expect(byKey('wavelength').relation).toBe('>')
    expect(byKey('frequency').relation).toBe('<')
    expect(byKey('refractiveIndex').relation).toBe('<')
    expect(byKey('speed').relation).toBe('>')
    expect(byKey('criticalAngle').relation).toBe('>')
    expect(byKey('fringeSpacing').relation).toBe('>')
    expect(byKey('photonEnergy').relation).toBe('<')
  })

  test('relation 符号与红紫原始数值严格一致', () => {
    for (const row of matrix) {
      const expected = row.red >= row.violet ? '>' : '<'
      expect(row.relation).toBe(expected)
      expect(row.red).not.toBe(row.violet)
    }
  })

  test('sampleDispersion 汇总的偏向角与光路追踪结果一致', () => {
    const sample = sampleDispersion(SPECTRUM_RED_NM, 50, APEX)
    const trace = tracePrismRay({ incidenceDeg: 50, n: sample.refractiveIndex, apexDeg: APEX })
    expect(sample.deviationDeg).toBeCloseTo(trace.deviationDeg, 10)
    expect(sample.totalInternalReflection).toBe(trace.totalInternalReflection)
  })
})
