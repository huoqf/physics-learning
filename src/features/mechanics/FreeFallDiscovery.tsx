import { useCanvasSize } from '@/utils'
import { useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useAppStore } from '@/stores/useAppStore'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  VT_CHART_COLORS,
  STROKE,
  DASH,
  FONT,
} from '@/theme/physics'
import { calculateFreeFall } from '@/physics'

/** 时间切片颜色序列（与 FreeFallAnimation 一致） */
const TIME_SLICE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.compareB,
  CHART_COLORS.compareC,
  CHART_COLORS.criticalPt,
] as const

const VT_X_MAX = 8

export default function FreeFallDiscovery() {
  const { params, time, showVectors, showGrid, showTimeSlices, setIsPlaying } = useAnimationStore()
  const { discoveryStep } = useAppStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 500 })

  const { v0 = 0, g = 9.8 } = params

  // 动态 scale：与 Animation 模式保持一致
  const TARGET_FALL_TIME = 2.0
  const maxFallHeight = 0.5 * g * TARGET_FALL_TIME * TARGET_FALL_TIME

  // 计算舞台区域（左侧）
  const stageWidth = canvasSize.width * 0.45
  const originY = canvasSize.height * 0.08
  const groundY = canvasSize.height * 0.88
  const stageHeight = groundY - originY
  const scale = maxFallHeight > 0 ? stageHeight / maxFallHeight : 25

  // 计算落地时间
  const discriminant = v0 * v0 + 2 * g * maxFallHeight
  const groundTime = g > 0 ? (-v0 + Math.sqrt(discriminant)) / g : Infinity
  const isLanded = time >= groundTime && groundTime !== Infinity

  const { v: displayV, y: displayY } = calculateFreeFall(v0, g, Math.min(time, groundTime))
  const effectiveV = isLanded ? 0 : displayV
  const effectiveY = Math.min(displayY, maxFallHeight)
  const currentY = originY + effectiveY * scale

  useEffect(() => {
    if (isLanded && time > 0) {
      setIsPlaying(false)
    }
  }, [isLanded, time, setIsPlaying])

  // 表格区域（右侧）
  const tableX = stageWidth + 20
  const tableW = canvasSize.width - stageWidth - 40
  const tableH = canvasSize.height * 0.45
  const tableY = canvasSize.height * 0.03

  // 频闪点数据
  const flashPoints = []
  const maxT = isLanded ? groundTime : Math.min(time, groundTime)
  const count = Math.min(Math.floor(maxT / 0.1) + 1, 20)
  for (let i = 0; i < count; i++) {
    const t = i * 0.1
    const { v, y } = calculateFreeFall(v0, g, t)
    flashPoints.push({ time: t, velocity: v, displacement: y })
  }

  // v-t 图区域（右侧下方）
  const vtChartY = tableH + canvasSize.height * 0.06
  const vtAreaLeft = stageWidth + 60
  const vtAreaTop = vtChartY + 35
  const vtAreaWidth = canvasSize.width - stageWidth - 100
  const vtAreaHeight = canvasSize.height * 0.5 - 55

  // 动态计算 V-T 图 Y 轴范围
  const { vtVMax, vtTickStep } = useMemo(() => {
    const maxV = Math.max(v0 + g * VT_X_MAX, 10)
    // 取整到合适的刻度
    if (maxV <= 10) return { vtVMax: 10, vtTickStep: 2 }
    if (maxV <= 20) return { vtVMax: 20, vtTickStep: 5 }
    if (maxV <= 50) return { vtVMax: Math.ceil(maxV / 10) * 10, vtTickStep: 10 }
    return { vtVMax: Math.ceil(maxV / 20) * 20, vtTickStep: 20 }
  }, [v0, g])

  const vtToX = (t: number) => vtAreaLeft + (t / VT_X_MAX) * vtAreaWidth
  const vtToY = (v: number) => vtAreaTop + vtAreaHeight - (v / vtVMax) * vtAreaHeight

  // 生成 Y 轴刻度
  const yticks = useMemo(() => {
    const ticks = []
    for (let v = 0; v <= vtVMax; v += vtTickStep) {
      ticks.push(v)
    }
    return ticks
  }, [vtVMax, vtTickStep])

  // 构建 v-t 路径
  const vtPoints = []
  const vtAreaPath = []
  for (let t = 0; t <= Math.max(Math.min(time, VT_X_MAX), 0.1); t += 0.1) {
    const { v } = calculateFreeFall(v0, g, t)
    const clampedV = Math.min(v, vtVMax)
    vtPoints.push(`${vtToX(t)},${vtToY(clampedV)}`)
    vtAreaPath.push(`${vtToX(t)},${vtToY(clampedV)}`)
  }
  vtAreaPath.push(`${vtToX(Math.max(Math.min(time, VT_X_MAX), 0))},${vtToY(0)}`)
  vtAreaPath.push(`${vtToX(0)},${vtToY(0)}`)
  const vtPath = vtPoints.length ? `M ${vtPoints.join(' L ')}` : ''
  const vtAreaPathStr = vtAreaPath.length ? `M ${vtAreaPath.join(' L ')} Z` : ''

  // 网格线
  const gridLines: React.ReactNode[] = []
  if (showGrid && !showTimeSlices) {
    for (let i = 0; i <= 10; i++) {
      const yPos = originY + (i * stageHeight) / 10
      gridLines.push(
        <line
          key={`gridline-${i}`}
          x1={50}
          y1={yPos}
          x2={stageWidth - 50}
          y2={yPos}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.reference.join(' ')}
        />
      )
    }
  }

  // 频闪圆点
  const flashCircles = showGrid && !showTimeSlices ? flashPoints.map((pt, i) => {
    const cy = originY + Math.min(pt.displacement, maxFallHeight) * scale
    const opacity = flashPoints.length <= 1 ? 0.5 : 0.3 + 0.7 * (i / Math.max(flashPoints.length - 1, 1))
    return (
      <circle
        key={i}
        cx={stageWidth * 0.5}
        cy={Math.min(cy, groundY - 15)}
        r={4}
        fill={PHYSICS_COLORS.referencePoint}
        opacity={opacity}
      />
    )
  }) : []

  const timeSliceBars = showTimeSlices ? Array.from({ length: 4 }, (_, i) => {
    const sliceTime = groundTime < Infinity ? groundTime / 4 : TARGET_FALL_TIME / 4
    const t1 = i * sliceTime
    const t2 = (i + 1) * sliceTime
    const { y: y1 } = calculateFreeFall(v0, g, t1)
    const { y: y2 } = calculateFreeFall(v0, g, t2)
    const dy = y2 - y1
    const ratios = ['1', '3', '5', '7']
    const barMaxWidth = stageWidth * 0.2
    const barWidth = Math.max(10, (dy / (maxFallHeight || 1)) * barMaxWidth)
    const barX = stageWidth * 0.55
    const barY = originY + y1 * scale + (dy * scale) / 2 - 8
    return (
      <g key={i}>
        <rect
          x={barX}
          y={barY}
          width={barWidth}
          height={16}
          fill={TIME_SLICE_COLORS[i]}
          opacity={0.15}
          stroke={TIME_SLICE_COLORS[i]}
          strokeWidth={STROKE.reference}
          strokeOpacity={0.5}
          rx={3}
        />
        <text
          x={barX + barWidth + 6}
          y={barY + 12}
          fontSize={FONT.small}
          fill={TIME_SLICE_COLORS[i]}
          fontWeight="bold"
        >
          {ratios[i]}
        </text>
        <text
          x={barX + barWidth + 6}
          y={barY + 24}
          fontSize={9}
          fill={PHYSICS_COLORS.labelTextLight}
        >
          {dy.toFixed(2)}m
        </text>
      </g>
    )
  }) : []

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {/* 左侧舞台 */}
        {gridLines}
        {flashCircles}
        {timeSliceBars}

        <line x1={50} y1={groundY} x2={stageWidth - 50} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />
        <line x1={stageWidth * 0.5} y1={originY - 30} x2={stageWidth * 0.5} y2={groundY + 30} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis} strokeDasharray={DASH.axis.join(' ')} />

        <text x={30} y={originY - 5} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis} textAnchor="middle">y=0</text>
        <text x={30} y={groundY + 20} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis} textAnchor="middle">y=h</text>

        <circle
          cx={stageWidth * 0.5}
          cy={Math.min(currentY, groundY - 15)}
          r={15}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={STROKE.objectLine}
        />

        {showVectors && effectiveV !== 0 && (
          <g>
            <line
              x1={stageWidth * 0.5}
              y1={Math.min(currentY, groundY - 15)}
              x2={stageWidth * 0.5}
              y2={Math.min(currentY + effectiveV * 5, groundY - 15)}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-discovery-v)"
            />
            <text
              x={stageWidth * 0.5 + 20}
              y={Math.min(currentY + effectiveV * 2.5, groundY - 15)}
              fontSize={FONT.bodySize}
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v
            </text>
          </g>
        )}

        {showVectors && !isLanded && (
          <g>
            <line
              x1={stageWidth * 0.5}
              y1={Math.min(currentY, groundY - 15)}
              x2={stageWidth * 0.5}
              y2={Math.min(currentY + 50, groundY - 15)}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-discovery-a)"
            />
            <text
              x={stageWidth * 0.5 + 20}
              y={Math.min(currentY + 25, groundY - 15)}
              fontSize={FONT.bodySize}
              fill={PHYSICS_COLORS.acceleration}
              fontWeight="bold"
            >
              g
            </text>
          </g>
        )}

        {isLanded && (
          <text x={stageWidth * 0.5} y={groundY - 50} fontSize={FONT.small} fill={PHYSICS_COLORS.forceNet} textAnchor="middle" fontWeight="bold">
            落地
          </text>
        )}

        {/* 右侧频闪表格 */}
        <rect x={tableX} y={tableY} width={tableW} height={tableH} fill="white" stroke={CHART_COLORS.gridLine} rx={4} />
        <text x={tableX + tableW / 2} y={tableY + 20} fontSize={FONT.axis} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
          频闪数据记录表
        </text>

        {/* 表头 */}
        <g transform={`translate(${tableX}, ${tableY + 25})`}>
          <rect width={tableW} height={20} fill={CHART_COLORS.gridLine} opacity={0.2} />
          <line x1={0} y1={20} x2={tableW} y2={20} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
          <text x={tableW * 0.15} y={15} fontSize={FONT.small} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            t(s)
          </text>
          <text x={tableW * 0.5} y={15} fontSize={FONT.small} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            v(m/s)
          </text>
          <text x={tableW * 0.85} y={15} fontSize={FONT.small} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            y(m)
          </text>
        </g>

        {/* 表格行 */}
        {flashPoints.map((pt, i) => {
          const isCurrent = i === flashPoints.length - 1
          const rowY = tableY + 50 + i * ((tableH - 55) / Math.max(flashPoints.length, 1))
          return (
            <g key={i}>
              {isCurrent && (
                <rect x={tableX} y={rowY - 10} width={tableW} height={20} fill={VT_CHART_COLORS.areaShade} opacity={0.3} />
              )}
              <text x={tableX + tableW * 0.15} y={rowY} fontSize={9} fontFamily="monospace" textAnchor="middle" fill={isCurrent ? PHYSICS_COLORS.velocity : CHART_COLORS.labelText} fontWeight={isCurrent ? 'bold' : 'normal'}>
                {pt.time.toFixed(1)}
              </text>
              <text x={tableX + tableW * 0.5} y={rowY} fontSize={9} fontFamily="monospace" textAnchor="middle" fill={isCurrent ? PHYSICS_COLORS.velocity : CHART_COLORS.labelText} fontWeight={isCurrent ? 'bold' : 'normal'}>
                {pt.velocity.toFixed(2)}
              </text>
              <text x={tableX + tableW * 0.85} y={rowY} fontSize={9} fontFamily="monospace" textAnchor="middle" fill={isCurrent ? PHYSICS_COLORS.velocity : CHART_COLORS.labelText} fontWeight={isCurrent ? 'bold' : 'normal'}>
                {pt.displacement.toFixed(2)}
              </text>
              <line x1={tableX} y1={rowY + 10} x2={tableX + tableW} y2={rowY + 10} stroke={CHART_COLORS.gridLine} strokeWidth={STROKE.chartRef} />
            </g>
          )
        })}

        {/* 右侧 v-t 图 */}
        <rect x={tableX} y={vtChartY} width={tableW} height={canvasSize.height * 0.5} fill="white" rx={4} stroke={CHART_COLORS.axisLine} />
        <text x={tableX + tableW / 2} y={vtChartY + 20} fontSize={FONT.axis} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
          速度-时间图像 (v-t 图)
        </text>

        {/* v-t 坐标轴 */}
        <line x1={vtAreaLeft} y1={vtAreaTop} x2={vtAreaLeft} y2={vtAreaTop + vtAreaHeight} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
        <line x1={vtAreaLeft} y1={vtToY(0)} x2={vtAreaLeft + vtAreaWidth} y2={vtToY(0)} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

        {/* v-t 刻度 */}
        {[0, 2, 4, 6, 8].map(t => (
          <g key={`vt-t-${t}`}>
            <line x1={vtToX(t)} y1={vtToY(0) - 5} x2={vtToX(t)} y2={vtToY(0) + 5} stroke={CHART_COLORS.tickMark} />
            <text x={vtToX(t)} y={vtToY(0) + 18} fontSize={9} textAnchor="middle" fill={CHART_COLORS.tickLabel}>{t}</text>
          </g>
        ))}
        {yticks.map(v => (
          <g key={`vt-v-${v}`}>
            <line x1={vtAreaLeft - 5} y1={vtToY(v)} x2={vtAreaLeft} y2={vtToY(v)} stroke={CHART_COLORS.tickMark} />
            <text x={vtAreaLeft - 10} y={vtToY(v) + 3} fontSize={9} textAnchor="end" fill={CHART_COLORS.tickLabel}>{v}</text>
          </g>
        ))}

        {/* v-t 坐标轴标签 */}
        <text x={vtAreaLeft + vtAreaWidth / 2} y={vtAreaTop + vtAreaHeight + 30} fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}>t/s</text>
        <text x={vtAreaLeft - 25} y={vtAreaTop + vtAreaHeight / 2} fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText} transform={`rotate(-90, ${vtAreaLeft - 25}, ${vtAreaTop + vtAreaHeight / 2})`}>v/(m·s⁻¹)</text>

        {/* v-t 面积 */}
        {discoveryStep >= 3 && vtAreaPathStr && (
          <path d={vtAreaPathStr} fill={VT_CHART_COLORS.areaShade} opacity={0.25} />
        )}

        {/* v-t 曲线 */}
        {vtPath && (
          <path d={vtPath} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={STROKE.chartMain} />
        )}

        {/* 推导区域 */}
        <g transform={`translate(${tableX}, ${vtChartY + canvasSize.height * 0.5 - 60})`}>
          {discoveryStep === 1 && (
            <>
              <rect width={tableW} height={55} fill="white" rx={3} stroke={CHART_COLORS.axisLine} />
              <text x={20} y={20} fontSize={FONT.axis} fill={CHART_COLORS.labelText} fontWeight="bold">规律发现</text>
              <text x={20} y={45} fontSize={FONT.label} fill={PHYSICS_COLORS.velocity} fontFamily="monospace">Δv/Δt = {g.toFixed(1)} m/s² = g (恒定加速度)</text>
            </>
          )}
          {discoveryStep === 2 && (
            <>
              <rect width={tableW} height={55} fill="white" rx={3} stroke={CHART_COLORS.axisLine} />
              <text x={20} y={20} fontSize={FONT.axis} fill={CHART_COLORS.labelText} fontWeight="bold">速度公式推导</text>
              <text x={20} y={45} fontSize={FONT.label} fill={PHYSICS_COLORS.velocity} fontFamily="monospace">v = v₀ + gt = {effectiveV.toFixed(2)} m/s</text>
            </>
          )}
          {discoveryStep === 3 && (
            <>
              <rect width={tableW} height={55} fill="white" rx={3} stroke={CHART_COLORS.axisLine} />
              <text x={20} y={20} fontSize={FONT.axis} fill={CHART_COLORS.labelText} fontWeight="bold">位移公式推导</text>
              <text x={20} y={45} fontSize={FONT.label} fill={PHYSICS_COLORS.displacement} fontFamily="monospace">y = v₀t + ½gt² = {effectiveY.toFixed(2)} m</text>
            </>
          )}
          {discoveryStep === 4 && (
            <>
              <rect width={tableW} height={55} fill="white" rx={3} stroke={CHART_COLORS.axisLine} />
              <text x={20} y={20} fontSize={FONT.axis} fill={CHART_COLORS.labelText} fontWeight="bold">Δy = gT² 验证</text>
              <text x={20} y={45} fontSize={FONT.label} fill={VT_CHART_COLORS.velocityCurve} fontWeight="bold" fontFamily="monospace">
                Δy ≈ {(g * 0.1 * 0.1).toFixed(3)} m ✓
              </text>
            </>
          )}
        </g>

        {/* 标记 */}
        <defs>
          <marker id="arrow-discovery-v" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrow-discovery-a" markerWidth={10} markerHeight={7} refX={9} refY={3.5} orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
