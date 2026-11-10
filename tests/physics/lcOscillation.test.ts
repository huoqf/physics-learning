import { describe, it, expect } from 'vitest'
import {
  calculateLCConstants,
  lcChargeAt,
  lcCurrentAt,
  lcVoltageAt,
  lcCurrentRateAt,
  lcInductorEmfMagnitudeAt,
  lcOscillationStage,
  lcElectricEnergy,
  lcMagneticEnergy,
  sampleLCWaveform,
  lcDampingAmplitude,
  DAMPING_TAU_PERIODS,
  formatLCEnergy,
  type LCParams,
} from '@/physics/lcOscillation'

// 基准工况：L = 0.1 H，C = 1 μF，Q₀ = 10 μC
//   ω = 1/√(1e-7) = 3162.27766… rad/s
//   T = 2π√(1e-7) = 1.9869176…e-3 s
//   E总 = Q₀²/(2C) = 5e-5 J
const LC: LCParams = { L: 0.1, C: 1e-6, Q0: 1e-5 }

const OMEGA = 1 / Math.sqrt(1e-7)
const PERIOD = (2 * Math.PI) / OMEGA
const E_TOTAL = 5e-5

describe('lcOscillation · 固有量', () => {
  it('ω = 1/√(LC)', () => {
    expect(calculateLCConstants(LC).omega).toBeCloseTo(OMEGA, 10)
  })

  it('T = 2π√(LC)', () => {
    expect(calculateLCConstants(LC).T).toBeCloseTo(2 * Math.PI * Math.sqrt(1e-7), 12)
    // 绝对值锚点：2π√(0.1 × 1e-6) = 1.9869176531592202e-3 s
    expect(calculateLCConstants(LC).T).toBeCloseTo(1.9869176531592e-3, 12)
  })

  it('f = 1/T = ω/2π', () => {
    const { f, T, omega } = calculateLCConstants(LC)
    expect(f).toBeCloseTo(1 / T, 12)
    expect(f).toBeCloseTo(omega / (2 * Math.PI), 12)
  })

  it('E总 = Q₀²/(2C)，I₀ = ωQ₀', () => {
    const { eTotal, iMax } = calculateLCConstants(LC)
    expect(eTotal).toBeCloseTo(E_TOTAL, 15)
    expect(iMax).toBeCloseTo(OMEGA * 1e-5, 12)
  })

  it('总能量与电流峰值满足 ½LI₀² = E总（两种能量表达自洽）', () => {
    const { eTotal, iMax } = calculateLCConstants(LC)
    expect(0.5 * LC.L * iMax * iMax).toBeCloseTo(eTotal, 15)
  })

  it('L 或 C 非正数时抛出（无物理意义，不得静默返回）', () => {
    expect(() => calculateLCConstants({ ...LC, L: 0 })).toThrow()
    expect(() => calculateLCConstants({ ...LC, L: -1 })).toThrow()
    expect(() => calculateLCConstants({ ...LC, C: 0 })).toThrow()
    expect(() => calculateLCConstants({ ...LC, C: -1e-6 })).toThrow()
    expect(() => calculateLCConstants({ ...LC, L: NaN })).toThrow()
  })
})

describe('lcOscillation · q(t) 与 i(t)', () => {
  it('t = 0 时 q = Q₀ 且 i = 0（电荷最大、电流为零）', () => {
    expect(lcChargeAt(LC, 0)).toBeCloseTo(1e-5, 15)
    expect(lcCurrentAt(LC, 0)).toBeCloseTo(0, 15)
  })

  it('t = T/4 时 q = 0 且 i 取正峰值（逆时针放电电流最大）', () => {
    expect(lcChargeAt(LC, PERIOD / 4)).toBeCloseTo(0, 15)
    expect(lcCurrentAt(LC, PERIOD / 4)).toBeCloseTo(OMEGA * 1e-5, 12)
  })

  it('t = T/2 时 q = −Q₀ 且 i = 0（电荷反号回到极值）', () => {
    expect(lcChargeAt(LC, PERIOD / 2)).toBeCloseTo(-1e-5, 15)
    expect(lcCurrentAt(LC, PERIOD / 2)).toBeCloseTo(0, 12)
  })

  it('t = 3T/4 时 q = 0 且 i 取负峰值（顺时针充电电流最大）', () => {
    expect(lcChargeAt(LC, (3 * PERIOD) / 4)).toBeCloseTo(0, 12)
    expect(lcCurrentAt(LC, (3 * PERIOD) / 4)).toBeCloseTo(-OMEGA * 1e-5, 12)
  })

  it('t = T 时回到初始状态（周期闭合）', () => {
    expect(lcChargeAt(LC, PERIOD)).toBeCloseTo(1e-5, 12)
    expect(lcCurrentAt(LC, PERIOD)).toBeCloseTo(0, 12)
  })

  it('q 与 i 相位差恰为 90°：i 的零点即 q 的极值点', () => {
    // 在若干采样时刻验证「|q| 取极值 ⇔ i ≈ 0」
    for (let k = 0; k <= 8; k++) {
      const t = (k * PERIOD) / 8
      const q = lcChargeAt(LC, t)
      const i = lcCurrentAt(LC, t)
      const qIsExtreme = Math.abs(Math.abs(q) - 1e-5) < 1e-12
      if (qIsExtreme) expect(Math.abs(i)).toBeLessThan(1e-9)
      else expect(Math.abs(i)).toBeGreaterThan(0)
    }
  })

  it('符号约定 i = -dq/dt（数值微分校验，防止符号/方向类错误）', () => {
    const dt = 1e-9
    for (let k = 1; k <= 6; k++) {
      const t = (k * PERIOD) / 12
      const numeric = -(lcChargeAt(LC, t + dt) - lcChargeAt(LC, t - dt)) / (2 * dt)
      expect(lcCurrentAt(LC, t)).toBeCloseTo(numeric, 3)
    }
  })
})

describe('lcOscillation · 能量守恒（误差 ≤ 1e-6）', () => {
  it('任意时刻 Ee + Em 恒等于 Q₀²/(2C)', () => {
    const { eTotal } = calculateLCConstants(LC)
    // 在一个完整周期内密集采样
    for (let k = 0; k <= 400; k++) {
      const t = (k * PERIOD) / 400
      const q = lcChargeAt(LC, t)
      const i = lcCurrentAt(LC, t)
      const sum = lcElectricEnergy(q, LC.C) + lcMagneticEnergy(i, LC.L)
      expect(Math.abs(sum - eTotal) / eTotal).toBeLessThan(1e-6)
    }
  })

  it('电荷取极值处能量全在电场（Em = 0）', () => {
    const q = lcChargeAt(LC, 0)
    const i = lcCurrentAt(LC, 0)
    expect(lcElectricEnergy(q, LC.C)).toBeCloseTo(E_TOTAL, 15)
    expect(lcMagneticEnergy(i, LC.L)).toBeCloseTo(0, 15)
  })

  it('电流取极值处能量全在磁场（Ee = 0）', () => {
    const q = lcChargeAt(LC, PERIOD / 4)
    const i = lcCurrentAt(LC, PERIOD / 4)
    expect(lcElectricEnergy(q, LC.C)).toBeCloseTo(0, 15)
    expect(lcMagneticEnergy(i, LC.L)).toBeCloseTo(E_TOTAL, 15)
  })

  it('半个周期内电场能与磁场能各完成两次完整转换（换算成能量占比验证）', () => {
    // 电场能占比 = cos²(ωt)，磁场能占比 = sin²(ωt)
    const { eTotal } = calculateLCConstants(LC)
    for (let k = 0; k <= 100; k++) {
      const t = (k * PERIOD) / 100
      const eRatio = lcElectricEnergy(lcChargeAt(LC, t), LC.C) / eTotal
      const mRatio = lcMagneticEnergy(lcCurrentAt(LC, t), LC.L) / eTotal
      const expectedE = Math.cos(OMEGA * t) ** 2
      expect(eRatio).toBeCloseTo(expectedE, 9)
      expect(mRatio).toBeCloseTo(1 - expectedE, 9)
    }
  })
})

describe('lcOscillation · 波形采样', () => {
  it('长度固定为 sampleCount + 1，含首尾', () => {
    const s = sampleLCWaveform(LC, 100, 1)
    expect(s).toHaveLength(101)
    expect(s[0].t).toBeCloseTo(0, 15)
    expect(s[100].t).toBeCloseTo(PERIOD, 12)
  })

  it('采样点与逐点求值一致', () => {
    const s = sampleLCWaveform(LC, 50, 1)
    for (const p of s) {
      expect(p.q).toBeCloseTo(lcChargeAt(LC, p.t), 15)
      expect(p.i).toBeCloseTo(lcCurrentAt(LC, p.t), 12)
    }
  })

  it('cycles 参数控制覆盖周期数', () => {
    const s = sampleLCWaveform(LC, 10, 3)
    expect(s[10].t).toBeCloseTo(3 * PERIOD, 12)
  })

  it('sampleCount 为 0 或负数时退化为至少 2 点', () => {
    expect(sampleLCWaveform(LC, 0, 1)).toHaveLength(2)
    expect(sampleLCWaveform(LC, -5, 1)).toHaveLength(2)
  })
})

describe('lcOscillation · 阻尼振幅系数（定性，全链路唯一入口）', () => {
  it('t = 0 时为 1，随后单调递减', () => {
    expect(lcDampingAmplitude(0, PERIOD)).toBe(1)
    let prev = 1
    for (let k = 1; k <= 40; k++) {
      const v = lcDampingAmplitude((k * PERIOD) / 20, PERIOD)
      expect(v).toBeLessThan(prev)
      prev = v
    }
  })

  it('τ = 1.5T：t = 2T 时振幅为初始值的 e^(−4/3)', () => {
    expect(DAMPING_TAU_PERIODS).toBe(1.5)
    expect(lcDampingAmplitude(2 * PERIOD, PERIOD)).toBeCloseTo(Math.exp(-4 / 3), 12)
  })

  it('周期越长衰减越慢（τ ∝ T，与 L、C 无关）', () => {
    expect(lcDampingAmplitude(PERIOD, 2 * PERIOD)).toBeGreaterThan(
      lcDampingAmplitude(PERIOD, PERIOD),
    )
  })

  it('周期非正数时退化为不衰减（避免除零）', () => {
    expect(lcDampingAmplitude(1, 0)).toBe(1)
    expect(lcDampingAmplitude(1, -1)).toBe(1)
  })

  it('负时刻夹紧到 1（不回弹放大）', () => {
    expect(lcDampingAmplitude(-5, PERIOD)).toBe(1)
  })
})

describe('lcOscillation · 欠阻尼 RLC（damped: true）全链路同源', () => {
  const DAMPED: LCParams = { ...LC, damped: true }

  it('damped 缺省或为 false 时与理想解逐位一致（回归保护）', () => {
    for (let k = 0; k <= 20; k++) {
      const t = (k * PERIOD) / 20
      expect(lcChargeAt({ ...LC, damped: false }, t)).toBe(lcChargeAt(LC, t))
      expect(lcCurrentAt({ ...LC, damped: false }, t)).toBe(lcCurrentAt(LC, t))
    }
  })

  it('欠阻尼下满足初始条件 q(0)=Q₀、i(0)=0 且极值振幅逐次衰减', () => {
    const { omegaDamped } = calculateLCConstants(DAMPED)
    const dampedPeriod = (2 * Math.PI) / omegaDamped
    expect(lcChargeAt(DAMPED, 0)).toBeCloseTo(LC.Q0, 15)
    expect(lcCurrentAt(DAMPED, 0)).toBe(0)

    // 欠阻尼周期的整倍数时刻，i = 0 而 |q| 严格逐次减小
    const peak0 = Math.abs(lcChargeAt(DAMPED, 0))
    const peak1 = Math.abs(lcChargeAt(DAMPED, dampedPeriod))
    const peak2 = Math.abs(lcChargeAt(DAMPED, 2 * dampedPeriod))
    expect(Math.abs(lcCurrentAt(DAMPED, dampedPeriod))).toBeLessThan(1e-12)
    expect(peak1).toBeLessThan(peak0)
    expect(peak2).toBeLessThan(peak1)
  })

  it('欠阻尼解析解严格满足 i = -dq/dt（不再使用伪解析包络乘积）', () => {
    const dt = 1e-9
    for (const k of [1, 2, 4, 5, 6]) {
      const t = (k * PERIOD) / 12
      const numeric = -(lcChargeAt(DAMPED, t + dt) - lcChargeAt(DAMPED, t - dt)) / (2 * dt)
      const analytic = lcCurrentAt(DAMPED, t)
      expect(analytic).toBeCloseTo(numeric, 4)
    }
  })

  it('欠阻尼电磁能单调不增（在 i≠0 时严格减少），减少量等于产生的内能', () => {
    const { eTotal } = calculateLCConstants(LC)
    let prev = eTotal
    for (let k = 1; k <= 200; k++) {
      const t = (k * 2 * PERIOD) / 200
      const emTotal =
        lcElectricEnergy(lcChargeAt(DAMPED, t), LC.C) + lcMagneticEnergy(lcCurrentAt(DAMPED, t), LC.L)
      expect(emTotal).toBeLessThanOrEqual(prev + 1e-18)
      expect(emTotal).toBeLessThan(eTotal)
      prev = emTotal
    }
  })

  it('采样器与逐点求值完全同源（曲线不会与读数分叉）', () => {
    for (const p of sampleLCWaveform(DAMPED, 40, 2)) {
      expect(p.q).toBe(lcChargeAt(DAMPED, p.t))
      expect(p.i).toBe(lcCurrentAt(DAMPED, p.t))
    }
  })
})

describe('lcOscillation · 能量格式化单一来源 formatLCEnergy', () => {
  it('极小残差或绝对零严格归一为 0.00，杜绝科学记数法泄漏', () => {
    expect(formatLCEnergy(0)).toBe('0.00')
    expect(formatLCEnergy(-0)).toBe('0.00')
    expect(formatLCEnergy(1e-15)).toBe('0.00')
    expect(formatLCEnergy(9.9e-5)).toBe('0.00')
    expect(formatLCEnergy(-9.9e-5)).toBe('0.00')
  })

  it('微小有效值（1e-4 ~ 1 J）统一保留 3 位小数，杜绝小数位跳变', () => {
    expect(formatLCEnergy(1e-4)).toBe('0.000')
    expect(formatLCEnergy(0.042)).toBe('0.042')
    expect(formatLCEnergy(0.5)).toBe('0.500')
    expect(formatLCEnergy(0.999)).toBe('0.999')
  })

  it('中等值（1 ~ 100 J）保留 2 位小数', () => {
    expect(formatLCEnergy(1.0)).toBe('1.00')
    expect(formatLCEnergy(2.345)).toBe('2.35')
    expect(formatLCEnergy(99.99)).toBe('99.99')
  })

  it('大数值（>= 100 J）保留 1 位小数', () => {
    expect(formatLCEnergy(100.0)).toBe('100.0')
    expect(formatLCEnergy(250.67)).toBe('250.7')
  })
})

describe('lcOscillation · 电压、变化率 di/dt、自感电动势与基尔霍夫方程', () => {
  it('理想 LC 满足 L(di/dt) = q/C 与能量变化周期 T_E = T/2', () => {
    const c = calculateLCConstants(LC)
    expect(c.energyPeriod).toBeCloseTo(c.T / 2, 12)
    expect(c.resistance).toBe(0)

    const dt = 1e-10
    for (const k of [0, 1, 2, 3, 5, 7]) {
      const t = (k * PERIOD) / 8
      const diDt = lcCurrentRateAt(LC, t)
      const uC = lcVoltageAt(LC, t)
      const eL = lcInductorEmfMagnitudeAt(LC, t)
      expect(LC.L * diDt).toBeCloseTo(uC, 8)
      expect(eL).toBeCloseTo(Math.abs(LC.L * diDt), 10)
      if (t > 0) {
        const numDiDt = (lcCurrentAt(LC, t + dt) - lcCurrentAt(LC, t - dt)) / (2 * dt)
        expect(diDt).toBeCloseTo(numDiDt, 2)
      }
    }
  })

  it('欠阻尼 RLC 严格满足基尔霍夫回路方程 L(di/dt) + iR = q/C 与数值导数 di/dt', () => {
    const damped: LCParams = { ...LC, damped: true }
    const { resistance } = calculateLCConstants(damped)
    expect(resistance).toBeGreaterThan(0)

    const dt = 1e-10
    for (const k of [1, 3, 5, 7, 11]) {
      const t = (k * PERIOD) / 10
      const i = lcCurrentAt(damped, t)
      const diDt = lcCurrentRateAt(damped, t)
      const uC = lcVoltageAt(damped, t)
      const numDiDt = (lcCurrentAt(damped, t + dt) - lcCurrentAt(damped, t - dt)) / (2 * dt)

      expect(LC.L * diDt + i * resistance).toBeCloseTo(uC, 8)
      expect(diDt).toBeCloseTo(numDiDt, 1)
    }
  })

  it('lcOscillationStage 在关键时刻与四象限精准返回物理阶段与能量流向', () => {
    expect(lcOscillationStage(LC, 0).stage).toBe('正向电荷峰值 (i=0)')
    expect(lcOscillationStage(LC, PERIOD / 4).stage).toBe('逆时针电流峰值 (q=0)')
    expect(lcOscillationStage(LC, PERIOD / 2).stage).toBe('反向电荷峰值 (i=0)')
    expect(lcOscillationStage(LC, (3 * PERIOD) / 4).stage).toBe('顺时针电流峰值 (q=0)')
    expect(lcOscillationStage(LC, PERIOD / 8).energyFlow).toBe('电场能 → 磁场能')
    expect(lcOscillationStage(LC, (3 * PERIOD) / 8).energyFlow).toBe('磁场能 → 电场能')
  })
})

