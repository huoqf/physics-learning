import { FC, useMemo } from 'react'
import { SCENE_COLORS } from '@/theme/physics'
import { useAnimationStore } from '@/stores'
import { useCanvasSize } from '@/utils'
import { calculateCircuitAnalysis } from '@/physics'
import { BarChart3 } from 'lucide-react'
import { Card } from '@/components/UI'
import { EnergyBars } from '@/components/Physics'

export const CircuitAnalysisCenterExtra: FC = () => {
  const params = useAnimationStore((s) => s.params)
  const [, canvasSize] = useCanvasSize({ width: 400, height: 200 })
  const { font } = canvasSize

  const mode = params.mode ?? 0 // 0=基础, 1=进阶
  const subMode = params.subMode ?? 0 // 0=串联, 1=并联
  const R1 = params.R1 ?? 20
  const R2 = params.R2 ?? 10
  const R3 = params.R3 ?? 30
  const U = params.U ?? 12
  const showChart = params.showChart ?? 1

  // 物理量实时计算（使用共享纯函数）
  const circuitData = useMemo(
    () => calculateCircuitAnalysis(mode, subMode, R1, R2, R3, U),
    [mode, subMode, R1, R2, R3, U]
  )

  // 补算功率物理量
  const extendedData = useMemo(() => {
    const P1 = circuitData.I1 * circuitData.U1
    const P2 = circuitData.I2 * circuitData.U2
    const P3 = circuitData.I3 * circuitData.U2
    const Ptotal = circuitData.Itotal * U
    return { P1, P2, P3, Ptotal }
  }, [circuitData, U])

  // 滑动变阻器电功率最值考点检测
  const R2_target = mode === 1 ? (R1 * R3) / (R1 + R3) : R1
  const isMaxPowerPoint = Math.abs(R2 - R2_target) <= 1.5

  if (showChart === 0) {
    return (
      <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50">
        <Card className="flex-1 p-4 flex flex-col items-center justify-center text-center">
          <BarChart3 className="w-12 h-12 text-neutral-300 mb-2 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-neutral-600 mb-1">分配对比柱状图已隐藏</h3>
          <p className="text-xs text-neutral-400 max-w-xs">
            您可以在左侧控制面板中开启「显示分配对比柱状图」，直观观察电压、电流在不同元件之间的此消彼长分配规律。
          </p>
        </Card>
      </div>
    )
  }

  // 电压 BarItems
  const uItems = mode === 0 
    ? [
        { key: 'r1', label: 'R₁', value: circuitData.U1, color: SCENE_COLORS.charts.circuitR1 },
        { key: 'r2', label: 'R₂ (变)', value: circuitData.U2, color: SCENE_COLORS.charts.circuitR2 },
        { key: 'total', label: '总电路', value: U, color: SCENE_COLORS.charts.circuitTotal },
      ]
    : [
        { key: 'r1', label: 'R₁', value: circuitData.U1, color: SCENE_COLORS.charts.circuitR1 },
        { key: 'r2', label: 'R₂ (变)', value: circuitData.U2, color: SCENE_COLORS.charts.circuitR2 },
        { key: 'r3', label: 'R₃', value: circuitData.U2, color: SCENE_COLORS.charts.circuitR3 },
        { key: 'total', label: '总电路', value: U, color: SCENE_COLORS.charts.circuitTotal },
      ]

  // 电流 BarItems
  const iItems = mode === 0 
    ? [
        { key: 'r1', label: 'R₁', value: circuitData.I1, color: SCENE_COLORS.charts.circuitR1 },
        { key: 'r2', label: 'R₂ (变)', value: circuitData.I2, color: SCENE_COLORS.charts.circuitR2 },
        { key: 'total', label: '总电路', value: circuitData.Itotal, color: SCENE_COLORS.charts.circuitTotal },
      ]
    : [
        { key: 'r1', label: 'R₁', value: circuitData.I1, color: SCENE_COLORS.charts.circuitR1 },
        { key: 'r2', label: 'R₂ (变)', value: circuitData.I2, color: SCENE_COLORS.charts.circuitR2 },
        { key: 'r3', label: 'R₃', value: circuitData.I3, color: SCENE_COLORS.charts.circuitR3 },
        { key: 'total', label: '总电路', value: circuitData.Itotal, color: SCENE_COLORS.charts.circuitTotal },
      ]

  // 功率 BarItems
  const pItems = mode === 0 
    ? [
        { key: 'r1', label: 'R₁', value: extendedData.P1, color: SCENE_COLORS.charts.circuitR1 },
        { key: 'r2', label: 'R₂ (变)', value: extendedData.P2, color: SCENE_COLORS.charts.circuitR2 },
        { key: 'total', label: '总电路', value: extendedData.Ptotal, color: SCENE_COLORS.charts.circuitTotal },
      ]
    : [
        { key: 'r1', label: 'R₁', value: extendedData.P1, color: SCENE_COLORS.charts.circuitR1 },
        { key: 'r2', label: 'R₂ (变)', value: extendedData.P2, color: SCENE_COLORS.charts.circuitR2 },
        { key: 'r3', label: 'R₃', value: extendedData.P3, color: SCENE_COLORS.charts.circuitR3 },
        { key: 'total', label: '总电路', value: extendedData.Ptotal, color: SCENE_COLORS.charts.circuitTotal },
      ]

  return (
    <div className="w-full h-full flex flex-col gap-2 p-1.5 border-b border-neutral-200/60 bg-neutral-50/50 min-h-0 select-none">
      {/* 高考考点高亮提示横幅 */}
      {isMaxPowerPoint && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold shadow-sm border-amber-200 bg-amber-50 text-amber-800 animate-pulse transition-all duration-300">
          <span className="text-xs">💡</span>
          <span>
            【高考高频考点】：当前滑动变阻器 $R_2$ 的功率达到最大值！
            （串并联最值规律：当滑动变阻器阻值 $R_2$ 等于外电路其它部分等效电阻 {R2_target.toFixed(1)} $\Omega$ 时，其消耗功率最大，当前为 {extendedData.P2.toFixed(2)} W）
          </span>
        </div>
      )}

      {/* 并排渲染三维物理分配柱状图 */}
      <div className="flex-1 flex gap-2 min-h-0">
        <div className="flex-1 min-w-0 flex items-stretch">
          <EnergyBars items={uItems} title="电压分配 U (V) — 串联分压" compact font={font} />
        </div>
        <div className="flex-1 min-w-0 flex items-stretch">
          <EnergyBars items={iItems} title="电流分配 I (A) — 并联分流" compact font={font} />
        </div>
        <div className="flex-1 min-w-0 flex items-stretch">
          <EnergyBars 
            items={pItems} 
            title="电功率 P (W) — 元件消耗" 
            compact 
            font={font} 
            hasCollision={isMaxPowerPoint}
            collisionKey="r2"
          />
        </div>
      </div>
    </div>
  )
}

export default CircuitAnalysisCenterExtra
