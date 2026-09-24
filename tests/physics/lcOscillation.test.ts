import { describe, it, expect } from 'vitest'
import {
  calculateLCConstants,
  lcChargeAt,
  lcCurrentAt,
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

  it('t = T/4 时 q = 0 且 i 取负峰值（电荷为零、电流最大）', () => {
    expect(lcChargeAt(LC, PERIOD / 4)).toBeCloseTo(0, 15)
    expect(lcCurrentAt(LC, PERIOD / 4)).toBeCloseTo(-OMEGA * 1e-5, 12)
  })

  it('t = T/2 时 q = −Q₀ 且 i = 0（电荷反号回到极值）', () => {
    expect(lcChargeAt(LC, PERIOD / 2)).toBeCloseTo(-1e-5, 15)
    expect(lcCurrentAt(LC, PERIOD / 2)).toBeCloseTo(0, 12)
  })

  it('t = 3T/4 时 q = 0 且 i 取正峰值', () => {
    expect(lcChargeAt(LC, (3 * PERIOD) / 4)).toBeCloseTo(0, 12)
    expect(lcCurrentAt(LC, (3 * PERIOD) / 4)).toBeCloseTo(OMEGA * 1e-5, 12)
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

  it('符号约定 i = dq/dt（数值微分校验，防止符号/方向类错误）', () => {
    const dt = 1e-9
    for (let k = 1; k <= 6; k++) {
      const t = (k * PERIOD) / 12
      const numeric = (lcChargeAt(LC, t + dt) - lcChargeAt(LC, t - dt)) / (2 * dt)
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

describe('lcOscillation · 阻尼（damped: true）全链路同源', () => {
  const DAMPED: LCParams = { ...LC, damped: true }
  const TAU = DAMPING_TAU_PERIODS * PERIOD

  it('damped 缺省或为 false 时与理想解逐位一致（回归保护）', () => {
    for (let k = 0; k <= 20; k++) {
      const t = (k * PERIOD) / 20
      expect(lcChargeAt({ ...LC, damped: false }, t)).toBe(lcChargeAt(LC, t))
      expect(lcCurrentAt({ ...LC, damped: false }, t)).toBe(lcCurrentAt(LC, t))
    }
  })

  it('波峰逐次衰减：|q| = Q₀·e^(−t/τ)', () => {
    for (let k = 0; k <= 8; k += 2) {
      const t = (k * PERIOD) / 4
      const amp = lcDampingAmplitude(t, PERIOD)
      expect(Math.abs(lcChargeAt(DAMPED, t))).toBeCloseTo(1e-5 * amp, 12)
    }
  })

  it('电荷极值处电流仍为零（高考核心判据，刻意保留）', () => {
    for (let k = 0; k <= 8; k++) {
      const t = (k * PERIOD) / 4
      const q = lcChargeAt(DAMPED, t)
      const i = lcCurrentAt(DAMPED, t)
      if (k % 2 === 0) {
        // 电荷取极值 → 电流必须为零
        expect(Math.abs(i)).toBeLessThan(1e-15)
      } else {
        // 电荷过零 → 电流取极值，且峰值随包络衰减
        expect(Math.abs(q)).toBeLessThan(1e-15)
        expect(Math.abs(i)).toBeCloseTo(
          OMEGA * 1e-5 * lcDampingAmplitude(t, PERIOD),
          9,
        )
      }
    }
  })

  it('⚠️ 阻尼下 i ≠ dq/dt（差额恰为 q/τ，不得据此推导导数关系）', () => {
    // 这是本模块刻意接受的取舍：为了保留"电荷最大处电流为零"这一高考判据，
    // q 与 i 都被乘上同一振幅包络，而不再满足 i = dq/dt。
    //
    // 取 k = 1,2,4,5,6 而不含 k = 3（t = T/4，q = 0）：
    // 差额本身是 −q/τ，在 q → 0 处也趋于零，会被中心差分的舍入噪声淹没。
    const dt = 1e-9
    for (const k of [1, 2, 4, 5, 6]) {
      const t = (k * PERIOD) / 12
      const numeric = (lcChargeAt(DAMPED, t + dt) - lcChargeAt(DAMPED, t - dt)) / (2 * dt)
      const analytic = lcCurrentAt(DAMPED, t)
      // 数值导数恰比"我们的 i"多出 −q/τ 一项
      expect(numeric - analytic).toBeCloseTo(-lcChargeAt(DAMPED, t) / TAU, 6)
      expect(Math.abs(numeric - analytic)).toBeGreaterThan(1e-4)
    }
  })

  it('总能量单调减少，且 E/E₀ = (振幅系数)²', () => {
    const { eTotal } = calculateLCConstants(LC)
    let prev = Number.POSITIVE_INFINITY
    for (let k = 0; k <= 200; k++) {
      const t = (k * 2 * PERIOD) / 200
      const sum =
        lcElectricEnergy(lcChargeAt(DAMPED, t), LC.C) + lcMagneticEnergy(lcCurrentAt(DAMPED, t), LC.L)
      const amp = lcDampingAmplitude(t, PERIOD)
      expect(sum / eTotal).toBeCloseTo(amp * amp, 9)
      if (k > 0) expect(sum).toBeLessThan(prev)
      prev = sum
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

