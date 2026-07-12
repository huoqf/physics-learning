import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { VelocityTimeChart, RelationChart } from '@/components/Chart'
import { useDualRodsPhysics } from './dual-rods/hooks/useDualRodsPhysics'
import { DualRodsScene } from './dual-rods/components/DualRodsScene'
import { CANVAS_PRESETS } from '@/theme/spacing'

export default function InductionDualRods() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  const {
    scenario = 0,
    massA = 0.2,
    massB = 0.4,
    fieldB = 1.0,
    railL = 0.5,
    resSum = 1.0,
    initialV0 = 6.0,
    appliedForce = 2.0,
  } = params

  // 使用 CANVAS_PRESETS.splitV 设计尺寸供物理计算
  const { width: designW, height: designH } = CANVAS_PRESETS.splitV

  const physics = useDualRodsPhysics(
    { scenario, massA, massB, fieldB, railL, resSum, initialV0, appliedForce },
    designW,
    designH,
    time
  )

  return (
    <div className="flex flex-col h-full w-full gap-3 p-1">
      {/* ─── 上半屏：图表分区分割（高度 50%） ─── */}
      <div className="flex flex-row w-full h-1/2 gap-3 min-h-0">
        {/* 左图：速度时间演化 v-t 曲线 (双线交叉) */}
        <div className="flex-1 bg-white rounded-xl border border-neutral-200 p-2 shadow-sm flex flex-col overflow-hidden min-w-0">
          <VelocityTimeChart
            mode="animated"
            points={physics.vtPointsA}
            domainPoints={physics.vtPointsA}
            additionalSeries={[
              {
                points: physics.vtPointsB,
                domainPoints: physics.vtPointsB,
                label: 'v_b',
                series: 'secondary',
              },
            ]}
            currentTime={Math.min(time, physics.T_max)}
            tMax={physics.T_max}
            vRange={[-0.5, physics.vMax]}
            title="两棒速度演变 (v-t 图)"
            xLabel="t / s"
            yLabel="v / (m·s⁻¹)"
          />
        </div>

        {/* 右图：系统总动量 P-t 演化曲线 */}
        <div className="flex-1 bg-white rounded-xl border border-neutral-200 p-2 shadow-sm flex flex-col overflow-hidden min-w-0">
          <RelationChart
            points={physics.ptPoints}
            cursorX={Math.min(time, physics.T_max)}
            xDomain={[0, physics.T_max]}
            yDomain={[0, physics.pMax]}
            title="系统总动量追踪 (P-t 图)"
            xLabel="t / s"
            yLabel="P / (kg·m·s⁻¹)"
            series="primary"
          />
        </div>
      </div>

      {/* ─── 下半屏：物理视界仿真（高度 50%，逻辑坐标 840×325） ─── */}
      <div className="w-full h-1/2 min-h-0 flex-1">
        <DualRodsScene
          physics={physics}
          scenario={scenario}
          appliedForce={appliedForce}
        />
      </div>
    </div>
  )
}
