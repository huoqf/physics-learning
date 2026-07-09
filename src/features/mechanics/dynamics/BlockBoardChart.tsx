/**
 * 板块模型图表组件 — 双线 v-t 图
 *
 * 作为 CenterExtra 渲染，独立于动画组件。
 * 使用 VelocityTimeChart 组件渲染滑块（红线）和木板（蓝线）的速度-时间曲线。
 */
import { useMemo } from 'react'
import { VelocityTimeChart } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  getBoardSystemState,
  getBoardTimeline,
  generateBRTrajectory,
} from '@/physics/blockBoard'
import { GRAVITY } from '@/physics/constants'
import { PHYSICS_COLORS } from '@/theme/physics'

const T_MAX_DEFAULT = 8
const SAMPLE_COUNT = 200

export default function BlockBoardChart() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  const {
    m = 1,
    M = 3,
    mu1 = 0.3,
    mu2 = 0.05,
    v0 = 5,
    L = 2.5,
  } = params

  const g = GRAVITY
  const param = useMemo(() => ({ m, M, mu1, mu2, v0, L, g }), [m, M, mu1, mu2, v0, L, g])

  // 理论最大时间
  const timeline = useMemo(() => getBoardTimeline(param), [param])
  const tMax = Math.min(timeline.tMax + 0.5, T_MAX_DEFAULT)

  // 完整理论轨迹（用于坐标轴定标，防止 Y 轴抖动）
  const { blockTrajectory, boardTrajectory } = useMemo(
    () => generateBRTrajectory(param, tMax, SAMPLE_COUNT),
    [param, tMax]
  )

  // 当前时刻截断的绘制数据
  const blockPoints = useMemo(
    () => blockTrajectory.filter((p) => p.t <= time),
    [blockTrajectory, time]
  )
  const boardPoints = useMemo(
    () => boardTrajectory.filter((p) => p.t <= time),
    [boardTrajectory, time]
  )

  // 当前状态
  const currentState = useMemo(
    () => getBoardSystemState(param, time),
    [param, time]
  )

  // 共速标记
  const syncTime = timeline.tSync
  const hasSync = syncTime < tMax && timeline.boardMoves

  return (
    <div className="w-full h-full flex flex-col bg-neutral-50 rounded-xl p-2.5 gap-2">
      {/* 标题 */}
      <div className="shrink-0 flex items-center justify-between px-1">
        <span className="text-xs font-bold text-neutral-700">v-t 速度图像</span>
        <span className="text-[10px] text-neutral-400 font-medium">
          t = {time.toFixed(2)} s
        </span>
      </div>

      {/* 图表 */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-neutral-200/60 shadow-sm p-1.5">
        <VelocityTimeChart
          mode="animated"
          points={blockPoints}
          domainPoints={blockTrajectory}
          currentTime={time}
          tMax={tMax}
          title="滑块与木板 v-t 图"
          xLabel="t (s)"
          yLabel="v (m/s)"
          showArea={false}
          showCursor={time > 0}
          showGrid
          additionalSeries={[
            {
              points: boardPoints,
              domainPoints: boardTrajectory,
              label: '木板',
              series: 'secondary',
            },
          ]}
        >
          {/* 共速标记线 */}
          {hasSync && time >= syncTime && (
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={1}
              stroke={PHYSICS_COLORS.annotation}
              strokeWidth={1}
              strokeDasharray="4,3"
              opacity={0.5}
            />
          )}
        </VelocityTimeChart>
      </div>

      {/* 图例 */}
      <div className="shrink-0 flex flex-row gap-5 items-center justify-center py-0.5 border-t border-neutral-200/60 bg-neutral-100/30 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-0.5 rounded"
            style={{ backgroundColor: PHYSICS_COLORS.velocity }}
          />
          <span className="text-neutral-500">
            滑块 v₁ = {currentState.vBlock.toFixed(2)} m/s
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-0.5 rounded"
            style={{ backgroundColor: PHYSICS_COLORS.velocityX }}
          />
          <span className="text-neutral-500">
            木板 v₂ = {currentState.vBoard.toFixed(2)} m/s
          </span>
        </div>
        {hasSync && (
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">
              共速 t = {syncTime.toFixed(2)} s
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
