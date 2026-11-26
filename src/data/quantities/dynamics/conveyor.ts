import { getConveyorFrame, canConveyorKeepSynchronous, type ConveyorMode } from '@/physics/conveyor'
import type { Formula, GaokaoPoint, PhysicsPanelData, PhysicsQuantity, WarningItem } from '../types'

const THETA_RAD = Math.PI / 12
const MASS_KG = 1

function phaseText(phase: string): string {
  switch (phase) {
    case 'sliding': return '相对滑动'
    case 'synchronous': return '水平共速'
    case 'staticOnIncline': return '静摩擦共速'
    case 'exitLeft': return '左端离开'
    case 'exitRight': return '右端离开'
    default: return phase
  }
}

export function handleConveyor(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-conveyor') return null

  const mode: ConveyorMode = (params.conveyorMode ?? 0) === 0 ? 'horizontal' : 'inclined'
  const vBelt = params.vBelt ?? 3
  const v0 = params.v0 ?? 0
  const mu = params.mu ?? 0.2
  const length = params.L ?? 6
  // 初始位置只对倾斜带有定义（水平带恒从左端放上）；与中屏、图表共用同一取法，
  // 否则右屏会把「从顶端释放」的题按「从底端释放」算出一整串对不上的数
  const x0Ratio = mode === 'inclined' ? (params.x0Ratio ?? 0) : 0
  const state = getConveyorFrame({ vBelt, v0, mu, L: length, mode, thetaRad: THETA_RAD, x0Ratio }, time, MASS_KG)
  const canStaticSync = canConveyorKeepSynchronous({ vBelt, v0, mu, L: length, mode, thetaRad: THETA_RAD })

  const quantities: PhysicsQuantity[] = [
    ...base,
    { label: '物块位置 x', value: state.xObj.toFixed(2), unit: 'm' },
    { label: '物块速度 v物', value: state.vObj.toFixed(2), unit: 'm/s' },
    { label: '相对速度 v物-v带', value: state.relativeVelocity.toFixed(2), unit: 'm/s' },
    { label: '摩擦力 f', value: state.friction.toFixed(2), unit: 'N' },
    { label: '相对位移累计', value: state.relativeDistanceAbs.toFixed(2), unit: 'm' },
    { label: '生热 Q', value: state.heat.toFixed(2), unit: 'J' },
    { label: '阶段', value: phaseText(state.phase), unit: '' },
  ]

  const formulas: Formula[] = [
    { name: '相对速度判据', latex: 'v_{\\text{rel}} = v_{\\text{物}} - v_{\\text{带}}', level: 'core', condition: '水平带以向右为正方向；倾斜带以沿传送带向上为正方向' },
    { name: '滑动摩擦方向', latex: 'f_k = -\\mu N\\,\\operatorname{sgn}(v_{\\text{rel}})', level: 'supplementary', condition: '物体与传送带存在相对滑动时（v_rel ≠ 0），摩擦力方向与相对速度方向相反' },
    mode === 'horizontal'
      ? { name: '水平带滑动加速度', latex: 'a = \\pm \\mu g', level: 'core', condition: '水平传送带共速前相对滑动阶段（正方向向右，取正取负由相对运动方向决定）' }
      : { name: '倾斜带切向方程', latex: 'ma = f - mg\\sin\\theta', level: 'core', condition: '倾斜传送带（倾角 θ = 15°，取沿斜面向上为正方向）' },
    mode === 'horizontal'
      ? { name: '水平带共速后', latex: 'v_{\\text{物}}=v_{\\text{带}} \\Rightarrow f=0', level: 'important', condition: '水平传送带且速度达到一致后（无外力维持时摩擦力消失）' }
      : { name: '倾斜带保持共速', latex: '\\mu \\ge \\tan\\theta', condition: '仅适用于倾斜带（本演示倾角特例 θ = 15°）且物块与带共速后不发生下滑', level: 'important' },
    { name: '摩擦生热', latex: 'Q = f\\,s_{\\text{相对}} = \\mu N\\,s_{\\text{相对}}', level: 'important', condition: '滑动摩擦阶段，s_相对 为物块与传送带的相对路程' },
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    { text: '先判相对运动，再判摩擦方向；摩擦阻碍相对运动，不是阻碍实际运动。', importance: 'gaokao' as const },
    { text: '必须分段：先算能否共速，再比较共速位置与传送带长度。', importance: 'core' as const },
    { text: '倾斜传送带共速后摩擦力不一定为零，要判断 μ ≥ tanθ。', importance: 'hard' as const },
  ]

  const warnings: WarningItem[] = []
  if (mode === 'inclined' && !canStaticSync) {
    warnings.push({ text: '当前 μ < tan15°，即使瞬时共速也不能长期随带匀速。', level: 'warning' })
  }
  if (state.phase === 'exitLeft' || state.phase === 'exitRight') {
    warnings.push({ text: state.phase === 'exitLeft' ? '物块已从左端离开传送带。' : '物块已从右端离开传送带。', level: 'info' })
  }

  return {
    quantities,
    formulas,
    gaokaoPoints,
    warnings: warnings.length > 0 ? warnings : undefined,
    mnemonic: '传送带题：相对速度定方向，共速位置定分段。',
  }
}
