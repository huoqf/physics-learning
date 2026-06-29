import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { GRAVITY, calculateFreeFall } from '../../../physics'

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
    const { v: vA } = calculateFreeFall(v0, g, time)
    const { v: vB } = calculateFreeFall(v0, g, time)
    const baseDragA = objectA === 0 ? 0.001 : 0.01
    const baseDragB = objectB === 0 ? 0.02 : 0.015
    const dragK_A = pressure * baseDragA
    const dragK_B = pressure * baseDragB
    const fAirA = dragK_A * vA * Math.abs(vA)
    const fAirB = dragK_B * vB * Math.abs(vB)
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
        { text: '伽利略用"微斜面实验+合理外推"证明了自由落体规律', importance: 'gaokao' as const },
        { text: '实际落体运动中，若重力远大于阻力，可近似看作自由落体', importance: 'hard' as const },
      ],
    }
  } else {
    const latitude = p.latitude ?? 45
    const altitude = p.altitude ?? 0
    const dripPeriod = p.dripPeriod ?? 0.5
    const R_EARTH = 6371e3
    const gLat = 9.780 * (1 + 0.005302 * Math.sin(latitude * Math.PI / 180) ** 2)
    const gAlt = gLat * (R_EARTH / (R_EARTH + altitude * 1000)) ** 2
    const h2T = 0.5 * gAlt * (2 * dripPeriod) ** 2
    const gMeasured = (2 * h2T) / ((2 * dripPeriod) ** 2)

    return {
      quantities: [
        ...base,
        { label: '纬度修正 g', value: gLat, unit: 'm/s²' },
        { label: '海拔修正 g\'', value: gAlt, unit: 'm/s²' },
        { label: '2T内下落 h', value: h2T, unit: 'm' },
        { label: '测得 g', value: gMeasured, unit: 'm/s²', highlight: 'positive' as const },
      ],
      formulas: [
        { name: '滴水法核心', latex: 'h = \\frac{1}{2}g(2T)^2', level: 'important', condition: '第n滴与第n+2滴时间间隔为2T' },
        { name: '纬度影响', latex: 'g = 9.780(1 + 0.005302\\sin^2\\phi)', level: 'supplementary' },
        { name: '海拔影响', latex: "g' = g_0 \\left(\\frac{R}{R+H}\\right)^2", level: 'supplementary' },
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
