import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { calculateCapacitor } from '@/physics'
import { Card } from '@/components/UI'

// 物理常数定义 (SI)
const EPS0 = 8.854e-12

// 断开电源时保持的电荷基准
const Q_FIXED = EPS0 * (100 * 1e-4) / (5 * 1e-3) * 12

// 联动柱状图的最大参考值（用于折算 0% - 100% 柱高）
const C_MAX = EPS0 * 5 * (200 * 1e-4) / (2 * 1e-3) * 1e12  // 约 442.7 pF
const Q_MAX = C_MAX * 12                                   // 约 5312.4 pC
const U_MAX = 48.0                                         // 约 48 V
const E_MAX = 12.0 / (2 * 1e-3)                             // 6000 V/m

/**
 * 平行板电容器 — 物理量相对百分比联动柱状图
 * 作为 CenterExtra 组件，由 AnimationPage 通过 centerExtraHeight 控制占比
 */
export default function CapacitorChart() {
  const params = useAnimationStore(
    useShallow((s) => s.params)
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
  const { font } = canvasSize

  const { S = 100, d = 5, epsilon_r = 1, U = 12, connected = 1 } = params
  const isConnected = connected >= 0.5

  // 物理计算
  const { C } = calculateCapacitor(EPS0 * epsilon_r, S * 1e-4, d * 1e-3)
  const voltage = isConnected ? U : Q_FIXED / C
  const charge = isConnected ? C * voltage : Q_FIXED
  const field = voltage / (d * 1e-3)

  // 转换成 pF, pC
  const cPF = C * 1e12
  const qPC = charge * 1e12

  // 联动柱状图相对比例百分比
  const pctC = Math.max(2, Math.min(100, (cPF / C_MAX) * 100))
  const pctQ = Math.max(2, Math.min(100, (qPC / Q_MAX) * 100))
  const pctU = Math.max(2, Math.min(100, (voltage / U_MAX) * 100))
  const pctE = Math.max(2, Math.min(100, (field / E_MAX) * 100))

  // 柱状图渲染器
  const renderChartBar = (
    symbol: string,
    valueStr: string,
    unit: string,
    percentage: number,
    label: string,
    gradientClass: string,
    textClass: string
  ) => {
    return (
      <div className="flex flex-col items-center justify-end h-full z-10 w-20">
        {/* 实时值与单位 */}
        <span className={`font-mono font-bold ${textClass} mb-1 transition-all duration-150`} style={{ fontSize: font(10.5) }}>
          {valueStr} <span className="text-neutral-400 font-normal" style={{ fontSize: font(8.5) }}>{unit}</span>
        </span>
        {/* 柱状条背景槽与渐变填充 */}
        <div className="w-6 h-[56px] bg-neutral-100 rounded-md overflow-hidden flex items-end shadow-inner border border-neutral-200/40">
          <div
            className={`w-full ${gradientClass} rounded-t-sm transition-all duration-200 ease-out`}
            style={{ height: `${percentage}%` }}
          />
        </div>
        {/* 物理量符号与物理名称 */}
        <span className={`text-xs font-bold font-mono mt-1 leading-none ${textClass}`}>{symbol}</span>
        <span className="text-neutral-400 mt-0.5 leading-none" style={{ fontSize: font(9.5) }}>{label}</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full p-3">
      <Card className="h-full p-3 flex flex-col justify-between relative overflow-hidden">
        {/* 柱状图头部信息 */}
        <div className="flex justify-between items-center z-10">
          <span className="text-xs font-semibold text-neutral-600">物理量相对百分比联动柱状图 (0% - 100%)</span>
          <span className="text-neutral-400 font-medium font-mono" style={{ fontSize: font(10) }}>
            S = {S} cm² | d = {d.toFixed(1)} mm | {epsilon_r > 1.5 ? '电介质 (εᵣ=5.0)' : '真空环境 (εᵣ=1.0)'}
          </span>
        </div>

        {/* 柱状图主体刻度及渲染 */}
        <div className="flex-1 flex justify-around items-end pt-3 pb-0.5 relative">
          {/* 背景纵向百分比虚线 */}
          <div className="absolute inset-x-0 top-3 border-t border-dashed border-neutral-100 flex justify-between px-2 text-neutral-300 pointer-events-none" style={{ fontSize: font(8.5) }}>
            <span>100%</span>
          </div>
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-neutral-100 flex justify-between px-2 text-neutral-300 pointer-events-none" style={{ fontSize: font(8.5) }}>
            <span>50%</span>
          </div>
          <div className="absolute inset-x-0 bottom-1 border-b border-dashed border-neutral-100 flex justify-between px-2 text-neutral-300 pointer-events-none" style={{ fontSize: font(8.5) }}>
            <span>0%</span>
          </div>

          {/* 四联并排柱 */}
          {renderChartBar('C', cPF.toFixed(1), 'pF', pctC, '电容', 'bg-gradient-to-t from-sky-600 to-sky-400', 'text-sky-600')}
          {renderChartBar('Q', qPC.toFixed(1), 'pC', pctQ, '电量', 'bg-gradient-to-t from-red-600 to-red-400', 'text-red-600')}
          {renderChartBar('U', voltage.toFixed(1), 'V', pctU, '电压', 'bg-gradient-to-t from-amber-700 to-amber-500', 'text-amber-700')}
          {renderChartBar('E', Math.round(field).toString(), 'V/m', pctE, '场强', 'bg-gradient-to-t from-amber-600 to-yellow-500', 'text-amber-600')}
        </div>
      </Card>
    </div>
  )
}
