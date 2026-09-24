import { FC } from 'react'
import { RelationChart } from '@/components/Chart'
import { WAVE_COLORS, CHART_COLORS, PHYSICS_COLORS } from '@/theme/physics'
import type { WaveformPoint } from '../hooks/useDopplerPhysics'

interface DopplerFrequencyChartProps {
  frequency: number
  fFront: number
  fBack: number
  sourceWaveform: WaveformPoint[]
  frontWaveform: WaveformPoint[]
  backWaveform: WaveformPoint[]
  /** 超音速时前方无规则波列，多普勒公式失效，仅作激波示意 */
  isSupersonic: boolean
}

export const DopplerFrequencyChart: FC<DopplerFrequencyChartProps> = ({
  frequency,
  fFront,
  fBack,
  sourceWaveform,
  frontWaveform,
  backWaveform,
  isSupersonic,
}) => {
  return (
    <div className="w-full h-full min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm flex flex-row gap-2">
      {/* ── 1. 后方观察者接收示波器 (波形拉疏，频率降低) ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            后方接收（背离）
          </span>
          <span className="text-blue-600 font-mono">
            {`f' = ${fBack.toFixed(1)} Hz (偏低)`}
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <RelationChart
            title=""
            points={backWaveform}
            xLabel="t / s"
            yLabel="y"
            xDomain={[0, 0.4]}
            yDomain={[-1.2, 1.2]}
            color={CHART_COLORS.compareA}
            showGrid
            showZeroLine
          />
        </div>
      </div>

      {/* ── 2. 本征波源基准示波器 ── */}
      <div className="flex-1 min-w-0 flex flex-col border-x border-slate-100 px-1">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            波源基准振荡
          </span>
          <span className="text-emerald-600 font-mono">
            {`f₀ = ${frequency.toFixed(1)} Hz`}
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <RelationChart
            title=""
            points={sourceWaveform}
            xLabel="t / s"
            yLabel="y"
            xDomain={[0, 0.4]}
            yDomain={[-1.2, 1.2]}
            color={WAVE_COLORS.waveform}
            showGrid
            showZeroLine
          />
        </div>
      </div>

      {/* ── 3. 前方观察者接收示波器 (波形挤密，频率升高) ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            {isSupersonic ? '前方激波（马赫锥）' : '前方接收（迎面接近）'}
          </span>
          <span className="text-rose-600 font-mono">
            {isSupersonic ? '多普勒公式失效' : `f' = ${fFront.toFixed(1)} Hz (偏高)`}
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <RelationChart
            title=""
            points={frontWaveform}
            xLabel="t / s"
            yLabel="y"
            xDomain={[0, 0.4]}
            yDomain={[-1.2, 1.2]}
            color={PHYSICS_COLORS.velocity}
            showGrid
            showZeroLine
          />
        </div>
      </div>
    </div>
  )
}
