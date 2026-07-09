/**
 * 机械振动与波（vibration）物理量看板数据构建。
 */
import { PHYSICS_COLORS } from '@/theme/physics'
import type { PhysicsPanelData } from './types'
import {
  computeAngularFrequency,
  computePendulumState,
  computeRealPendulumPeriod,
  generateRealPendulumTrajectory,
  getPendulumStateFromTrajectory
} from '@/physics/oscillation'
import {
  computeWaveDisplacement,
  computeWavelength,
  computeWavePeriod,
  computeSingleSlitIntensity,
  DEFAULT_WAVE_CHAIN_LENGTH,
  DEFAULT_TRACKED_PARTICLE_INDEX,
  type MechanicalWaveMode,
} from '@/physics/wave'

// 缓存轨迹，避免重复计算
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const trajectoryCache = new Map<string, any>()
function getCachedTrajectory(L: number, g: number, theta0: number) {
  const key = `${L}_${g}_${theta0}`
  if (!trajectoryCache.has(key)) {
    if (trajectoryCache.size > 20) {
      trajectoryCache.clear()
    }
    trajectoryCache.set(key, generateRealPendulumTrajectory(L, g, theta0))
  }
  return trajectoryCache.get(key)
}


export function buildVibrationQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  if (animId === 'anim-simple-pendulum') {
    const L = params.L ?? 1.0
    const g = params.g ?? 9.8
    const theta0Deg = params.theta0 ?? 8
    const phiDeg = params.phiDeg ?? 0
    const phi = (phiDeg * Math.PI) / 180
    const mass = 1.0 // 摆球质量固定为 1.0 kg 用于受力展示
    const mode = params.mode ?? 0 // 0: 简谐运动, 1: 大角对比, 2: 能量守恒

    // 1. 基础简谐运动周期及状态计算
    const T0 = 2 * Math.PI * Math.sqrt(L / g)
    const omega0 = computeAngularFrequency(T0)
    const phase0 = omega0 * time + phi
    const stateSHM = computePendulumState(mass, L, g, theta0Deg, phase0)

    // 2. 真实大角周期与状态计算 (大角/能量模式下使用)
    const T_real = computeRealPendulumPeriod(L, g, theta0Deg)
    const omegaReal = computeAngularFrequency(T_real)
    const traj = getCachedTrajectory(L, g, theta0Deg)
    const stateRealRaw = getPendulumStateFromTrajectory(traj, T_real, time, phiDeg, omegaReal)
    
    // 大摆角下的精确回复力和受力分析
    const angleReal = stateRealRaw.angle
    const velReal = L * stateRealRaw.angularVelocity

    if (mode === 1) {
      // ─── 模式 1: 大摆角对比 ───
      const deltaT = T_real - T0
      const errorPercent = (deltaT / T0) * 100
      return {
        quantities: [
          { label: '真实摆角 θ_real', value: `${(angleReal * 180 / Math.PI).toFixed(1)}°`, unit: '' },
          { label: '简谐摆角 θ_SHM', value: `${(stateSHM.angle * 180 / Math.PI).toFixed(1)}°`, unit: '', color: PHYSICS_COLORS.displacement },
          { label: '简谐周期 T₀', value: T0.toFixed(3), unit: 's' },
          { label: '真实周期 T_real', value: T_real.toFixed(3), unit: 's', color: '#f59e0b' },
          { label: '周期变长偏差', value: `+${errorPercent.toFixed(2)}%`, unit: '', color: '#ef4444' },
          { label: '摆角差 |Δθ|', value: `${Math.abs((angleReal - stateSHM.angle) * 180 / Math.PI).toFixed(1)}°`, unit: '' },
        ],
        formulas: [
          {
            name: '简谐近似周期公式',
            latex: 'T_0 = 2\\pi \\sqrt{\\dfrac{L}{g}}',
            level: 'core',
            note: '小角近似下的等时周期公式（与摆幅无关）',
          },
          {
            name: '大角周期修正公式',
            latex: 'T_{real} \\approx T_0 \\left( 1 + \\dfrac{1}{4}\\sin^2\\dfrac{\\theta_0}{2} \\right)',
            level: 'important',
            note: '随最大摆角 θ₀ 增大，周期不再恒定，表现为非等时性。',
          },
          {
            name: '回复力非线性偏差',
            latex: 'F_回 = -mg \\sin\\theta \\approx -mg\\theta \\left( 1 - \\dfrac{\\theta^2}{6} \\right)',
            level: 'derived',
            note: '大角度下正弦力不再与角度成线性正比，从而偏离简谐运动。',
          },
        ],
        gaokaoPoints: [
          { text: '【高考辨析】单摆只有在最大偏角很小（一般 θ₀ ≤ 10°）时，回复力 F_回 = -mg sinθ ≈ -mgθ 才能近似满足简谐运动条件 F = -kx。', importance: 'core' },
          { text: '【大角偏离】大偏角（如 60°）单摆周期变长，其主要原因是随着摆角增大，切向回复力 -mg sinθ 的增长速度慢于简谐所需的线性增长速度。', importance: 'hard' },
          { text: '【等时性破坏】在精密计时工具中，必须对摆幅大小进行限制或采用摆轮补偿，以克服因振幅改变导致的周期漂移（非等时性）。', importance: 'gaokao' },
        ],
      }
    } else if (mode === 2) {
      // ─── 模式 2: 能量守恒分析 ───
      const Ep = mass * g * L * (1 - Math.cos(angleReal))
      const Ek = 0.5 * mass * velReal * velReal
      const E_total = Ep + Ek

      const vMax = Math.sqrt(2 * g * L * (1 - Math.cos(theta0Deg * Math.PI / 180)))
      const tensionMax = mass * (g + vMax * vMax / L)

      return {
        quantities: [
          { label: '摆角 θ', value: `${(angleReal * 180 / Math.PI).toFixed(1)}°`, unit: '' },
          { label: '切向速度 v', value: velReal.toFixed(3), unit: 'm/s', color: PHYSICS_COLORS.velocity },
          { label: '重力势能 E_p', value: Ep.toFixed(3), unit: 'J', color: PHYSICS_COLORS.displacement },
          { label: '动能 E_k', value: Ek.toFixed(3), unit: 'J', color: '#10b981' },
          { label: '总机械能 E', value: E_total.toFixed(3), unit: 'J', color: '#f97316' },
          { label: '最低点最大速度', value: vMax.toFixed(2), unit: 'm/s' },
          { label: '最低点最大拉力', value: tensionMax.toFixed(2), unit: 'N', color: '#3b82f6' },
        ],
        formulas: [
          {
            name: '单摆能量守恒关系',
            latex: 'E = E_k + E_p = \\dfrac{1}{2}mv^2 + mgL(1 - \\cos\\theta)',
            level: 'core',
            note: '重力势能以最低点（θ = 0）为零势能参考面。',
          },
          {
            name: '最低点最大速度公式',
            latex: 'v_{max} = \\sqrt{2gL(1-\\cos\\theta_0)}',
            level: 'important',
            note: '由最高点静止释放到最低点，由重力做功全部转化为动能得出。',
          },
          {
            name: '最低点拉力极值公式',
            latex: 'F_{拉,max} = mg(3 - 2\\cos\\theta_0)',
            level: 'important',
            note: '在最低点合外力提供向心力：F_拉 - mg = m v²/L。结合机械能守恒可推出此高考结论。',
          },
        ],
        gaokaoPoints: [
          { text: '【能量转化】摆动过程中，在最高点势能最大，动能为 0；在最低点势能为 0，动能最大。无阻力时，总机械能始终守恒。', importance: 'core' },
          { text: '【拉力极值】单摆经过最低点时拉力最大。高考极频考点结论：从 θ₀ 释放时，最低点拉力 F_拉 = mg(3 - 2cosθ₀)。特别地，从 60° 释放时最低点拉力为 2mg。', importance: 'gaokao' },
          { text: '【合力辨析】在最低点，小球加速度切向分量为 0，法向（向心）加速度最大；因此最低点合力方向严格竖直向上，不为 0。', importance: 'hard' },
        ],
      }
    } else {
      // ─── 模式 0: 基础简谐运动 ───
      return {
        quantities: [
          { label: '摆角 θ', value: `${(stateSHM.angle * 180 / Math.PI).toFixed(1)}°`, unit: '' },
          { label: '水平位移 x', value: (L * Math.sin(stateSHM.angle)).toFixed(3), unit: 'm', color: PHYSICS_COLORS.displacement },
          { label: '切向速度 v', value: stateSHM.velocity.toFixed(3), unit: 'm/s', color: PHYSICS_COLORS.velocity },
          { label: '切向加速度 a_t', value: stateSHM.acceleration.toFixed(3), unit: 'm/s²', color: PHYSICS_COLORS.acceleration },
          { label: '重力 G', value: stateSHM.gravity.toFixed(1), unit: 'N', color: PHYSICS_COLORS.gravity },
          { label: '绳子拉力 F_拉', value: stateSHM.tension.toFixed(2), unit: 'N', color: '#3b82f6' },
          { label: '切向回复力 F_回', value: stateSHM.restoringForce.toFixed(2), unit: 'N', color: '#ef4444' },
        ],
        formulas: [
          {
            name: '单摆周期公式',
            latex: 'T_0 = 2\\pi \\sqrt{\\dfrac{L}{g}}',
            level: 'core',
            note: '仅由摆长 L 和重力加速度 g 决定，与质量 m 和振幅无关。',
          },
          {
            name: '单摆位移方程',
            latex: '\\theta = \\theta_0 \\cos(\\omega_0 t + \\varphi)',
            level: 'important',
            condition: '摆角 θ₀ ≤ 10° 时（小摆角近似简谐运动）',
          },
          {
            name: '单摆角频率',
            latex: '\\omega_0 = \\sqrt{\\dfrac{g}{L}}',
            level: 'derived',
          },
        ],
        gaokaoPoints: [
          { text: '【简谐条件】单摆在最大偏角很小（一般 θ₀ ≤ 10°）时，回复力 F_回 = -mg sinθ ≈ -mgθ，才可以近似看作简谐运动。', importance: 'core' },
          { text: '【等时性质】单摆周期具有等时性，只与 L 和 g 有关。在超重电梯中 g_等效 > g，周期变小；失重时变大；完全失重时不摆动。', importance: 'gaokao' },
          { text: '【受力分析】单摆的回复力是重力切向分力提供的；在最低点，小球合外力不为零（绳子拉力和重力径向分力之合提供向心力）。', importance: 'hard' },
        ],
      }
    }
  }

  if (animId === 'anim-mechanical-wave') {
    const A_cm = params.A ?? 2
    const A = A_cm / 100
    const f = params.f ?? 1
    const v = params.v ?? 2
    const mode = (params.mode ?? 0) as MechanicalWaveMode
    const phase0 = ((params.phi0 ?? 0) * Math.PI) / 180
    const waveParams = { amplitude: A, frequency: f, waveSpeed: v, phase0, mode }
    const lambda = computeWavelength(f, v)
    const T = computeWavePeriod(f)
    const L = DEFAULT_WAVE_CHAIN_LENGTH
    const xP = (DEFAULT_TRACKED_PARTICLE_INDEX / 24) * L
    const yS = computeWaveDisplacement(0, time, waveParams) * 100
    const yP = computeWaveDisplacement(xP, time, waveParams) * 100

    return {
      quantities: [
        { label: '波长 λ', value: lambda > 0 ? lambda.toFixed(3) : '—', unit: 'm', color: PHYSICS_COLORS.wavelength },
        { label: '周期 T', value: T > 0 ? T.toFixed(3) : '—', unit: 's' },
        { label: '振源位移 y_S', value: yS.toFixed(2), unit: 'cm', color: PHYSICS_COLORS.forceNet },
        { label: '质点 P 位移 y_P', value: yP.toFixed(2), unit: 'cm', color: PHYSICS_COLORS.amplitude },
        { label: '质点 P 位置 x_P', value: xP.toFixed(3), unit: 'm', color: PHYSICS_COLORS.amplitude },
      ],
      formulas: [
        {
          name: '向右传播行波',
          latex: 'y(x,t)=A\\\\sin\\\\left(2\\\\pi f\\\\left(t-\\\\dfrac{x}{v}\\\\right)+\\\\varphi_0\\\\right)',
          level: 'core',
          condition: 't \\\\ge x/v（因果性：扰动未到则为 0）',
          note: '相位沿传播方向滞后',
        },
        {
          name: '波速与波长',
          latex: 'v=\\\\lambda f=\\\\dfrac{\\\\lambda}{T}',
          level: 'core',
        },
      ],
      gaokaoPoints: [
        {
          text: '【传波不传质】机械波传播时，介质质点只在平衡位置附近振动，并不随波迁移；波形（相位）沿介质传播。',
          importance: 'gaokao',
        },
        {
          text: '【波形图 vs 振动图】y–x 图是某时刻各质点位移的空间分布；y–t 图是某固定质点位移随时间的变化。两者不可混淆。',
          importance: 'gaokao',
        },
        {
          text: '【起振方向】由波的传播方向与邻点带动关系判断：靠近波源一侧的邻点“领先”，可判读某点振动方向。',
          importance: 'hard',
        },
      ],
    }
  }

  if (animId === 'anim-wave-diffraction') {
    const d_cm = params.d ?? 8
    const lambda_cm = params.lambda ?? 4
    const d = d_cm / 100
    const lambda = lambda_cm / 100
    const ratio = d / Math.max(lambda, 1e-12)
    const Icenter = computeSingleSlitIntensity(0, d, lambda, 1, 1)
    const Iside = computeSingleSlitIntensity(0.2, d, lambda, 1, 1)

    return {
      quantities: [
        { label: '比值 d/λ', value: ratio.toFixed(2), unit: '' },
        { label: '中央相对强度', value: Icenter.toFixed(2), unit: '' },
        { label: '旁侧 y=0.2m 强度', value: Iside.toFixed(3), unit: '' },
      ],
      formulas: [
        {
          name: '单缝夫琅禾费强度',
          latex: 'I=I_0\\\\operatorname{sinc}^2\\\\!\\\\left(\\\\dfrac{\\\\pi d\\\\sin\\\\theta}{\\\\lambda}\\\\right)',
          level: 'important',
          note: '高中定性：d 与 λ 可比时衍射显著',
        },
      ],
      gaokaoPoints: [
        {
          text: '【衍射条件】缝、孔或障碍物的尺寸与波长差不多，甚至比波长更小时，衍射现象明显。',
          importance: 'gaokao',
        },
        {
          text: '【与直线传播】当 d ≫ λ 时，波近似直线传播，挡板后出现明显“阴影区”。',
          importance: 'core',
        },
      ],
    }
  }

  if (animId === 'anim-wave-interference') {
    return {
      quantities: [],
      formulas: [
        {
          name: '干涉加强/减弱',
          latex: '\\\\delta=r_2-r_1=\\begin{cases}n\\\\lambda & \\\\text{加强}\\\\\\\\(n+\\\\tfrac12)\\\\lambda & \\\\text{减弱}\\\\end{cases}',
          level: 'core',
        },
      ],
      gaokaoPoints: [
        {
          text: '【相干条件】两列波频率相同、相位差恒定（且振动方向大体相同）才能产生稳定干涉图样。',
          importance: 'gaokao',
        },
        {
          text: '【程差判据】到两波源的路程差 δ=nλ 为振动加强；δ=(n+1/2)λ 为振动减弱（反相时结论对调）。',
          importance: 'gaokao',
        },
      ],
    }
  }

  return null
}
