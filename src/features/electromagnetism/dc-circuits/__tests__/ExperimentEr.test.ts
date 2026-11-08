import { describe, it, expect } from 'vitest'
import { calculateExperimentEr } from '@/physics/dcCircuit'
import { handleDcCircuits } from '@/data/quantities/electromagnetism/dc-circuits'

describe('ExperimentEr 测定电源电动势与内阻物理系统误差严格测试', () => {
  const E_real = 6.0
  const r_real = 2.0
  const RV = 10.0
  const RA = 1.5

  it('电路甲 (wiring=0, 外接法): 电压表分流导致 E_测 < E_真, r_测 < r_真, 交于横轴短路电流点', () => {
    // 理论等效电源
    const E_meas = E_real / (1 + r_real / RV) // 5.0 V
    const r_meas = r_real / (1 + r_real / RV) // 1.667 Ω

    expect(E_meas).toBeLessThan(E_real)
    expect(r_meas).toBeLessThan(r_real)

    // 短路电流不变：E_真/r_真 == E_测/r_测 == 3.0 A
    const iShortReal = E_real / r_real
    const iShortMeas = E_meas / r_meas
    expect(iShortMeas).toBeCloseTo(iShortReal, 4)

    // 实际抽样点验证：电压表分流误差本质 I_真 - I_测 = U_测 / RV
    const res = calculateExperimentEr(E_real, r_real, 10, 0, RV, RA)
    const vDividerCurrent = res.U_meas / RV
    expect(res.I_real - res.I_meas).toBeCloseTo(vDividerCurrent, 4)

    const data = handleDcCircuits('anim-experiment-er', { wiring: 0, R_slider: 10 }, 0, [])
    expect(data?.quantities.find((q) => q.symbol === 'E(测)')?.value).toBe('5.000')
    expect(data?.quantities.find((q) => q.symbol === 'r(测)')?.value).toBe('1.667')
  })

  it('电路乙 (wiring=1, 内接法): 电流表分压导致 E_测 == E_真, r_测 > r_真, 交于纵轴断路电动势点', () => {
    const E_meas = E_real // 6.0 V
    const r_meas = r_real + RA // 3.5 Ω

    expect(E_meas).toBeCloseTo(E_real, 4)
    expect(r_meas).toBeGreaterThan(r_real)
    expect(r_meas).toBeCloseTo(3.5, 4)

    const data = handleDcCircuits('anim-experiment-er', { wiring: 1, R_slider: 10 }, 0, [])
    expect(data?.quantities.find((q) => q.symbol === 'E(测)')?.value).toBe('6.000')
    expect(data?.quantities.find((q) => q.symbol === 'r(测)')?.value).toBe('3.500')
  })
})
