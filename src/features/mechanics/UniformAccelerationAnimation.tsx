import { useCanvasSize } from '@/utils'
import { useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { calculateAcceleratedMotion } from '@/physics'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  VT_CHART_COLORS,
  STROKE,
  DASH,
  FONT,
  OPACITY,
} from '@/theme/physics'

/**
 * 匀变速直线运动 · 基础模式动画
 *
 * 上半部分：v-t 图面积可视化（可演示微元切割逼近或平均速度割补法）
 * 下半部分：运动舞台（线框小车 + 轮轴旋转滚动 + 分段位移投影带）
 *
 * 严格符合 project_rules.md 视觉与信息密度要求。
 */
export default function UniformAccelerationAnimation() {
  const { params, time, showVectors, showGrid, setIsPlaying } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  const { v0 = 0, a = 1.5, showSplit = 1, scale: scaleParam = 1, splitN = 0, showEquivRect = 0 } = params

  // ── 动态布局 ──
  const padding = canvasSize.width * 0.07
  const fontSize = Math.max(10, canvasSize.width * 0.017)
  const smallFont = Math.max(9, fontSize * 0.85)

  // 上半部分：v-t 图（60%）
  const chartSectionHeight = canvasSize.height * 0.6
  const chartLeft = padding + 30
  const chartRight = canvasSize.width - padding
  const chartWidth = chartRight - chartLeft
  const chartInnerTop = 24
  const chartInnerBottom = chartSectionHeight - 20
  const chartInnerHeight = chartInnerBottom - chartInnerTop

  // 下半部分：动画舞台（40%）
  const stageTop = chartSectionHeight + 4
  const stageHeight = canvasSize.height - stageTop
  const groundY = stageTop + stageHeight * 0.72
  const objW = canvasSize.width * 0.06
  const objH = objW * 0.7

  // 物理位移坐标缩放
  const baseScale = canvasSize.width * 0.03
  const scale = baseScale * scaleParam
  const startX = padding
  const maxVisibleX = canvasSize.width - padding

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

  const toChartX = (t: number) => chartLeft + (t / VT_X_MAX) * chartWidth
  const toChartY = (vel: number) => chartInnerBottom - ((vel - vtYMin) / (vtYMax - vtYMin)) * chartInnerHeight

  // v-t 图曲线数据（渐进绘制到当前时间）
  const vtPathData = useMemo(() => {
    const dt = 0.05
    const points: string[] = []
    const limitT = Math.min(time, VT_X_MAX)
    for (let t = 0; t <= limitT + 0.001; t += dt) {
      const { v: vel } = calculateAcceleratedMotion(v0, a, t)
      points.push(`${t === 0 ? 'M' : 'L'} ${toChartX(t).toFixed(1)},${toChartY(vel).toFixed(1)}`)
    }
    // 确保最后一帧封口完美
    if (limitT > 0) {
      const { v: vel } = calculateAcceleratedMotion(v0, a, limitT)
      points.push(`L ${toChartX(limitT).toFixed(1)},${toChartY(vel).toFixed(1)}`)
    }
    return points.join(' ')
  }, [v0, a, time, toChartX, toChartY])

  // ── 微元法窄条分块计算 (N 份) ──
  const microSlices = useMemo(() => {
    if (splitN <= 0 || time <= 0) return []
    const slices: {
      leftX: number
      rightX: number
      heightY: number
      area: number
      index: number
    }[] = []
    const dt = time / splitN
    for (let j = 0; j < splitN; j++) {
      const t_j = j * dt
      const { v: v_j } = calculateAcceleratedMotion(v0, a, t_j)
      const leftX = toChartX(t_j)
      const rightX = toChartX(t_j + dt)
      const heightY = toChartY(v_j)
      slices.push({
        leftX,
        rightX,
        heightY,
        area: v_j * dt,
        index: j,
      })
    }
    return slices
  }, [splitN, time, v0, a, toChartX, toChartY])

  // 微元估算位移累加和
  const microSlicesAreaSum = useMemo(() => {
    return microSlices.reduce((sum, s) => sum + s.area, 0)
  }, [microSlices])

  // 面积填充路径
  const areaPaths = useMemo(() => {
    if (time <= 0) return { positive: '', negative: '', rect: '', triangle: '' }

    const tZero = a !== 0 ? -v0 / a : -1
    const segments: { tStart: number; tEnd: number; isPositive: boolean }[] = []

    if (tZero > 0 && tZero < time) {
      segments.push({ tStart: 0, tEnd: tZero, isPositive: v0 >= 0 })
      segments.push({ tStart: tZero, tEnd: time, isPositive: v0 < 0 })
    } else {
      segments.push({ tStart: 0, tEnd: time, isPositive: v >= 0 || (v0 >= 0 && time < 0.01) })
    }

    const posSegs = segments.filter(seg => seg.isPositive)
    const positivePath = posSegs.map(seg => {
      const dt = 0.05
      const pts: string[] = []
      for (let t = seg.tStart; t <= seg.tEnd + 0.001; t += dt) {
        const tt = Math.min(t, seg.tEnd)
        const { v: vel } = calculateAcceleratedMotion(v0, a, tt)
        pts.push(`${toChartX(tt).toFixed(1)},${toChartY(vel).toFixed(1)}`)
      }
      return `M ${toChartX(seg.tStart).toFixed(1)},${toChartY(0).toFixed(1)} L ${pts.join(' L ')} L ${toChartX(seg.tEnd).toFixed(1)},${toChartY(0).toFixed(1)} Z`
    }).join(' ')

    const negSegs = segments.filter(seg => !seg.isPositive)
    const negativePath = negSegs.map(seg => {
      const dt = 0.05
      const pts: string[] = []
      for (let t = seg.tStart; t <= seg.tEnd + 0.001; t += dt) {
        const tt = Math.min(t, seg.tEnd)
        const { v: vel } = calculateAcceleratedMotion(v0, a, tt)
        pts.push(`${toChartX(tt).toFixed(1)},${toChartY(vel).toFixed(1)}`)
      }
      return `M ${toChartX(seg.tStart).toFixed(1)},${toChartY(0).toFixed(1)} L ${pts.join(' L ')} L ${toChartX(seg.tEnd).toFixed(1)},${toChartY(0).toFixed(1)} Z`
    }).join(' ')

    const rectPath = time > 0
      ? `M ${toChartX(0).toFixed(1)},${toChartY(0).toFixed(1)} L ${toChartX(0).toFixed(1)},${toChartY(v0).toFixed(1)} L ${toChartX(time).toFixed(1)},${toChartY(v0).toFixed(1)} L ${toChartX(time).toFixed(1)},${toChartY(0).toFixed(1)} Z`
      : ''

    const triPath = time > 0
      ? `M ${toChartX(0).toFixed(1)},${toChartY(v0).toFixed(1)} L ${toChartX(time).toFixed(1)},${toChartY(v).toFixed(1)} L ${toChartX(time).toFixed(1)},${toChartY(v0).toFixed(1)} Z`
      : ''

    return { positive: positivePath, negative: negativePath, rect: rectPath, triangle: triPath }
  }, [v0, a, v, time, toChartX, toChartY])

  // ── 网格线 ──
  const gridLines = useMemo(() => {
    if (!showGrid) return []
    const lines: { x: number; key: string }[] = []
    const gridCount = Math.max(8, Math.floor(canvasSize.width / 60))
    for (let i = 0; i <= gridCount; i++) {
      lines.push({
        x: startX + (i * (maxVisibleX - startX)) / gridCount,
        key: `grid-${i}`,
      })
    }
    return lines
  }, [showGrid, canvasSize.width, startX, maxVisibleX])

  // ── 地面刻度直尺 ──
  const landmarks = useMemo(() => {
    const count = 5
    const labels: { x: number; text: string }[] = []
    for (let i = 0; i <= count; i++) {
      const dist = (i * 20) / scaleParam
      const px = startX + dist * scale
      if (px <= maxVisibleX) {
        labels.push({ x: px, text: `${dist.toFixed(0)}m` })
      }
    }
    return labels
  }, [scale, scaleParam, startX, maxVisibleX])

  // v-t 图刻度
  const xticks = [0, 2, 4, 6, 8]
  const yticks = useMemo(() => {
    const step = (vtYMax - vtYMin) > 20 ? 10 : (vtYMax - vtYMin) > 10 ? 5 : 2
    const ticks: number[] = []
    for (let val = Math.ceil(vtYMin / step) * step; val <= vtYMax; val += step) {
      ticks.push(val)
    }
    return ticks
  }, [vtYMin, vtYMax])

  // 割补法三角形顶点计算
  const equivRectGeometry = useMemo(() => {
    if (showEquivRect !== 1 || time <= 0) return null
    const halfT = time / 2
    const { v: vHalf } = calculateAcceleratedMotion(v0, a, halfT)
    const x0 = toChartX(0)
    const xHalf = toChartX(halfT)
    const xEnd = toChartX(time)
    const y0 = toChartY(v0)
    const yHalf = toChartY(vHalf)
    const yEnd = toChartY(v)
    const yZero = toChartY(0)

    // 左下角空缺三角形: (x0, y0) -> (xHalf, yHalf) -> (x0, yHalf)
    const emptyTriD = `M ${x0},${y0} L ${xHalf},${yHalf} L ${x0},${yHalf} Z`
    // 右上角超出三角形: (xHalf, yHalf) -> (xEnd, yEnd) -> (xEnd, yHalf)
    const extraTriD = `M ${xHalf},${yHalf} L ${xEnd},${yEnd} L ${xEnd},${yHalf} Z`

    return { x0, xHalf, xEnd, y0, yHalf, yEnd, yZero, vHalf, emptyTriD, extraTriD }
  }, [showEquivRect, time, v0, a, v, toChartX, toChartY])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {/* ── 0. 网格纸底纹（科学实验室手稿底感） ── */}
        <defs>
          <pattern id="physics-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid} opacity={OPACITY.grid} />
          </pattern>
        </defs>
        <rect width={canvasSize.width} height={canvasSize.height} fill="url(#physics-grid)" />

        {/* ══════════ 上半部分：v-t 图面积可视化 ══════════ */}

        {/* 坐标网格辅助虚线 */}
        {xticks.map(t => (
          <line
            key={`x-grid-${t}`}
            x1={toChartX(t)}
            y1={chartInnerTop}
            x2={toChartX(t)}
            y2={chartInnerBottom}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={0.5}
            strokeDasharray="4 4"
          />
        ))}

        {/* 坐标轴 */}
        <line x1={chartLeft} y1={chartInnerTop} x2={chartLeft} y2={chartInnerBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.axis} />
        <line x1={chartLeft} y1={toChartY(0)} x2={chartRight} y2={toChartY(0)} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.axisBold} />

        {/* X 轴刻度 */}
        {xticks.map(t => (
          <g key={`xt-${t}`}>
            <line x1={toChartX(t)} y1={toChartY(0) - 3} x2={toChartX(t)} y2={toChartY(0) + 3} stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
            <text x={toChartX(t)} y={toChartY(0) + 14} fontSize={8} textAnchor="middle" fill={CHART_COLORS.tickLabel} fontWeight="600">{t}</text>
          </g>
        ))}

        {/* Y 轴刻度 */}
        {yticks.map(vel => (
          <g key={`yt-${vel}`}>
            <line x1={chartLeft - 3} y1={toChartY(vel)} x2={chartLeft} y2={toChartY(vel)} stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
            <text x={chartLeft - 7} y={toChartY(vel) + 3} fontSize={8} textAnchor="end" fill={CHART_COLORS.tickLabel} fontWeight="600">{vel}</text>
          </g>
        ))}

        {/* 轴标签 */}
        <text x={chartRight - 10} y={toChartY(0) - 8} fontSize={9} fill={CHART_COLORS.labelText} fontWeight="bold">t / s</text>
        <text x={chartLeft - 10} y={chartInnerTop - 10} fontSize={9} fill={CHART_COLORS.labelText} textAnchor="end" fontWeight="bold">v / (m/s)</text>
        <text x={chartLeft + chartWidth / 2} y={16} fontSize={FONT.labelBold} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">匀变速直线运动 v-t 图象</text>

        {/* 1. 面积填充逻辑 */}
        {splitN > 0 ? (
          // A. 微元法分割窄条绘制 (N 份)
          <g>
            {microSlices.map((slice) => (
              <rect
                key={`slice-${slice.index}`}
                x={slice.leftX}
                y={Math.min(slice.heightY, toChartY(0))}
                width={Math.max(0.5, slice.rightX - slice.leftX)}
                height={Math.max(0.5, Math.abs(toChartY(0) - slice.heightY))}
                fill={VT_CHART_COLORS.areaShade}
                opacity={0.3}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={0.5}
              />
            ))}
            {/* 微元估算面积值标注 */}
            {time > 0 && (
              <text
                x={toChartX(time / 2)}
                y={toChartY(v0 * 0.5) + (v0 >= 0 ? -6 : 12)}
                fontSize={9}
                textAnchor="middle"
                fill={PHYSICS_COLORS.displacement}
                fontWeight="bold"
              >
                积分和 ∑v_i·Δt ≈ {microSlicesAreaSum.toFixed(2)} m
              </text>
            )}
          </g>
        ) : showEquivRect === 1 && equivRectGeometry ? (
          // B. 等效矩形割补法绘制
          <g>
            {/* 等效平均速度矩形 (v_half * t) */}
            <rect
              x={equivRectGeometry.x0}
              y={Math.min(equivRectGeometry.yHalf, toChartY(0))}
              width={equivRectGeometry.xEnd - equivRectGeometry.x0}
              height={Math.abs(toChartY(0) - equivRectGeometry.yHalf)}
              fill={VT_CHART_COLORS.areaShade}
              opacity={0.2}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={1}
              strokeDasharray="4 2"
            />
            {/* 左下三角形：空缺部分 (填充斜纹) */}
            <path
              d={equivRectGeometry.emptyTriD}
              fill={CHART_COLORS.areaFillWarm}
              opacity={0.3}
            />
            <text x={equivRectGeometry.x0 + 8} y={equivRectGeometry.yHalf + (v0 >= v ? 10 : -6)} fontSize={8} fill={CHART_COLORS.labelText} opacity={0.8}>缺失</text>

            {/* 右上三角形：超出部分 */}
            <path
              d={equivRectGeometry.extraTriD}
              fill={CHART_COLORS.areaFillWarm}
              opacity={0.3}
            />
            <text x={equivRectGeometry.xEnd - 24} y={equivRectGeometry.yHalf + (v0 >= v ? -6 : 10)} fontSize={8} fill={CHART_COLORS.labelText} opacity={0.8}>超出</text>

            {/* 割补平移指示线 (画一条曲线箭头从超出到缺失) */}
            <path
              d={`M ${equivRectGeometry.xHalf + (equivRectGeometry.xEnd - equivRectGeometry.xHalf) * 0.5},${(equivRectGeometry.yHalf + equivRectGeometry.yEnd) / 2} Q ${equivRectGeometry.xHalf},${equivRectGeometry.yHalf - 15} ${equivRectGeometry.x0 + (equivRectGeometry.xHalf - equivRectGeometry.x0) * 0.5},${(equivRectGeometry.yHalf + equivRectGeometry.y0) / 2}`}
              fill="none"
              stroke={PHYSICS_COLORS.referencePoint}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              markerEnd="url(#arrowhead-ua-equiv)"
            />

            {/* 平均速度标注 */}
            <text
              x={equivRectGeometry.xEnd - 4}
              y={equivRectGeometry.yHalf - 4}
              fontSize={8}
              textAnchor="end"
              fill={PHYSICS_COLORS.averageVelocity}
              fontWeight="bold"
            >
              平均速度 v̄ = v(t/2) = {equivRectGeometry.vHalf.toFixed(2)} m/s
            </text>
          </g>
        ) : showSplit === 1 ? (
          // C. 经典拆分模式: v₀t (矩形) + ½at² (三角形)
          <>
            {/* 矩形分块 v₀t */}
            {areaPaths.rect && <path d={areaPaths.rect} fill={VT_CHART_COLORS.areaShade} opacity={0.35} />}
            {/* 三角形分块 ½at² */}
            {areaPaths.triangle && <path d={areaPaths.triangle} fill={CHART_COLORS.areaFillWarm} opacity={0.35} />}
            {/* v₀ 高度虚线分隔 */}
            {time > 0 && (
              <line
                x1={toChartX(0)}
                y1={toChartY(v0)}
                x2={toChartX(time)}
                y2={toChartY(v0)}
                stroke={CHART_COLORS.axisLine}
                strokeWidth={1}
                strokeDasharray={DASH.guide.join(',')}
                opacity={0.6}
              />
            )}
            {/* 矩形面积值标注 */}
            {time > 0 && v0 !== 0 && (
              <text
                x={toChartX(time / 2)}
                y={toChartY(v0 / 2) + 3}
                fontSize={9}
                textAnchor="middle"
                fill={VT_CHART_COLORS.velocityCurve}
                fontWeight="bold"
              >
                v₀t = {(v0 * time).toFixed(1)} m
              </text>
            )}
            {/* 三角形面积值标注 */}
            {time > 0 && a !== 0 && (
              <text
                x={toChartX(time * 0.65)}
                y={toChartY(v0 + (v - v0) * 0.35) + 3}
                fontSize={9}
                textAnchor="middle"
                fill={VT_CHART_COLORS.velocityCurve}
                fontWeight="bold"
              >
                ½at² = {(0.5 * a * time * time).toFixed(1)} m
              </text>
            )}
          </>
        ) : (
          // D. 合并梯形面积
          <>
            {areaPaths.positive && <path d={areaPaths.positive} fill={VT_CHART_COLORS.areaShade} opacity={0.3} />}
            {areaPaths.negative && <path d={areaPaths.negative} fill={CHART_COLORS.areaFillWarm} opacity={0.3} />}
          </>
        )}

        {/* 4. v-t 曲线 */}
        {vtPathData && (
          <path d={vtPathData} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={STROKE.chartMain} />
        )}

        {/* 5. 当前时刻竖轴线 */}
        {time > 0 && time <= VT_X_MAX && (
          <line x1={toChartX(time)} y1={chartInnerTop} x2={toChartX(time)} y2={chartInnerBottom} stroke={PHYSICS_COLORS.velocity} strokeWidth={STROKE.reference} strokeDasharray={DASH.guide.join(',')} opacity={0.5} />
        )}

        {/* ══════════ 下半部分：动画舞台 ══════════ */}

        {/* 分隔线 */}
        <line x1={padding} y1={chartSectionHeight} x2={canvasSize.width - padding} y2={chartSectionHeight} stroke={CHART_COLORS.gridLine} strokeWidth={1} />

        {/* 地面精密厘米直尺跑道 */}
        <line x1={padding * 0.5} y1={groundY} x2={canvasSize.width - padding * 0.5} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />
        {/* 厘米直尺细小刻度线 */}
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

        {/* 坐标网格垂直辅助虚线 */}
        {gridLines.map((g) => (
          <line key={g.key} x1={g.x} y1={groundY - objH * 2.2} x2={g.x} y2={groundY + 4} stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid} strokeDasharray={DASH.guide.join(',')} />
        ))}

        {/* 起始参考线 */}
        <line x1={startX} y1={groundY - objH * 2.2} x2={startX} y2={groundY + 4} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axisBold} strokeDasharray={DASH.boundary.join(',')} />
        <text x={startX} y={groundY + fontSize + 8} fontSize={fontSize} fill={PHYSICS_COLORS.axis} textAnchor="middle" fontWeight="bold">0</text>

        {/* 6. 位移投影带 (分段或完整) */}
        {!isOffscreen && s !== 0 && (
          splitN > 0 ? (
            // A. 分段投影带 (对应微积分逼近窄条位移)
            <g>
              {microSlices.map((slice) => {
                const sliceW = slice.area * scale
                // 积分前段位移和
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
            // B. 完整位移投影带
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

        {/* 7. 工程线框风格小车 */}
        {!isOffscreen && (
          <g transform={`translate(${currentX}, ${groundY - objH})`}>
            {/* 空气流动速度层流线 (流流气流，无游戏粒子) */}
            {time > 0 && (
              <g opacity={0.5} transform={`translate(-10, 0)`}>
                <line x1={-15 - v * 0.1} y1="4" x2="-2" y2="4" stroke={PHYSICS_COLORS.velocityY} strokeWidth={1} strokeDasharray="3 2" />
                <line x1={-25 - v * 0.15} y1="10" x2="-4" y2="10" stroke={PHYSICS_COLORS.velocityY} strokeWidth={1.5} />
                <line x1={-12 - v * 0.08} y1="16" x2="-2" y2="16" stroke={PHYSICS_COLORS.velocityY} strokeWidth={1} strokeDasharray="3 2" />
              </g>
            )}
            {/* 小车流线机身 */}
            <path
              d={`M 2,${objH - 4} Q 4,2 12,2 L 24,2 Q 32,2 38,6 L 40,${objH - 4} Z`}
              fill={PHYSICS_COLORS.objectFillNeutral}
              stroke={PHYSICS_COLORS.objectStroke}
              strokeWidth={STROKE.objectLine}
            />
            {/* 车窗 */}
            <rect x={objW * 0.45} y={4} width={objW * 0.25} height={objH * 0.35} rx={1} fill={PHYSICS_COLORS.grid} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
            
            {/* 十字辐条滚转车轮 */}
            {/* 前轮 */}
            <g transform={`translate(${objW * 0.25}, ${objH - 2})`}>
              <circle cx="0" cy="0" r={objH * 0.18} fill={PHYSICS_COLORS.objectFillNeutral} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1.5} />
              <g transform={`rotate(${(v * time * 45) % 360})`}>
                <line x1={-objH * 0.18} y1="0" x2={objH * 0.18} y2="0" stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
                <line x1="0" y1={-objH * 0.18} x2="0" y2={objH * 0.18} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
              </g>
            </g>
            {/* 后轮 */}
            <g transform={`translate(${objW * 0.75}, ${objH - 2})`}>
              <circle cx="0" cy="0" r={objH * 0.18} fill={PHYSICS_COLORS.objectFillNeutral} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1.5} />
              <g transform={`rotate(${(v * time * 45) % 360})`}>
                <line x1={-objH * 0.18} y1="0" x2={objH * 0.18} y2="0" stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
                <line x1="0" y1={-objH * 0.18} x2="0" y2={objH * 0.18} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
              </g>
            </g>
          </g>
        )}

        {/* 速度及加速度矢量箭头 */}
        {showVectors && !isOffscreen && Math.abs(v) > 0.1 && (
          <g>
            <line
              x1={currentX + (v > 0 ? objW + 4 : -4)}
              y1={groundY - objH * 0.5}
              x2={currentX + (v > 0 ? objW + 4 : -4) + v * scale * 0.15}
              y2={groundY - objH * 0.5}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrowhead-ua-v)"
            />
            <text x={currentX + (v > 0 ? objW + 8 : -8) + v * scale * 0.15} y={groundY - objH * 0.5 + fontSize * 0.35} fontSize={fontSize} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
          </g>
        )}

        {/* 加速度恒定标识 */}
        {showVectors && !isOffscreen && Math.abs(a) > 0.05 && (
          <g>
            <line
              x1={currentX + objW * 0.5}
              y1={groundY - objH - 6}
              x2={currentX + objW * 0.5 + a * scale * 0.12}
              y2={groundY - objH - 6}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={STROKE.vectorSub}
              markerEnd="url(#arrowhead-ua-a)"
            />
            <text x={currentX + objW * 0.5 + a * scale * 0.12 + 6} y={groundY - objH - 6 + fontSize * 0.35} fontSize={fontSize} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">a</text>
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
        <defs>
          <marker id="arrowhead-ua-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-ua-a" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.acceleration} />
          </marker>
          <marker id="arrowhead-ua-equiv" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.referencePoint} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
