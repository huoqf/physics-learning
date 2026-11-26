import type { PhysicsPanelData } from './types'
import { calculateThinLens, calculateConjugatePositions } from '../../physics/optics'

export function buildThinLensQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-thin-lens') return null

  const mode = params.mode ?? 0
  const isConcave = (params.isConcave ?? 0) === 1
  const f_cm = params.f ?? 10
  const u_cm = params.u ?? 30
  const L_cm = params.L ?? 50

  const f_m = f_cm / 100
  const u_m = u_cm / 100
  const effectiveF = isConcave ? -f_m : f_m

  const { v, m, type, valid } = calculateThinLens(effectiveF, u_m)
  const v_cm = v * 100

  const quantities: PhysicsPanelData['quantities'] = [
    { label: '像距 v', value: valid && isFinite(v) ? v_cm.toFixed(1) : '—', unit: 'cm',
      highlight: v > 0 ? 'positive' as const : v < 0 ? 'negative' as const : undefined },
    { label: '放大率 |M|', value: valid && isFinite(m) ? Math.abs(m).toFixed(2) : '—', unit: '',
      highlight: Math.abs(m) > 1 ? 'extreme' as const : undefined },
  ]

  if (valid) {
    const typeLabel = type === 'real-inverted' ? '倒立实像' : '正立虚像'
    quantities.push({
      label: '像的性质',
      value: typeLabel,
      unit: '',
    })
  }

  if (mode === 1) {
    const conj = calculateConjugatePositions(L_cm / 100, f_m)
    if (conj.valid) {
      quantities.push(
        { label: '第一次像距 v₁', value: (conj.v1 * 100).toFixed(1), unit: 'cm', highlight: 'positive' as const },
        { label: '第二次像距 v₂', value: (conj.v2 * 100).toFixed(1), unit: 'cm', highlight: 'positive' as const },
      )
    }
  }

  const formulas: NonNullable<PhysicsPanelData['formulas']> = [
    {
      name: '透镜成像公式',
      latex: '\\frac{1}{u} + \\frac{1}{v} = \\frac{1}{f}',
      level: 'supplementary',
      condition: '薄透镜近轴光线（单实正符号约定：凸透镜 f > 0，凹透镜 f < 0；实像 v > 0，虚像 v < 0）',
    },
    {
      name: '横向放大率公式',
      latex: 'M = -\\frac{v}{u}',
      level: 'supplementary',
      condition: '放大倍数为 |v/u|；M < 0 表示倒立实像，M > 0 表示正立虚像',
    },
  ]

  if (mode === 1 && !isConcave) {
    formulas.push({
      name: '共轭法方程',
      latex: 'u^2 - Lu + Lf = 0',
      condition: '凸透镜成像，物屏距离 L > 4f',
      level: 'supplementary',
    })
  }

  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = isConcave
    ? [
        { text: '凹透镜对光有发散作用，物体在任意有限物距（u > 0）下均成正立、缩小的虚像', importance: 'core' },
        { text: '凹透镜所成虚像位于物同侧一倍焦距以内（|v| < |f|），物近像近像略变大', importance: 'core' },
      ]
    : [
        { text: '凸透镜：一倍焦距分虚实，二倍焦距分大小', importance: 'gaokao' },
        { text: '凸透镜：物近像远像变大（实像），物近像近像变小（虚像）', importance: 'gaokao' },
      ]

  if (!isConcave) {
    if (mode === 0) {
      gaokaoPoints.push(
        { text: 'u > 2f：倒立缩小实像；f < u < 2f：倒立放大实像', importance: 'core' },
        { text: 'u < f：正立放大虚像（放大镜原理）', importance: 'core' },
      )
    } else {
      gaokaoPoints.push(
        { text: '共轭法测焦距：固定 L > 4f，移动凸透镜找两个清晰成像位置', importance: 'extend' },
        { text: 'L_min = 4f（恰好 4f 时两次成像重合，故实用条件为 L > 4f）', importance: 'extend' },
      )
    }
  }

  const warnings: PhysicsPanelData['warnings'] = []
  if (valid && Math.abs(v) > 100) {
    warnings.push({ text: '像距过大，实际实验中难以观察', level: 'info' })
  }

  return {
    quantities,
    formulas,
    gaokaoPoints,
    warnings,
    mnemonic: isConcave
      ? '凹透镜发散光线，始终成正立缩小的虚像'
      : '一倍焦距分虚实，二倍焦距分大小；物近像远像变大',
  }
}
