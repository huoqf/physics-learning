import type { PhysicsPanelData } from './types'
import { calculateCriticalAngle, calculateIlluminatedRadius, calculateIlluminatedArea } from '../../physics/optics'

export function buildTotalReflectionQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-total-reflection') return null

  const mode = params.mode ?? 0
  const n = params.n ?? 1.33
  const theta1 = params.theta1 ?? 30
  const depth = params.depth ?? 2

  const { theta_c_deg } = calculateCriticalAngle(n, 1)
  const { radius } = calculateIlluminatedRadius(depth, n)
  const { area } = calculateIlluminatedArea(depth, n)

  const quantities: PhysicsPanelData['quantities'] = [
    { label: '临界角 C', value: isNaN(theta_c_deg) ? '不存在' : theta_c_deg.toFixed(2), unit: isNaN(theta_c_deg) ? '' : '°', highlight: 'extreme' as const },
  ]

  if (mode === 0) {
    quantities.push(
      { label: '入射角 i', value: theta1, unit: '°' },
      {
        label: '状态',
        value: theta1 >= theta_c_deg ? '全反射' : '正常折射',
        unit: '',
        highlight: theta1 >= theta_c_deg ? 'extreme' as const : 'positive' as const,
      },
    )
  } else {
    quantities.push(
      { label: '透光圆半径 R', value: isNaN(radius) ? '不存在' : radius.toFixed(3), unit: isNaN(radius) ? '' : 'm' },
      { label: '透光面积 S', value: isNaN(area) ? '不存在' : area.toFixed(3), unit: isNaN(area) ? '' : 'm²', highlight: 'extreme' as const },
    )
  }

  const formulas: PhysicsPanelData['formulas'] = [
    {
      name: '临界角公式',
      latex: '\\sin C = \\frac{1}{n}',
      condition: '光从光密介质（水）射向光疏介质（空气）',
      level: 'core',
    },
    {
      name: '透光圆半径',
      latex: 'R = \\frac{h}{\\sqrt{n^2 - 1}}',
      condition: '水下点光源模型',
      level: 'important',
    },
    {
      name: '透光圆面积',
      latex: 'S = \\frac{\\pi h^2}{n^2 - 1}',
      condition: 'S = πR²，与外围环境无关',
      level: 'important',
    },
  ]

  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
    { text: '全反射条件：光从光密介质射向光疏介质，且入射角 i ≥ 临界角 C（★★★★★五星考点）', importance: 'gaokao' },
    { text: '水面透光圆面积 S = πh²/(n²-1)，与光源亮度、水面大小无关', importance: 'core' },
  ]

  const warnings: PhysicsPanelData['warnings'] = []
  if (mode === 0 && theta1 >= theta_c_deg) {
    warnings.push({ text: '发生全反射：入射角已超过临界角，折射光完全消失', level: 'warning' })
  }

  return { quantities, formulas, gaokaoPoints, warnings }
}
