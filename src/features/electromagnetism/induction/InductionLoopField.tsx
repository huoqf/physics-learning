import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { RelationChart } from '@/components/Chart'
import { useLoopPassFieldPhysics } from './loop-field/hooks/useLoopPassFieldPhysics'
import { LoopPassFieldScene } from './loop-field/components/LoopPassFieldScene'

export default function InductionLoopField() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  const {
    dimensionPreset = 0,
    domainAxis = 0,
    loopWidth = 4.0,
    fieldWidth = 8.0,
    constantSpeed = 1.0,
    magneticB = 1.0,
  } = params

  const physics = useLoopPassFieldPhysics(
    { dimensionPreset, domainAxis, loopWidth, fieldWidth, constantSpeed, magneticB },
    time
  )

  const isTimeAxis = domainAxis === 1
  const currentCursorX = isTimeAxis ? physics.currentTime : physics.frontX * 100
  const chartDomain: [number, number] = isTimeAxis
    ? [0, physics.T_max]
    : [physics.xMin * 100, physics.xMax * 100]
  const xLabel = isTimeAxis ? 't / s' : 'x / cm'

  return (
    <div className="flex flex-col h-full w-full gap-2 p-1">
      {/* ─── 上侧 50%：三图表无缝平齐联动 ─── */}
      <div className="grid grid-cols-3 gap-2 w-full h-1/2 min-h-0">
        {/* 左图：磁通量 Φ 梯形波 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-2 shadow-sm flex flex-col overflow-hidden min-w-0">
          <RelationChart
            points={isTimeAxis ? physics.phiPointsT : physics.phiPoints}
            cursorX={currentCursorX}
            xDomain={chartDomain}
            yDomain={[0, physics.phiMax]}
            title={isTimeAxis ? '磁通量 Φ-t 图' : '磁通量 Φ-x 图'}
            xLabel={xLabel}
            yLabel="Φ / Wb"
            series="primary"
          />
        </div>

        {/* 中图：感应电流 I 阶跃方波 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-2 shadow-sm flex flex-col overflow-hidden min-w-0">
          <RelationChart
            points={isTimeAxis ? physics.iPointsT : physics.iPoints}
            cursorX={currentCursorX}
            xDomain={chartDomain}
            yDomain={[-physics.iMax, physics.iMax]}
            title={isTimeAxis ? '感应电流 I-t 图' : '感应电流 I-x 图'}
            xLabel={xLabel}
            yLabel="I / A"
            series="secondary"
            showZeroLine
          />
        </div>

        {/* 右图：安培力 F_A 脉冲方波 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-2 shadow-sm flex flex-col overflow-hidden min-w-0">
          <RelationChart
            points={isTimeAxis ? physics.faPointsT : physics.faPoints}
            cursorX={currentCursorX}
            xDomain={chartDomain}
            yDomain={[0, physics.faMax]}
            title={isTimeAxis ? '安培力 F_A-t 图' : '安培力 F_A-x 图'}
            xLabel={xLabel}
            yLabel="F / N"
            series="accent"
          />
        </div>
      </div>

      {/* ─── 下侧 50%：线框穿场物理视界 (840×325 逻辑分辨率) ─── */}
      <div className="w-full h-1/2 min-h-0 flex-1">
        <LoopPassFieldScene physics={physics} />
      </div>
    </div>
  )
}
