import { describe, it, expect } from 'vitest'
import { buildModernPhysicsQuantities } from '../src/data/quantities/modernPhysics'

describe('Bohr Theory and Modern Physics Quantities Builder', () => {
  const animId = 'anim-bohr-theory'

  it('should return null for unmatched animation IDs', () => {
    const result = buildModernPhysicsQuantities('invalid-id', {}, 0)
    expect(result).toBeNull()
  })

  describe('Stage 1: History and Rutherford Scattering (mode = 0)', () => {
    it('should show Thomson model correctly', () => {
      const params = { mode: 0, modelType: 0, impactParameter: 10 }
      const res = buildModernPhysicsQuantities(animId, params, 0)
      expect(res).not.toBeNull()
      expect(res?.quantities[0].value).toContain('汤姆孙')
      expect(res?.quantities[2].value).toContain('几乎全部直穿')
    })

    it('should show Rutherford model scattering behavior correctly based on b', () => {
      // 靠近金核的散射 (b 极小)
      const resClose = buildModernPhysicsQuantities(animId, { mode: 0, modelType: 1, impactParameter: 4 }, 0)
      expect(resClose?.quantities[2].value).toContain('极少数粒子大角度反弹')

      // 中等距离散射
      const resMid = buildModernPhysicsQuantities(animId, { mode: 0, modelType: 1, impactParameter: 12 }, 0)
      expect(resMid?.quantities[2].value).toContain('少数粒子')

      // 遥远距离直穿
      const resFar = buildModernPhysicsQuantities(animId, { mode: 0, modelType: 1, impactParameter: 30 }, 0)
      expect(resFar?.quantities[2].value).toContain('绝大多数粒子')
    })
  })

  describe('Stage 2: Bohr Atomic Model (mode = 1)', () => {
    it('should calculate En and rn accurately for different quantum numbers', () => {
      // n = 1 基态
      const resN1 = buildModernPhysicsQuantities(animId, { mode: 1, targetLevel: 1 }, 0)
      const En1 = parseFloat(resN1?.quantities[1].value || '0')
      const rn1 = parseFloat(resN1?.quantities[2].value || '0')
      expect(En1).toBeCloseTo(-13.60, 2)
      expect(rn1).toBeCloseTo(0.53, 2)

      // n = 2 激发态
      const resN2 = buildModernPhysicsQuantities(animId, { mode: 1, targetLevel: 2 }, 0)
      const En2 = parseFloat(resN2?.quantities[1].value || '0')
      const rn2 = parseFloat(resN2?.quantities[2].value || '0')
      expect(En2).toBeCloseTo(-3.40, 2)
      expect(rn2).toBeCloseTo(2.12, 2) // 2^2 * 0.53 = 2.12
    })
  })

  describe('Stage 3: Excitation Mechanism comparison (mode = 2)', () => {
    it('should strictly require resonance for photon absorption', () => {
      // 能级吻合：10.2 eV (1->2) -> 激发成功
      const resExact = buildModernPhysicsQuantities(animId, {
        mode: 2,
        excitationType: 0, // 光子
        incidentEnergy: 10.2,
      }, 0)
      expect(resExact?.quantities[2].value).toContain('激发成功')
      expect(resExact?.warnings?.length).toBe(0)

      // 能级不吻合：11.0 eV -> 激发失败，穿透，且发出警告
      const resMiss = buildModernPhysicsQuantities(animId, {
        mode: 2,
        excitationType: 0, // 光子
        incidentEnergy: 11.0,
      }, 0)
      expect(resMiss?.quantities[2].value).toContain('激发失败')
      expect(resMiss?.warnings?.length).toBeGreaterThan(0)
      expect(resMiss?.warnings?.[0].text).toContain('无法激发')

      // 电离能：14.0 eV -> 直接电离
      const resIon = buildModernPhysicsQuantities(animId, {
        mode: 2,
        excitationType: 0,
        incidentEnergy: 14.0,
      }, 0)
      expect(resIon?.quantities[2].value).toContain('彻底电离')
    })

    it('should allow super-threshold energy transfer for electronic collisions', () => {
      // 11.0 eV 电子碰撞 -> 成功激发到 n=2 并携带 0.8 eV 逸出
      const resCol = buildModernPhysicsQuantities(animId, {
        mode: 2,
        excitationType: 1, // 电子
        incidentEnergy: 11.0,
      }, 0)
      expect(resCol?.quantities[2].value).toContain('激发成功')
      expect(resCol?.quantities[2].value).toContain('n=2')
      expect(resCol?.quantities[2].value).toContain('0.80 eV')
    })
  })

  describe('Stage 4: Coupled Photoelectric Effect (mode = 3)', () => {
    it('should calculate Ekm and stopping voltage correctly', () => {
      // 照射光子：4->1 跃迁（能量 12.75 eV）
      // 钠逸出功：2.29 eV
      // 最大初动能：12.75 - 2.29 = 10.46 eV
      // 理论截止电压：10.46 V
      const res = buildModernPhysicsQuantities(animId, {
        mode: 3,
        radiationPhotonIndex: 2, // 4->1
        workFunction: 2.29,
        stoppingVoltage: 5.0,
      }, 0)

      expect(res?.quantities[1].value).toBe('12.75') // hv
      expect(res?.quantities[3].value).toBe('10.46') // Ekm
      expect(res?.quantities[4].value).toBe('10.46') // Uc
      expect(res?.quantities[5].value).toContain('稳定的光电流') // U < Uc

      // 反向电压 >= Uc 时，电流截止
      const resCut = buildModernPhysicsQuantities(animId, {
        mode: 3,
        radiationPhotonIndex: 2,
        workFunction: 2.29,
        stoppingVoltage: 11.0,
      }, 0)
      expect(resCut?.quantities[5].value).toContain('已截止')
    })
  })
})
