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
    {
      text: '高考五星实验「插针法测定玻璃的折射率」：以 P₁P₂ 定出入射光线、P₃P₄ 定出射光线，量出 i、r 后由 n = sin i / sin r 计算。本页只演示其中的折射定律部分——插针定位、作图与多次测量不在本页范围内。',
      importance: 'gaokao',
    },
    { text: '折射率 n = sinθ₁ / sinθ₂，n 越大折射角越小', importance: 'core' },
  ]

  if (advancedMode === 1) {
    gaokaoPoints.push(
      { text: '光线通过平行玻璃砖后，出射光线与入射光线严格平行', importance: 'core' },
      { text: '折射率 n 越大，侧移 Δx 越大', importance: 'hard' },
    )
  }

  // 本动画光路恒为 空气(1) → 玻璃(n>1)，sinθ₂ = sinθ₁/n 必小于 1，
  // 不存在全反射，故不再挂"全反射"告警（原分支为不可达死代码）。
  const warnings: PhysicsPanelData['warnings'] = [
    {
      text: '【范围声明】本页是「光的折射定律」原理演示，只讲 θ₁、θ₂、n 之间的定量关系。高考实验「测定玻璃的折射率」所需的插针法装置与操作——矩形玻璃砖、大头针 P₁~P₄ 依次插针并以前针遮挡后针定位光路、量角器读出入射角 i 与折射角 r、作图法求 n、多次测量取平均——不在本页范围内。',
      level: 'warning',
    },
  ]

  return { quantities, formulas, gaokaoPoints, warnings }
}
