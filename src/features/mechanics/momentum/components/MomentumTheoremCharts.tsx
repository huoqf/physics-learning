import { RelationChart, ChartArea } from '@/components/Chart'
import { PHYSICS_COLORS } from '@/theme/physics'

interface ChartPoint {
  x: number
  y: number
}

interface MomentumTheoremChartsProps {
  layout: {
    isAdvanced: boolean
    fallV: number
    totalTime: number
    F_max: number
    currentT: number
    basicVtPoints: ChartPoint[]
    basicFtPoints: ChartPoint[]
    basicFtPointsAll: ChartPoint[]
    fallTime: number
    collisionDt: number
    impactForce: number
    advancedXMax: number
    currentT_adv: number
    advancedPtPoints: ChartPoint[]
    advancedFtPoints: ChartPoint[]
    advancedFtPointsAll: ChartPoint[]
  }
}

export function MomentumTheoremCharts({ layout }: MomentumTheoremChartsProps) {
  const {
    isAdvanced, fallV, totalTime, F_max, currentT,
    basicVtPoints, basicFtPoints, basicFtPointsAll, fallTime, collisionDt,
    impactForce, advancedXMax, currentT_adv,
    advancedPtPoints, advancedFtPoints, advancedFtPointsAll
  } = layout

  if (!isAdvanced) {
    return (
      <>
        {/* v-t 图表区域 */}
        <div className="flex-1 min-h-[170px] relative rounded-xl border border-neutral-100 p-2 bg-neutral-50/50">
          <RelationChart
            points={basicVtPoints}
            xDomain={[0, totalTime]}
            yDomain={[-fallV * 1.25, fallV * 1.25]}
            xLabel="时间 t (s)"
            yLabel="速度 v (m/s)"
            title="速度 v-t 图像"
            cursorX={Math.min(currentT, totalTime)}
            cursorLabel={(_: number, y: number) => `v = ${y.toFixed(2)} m/s`}
            series="primary"
            color={PHYSICS_COLORS.velocity}
            showGrid
          />
        </div>

        {/* F-t 图表区域 */}
        <div className="flex-1 min-h-[170px] relative rounded-xl border border-neutral-100 p-2 bg-neutral-50/50">
          <RelationChart
            points={basicFtPoints}
            xDomain={[0, totalTime]}
            yDomain={[0, F_max * 1.15]}
            xLabel="时间 t (s)"
            yLabel="碰撞力 F (N)"
            title="碰撞力 F-t 图像"
            cursorX={Math.min(currentT, totalTime)}
            cursorLabel={(_: number, y: number) => `F = ${y.toFixed(1)} N`}
            series="primary"
            color={PHYSICS_COLORS.normalForce}
            showGrid
            underlay={
              currentT > fallTime && (
                <ChartArea
                  points={basicFtPointsAll}
                  xRange={[fallTime, Math.min(currentT, fallTime + collisionDt * 2)]}
                  baseline={0}
                  variant="impulse"
                  intensity="normal"
                />
              )
            }
          />
        </div>
      </>
    )
  }

  return (
    <>
      {/* p-t 图表区域 */}
      <div className="flex-1 min-h-[170px] relative rounded-xl border border-neutral-100 p-2 bg-neutral-50/50">
        <RelationChart
          points={advancedPtPoints}
          xDomain={[0, advancedXMax]}
          yDomain={[0, Math.max(10, impactForce * advancedXMax * 1.15)]}
          xLabel="时间 t (s)"
          yLabel="传递动量 p (kg·m/s)"
          title="动量 p-t 图像"
          cursorX={currentT_adv}
          cursorLabel={(_: number, y: number) => `p = ${y.toFixed(2)} kg·m/s`}
          series="primary"
          color={PHYSICS_COLORS.momentum}
          showGrid
        />
      </div>

      {/* F-t 图表区域 */}
      <div className="flex-1 min-h-[170px] relative rounded-xl border border-neutral-100 p-2 bg-neutral-50/50">
        <RelationChart
          points={advancedFtPoints}
          xDomain={[0, advancedXMax]}
          yDomain={[0, Math.max(200, impactForce * 1.25)]}
          xLabel="时间 t (s)"
          yLabel="冲击力 F (N)"
          title="恒力冲击 F-t 图像"
          cursorX={currentT_adv}
          cursorLabel={(_: number, y: number) => `F = ${y.toFixed(1)} N`}
          series="primary"
          color={PHYSICS_COLORS.appliedForce}
          showGrid
          underlay={
            currentT_adv > 0 && (
              <ChartArea
                points={advancedFtPointsAll}
                xRange={[0, currentT_adv]}
                baseline={0}
                variant="impulse"
                intensity="normal"
              />
            )
          }
        />
      </div>
    </>
  )
}
