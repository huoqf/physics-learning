import {
  computeVelocitySelectorBalance,
  computeCyclotronResonanceFrequency,
  computeCyclotronMaxEnergy,
  computeCyclotronTurns,
  computeSpectrometerRadius,
  computeElectricDeflection,
} from '../../../physics/fieldsCascade'
import { PHYSICS_COLORS } from '@/theme/physics'
import { PARTICLES, DEFLECT, SCALE } from '@/features/electromagnetism/magnetism/combined-fields/model/combinedFieldsModel'
import type { PhysicsPanelData, PhysicsQuantity } from '../types'

export function handleCombinedFields(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-combined-fields') return null

  const mode = params.mode ?? 0
  const E = params.electricE ?? 300
  const B1 = params.magneticB1 ?? 0.2
  const B2 = params.magneticB2 ?? 1.5
  const acFreqkHz = params.acFrequency ?? 24
  const U = (params.acVoltage ?? 5) * 1000
  const resonanceLock = !!(params.resonanceLock ?? 0)
  const particleType = params.particleType ?? 0
  const vParticle = params.vParticle ?? 1500

  const p = PARTICLES[particleType] ?? PARTICLES[0]

  const fMag = computeCyclotronResonanceFrequency(B2, p.q, p.m)
  const fAC = resonanceLock ? fMag : acFreqkHz * 1000
  const maxEk = computeCyclotronMaxEnergy(B2, p.q, 0.5, p.m)
  const turns = computeCyclotronTurns(maxEk, p.q, U)

  if (mode === 0) {
    // ── 模式 0: 质谱仪级联 ──
    const bal = computeVelocitySelectorBalance(E, B1, vParticle, p.q)
    const rPhys = computeSpectrometerRadius(vParticle, B2, p.q, p.m)
    return {
      quantities: [
        ...base,
        { label: '选择器电场 E', value: E.toFixed(0), unit: 'N/C', color: PHYSICS_COLORS.electricField },
        { label: '选择器磁场 B₁', value: B1.toFixed(2), unit: 'T', color: PHYSICS_COLORS.magneticField },
        { label: '平衡通过速度 v₀', value: bal.passVelocity.toFixed(0), unit: 'm/s', color: PHYSICS_COLORS.velocity, highlight: bal.balanced ? 'positive' : undefined },
        { label: '电场力 Fe', value: bal.electricForce.toExponential(2), unit: 'N', color: PHYSICS_COLORS.electricField },
        { label: '洛伦兹力 f_L', value: bal.magneticForce.toExponential(2), unit: 'N', color: PHYSICS_COLORS.magneticField },
        { label: '偏转磁场 B₂', value: B2.toFixed(2), unit: 'T', color: PHYSICS_COLORS.magneticField },
        { label: '磁偏转半径 R', value: (rPhys * 100).toFixed(2), unit: 'cm', color: PHYSICS_COLORS.velocity, highlight: 'positive' },
      ],
      formulas: [
        { name: '速度选择器平衡', latex: 'v = \\frac{E}{B_1}', level: 'core', condition: 'qE = qvB₁，直线通过' },
        { name: '偏转圆周半径', latex: 'R = \\frac{mv}{qB_2}', level: 'core', condition: '洛伦兹力提供向心力' },
      ],
      gaokaoPoints: [
        { text: '【只选速度】速度选择器只选择粒子速度 v = E/B，与粒子的电荷量、正负电性以及质量均无关。', importance: 'gaokao' },
        { text: '【同位素分选】荷质比 (q/m) 不同的粒子在偏转磁场中的回旋半径 R 不同，从而在底片上分离。', importance: 'gaokao' },
      ],
      warnings: [
        { text: '易错点：若粒子从下端小孔反向射入，电场力与洛伦兹力同向，绝不可能直线通过。', level: 'danger' },
      ],
    }
  } else if (mode === 1) {
    // ── 模式 1: 回旋加速器 ──
    const resonance = Math.abs(fAC - fMag) < 1e-3 * Math.max(1, fMag)
    return {
      quantities: [
        ...base,
        { label: '回旋磁场 B₂', value: B2.toFixed(2), unit: 'T', color: PHYSICS_COLORS.magneticField },
        { label: '回旋共振频率 f', value: (fMag / 1000).toFixed(1), unit: 'kHz', color: PHYSICS_COLORS.velocity, highlight: resonance ? 'positive' : 'negative' },
        { label: '交流频率 f_AC', value: (fAC / 1000).toFixed(1), unit: 'kHz', color: PHYSICS_COLORS.electricField },
        { label: '最大动能 Ek,max', value: (maxEk / 1.602e-13).toFixed(2), unit: 'MeV', color: PHYSICS_COLORS.kineticEnergy, highlight: 'extreme' },
        { label: '最大加速次数 n', value: turns.toFixed(0), unit: '次', color: PHYSICS_COLORS.appliedForce },
        { label: '共振状态', value: resonance ? '共振 ✓' : '失谐', unit: '', highlight: resonance ? 'positive' : 'negative' },
      ],
      formulas: [
        { name: '共振频率条件', latex: 'f = \\frac{qB_2}{2\\pi m}', level: 'core', note: '高频交流电周期必须等于回旋周期' },
        { name: '最大动能（极高频）', latex: 'E_{k,\\max} = \\frac{q^2 B_2^2 R_{\\max}^2}{2m}', level: 'important', condition: '与加速电压 U 无关，由 D 盒半径锁死' },
      ],
      gaokaoPoints: [
        { text: '【电压无关论】最大动能与加速电压 U 无关，U 仅决定加速次数 n。这是高考选择题极高频陷阱。', importance: 'gaokao' },
        { text: '【外轨密集性】根据 R ∝ √n 可知，随着圈数 n 的增大，相邻轨道的间距 ΔR 越来越密。', importance: 'gaokao' },
      ],
      warnings: [
        { text: '注意：在狭缝中电场做正功加速粒子，而在 D 盒中磁场只改变速度方向、不做功。', level: 'danger' },
      ],
    }
  } else {
    // ── 模式 2: 电偏转+磁偏转级联 ──
    const L = (DEFLECT.xEnd - DEFLECT.xStart) / SCALE
    const d = (DEFLECT.plateHalf * 2) / SCALE
    const out = computeElectricDeflection(vParticle, E, L, d, p.q, p.m)
    const rPhys = (p.m * out.vOut) / (p.q * B2)

    return {
      quantities: [
        ...base,
        { label: '偏转电场 E', value: E.toFixed(0), unit: 'N/C', color: PHYSICS_COLORS.electricField },
        { label: '初速度 v₀', value: vParticle.toFixed(0), unit: 'm/s', color: PHYSICS_COLORS.velocity },
        { label: '竖直偏转位移 y', value: (out.yOffset * 100).toFixed(2), unit: 'cm', color: PHYSICS_COLORS.acceleration, highlight: out.hitsPlate ? 'negative' : undefined },
        { label: '出电场速度 v', value: (out.vOut / 1000).toFixed(3), unit: 'km/s', color: PHYSICS_COLORS.velocity },
        { label: '速度偏角 θ', value: (out.theta * 180 / Math.PI).toFixed(1), unit: '°', color: PHYSICS_COLORS.velocity },
        { label: '偏转磁场 B₂', value: B2.toFixed(2), unit: 'T', color: PHYSICS_COLORS.magneticField },
        { label: '磁偏转半径 R', value: (rPhys * 100).toFixed(2), unit: 'cm', color: PHYSICS_COLORS.velocity, highlight: 'positive' },
      ],
      formulas: [
        { name: '类平抛偏角正切', latex: '\\tan\\theta = \\frac{qEL}{mv_0^2}', level: 'core' },
        { name: '电磁速度衔接', latex: 'v = \\frac{v_0}{\\cos\\theta}', level: 'important', note: '电场加速改变速度大小，磁场偏转仅改变方向' },
      ],
      gaokaoPoints: [
        { text: '【类平抛与圆周衔接】粒子从电场边缘射出时的末速度大小和方向，是磁场匀速圆周运动的初速度大小和方向。', importance: 'gaokao' },
        { text: '【圆心确定法】圆心必定在入射点速度的垂直线上，几何关系中偏角 θ 往往对应圆心角。', importance: 'gaokao' },
      ],
      warnings: [
        { text: '易错点：电场中偏角正切 tan θ = vy/vx，但位移偏角正切 tan φ = y/x = 0.5 tan θ。二者不可混淆！', level: 'danger' },
      ],
    }
  }
}
