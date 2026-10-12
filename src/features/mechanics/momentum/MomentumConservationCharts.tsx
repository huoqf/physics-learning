import { VelocityTimeChart } from '@/components/Chart'
import type { MomentumConservationPhysics } from './hooks/useMomentumConservationPhysics'

interface MomentumConservationChartsProps {
  chartData: MomentumConservationPhysics['chartData']
  currentTime: number
  isAdvanced: boolean
  isExperiment?: boolean
}

export default function MomentumConservationCharts({
  chartData,
  currentTime,
  isAdvanced,
  isExperiment = false,
}: MomentumConservationChartsProps) {
  const series1Label = isExperiment ? '滑块1' : isAdvanced ? '滑块' : 'A球'
  const series2Label = isExperiment ? '滑块2' : isAdvanced ? '木板' : 'B球'
  return (
    <div className="flex gap-4 flex-1 min-h-0">
      <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 relative">
          <VelocityTimeChart
            mode="animated"
            points={chartData.currentVtPoints1}
            domainPoints={chartData.currentDomainVtPoints1}
            currentTime={currentTime}
            tMax={isExperiment ? 5 : 10}
            title={isExperiment ? '气轨滑块速度 (V-T)' : '速度-时间图像 (V-T)'}
            xLabel="时间 t (s)"
            yLabel="速度 v (m/s)"
            mainSeriesLabel={series1Label}
            additionalSeries={[
              {
                points: chartData.currentVtPoints2,
                domainPoints: chartData.currentDomainVtPoints2,
                label: series2Label,
                series: 'secondary',
              },
            ]}
            showArea={false}
          />
        </div>
      </div>
      <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 relative">
          <VelocityTimeChart
            mode="animated"
            points={chartData.currentPtPoints1}
            domainPoints={chartData.currentDomainPtPoints1}
            currentTime={currentTime}
            tMax={isExperiment ? 5 : 10}
            title={isExperiment ? '系统动量守恒 (P-T)' : '动量-时间图像 (P-T)'}
            xLabel="时间 t (s)"
            yLabel="动量 p (kg·m/s)"
            mainSeriesLabel={series1Label}
            additionalSeries={[
              {
                points: chartData.currentPtPoints2,
                domainPoints: chartData.currentDomainPtPoints2,
                label: series2Label,
                series: 'secondary',
              },
              {
                points: chartData.currentPtPointsTotal,
                domainPoints: chartData.currentDomainPtPointsTotal,
                label: '总动量 (恒定)',
                series: 'success',
              },
            ]}
            showArea={false}
          />
        </div>
      </div>
    </div>
  )
}
