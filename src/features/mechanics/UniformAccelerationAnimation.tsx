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
} from '@/theme/physics'

/**
 * 匀变速直线运动 · 基础模式动画
 *
 * 上半部分：v-t 图面积可视化（矩形分块 v₀t + 三角形分块 ½at²）
 * 下半部分：运动舞台（小车 + 速度/加速度矢量 + 位移投影带）
 *
 * 严格 7 元素 / 5 标注
 */
export default function UniformAccelerationAnimation() {
  const { params, time, showVectors, showGrid, setIsPlaying } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  const { v0 = 0, a = 1.5, showSplit = 1, scale: scaleParam = 1 } = params

  // ── 动态布局 ──
  const padding = canvasSize.width * 0.07
  const fontSize = Math.max(10, canvasSize.width * 0.017)
  const smallFont = Math.max(9, fontSize * 0.85)

  // 上半部分：v-t 图（60%）
  const chartSectionHeight = canvasSize.height * 0.6
  const chartLeft = padding + 30
  const chartRight = canvasSize.width - padding
  const chartWidth = chartRight - chartLeft
  const chartInnerTop = 20
  const chartInnerBottom = chartSectionHeight - 20
  const chartInnerHeight = chartInnerBottom - chartInnerTop

  // 下半部分：动画舞台（55%）
  const stageTop = chartSectionHeight + 4
  const stageHeight = canvasSize.height - stageTop
  const groundY = stageTop + stageHeight * 0.72
  const objW = canvasSize.width * 0.06
  const objH = objW * 0.7

  // 缩放
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
    for (let t = 0; t <= Math.min(time, VT_X_MAX) + dt; t += dt) {
      const { v: vel } = calculateAcceleratedMotion(v0, a, t)
      points.push(`${t === 0 ? 'M' : 'L'} ${toChartX(t).toFixed(1)},${toChartY(vel).toFixed(1)}`)
    }
    return points.join(' ')
  }, [v0, a, time, toChartX, toChartY])

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
      for (let t = seg.tStart; t <= seg.tEnd + dt; t += dt) {
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
      for (let t = seg.tStart; t <= seg.tEnd + dt; t += dt) {
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

  // ── 地标 ──
  const landmarks = useMemo(() => {
    const count = 5
    const labels: { x: number; text: string }[] = []
    for (let i = 0; i <= count; i++) {
      const dist = (i * 20) / scaleParam
      const px = startX + dist * scale
      if (px <= maxVisibleX) {
        labels.push({ x: px, text: `${dist.toFixed(0)}` })
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

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">

        {/* ══════════ 上半部分：v-t 图面积可视化 ══════════ */}

        {/* 坐标轴 */}
        <line x1={chartLeft} y1={chartInnerTop} x2={chartLeft} y2={chartInnerBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
        <line x1={chartLeft} y1={toChartY(0)} x2={chartRight} y2={toChartY(0)} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

        {/* X 轴刻度 */}
        {xticks.map(t => (
          <g key={`xt-${t}`}>
            <line x1={toChartX(t)} y1={toChartY(0) - 4} x2={toChartX(t)} y2={toChartY(0) + 4} stroke={CHART_COLORS.tickMark} />
            <text x={toChartX(t)} y={toChartY(0) + 16} fontSize={9} textAnchor="middle" fill={CHART_COLORS.tickLabel}>{t}</text>
          </g>
        ))}

        {/* Y 轴刻度 */}
        {yticks.map(vel => (
          <g key={`yt-${vel}`}>
            <line x1={chartLeft - 4} y1={toChartY(vel)} x2={chartLeft} y2={toChartY(vel)} stroke={CHART_COLORS.tickMark} />
            <text x={chartLeft - 8} y={toChartY(vel) + 3} fontSize={9} textAnchor="end" fill={CHART_COLORS.tickLabel}>{vel}</text>
          </g>
        ))}

        {/* 轴标签 */}
        <text x={chartLeft + chartWidth / 2} y={chartInnerBottom + 16} fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}>t/s</text>
        <text x={chartLeft - 22} y={(chartInnerTop + chartInnerBottom) / 2} fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText} transform={`rotate(-90, ${chartLeft - 22}, ${(chartInnerTop + chartInnerBottom) / 2})`}>v/(m·s⁻¹)</text>

        {/* 1. 面积填充 */}
        {showSplit === 1 ? (
          <>
            {/* 2. 矩形分块 v₀t */}
            {areaPaths.rect && <path d={areaPaths.rect} fill={VT_CHART_COLORS.areaShade} opacity={0.35} />}
            {/* 3. 三角形分块 ½at² */}
            {areaPaths.triangle && <path d={areaPaths.triangle} fill={CHART_COLORS.areaFillWarm} opacity={0.35} />}
            {/* 拆分模式：v₀ 高度虚线分隔 */}
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
                fontSize={10}
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
                fontSize={10}
                textAnchor="middle"
                fill={VT_CHART_COLORS.velocityCurve}
                fontWeight="bold"
              >
                ½at² = {(0.5 * a * time * time).toFixed(1)} m
              </text>
            )}
          </>
        ) : (
          <>
            {areaPaths.positive && <path d={areaPaths.positive} fill={VT_CHART_COLORS.areaShade} opacity={0.3} />}
            {areaPaths.negative && <path d={areaPaths.negative} fill={CHART_COLORS.areaFillWarm} opacity={0.3} />}
          </>
        )}

        {/* 4. v-t 曲线 */}
        {vtPathData && (
          <path d={vtPathData} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={STROKE.chartMain} />
        )}

        {/* 5. 当前时刻竖线 */}
        {time > 0 && time <= VT_X_MAX && (
          <line x1={toChartX(time)} y1={chartInnerTop} x2={toChartX(time)} y2={chartInnerBottom} stroke={PHYSICS_COLORS.velocity} strokeWidth={STROKE.reference} strokeDasharray={DASH.guide.join(',')} opacity={0.5} />
        )}

        {/* ══════════ 下半部分：动画舞台 ══════════ */}

        {/* 分隔线 */}
        <line x1={padding} y1={chartSectionHeight} x2={canvasSize.width - padding} y2={chartSectionHeight} stroke={CHART_COLORS.gridLine} strokeWidth={1} />

        {/* 地面线 */}
        <line x1={padding * 0.5} y1={groundY} x2={canvasSize.width - padding * 0.5} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />

        {/* 地标 */}
        {landmarks.map((lm, i) => (
          <g key={`lm-${i}`}>
            <line x1={lm.x} y1={groundY} x2={lm.x} y2={groundY + 6} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.tick} />
            <text x={lm.x} y={groundY + fontSize + 6} fontSize={smallFont} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">{lm.text}m</text>
          </g>
        ))}

        {/* 网格线 */}
        {gridLines.map((g) => (
          <line key={g.key} x1={g.x} y1={groundY - objH * 2} x2={g.x} y2={groundY + 4} stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid} strokeDasharray={DASH.guide.join(',')} />
        ))}

        {/* 起始线 */}
        <line x1={startX} y1={groundY - objH * 2} x2={startX} y2={groundY + 4} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axisBold} strokeDasharray={DASH.boundary.join(',')} />
        <text x={startX - fontSize} y={groundY + fontSize + 6} fontSize={fontSize} fill={PHYSICS_COLORS.axis} textAnchor="middle">0</text>

        {/* 6. 位移投影带 */}
        {!isOffscreen && s !== 0 && (
          <rect
            x={Math.min(startX, currentX)}
            y={groundY + 4}
            width={Math.abs(currentX - startX)}
            height={6}
            fill={CHART_COLORS.areaFill}
            opacity={0.5}
            rx={2}
          />
        )}

        {/* 7. 运动小车 */}
        {!isOffscreen && (
          <g transform={`translate(${currentX}, ${groundY - objH})`}>
            <rect width={objW} height={objH} rx={4} fill={PHYSICS_COLORS.objectFill} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={STROKE.objectLine} />
            <rect x={objW * 0.6} y={objH * 0.1} width={objW * 0.35} height={objH * 0.4} rx={2} fill={PHYSICS_COLORS.grid} />
            <circle cx={objW * 0.2} cy={objH - 2} r={objH * 0.12} fill={PHYSICS_COLORS.labelText} />
            <circle cx={objW * 0.8} cy={objH - 2} r={objH * 0.12} fill={PHYSICS_COLORS.labelText} />
          </g>
        )}

        {/* 速度矢量箭头 */}
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
            <text x={padding} y={stageTop + fontSize + 4} fontSize={smallFont} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v = {v.toFixed(2)} m/s</text>
            <text x={padding + 120} y={stageTop + fontSize + 4} fontSize={smallFont} fill={PHYSICS_COLORS.displacement}>x = {s.toFixed(2)} m</text>
            <text x={padding + 240} y={stageTop + fontSize + 4} fontSize={smallFont} fill={PHYSICS_COLORS.acceleration}>a = {a.toFixed(1)} m/s²</text>
            <text x={padding + 370} y={stageTop + fontSize + 4} fontSize={smallFont} fill={PHYSICS_COLORS.labelText}>t = {time.toFixed(2)} s</text>
            <text x={padding + 480} y={stageTop + fontSize + 4} fontSize={smallFont} fill={CHART_COLORS.labelText} fontWeight="bold">面积 = 位移</text>
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
        </defs>
      </svg>
    </div>
  )
}
