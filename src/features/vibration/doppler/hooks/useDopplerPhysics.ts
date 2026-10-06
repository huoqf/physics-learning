import { useMemo } from 'react'
import {
  calculateDopplerWavelength,
  calculateDopplerFrequency,
  calculateMachConeGeometry,
  getEffectiveDopplerSpeeds,
  type WavefrontCircle,
  type MachConeGeometry,
} from '@/physics/vibration/doppler'

export interface DopplerParams {
  waveSpeed?: number // 真实介质波速 v (m/s)
  sourceSpeed?: number // 真实波源速度 vs (m/s)
  frequency?: number // 固有频率 f0 (Hz)
  observerSpeed?: number // 观察者速度 vo (m/s)
  mode?: number // 0: 波源运动, 1: 观察者运动, 2: 超音速激波
  time: number // s
}

export interface WaveformPoint {
  x: number // 时间 t
  y: number // 振动位移
}

export interface DopplerPhysicsResult {
  waveSpeed: number
  sourceSpeed: number
  frequency: number
  observerSpeed: number
  mode: number
  sourceX: number
  sourceY: number
  observerX: number
  observerY: number
  lambda0: number
  lambdaFront: number
  lambdaBack: number
  fFront: number
  fBack: number
  /** 模式1：运动观察者接收频率 */
  fObserver: number
  /** 中央站台处接收频率 */
  fCentral: number
  /** 波源是否已掠过中央观察站台 (x=0) */
  hasPassedCentral: boolean
  wavefronts: WavefrontCircle[]
  sourceWaveform: WaveformPoint[]
  frontWaveform: WaveformPoint[]
  backWaveform: WaveformPoint[]
  observerWaveform: WaveformPoint[]
  /** 是否处于超音速（vs ≥ v）状态 */
  isSupersonic: boolean
  /** 超音速马赫锥几何 */
  machCone: MachConeGeometry | null
  /** 前方观察者是否正被波峰穿过（瞬时闪烁） */
  pulseFront: boolean
  /** 后方观察者是否正被波峰穿过（瞬时闪烁） */
  pulseBack: boolean
  /** 运动观察者是否正被波峰穿过（瞬时闪烁） */
  pulseObserver: boolean
  /** 前方波长标注尺寸区间 (x1, x2) */
  frontLambdaRange: { x1: number; x2: number; y: number } | null
  /** 后方波长标注尺寸区间 (x1, x2) */
  backLambdaRange: { x1: number; x2: number; y: number } | null
}

export function useDopplerPhysics(params: DopplerParams): DopplerPhysicsResult {
  const {
    waveSpeed = 340,
    sourceSpeed = 100,
    frequency = 10,
    observerSpeed = 0,
    mode = 0,
    time,
  } = params

  return useMemo(() => {
    // 统一单一真源速度
    const { vs, vo } = getEffectiveDopplerSpeeds(mode, sourceSpeed, observerSpeed, waveSpeed)

    // 真实物理量计算
    const lambda0 = waveSpeed / Math.max(0.1, frequency)
    const lambdaFront = calculateDopplerWavelength(waveSpeed, vs, frequency, 'front')
    const lambdaBack = calculateDopplerWavelength(waveSpeed, vs, frequency, 'back')

    const fFront = calculateDopplerFrequency(frequency, waveSpeed, vs, 0)
    const fBack = calculateDopplerFrequency(frequency, waveSpeed, -vs, 0)
    const fObserver = calculateDopplerFrequency(frequency, waveSpeed, vs, vo)

    // ── 空间几何映射与运动轨迹 ──
    // 物理视野宽 48m (-24m ~ +24m)，高 24m (-12m ~ +12m)
    const vVisual = 3.6 // 空间波前扩散速度 (m/s)
    const visualPeriod = 0.55 // 每 0.55 秒发射一个波前圆 (稳定维持 7~9 个清晰圆环)
    const maxRadius = 15 // 最大扩散半径 (m)，与视野高度 24m 完美契合，绝不切边

    let currentSourceX = 0
    let currentObserverX = 0
    let hasPassedCentral = false
    let machCone: MachConeGeometry | null = null

    const wavefronts: WavefrontCircle[] = []

    // ── 1. 计算波源与观察者的当前运动状态 ──
    let xStart = -10
    let xEnd = 10
    let distance = 20
    let vsVisual = 0
    let tourDuration = 10

    if (mode === 0) {
      // 模式 0：波源在两站之间 [-10m, +10m] 匀速巡航
      const beta = Math.min(0.85, Math.max(0.05, vs / waveSpeed))
      vsVisual = vVisual * beta
      xStart = -10
      xEnd = 10
      distance = xEnd - xStart
      tourDuration = distance / vsVisual

      const progress = Math.min(1, Math.max(0, time / tourDuration))
      currentSourceX = xStart + progress * distance
      currentObserverX = 0
      hasPassedCentral = currentSourceX >= 0
    } else if (mode === 1) {
      // 模式 1：波源静止在原点 (0, 0)，观察者小车从 -14m 开向 +14m
      currentSourceX = 0
      const voBeta = vo / waveSpeed
      const voVisual = vVisual * voBeta
      xStart = -14
      xEnd = 14
      distance = xEnd - xStart
      const obsDuration = Math.abs(distance / (voVisual || 1))

      const progress = Math.min(1, Math.max(0, time / obsDuration))
      currentObserverX = xStart + progress * distance
      hasPassedCentral = currentObserverX >= 0
    } else {
      // 模式 2：超音速激波 (vs >= waveSpeed)
      const beta = vs / waveSpeed
      vsVisual = vVisual * beta
      xStart = -11
      xEnd = 11
      distance = xEnd - xStart
      tourDuration = distance / vsVisual

      const progress = Math.min(1, Math.max(0, time / tourDuration))
      currentSourceX = xStart + progress * distance
      currentObserverX = 0
      hasPassedCentral = currentSourceX >= 0

      // 计算马赫锥切线几何
      machCone = calculateMachConeGeometry(
        currentSourceX,
        0,
        vVisual,
        vsVisual,
        28,
      )
    }

    // ── 2. 生成符合物理第一性原理的动态膨胀波前圆环 ──
    // 铁律：
    // a. 离散世界时间格点发射序列：t_i = i * visualPeriod
    // b. 圆心永久锁定在介质中：x_emit = x_source(t_i)，绝不随后续时间或当前波源漂移
    // c. 半径以真实波速连续膨胀：R_i(t) = vVisual * (time - t_i)，dR/dt = vVisual
    const latestIndex = Math.floor(time / visualPeriod)
    const earliestTime = time - maxRadius / vVisual
    const earliestIndex = Math.floor(earliestTime / visualPeriod)

    for (let i = latestIndex; i >= earliestIndex; i--) {
      const tEmit = i * visualPeriod
      const elapsed = time - tEmit
      if (elapsed < 0) continue
      const radius = vVisual * elapsed
      if (radius > maxRadius) continue

      // 计算该波前在历史发射时刻 tEmit 时的介质空间圆心位置（严格独立于当前 time）
      let sx = 0
      if (mode === 0 || mode === 2) {
        const pEmit = Math.min(1, tEmit / tourDuration)
        sx = xStart + pEmit * distance
      } else {
        // 模式 1：波源静止在原点
        sx = 0
      }

      // 透明度随扩散半径平滑衰减
      const opacity = Math.max(0.12, 1 - (radius / maxRadius) * 0.85)

      wavefronts.push({
        tEmit,
        sourceX: sx,
        sourceY: 0,
        radius,
        opacity,
      })
    }

    // ── 3. 观察者位置脉冲截获检测 (以真实膨胀半径扫过站点为触发条件) ──
    const stationFrontX = 18
    const stationBackX = -18
    let pulseFront = false
    let pulseBack = false
    let pulseObserver = false

    const pulseTolerance = 0.45 // 判定波峰到达的距离容差 (m)

    for (const w of wavefronts) {
      if (w.radius < 0.2) continue

      // 前方固定站台
      const dFront = Math.abs(stationFrontX - w.sourceX)
      if (Math.abs(dFront - w.radius) < pulseTolerance) {
        pulseFront = true
      }

      // 后方固定站台
      const dBack = Math.abs(stationBackX - w.sourceX)
      if (Math.abs(dBack - w.radius) < pulseTolerance) {
        pulseBack = true
      }

      // 运动观察者
      if (mode === 1) {
        const dObs = Math.abs(currentObserverX - w.sourceX)
        if (Math.abs(dObs - w.radius) < pulseTolerance) {
          pulseObserver = true
        }
      }
    }

    // ── 波长尺寸标注区间 (相邻两波前圆在轨道上的间距) ──
    let frontLambdaRange: { x1: number; x2: number; y: number } | null = null
    let backLambdaRange: { x1: number; x2: number; y: number } | null = null

    if (wavefronts.length >= 3) {
      // 选取第1个和第2个成熟圆环
      const w1 = wavefronts[1]
      const w2 = wavefronts[2]
      if (w1 && w2) {
        // 前方圆环交点
        const frontX1 = w1.sourceX + w1.radius
        const frontX2 = w2.sourceX + w2.radius
        if (frontX1 > frontX2) {
          frontLambdaRange = { x1: frontX2, x2: frontX1, y: 0 }
        } else {
          frontLambdaRange = { x1: frontX1, x2: frontX2, y: 0 }
        }

        // 后方圆环交点
        const backX1 = w1.sourceX - w1.radius
        const backX2 = w2.sourceX - w2.radius
        if (backX1 < backX2) {
          backLambdaRange = { x1: backX1, x2: backX2, y: 0 }
        } else {
          backLambdaRange = { x1: backX2, x2: backX1, y: 0 }
        }
      }
    }

    const fCentral = hasPassedCentral ? fBack : fFront

    // ── 示波器时域波形点采样 ──
    const ptsCount = 120
    const sourceWaveform: WaveformPoint[] = []
    const frontWaveform: WaveformPoint[] = []
    const backWaveform: WaveformPoint[] = []
    const observerWaveform: WaveformPoint[] = []

    for (let i = 0; i < ptsCount; i++) {
      const tau = (i / ptsCount) * 0.4
      sourceWaveform.push({
        x: tau,
        y: Math.sin(2 * Math.PI * frequency * (time - tau)),
      })
      frontWaveform.push({
        x: tau,
        y: Math.sin(2 * Math.PI * fFront * (time - tau)),
      })
      backWaveform.push({
        x: tau,
        y: Math.sin(2 * Math.PI * fBack * (time - tau)),
      })
      observerWaveform.push({
        x: tau,
        y: Math.sin(2 * Math.PI * fObserver * (time - tau)),
      })
    }

    return {
      waveSpeed,
      sourceSpeed: vs,
      frequency,
      observerSpeed: vo,
      mode,
      sourceX: currentSourceX,
      sourceY: 0,
      observerX: currentObserverX,
      observerY: 0,
      lambda0,
      lambdaFront,
      lambdaBack,
      fFront,
      fBack,
      fObserver,
      fCentral,
      hasPassedCentral,
      wavefronts,
      sourceWaveform,
      frontWaveform,
      backWaveform,
      observerWaveform,
      isSupersonic: vs >= waveSpeed,
      machCone,
      pulseFront,
      pulseBack,
      pulseObserver,
      frontLambdaRange,
      backLambdaRange,
    }
  }, [waveSpeed, sourceSpeed, frequency, observerSpeed, mode, time])
}
