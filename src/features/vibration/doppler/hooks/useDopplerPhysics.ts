import { useMemo } from 'react'
import {
  calculateDopplerWavelength,
  calculateDopplerFrequency,
  generateWavefronts,
  type WavefrontCircle,
} from '@/physics/vibration/doppler'

export interface DopplerParams {
  waveSpeed?: number // 真实介质波速 v (m/s)
  sourceSpeed?: number // 真实波源速度 vs (m/s)
  frequency?: number // 固有频率 f0 (Hz)
  observerSpeed?: number // 观察者速度 vo (m/s)
  mode?: number // 0: 波源运动, 1: 观察者运动, 2: 超音速临界
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
  lambda0: number
  lambdaFront: number
  lambdaBack: number
  fFront: number
  fBack: number
  wavefronts: WavefrontCircle[]
  sourceWaveform: WaveformPoint[]
  frontWaveform: WaveformPoint[]
  backWaveform: WaveformPoint[]
  /** 是否处于超音速（vs ≥ v）状态：此时前方无规则波列，多普勒频率公式失效，应表述为激波/马赫锥 */
  isSupersonic: boolean
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
    // 真实物理速度
    let vs = sourceSpeed
    let vo = observerSpeed

    if (mode === 1) {
      vs = 0
    } else if (mode === 2) {
      vs = Math.max(waveSpeed * 1.2, sourceSpeed)
    }

    // 真实物理量计算
    const lambda0 = waveSpeed / Math.max(0.1, frequency)
    const lambdaFront = calculateDopplerWavelength(waveSpeed, vs, frequency, 'front')
    const lambdaBack = calculateDopplerWavelength(waveSpeed, vs, frequency, 'back')

    const fFront = calculateDopplerFrequency(frequency, waveSpeed, vs, vo)
    const fBack = calculateDopplerFrequency(frequency, waveSpeed, -vs, -vo)

    // ── 空间几何波前生成 ──
    // 为了让学生在有限屏幕视野 (60m × 25m) 内观察到完整清晰的偏心圆波阵面扩散：
    // 保持声速比 β = vs / v 完全一致（几何压缩比 λ'/λ0 严格保真）
    const beta = Math.min(1.5, Math.max(0, vs / waveSpeed))
    const vVisual = 8 // 空间波前扩散速度 (m/s)
    const vsVisual = vVisual * beta // 波源空间移动速度 (m/s)
    const x0 = -22 // 起始 X 位置

    // 单程平滑巡航时间周期 (以 6 秒为往返循环)
    const tripDuration = 5.5
    const cycleTime = time % tripDuration
    const currentX = x0 + vsVisual * cycleTime

    // 空间波前圆环数组 (每秒发射 3 个清晰波阵面圆环)
    const visualFreq = 3
    const wavefronts = generateWavefronts(
      cycleTime,
      vVisual,
      vsVisual,
      visualFreq,
      x0,
      48,
    )

    // ── 示波器时域波形点采样 ──
    const ptsCount = 50
    const sourceWaveform: WaveformPoint[] = []
    const frontWaveform: WaveformPoint[] = []
    const backWaveform: WaveformPoint[] = []

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
    }

    return {
      waveSpeed,
      sourceSpeed: vs,
      frequency,
      observerSpeed: vo,
      mode,
      sourceX: currentX,
      sourceY: 0,
      lambda0,
      lambdaFront,
      lambdaBack,
      fFront,
      fBack,
      wavefronts,
      sourceWaveform,
      frontWaveform,
      backWaveform,
      isSupersonic: vs >= waveSpeed,
    }
  }, [waveSpeed, sourceSpeed, frequency, observerSpeed, mode, time])
}
