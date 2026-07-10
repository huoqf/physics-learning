/**
 * BulletBlockCharts.tsx
 * 子弹打木块上方图表区组件
 *
 * 左：v-t 速度-时间图（VelocityTimeChart）
 * 右：能量转化柱状图（EnergyBars）
 */
import { useMemo } from 'react'
import { VelocityTimeChart, ChartArea, useChartContext } from '@/components/Chart'
import { EnergyBars } from '@/components/Physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import { withAlpha } from '@/theme/physics/colors'
import type { BulletBlockPhysics } from './hooks/useBulletBlockPhysics'


interface BulletBlockChartsProps {
  physics: BulletBlockPhysics
  currentTime: number
  font: (base: number) => number
  highlightType: 's1' | 's2' | 'deltaX' | null
  setHighlightType: (type: 's1' | 's2' | 'deltaX' | null) => void
}

/**
 * 相对位移面积高亮组件（子弹和木块 v-t 折线之间的差值面积）
 */
function ChartDiffArea({
  bulletPoints,
  blockPoints,
  currentTime,
  visible,
}: {
  bulletPoints: { t: number; v: number }[]
  blockPoints: { t: number; v: number }[]
  currentTime: number
  visible: boolean
}) {
  const ctx = useChartContext()
  if (!ctx || !visible) return null
  const { toSvgX, toSvgY } = ctx

  // 过滤出当前可见的折线数据点
  const filteredBullet = bulletPoints.filter((p) => p.t >= -1e-9 && p.t <= currentTime + 1e-9)
  const filteredBlock = blockPoints.filter((p) => p.t >= -1e-9 && p.t <= currentTime + 1e-9)

  if (filteredBullet.length < 2) return null

  // 面积由子弹折线正向连接，再由木块折线逆向连回，形成闭合多边形
  const pointsUpper = filteredBullet
  const pointsLower = [...filteredBlock].reverse()

  const pathD =
    `M ${toSvgX(pointsUpper[0].t).toFixed(2)},${toSvgY(pointsUpper[0].v).toFixed(2)} ` +
    pointsUpper.slice(1).map((p) => `L ${toSvgX(p.t).toFixed(2)},${toSvgY(p.v).toFixed(2)}`).join(' ') +
    ' ' +
    pointsLower.map((p) => `L ${toSvgX(p.t).toFixed(2)},${toSvgY(p.v).toFixed(2)}`).join(' ') +
    ' Z'

  return (
    <path
      d={pathD}
      fill={withAlpha(PHYSICS_COLORS.internalEnergy, 0.18)}
      stroke="none"
      pointerEvents="none"
    />
  )
}

/**
 * v-t 图的关键交点/垂直指示线标注组件
 */
function VTAnnotations({
  timeline,
  currentTime,
  font,
  mode,
}: {
  timeline: { tSync: number; vSync: number; tExit: number; vExitBullet: number; vExitBlock: number }
  currentTime: number
  font: (s: number) => number
  mode: 'retain' | 'penetrate'
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY } = ctx

  const tSync = timeline.tSync * 1000
  const tExit = timeline.tExit * 1000

  // 共速点：留存模式且时间已达到共速
  const showSync = mode === 'retain' && currentTime >= tSync
  // 穿出点：穿透模式且时间已达到穿出
  const showExit = mode === 'penetrate' && isFinite(tExit) && currentTime >= tExit

  return (
    <g pointerEvents="none">
      {showSync && (
        <g>
          {/* 垂直指示虚线 */}
          <line
            x1={toSvgX(tSync)}
            y1={toSvgY(0)}
            x2={toSvgX(tSync)}
            y2={toSvgY(timeline.vSync)}
            stroke={PHYSICS_COLORS.axis}
            strokeDasharray="3,3"
            strokeWidth={1}
            opacity={0.6}
          />
          {/* 共速交点小球 */}
          <circle
            cx={toSvgX(tSync)}
            cy={toSvgY(timeline.vSync)}
            r={3.5}
            fill={PHYSICS_COLORS.referencePoint}
            stroke={PHYSICS_COLORS.white}
            strokeWidth={1}
          />
          <text
            x={toSvgX(tSync) + 6}
            y={toSvgY(timeline.vSync) - 6}
            fill={PHYSICS_COLORS.labelText}
            fontSize={font(9)}
            fontWeight="bold"
          >
            共速 (相对静止)
          </text>
        </g>
      )}

      {showExit && (
        <g>
          {/* 穿出时刻垂直虚线 */}
          <line
            x1={toSvgX(tExit)}
            y1={toSvgY(0)}
            x2={toSvgX(tExit)}
            y2={toSvgY(timeline.vExitBullet)}
            stroke={PHYSICS_COLORS.axis}
            strokeDasharray="3,3"
            strokeWidth={1}
            opacity={0.6}
          />
          {/* 子弹穿出点 */}
          <circle
            cx={toSvgX(tExit)}
            cy={toSvgY(timeline.vExitBullet)}
            r={3.5}
            fill={PHYSICS_COLORS.velocity}
            stroke={PHYSICS_COLORS.white}
            strokeWidth={1}
          />
          <text
            x={toSvgX(tExit) + 6}
            y={toSvgY(timeline.vExitBullet) - 4}
            fill={PHYSICS_COLORS.labelText}
            fontSize={font(9)}
            fontWeight="bold"
          >
            子弹穿出 v₁
          </text>
          {/* 木块穿出点 */}
          <circle
            cx={toSvgX(tExit)}
            cy={toSvgY(timeline.vExitBlock)}
            r={3.5}
            fill={PHYSICS_COLORS.elasticForce}
            stroke={PHYSICS_COLORS.white}
            strokeWidth={1}
          />
          <text
            x={toSvgX(tExit) + 6}
            y={toSvgY(timeline.vExitBlock) + 10}
            fill={PHYSICS_COLORS.labelText}
            fontSize={font(9)}
            fontWeight="bold"
          >
            木块穿出 v₂
          </text>
        </g>
      )}
    </g>
  )
}

export default function BulletBlockCharts({
  physics,
  currentTime,
  font,
  highlightType,
  setHighlightType,
}: BulletBlockChartsProps) {
  const { vtData, timeline, param, mode, state } = physics

  const tMax = timeline.tMax * 1000

  // v-t 图数据
  const bulletPoints = vtData.bulletVT
  const blockPoints = vtData.blockVT

  // 阶段着色背景数据
  const stages = useMemo(() => {
    const tPreMs = -physics.tPre * 1000
    return [
      {
        from: tPreMs,
        to: 0,
        label: '子弹匀速飞入',
        color: PHYSICS_COLORS.referencePoint,
        opacity: 0.08,
      },
      {
        from: 0,
        to: tMax,
        label: mode === 'penetrate' ? '撞击与穿透' : '撞击与共速',
        color: PHYSICS_COLORS.internalEnergy,
        opacity: 0.05,
      },
    ]
  }, [physics.tPre, tMax, mode])

  // 实时能量分配三柱：子弹动能 + 木块动能 + 内能
  const energyItems = useMemo(() => {
    const { EkBullet, EkBlock, Q } = state
    return [
      {
        key: 'ekBullet',
        label: '子弹动能',
        value: EkBullet,
        color: PHYSICS_COLORS.kineticEnergy,
        displayValue: `${EkBullet.toFixed(1)} J`,
      },
      {
        key: 'ekBlock',
        label: '木块动能',
        value: EkBlock,
        color: PHYSICS_COLORS.normalForce,
        displayValue: `${EkBlock.toFixed(1)} J`,
      },
      {
        key: 'Q',
        label: '内能 Q',
        value: Q,
        color: PHYSICS_COLORS.internalEnergy,
        displayValue: `${Q.toFixed(1)} J`,
      },
    ]
  }, [state])

  // 实时动量分配三柱：子弹动量 + 木块动量 + 系统总动量
  const momentumItems = useMemo(() => {
    const { m, M } = param
    const { bulletV, blockV } = state
    const pBullet = m * bulletV
    const pBlock = M * blockV
    const pTotal = pBullet + pBlock

    return [
      {
        key: 'pBullet',
        label: '子弹动量',
        value: pBullet,
        color: PHYSICS_COLORS.velocity,
        displayValue: `${pBullet.toFixed(2)} kg·m/s`,
      },
      {
        key: 'pBlock',
        label: '木块动量',
        value: pBlock,
        color: PHYSICS_COLORS.elasticForce,
        displayValue: `${pBlock.toFixed(2)} kg·m/s`,
      },
      {
        key: 'pTotal',
        label: '总动量',
        value: pTotal,
        color: PHYSICS_COLORS.referencePoint,
        displayValue: `${pTotal.toFixed(2)} kg·m/s`,
      },
    ]
  }, [param, state])

  const initialEk = useMemo(() => 0.5 * param.m * param.v0 * param.v0, [param])
  const initialMomentum = useMemo(() => param.m * param.v0, [param])

  return (
    <div className="h-full w-full flex flex-col gap-1.5 text-neutral-800">
      {/* 面积高亮 Toggle 按钮栏 */}
      <div className="flex gap-1.5 items-center justify-start text-xs select-none pl-1 grow-0 shrink-0">
        <span className="text-neutral-500 font-semibold mr-1">高考图线面积联动分析:</span>
        <button
          className={`px-2.5 py-0.5 rounded-full border transition-all duration-200 cursor-pointer ${
            highlightType === 's1'
              ? 'bg-blue-50 border-blue-400 text-blue-600 font-bold shadow-sm'
              : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300'
          }`}
          onClick={() => setHighlightType(highlightType === 's1' ? null : 's1')}
        >
          子弹位移 s₁
        </button>
        <button
          className={`px-2.5 py-0.5 rounded-full border transition-all duration-200 cursor-pointer ${
            highlightType === 's2'
              ? 'bg-pink-50 border-pink-400 text-pink-600 font-bold shadow-sm'
              : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300'
          }`}
          onClick={() => setHighlightType(highlightType === 's2' ? null : 's2')}
        >
          木块位移 s₂
        </button>
        <button
          className={`px-2.5 py-0.5 rounded-full border transition-all duration-200 cursor-pointer ${
            highlightType === 'deltaX'
              ? 'bg-red-50 border-red-400 text-red-600 font-bold shadow-sm'
              : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300'
          }`}
          onClick={() => setHighlightType(highlightType === 'deltaX' ? null : 'deltaX')}
        >
          相对深度 Δs (内能)
        </button>
      </div>

      {/* 图表主区域 */}
      <div className="flex-1 min-h-0 w-full flex gap-2">
        {/* 左：v-t 图 */}
        <div className="flex-1 min-w-0 h-full">
          <VelocityTimeChart
            mode="animated"
            points={bulletPoints}
            domainPoints={bulletPoints}
            currentTime={currentTime}
            tMax={tMax}
            tDomain={[-physics.tPre * 1000, tMax]}
            xLabel="t (ms)"
            stages={stages}
            showCursor
            showArea={highlightType === 's1'}
            areaVariant="default"
            series="primary"
            additionalSeries={[
              {
                points: blockPoints,
                domainPoints: blockPoints,
                label: '木块',
                series: 'secondary',
              },
            ]}
            underlay={
              <g>
                {/* 木块对地位移 s2 面积 */}
                {highlightType === 's2' && (
                  <ChartArea
                    points={blockPoints.map((p) => ({ x: p.t, y: p.v }))}
                    xRange={[0, currentTime]}
                    baseline={0}
                    variant="warm"
                    intensity="normal"
                  />
                )}
                {/* 相对位移 deltaX 面积 */}
                <ChartDiffArea
                  bulletPoints={bulletPoints}
                  blockPoints={blockPoints}
                  currentTime={currentTime}
                  visible={highlightType === 'deltaX'}
                />
              </g>
            }
          >
            <VTAnnotations
              timeline={timeline}
              currentTime={currentTime}
              font={font}
              mode={mode}
            />
          </VelocityTimeChart>
        </div>

        {/* 右：能量与动量柱状图 */}
        <div className="flex-1 min-w-0 h-full flex flex-col gap-1.5">
          <div className="flex-1 min-h-0">
            <EnergyBars
              items={energyItems}
              initialEtot={initialEk}
              title="系统能量分配与转化 (J)"
              font={font}
              compact
            />
          </div>
          <div className="flex-1 min-h-0">
            <EnergyBars
              items={momentumItems}
              initialEtot={initialMomentum}
              title="系统动量守恒分析 (kg·m/s)"
              font={font}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  )
}
