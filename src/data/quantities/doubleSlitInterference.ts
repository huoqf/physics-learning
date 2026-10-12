import type { PhysicsPanelData, WarningItem, ParamDefs } from './types'
import { normalizeParams } from './types'
import {
  wavelengthToHex,
  calculateDoubleSlitPhysics,
  DOUBLE_SLIT_DEFAULT_PARAMS,
} from '@/physics/optics'
import { PHYSICS_COLORS } from '@/theme/physics'

interface DoubleSlitParams {
  mode: number
  wavelength: number
  slitDistance: number
  screenDistance: number
  targetFringe: number
  currentFringe: number
  handwheelOffset: number
}

const DOUBLE_SLIT_DEFAULTS: ParamDefs<DoubleSlitParams> = {
  mode: { default: DOUBLE_SLIT_DEFAULT_PARAMS.mode },
  wavelength: { default: DOUBLE_SLIT_DEFAULT_PARAMS.wavelength },
  slitDistance: { default: DOUBLE_SLIT_DEFAULT_PARAMS.slitDistance },
  screenDistance: { default: DOUBLE_SLIT_DEFAULT_PARAMS.screenDistance },
  targetFringe: { default: DOUBLE_SLIT_DEFAULT_PARAMS.targetFringe },
  currentFringe: { default: DOUBLE_SLIT_DEFAULT_PARAMS.currentFringe },
  handwheelOffset: { default: DOUBLE_SLIT_DEFAULT_PARAMS.handwheelOffset },
}

export function buildDoubleSlitInterferenceQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-double-slit-interference') return null

  const p = normalizeParams(params, DOUBLE_SLIT_DEFAULTS)

  // 1. 调用纯物理函数计算（SSOT 单一事实源，自动防除零与防 NaN 兜底）
  const state = calculateDoubleSlitPhysics({
    wavelength: p.wavelength,
    slitDistance: p.slitDistance,
    screenDistance: p.screenDistance,
    targetFringe: p.targetFringe,
    activeFringe: p.currentFringe,
    handwheelOffset: p.handwheelOffset,
  })

  const {
    fringeSpacing,
    x1,
    xn,
    targetFringe,
    measuredDeltaX,
    measuredWavelength,
    relativeErrorPercent,
    isOverRange,
  } = state

  const wavelengthColor = wavelengthToHex(p.wavelength)
  const isExperimentMode = p.mode === 1

  // 2. 物理量列表（规范声明：包含 label, symbol, value, unit, color, highlight）
  const quantities: PhysicsPanelData['quantities'] = [
    {
      label: '光的波长',
      symbol: 'λ',
      value: p.wavelength,
      unit: 'nm',
      color: wavelengthColor,
      highlight: 'positive',
    },
    {
      label: '双缝间距',
      symbol: 'd',
      value: p.slitDistance,
      unit: 'mm',
      color: PHYSICS_COLORS.referencePoint,
    },
    {
      label: '缝屏距离',
      symbol: 'L',
      value: p.screenDistance,
      unit: 'm',
      color: PHYSICS_COLORS.amplitude,
    },
    {
      label: '理论条纹间距',
      symbol: 'Δx',
      value: fringeSpacing.toFixed(3),
      unit: 'mm',
      color: PHYSICS_COLORS.wavelengthRed,
      highlight: isExperimentMode ? undefined : 'extreme',
    },
  ]

  if (isExperimentMode) {
    quantities.push(
      {
        label: '第 1 条亮纹读数',
        symbol: 'x₁',
        value: x1.toFixed(3),
        unit: 'mm',
        color: isOverRange ? PHYSICS_COLORS.alertRed : PHYSICS_COLORS.position,
      },
      {
        label: `第 ${targetFringe} 条亮纹读数`,
        symbol: 'xₙ',
        value: xn.toFixed(3),
        unit: 'mm',
        color: isOverRange ? PHYSICS_COLORS.alertRed : PHYSICS_COLORS.displacement,
      },
      {
        label: '逐差实测条纹间距',
        symbol: 'Δx_测',
        value: measuredDeltaX.toFixed(3),
        unit: 'mm',
        color: PHYSICS_COLORS.wavelengthRed,
        highlight: 'extreme',
      },
      {
        label: '实验计算光波长',
        symbol: 'λ_测',
        value: measuredWavelength.toFixed(1),
        unit: 'nm',
        color: wavelengthColor,
        highlight: 'positive',
      },
    )
  }

  // 3. 完整公式体系 (KaTeX 表达式 + 适用条件 + 重要性 + 易错提醒)
  const formulas: PhysicsPanelData['formulas'] = isExperimentMode
    ? [
        {
          name: '逐差法条纹间距公式',
          latex: `\\Delta x = \\frac{|x_{${targetFringe}} - x_1|}{${targetFringe - 1}}`,
          condition: `测出第 1 条与第 ${targetFringe} 条亮条纹位置，消除单格读数偶然误差`,
          level: 'core',
          note: `相邻条纹间距极小，直接测量单条误差大，必须用 ${targetFringe - 1} 跨度平均`,
        },
        {
          name: '双缝干涉测波长公式',
          latex: '\\lambda = \\frac{d}{L} \\Delta x',
          condition: '近轴条件及相干单色光照明',
          level: 'core',
          note: '已知双缝间距 d、遮光筒长 L，测量 Δx 即可求出波长 λ',
        },
        {
          name: '螺旋测微器读数公式',
          latex: 'x = \\text{固定刻度(含0.5mm)} + \\text{可动刻度} \\times 0.01\\text{ mm}',
          condition: '50分度可动刻度，读数必须估读到 0.001 mm',
          level: 'important',
        },
      ]
    : [
        {
          name: '双缝干涉条纹间距公式',
          latex: '\\Delta x = \\frac{L}{d} \\lambda',
          condition: '两缝发出的光满足相干条件（频率相同、相位差恒定、振动方向一致）',
          level: 'core',
          note: 'Δx 表示相邻两条亮条纹（或暗条纹）中心线之间的距离',
        },
        {
          name: '相干光程差公式',
          latex: '\\delta = r_2 - r_1 = d \\sin \\theta \\approx d \\frac{y}{L}',
          condition: '近轴近似 (y ≪ L, θ 极小)',
          level: 'important',
        },
        {
          name: '明暗条纹干涉条件',
          latex:
            '\\delta = \\begin{cases} k\\lambda, & \\text{亮纹 } (k=0, \\pm 1, \\pm 2 \\dots) \\\\ (2k+1)\\frac{\\lambda}{2}, & \\text{暗纹 } (k=0, \\pm 1 \\dots) \\end{cases}',
          level: 'derived',
          note: 'k=0 对应中央亮条纹（无色散，各波长重合为白光）',
        },
      ]

  // 4. 高考要点区 (5级重要性标签: gaokao/hard/core/basic/extend)
  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
    {
      text: '高考实验大题必考：光具座元件排列顺序为「光源→凸透镜→滤光片→单缝→双缝→遮光筒→测量头」，单缝与双缝必须平行。',
      importance: 'gaokao',
    },
    {
      text: `逐差法防错：禁止直接测量单个相邻条纹间距 Δx，必须测出第 1 条与第 ${targetFringe} 条间距再除以 (${targetFringe}-1)。`,
      importance: 'gaokao',
    },
    {
      text: '测微手轮操作规范：转动手轮使分划板向同一方向移动，切忌中途反向转动，避免产生齿轮回程间隙误差。',
      importance: 'hard',
    },
    {
      text: '各元件作用分工：凸透镜聚光成平行光；滤光片获得单色光；单缝获得线光源；双缝获得相干光；遮光筒阻隔杂散光。',
      importance: 'core',
    },
  ]

  // 5. 易错警示区 (含高考仪器量程考点 B1-c 警示与对准误差警示)
  const warnings: WarningItem[] = []

  if (isExperimentMode) {
    if (isOverRange) {
      warnings.push({
        text: `⚠️ 读数超过螺旋测微器量程（10.000 mm）！高考实验考点：测量头螺旋测微手轮量程为 0~10 mm，条纹过宽 (Δx = ${fringeSpacing.toFixed(2)} mm) 时需增大双缝间距 d 或减小遮光筒长度 L，防止超出量程。`,
        level: 'warning',
      })
    } else if (relativeErrorPercent > 0.05) {
      warnings.push({
        text: `当前手轮微调存在偏置，测得波长与真实值偏差 ${relativeErrorPercent.toFixed(1)}%，请旋转手轮将十字分划丝严格对准亮纹正中心。`,
        level: 'warning',
      })
    } else {
      warnings.push({
        text: '十字分划板已精确对准条纹中心，螺旋测微手轮读数准确，符合高考实验数据记录规范。',
        level: 'info',
      })
    }
  } else {
    if (fringeSpacing > 5.0) {
      warnings.push({
        text: '当前条纹间距较大 (Δx > 5mm)，实际实验中条纹稀疏，视野内能观察到的条纹数量较少。',
        level: 'info',
      })
    } else if (fringeSpacing < 1.2) {
      warnings.push({
        text: '当前条纹间距较密 (Δx < 1.2mm)，实际测量中难以用分划板精确区分，需适当增大 L 或减小 d。',
        level: 'warning',
      })
    }
  }

  // 6. 助记口诀
  const mnemonic = isExperimentMode
    ? '光源滤单双筒头，平行放置暗筒优；测出n条除n减一，求出间距定波长。'
    : '双缝相干出彩带，间距与λ、L成正比；红光最宽紫光细，测出间距知波长。'

  return { quantities, formulas, gaokaoPoints, warnings, mnemonic }
}
