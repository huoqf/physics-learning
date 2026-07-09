import { useMemo } from 'react'
import { BasePhysicsChart, useChartContext } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'
import { getConveyorFrame, type ConveyorMode } from '@/physics/conveyor'

const THETA_RAD = Math.PI / 12
const MASS_KG = 1
const T_MAX = 12
const SAMPLE_COUNT = 160

interface Point {
  x: number
  y: number
}

function ChartPolyline({ points, color }: { points: Point[]; color: string }) {
  const ctx = useChartContext()
  if (!ctx || points.length === 0) return null
  const d = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${ctx.toSvgX(p.x)} ${ctx.toSvgY(p.y)}`).join(' ')
  return <path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
}

function HorizontalLine({ y, color, label }: { y: number; color: string; label: string }) {
  const ctx = useChartContext()
  if (!ctx) return null
  const sy = ctx.toSvgY(y)
  return (
    <g>
      <line
        x1={ctx.plotOrigin.x}
        y1={sy}
        x2={ctx.plotOrigin.x + ctx.plotSize.width}
        y2={sy}
        stroke={withAlpha(color, 0.68)}
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      <text
        x={ctx.plotOrigin.x + ctx.plotSize.width - ctx.px(4)}
        y={sy - ctx.px(4)}
        fontSize={ctx.font(8)}
        fill={color}
        textAnchor="end"
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  )
}

function VerticalMarker({ x, color, label }: { x: number; color: string; label: string }) {
  const ctx = useChartContext()
  if (!ctx) return null
  const sx = ctx.toSvgX(x)
  return (
    <g>
      <line
        x1={sx}
        y1={ctx.plotOrigin.y}
        x2={sx}
        y2={ctx.plotOrigin.y + ctx.plotSize.height}
        stroke={withAlpha(color, 0.55)}
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      <text
        x={sx + ctx.px(4)}
        y={ctx.plotOrigin.y + ctx.px(10)}
        fontSize={ctx.font(8.5)}
        fill={color}
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  )
}

function CurrentPoint({ x, y, color = PHYSICS_COLORS.velocity }: { x: number; y: number; color?: string }) {
  const ctx = useChartContext()
  if (!ctx) return null
  return (
    <circle
      cx={ctx.toSvgX(x)}
      cy={ctx.toSvgY(y)}
      r={4.2}
      fill={color}
      stroke={PHYSICS_COLORS.white}
      strokeWidth={1.8}
    />
  )
}

export default function ConveyorChart() {
  const time = useAnimationStore((s) => s.time)
  const params = useAnimationStore((s) => s.params)

  const mode: ConveyorMode = (params.conveyorMode ?? 0) === 0 ? 'horizontal' : 'inclined'
  const vBelt = params.vBelt ?? 3
  const v0 = params.v0 ?? 0
  const mu = params.mu ?? 0.2
  const length = params.L ?? 6
  const showSyncLine = (params.showSyncLine ?? 1) === 1

  const theta = mode === 'inclined' ? THETA_RAD : 0

  // 1. 采样物理全过程数据
  const data = useMemo(() => {
    const framesData: Array<{ t: number; vObj: number; friction: number; dEk: number; dEp: number; Q: number; W: number }> = []
    let syncTime: number | null = null
    let exitTime: number | null = null

    for (let idx = 0; idx <= SAMPLE_COUNT; idx += 1) {
      const t = (T_MAX * idx) / SAMPLE_COUNT
      const frame = getConveyorFrame({ vBelt, v0, mu, L: length, mode, thetaRad: THETA_RAD }, t, MASS_KG)
      
      const dEk = 0.5 * MASS_KG * (frame.vObj * frame.vObj - v0 * v0)
      const dEp = MASS_KG * 9.8 * Math.sin(theta) * frame.xObj
      const Q = frame.heat
      const W = dEk + dEp + Q

      framesData.push({ t, vObj: frame.vObj, friction: frame.friction, dEk, dEp, Q, W })

      syncTime = syncTime ?? frame.tSync
      exitTime = exitTime ?? frame.tExit
      if (frame.tExit != null && t >= frame.tExit) {
        break
      }
    }
    return { framesData, syncTime, exitTime }
  }, [vBelt, v0, mu, length, mode, theta])

  // 2. 计算当前时刻的数据
  const current = useMemo(() => {
    const frame = getConveyorFrame({ vBelt, v0, mu, L: length, mode, thetaRad: THETA_RAD }, time, MASS_KG)
    const dEk = 0.5 * MASS_KG * (frame.vObj * frame.vObj - v0 * v0)
    const dEp = MASS_KG * 9.8 * Math.sin(theta) * frame.xObj
    const Q = frame.heat
    const W = dEk + dEp + Q
    return { frame, dEk, dEp, Q, W }
  }, [vBelt, v0, mu, length, mode, time, theta])

  // 3. 多曲线提取
  const vPoints = useMemo(() => data.framesData.map(f => ({ x: f.t, y: f.vObj })), [data])
  const fPoints = useMemo(() => data.framesData.map(f => ({ x: f.t, y: f.friction })), [data])
  const dEkPoints = useMemo(() => data.framesData.map(f => ({ x: f.t, y: f.dEk })), [data])
  const dEpPoints = useMemo(() => data.framesData.map(f => ({ x: f.t, y: f.dEp })), [data])
  const qPoints = useMemo(() => data.framesData.map(f => ({ x: f.t, y: f.Q })), [data])
  const wPoints = useMemo(() => data.framesData.map(f => ({ x: f.t, y: f.W })), [data])

  // 4. 各图表 Y 轴范围动态计算
  const vMin = Math.min(-1, ...vPoints.map(p => p.y), vBelt, v0) - 0.6
  const vMax = Math.max(1, ...vPoints.map(p => p.y), vBelt, v0) + 0.6

  const fMaxLimit = mu * MASS_KG * 9.8 * Math.cos(theta)
  const fMin = Math.min(-0.8, -fMaxLimit, ...fPoints.map(p => p.y)) - 0.5
  const fMax = Math.max(0.8, fMaxLimit, ...fPoints.map(p => p.y)) + 0.5

  const allEnergies = [...dEkPoints, ...dEpPoints, ...qPoints, ...wPoints].map(p => p.y)
  const eMin = Math.min(-2, ...allEnergies) - 1
  const eMax = Math.max(8, ...allEnergies) + 2

  const activeTime = Math.min(time, data.exitTime ?? T_MAX)

  return (
    <div className="w-full h-full p-2.5 flex flex-col gap-2 bg-neutral-50 rounded-xl">
      {/* 标题栏 */}
      <div className="shrink-0 flex items-center justify-between px-1">
        <span className="text-xs font-bold text-neutral-700">高考物理解析图表联展：速度、受力与能量随时间同步演化</span>
        <span className="text-[10px] text-neutral-400 font-medium">当前时间 t = {time.toFixed(2)} s</span>
      </div>

      {/* 3图表平铺 Flex 区域 */}
      <div className="flex-1 min-h-0 flex flex-row gap-3.5">
        {/* 图表 1: v-t 速度图像 */}
        <div className="flex-1 min-w-0 bg-white rounded-lg p-1.5 border border-neutral-200/60 shadow-sm">
          <BasePhysicsChart
            xDomain={[0, T_MAX]}
            yDomain={[vMin, vMax]}
            xLabel="t (s)"
            yLabel="v (m/s)"
            title="① 速度-时间 (v-t)"
            variant="mini"
            yBaseline={0}
            formatX={(v) => v.toFixed(0)}
            formatY={(v) => v.toFixed(1)}
          >
            {/* 传送带速度参考线 */}
            <HorizontalLine y={vBelt} color={PHYSICS_COLORS.frictionStatic} label="v带" />
            <ChartPolyline points={vPoints} color={PHYSICS_COLORS.velocity} />
            {showSyncLine && data.syncTime != null && <VerticalMarker x={data.syncTime} color={PHYSICS_COLORS.annotation} label="共速" />}
            {data.exitTime != null && <VerticalMarker x={data.exitTime} color={PHYSICS_COLORS.dangerDark} label="离开" />}
            <CurrentPoint x={activeTime} y={current.frame.vObj} color={PHYSICS_COLORS.velocity} />
          </BasePhysicsChart>
        </div>

        {/* 图表 2: f-t 摩擦力图像 */}
        <div className="flex-1 min-w-0 bg-white rounded-lg p-1.5 border border-neutral-200/60 shadow-sm">
          <BasePhysicsChart
            xDomain={[0, T_MAX]}
            yDomain={[fMin, fMax]}
            xLabel="t (s)"
            yLabel="f (N)"
            title="② 摩擦力-时间 (f-t)"
            variant="mini"
            yBaseline={0}
            formatX={(v) => v.toFixed(0)}
            formatY={(v) => v.toFixed(1)}
          >
            {/* 临界最大摩擦力线 */}
            <HorizontalLine y={fMaxLimit} color="#94a3b8" label="+f_max" />
            <HorizontalLine y={-fMaxLimit} color="#94a3b8" label="-f_max" />
            
            <ChartPolyline points={fPoints} color={PHYSICS_COLORS.friction} />
            {showSyncLine && data.syncTime != null && <VerticalMarker x={data.syncTime} color={PHYSICS_COLORS.annotation} label="共速" />}
            {data.exitTime != null && <VerticalMarker x={data.exitTime} color={PHYSICS_COLORS.dangerDark} label="离开" />}
            <CurrentPoint x={activeTime} y={current.frame.friction} color={PHYSICS_COLORS.friction} />
          </BasePhysicsChart>
        </div>

        {/* 图表 3: E-t 能量时间图像 */}
        <div className="flex-1 min-w-0 bg-white rounded-lg p-1.5 border border-neutral-200/60 shadow-sm">
          <BasePhysicsChart
            xDomain={[0, T_MAX]}
            yDomain={[eMin, eMax]}
            xLabel="t (s)"
            yLabel="E (J)"
            title="③ 功与能-时间 (E-t)"
            variant="mini"
            yBaseline={0}
            formatX={(v) => v.toFixed(0)}
            formatY={(v) => v.toFixed(1)}
          >
            <ChartPolyline points={wPoints} color={PHYSICS_COLORS.power} />
            <ChartPolyline points={dEkPoints} color={PHYSICS_COLORS.kineticEnergy} />
            <ChartPolyline points={dEpPoints} color={PHYSICS_COLORS.potentialGravity} />
            <ChartPolyline points={qPoints} color={PHYSICS_COLORS.heatLoss} />

            {showSyncLine && data.syncTime != null && <VerticalMarker x={data.syncTime} color={PHYSICS_COLORS.annotation} label="共速" />}
            {data.exitTime != null && <VerticalMarker x={data.exitTime} color={PHYSICS_COLORS.dangerDark} label="离开" />}
            
            {/* 四个能量的同步游标 */}
            <CurrentPoint x={activeTime} y={current.W} color={PHYSICS_COLORS.power} />
            <CurrentPoint x={activeTime} y={current.dEk} color={PHYSICS_COLORS.kineticEnergy} />
            <CurrentPoint x={activeTime} y={current.dEp} color={PHYSICS_COLORS.potentialGravity} />
            <CurrentPoint x={activeTime} y={current.Q} color={PHYSICS_COLORS.heatLoss} />
          </BasePhysicsChart>
        </div>
      </div>

      {/* 底部紧凑统一的图例说明 */}
      <div className="shrink-0 flex flex-row gap-5 items-center justify-center py-0.5 border-t border-neutral-200/60 bg-neutral-100/30 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-0.5" style={{ backgroundColor: PHYSICS_COLORS.velocity }} />
          <span className="text-neutral-500">v物</span>
          <span className="w-2 h-0.5 border-t border-dashed" style={{ borderColor: PHYSICS_COLORS.frictionStatic }} />
          <span className="text-neutral-500">v带</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-0.5" style={{ backgroundColor: PHYSICS_COLORS.friction }} />
          <span className="text-neutral-500">摩擦力 f</span>
          <span className="w-2 h-0.5 border-t border-dashed border-neutral-400" />
          <span className="text-neutral-500">临界边界</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PHYSICS_COLORS.power }} />
            <span className="text-neutral-500">W电机</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PHYSICS_COLORS.kineticEnergy }} />
            <span className="text-neutral-500">ΔEk</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PHYSICS_COLORS.potentialGravity }} />
            <span className="text-neutral-500">ΔEp</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PHYSICS_COLORS.heatLoss }} />
            <span className="text-neutral-500">Q热</span>
          </div>
        </div>
      </div>
    </div>
  )
}
