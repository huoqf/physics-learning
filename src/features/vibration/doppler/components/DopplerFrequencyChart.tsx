import type { FC } from 'react'
import { WAVE_COLORS, CHART_COLORS, CANVAS_COLORS } from '@/theme/physics'
import type { WaveformPoint } from '../hooks/useDopplerPhysics'

interface DopplerFrequencyChartProps {
  mode: number
  frequency: number
  fFront: number
  fBack: number
  fObserver: number
  observerSpeed: number
  sourceWaveform: WaveformPoint[]
  frontWaveform: WaveformPoint[]
  backWaveform: WaveformPoint[]
  observerWaveform: WaveformPoint[]
  isSupersonic: boolean
}

/** 紧凑型微缩示波器波形画布 */
function MiniOscilloscope({
  points,
  color,
  width = 160,
  height = 36,
}: {
  points: WaveformPoint[]
  color: string
  width?: number
  height?: number
}) {
  if (!points || points.length < 2) return null
  const xMax = 0.4
  const yMid = height / 2
  const yAmp = height * 0.42

  const d = points
    .map((pt, i) => {
      const px = (pt.x / xMax) * width
      const py = yMid - pt.y * yAmp
      return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)},${py.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className="w-full h-full block overflow-hidden rounded bg-slate-900/5">
      {/* 示波器中心零基准线与微弱网格 */}
      <line x1={0} y1={yMid} x2={width} y2={yMid} stroke={CANVAS_COLORS.axis} strokeWidth={1} strokeDasharray="3,3" opacity={0.6} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const DopplerFrequencyChart: FC<DopplerFrequencyChartProps> = ({
  mode,
  frequency,
  fFront,
  fBack,
  fObserver,
  observerSpeed,
  sourceWaveform,
  frontWaveform,
  backWaveform,
  observerWaveform,
  isSupersonic,
}) => {
  if (mode === 1) {
    // ════ 模式 1：观察者运动模式紧凑 HUD ════
    return (
      <div className="w-full flex items-center justify-between gap-3 text-xs">
        {/* 1. 静止波源基准 */}
        <div className="flex-1 flex items-center gap-2.5 bg-emerald-50/70 rounded-lg p-1.5 border border-emerald-200/60">
          <div className="w-28 shrink-0">
            <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              静止波源 S
            </div>
            <div className="text-xs font-mono font-bold text-emerald-600">
              f₀ = {frequency.toFixed(1)} Hz
            </div>
          </div>
          <div className="flex-1 h-9">
            <MiniOscilloscope points={sourceWaveform} color={WAVE_COLORS.waveform} />
          </div>
        </div>

        {/* 2. 运动观察者接收 */}
        <div className="flex-1 flex items-center gap-2.5 bg-amber-50/70 rounded-lg p-1.5 border border-amber-200/60">
          <div className="w-32 shrink-0">
            <div className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              运动观察者 O
            </div>
            <div className="text-xs font-mono font-bold text-amber-600">
              f' = {fObserver.toFixed(1)} Hz ({observerSpeed >= 0 ? '偏高' : '偏低'})
            </div>
          </div>
          <div className="flex-1 h-9">
            <MiniOscilloscope points={observerWaveform} color={CHART_COLORS.compareA} />
          </div>
        </div>

        {/* 3. 相对速度指示标签 */}
        <div className="px-2.5 py-1.5 bg-slate-100/80 rounded-lg border border-slate-200 text-xs text-slate-700 flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 font-sans">空间波长与相对截获</span>
          <span className="font-mono font-bold text-slate-800 text-xs">λ = λ₀, v_rel = v + vₒ</span>
        </div>
      </div>
    )
  }

  // ════ 模式 0 & 模式 2：波源运动模式紧凑三联示波器 HUD ════
  return (
    <div className="w-full flex items-center justify-between gap-3 text-xs">
      {/* ── 1. 后方接收仪 (背离) ── */}
      <div className="flex-1 flex items-center gap-2.5 bg-blue-50/70 rounded-lg p-1.5 border border-blue-200/60">
        <div className="w-28 shrink-0">
          <div className="text-[11px] font-bold text-blue-800 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            后方监测站
          </div>
          <div className="text-xs font-mono font-bold text-blue-600">
            f' = {fBack.toFixed(1)} Hz (偏低)
          </div>
        </div>
        <div className="flex-1 h-9">
          <MiniOscilloscope points={backWaveform} color={CHART_COLORS.compareA} />
        </div>
      </div>

      {/* ── 2. 波源基准振荡 ── */}
      <div className="flex-1 flex items-center gap-2.5 bg-emerald-50/70 rounded-lg p-1.5 border border-emerald-200/60">
        <div className="w-28 shrink-0">
          <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            波源本征基准
          </div>
          <div className="text-xs font-mono font-bold text-emerald-600">
            f₀ = {frequency.toFixed(1)} Hz
          </div>
        </div>
        <div className="flex-1 h-9">
          <MiniOscilloscope points={sourceWaveform} color={WAVE_COLORS.waveform} />
        </div>
      </div>

      {/* ── 3. 前方接收仪 (迎面 / 激波) ── */}
      <div className="flex-1 flex items-center gap-2.5 bg-rose-50/70 rounded-lg p-1.5 border border-rose-200/60">
        <div className="w-32 shrink-0">
          <div className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            {isSupersonic ? '前方激波 (音爆)' : '前方监测站'}
          </div>
          <div className="text-xs font-mono font-bold text-rose-600">
            {isSupersonic ? '多普勒公式失效' : `f' = ${fFront.toFixed(1)} Hz (偏高)`}
          </div>
        </div>
        <div className="flex-1 h-9">
          <MiniOscilloscope points={frontWaveform} color={isSupersonic ? WAVE_COLORS.waveformB : CHART_COLORS.compareB} />
        </div>
      </div>
    </div>
  )
}
