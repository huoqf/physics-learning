import { useCanvasSize } from '@/utils'
import { useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateAcceleratedMotion } from '@/physics'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  VT_CHART_COLORS,
  STROKE,
  DASH,
} from '@/theme/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { SportsCar } from '@/components/Physics/SportsCar'
import { VectorDefs, markerId } from '@/components/Physics/VectorDefs'
import { selectMarkerTier } from '@/theme/physics/vectorStyle'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'
import { VelocityTimeChart } from '@/components/Chart'
import { useChartContext } from '@/components/Chart/ChartContext'

/**
 * 匀变速直线运动 · 基础模式动画（已完成图表迁移）
 *
 * 上半部分：使用 VelocityTimeChart 标准预设 + 自定义 area 插件层
 * 下半部分：运动舞台（线框小车 + 轮轴旋转滚动 + 分段位移投影带）
 *
 * 保留4种教学面积模式（微元/等效割补/拆分公式/合并梯形），通过 underlay/children 实现。
 */
export default function UniformAccelerationAnimation() {
  const { params, time, showVectors, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      setIsPlaying: s.setIsPlaying,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })
  const { font } = canvasSize

  const { v0 = 0, a = 1.5, showSplit = 1, splitN = 0, showEquivRect = 0 } = params

  // ── 动态布局 ──
  const padding = canvasSize.width * 0.07
  const fontSize = Math.max(10, canvasSize.width * 0.017)
  const smallFont = Math.max(9, fontSize * 0.85)

  // 上半部分：v-t 图（60%）
  const chartSectionHeight = canvasSize.height * 0.6

  // 下半部分：动画舞台（40%）
  const stageTop = chartSectionHeight + 4
  const stageHeight = canvasSize.height - stageTop
  const groundY = stageTop + stageHeight * 0.72
  const objW = canvasSize.width * 0.06
  const objH = objW * 0.7

  // 物理位移坐标缩放
  const baseScale = canvasSize.width * 0.03
  const scale = baseScale
  const startX = padding
  const maxVisibleX = canvasSize.width - padding

  // ── 矢量场景配置 ──
  const maxVel = Math.max(Math.abs(v0) + Math.abs(a) * 8, 10)
  const maxAcc = Math.max(Math.abs(a) * 2, 5)
  const uaScene: SceneConfig = {
    vectorBounds: { x: 0, y: stageTop, width: canvasSize.width, height: stageHeight },
    originX: 0,
    originY: 0,
    refMagnitudes: { velocity: maxVel, acceleration: maxAcc },
  }
  const sceneScale = createSceneScale(uaScene)

  // ── 物理计算 ──
  const { v, s } = calculateAcceleratedMotion(v0, a, time)
  const currentX = startX + s * scale
  const isOffscreen = currentX > maxVisibleX + objW || currentX < padding - objW

  // 小车跑出画布后自动暂停
  useEffect(() => {
    if (isOffscreen && time > 0) {
      setIsPlaying(false)
    }
  }, [isOffscreen, time, setIsPlaying])

  // v-t 图坐标范围
  const VT_X_MAX = 8
  const { vtYMin, vtYMax } = useMemo(() => {
    const vMax = Math.max(v0 + a * VT_X_MAX, v0, 0) + 2
    const vMin = Math.min(v0 + a * VT_X_MAX, v0, 0) - 2
    return { vtYMin: Math.floor(vMin), vtYMax: Math.ceil(vMax) }
  }, [v0, a])

  // v-t 图曲线数据（完整 domainPoints 用于定标）
  const vtDomainPoints = useMemo(() => {
    const dt = 0.05
    const pts: { t: number; v: number }[] = []
    for (let t = 0; t <= VT_X_MAX + 0.001; t += dt) {
      const { v: vel } = calculateAcceleratedMotion(v0, a, t)
      pts.push({ t, v: vel })
    }
    return pts
  }, [v0, a])

  // 当前时间截断的 points（用于绘制）
  const vtActivePoints = useMemo(
    () => vtDomainPoints.filter(p => p.t <= time + 0.01),
    [vtDomainPoints, time]
  )

  // ── 微元法窄条分块计算 (N 份) —— 纯物理数据，不含像素坐标 ──
  const microSlices = useMemo(() => {
    if (splitN <= 0 || time <= 0) return []
    const slices: {
      t0: number
      t1: number
      vi: number
      area: number
      index: number
    }[] = []
    const dt = time / splitN
    for (let j = 0; j < splitN; j++) {
      const t0 = j * dt
      const t1 = t0 + dt
      const { v: vi } = calculateAcceleratedMotion(v0, a, t0)
      slices.push({ t0, t1, vi, area: vi * dt, index: j })
    }
    return slices
  }, [splitN, time, v0, a])

  // 微元估算位移累加和
  const microSlicesAreaSum = useMemo(() => {
    return microSlices.reduce((sum, s) => sum + s.area, 0)
  }, [microSlices])

  // 面积填充物理数据（渲染时在 AreaUnderlay 中用 ctx.toSvgX/Y 转换）
  const areaSegments = useMemo(() => {
    if (time <= 0) return { positive: [] as { t: number; v: number }[], negative: [] as { t: number; v: number }[], rect: null as { tStart: number; tEnd: number; v: number } | null, triangle: null as { t0: number; v0: number; t1: number; v1: number } | null }

    const tZero = a !== 0 ? -v0 / a : -1
    const segments: { tStart: number; tEnd: number; isPositive: boolean }[] = []

    if (tZero > 0 && tZero < time) {
      segments.push({ tStart: 0, tEnd: tZero, isPositive: v0 >= 0 })
      segments.push({ tStart: tZero, tEnd: time, isPositive: v0 < 0 })
    } else {
      segments.push({ tStart: 0, tEnd: time, isPositive: v >= 0 || (v0 >= 0 && time < 0.01) })
    }

    const buildCurve = (seg: { tStart: number; tEnd: number }) => {
      const pts: { t: number; v: number }[] = []
      const dt = 0.05
      for (let t = seg.tStart; t <= seg.tEnd + 0.001; t += dt) {
        const tt = Math.min(t, seg.tEnd)
        const { v: vel } = calculateAcceleratedMotion(v0, a, tt)
        pts.push({ t: tt, v: vel })
      }
      return pts
    }

    const positive = segments.filter(s => s.isPositive).flatMap(buildCurve)
    const negative = segments.filter(s => !s.isPositive).flatMap(buildCurve)

    const rect = time > 0 ? { tStart: 0, tEnd: time, v: v0 } : null
    const triangle = time > 0 ? { t0: 0, v0, t1: time, v1: v } : null

    return { positive, negative, rect, triangle }
  }, [v0, a, v, time])

  // 割补法三角形顶点 —— 纯物理坐标
  const equivRectGeometry = useMemo(() => {
    if (showEquivRect !== 1 || time <= 0) return null
    const halfT = time / 2
    const { v: vHalf } = calculateAcceleratedMotion(v0, a, halfT)
    return { t0: 0, tHalf: halfT, tEnd: time, v0, vHalf, vEnd: v }
  }, [showEquivRect, time, v0, a, v])

  // ── 地面刻度直尺 ──
  const landmarks = useMemo(() => {
    const count = 5
    const labels: { x: number; text: string }[] = []
    for (let i = 0; i <= count; i++) {
      const dist = i * 20
      const px = startX + dist * scale
      if (px <= maxVisibleX) {
        labels.push({ x: px, text: `${dist.toFixed(0)}m` })
      }
    }
    return labels
  }, [scale, startX, maxVisibleX])

  // 自定义面积插件层（4种模式）—— 全部使用 chart context 坐标系
  const AreaUnderlay = () => {
    const ctx = useChartContext()
    if (!ctx) return null

    if (splitN > 0) {
      // A. 微元法分割窄条
      return (
        <g>
          {microSlices.map((slice) => {
            const x0 = ctx.toSvgX(slice.t0)
            const x1 = ctx.toSvgX(slice.t1)
            const yTop = ctx.toSvgY(slice.vi)
            const yBase = ctx.toSvgY(0)
            return (
              <rect
                key={`slice-${slice.index}`}
                x={x0}
                y={Math.min(yTop, yBase)}
                width={Math.max(0.5, x1 - x0)}
                height={Math.max(0.5, Math.abs(yBase - yTop))}
                fill={VT_CHART_COLORS.areaShade}
                opacity={0.3}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={0.5}
              />
            )
          })}
          {time > 0 && (
            <text
              x={ctx.toSvgX(time / 2)}
              y={ctx.toSvgY(v0 * 0.5) + (v0 >= 0 ? -6 : 12)}
              fontSize={font(9)}
              textAnchor="middle"
              fill={PHYSICS_COLORS.displacement}
              fontWeight="bold"
            >
              积分和 ∑v_i·Δt ≈ {microSlicesAreaSum.toFixed(2)} m
            </text>
          )}
        </g>
      )
    }

    if (showEquivRect === 1 && equivRectGeometry) {
      // B. 等效矩形割补法
      const { t0, tHalf, tEnd, v0: ev0, vHalf, vEnd } = equivRectGeometry
      const px0 = ctx.toSvgX(t0)
      const pxHalf = ctx.toSvgX(tHalf)
      const pxEnd = ctx.toSvgX(tEnd)
      const py0 = ctx.toSvgY(ev0)
      const pyHalf = ctx.toSvgY(vHalf)
      const pyEnd = ctx.toSvgY(vEnd)
      const pyZero = ctx.toSvgY(0)
      return (
        <g>
          <rect
            x={px0}
            y={Math.min(pyHalf, pyZero)}
            width={pxEnd - px0}
            height={Math.abs(pyZero - pyHalf)}
            fill={VT_CHART_COLORS.areaShade}
            opacity={0.2}
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={1}
            strokeDasharray="4 2"
          />
          <path d={`M ${px0},${py0} L ${pxHalf},${pyHalf} L ${px0},${pyHalf} Z`} fill={CHART_COLORS.areaFillWarm} opacity={0.3} />
          <text x={px0 + 8} y={pyHalf + (ev0 >= vEnd ? 10 : -6)} fontSize={font(8)} fill={CHART_COLORS.labelText} opacity={0.8}>缺失</text>

          <path d={`M ${pxHalf},${pyHalf} L ${pxEnd},${pyEnd} L ${pxEnd},${pyHalf} Z`} fill={CHART_COLORS.areaFillWarm} opacity={0.3} />
          <text x={pxEnd - 24} y={pyHalf + (ev0 >= vEnd ? -6 : 10)} fontSize={font(8)} fill={CHART_COLORS.labelText} opacity={0.8}>超出</text>

          <path
            d={`M ${pxHalf + (pxEnd - pxHalf) * 0.5},${(pyHalf + pyEnd) / 2} Q ${pxHalf},${pyHalf - 15} ${px0 + (pxHalf - px0) * 0.5},${(pyHalf + py0) / 2}`}
            fill="none"
            stroke={PHYSICS_COLORS.referencePoint}
            strokeWidth={1.5}
            strokeDasharray="3 3"
            markerEnd={`url(#${markerId(selectMarkerTier(60), PHYSICS_COLORS.referencePoint)})`}
          />

          <text
            x={pxEnd - 4}
            y={pyHalf - 4}
            fontSize={font(8)}
            textAnchor="end"
            fill={PHYSICS_COLORS.averageVelocity}
            fontWeight="bold"
          >
            平均速度 v̄ = v(t/2) = {vHalf.toFixed(2)} m/s
          </text>
        </g>
      )
    }

    if (showSplit === 1) {
      // C. 经典拆分模式: v₀t 矩形 + ½at² 三角形
      const { rect, triangle } = areaSegments
      return (
        <>
          {rect && (
            <rect
              x={ctx.toSvgX(rect.tStart)}
              y={Math.min(ctx.toSvgY(rect.v), ctx.toSvgY(0))}
              width={Math.max(0, ctx.toSvgX(rect.tEnd) - ctx.toSvgX(rect.tStart))}
              height={Math.abs(ctx.toSvgY(0) - ctx.toSvgY(rect.v))}
              fill={VT_CHART_COLORS.areaShade}
              opacity={0.35}
            />
          )}
          {triangle && (
            <path
              d={`M ${ctx.toSvgX(triangle.t0)},${ctx.toSvgY(triangle.v0)} L ${ctx.toSvgX(triangle.t1)},${ctx.toSvgY(triangle.v1)} L ${ctx.toSvgX(triangle.t1)},${ctx.toSvgY(triangle.v0)} Z`}
              fill={CHART_COLORS.areaFillWarm}
              opacity={0.35}
            />
          )}
          {time > 0 && (
            <line
              x1={ctx.toSvgX(0)}
              y1={ctx.toSvgY(v0)}
              x2={ctx.toSvgX(time)}
              y2={ctx.toSvgY(v0)}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={1}
              strokeDasharray={DASH.guide.join(',')}
              opacity={0.6}
            />
          )}
          {time > 0 && v0 !== 0 && (
            <text x={ctx.toSvgX(time / 2)} y={ctx.toSvgY(v0 / 2) + 3} fontSize={font(9)} textAnchor="middle" fill={VT_CHART_COLORS.velocityCurve} fontWeight="bold">
              v₀t = {(v0 * time).toFixed(1)} m
            </text>
          )}
          {time > 0 && a !== 0 && (
            <text x={ctx.toSvgX(time * 0.65)} y={ctx.toSvgY(v0 + (v - v0) * 0.35) + 3} fontSize={font(9)} textAnchor="middle" fill={VT_CHART_COLORS.velocityCurve} fontWeight="bold">
              ½at² = {(0.5 * a * time * time).toFixed(1)} m
            </text>
          )}
        </>
      )
    }

    // D. 合并梯形面积
    const buildAreaPath = (pts: { t: number; v: number }[]) => {
      if (pts.length === 0) return ''
      const yBase = ctx.toSvgY(0)
      const first = pts[0]
      const last = pts[pts.length - 1]
      let d = `M ${ctx.toSvgX(first.t).toFixed(1)},${yBase.toFixed(1)}`
      for (const p of pts) {
        d += ` L ${ctx.toSvgX(p.t).toFixed(1)},${ctx.toSvgY(p.v).toFixed(1)}`
      }
      d += ` L ${ctx.toSvgX(last.t).toFixed(1)},${yBase.toFixed(1)} Z`
      return d
    }
    const posPath = buildAreaPath(areaSegments.positive)
    const negPath = buildAreaPath(areaSegments.negative)
    return (
      <>
        {posPath && <path d={posPath} fill={VT_CHART_COLORS.areaShade} opacity={0.3} />}
        {negPath && <path d={negPath} fill={CHART_COLORS.areaFillWarm} opacity={0.3} />}
      </>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      {/* ══════════ 上半部分：v-t 图（使用 VelocityTimeChart 标准组件） ══════════ */}
      <div style={{ height: chartSectionHeight }}>
        <VelocityTimeChart
          mode="animated"
          points={vtActivePoints}
          domainPoints={vtDomainPoints}
          currentTime={time}
          tMax={VT_X_MAX}
          vRange={[vtYMin, vtYMax]}
          title="匀变速直线运动 v-t 图象"
          xLabel="t / s"
          yLabel="v / (m/s)"
          showArea={false}
          showCursor={time > 0 && time <= VT_X_MAX}
          showGrid
          underlay={<AreaUnderlay />}
        />
      </div>

      {/* 分隔线 */}
      <svg width={canvasSize.width} height={1} className="flex-shrink-0">
        <line x1={padding} y1={0} x2={canvasSize.width - padding} y2={0} stroke={CHART_COLORS.gridLine} strokeWidth={1} />
      </svg>

      {/* ══════════ 下半部分：动画舞台 ══════════ */}
      <div className="flex-1 relative">
        <svg width={canvasSize.width} height={canvasSize.height - chartSectionHeight} className="absolute inset-0">
        <g transform={`translate(0, ${-chartSectionHeight})`}>

        {/* 地面精密厘米直尺跑道 */}
        <line x1={padding * 0.5} y1={groundY} x2={canvasSize.width - padding * 0.5} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />
        {Array.from({ length: Math.floor((canvasSize.width - padding) / 10) + 1 }).map((_, idx) => {
          const tickX = padding * 0.5 + idx * 10
          const isMajor = idx % 5 === 0
          const tickHeight = isMajor ? 6 : 3
          return (
            <line
              key={`ground-tick-${idx}`}
              x1={tickX}
              y1={groundY}
              x2={tickX}
              y2={groundY + tickHeight}
              stroke={PHYSICS_COLORS.axis}
              strokeWidth={STROKE.tick}
            />
          )
        })}

        {/* 测距地标文本 */}
        {landmarks.map((lm, i) => (
          <g key={`lm-${i}`}>
            <line x1={lm.x} y1={groundY} x2={lm.x} y2={groundY + 8} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.tickBold} />
            <text x={lm.x} y={groundY + fontSize + 8} fontSize={smallFont} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">{lm.text}</text>
          </g>
        ))}

        {/* 起始参考线 */}
        <line x1={startX} y1={groundY - objH * 2.2} x2={startX} y2={groundY + 4} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axisBold} strokeDasharray={DASH.boundary.join(',')} />
        <text x={startX} y={groundY + fontSize + 8} fontSize={fontSize} fill={PHYSICS_COLORS.axis} textAnchor="middle" fontWeight="bold">0</text>

        {/* 位移投影带 (分段或完整) */}
        {!isOffscreen && s !== 0 && (
          splitN > 0 ? (
            <g>
              {microSlices.map((slice) => {
                const sliceW = slice.area * scale
                const prevSum = microSlices.slice(0, slice.index).reduce((sum, curr) => sum + curr.area, 0)
                const sliceX = startX + prevSum * scale
                return (
                  <rect
                    key={`slice-proj-${slice.index}`}
                    x={sliceX}
                    y={groundY + 4}
                    width={Math.max(0, sliceW)}
                    height={6}
                    fill={slice.index % 2 === 0 ? PHYSICS_COLORS.displacement : PHYSICS_COLORS.averageVelocity}
                    opacity={0.5}
                    stroke="white"
                    strokeWidth={0.5}
                  />
                )
              })}
            </g>
          ) : (
            <rect
              x={Math.min(startX, currentX)}
              y={groundY + 4}
              width={Math.abs(currentX - startX)}
              height={6}
              fill={CHART_COLORS.areaFill}
              opacity={0.5}
              rx={2}
            />
          )
        )}

        {/* 工程线框风格小车 */}
        {!isOffscreen && (
          <SportsCar
            x={currentX}
            y={groundY - objH}
            width={objW}
            height={objH}
            velocity={v}
            time={time}
          />
        )}

        {/* 速度及加速度矢量箭头 */}
        {showVectors && !isOffscreen && Math.abs(v) > 0.1 && (
          <g>
            <VectorArrow
              origin={{ x: currentX + (v > 0 ? objW + 4 : -4), y: -(groundY - objH * 0.5) }}
              vector={{ x: v, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorMain}
            />
            <text x={currentX + (v > 0 ? objW + 8 : -8) + sceneScale.maxVectorLength * 0.35} y={groundY - objH * 0.5 + fontSize * 0.35} fontSize={fontSize} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
          </g>
        )}

        {showVectors && !isOffscreen && Math.abs(a) > 0.05 && (
          <g>
            <VectorArrow
              origin={{ x: currentX + objW * 0.5, y: -(groundY - objH - 6) }}
              vector={{ x: a, y: 0 }}
              type="acceleration"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorSub}
            />
            <text x={currentX + objW * 0.5 + sceneScale.maxVectorLength * 0.35 + 6} y={groundY - objH - 6 + fontSize * 0.35} fontSize={fontSize} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">a</text>
          </g>
        )}

        {/* 5 个文字标注 */}
        {!isOffscreen && (
          <g>
            <text x={padding} y={stageTop + fontSize + 4} fontSize={smallFont} fill={PHYSICS_COLORS.velocity} fontWeight="bold">速度 v = {v.toFixed(2)} m/s</text>
            <text x={padding + 120} y={stageTop + fontSize + 4} fontSize={smallFont} fill={PHYSICS_COLORS.displacement} fontWeight="bold">位移 x = {s.toFixed(2)} m</text>
            <text x={padding + 240} y={stageTop + fontSize + 4} fontSize={smallFont} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">加速度 a = {a.toFixed(1)} m/s²</text>
            <text x={padding + 370} y={stageTop + fontSize + 4} fontSize={smallFont} fill={PHYSICS_COLORS.labelText} fontWeight="bold">时间 t = {time.toFixed(2)} s</text>
            <text x={padding + 480} y={stageTop + fontSize + 4} fontSize={smallFont} fill={CHART_COLORS.labelText} fontWeight="bold">
              {splitN > 0 ? '积分和 ≈ 位移' : (showEquivRect === 1 ? '平均速度矩形面积 = 位移' : '面积 = 位移')}
            </text>
          </g>
        )}

        {/* 箭头标记定义 */}
        <VectorDefs colors={[PHYSICS_COLORS.velocity, PHYSICS_COLORS.acceleration, PHYSICS_COLORS.referencePoint]} />
        </g>
      </svg>
      </div>
    </div>
  )
}
