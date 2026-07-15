import type { UseVerticalThrowChartLayoutResult } from './useVerticalThrowChartLayout'
import type { UseVerticalThrowPhysicsResult } from './useVerticalThrowPhysics'
import { VerticalThrowVTChart } from './vt/VerticalThrowVTChart'
import { VerticalThrowYTChart } from './vt/VerticalThrowYTChart'

interface VerticalThrowChartsProps {
  layout: UseVerticalThrowChartLayoutResult
  physics: UseVerticalThrowPhysicsResult
  advancedMode: number
  sliceDensity: number
  airResistance: number
  showDoubleTrack: boolean
  targetHeight: number
  g: number
  onTimeChange: (time: number) => void
}

/**
 * 竖直上抛右侧双图表区。
 *
 * 这里完成高难度三件套的最后一步：右侧 v-t / y-t 图迁入
 * VelocityTimeChart / DisplacementTimeChart 预设，仅保留上抛专题特有的
 * 标记、割线、切线、目标高度与面积信息作为插件层。
 */
export function VerticalThrowCharts({
  layout, physics, advancedMode, sliceDensity, airResistance,
  showDoubleTrack, targetHeight, g, onTimeChange,
}: VerticalThrowChartsProps) {
  const {
    dataX, dataWidth,
    vtChartTop, vtChartHeight,
    ytChartTop, ytChartHeight,
  } = layout

  return (
    <div className="absolute" style={{ left: dataX, top: vtChartTop, width: dataWidth, height: ytChartTop + ytChartHeight - vtChartTop }}>
      <div style={{ width: '100%', height: vtChartHeight }}>
        <VerticalThrowVTChart
          layout={layout} physics={physics}
          advancedMode={advancedMode} sliceDensity={sliceDensity}
          airResistance={airResistance} showDoubleTrack={showDoubleTrack}
          g={g} onTimeChange={onTimeChange} />
      </div>
      <div style={{ width: '100%', height: ytChartHeight }}>
        <VerticalThrowYTChart
          layout={layout} physics={physics}
          advancedMode={advancedMode} airResistance={airResistance}
          showDoubleTrack={showDoubleTrack} targetHeight={targetHeight}
          onTimeChange={onTimeChange} />
      </div>
    </div>
  )
}

export default VerticalThrowCharts
