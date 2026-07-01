import { describe, it, expect } from 'vitest'
import {
  calculateElectricField,
  calculateElectricPotential,
  calculateCapacitor,
  calculateOhmLaw,
  calculateSeriesResistance,
  calculateParallelResistance,
  calculateClosedCircuit,
  calculateAmpereForce,
  solveAdvancedAmpere,
  calculateLorentzForce,
  calculateChargeInMagField,
  calculateFaradayEMF,
  calculateTransformer,
  calculateACRMS,
  calculateCoulombForce,
  calculateTransformerWithLoad,
  calculatePowerTransmission,
  calculateCuttingEMF,
  simulateForceMotion,
  computeHandPose,
  computeCuttingEMFHandPose,
  lerpAngleDeg,
  normalizeAngleDeg,
  calculateMagnetInduction,
  calculateCoilInduction,
  computeFaradayEmf,
  computeFaradayMagnetFlux,
  generateUniformFaradayPoints,
  generateMagnetFaradayPoints,
  calculateDoubleBoundaryExit,
  calculateCircularBoundaryExit,
} from '@/physics'

const k = 9e9

describe('electromagnetism', () => {
  it('库仑力（复用 dynamics 实现）可从 @/physics 引入', () => {
    expect(calculateCoulombForce(k, 1e-6, 1e-6, 1).F).toBeCloseTo(9e9 * 1e-12, 10)
  })

  it('库仑力：异号电荷应返回正的大小（物理修正）', () => {
    // 修复前：calculateCoulombForce(k, 1e-6, -1e-6, 1) 返回负数（错误）
    // 修复后：应始终返回力的大小（正数）
    const sameSign = calculateCoulombForce(k, 1e-6, 1e-6, 1)
    const oppositeSign = calculateCoulombForce(k, 1e-6, -1e-6, 1)
    expect(sameSign.F).toBeGreaterThan(0)
    expect(oppositeSign.F).toBeGreaterThan(0)
    expect(sameSign.F).toBeCloseTo(oppositeSign.F, 10)
  })

  it('电场强度 E = kq/r²', () => {
    expect(calculateElectricField(k, 2e-6, 3).E).toBeCloseTo((k * 2e-6) / 9, 6)
  })

  it('电势 V = kq/r', () => {
    expect(calculateElectricPotential(k, 2e-6, 2).V).toBeCloseTo((k * 2e-6) / 2, 6)
  })

  it('平行板电容 C = εS/d', () => {
    expect(calculateCapacitor(8.85e-12, 0.5, 0.01).C).toBeCloseTo((8.85e-12 * 0.5) / 0.01, 15)
  })

  it('欧姆定律 I = U/R', () => {
    expect(calculateOhmLaw(12, 4).I).toBe(3)
  })

  it('串联电阻求和', () => {
    expect(calculateSeriesResistance([2, 3, 5]).R_total).toBe(10)
  })

  it('并联电阻：两个 6Ω 并联 = 3Ω', () => {
    expect(calculateParallelResistance([6, 6]).R_total).toBeCloseTo(3, 10)
  })

  it('并联电阻：空数组或含 0 返回 0', () => {
    expect(calculateParallelResistance([]).R_total).toBe(0)
    expect(calculateParallelResistance([0, 5]).R_total).toBe(0)
  })

  it('闭合电路：EMF=12 r=1 R=5 → I=2, U=10, η≈0.833', () => {
    const res = calculateClosedCircuit(12, 1, 5)
    expect(res.I).toBeCloseTo(2, 10)
    expect(res.U_terminal).toBeCloseTo(10, 10)
    expect(res.P_output).toBeCloseTo(20, 10)
    expect(res.P_total).toBeCloseTo(24, 10)
    expect(res.eta).toBeCloseTo(20 / 24, 10)
  })

  it('安培力 F = BIL·sinθ（θ=90° 取最大）', () => {
    expect(calculateAmpereForce(0.5, 2, 1, 90).F).toBeCloseTo(1, 10)
    expect(calculateAmpereForce(0.5, 2, 1, 0).F).toBeCloseTo(0, 10)
  })

  it('进阶斜面安培力：I>0(⊗)、B竖直向上时 F 应水平向右并有上滑趋势', () => {
    const res = solveAdvancedAmpere(2, 1, 30, 0.2, 0, 4, 0.5, 0)
    expect(res.F_ampere).toBeCloseTo(8, 10)
    expect(res.F_ampere_x).toBeCloseTo(8, 10)
    expect(res.F_ampere_y).toBeCloseTo(0, 10)
    expect(res.R_parallel).toBeGreaterThan(0)
    expect(res.state).toBe('sliding-up')
    expect(res.I_min).toBeCloseTo(0.4143, 3)
    expect(res.I_max).toBeCloseTo(1.0769, 3)
  })

  it('进阶斜面安培力：B垂直斜面向外时 F 应沿斜面向上', () => {
    const res = solveAdvancedAmpere(2, 1, 30, 0.2, 1, 4, 0.5, 0)
    expect(res.F_ampere).toBeCloseTo(8, 10)
    expect(res.F_ampere_x).toBeCloseTo(8 * Math.cos(Math.PI / 6), 10)
    expect(res.F_ampere_y).toBeCloseTo(8 * Math.sin(Math.PI / 6), 10)
    expect(res.R_parallel).toBeGreaterThan(0)
    expect(res.state).toBe('sliding-up')
  })

  it('进阶斜面安培力：B水平向右时 F 应竖直向下并有下滑趋势', () => {
    const res = solveAdvancedAmpere(2, 1, 30, 0.2, 2, 4, 0.5, 0)
    expect(res.F_ampere).toBeCloseTo(-8, 10)
    expect(res.F_ampere_x).toBeCloseTo(0, 10)
    expect(res.F_ampere_y).toBeCloseTo(-8, 10)
    expect(res.R_parallel).toBeLessThan(0)
    expect(res.state).toBe('sliding-down')
  })

  it('洛伦兹力 F = qvB·sinθ', () => {
    expect(calculateLorentzForce(1.6e-19, 1e6, 0.2, 90).F).toBeCloseTo(1.6e-19 * 1e6 * 0.2, 24)
  })

  it('带电粒子圆周：r=mv/(qB), T=2πm/(qB), ω=qB/m', () => {
    const res = calculateChargeInMagField(2, 4, 3, 0.5)
    expect(res.r).toBeCloseTo((4 * 3) / (2 * 0.5), 10)
    expect(res.T).toBeCloseTo((2 * Math.PI * 4) / (2 * 0.5), 10)
    expect(res.omega).toBeCloseTo((2 * 0.5) / 4, 10)
  })

  it('带电粒子圆周：除零保护', () => {
    expect(calculateChargeInMagField(0, 4, 3, 0).r).toBe(0)
    expect(calculateChargeInMagField(2, 0, 3, 0.5).omega).toBe(0)
  })

  it('法拉第-楞次定律 EMF = -N·dΦ/dt', () => {
    expect(calculateFaradayEMF(100, 0.02).EMF).toBeCloseTo(-2, 10)
  })

  it('理想变压器：升压 n1=100 n2=200 U1=220 → U2=440, I2=I1/2', () => {
    const res = calculateTransformer(100, 200, 220, 4)
    expect(res.U2).toBeCloseTo(440, 10)
    expect(res.I2).toBeCloseTo(2, 10)
  })

  it('交流有效值 V_rms = V_peak/√2', () => {
    const res = calculateACRMS(311)
    expect(res.V_rms).toBeCloseTo(311 / Math.SQRT2, 6)
    expect(Number.isNaN(res.I_rms)).toBe(true)
  })

  // ===== [M4-1] 交变电流模块测试 =====

  it('交流有效值：传入独立 I_peak 参数', () => {
    const V_peak = 311
    const I_peak = 5
    const res = calculateACRMS(V_peak, I_peak)
    expect(res.V_rms).toBeCloseTo(311 / Math.SQRT2, 6)
    expect(res.I_rms).toBeCloseTo(5 / Math.SQRT2, 6)
  })

  it('带负载变压器：升压 n1=100 n2=200 U1=220 R=50 → U2=440, I2=8.8, I1=17.6', () => {
    const res = calculateTransformerWithLoad(100, 200, 220, 50)
    expect(res.U2).toBeCloseTo(440, 10)
    expect(res.I2).toBeCloseTo(8.8, 10)
    expect(res.I1).toBeCloseTo(17.6, 10)
    expect(res.P_input).toBeCloseTo(220 * 17.6, 10)
    expect(res.P_output).toBeCloseTo(440 * 8.8, 10)
    // 功率守恒
    expect(res.P_input).toBeCloseTo(res.P_output, 10)
  })

  it('带负载变压器：降压 n1=200 n2=100 U1=440 R=25', () => {
    const res = calculateTransformerWithLoad(200, 100, 440, 25)
    expect(res.U2).toBeCloseTo(220, 10)
    expect(res.I2).toBeCloseTo(8.8, 10)
    expect(res.I1).toBeCloseTo(4.4, 10)
  })

  it('带负载变压器：除零保护', () => {
    const res = calculateTransformerWithLoad(0, 100, 220, 50)
    expect(res.U2).toBe(0)
    expect(res.I1).toBe(0)
    const res2 = calculateTransformerWithLoad(100, 200, 220, 0)
    expect(res2.I2).toBe(Infinity)
  })

  it('远距离输电：高压输电低损耗', () => {
    // 新签名 (P1, U2, r, k)：P=100kW, U2=10kV, r=10Ω, k=0.022 (10kV→220V 降压)
    const res = calculatePowerTransmission(100000, 10000, 10, 0.022)
    expect(res.I_line).toBeCloseTo(10, 10)       // I = P1/U2 = 10A
    expect(res.deltaU).toBeCloseTo(100, 10)      // ΔU = I·r = 100V
    expect(res.P_loss).toBeCloseTo(1000, 10)     // ΔP = I²·r = 1kW
    expect(res.U3).toBeCloseTo(9900, 10)         // U3 = U2 - ΔU = 9900V
    expect(res.P3).toBeCloseTo(99000, 10)        // P3 = P1 - ΔP = 99kW
    expect(res.U4).toBeCloseTo(217.8, 6)         // U4 = U3·k ≈ 217.8V
    expect(res.P_user).toBeCloseTo(99000, 10)
    expect(res.eta).toBeCloseTo(0.99, 10)        // 效率 99%
  })

  it('远距离输电：低压输电高损耗', () => {
    // 新签名 (P1, U2, r, k)：P=100kW, U2=1kV, r=10Ω, k=0.22 (1kV→220V 降压)
    const res = calculatePowerTransmission(100000, 1000, 10, 0.22)
    expect(res.I_line).toBeCloseTo(100, 10)      // I = P1/U2 = 100A
    expect(res.deltaU).toBeCloseTo(1000, 10)     // ΔU = I·r = 1000V（恰好等于 U2，端压降为 0）
    expect(res.P_loss).toBeCloseTo(100000, 10)   // ΔP = I²·r = 100kW（全部损耗在线路）
    expect(res.U3).toBeCloseTo(0, 10)            // U3 = U2 - ΔU = 0V
    expect(res.P3).toBeCloseTo(0, 10)
    expect(res.U4).toBeCloseTo(0, 10)
    expect(res.P_user).toBeCloseTo(0, 10)
    expect(res.eta).toBeCloseTo(0, 10)           // 效率 0%（全部损耗）
  })

  it('远距离输电：除零保护', () => {
    // U2=0 → I_line short-circuit 为 0
    const res = calculatePowerTransmission(100000, 0, 10, 0.022)
    expect(res.I_line).toBe(0)
    expect(res.deltaU).toBe(0)
    expect(res.P_loss).toBe(0)
    // P1=0 → eta short-circuit 为 0
    const res2 = calculatePowerTransmission(0, 10000, 10, 0.022)
    expect(res2.eta).toBe(0)
    expect(res2.I_line).toBe(0)
  })

  // ===== [M4-1.x] 导体切割磁感线扩展 =====

  it('导体切割：EMF=BLv·sinθ（θ=90° 取最大）', () => {
    const res = calculateCuttingEMF(1, 0.5, 2, 2, 90, 0, 0)
    expect(res.EMF).toBeCloseTo(1, 10)
    expect(res.I).toBeCloseTo(0.5, 10)
    expect(res.F_ampere).toBeCloseTo(0.25, 10)
    expect(res.P_output).toBeCloseTo(0.5, 10)
    expect(res.eta).toBeCloseTo(1, 10)
  })

  it('导体切割：sinθ 因子（θ=30° → EMF 减半）', () => {
    const res = calculateCuttingEMF(1, 0.5, 2, 2, 30, 0, 0)
    const sin30 = 0.5
    expect(res.EMF).toBeCloseTo(1 * sin30, 10)
    // F_ampere = B * I * L * sinθ = 1 * (0.5/2) * 0.5 * 0.5 = 0.0625
    expect(res.F_ampere).toBeCloseTo(0.0625, 10)
  })

  it('导体切割：含内阻 r（η = R/(R+r)）', () => {
    const res = calculateCuttingEMF(1, 0.5, 2, 1, 90, 1, 0)
    expect(res.I).toBeCloseTo(0.5, 10)
    expect(res.eta).toBeCloseTo(0.5, 10)
  })

  it('导体切割：v 反向 → EMF 反向（大小相等）', () => {
    const res1 = calculateCuttingEMF(1, 0.5, 2, 2, 90, 0, 0)
    const res2 = calculateCuttingEMF(1, 0.5, -2, 2, 90, 0, 0)
    expect(res1.EMF).toBeGreaterThan(0)
    expect(res2.EMF).toBeLessThan(0)
    expect(Math.abs(res1.EMF)).toBeCloseTo(Math.abs(res2.EMF), 10)
  })

  it('导体切割：B_out 切换 → EMF 反向（大小相等）', () => {
    const res0 = calculateCuttingEMF(1, 0.5, 2, 2, 90, 0, 0)
    const res1 = calculateCuttingEMF(1, 0.5, 2, 2, 90, 0, 1)
    expect(res0.EMF).toBeGreaterThan(0)
    expect(res1.EMF).toBeLessThan(0)
    expect(Math.abs(res0.EMF)).toBeCloseTo(Math.abs(res1.EMF), 10)
  })

  it('导体切割：θ=0 → 无切割 EMF=0', () => {
    const res = calculateCuttingEMF(1, 0.5, 2, 2, 0, 0, 0)
    expect(res.EMF).toBe(0)
    expect(res.I).toBe(0)
    expect(res.F_ampere).toBe(0)
    expect(res.P_output).toBe(0)
    expect(res.eta).toBe(0)
  })

  it('导体切割：v=0 → 无运动 EMF=0', () => {
    const res = calculateCuttingEMF(1, 0.5, 0, 2, 90, 0, 0)
    expect(res.EMF).toBe(0)
    expect(res.I).toBe(0)
    expect(res.F_ampere).toBe(0)
  })

  it('导体切割：除零保护 R+r=0', () => {
    const res = calculateCuttingEMF(1, 0.5, 2, 0, 90, 0, 0)
    expect(res.I).toBe(0)
    expect(res.F_ampere).toBe(0)
    expect(res.P_output).toBe(0)
    expect(res.eta).toBe(0)
  })

  it('导体切割：默认参数（省略 theta/r/B_out）兼容旧调用', () => {
    const res = calculateCuttingEMF(1, 0.5, 2, 2)
    expect(res.EMF).toBeCloseTo(1, 10)
    expect(res.I).toBeCloseTo(0.5, 10)
  })

  // ===== [M4-1.x] PR 2：受力运动模式单步积分 =====

  it('受力运动：v=0 起步 → F_net = F_drive，a = F_drive/m', () => {
    const res = simulateForceMotion(1, 0.5, 0, 0, 2, 90, 0, 2, 0.1, 0.016)
    expect(res.F_ampere).toBe(0)
    expect(res.F_net).toBeCloseTo(2, 10)
    expect(res.a).toBeCloseTo(20, 10)
    expect(res.v_new).toBeCloseTo(0.32, 10)
    expect(res.x_new).toBeCloseTo(0.32 * 0.016, 10)
  })

  it('受力运动：v = v_terminal → F_net = 0（平衡）', () => {
    // v_terminal = F_drive·(R+r) / (B²L²sin²θ) = 2·2 / (1·0.25·1) = 16
    const res = simulateForceMotion(1, 0.5, 16, 0, 2, 90, 0, 2, 0.1, 0.016)
    // v=16>0，F_ampere 与 v 反向，F_ampere=-2
    expect(res.F_ampere).toBeCloseTo(-2, 10)
    expect(res.F_net).toBeCloseTo(0, 10)
    expect(res.a).toBeCloseTo(0, 10)
    expect(res.v_terminal).toBeCloseTo(16, 10)
  })

  it('受力运动：v > v_terminal → F_net < 0（减速）', () => {
    const res = simulateForceMotion(1, 0.5, 20, 0, 2, 90, 0, 2, 0.1, 0.016)
    // F_ampere_mag = 1·0.25·20·1/2 = 2.5 > F_drive=2
    expect(res.F_ampere).toBeCloseTo(-2.5, 10)
    expect(res.F_net).toBeCloseTo(-0.5, 10)
    expect(res.a).toBeLessThan(0)
  })

  it('受力运动：v 负向 → F_ampere 仍与 v 反向（朝 +x 推动 v 向 0）', () => {
    const res = simulateForceMotion(1, 0.5, -5, 0, 2, 90, 0, 2, 0.1, 0.016)
    // F_ampere_mag = 1·0.25·5·1/2 = 0.625
    // v<0, F_ampere_signed = +0.625（与 v 反向，朝 +x）
    expect(res.F_ampere).toBeCloseTo(0.625, 10)
    expect(res.F_net).toBeCloseTo(2.625, 10)
  })

  it('受力运动：F_drive=0 → 任意 v 衰减到 0（电磁阻尼）', () => {
    let v = 5
    for (let i = 0; i < 5000; i++) {
      const res = simulateForceMotion(1, 0.5, v, 0, 2, 90, 0, 0, 0.1, 0.016)
      v = res.v_new
    }
    expect(Math.abs(v)).toBeLessThan(0.01)
  })

  it('受力运动：sinθ=0 → F_ampere=0，F_net=F_drive，匀加速', () => {
    const res = simulateForceMotion(1, 0.5, 0, 0, 2, 0, 0, 2, 0.1, 0.016)
    expect(res.F_ampere).toBe(0)
    expect(res.F_net).toBe(2)
    expect(res.a).toBe(20)
    expect(res.v_terminal).toBe(0)  // 分母含 sin²θ
  })

  it('受力运动：除零保护 m=0', () => {
    const res = simulateForceMotion(1, 0.5, 0, 0, 2, 90, 0, 2, 0, 0.016)
    expect(res.a).toBe(0)
    expect(res.v_new).toBe(0)
  })

  // ===== [M4-1.x] 手指定则几何助手测试 =====

  it('normalizeAngleDeg 把 370° 归一为 10°', () => {
    expect(normalizeAngleDeg(370)).toBeCloseTo(10, 10)
    expect(normalizeAngleDeg(-190)).toBeCloseTo(170, 10)
    expect(normalizeAngleDeg(0)).toBe(0)
  })

  it('lerpAngleDeg 沿最短路径逼近 350° → 10° 仅 20°', () => {
    const next = lerpAngleDeg(350, 10, 1.0)
    // 直接相减是 -340°，但最短路径是 +20° → 10
    expect(next).toBeCloseTo(370, 10)
  })

  it('lerpAngleDeg speed=0 不动，speed=1 一步到位', () => {
    expect(lerpAngleDeg(0, 90, 0)).toBe(0)
    expect(lerpAngleDeg(0, 90, 1)).toBeCloseTo(90, 10)
  })

  it('computeHandPose：v 右 (1,0) + I 下 (0,1) → 右手定则 (B_out=true, rotation=+180°)', () => {
    // v = (1,0) → atan2 = 0°；I = (0,1) 顺时针 90° → cross = +1 → 右手
    // 中指指向 I=(0,1) 即 90°，rotation = 90° + 90° = +180°
    const r = computeHandPose({ x: 1, y: 0 }, { x: 0, y: 1 })
    expect(r.chirality).toBe('right')
    expect(r.B_out).toBe(true)
    expect(r.rotationDeg).toBeCloseTo(180, 10)
  })

  it('computeHandPose：v 右 + I 上 → 左手定则 (chirality=left)', () => {
    // v = (1,0), I = (0,-1) 逆时针 90° → cross = -1 → 左手
    const r = computeHandPose({ x: 1, y: 0 }, { x: 0, y: -1 })
    expect(r.chirality).toBe('left')
    expect(r.B_out).toBe(false)
  })

  it('computeHandPose：v 反向 → 整只手相对前者旋转 180°', () => {
    const r1 = computeHandPose({ x: 1, y: 0 }, { x: 0, y: 1 })
    const r2 = computeHandPose({ x: -1, y: 0 }, { x: 0, y: -1 })
    // 两个 rotationDeg 之差应接近 180°（拇指从 +x 翻到 -x）
    const diff = Math.abs(r2.rotationDeg - r1.rotationDeg)
    const wrapped = Math.min(diff, 360 - diff)
    expect(wrapped).toBeCloseTo(180, 10)
  })

  it('computeHandPose：v 向上 (0,-1) + I 向右 (1,0) → rotation = +90°', () => {
    // atan2(0, 1) = 0°；rotation = 0° + 90° = +90°
    const r = computeHandPose({ x: 0, y: -1 }, { x: 1, y: 0 })
    expect(r.rotationDeg).toBeCloseTo(90, 10)
    // 拇指在 v=(0,-1) 方向（向上），中指在 I=(1,0) 方向（向右）：cross = 0*0 - (-1)*1 = +1 → 右手
    expect(r.chirality).toBe('right')
  })

  it('computeHandPose：零向量降级为默认值（rotation=0，right，open）', () => {
    const r1 = computeHandPose({ x: 0, y: 0 }, { x: 1, y: 0 })
    const r2 = computeHandPose({ x: 1, y: 0 }, { x: 0, y: 0 })
    expect(r1.rotationDeg).toBe(0)
    expect(r1.chirality).toBe('right')
    expect(r2.rotationDeg).toBe(0)
  })

  it('computeCuttingEMFHandPose：v=+1, B_out=1 → I_canvas=(0,1) down, 右手, rotation=+180°', () => {
    // v=+1 向右, B_out=1 (出⊙), I_canvas.y = vDir * sign = 1*1 = 1 (down)
    // I=(0,1) → atan2=90°，rotation = 90° + 90° = +180°
    const r = computeCuttingEMFHandPose(1, 1)
    expect(r.chirality).toBe('right')
    expect(r.B_out).toBe(true)
    expect(r.rotationDeg).toBeCloseTo(180, 10)
  })

  it('computeCuttingEMFHandPose：v=+1, B_out=0 → I_canvas=(0,-1) up, 左手 (I 相对 v 逆时针)', () => {
    // v=+1 向右, B_out=0 (入⊗), I_canvas.y = vDir * sign = 1*(-1) = -1 (up)
    // cross = 1*(-1) - 0*0 = -1 < 0 → 左手（用左手手性以匹配 B 入纸面）
    // I=(0,-1) → atan2=-90°，rotation = -90° + 90° = 0°
    const r = computeCuttingEMFHandPose(1, 0)
    expect(r.chirality).toBe('left')
    expect(r.B_out).toBe(false)
    expect(r.rotationDeg).toBeCloseTo(0, 10)
  })

  it('computeCuttingEMFHandPose：v=-1, B_out=1 → 整只手相对 v=+1 翻转 180°', () => {
    const r1 = computeCuttingEMFHandPose(1, 1)
    const r2 = computeCuttingEMFHandPose(-1, 1)
    // 拇指从 +x 翻到 -x，整体翻转 180°
    const diff = Math.abs(r2.rotationDeg - r1.rotationDeg)
    const wrapped = Math.min(diff, 360 - diff)
    expect(wrapped).toBeCloseTo(180, 10)
    // v=-1, I_canvas.y = -1*1 = -1 (up) → cross = -1*(-1) - 0*0 = +1 → 右手（B 出纸面）
    expect(r2.chirality).toBe('right')
    expect(r2.B_out).toBe(true)
  })

  // ===== 新增电磁感应现象纯计算测试 =====
  describe('电磁感应定性计算', () => {
    it('calculateMagnetInduction: 靠近或远离线圈会改变感应电流/偏转角度的方向', () => {
      // 磁铁靠近（v > 0，x < coilX）
      const resClose = calculateMagnetInduction(200, 2, 400, 10, 1)
      expect(resClose.phi).toBeGreaterThan(0)
      expect(resClose.dPhi).toBeGreaterThan(0)
      expect(resClose.theta).toBeLessThan(0) // 阻碍变化

      // 磁铁远离（v < 0，x < coilX）
      const resAway = calculateMagnetInduction(200, -2, 400, 10, 1)
      expect(resAway.dPhi).toBeLessThan(0)
      expect(resAway.theta).toBeGreaterThan(0)
    })

    it('calculateMagnetInduction: 磁铁在中心静止时无感应电流', () => {
      const res = calculateMagnetInduction(400, 0, 400, 10, 1)
      expect(res.phi).toBe(1.0) // 最大磁通量
      expect(res.dPhi).toBe(0)
      expect(res.theta).toBe(0)
    })

    it('calculateMagnetInduction: 翻转极性会导致感应电流反向', () => {
      const resPolePositive = calculateMagnetInduction(200, 2, 400, 10, 1)
      const resPoleNegative = calculateMagnetInduction(200, 2, 400, 10, -1)
      expect(resPolePositive.theta).toBe(-resPoleNegative.theta)
    })

    it('calculateCoilInduction: 电阻变小时（电流变大），穿过副线圈磁通量增加，感应电流为正', () => {
      // 变阻器滑动变小 dR/dt < 0
      const res = calculateCoilInduction(50, -5, 10, 10)
      expect(res.phi).toBe(10 * 0.1 / 50)
      expect(res.dPhi).toBeGreaterThan(0)
      expect(res.theta).toBeLessThan(0)
    })

    it('calculateCoilInduction: 变阻器静止不动时无感应电流', () => {
      const res = calculateCoilInduction(50, 0, 10, 10)
      expect(res.dPhi).toBe(0)
      expect(res.theta).toBe(0)
    })
  })

  // ===== 法拉第定律重构纯函数测试 =====
  describe('法拉第定律重构纯函数', () => {
    it('computeFaradayEmf: E = -n * S * dB/dt 计算准确', () => {
      const E = computeFaradayEmf(50, 0.02, 0.5)
      expect(E).toBeCloseTo(-50 * 0.02 * 0.5, 10) // -0.5V
    })

    it('computeFaradayMagnetFlux: 磁铁在不同位置的磁通量计算正确', () => {
      const phi1 = computeFaradayMagnetFlux(60, 1.2)
      const phi2 = computeFaradayMagnetFlux(200, 1.2) // 磁铁更接近线圈
      expect(phi2).toBeGreaterThan(phi1)
    })

    it('generateUniformFaradayPoints: 生成正确数目的数据点，且数据线性变化', () => {
      const pts = generateUniformFaradayPoints(50, 0.02, 0.5, -0.5 * 5, 10, 100)
      expect(pts.length).toBe(101)
      expect(pts[0].t).toBe(0)
      expect(pts[100].t).toBe(10)
      
      // t = 5 时，B = B0 + k * t = -2.5 + 0.5 * 5 = 0
      // 磁通量 phi 应该等于 0
      expect(pts[50].phi).toBeCloseTo(0, 10)
      // emf 应始终为常数：-50 * 0.5 * 0.02 = -0.5
      expect(pts[0].emf).toBeCloseTo(-0.5, 10)
      expect(pts[100].emf).toBeCloseTo(-0.5, 10)
    })

    it('generateMagnetFaradayPoints: 基础模式下磁铁移动的图表生成点数目正确', () => {
      const pts = generateMagnetFaradayPoints(50, 1.2, 140, 10, 100)
      expect(pts.length).toBe(101)
      expect(pts[0].t).toBe(0)
      expect(pts[100].t).toBe(10)
    })
  })

  // ===== 高考有界磁场计算测试 =====
  describe('高考有界磁场计算', () => {
    it('calculateDoubleBoundaryExit: 折回单边界（未穿透）时，出射点应为 2*xc，出射 y 应为 0', () => {
      // q=1, m=1, v=10, B=1 => R=10
      // 射入角 theta=90（垂直），磁场宽度 d=15 (> R*(1-cos90) = 10)
      // 顺时针旋转，cxAngle = 90 - 90 = 0 => xc = 10, yc = 0
      // 粒子不能穿透，折回，出射点 x = 2*xc = 20, y = 0
      const res = calculateDoubleBoundaryExit(1, 1, 10, 1, 90, 15)
      expect(res.isPenetrated).toBe(false)
      expect(res.x).toBeCloseTo(20, 5)
      expect(res.y).toBe(0)
      expect(res.vx).toBeCloseTo(0, 5)
      expect(res.vy).toBeCloseTo(-10, 5)
    })

    it('calculateDoubleBoundaryExit: 穿透上边界时，出射 y 应等于 d，isPenetrated 为 true', () => {
      // q=1, m=1, v=10, B=1 => R=10
      // 射入角 theta=90（垂直），磁场宽度 d=5 (< 10)
      // 应该能穿透，出射 y = 5
      const res = calculateDoubleBoundaryExit(1, 1, 10, 1, 90, 5)
      expect(res.isPenetrated).toBe(true)
      expect(res.y).toBe(5)
      // 几何解：xc=10, yc=0, R=10 => (x-10)^2 + (5-0)^2 = 100 => (x-10)^2 = 75 => x = 10 + sqrt(75) = 10 + 8.660 = 18.660
      expect(res.x).toBeCloseTo(10 + Math.sqrt(75), 5)
    })

    it('calculateCircularBoundaryExit: 圆形磁场对称偏转计算，出射角及位置正确', () => {
      // q=1, m=1, v=10, B=1 => R=10
      // 磁场半径 Rb=10
      // x = sign * 2 * R * Rb^2 / (R^2 + Rb^2) = -2000 / 200 = -10 (顺时针 sign=-1)
      // y = 2 * R^2 * Rb / (R^2 + Rb^2) = 2000 / 200 = 10
      const res = calculateCircularBoundaryExit(1, 1, 10, 1, 10)
      expect(res.x).toBeCloseTo(-10, 5)
      expect(res.y).toBeCloseTo(10, 5)
      // tan(deltaPhi/2) = Rb/R = 1 => deltaPhi/2 = pi/4 => deltaPhi = pi/2 (90度)
      expect(res.deltaPhi).toBeCloseTo(Math.PI / 2, 5)
    })
  })
})

