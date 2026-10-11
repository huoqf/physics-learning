import type { PhysicsPanelData, PhysicsQuantity, WarningItem } from '../types'
import {
  solveRefractionExperiment,
  REFRACTION_EXP_DEFAULTS,
} from '@/physics/experimentRefraction'
import { PHYSICS_COLORS } from '@/theme/physics'

/**
 * 高考实验：插针法测定玻璃折射率——右屏物理看板数据构建器
 */
export function buildExperimentRefractionQuantities(
  _animId: string,
  params: Record<string, number>,
): PhysicsPanelData | null {
  const theta1 = Number(params.theta1 ?? REFRACTION_EXP_DEFAULTS.theta1Deg)
  const n = Number(params.n ?? REFRACTION_EXP_DEFAULTS.nReal)
  const d_mm = Number(params.d_mm ?? REFRACTION_EXP_DEFAULTS.dMm)
  const pinDist = Number(params.pinDist ?? REFRACTION_EXP_DEFAULTS.pinDistMm)
  const errorOffset = Number(params.errorOffset ?? REFRACTION_EXP_DEFAULTS.errorOffsetMm)
  const method = Number(params.method ?? 0)

  const res = solveRefractionExperiment({
    theta1Deg: theta1,
    nReal: n,
    dMm: d_mm,
    pinDistMm: pinDist,
    errorOffsetMm: errorOffset,
  })

  // 1. 物理量展示
  const quantities: PhysicsQuantity[] = [
    {
      label: '入射角',
      symbol: 'θ₁',
      value: parseFloat(res.theta1Deg.toFixed(1)),
      unit: '°',
      color: PHYSICS_COLORS.electricPotential,
      highlight: 'positive',
    },
    {
      label: '理论折射角',
      symbol: 'θ₂',
      value: parseFloat(res.theta2Deg.toFixed(1)),
      unit: '°',
      color: PHYSICS_COLORS.velocity,
    },
    {
      label: '实测折射角',
      symbol: 'θ₂测',
      value: parseFloat(res.theta2MeasDeg.toFixed(1)),
      unit: '°',
      color: PHYSICS_COLORS.velocity,
      highlight: res.errorOffsetMm !== 0 ? 'extreme' : undefined,
    },
    {
      label: '真实折射率',
      symbol: 'n(真)',
      value: parseFloat(res.nReal.toFixed(3)),
      unit: '',
      color: PHYSICS_COLORS.emf,
    },
    {
      label: '测得折射率',
      symbol: 'n(测)',
      value: parseFloat(res.nMeas.toFixed(3)),
      unit: '',
      color: PHYSICS_COLORS.acceleration,
      highlight: res.errorOffsetMm !== 0 ? (res.nMeas > res.nReal ? 'positive' : 'extreme') : 'zero',
    },
    {
      label: '相对误差',
      symbol: 'δ',
      value: parseFloat(res.relativeErrorPercent.toFixed(2)),
      unit: '%',
      color: Math.abs(res.relativeErrorPercent) < 0.1 ? PHYSICS_COLORS.velocity : '#EF4444',
    },
  ]

  // 若选用单位圆法，追加单位圆截距线段比值
  if (method === 1) {
    quantities.push(
      {
        label: '单位圆入射垂线',
        symbol: "AA'",
        value: parseFloat(res.distAAPrimeMm.toFixed(1)),
        unit: 'mm',
      },
      {
        label: '单位圆折射垂线',
        symbol: "BB'",
        value: parseFloat(res.distBBPrimeMm.toFixed(1)),
        unit: 'mm',
      },
      {
        label: '单位圆测得折射率',
        symbol: "n(圆)",
        value: parseFloat(res.nCircleMeas.toFixed(3)),
        unit: '',
        color: PHYSICS_COLORS.acceleration,
      }
    )
  }

  // 2. 核心公式与物理定理
  const formulas = [
    {
      name: '折射定律 (斯涅耳定律)',
      latex: 'n = \\frac{\\sin \\theta_1}{\\sin \\theta_2}',
      level: 'core' as const,
      condition: '光从真空/空气射入介质',
      note: 'θ₁ 为入射角，θ₂ 为折射角，两者均为光线与法线的夹角',
    },
    {
      name: '单位圆无量角器法',
      latex: 'n = \\frac{AA\'}{BB\'}',
      level: 'derived' as const,
      condition: '以入射点 O 为圆心作任意半径 R 的辅助圆',
      note: "sin θ₁ = AA'/R，sin θ₂ = BB'/R，比值消去半径 R",
    },
    {
      name: '高考图像斜率法',
      latex: '\\sin \\theta_1 = n \\cdot \\sin \\theta_2',
      level: 'derived' as const,
      condition: '多次测量改变入射角 θ₁',
      note: '以 sin θ₂ 为横轴、sin θ₁ 为纵轴作图，图线斜率 k 即为折射率 n',
    },
  ]

  // 3. 高考核心考点
  const gaokaoPoints = [
    {
      text: '【大头针间距要求】P₁ 与 P₂、P₃ 与 P₄ 之间的距离应适当大一些（建议 ≥ 40mm），这样连线产生的方向误差（角度视差）显著减小。',
      importance: 'gaokao' as const,
    },
    {
      text: '【入射角选取黄金区间】入射角 θ₁ 不宜太小（小于 15° 会导致折射角太小，读数相对误差大）；也不宜太大（大于 75° 时反射光过强，折射出射光太弱，不易观察）。通常以 30°~60° 为最佳。',
      importance: 'gaokao' as const,
    },
    {
      text: '【下表面边界画偏的误差铁律】若将出射边界 bb\' 误画窄（向内移），会导致所画的折射角 θ₂ 偏小，由公式反算得到的折射率 n 偏大；反之若画宽，则 θ₂ 偏大，n 偏小。',
      importance: 'gaokao' as const,
    },
    {
      text: '【玻璃砖两界面不平行探究】若玻璃砖上下两面不平行（如梯形砖），出射光线不再与入射光线平行，但只要分别以两界面法线计算折射，测得的折射率 n 依然准确。',
      importance: 'hard' as const,
    },
  ]

  // 4. 实时实验警示
  const warnings: WarningItem[] = []

  if (!res.evaluations.pinDistanceAdequate) {
    warnings.push({
      text: `⚠️ 大头针间距较小 (${pinDist} mm < 40 mm)，观察瞄准时易产生显著角度视差，建议拉大针距。`,
      level: 'warning',
    })
  }

  if (theta1 < 25) {
    warnings.push({
      text: `⚠️ 当前入射角偏小 (${theta1}° < 25°)，折射角过小会导致正弦值测量相对误差增大。`,
      level: 'info',
    })
  } else if (theta1 > 65) {
    warnings.push({
      text: `⚠️ 当前入射角偏大 (${theta1}° > 65°)，表面反射损耗剧烈，出射光线变弱难以看清插针虚像。`,
      level: 'warning',
    })
  }

  if (res.errorOffsetMm !== 0) {
    warnings.push({
      text: `⚠️ 下表面 bb' 画偏探究：当前边界${res.errorOffsetMm < 0 ? '画窄' : '画宽'} ${Math.abs(res.errorOffsetMm)} mm，导致测得折射率${res.nMeas > res.nReal ? '偏大' : '偏小'} (${res.relativeErrorPercent >= 0 ? '+' : ''}${res.relativeErrorPercent.toFixed(2)}%)！`,
      level: 'danger',
    })
  }

  return {
    quantities,
    formulas,
    gaokaoPoints,
    warnings,
  }
}
