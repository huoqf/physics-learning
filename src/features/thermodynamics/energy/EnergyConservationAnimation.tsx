import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { RelationChart } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'

import { useEnergyFlowPhysics } from './hooks/useEnergyFlowPhysics'
import { EnergyFlowScene } from './components/EnergyFlowScene'

/**
 * 能量守恒定律与能源 —— 主编排动画（3 个情境共用一页）。
 *
 * 分区固定为 `splitV`：上屏画"关系图"（功率-时刻 / 势能-水量 / 有用功-输入），
 * 下屏画"能量流框图 + 能量条"。三个模式的主运动都是"能量的流向"而不是某个质点，
 * 没有竖直/水平之分，因此按 `07_CANVAS_SVG_CHART_RULES §2.8` 取上下分区即可，
 * 不需要像力学实验页那样按 mode 换 preset。
 */
export default function EnergyConservationAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time }))
  )

  const modeNum = Number.isFinite(Number(params?.scene)) ? Number(params.scene) : 0
  const pvPeakKW = Number.isFinite(Number(params?.pv)) ? Number(params.pv) : 200
  const loadPeakKW = Number.isFinite(Number(params?.load)) ? Number(params.load) : 90
  const capacityKWh = Number.isFinite(Number(params?.cap)) ? Number(params.cap) : 400
  const headM = Number.isFinite(Number(params?.head)) ? Number(params.head) : 120
  const volumeWanM3 = Number.isFinite(Number(params?.vol)) ? Number(params.vol) : 8
  const fuelEffPct = Number.isFinite(Number(params?.fuelEff)) ? Number(params.fuelEff) : 30
  const evEffPct = Number.isFinite(Number(params?.evEff)) ? Number(params.evEff) : 85
  const timeNum = Number.isFinite(Number(time)) ? Number(time) : 0

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })

  const view = useEnergyFlowPhysics({
    mode: modeNum,
    pvPeakKW,
    loadPeakKW,
    capacityKWh,
    headM,
    volumeWanM3,
    fuelEffPct,
    evEffPct,
    time: timeNum,
  })

  const { chart } = view

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
      {/* 1. 上屏：关系图（斜率 / 面积 / 错配都在这张图上读） */}
      <div className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm overflow-hidden">
        <RelationChart
          points={chart.points}
          additionalSeries={
            chart.secondary
              ? [
                  {
                    points: chart.secondary,
                    label: chart.secondaryLabel ?? '次曲线',
                    series: 'secondary',
                    strokeDasharray: [5, 4],
                  },
                ]
              : undefined
          }
          mainLabel={chart.mainLabel}
          xDomain={chart.xDomain}
          yDomain={chart.yDomain}
          cursorX={chart.cursorX}
          title={chart.title}
          xLabel={chart.xLabel}
          yLabel={chart.yLabel}
        />
      </div>

      {/* 2. 下屏：能量流框图 + 能量条 */}
      <div
        className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm relative overflow-hidden"
        ref={containerRef}
      >
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <EnergyFlowScene
            view={view}
            params={{ pvPeakKW, loadPeakKW, capacityKWh, headM, volumeWanM3 }}
            canvasSize={canvasSize}
          />
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}
