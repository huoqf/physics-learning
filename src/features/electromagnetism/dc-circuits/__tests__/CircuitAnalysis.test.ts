import { describe, it, expect } from 'vitest'
import { calculateCircuitAnalysis } from '@/physics/dcCircuit'
import { handleDcCircuits } from '@/data/quantities/electromagnetism/dc-circuits'

describe('CircuitAnalysis 物理模型与极值逻辑严格测试', () => {
  const U = 12
  const R1 = 20
  const R3 = 30

  describe('1. 基础串联电路 (mode=0, subMode=0)', () => {
    it('串联等流与串联分压严格成立', () => {
      const R2 = 10
      const res = calculateCircuitAnalysis(0, 0, R1, R2, R3, U)
      expect(res.Rtotal).toBe(30)
      expect(res.Itotal).toBeCloseTo(0.4, 4)
      expect(res.I1).toBeCloseTo(0.4, 4)
      expect(res.I2).toBeCloseTo(0.4, 4)
      expect(res.U1).toBeCloseTo(8, 4)
      expect(res.U2).toBeCloseTo(4, 4)
      expect(res.U1 + res.U2).toBeCloseTo(U, 4)
    })

    it('串联电路中变阻器 R2 功率在 R2 = R1 = 20Ω 时达到极大值', () => {
      const pAt10 = calculateCircuitAnalysis(0, 0, R1, 10, R3, U)
      const pAt20 = calculateCircuitAnalysis(0, 0, R1, 20, R3, U)
      const pAt30 = calculateCircuitAnalysis(0, 0, R1, 30, R3, U)

      const power10 = pAt10.I2 * pAt10.U2 // 0.4A * 4V = 1.6W
      const power20 = pAt20.I2 * pAt20.U2 // 0.3A * 6V = 1.8W (最大)
      const power30 = pAt30.I2 * pAt30.U2 // 0.24A * 7.2V = 1.728W

      expect(power20).toBeGreaterThan(power10)
      expect(power20).toBeGreaterThan(power30)
      expect(power20).toBeCloseTo(1.8, 4)
    })

    it('右屏看板在 R2 = 20Ω 时触发最值达成，在偏离点不触发', () => {
      const data20 = handleDcCircuits('anim-circuit-analysis', { mode: 0, subMode: 0, U, R1, R2: 20, R3 }, 0, [])
      expect(data20?.warnings?.some((w) => w.text.includes('【最值达成】'))).toBe(true)

      const data10 = handleDcCircuits('anim-circuit-analysis', { mode: 0, subMode: 0, U, R1, R2: 10, R3 }, 0, [])
      expect(data10?.warnings?.some((w) => w.text.includes('【最值达成】'))).toBe(false)
    })
  })

  describe('2. 基础并联电路 (mode=0, subMode=1)', () => {
    it('并联等压与分流相加严格成立', () => {
      const R2 = 10
      const res = calculateCircuitAnalysis(0, 1, R1, R2, R3, U)
      expect(res.U1).toBe(U)
      expect(res.U2).toBe(U)
      expect(res.I1).toBeCloseTo(12 / 20, 4) // 0.6A
      expect(res.I2).toBeCloseTo(12 / 10, 4) // 1.2A
      expect(res.Itotal).toBeCloseTo(1.8, 4)
    })

    it('并联电路中变阻器 R2 功率严格单调递减，绝无极值点', () => {
      const p10 = calculateCircuitAnalysis(0, 1, R1, 10, R3, U)
      const p20 = calculateCircuitAnalysis(0, 1, R1, 20, R3, U)
      const p50 = calculateCircuitAnalysis(0, 1, R1, 50, R3, U)
      const p100 = calculateCircuitAnalysis(0, 1, R1, 100, R3, U)

      const pow10 = p10.I2 * p10.U2 // 14.4W
      const pow20 = p20.I2 * p20.U2 // 7.2W
      const pow50 = p50.I2 * p50.U2 // 2.88W
      const pow100 = p100.I2 * p100.U2 // 1.44W

      expect(pow10).toBeGreaterThan(pow20)
      expect(pow20).toBeGreaterThan(pow50)
      expect(pow50).toBeGreaterThan(pow100)
    })

    it('并联模式下，即便 R2 = 20Ω 绝不能触发【最值达成】警告', () => {
      const data = handleDcCircuits('anim-circuit-analysis', { mode: 0, subMode: 1, U, R1, R2: 20, R3 }, 0, [])
      const hasMaxWarning = data?.warnings?.some((w) => w.text.includes('【最值达成】')) ?? false
      expect(hasMaxWarning).toBe(false)
    })
  })

  describe('3. 进阶混联电路 (mode=1)', () => {
    it('混联电路中变阻器 R2 功率在 R2 = R1//R3 = 12Ω 时达到极大值', () => {
      // R1 = 20, R3 = 30 -> R_th = 20*30 / 50 = 12
      const pAt10 = calculateCircuitAnalysis(1, 0, R1, 10, R3, U)
      const pAt12 = calculateCircuitAnalysis(1, 0, R1, 12, R3, U)
      const pAt15 = calculateCircuitAnalysis(1, 0, R1, 15, R3, U)

      const pow10 = pAt10.I2 * pAt10.U2
      const pow12 = pAt12.I2 * pAt12.U2
      const pow15 = pAt15.I2 * pAt15.U2

      expect(pow12).toBeGreaterThan(pow10)
      expect(pow12).toBeGreaterThan(pow15)
      expect(pow12).toBeCloseTo(1.08, 2)
    })

    it('进阶混联下在 R2 = 12Ω 时触发最值达成，在偏离点不触发', () => {
      const data12 = handleDcCircuits('anim-circuit-analysis', { mode: 1, subMode: 0, U, R1, R2: 12, R3 }, 0, [])
      expect(data12?.warnings?.some((w) => w.text.includes('【最值达成】'))).toBe(true)

      const data30 = handleDcCircuits('anim-circuit-analysis', { mode: 1, subMode: 0, U, R1, R2: 30, R3 }, 0, [])
      expect(data30?.warnings?.some((w) => w.text.includes('【最值达成】'))).toBe(false)
    })
  })
})
