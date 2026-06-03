import { useCanvasSize } from '@/utils'
import { useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useAppStore } from '@/stores/useAppStore'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  VT_CHART_COLORS,
  CANVAS_STYLE,
  STROKE,
  DASH,
} from '@/theme/physics'
import { useUniformAccelerationPhysics } from './useUniformAccelerationPhysics'

const VT_X_MAX = 8

export default function UniformAccelerationDiscovery() {
  const { params, time, showVectors, showGrid, setIsPlaying } = useAnimationStore()
  const { discoveryStep } = useAppStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 450 })

  const { v0 = 0, a = 1.5 } = params
  const scale = 25
  
  // 动态确定Y轴范围（仅依赖v0和a，避免动画中闪动）
  const { VT_Y_MIN, VT_Y_MAX } = useMemo(() => {
    if (v0 > 0 && a < 0) {
      return { VT_Y_MIN: -10, VT_Y_MAX: 10 }
    }
    return { VT_Y_MIN: 0, VT_Y_MAX: 10 }
  }, [v0, a])
  
  // 生成Y轴刻度
  const yticks = useMemo(() => {
    const ticks = []
    for (let v = VT_Y_MIN; v <= VT_Y_MAX; v += 2) {
      ticks.push(v)
    }
    return ticks
  }, [VT_Y_MIN, VT_Y_MAX])

  // 动态区域分配
  const upperHeight = canvasSize.height * 0.6
  const animGroundY = canvasSize.height - 80 // 和原组件一致，靠下
  const startX = 100
  const objectWidth = 50
  const maxVisibleX = canvasSize.width - 50 - objectWidth
  const maxDisplacement = (maxVisibleX - startX) / scale

  const physics = useUniformAccelerationPhysics(v0, a, time, maxDisplacement)

  // 边界检测
  const isAtBoundary = physics.effectiveS >= maxDisplacement || physics.effectiveS <= 0
  useEffect(() => {
    if (isAtBoundary && time > 0) {
      setIsPlaying(false)
    }
  }, [isAtBoundary, time, setIsPlaying])

  const currentX = startX + physics.effectiveS * scale

  // ==================== V-T图布局（右上区域）====================
  const chartAreaX = canvasSize.width * 0.42
  const chartAreaY = 15
  const chartAreaW = canvasSize.width * 0.55
  const chartAreaH = upperHeight - 30
  const xticks = [0, 1, 2, 3, 4, 5, 6, 7, 8]

  // ==================== 频闪数据（左上部，高中表格样式）====================
  const tableRows = useMemo(() => physics.flashPoints.slice(-8), [physics.flashPoints])
  const lastIndex = physics.flashPoints.length - 1
  const tableX = 20
  const tableY = 15
  const tableW = canvasSize.width * 0.38
  const tableH = upperHeight - 30
  const headerHeight = 30
  const rowHeight = (tableH - headerHeight - 10) / Math.max(tableRows.length, 1)

  // ==================== 网格线 ====================
  const gridLines = showGrid
    ? Array.from({ length: 14 }, (_, i) => {
        const xPos = startX + (i * (canvasSize.width - 200)) / 14
        return (
          <line
            key={`g-${i}`}
            x1={xPos}
            y1={animGroundY - 80}
            x2={xPos}
            y2={animGroundY + 20}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={1}
            strokeDasharray={DASH.reference.join(' ')}
          />
        )
      })
    : null

  // ==================== 频闪点 ====================
  const flashCircles = physics.flashPoints.map((pt, i) => {
    const cx = startX + Math.max(0, Math.min(maxDisplacement, pt.displacement)) * scale
    const opacity = 0.3 + 0.7 * (i / Math.max(physics.flashPoints.length - 1, 1))
    return <circle key={i} cx={cx} cy={animGroundY} r={4} fill={PHYSICS_COLORS.referencePoint} opacity={opacity} />
  })

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}

        {/* ==================== 上部区域 ==================== */}

        {/* 左上：频闪数据表格（高中物理样式）*/}
        <g transform={`translate(${tableX}, ${tableY})`}>
          <rect width={tableW} height={tableH} fill="white" stroke={CHART_COLORS.gridLine} rx={4} />
          <text x={tableW / 2} y={20} fontSize={12} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            频闪数据记录表
          </text>

          {/* 表头 */}
          <g transform={`translate(0, ${headerHeight - 10})`}>
            <rect width={tableW} height={20} fill={CHART_COLORS.gridLine} opacity={0.2} />
            <line x1={0} y1={20} x2={tableW} y2={20} stroke={CHART_COLORS.axisLine} strokeWidth={2} />
            <text x={tableW * 0.15} y={15} fontSize={10} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">
              t(s)
            </text>
            <text x={tableW * 0.5} y={15} fontSize={10} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">
              v(m/s)
            </text>
            <text x={tableW * 0.85} y={15} fontSize={10} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">
              x(m)
            </text>
          </g>

          {/* 数据行 */}
          {tableRows.map((row, i) => {
            const isCurrent = row.time === (physics.flashPoints[lastIndex]?.time ?? -1)
            const rowY = headerHeight + 10 + i * rowHeight
            return (
              <g key={i}>
                {isCurrent && <rect width={tableW} height={rowHeight} y={rowY - rowHeight / 2} fill={VT_CHART_COLORS.areaShade} opacity={0.3} />}
                <text x={tableW * 0.15} y={rowY} fontSize={9} fill={isCurrent ? PHYSICS_COLORS.velocity : CHART_COLORS.labelText} textAnchor="middle" fontWeight={isCurrent ? 'bold' : 'normal'} fontFamily="monospace">
                  {row.time.toFixed(1)}
                </text>
                <text x={tableW * 0.5} y={rowY} fontSize={9} fill={isCurrent ? PHYSICS_COLORS.velocity : CHART_COLORS.labelText} textAnchor="middle" fontWeight={isCurrent ? 'bold' : 'normal'} fontFamily="monospace">
                  {row.velocity.toFixed(2)}
                </text>
                <text x={tableW * 0.85} y={rowY} fontSize={9} fill={isCurrent ? PHYSICS_COLORS.velocity : CHART_COLORS.labelText} textAnchor="middle" fontWeight={isCurrent ? 'bold' : 'normal'} fontFamily="monospace">
                  {row.displacement.toFixed(2)}
                </text>
                <line x1={0} y1={rowY + rowHeight / 2} x2={tableW} y2={rowY + rowHeight / 2} stroke={CHART_COLORS.gridLine} strokeWidth={1} />
              </g>
            )
          })}
        </g>

        {/* 右上：v-t 图 + 推导，垂直动态分割 */}
        {(() => {
          // 右上区域垂直分割：80%给v-t图，20%给推导
          const vtChartHeight = chartAreaH * 0.8
          const derivationHeight = chartAreaH * 0.2
          const vtChartAreaY = chartAreaY
          const derivationAreaY = chartAreaY + vtChartHeight + 2

          const vtInnerTop = vtChartAreaY + 35
          const vtInnerLeft = chartAreaX + 60
          const vtInnerW = chartAreaW - 80
          const vtInnerH = vtChartHeight - 55

          const vtToChartX = (t: number) => vtInnerLeft + (t / VT_X_MAX) * vtInnerW
          const vtToChartY = (v: number) => vtInnerTop + vtInnerH - ((v - VT_Y_MIN) / (VT_Y_MAX - VT_Y_MIN)) * vtInnerH

          // 渐进式绘制：只绘制到当前时间的数据
          const activeData = physics.vtChartData.filter((p: any) => p.x <= time)
          
          // 重新计算v-t图路径
          const vtVtPathD = activeData.length >= 2
            ? 'M ' + activeData.map((p: any) => `${vtToChartX(p.x)},${vtToChartY(p.y)}`).join(' L ')
            : ''
          
          // 面积填充也只填充到当前时间
          const vtAreaPathD = vtVtPathD
            ? `${vtVtPathD} L ${vtToChartX(time)},${vtToChartY(0)} L ${vtToChartX(0)},${vtToChartY(0)} Z`
            : ''
          
          const vtWrongPathD = physics.wrongVtData && physics.wrongVtData.length >= 2
            ? 'M ' + physics.wrongVtData.filter((p: any) => p.x <= time).map((p: any) => `${vtToChartX(p.x)},${vtToChartY(p.y)}`).join(' L ')
            : ''

          return (
            <>
              {/* v-t图部分 */}
              <g>
                <rect x={chartAreaX} y={vtChartAreaY} width={chartAreaW} height={vtChartHeight} fill="white" rx={4} stroke={CHART_COLORS.axisLine} />
                <text x={chartAreaX + chartAreaW / 2} y={vtChartAreaY + 20} fontSize={12} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
                  速度－时间图像 (v-t 图)
                </text>

                {/* 坐标轴 */}
                <line x1={vtInnerLeft} y1={vtInnerTop} x2={vtInnerLeft} y2={vtInnerTop + vtInnerH} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
                {/* 水平参考线在 v=0 位置 */}
                <line x1={vtInnerLeft} y1={vtToChartY(0)} x2={vtInnerLeft + vtInnerW} y2={vtToChartY(0)} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

                {/* 刻度 */}
                {xticks.map(t => (
                  <g key={`xt-${t}`}>
                    <line x1={vtToChartX(t)} y1={vtToChartY(0) - 5} x2={vtToChartX(t)} y2={vtToChartY(0) + 5} stroke={CHART_COLORS.tickMark} />
                    <text x={vtToChartX(t)} y={vtToChartY(0) + 18} fontSize={9} textAnchor="middle" fill={CHART_COLORS.tickLabel}>{t}</text>
                  </g>
                ))}
                {yticks.map(v => (
                  <g key={`yt-${v}`}>
                    <line x1={vtInnerLeft - 5} y1={vtToChartY(v)} x2={vtInnerLeft} y2={vtToChartY(v)} stroke={CHART_COLORS.tickMark} />
                    <text x={vtInnerLeft - 10} y={vtToChartY(v) + 3} fontSize={9} textAnchor="end" fill={CHART_COLORS.tickLabel}>{v}</text>
                  </g>
                ))}

                {/* 轴标签 */}
                <text x={vtInnerLeft + vtInnerW / 2} y={vtInnerTop + vtInnerH + 30} fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}>
                  t/s
                </text>
                <text x={vtInnerLeft - 25} y={vtInnerTop + vtInnerH / 2} fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText} transform={`rotate(-90, ${vtInnerLeft - 25}, ${vtInnerTop + vtInnerH / 2})`}>
                  v/(m·s⁻¹)
                </text>

                {/* 面积填充 */}
                {(discoveryStep ?? 0) >= 4 && vtAreaPathD && (
                  <path d={vtAreaPathD} fill={VT_CHART_COLORS.areaShade} opacity={0.25} />
                )}

                {/* 错误曲线 */}
                {physics.isBrakeMode && vtWrongPathD && (
                  <path d={vtWrongPathD} fill="none" stroke={CHART_COLORS.criticalPt} strokeWidth={1.5} strokeDasharray="5,3" />
                )}

                {/* v-t 曲线 */}
                {vtVtPathD && (
                  <path d={vtVtPathD} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={STROKE.chartMain} />
                )}
              </g>

              {/* 推导部分 */}
              <g transform={`translate(${chartAreaX}, ${derivationAreaY})`}>
                {discoveryStep === 2 && (
                  <>
                    <rect width={chartAreaW} height={derivationHeight - 5} fill="white" rx={3} stroke={CHART_COLORS.axisLine} />
                    <text x={20} y={20} fontSize={12} fill={CHART_COLORS.labelText} fontWeight="bold">规律发现</text>
                    <text x={20} y={45} fontSize={14} fill={PHYSICS_COLORS.velocity} fontFamily="monospace">Δv/Δt = {a.toFixed(1)} m/s² = a (恒定加速度)</text>
                  </>
                )}
                {discoveryStep === 3 && (
                  <>
                    <rect width={chartAreaW} height={derivationHeight - 5} fill="white" rx={3} stroke={CHART_COLORS.axisLine} />
                    <text x={20} y={20} fontSize={12} fill={CHART_COLORS.labelText} fontWeight="bold">速度公式推导</text>
                    <text x={20} y={45} fontSize={14} fill={PHYSICS_COLORS.velocity} fontFamily="monospace">v = v₀ + at = {v0.toFixed(1)} + {a.toFixed(1)}×{physics.effectiveTime.toFixed(1)} = {physics.effectiveV.toFixed(2)}</text>
                  </>
                )}
                {discoveryStep === 4 && (
                  <>
                    <rect width={chartAreaW} height={derivationHeight - 5} fill="white" rx={3} stroke={CHART_COLORS.axisLine} />
                    <text x={20} y={20} fontSize={12} fill={CHART_COLORS.labelText} fontWeight="bold">位移公式推导</text>
                    <text x={20} y={45} fontSize={14} fill={PHYSICS_COLORS.displacement} fontFamily="monospace">x = v₀t + ½at² = {physics.effectiveS.toFixed(2)} m</text>
                  </>
                )}
                {discoveryStep === 5 && (
                  <>
                    <rect width={chartAreaW} height={derivationHeight - 5} fill="white" rx={3} stroke={CHART_COLORS.axisLine} />
                    <text x={20} y={20} fontSize={12} fill={CHART_COLORS.labelText} fontWeight="bold">速度位移关系</text>
                    <text x={20} y={45} fontSize={14} fill={VT_CHART_COLORS.velocityCurve} fontWeight="bold" fontFamily="monospace">v² - v₀² = 2ax → {(physics.effectiveV ** 2 - v0 ** 2).toFixed(1)} ≈ {(2 * a * physics.effectiveS).toFixed(1)} ✓</text>
                  </>
                )}
              </g>
            </>
          )
        })()}

        {/* ==================== 下部区域：动画舞台 ==================== */}

        {/* 地面 */}
        <line x1={50} y1={animGroundY} x2={canvasSize.width - 50} y2={animGroundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />

        {/* 起始线 */}
        <line x1={startX} y1={animGroundY - 100} x2={startX} y2={animGroundY + 20} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.reference} strokeDasharray={DASH.reference.join(' ')} />
        <text x={startX - 10} y={animGroundY + 35} fontSize={10} fill={PHYSICS_COLORS.axis} textAnchor="middle">0</text>

        {/* 频闪点 */}
        {flashCircles}

        {/* 物体 */}
        <rect
          x={currentX}
          y={animGroundY - 60}
          width={objectWidth}
          height={50}
          fill={physics.isStopped ? CHART_COLORS.criticalPt : PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          rx={6}
        />
        <text x={currentX + objectWidth / 2} y={animGroundY - 28} fontSize={11} fill={PHYSICS_COLORS.objectStroke} textAnchor="middle" fontWeight="bold">m</text>

        {/* 速度矢量 */}
        {showVectors && physics.effectiveV !== 0 && (
          <g>
            <line
              x1={currentX + objectWidth}
              y1={animGroundY - 35}
              x2={currentX + objectWidth + physics.effectiveV * 5}
              y2={animGroundY - 35}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-v2)"
            />
            <text
              x={currentX + objectWidth + physics.effectiveV * 5 + 15}
              y={animGroundY - 30}
              fontSize={10}
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v
            </text>
          </g>
        )}

        {/* 加速度矢量 */}
        {showVectors && a !== 0 && (
          <g>
            <line
              x1={currentX + objectWidth / 2}
              y1={animGroundY - 80}
              x2={currentX + objectWidth / 2 + a * 10}
              y2={animGroundY - 80}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-a2)"
            />
            <text
              x={currentX + objectWidth / 2 + a * 10 + 15}
              y={animGroundY - 75}
              fontSize={10}
              fill={PHYSICS_COLORS.acceleration}
              fontWeight="bold"
            >
              a
            </text>
          </g>
        )}

        {/* 停止标记 */}
        {physics.isStopped && (
          <text x={currentX + objectWidth / 2} y={animGroundY - 90} fontSize={9} fill={CHART_COLORS.criticalPt} textAnchor="middle" fontWeight="bold">
            v=0 停止
          </text>
        )}

        <defs>
          <marker id="arrow-v2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrow-a2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
