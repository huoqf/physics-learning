import { VelocityTimeChart } from '@/components/Chart'
import type { MomentumConservationPhysics } from './hooks/useMomentumConservationPhysics'

interface MomentumConservationChartsProps {
  chartData: MomentumConservationPhysics['chartData']
  currentTime: number
  isAdvanced: boolean
}

export default function MomentumConservationCharts({
  chartData,
  currentTime,
  isAdvanced,
}: MomentumConservationChartsProps) {
  return (
    <div className="flex gap-4 flex-1 min-h-0">
      <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 relative">
          <VelocityTimeChart
            mode="animated"
            points={chartData.currentVtPoints1}
            domainPoints={chartData.currentDomainVtPoints1}
            currentTime={currentTime}
            tMax={10}
            title="速度-时间图像 (V-T)"
            xLabel="时间 t (s)"
            yLabel="速度 v (m/s)"
            additionalSeries={[
              {
                points: chartData.currentVtPoints2,
                domainPoints: chartData.currentDomainVtPoints2,
                label: isAdvanced ? '木板' : 'B球',
                series: 'secondary',
              }
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
            tMax={10}
            title="动量-时间图像 (P-T)"
            xLabel="时间 t (s)"
            yLabel="动量 p (kg·m/s)"
            additionalSeries={[
              {
                points: chartData.currentPtPoints2,
                domainPoints: chartData.currentDomainPtPoints2,
                label: isAdvanced ? '木板' : 'B球',
                series: 'secondary',
              },
              {
                points: chartData.currentPtPointsTotal,
                domainPoints: chartData.currentDomainPtPointsTotal,
                label: '总动量',
                series: 'success',
              }
            ]}
            showArea={false}
          />
        </div>
      </div>
    </div>
  )
}
