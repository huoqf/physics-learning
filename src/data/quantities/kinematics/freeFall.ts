import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import {
  GRAVITY,
  calcGByLatitude,
  calcGByAltitude,
  FREE_FALL_MATERIALS,
  FREE_FALL_TUBE_HEIGHT,
  precomputeFreeFallWithDrag,
  getPhysicsAtTime,
} from '../../../physics'

interface Params {
  advancedMode: number
  v0: number
  g: number
  pressure: number
  objectA: number
  objectB: number
  latitude: number
  altitude: number
  dripPeriod: number
}

const DEFAULTS: ParamDefs<Params> = {
  advancedMode: { default: 0 },
  v0: { default: 0 },
  g: { default: GRAVITY },
  pressure: { default: 0 },
  objectA: { default: 0 },
  objectB: { default: 0 },
  latitude: { default: 45 },
  altitude: { default: 0 },
  dripPeriod: { default: 0.5 },
}

export function handleFreeFall(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-free-fall') return null
  const p = normalizeParams(params, DEFAULTS)
  const advancedMode = p.advancedMode ?? 0

  if (advancedMode === 0) {
    const v0 = p.v0 ?? 0
    const g = p.g ?? GRAVITY
    const pressure = p.pressure ?? 0
    const objectA = p.objectA ?? 0
    const objectB = p.objectB ?? 0
    const matA = objectA === 1 ? FREE_FALL_MATERIALS.coin : FREE_FALL_MATERIALS.ironBall
    const matB = objectB === 1 ? FREE_FALL_MATERIALS.paper : FREE_FALL_MATERIALS.feather
    const dragK_A = pressure * matA.baseDragK
    const dragK_B = pressure * matB.baseDragK
    const trajA = precomputeFreeFallWithDrag(v0, g, dragK_A, matA.mass, FREE_FALL_TUBE_HEIGHT)
    const trajB = precomputeFreeFallWithDrag(v0, g, dragK_B, matB.mass, FREE_FALL_TUBE_HEIGHT)
    const stateA = getPhysicsAtTime(trajA.points, time, trajA.groundTime)
    const stateB = getPhysicsAtTime(trajB.points, time, trajB.groundTime)
    const fAirA = stateA.fDrag
    const fAirB = stateB.fDrag
    const envStatus = pressure < 0.01 ? '趋近自由落体' : pressure < 0.3 ? '空气阻力较小' : '空气阻力显著'

    return {
      quantities: [
        ...base,
        { label: 'A 动力学方程', value: pressure < 0.01 ? 'a = g' : 'mg - f = ma', unit: '' },
        { label: 'B 动力学方程', value: pressure < 0.01 ? 'a = g' : 'mg - f = ma', unit: '' },
        { label: 'A 阻力 f_A', value: fAirA, unit: 'N', highlight: fAirA > 0.01 ? 'negative' as const : 'zero' as const },
        { label: 'B 阻力 f_B', value: fAirB, unit: 'N', highlight: fAirB > 0.01 ? 'negative' as const : 'zero' as const },
        { label: '环境状态', value: envStatus, unit: '', highlight: pressure < 0.01 ? 'positive' as const : undefined },
      ],
      formulas: [
        { name: '自由落体速度', latex: 'v = gt', level: 'core', condition: '初速度为零、仅受重力' },
        { name: '自由落体位移', latex: 'h = \\frac{1}{2}gt^2', level: 'core', condition: '初速度为零、仅受重力' },
        { name: '速度位移关系', latex: 'v^2 = 2gh', level: 'important', condition: '初速度为零、仅受重力' },
      ],
      gaokaoPoints: [
        { text: '自由落体是初速度为零、仅受重力、加速度为g的匀加速运动', importance: 'core' as const },
        { text: '伽利略用“斜面实验（‘冲淡’重力）+ 合理外推”证明了自由落体规律', importance: 'gaokao' as const },
        { text: '实际落体运动中，若重力远大于阻力，可近似看作自由落体', importance: 'hard' as const },
      ],
    }
  } else {
    const latitude = p.latitude ?? 45
    const altitude = p.altitude ?? 0
    const dripPeriod = p.dripPeriod ?? 0.5

    // 复用物理引擎函数，保证面板与动画 g 值完全一致（calcGByAltitude 接收 km）
    const gLocal = calcGByLatitude(latitude)
    const gFinal = calcGByAltitude(gLocal, altitude)
    const h2T = 0.5 * gFinal * (2 * dripPeriod) ** 2

    return {
      quantities: [
        ...base,
        { label: '当前 g', value: gFinal, unit: 'm/s²', highlight: 'positive' as const },
        { label: '纬度修正 g', value: gLocal, unit: 'm/s²' },
        { label: '2T内下落 h', value: h2T, unit: 'm' },
      ],
      formulas: [
        { name: '滴水法核心', latex: 'h = \\frac{1}{2}g(2T)^2', level: 'important', condition: '第 n+2 滴刚要由静止离开管口、第 n 滴已下落 2T 时' },
        { name: '纬度影响', latex: 'g = 9.780327(1 + 0.0053024\\sin^2\\phi - 0.0000058\\sin^2 2\\phi)', level: 'supplementary', condition: '地球表面海平面经验公式（φ 为地理纬度，由赤道向两极增大）' },
        { name: '海拔影响', latex: "g' = g_0 \\left(\\frac{R}{R+H}\\right)^2", level: 'supplementary', condition: '忽略地球自转影响的近似球体模型（R 为地球半径，H 为海拔）' },
        { name: '重力与万有引力', latex: 'mg = G\\frac{Mm}{R^2}', level: 'core', condition: '忽略自转时' },
      ],
      gaokaoPoints: [
        { text: '重力加速度g随纬度升高而增大，随高度增加而减小', importance: 'core' as const },
        { text: '滴水法测g相当于反向利用打点计时器，周期T的精度是关键', importance: 'gaokao' as const },
        { text: '在地球两极，物体受到的重力等于万有引力', importance: 'hard' as const },
      ],
    }
  }
}
