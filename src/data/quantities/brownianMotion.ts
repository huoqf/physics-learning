/**
 * 布朗运动动画物理量看板数据构建。
 */
import { averageKineticEnergy, pollenMass } from '../../physics/brownianMotion'
import { BOLTZMANN_CONSTANT } from '@/physics/constants'
import { THERMO_COLORS, PHYSICS_COLORS } from '@/theme/physics'
import { splitScientific } from '@/utils'
import type { PhysicsPanelData } from './types'

export function buildThermodynamicsQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
  _lastChangedParam?: string | null,
): PhysicsPanelData | null {
  if (animId !== 'anim-brownian-motion') return null

  const T = params.temperature ?? 300
  const d = params.particleD ?? 5
  const Ek = averageKineticEnergy(T)
  
  // 花粉微粒质量 (kg)
  const mPollen = pollenMass(d * 1e-6)

  // 爱因斯坦扩散系数 D = k_B * T / (3 * pi * eta * d)
  // 水在常温下的动力黏度 eta ≈ 1.0e-3 Pa·s
  const eta = 1.0e-3
  const D = (BOLTZMANN_CONSTANT * T) / (3 * Math.PI * eta * (d * 1e-6))

  // 估算每秒受到撞击的不平衡程度 (与 sqrt(T)/d 相关)
  const collisionFluctuation = (Math.sqrt(T / 300) / (d * 0.2)).toFixed(2)

  const mFmt = splitScientific(mPollen, 2, 'kg')
  const ekFmt = splitScientific(Ek, 2, 'J')
  const dFmt = splitScientific(D, 2, 'm²/s')

  return {
    quantities: [
      { label: '系统温度 T', value: T.toFixed(0), unit: 'K', color: THERMO_COLORS.temperature },
      { label: '悬浮微粒直径 d', value: d.toFixed(1), unit: 'μm' },
      { label: '微粒质量 m', value: mFmt.value, unit: mFmt.unit },
      { label: '液体分子平均动能 Ēk', value: ekFmt.value, unit: ekFmt.unit, color: THERMO_COLORS.heatAbsorb },
      { label: '爱因斯坦扩散系数 D', value: dFmt.value, unit: dFmt.unit, highlight: 'extreme', color: PHYSICS_COLORS.velocity },
      { label: '合力相对涨落强度', value: collisionFluctuation, unit: 'arb.', color: PHYSICS_COLORS.forceNet },
    ],
    formulas: [
      {
        name: '温度与平均动能',
        latex: '\\bar{E}_k = \\dfrac{3}{2} k T',
        level: 'core',
        condition: '热力学系统 / 统计规律',
        note: 'k 为玻尔兹曼常数；温度是分子平均动能的唯一微观标志',
      },
      {
        name: '爱因斯坦-斯托克斯扩散定律',
        latex: 'D = \\dfrac{k T}{6 \\pi \\eta r} = \\dfrac{k T}{3 \\pi \\eta d}',
        level: 'important',
        condition: '悬浮小球在黏性流体中',
        note: '温度 T 越高、微粒直径 d 越小，扩散系数越大，布朗运动越剧烈',
      },
      {
        name: '均方位移关系',
        latex: '\\langle \\Delta r^2 \\rangle = 4 D t',
        level: 'derived',
        condition: '二维二维随机漫步',
        note: '位移平方的均值与时间成正比，证实了分子热运动的撞击无规则性',
      },
    ],
    gaokaoPoints: [
      { text: '布朗运动是悬浮固体微粒的无规则运动，不是液体分子的运动；但它间接反映了液体分子的无规则热运动。', importance: 'gaokao' },
      { text: '微粒越小、温度越高，不同方向受到撞击的不平衡性越显著，布朗运动越剧烈。', importance: 'gaokao' },
      { text: '显微镜下记录的折线不是微粒的实际运动轨迹，只是每隔固定时间（如30s）记录微粒位置的连线。', importance: 'hard' },
    ],
    warnings: [
      { text: '布朗运动的主体是宏观/介观悬浮颗粒（如花粉、碳粒），绝对不是液体分子本身！', level: 'danger' },
      { text: '布朗运动不能停止，是液体分子永不停息热运动的直接反映。', level: 'warning' },
      { text: '温度升高，分子平均动能增大，但并非每一个分子的速率都增大，属于统计规律。', level: 'warning' },
    ],
  }
}
