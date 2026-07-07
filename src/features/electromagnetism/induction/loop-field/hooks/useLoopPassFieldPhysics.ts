import { useMemo } from 'react'
import { evaluateLoopSegment } from '@/physics'
import type { LoopPassState } from '@/physics'

export interface LoopPassFieldParams {
  dimensionPreset: number // 0=窄线框 d<D, 1=宽线框 d>D
  domainAxis: number      // 0=以位移 x 为横轴, 1=以时间 t 为横轴
  loopWidth: number       // d (cm，由 UI 传入 2~10 cm)
  fieldWidth: number      // D (cm，由 UI 传入 4~12 cm)
  constantSpeed: number   // v (m/s)
  magneticB: number       // B (T)
}

export interface LoopPassFieldPhysicsResult {
  d: number // 米
  D: number // 米
  L: number // 垂直切割边长，固定 0.05m (5cm)
  R: number // 总电阻，固定 0.5Ω
  v: number
  B: number
  frontX: number // 当前前端坐标 (m)
  backX: number  // 当前后端坐标 (m)
  currentTime: number
  T_max: number
  xMin: number
  xMax: number
  state: LoopPassState
  phi: number
  currentI: number
  forceAmpere: number
  emf: number
  powerHeat: number
  /** 以位移 x/cm 为横轴的图表采样点 */
  phiPoints: Array<{ x: number; y: number }>
  iPoints: Array<{ x: number; y: number }>
  faPoints: Array<{ x: number; y: number }>
  /** 以时间 t/s 为横轴的图表采样点 */
  phiPointsT: Array<{ x: number; y: number }>
  iPointsT: Array<{ x: number; y: number }>
  faPointsT: Array<{ x: number; y: number }>
  phiMax: number
  iMax: number
  faMax: number
}

export function useLoopPassFieldPhysics(
  params: LoopPassFieldParams,
  time: number
): LoopPassFieldPhysicsResult {
  const {
    dimensionPreset = 0,
    loopWidth = 4.0,
    fieldWidth = 8.0,
    constantSpeed = 1.0,
    magneticB = 1.0,
  } = params

  // 为了保证与选项卡联动，若 dimensionPreset===0 且 d >= D，或 Preset===1 且 d <= D，我们做合理的参数自适应保护
  let dCm = loopWidth
  let DCm = fieldWidth
  if (dimensionPreset === 0 && dCm >= DCm) {
    dCm = 4.0
    DCm = 8.0
  } else if (dimensionPreset === 1 && dCm <= DCm) {
    dCm = 8.0
    DCm = 4.0
  }

  const d = dCm / 100 // 转为米
  const D = DCm / 100 // 转为米
  const v = Math.max(0.1, constantSpeed)
  const B = magneticB
  const L = 0.05 // 边长 5cm
  const R = 0.5  // 电阻 0.5Ω

  const xMin = -0.02
  const xMax = D + d + 0.02
  const totalDist = xMax - xMin
  const T_max = useMemo(() => totalDist / v, [totalDist, v])

  // 当前播放时间到当前位移 x 的映射
  const currentT = time % T_max
  const frontX = xMin + v * currentT
  const backX = frontX - d

  // 计算瞬时物理量
  const currentResult = useMemo(
    () => evaluateLoopSegment(frontX, d, D, B, L, R, v),
    [frontX, d, D, B, L, R, v]
  )

  // 生成图表采样点序列 (以位移 x 为横轴，并对 0, d, D, D+d 四个突变边界前后进行高密度阶跃采样)
  // 同时生成以时间 t 为横轴的对应序列（t = (x - xMin) / v）
  const { phiPoints, iPoints, faPoints, phiPointsT, iPointsT, faPointsT, phiMax, iMax, faMax } = useMemo(() => {
    const ptsPhi: Array<{ x: number; y: number }> = []
    const ptsI: Array<{ x: number; y: number }> = []
    const ptsFA: Array<{ x: number; y: number }> = []
    const ptsPhiT: Array<{ x: number; y: number }> = []
    const ptsIT: Array<{ x: number; y: number }> = []
    const ptsFAT: Array<{ x: number; y: number }> = []

    const count = 120
    const criticalX = [0, d, D, D + d]
    const eps = 1e-6

    // 把均匀采样点与临界突变点结合排优
    const xSet = new Set<number>()
    for (let i = 0; i <= count; i++) {
      const xVal = xMin + (i / count) * totalDist
      xSet.add(Number(xVal.toFixed(6)))
    }
    for (const cx of criticalX) {
      xSet.add(Number((cx - eps).toFixed(6)))
      xSet.add(Number(cx.toFixed(6)))
      xSet.add(Number((cx + eps).toFixed(6)))
    }

    const sortedX = Array.from(xSet).sort((a, b) => a - b)

    let pMaxVal = 1e-4
    let iMaxVal = 1e-4
    let fMaxVal = 1e-4

    for (const xVal of sortedX) {
      if (xVal < xMin - eps || xVal > xMax + eps) continue
      const res = evaluateLoopSegment(xVal, d, D, B, L, R, v)
      // 位移横轴 (cm)
      const xDisplay = Number((xVal * 100).toFixed(3))
      ptsPhi.push({ x: xDisplay, y: res.phi })
      ptsI.push({ x: xDisplay, y: res.currentI })
      ptsFA.push({ x: xDisplay, y: res.forceAmpere })
      // 时间横轴 (s)
      const tDisplay = Number(((xVal - xMin) / v).toFixed(4))
      ptsPhiT.push({ x: tDisplay, y: res.phi })
      ptsIT.push({ x: tDisplay, y: res.currentI })
      ptsFAT.push({ x: tDisplay, y: res.forceAmpere })

      if (res.phi > pMaxVal) pMaxVal = res.phi
      if (Math.abs(res.currentI) > iMaxVal) iMaxVal = Math.abs(res.currentI)
      if (res.forceAmpere > fMaxVal) fMaxVal = res.forceAmpere
    }

    return {
      phiPoints: ptsPhi,
      iPoints: ptsI,
      faPoints: ptsFA,
      phiPointsT: ptsPhiT,
      iPointsT: ptsIT,
      faPointsT: ptsFAT,
      phiMax: pMaxVal * 1.15,
      iMax: iMaxVal * 1.25,
      faMax: fMaxVal * 1.25,
    }
  }, [xMin, xMax, totalDist, d, D, B, L, R, v])

  return {
    d,
    D,
    L,
    R,
    v,
    B,
    frontX,
    backX,
    currentTime: currentT,
    T_max,
    xMin,
    xMax,
    state: currentResult.state,
    phi: currentResult.phi,
    currentI: currentResult.currentI,
    forceAmpere: currentResult.forceAmpere,
    emf: currentResult.emf,
    powerHeat: currentResult.powerHeat,
    phiPoints,
    iPoints,
    faPoints,
    phiPointsT,
    iPointsT,
    faPointsT,
    phiMax,
    iMax,
    faMax,
  }
}
