import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { calculateEarthGravity } from '../../../physics'

interface Params {
  mode: number
  latitude: number
  omegaScale: number
  suspendPoint: number
  showWeight: number
  weightMass: number
  weightX: number
  weightY: number
}

const DEFAULTS: ParamDefs<Params> = {
  mode: { default: 0 },
  latitude: { default: 45 },
  omegaScale: { default: 80 },
  suspendPoint: { default: 0 },
  showWeight: { default: 0 },
  weightMass: { default: 1.2 },
  weightX: { default: 25 },
  weightY: { default: 25 },
}

export function handleGravityBasic(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-gravity-basic') return null
  const p = normalizeParams(params, DEFAULTS)

  const mode = p.mode ?? 0

  if (mode === 0) {
    const latitude = p.latitude ?? 45
    const omegaScale = p.omegaScale ?? 80
    const m = 1.0
    const F_gravitation = 100
    const { F_grav, F_centripetal, G_force, angleDeviation } = calculateEarthGravity(
      latitude, m, F_gravitation, omegaScale
    )
    return {
      quantities: [
        ...base,
        { label: '引力 F_引 (相对)', value: F_grav.toFixed(1), unit: 'N' },
        { label: '向心力 F_向 (相对)', value: F_centripetal.toFixed(1), unit: 'N', highlight: F_centripetal > 1.5 ? 'positive' : undefined },
        { label: '实际重力 G (相对)', value: G_force.toFixed(1), unit: 'N', highlight: 'positive' as const },
        { label: '重力偏角 θ', value: angleDeviation.toFixed(2), unit: '°', highlight: angleDeviation > 0.5 ? 'extreme' : undefined }
      ],
      formulas: [
        { name: '引力分解关系', latex: '\\vec{F}_{\\text{引}} = \\vec{G} + \\vec{F}_{\\text{向}}', level: 'core' },
        { name: '极点状态(向心力=0)', latex: 'G = F_{\\text{引}}', level: 'important', condition: '两极处' },
        { name: '赤道状态(向心力最大)', latex: 'G = F_{\\text{引}} - F_{\\text{向}}', level: 'important', condition: '赤道处' }
      ],
      gaokaoPoints: [
        { text: '重力是万有引力的一个分力，方向竖直向下不指向地心。', importance: 'core' as const },
        { text: '重力加速度 g 随纬度升高而增大，赤道最小、两极最大。', importance: 'core' as const }
      ]
    }
  }

  // mode=1: 悬挂法重心实验
  const suspendPoint = p.suspendPoint ?? 0
  const showWeight = p.showWeight ?? 0
  const weightMass = p.weightMass ?? 1.2

  const baseCenterX = 5, baseCenterY = 5
  let centerX = baseCenterX, centerY = baseCenterY
  if (showWeight === 1) {
    const totalMass = 1.0 + weightMass
    centerX = (baseCenterX * 1.0 + (p.weightX ?? 25) * weightMass) / totalMass
    centerY = (baseCenterY * 1.0 + (p.weightY ?? 25) * weightMass) / totalMass
  }

  return {
    quantities: [
      ...base,
      { label: '当前悬挂孔', value: `A${suspendPoint + 1}`, unit: '' },
      { label: '重心 C 坐标', value: `(${centerX.toFixed(1)}, ${centerY.toFixed(1)})`, unit: '本地单位' },
      { label: '配重状态', value: showWeight === 1 ? '已启用' : '未启用', unit: '' },
      ...(showWeight === 1 ? [
        { label: '配重质量 M', value: weightMass.toFixed(1), unit: '倍板质量' },
      ] : []),
    ],
    formulas: [
      { name: '悬挂法原理', latex: '平衡时重心在悬挂点正下方', level: 'core', condition: '薄板自由悬挂静止后' },
      { name: '重心定义', latex: '\\vec{r}_C = \\frac{\\sum m_i \\vec{r}_i}{\\sum m_i}', level: 'important', condition: '质量分布确定时重心唯一' },
      { name: '确定重心', latex: '两条悬挂线交点 = 重心', level: 'core', condition: '不同悬挂点各画一条铅垂线' },
    ],
    gaokaoPoints: [
      { text: '悬挂法找重心：从不同点悬挂薄板，静止后沿悬挂线画铅垂线，交点即重心。', importance: 'core' as const },
      { text: '重心不一定在物体上（如空心环、不规则薄板）。', importance: 'gaokao' as const },
      { text: '重心位置与悬挂点无关，由质量分布唯一确定。', importance: 'core' as const },
    ],
  }
}
