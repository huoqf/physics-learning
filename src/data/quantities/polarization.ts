import type { PhysicsPanelData } from './types'
import { normalizeParams, type ParamDefs } from './types'
import { calculateMalusLaw, calculate3DGlassesTransmission, calculateReflectionPolarization } from '../../physics/optics'

interface PolarizationParams {
  mode: number
  polarizerAngle: number
  analyzerAngle: number
  glassesAngle: number
  filterAngle: number
}

const DEFAULTS: ParamDefs<PolarizationParams> = {
  mode: { default: 0 },
  polarizerAngle: { default: 45 },
  analyzerAngle: { default: 135 },
  glassesAngle: { default: 0 },
  filterAngle: { default: 0 },
}

/**
 * 物理量看板数据构建器 — 光的偏振
 * @param animId - 动画ID
 * @param params - 控制面板参数
 * @param time - 当前动画时间 (s)
 * @returns 包含物理量数值、相关公式和高考考点看板的数据结构
 */
export function buildPolarizationQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-polarization') return null

  const p = normalizeParams(params, DEFAULTS)
  const modeVal = p.mode

  const quantities: PhysicsPanelData['quantities'] = []
  let formulas: PhysicsPanelData['formulas'] = []
  let gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = []

  if (modeVal === 0) {
    // 起偏与检偏模式
    const angleDiff = Math.abs(p.polarizerAngle - p.analyzerAngle)
    const intensityRatio = calculateMalusLaw(angleDiff)

    quantities.push({ label: '起偏器角度 θ₁', value: p.polarizerAngle, unit: '°' })
    quantities.push({ label: '检偏器角度 θ₂', value: p.analyzerAngle, unit: '°' })
    quantities.push({ label: '两偏振片夹角 Δθ', value: angleDiff, unit: '°', highlight: 'positive' })
    quantities.push({
      label: '透射光强比例 I/I₀',
      value: (intensityRatio * 100).toFixed(1),
      unit: '%',
      highlight: 'extreme',
    })

    formulas = [
      {
        name: '马吕斯定律 (Malus\' Law)',
        latex: 'I = I_0 \\cos^2\\theta',
        condition: 'θ 为起偏器与检偏器透振方向的夹角。当夹角为 90° 时，透射光强为 0',
        level: 'core',
      },
    ]

    gaokaoPoints = [
      { text: '光的偏振现象证明了光是横波。只有横波才能发生偏振现象，纵波没有偏振现象。', importance: 'gaokao' },
      { text: '自然光：太阳、日光灯等发出的光。其光矢量的振动在垂直于传播方向的平面内是各向均匀分布的。', importance: 'gaokao' },
      { text: '偏振光：光矢量的振动只沿着某一个特定方向（称为线偏振光），或者有特定偏向的光。', importance: 'gaokao' },
      { text: '当两偏振片透振方向平行时，透射光最亮；两偏振片垂直时，透射光强衰减为零（消光现象）。', importance: 'gaokao' },
    ]
  } else if (modeVal === 1) {
    // 3D立体眼镜模式
    const { intensityMain: intensityLL, intensityLeak: intensityLR } = calculate3DGlassesTransmission(p.glassesAngle)

    quantities.push({ label: '眼镜倾斜角 α', value: p.glassesAngle, unit: '°', highlight: 'positive' })
    quantities.push({ label: '左眼接收正确画面 I_L(L)', value: (intensityLL * 100).toFixed(1), unit: '%' })
    quantities.push({
      label: '左眼漏光干扰 I_L(R)',
      value: (intensityLR * 100).toFixed(1),
      unit: '%',
      highlight: intensityLR > 0.05 ? 'extreme' : undefined,
    })
    quantities.push({ label: '右眼接收正确画面 I_R(R)', value: (intensityLL * 100).toFixed(1), unit: '%' })
    quantities.push({
      label: '右眼漏光干扰 I_R(L)',
      value: (intensityLR * 100).toFixed(1),
      unit: '%',
      highlight: intensityLR > 0.05 ? 'extreme' : undefined,
    })

    formulas = [
      {
        name: '振动的正交分解',
        latex: 'A_{\\parallel} = A_0 \\cos\\alpha, \\quad A_{\\perp} = A_0 \\sin\\alpha',
        condition: '当偏振光偏振面与检偏器透振方向夹角为 α 时，平行分量透射，垂直分量被阻挡',
        level: 'core',
      },
      {
        name: '重影漏光强度公式',
        latex: 'I_{\\text{leak}} = I_0 \\sin^2\\alpha',
        condition: 'α 为头部的倾斜角。倾角越大，本应阻挡的对侧画面漏光越严重',
        level: 'derived',
      },
    ]

    gaokaoPoints = [
      { text: '立体电影（3D眼镜）利用了光的偏振原理。放映机发射出两束振动方向相互垂直的偏振光，观众佩戴的 3D 眼镜左右镜片的透振方向也相互垂直，使得左右眼分别只接收到对应的图像，在大脑中合成立体感。', importance: 'gaokao' },
      { text: '如果观众在观影时大幅度倾斜头部，会导致镜片的透振方向与光线偏振方向产生夹角，造成漏光（左眼看到右眼图像，反之亦然），在大脑中形成模糊的重影。', importance: 'core' },
    ]
  } else {
    // 消除反光应用模式
    const { intensityRef, intensityFish } = calculateReflectionPolarization(p.filterAngle)

    quantities.push({ label: '偏振镜角度 θ', value: p.filterAngle, unit: '°' })
    quantities.push({
      label: '反射眩光透射比例',
      value: (intensityRef * 100).toFixed(1),
      unit: '%',
      highlight: intensityRef > 0.5 ? 'extreme' : 'positive',
    })
    quantities.push({ label: '小鱼光线透射比例', value: (intensityFish * 100).toFixed(1), unit: '%' })

    formulas = [
      {
        name: '反射偏振消光公式',
        latex: 'I_{\\text{ref}} = I_{\\text{ref,0}} \\cos^2\\theta',
        condition: '当偏振滤镜的透振方向旋转至竖直方向 (90°) 时，与反射水平偏振光正交，反射眩光消减为零',
        level: 'core',
      },
    ]

    gaokaoPoints = [
      { text: '光的反射与折射偏振：自然光射入水面或玻璃砖等介质表面时，其反射光和折射光都包含偏振成分。在特定入射角（布儒斯特角）下，反射光为完全的水平偏振光。', importance: 'gaokao' },
      { text: '照相机前加装偏振镜（或戴上偏振太阳镜）的作用：通过旋转偏振片使其透振方向变为竖直，从而阻挡水平方向振动的反射眩光。', importance: 'gaokao' },
      { text: '反射眩光被阻挡后，水底小鱼散发的自然光虽然损失了 50% 的分量，但因为刺眼的眩光完全被滤除，画面对比度极大提升，从而能清晰看清小鱼。', importance: 'gaokao' },
    ]
  }

  return { quantities, formulas, gaokaoPoints, warnings: [] }
}
