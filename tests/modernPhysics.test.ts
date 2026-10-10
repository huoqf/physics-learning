import { describe, it, expect } from 'vitest'
import { buildModernPhysicsQuantities } from '../src/data/quantities/modernPhysics'
import { buildAlphaScatterQuantities } from '../src/data/quantities/alphaScatter'

describe('Bohr Theory and Modern Physics Quantities Builder', () => {
  const animId = 'anim-bohr-theory'

  it('should return null for unmatched animation IDs', () => {
    const result = buildModernPhysicsQuantities('invalid-id', {}, 0)
    expect(result).toBeNull()
  })

  describe('Alpha Particle Scattering and Nuclear Structure (anim-alpha-scatter)', () => {
    const scatterId = 'anim-alpha-scatter'

    it('should show Thomson model correctly', () => {
      const params = { modelType: 0, impactParameter: 10 }
      const res = buildAlphaScatterQuantities(scatterId, params, 0)
      expect(res).not.toBeNull()
      expect(res?.quantities[0].value).toContain('汤姆孙')
      // 枣糕模型正电荷弥散，不产生偏转
      expect(res?.quantities[2].value).toBe('0.0')
      expect(res?.quantities[3].value).toContain('几乎全部直穿')
    })

    it('should derive scattering angle from the same analytic law as the animation', () => {
      const row = (b: number) =>
        buildAlphaScatterQuantities(scatterId, { modelType: 1, impactParameter: b }, 0)!

      // b = 库仑作用尺度 a = 4px 时，散射角恰为 90°（双曲线几何分界）
      expect(parseFloat(row(4).quantities[2].value)).toBeCloseTo(90, 1)

      // 散射角随碰撞参数单调递减
      const angle = (b: number) => parseFloat(row(b).quantities[2].value)
      expect(angle(1)).toBeGreaterThan(angle(8))
      expect(angle(8)).toBeGreaterThan(angle(20))

      // 最近接近距离满足 r_min = a + √(a² + b²)
      expect(parseFloat(row(0).quantities[4].value)).toBeCloseTo(8, 1)
    })

    it('should classify scattering behavior consistently with the animation', () => {
      // 近距 → 大角度反弹
      const close = buildAlphaScatterQuantities(scatterId, { modelType: 1, impactParameter: 1 }, 0)
      expect(close?.quantities[3].value).toContain('大角度反弹')

      // 中距 → 明显偏转
      const mid = buildAlphaScatterQuantities(scatterId, { modelType: 1, impactParameter: 12 }, 0)
      expect(mid?.quantities[3].value).toContain('明显偏转')

      // 远距 → 几乎直穿
      const far = buildAlphaScatterQuantities(scatterId, { modelType: 1, impactParameter: 120 }, 0)
      expect(far?.quantities[3].value).toContain('几乎直穿')
    })
  })

  describe('Stage 1: Bohr Atomic Model (mode = 0)', () => {
    it('should calculate En and rn accurately for different quantum numbers', () => {
      // n = 1 基态
      const resN1 = buildModernPhysicsQuantities(animId, { mode: 0, targetLevel: 1 }, 0)
      const En1 = parseFloat(resN1?.quantities[1].value || '0')
      const rn1 = parseFloat(resN1?.quantities[2].value || '0')
      expect(En1).toBeCloseTo(-13.60, 2)
      expect(rn1).toBeCloseTo(0.53, 2)

      // n = 2 激发态
      const resN2 = buildModernPhysicsQuantities(animId, { mode: 0, targetLevel: 2 }, 0)
      const En2 = parseFloat(resN2?.quantities[1].value || '0')
      const rn2 = parseFloat(resN2?.quantities[2].value || '0')
      expect(En2).toBeCloseTo(-3.40, 2)
      expect(rn2).toBeCloseTo(2.12, 2)
    })
  })

  describe('Stage 2: Excitation Mechanism comparison (mode = 1)', () => {
    it('should strictly require resonance for photon absorption', () => {
      // 能级吻合：10.2 eV (1->2) -> 激发成功
      const resExact = buildModernPhysicsQuantities(animId, {
        mode: 1,
        excitationType: 0, // 光子
        incidentEnergy: 10.2,
      }, 0)
      expect(resExact?.quantities[2].value).toContain('激发成功')
      expect(resExact?.warnings?.length).toBe(0)

      // 能级不吻合：11.0 eV -> 激发失败，穿透，且发出警告
      const resMiss = buildModernPhysicsQuantities(animId, {
        mode: 1,
        excitationType: 0, // 光子
        incidentEnergy: 11.0,
      }, 0)
      expect(resMiss?.quantities[2].value).toContain('激发失败')
      expect(resMiss?.warnings?.length).toBeGreaterThan(0)
      expect(resMiss?.warnings?.[0].text).toContain('未被吸收')

      // 电离能：14.0 eV -> 直接电离
      const resIon = buildModernPhysicsQuantities(animId, {
        mode: 1,
        excitationType: 0,
        incidentEnergy: 14.0,
      }, 0)
      expect(resIon?.quantities[2].value).toContain('彻底电离')
    })

    it('should allow super-threshold energy transfer for electronic collisions', () => {
      // 11.0 eV 电子碰撞 -> 成功激发到 n=2 并携带 0.8 eV 逸出
      const resCol = buildModernPhysicsQuantities(animId, {
        mode: 1,
        excitationType: 1, // 电子
        incidentEnergy: 11.0,
      }, 0)
      expect(resCol?.quantities[2].value).toContain('激发成功')
      expect(resCol?.quantities[2].value).toContain('n=2')
      expect(resCol?.quantities[2].value).toContain('0.80 eV')
    })
  })

  describe('Stage 3: Coupled Photoelectric Effect (mode = 2)', () => {
    it('should calculate Ekm and stopping voltage correctly', () => {
      // 照射光子：4->1 跃迁（能量 12.75 eV）
      // 钠逸出功：2.29 eV
      // 最大初动能：12.75 - 2.29 = 10.46 eV
      // 理论截止电压：10.46 V
      const res = buildModernPhysicsQuantities(animId, {
        mode: 2,
        radiationPhotonIndex: 2, // 4->1
        workFunction: 2.29,
        stoppingVoltage: 5.0,
      }, 0)

      expect(res?.quantities[1].value).toBe('12.75') // hv
      expect(res?.quantities[3].value).toBe('10.46') // Ekm
      expect(res?.quantities[4].value).toBe('10.46') // Uc
      expect(res?.quantities[5].value).toContain('稳定光电流') // U < Uc

      // 反向电压 >= Uc 时，电流截止
      const resCut = buildModernPhysicsQuantities(animId, {
        mode: 2,
        radiationPhotonIndex: 2,
        workFunction: 2.29,
        stoppingVoltage: 11.0,
      }, 0)
      expect(resCut?.quantities[5].value).toContain('拦截')
    })
  })
})
