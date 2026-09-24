import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint } from '../types'
import {
  calculateSurfaceTensionForce,
  calculateCapillaryRise,
} from '@/physics/thermodynamics/solidsLiquids'

export function buildSolidsLiquidsQuantities(
  _animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  const mode = params.mode ?? 0
  const gamma = params.gamma ?? 0.073
  const capillaryRadius = params.capillaryRadius ?? 0.5
  const isMercury = params.isMercury ?? 0

  const quantities: PhysicsQuantity[] = []
  const formulas: Formula[] = []
  const gaokaoPoints: GaokaoPoint[] = []

  if (mode === 0) {
    gaokaoPoints.push(
      {
        text: '晶体与非晶体辨析：晶体具有固定熔点，非晶体没有固定熔点（随温度升高逐渐软化）。',
        importance: 'gaokao',
      },
      {
        text: '各向异性成因：单晶体在不同方向上微粒排列周期与间距不同，导致力学、导热、导电及光学性质呈现各向异性；多晶体由大量细小晶粒杂乱排列构成，表现为各向同性。',
        importance: 'gaokao',
      },
      {
        text: '液晶的特性：液晶既具有液体的流动性，又在特定温度范围内表现出晶体的各向异性光学性质。',
        importance: 'core',
      },
    )
  } else if (mode === 1) {
    const fTension = calculateSurfaceTensionForce(gamma, 0.08)

    quantities.push(
      { label: '表面张力系数', symbol: '\\gamma', value: +gamma.toFixed(3), unit: 'N/m' },
      { label: '液膜活动杆长度', symbol: 'L', value: 0.08, unit: 'm' },
      { label: '双面液膜合收缩力', symbol: 'F', value: +(fTension * 1000).toFixed(1), unit: 'mN' },
    )

    formulas.push(
      {
        name: '双面液膜表面张力',
        latex: 'F = 2\\gamma L',
        level: 'core',
      },
      {
        name: '表面张力定义',
        latex: '\\gamma = \\frac{F}{2L} = \\frac{\\Delta E_p}{\\Delta S}',
        level: 'important',
      },
    )

    gaokaoPoints.push(
      {
        text: '表面张力形成机制：液体表面层分子较稀疏，分子间距大于平衡距离 r0，分子力表现为相互引力，使液面犹如紧绷的橡皮膜。',
        importance: 'gaokao',
      },
      {
        text: '液滴球形原理：在无外力（或失重状态）下，表面张力使液体表面收缩至同体积下表面积最小的几何形状——球形。',
        importance: 'core',
      },
    )
  } else {
    const theta = isMercury === 1 ? (140 * Math.PI) / 180 : 0
    const rho = isMercury === 1 ? 13600 : 1000
    const rMeters = capillaryRadius / 1000
    const rise = calculateCapillaryRise(gamma, theta, rMeters, rho, 9.8)

    quantities.push(
      { label: '毛细管内径半径', symbol: 'r', value: capillaryRadius, unit: 'mm' },
      { label: '毛细液面高度差', symbol: 'h', value: +(rise.h * 1000).toFixed(1), unit: 'mm' },
      { label: '弯月液面形态', symbol: '液面', value: rise.meniscusType === 'concave' ? '凹液面' : '凸液面', unit: '' },
    )

    formulas.push(
      {
        name: '毛细上升高度公式',
        latex: 'h = \\frac{2\\gamma \\cos\\theta}{\\rho g r}',
        level: 'core',
      },
    )

    gaokaoPoints.push(
      {
        text: '浸润与不浸润微观根源：附着层分子受固体吸引力与液体内部分子吸引力的竞争。当固体引力大于液体内力时表现为浸润（附着层扩大，接触角 < 90°）。',
        importance: 'gaokao',
      },
      {
        text: '毛细现象规律：浸润液体在细管中液面上升（凹液面）；不浸润液体在细管中液面下降（凸液面）。管越细（r 越小），高度差越显著。',
        importance: 'gaokao',
      },
    )
  }

  return {
    quantities,
    formulas,
    gaokaoPoints,
  }
}
