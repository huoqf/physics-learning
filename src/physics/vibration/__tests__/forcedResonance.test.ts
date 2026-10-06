import { describe, it, expect } from 'vitest'
import {
  calculateSteadyStateResonance,
  calculateForcedVibrationState,
  calculateCrankEccentricity,
  calculateDamperGeometry,
  calculateStageAmplitudeCapacity,
  generateResonanceCurvePoints,
  CRANK_ECCENTRICITY_MIN,
  CRANK_ECCENTRICITY_MAX,
  FORCED_RESONANCE_EQUILIBRIUM_Y,
} from '../forcedResonance'

describe('forcedResonance 物理纯函数计算', () => {
  it('计算固有频率与共振峰值', () => {
    // m = 1kg, k = 39.478 N/m (~4*pi^2), omega0 ≈ 2*pi ≈ 6.283 rad/s, f0 ≈ 1.0 Hz
    const m = 1.0
    const k = 4 * Math.PI * Math.PI // ~39.4784
    const gamma = 0.4
    const F0 = 2.0
    const f = 1.0

    const res = calculateSteadyStateResonance({ m, k, gamma, F0, f })

    expect(res.f0).toBeCloseTo(1.0, 2)
    expect(res.omega0).toBeCloseTo(2 * Math.PI, 2)
    expect(res.beta).toBeCloseTo(0.2, 3)

    // 弱阻尼下共振频率非常接近固有频率 f0
    expect(res.fRes).toBeCloseTo(1.0, 1)

    // 在 f = f0 处振幅显著大于偏离频率处
    const resOff = calculateSteadyStateResonance({ m, k, gamma, F0, f: 2.0 })
    expect(res.amplitude).toBeGreaterThan(resOff.amplitude * 3)
  })

  it('阻尼越小，共振峰越尖锐且幅值越大', () => {
    const base = { m: 1.0, k: 40, F0: 2.0, f: 1.006 }
    const smallDamping = calculateSteadyStateResonance({ ...base, gamma: 0.2 })
    const largeDamping = calculateSteadyStateResonance({ ...base, gamma: 1.0 })

    expect(smallDamping.amplitude).toBeGreaterThan(largeDamping.amplitude * 3)
  })

  it('滞后相位满足受迫振动随驱动频率的变化规律 (低频同相, 共振90度, 高频180度)', () => {
    const base = { m: 1.0, k: 39.478, gamma: 0.4, F0: 2.0 } // f0 ≈ 1.0 Hz
    // 低频驱动 f = 0.1 Hz << f0 -> 相位差接近 0°
    const lowFreq = calculateSteadyStateResonance({ ...base, f: 0.1 })
    expect(lowFreq.phaseLagDeg).toBeLessThan(15)

    // 共振频率 f = f0 = 1.0 Hz -> 相位差等于 90°
    const resFreq = calculateSteadyStateResonance({ ...base, f: 1.0 })
    expect(resFreq.phaseLagDeg).toBeCloseTo(90, 0)

    // 高频驱动 f = 2.4 Hz >> f0 -> 相位差接近 180°
    const highFreq = calculateSteadyStateResonance({ ...base, f: 2.4 })
    expect(highFreq.phaseLagDeg).toBeGreaterThan(160)
  })

  it('受迫振动瞬时状态满足动力学合外力输出', () => {
    const config = { m: 1.0, k: 25, gamma: 0.5, F0: 5, f: 1.2 }
    const state = calculateForcedVibrationState(config, 1.5, 1)

    expect(Number.isFinite(state.x)).toBe(true)
    expect(Number.isFinite(state.v)).toBe(true)
    expect(Number.isFinite(state.a)).toBe(true)
    expect(Number.isFinite(state.elasticForce)).toBe(true)
    expect(Number.isFinite(state.dampingForce)).toBe(true)
    expect(Number.isFinite(state.totalForce)).toBe(true)
    expect(state.elasticForce).toBeCloseTo(-25 * state.x, 4)
    expect(state.totalForce).toBeCloseTo(state.fDriver + state.elasticForce + state.dampingForce, 4)
  })

  it('生成共振曲线包含预期数量采样点', () => {
    const points = generateResonanceCurvePoints(1.0, 40, 0.4, 2.0, 3.0, 50)
    expect(points).toHaveLength(50)
    expect(points[0].x).toBeGreaterThan(0)
    expect(points[49].x).toBeCloseTo(3.0, 2)
  })

  // ── 几何契约：曲柄偏心距（单一真源，禁止消费点自行夹取）──────────────────
  describe('曲柄偏心距契约 e = F0/k', () => {
    it('未触及限幅边界时严格等于 F0/k', () => {
      // F0 = 2 N, k = 39.5 N/m -> e = 50.6 mm，落在 [40, 200] mm 内
      const { e, clampType, ideal } = calculateCrankEccentricity(2.0, 39.5)
      expect(clampType).toBe('none')
      expect(e).toBeCloseTo(2.0 / 39.5, 12)
      expect(e).toBeCloseTo(ideal, 12)
    })

    it('超出上限时限幅到 CRANK_ECCENTRICITY_MAX 并置 clampType = max', () => {
      // F0 = 5 N, k = 10 N/m -> 真值 500 mm，远超上限 200 mm
      const { e, clampType, ideal } = calculateCrankEccentricity(5.0, 10)
      expect(ideal).toBeCloseTo(0.5, 12)
      expect(e).toBe(CRANK_ECCENTRICITY_MAX)
      // 上限侧：画面值**小于**真值
      expect(clampType).toBe('max')
      expect(e).toBeLessThan(ideal)
    })

    it('低于下限时限幅到 CRANK_ECCENTRICITY_MIN 并置 clampType = min', () => {
      // F0 = 0.5 N, k = 80 N/m -> 真值 6.25 mm，低于可辨下限 40 mm
      const { e, clampType, ideal } = calculateCrankEccentricity(0.5, 80)
      expect(ideal).toBeCloseTo(0.00625, 12)
      expect(e).toBe(CRANK_ECCENTRICITY_MIN)
      // 下限侧：画面值**大于**真值 —— 与上限侧方向相反，UI 文案必须据此分支
      expect(clampType).toBe('min')
      expect(e).toBeGreaterThan(ideal)
    })

    it('驱动位移振幅与偏心距同源（driverX 不得为硬编码常量）', () => {
      const config = { m: 1.0, k: 39.5, gamma: 0.5, F0: 2.0, f: 1.0 }
      const { e } = calculateCrankEccentricity(config.F0, config.k)
      // 在 sin(ωt) = 1 的时刻驱动位移应恰为 e
      const t = 1 / (4 * config.f) // ωt = π/2
      const state = calculateForcedVibrationState(config, t, 1)
      expect(state.driverX).toBeCloseTo(e, 6)
      // 且不同参数下必须随之改变（若仍是硬编码 0.04 则此断言失败）
      const other = calculateForcedVibrationState({ ...config, k: 20 }, t, 1)
      expect(other.driverX).not.toBeCloseTo(0.04, 6)
    })
  })

  // ── 几何契约：阻尼槽反推（保证叶片全程浸没）──────────────────────────────
  describe('阻尼槽几何按真实振幅反推', () => {
    it('叶片在±振幅范围内始终浸没于槽内', () => {
      // 遍历典型共振工况，验证槽体上下沿严格包住叶片摆动区间
      const cases = [
        { amp: 0.1 }, { amp: 0.4 }, { amp: 0.637 }, { amp: 1.2 }, { amp: 2.0 },
      ]
      for (const { amp } of cases) {
        const g = calculateDamperGeometry(amp)
        const bladeHighest = FORCED_RESONANCE_EQUILIBRIUM_Y + amp - g.bladeDrop
        const bladeLowest = FORCED_RESONANCE_EQUILIBRIUM_Y - amp - g.bladeDrop
        expect(bladeHighest).toBeLessThanOrEqual(g.tankTop + 1e-9)
        expect(bladeLowest).toBeGreaterThanOrEqual(g.tankBottom - 1e-9)
      }
    })

    it('槽体尺寸随振幅单调增大（不写死常量）', () => {
      const small = calculateDamperGeometry(0.2)
      const large = calculateDamperGeometry(1.5)
      expect(large.tankTop).toBeGreaterThan(small.tankTop)
      expect(large.tankBottom).toBeLessThan(small.tankBottom)
      expect(large.tankHeight).toBeGreaterThan(small.tankHeight)
    })

    it('默认工况（γ=0.85，共振振幅 0.375 m）槽体严格包住叶片', () => {
      const steady = calculateSteadyStateResonance({
        m: 1.0, k: 39.5, gamma: 0.85, F0: 2.0, f: 1.0,
      })
      const g = calculateDamperGeometry(steady.maxAmplitude)
      const bladeHighest = FORCED_RESONANCE_EQUILIBRIUM_Y + steady.maxAmplitude - g.bladeDrop
      const bladeLowest = FORCED_RESONANCE_EQUILIBRIUM_Y - steady.maxAmplitude - g.bladeDrop
      expect(bladeHighest).toBeLessThanOrEqual(g.tankTop + 1e-9)
      expect(bladeLowest).toBeGreaterThanOrEqual(g.tankBottom - 1e-9)
    })

    it('可行域内任意振幅均保证叶片浸没（遍历控制台典型量级）', () => {
      // 覆盖从小振幅到接近舞台容量的整个可行区间（容量 2.90 m）
      for (const amp of [0.05, 0.2, 0.5, 0.637, 1.0, 1.5, 2.0, 2.5, 2.9]) {
        const g = calculateDamperGeometry(amp)
        // 上述振幅全部落在舞台容量内，必须判为可行。
        // 此前的 `if (!g.fitsStage) continue` 恰好跳过浮点误判区间（A≈1.2~2.4 m），
        // 使「谓词非单调、容量退化为 1.20 m」的缺陷不被任何用例发现。
        expect(g.fitsStage).toBe(true)
        const bladeHighest = FORCED_RESONANCE_EQUILIBRIUM_Y + amp - g.bladeDrop
        const bladeLowest = FORCED_RESONANCE_EQUILIBRIUM_Y - amp - g.bladeDrop
        expect(bladeHighest).toBeLessThanOrEqual(g.tankTop + 1e-9)
        expect(bladeLowest).toBeGreaterThanOrEqual(g.tankBottom - 1e-9)
        // 叶片下垂距离不可为负（否则叶片跑到振子上方，物理荒谬）
        expect(g.bladeDrop).toBeGreaterThanOrEqual(0)
      }
    })
  })

// ── P3 回归：默认阻尼下共振峰应可读（非冲激）──────────────────────────────
  it('默认阻尼下共振峰为渐变而非冲激', () => {
    const base = { m: 1.0, k: 39.5, F0: 2.0 }
    const atRes = calculateSteadyStateResonance({ ...base, gamma: 0.85, f: 1.0 })
    // 近旁频率的振幅应仍显著高于远端，呈现连续渐变
    const near = calculateSteadyStateResonance({ ...base, gamma: 0.85, f: 1.4 })
    const far = calculateSteadyStateResonance({ ...base, gamma: 0.85, f: 2.4 })
    expect(near.amplitude).toBeGreaterThan(far.amplitude)

    // 峰值锐度须明显优于原默认 γ=0.5（峰值/1.4f0 由 12.1 降到 7.2 量级），
    // 否则 A-f 曲线视觉上退化为「f 恰等于 f₀ 才共振」的开关效应。
    const oldDefault = calculateSteadyStateResonance({ ...base, gamma: 0.5, f: 1.0 })
    const oldNear = calculateSteadyStateResonance({ ...base, gamma: 0.5, f: 1.4 })
    const newSharpness = atRes.amplitude / near.amplitude
    const oldSharpness = oldDefault.amplitude / oldNear.amplitude
    expect(newSharpness).toBeLessThan(oldSharpness * 0.7)

    // 仍须保持共振的可见性：峰值至少是远端振幅的10 倍以上
    expect(atRes.amplitude / far.amplitude).toBeGreaterThan(10)
  })

  // ── 舞台容量契约：超容量必须显式标记而非静默出错────────────────────────────
  it('振幅超出舞台容量时 fitsStage 为false（供 UI 显式提示）', () => {
    // 默认工况完全可行
    expect(calculateDamperGeometry(0.375).fitsStage).toBe(true)
    // 极端工况（振幅远超 6.5m 舞台容量）必须被标记
    expect(calculateDamperGeometry(14.7).fitsStage).toBe(false)
  })

  // ── R1 回归：告警阈值与几何失效点必须严格重合（杜绝静默窗口）──────────────
  describe('告警阈值与几何失效点一致性（防双路径漂移）', () => {
    it('容量阈值由 fitsStage 数值求根得出，二者恒等', () => {
      const capacity = calculateStageAmplitudeCapacity()

      // 失效边界二分：找出 fitsStage 由 true→false 的临界振幅
      let lo = 0.1
      let hi = 6.0
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2
        if (calculateDamperGeometry(mid).fitsStage) lo = mid
        else hi = mid
      }

      // 容量阈值必须与失效点重合（此前错位 0.10~0.80 m，产生静默窗口）
      expect(capacity).toBeCloseTo(lo, 6)

      // 容量真值由几何边界决定：min(H/2 − margin, eqY − 2·margin) = 2.90 m。
      // 此前判据裸比较受浮点误差影响，谓词非单调，二分求根退化为 1.20 m。
      expect(capacity).toBeCloseTo(2.9, 2)

      // 边界两侧行为正确
      expect(calculateDamperGeometry(capacity - 1e-3).fitsStage).toBe(true)
      expect(calculateDamperGeometry(capacity + 1e-3).fitsStage).toBe(false)
    })

    it('fitsStage 随振幅单调（浮点误差不得造成塌陷）', () => {
      const capacity = calculateStageAmplitudeCapacity()
      let seenInfeasible = false
      for (let amp = 0.05; amp <= 3.4; amp += 0.001) {
        const fits = calculateDamperGeometry(amp).fitsStage
        if (!fits) seenInfeasible = true
        // 一旦判为不可行，更大振幅不得再回到可行（单调性）
        else expect(seenInfeasible).toBe(false)
        // 容量以内的振幅必须判为可行
        if (amp <= capacity - 1e-3) expect(fits).toBe(true)
      }
    })

    it('扫描确认零静默窗口：几何失效处必然同时触发告警', () => {
      const capacity = calculateStageAmplitudeCapacity()
      let silent = 0
      for (let amp = 0.1; amp < 8; amp += 0.0005) {
        const geoBroken = !calculateDamperGeometry(amp).fitsStage
        const noWarning = amp <= capacity
        if (geoBroken && noWarning) silent++
      }
      expect(silent).toBe(0)
    })

    it('可行域内几何严格自洽：叶片必在槽内（不露头、不触底）', () => {
      // 这是本次修复的核心保证：fitsStage 为 true 时，物理几何必然自洽
      let violations = 0
      for (let amp = 0.05; amp < 8; amp += 0.0005) {
        const g = calculateDamperGeometry(amp)
        if (!g.fitsStage) continue
        const bladeLowest = FORCED_RESONANCE_EQUILIBRIUM_Y - amp - g.bladeDrop
        const bladeHighest = FORCED_RESONANCE_EQUILIBRIUM_Y + amp - g.bladeDrop
        if (bladeHighest > g.tankTop + 1e-9) violations++
        if (bladeLowest < g.tankBottom - 1e-9) violations++
      }
      expect(violations).toBe(0)
    })
  })
})
