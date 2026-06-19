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

  const formulas: PhysicsPanelData['formulas'] = [
    { name: '透镜成像公式', latex: '\\frac{1}{u} + \\frac{1}{v} = \\frac{1}{f}', level: 'core' },
    { name: '放大率公式', latex: 'M = -\\frac{v}{u}', level: 'core' },
  ]

  if (mode === 1) {
    formulas.push({
      name: '共轭法方程',
      latex: 'u^2 - Lu + Lf = 0',
      condition: '物屏距离 L > 4f',
      level: 'important',
    })
  }

  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
    { text: '一倍焦距分虚实，二倍焦距分大小', importance: 'gaokao' },
    { text: '物近像远像变大（实像），物近像近像变小（虚像）', importance: 'gaokao' },
  ]

  if (mode === 0) {
    gaokaoPoints.push(
      { text: 'u > 2f：倒立缩小实像；f < u < 2f：倒立放大实像', importance: 'core' },
      { text: 'u < f：正立放大虚像（放大镜原理）', importance: 'core' },
    )
  } else {
    gaokaoPoints.push(
      { text: '共轭法测焦距：固定 L > 4f，移动透镜找两个成像位置', importance: 'gaokao' },
      { text: 'L_min = 4f（当 u = v = 2f 时取得）', importance: 'gaokao' },
    )
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
    mnemonic: '一倍焦距分虚实，二倍焦距分大小；物近像远像变大',
  }
}
