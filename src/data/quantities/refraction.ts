import type { PhysicsPanelData } from './types'
import { calculateRefraction } from '../../physics/optics'

export function buildRefractionQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-refraction') return null

  const theta1 = params.theta1 ?? 45
  const n = params.n ?? 1.5
  const advancedMode = params.advancedMode ?? 0
  const d = params.glassThickness ?? 20

  const { theta2_deg } = calculateRefraction(theta1, 1, n)

  const theta1Rad = (theta1 * Math.PI) / 180
  const theta2Rad = (theta2_deg * Math.PI) / 180
  const delta_x = d * Math.sin(theta1Rad - theta2Rad) / Math.cos(theta2Rad)

  const quantities: PhysicsPanelData['quantities'] = [
    { label: '入射角 θ₁', value: theta1, unit: '°' },
    {
      label: '折射角 θ₂',
      value: isNaN(theta2_deg) ? '全反射' : theta2_deg,
      unit: isNaN(theta2_deg) ? '' : '°',
      highlight: 'positive' as const,
    },
  ]

  if (advancedMode === 1 && !isNaN(delta_x)) {
    quantities.push({
      label: '侧移距离 Δx',
      value: delta_x.toFixed(2),
      unit: 'mm',
      highlight: 'extreme' as const,
    })
  }

  const formulas: PhysicsPanelData['formulas'] = [
    {
      name: '斯涅尔定律',
      latex: 'n = \\frac{\\sin\\theta_1}{\\sin\\theta_2}',
      condition: '光从折射率 n₁ 的介质射入折射率 n₂ 的介质',
      level: 'core',
    },
  ]

  if (advancedMode === 1) {
    formulas.push({
      name: '侧移公式',
      latex: '\\Delta x = d \\cdot \\frac{\\sin(\\theta_1 - \\theta_2)}{\\cos\\theta_2}',
      condition: '平行玻璃砖，光线两次折射后出射',
      level: 'important',
    })
  }

  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
    { text: '高考实验：插针法测定玻璃折射率（★五星考点）', importance: 'gaokao' },
    { text: '折射率 n = sinθ₁ / sinθ₂，n 越大折射角越小', importance: 'core' },
  ]

  if (advancedMode === 1) {
    gaokaoPoints.push(
      { text: '光线通过平行玻璃砖后，出射光线与入射光线严格平行', importance: 'core' },
      { text: '折射率 n 越大，侧移 Δx 越大', importance: 'hard' },
    )
  }

  const warnings: PhysicsPanelData['warnings'] = isNaN(theta2_deg)
    ? [{ text: '全反射：入射角超过临界角，光线无法折射进入玻璃', level: 'warning' }]
    : []

  return { quantities, formulas, gaokaoPoints, warnings }
}
