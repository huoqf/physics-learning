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
  const shieldType = params.shieldType ?? 0

  const res = calculateElectrostaticShielding({
    E0,
    mode,
    isGrounded,
    tipRadius,
    shieldType,
  })

  const isInnerShield = mode === 2 && shieldType === 1
  const quantities: PhysicsQuantity[] = isInnerShield
    ? [
        { label: '空腔屏蔽方案', value: '内屏蔽（腔内 +Q）', unit: '' },
        { label: '内部合场强', symbol: 'E_内', value: res.ENet, unit: 'V/m' },
        { label: '导体等势电势（示意）', symbol: 'φ', value: res.potential, unit: 'V' },
        {
          label: '空腔内部场强',
          symbol: 'E_腔',
          value: '非零 (腔内 +Q 激发)',
          unit: '',
          highlight: 'positive',
        },
        {
          label: '壳外受内荷附加场',
          symbol: 'E_外',
          value: res.externalField > 0 ? '非零 (未接地辐射)' : '0',
          unit: res.externalField > 0 ? '' : 'V/m',
          highlight: res.externalField === 0 ? 'zero' : 'extreme',
        },
      ]
    : [
        { label: '外加电场强度', symbol: 'E_0', value: E0, unit: 'V/m' },
        { label: '感应电荷电场', symbol: "E'", value: res.EPrime, unit: 'V/m' },
        { label: '内部合场强', symbol: 'E_内', value: res.ENet, unit: 'V/m' },
        { label: '导体等势电势（示意）', symbol: 'φ', value: res.potential, unit: 'V' },
      ]

  if (mode === 1) {
    quantities.push(
      { label: '尖端曲率半径', symbol: 'R', value: tipRadius, unit: 'mm' },
      // 相对指数（无量纲）：真实 σ 需由边界条件求解，此处仅用于比较尖端与圆钝端
      { label: '尖端电荷面密度指数', symbol: 'σ', value: res.tipChargeDensity, unit: '' },
      { label: '空气放电状态', value: res.isAirBreakdown ? '击穿放电' : '维持绝缘', unit: '' },
    )
  } else if (mode === 2 && !isInnerShield) {
    quantities.push(
      {
        label: '空腔屏蔽方案',
        value: '外屏蔽（挡外场）',
        unit: '',
      },
      {
        label: '空腔内部场强',
        symbol: 'E_腔',
        value: res.cavityField > 0 ? '非零 (腔内 +Q 激发)' : '0',
        unit: res.cavityField > 0 ? '' : 'V/m',
        highlight: res.cavityField === 0 ? 'zero' : 'positive',
      },
      {
        label: '壳外受内荷附加场',
        symbol: 'E_外',
        value: res.externalField > 0 ? '非零 (未接地辐射)' : '0',
        unit: res.externalField > 0 ? '' : 'V/m',
        highlight: res.externalField === 0 ? 'zero' : 'extreme',
      },
    )
  }

  const formulas: Formula[] = [
    {
      name: '静电平衡内部合场强抵消',
      latex: '\\vec{E}_{\\text{合}} = \\vec{E}_0 + \\vec{E}\' = 0',
      level: 'core',
      condition: '导体达到静电平衡后，内部任意位置均满足外电场与感应电场的合场强为零',
    },
    {
      name: '导体外表面场强垂直边界（拓展）',
      latex: 'E_n = \\frac{\\sigma}{\\varepsilon_0}, \\quad E_t = 0',
      level: 'supplementary',
      condition: '静电平衡状态下导体外表面（σ 为局部电荷面密度，高中阶段定性了解场强垂直于表面）',
    },
    {
      name: '等势体与等势面特性',
      latex: '\\varphi_A = \\varphi_B = \\cdots = \\varphi_{\\text{表面}} = \\text{常数}',
      level: 'important',
      condition: '导体达到静电平衡后，内部任意两点与表面处处电势相等',
    },
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    {
      text: '静电平衡状态核心特征：① 处于静电平衡的导体内部电场强度处处为零；② 导体内部无净电荷，净电荷只分布在导体表面上（实心导体或空腔内无电荷的空腔导体，净电荷只分布在外表面）；③ 整个导体是等势体，表面是等势面；④ 导体表面电场线与表面处处垂直。',
      importance: 'gaokao',
    },
    {
      text: '尖端放电原理：导体尖锐部位电荷分布密集，周围电场极强，使空气电离从而引发尖端放电；避雷针利用尖端放电将电荷持续缓慢引入大地。',
      importance: 'gaokao',
    },
    {
      text: '静电屏蔽双重性：① 封闭金属壳能阻挡外部电场进入内部（外屏蔽）；② 当壳内有带电体时，将金属壳接地能阻挡内部电场影响外部空间（内屏蔽）。',
      importance: 'gaokao',
    },
  ]

  return {
    quantities,
    formulas,
    gaokaoPoints,
  }
}
