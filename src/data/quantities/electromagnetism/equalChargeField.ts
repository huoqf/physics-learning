import type { PhysicsPanelData, PhysicsQuantity, Formula, WarningItem, GaokaoPoint } from '../types'
import { computeEqualChargeSnapshot, getEqualChargePair } from '@/physics'

/**
 * 构建「等量电荷场线模型」（anim-equal-charge-field）右屏五段式物理看板数据。
 * 随 (chargeType, axis) 组合同步更新：实时物理量、核心公式、易错警示、核心要点、记忆口诀。
 */
export function buildEqualChargeFieldQuantities(
  _animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData {
  const chargeType = params.chargeType ?? 0
  const axis = params.axis ?? 0
  const qMicroC = params.qMicroC ?? 5
  const halfSepCm = params.halfSepCm ?? 3

  const config = { chargeType, axis, qMicroC, halfSepCm }
  const pair = getEqualChargePair(config)
  const snap = computeEqualChargeSnapshot(config, time)

  const chargeLabel =
    pair.chargeType === 0
      ? '等量异种（+Q, -Q）'
      : pair.chargeType === 1
        ? '等量同正（+Q, +Q）'
        : '等量同负（-Q, -Q）'

  const axisLabel = pair.axis === 0 ? '两电荷连线（x 轴）' : '垂直平分线（y 轴）'

  const eDirText =
    Math.abs(snap.eSignedMV) < 1e-3
      ? '零场强'
      : pair.axis === 0 || pair.chargeType === 0
        ? snap.eSignedMV > 0
          ? '向右 (+x)'
          : '向左 (-x)'
        : snap.eSignedMV > 0
          ? '向上 (+y)'
          : '向下 (-y)'

  const quantities: PhysicsQuantity[] = [
    { label: '电荷组合', value: chargeLabel, unit: '' },
    { label: '观测对称轴', value: axisLabel, unit: '' },
    {
      label: pair.axis === 0 ? '探针横坐标' : '探针纵坐标',
      symbol: pair.axis === 0 ? 'x' : 'y',
      value: Number(snap.sCm.toFixed(2)),
      unit: 'cm',
    },
    {
      label: '合场强大小',
      symbol: 'E',
      value: Number((snap.point.E / 1e6).toFixed(3)),
      unit: 'MV/m',
      highlight: snap.point.E < 1e3 ? 'zero' : undefined,
    },
    {
      label: '合场强方向',
      value: eDirText,
      unit: '',
    },
    {
      label: '探测点电势',
      symbol: 'φ',
      value: Number(snap.phiMV.toFixed(3)),
      unit: 'MV',
      highlight:
        Math.abs(snap.phiMV) < 1e-4
          ? 'zero'
          : snap.phiMV > 0
            ? 'positive'
            : 'negative',
    },
    {
      label: '中点 O 场强',
      symbol: 'E_O',
      value: Number(snap.eAtMidpointMV.toFixed(3)),
      unit: 'MV/m',
      highlight: pair.chargeType === 0 ? 'extreme' : 'zero',
    },
    {
      label: '中点 O 电势',
      symbol: 'φ_O',
      value: Number(snap.phiAtMidpointMV.toFixed(3)),
      unit: 'MV',
      highlight: pair.chargeType === 0 ? 'zero' : undefined,
    },
  ]

  if (pair.axis === 1 && pair.chargeType !== 0) {
    quantities.push({
      label: '中垂线极大场强位置',
      symbol: 'y_max',
      value: `±${snap.yMaxCm.toFixed(2)}`,
      unit: 'cm',
      highlight: 'extreme',
    })
  }

  const formulas: Formula[] = [
    {
      name: '点电荷场强叠加原理',
      latex: '\\vec{E} = \\vec{E}_1 + \\vec{E}_2, \\quad E_i = \\frac{k|Q_i|}{r_i^2}',
      level: 'core',
      condition: '矢量相加遵循平行四边形定则，x = ±a 处分别为场源电荷 Q₁、Q₂',
    },
  ]

  if (pair.axis === 0 && pair.chargeType === 0) {
    formulas.push({
      name: '等量异种连线中点与对称分布',
      latex: 'E_{\\text{中}} = \\frac{2kQ}{a^2} \\;(\\text{极小值}), \\quad \\varphi_O = 0',
      level: 'important',
      condition: '连线上由 +Q 到 -Q，E 先减小后增大、方向始终由 +Q 指向 -Q；φ 单调降低',
    })
  } else if (pair.axis === 0 && pair.chargeType !== 0) {
    formulas.push({
      name: '等量同种连线中点场强抵消',
      latex: 'E_O = 0, \\quad \\varphi_O \\neq 0 \\;(\\text{极值点})',
      level: 'important',
      condition:
        pair.chargeType === 1
          ? '等量同正：中点 E = 0、φ 取极小正值（拓展值 φ_O = +2kQ/a）；过 O 点两侧场强方向相反'
          : '等量同负：中点 E = 0、φ 取极大负值（拓展值 φ_O = −2kQ/a）；过 O 点两侧场强方向相反',
    })
  } else if (pair.axis === 1 && pair.chargeType === 0) {
    formulas.push({
      name: '等量异种中垂线等势特性',
      latex: 'E_{\\text{中垂}} = \\frac{2kQa}{(a^2 + y^2)^{3/2}}, \\quad \\varphi(0, y) \\equiv 0',
      level: 'important',
      condition: '整个中垂面为 φ = 0 等势面；中点 O 处场强最大，沿中垂线向两侧单调减小',
    })
  } else {
    formulas.push({
      name: '等量同种中垂线场强极值条件（拓展）',
      latex: 'E_{\\text{中垂}} = \\frac{2kQ|y|}{(a^2 + y^2)^{3/2}}, \\quad y_{\\max} = \\pm\\frac{a}{\\sqrt{2}}',
      level: 'supplementary',
      condition: '中点 O 与无穷远处场强均为 0，故中垂线上从 O 向外场强先增后减（高中重在定性掌握先增后减，极值位置 y = ±a/√2 ≈ ±0.71a 为拓展推论）',
    })
  }

  formulas.push({
    name: '点电荷电势叠加公式（拓展）',
    latex: '\\varphi = \\frac{kQ_1}{r_1} + \\frac{kQ_2}{r_2}',
    level: 'supplementary',
    condition: '电势为标量且取无穷远 φ = 0，总电势等于两电荷各自在场点产生电势的代数和',
  })

  const warnings: WarningItem[] = []
  if (pair.chargeType === 0) {
    warnings.push(
      {
        text: '连线中点 O 是连线上的场强极小值点（非零），却是中垂线上的场强极大值点——同一位置在不同路径上极值性质恰好相反。',
        level: 'warning',
      },
      {
        text: '等量异种电荷的中垂线既是 φ = 0 等势线，又是移动试探电荷电场力做功为零的路径；但连线上各点 φ ≠ 0 且方向一致。',
        level: 'info',
      },
    )
  } else {
    warnings.push(
      {
        text: '中点 O 处 E = 0 但 φ ≠ 0（正电荷连线中点 φ > 0，负电荷连线中点 φ < 0），切勿把“场强为零”误当作“电势为零”。',
        level: 'danger',
      },
      {
        text: '等量同种电荷中垂线上从 O 点向外，场强先增大后减小，在 y = ±a/√2 处达到极大值，不要误以为单调递减。',
        level: 'warning',
      },
    )
  }

  const gaokaoPoints: GaokaoPoint[] = [
    {
      text: '等量异种电荷模型核心规律：① 连线上场强方向始终由 +Q 指向 -Q，中点处最小，对称点 E 等大同向、φ 一正一负；② 中垂线是零电势面，各点场强方向均平行于连线且由 +Q 一侧指向 -Q 一侧，中点处场强最大。',
      importance: 'gaokao',
    },
    {
      text: '等量同种电荷模型核心规律：① 连线中点 O 场强为零、两侧场强等大反向，连线上关于 O 对称的两点 E 等大反向、φ 相等；② 中垂线上由 O 点向外场强先增后减（在 a/√2 处最大），关于 O 对称两点 E 等大反向、φ 相等。',
      importance: 'gaokao',
    },
  ]

  const mnemonic =
    pair.chargeType === 0
      ? '异种口诀：连线中间弱两头强、电势一正一负降；中垂处处是零势、中点场强反最强。'
      : '同种口诀：中点场强必为零、电势极值却非零；连线对称反向等、中垂先增后减行。'

  return {
    quantities,
    formulas,
    warnings,
    gaokaoPoints,
    mnemonic,
  }
}
