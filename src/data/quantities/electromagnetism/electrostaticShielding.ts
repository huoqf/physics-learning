import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint } from '../types'
import { calculateElectrostaticShielding } from '@/physics/electromagnetism/electrostaticShielding'

export function buildElectrostaticShieldingQuantities(
  _animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  const E0 = params.E0 ?? 200
  const mode = params.mode ?? 0
  const isGrounded = params.isGrounded ?? 0
  const tipRadius = params.tipRadius ?? 1.0

  const res = calculateElectrostaticShielding({
    E0,
    mode,
    isGrounded,
    tipRadius,
  })

  const quantities: PhysicsQuantity[] = [
    { label: '外加电场强度', symbol: 'E_0', value: E0, unit: 'V/m' },
    { label: '感应电荷电场', symbol: "E'", value: res.EPrime, unit: 'V/m' },
    { label: '内部合场强', symbol: 'E_{\\text{内}}', value: res.ENet, unit: 'V/m' },
    { label: '导体等势电势', symbol: '\\varphi', value: res.potential, unit: 'V' },
  ]

  if (mode === 1) {
    quantities.push(
      { label: '尖端曲率半径', symbol: 'R', value: tipRadius, unit: 'mm' },
      { label: '尖端电荷面密度', symbol: '\\sigma', value: res.tipChargeDensity, unit: 'μC/m²' },
      { label: '空气放电状态', symbol: '放电', value: res.isAirBreakdown ? '击穿放电' : '维持绝缘', unit: '' },
    )
  }

  const formulas: Formula[] = [
    {
      name: '静电平衡内部合场强抵消',
      latex: '\\vec{E}_{\\text{合}} = \\vec{E}_0 + \\vec{E}\' = 0',
      level: 'core',
    },
    {
      name: '导体外表面场强垂直边界',
      latex: 'E_n = \\frac{\\sigma}{\\varepsilon_0}, \\quad E_t = 0',
      level: 'core',
    },
    {
      name: '等势体与等势面特性',
      latex: '\\varphi_A = \\varphi_B = \\cdots = \\varphi_{\\text{表面}} = \\text{常数}',
      level: 'important',
    },
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    {
      text: '静电平衡状态核心特征：① 处于静电平衡的导体内部电场强度处处为零；② 净电荷只分布在导体的外表面上；③ 整个导体是等势体，表面是等势面；④ 导体表面电场线与表面处处垂直。',
      importance: 'gaokao',
    },
    {
      text: '尖端放电考点：导体尖锐部位电荷面密度大，周围电场极强，使空气电离形成微粒流；避雷针利用尖端放电将电荷持续缓慢引入大地。',
      importance: 'gaokao',
    },
    {
      text: '静电屏蔽双重性：① 封闭金属壳能阻挡外部电场进入内部（外屏蔽）；② 壳内带电体接地后，能阻挡内部电场影响外部空间（内屏蔽接地）。',
      importance: 'gaokao',
    },
  ]

  return {
    quantities,
    formulas,
    gaokaoPoints,
  }
}
