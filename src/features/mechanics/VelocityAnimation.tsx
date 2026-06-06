import { useCanvasSize } from '@/utils'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, STROKE, DASH, OBJECT } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { calculateAverageVelocity } from '@/physics'

/**
 * 速度基础版动画 —— "破除直觉迷思"
 *
 * 利用公交车/短跑场景，帮学生分清平均速度和瞬时速度。
 * Canvas 7 元素 / 5 标注（严格上限）
 */
export default function VelocityAnimation() {
  const { params, time, showVectors, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 350 })

  const scene = params.scene ?? 0      // 0=公交, 1=短跑
  const v = params.v ?? 8              // m/s
  const deltaT = params.deltaT ?? 2    // s
  const totalDuration = params.totalDuration ?? 10 // s

  // ── 动态布局 ──
  const padding = canvasSize.width * 0.07
  const groundY = canvasSize.height * 0.72
  const scale = (canvasSize.width - 2 * padding) / (v * totalDuration)
  const startX = padding
  const maxVisibleX = canvasSize.width - padding

  const rawX = startX + v * time * scale
  const isAtBoundary = rawX >= maxVisibleX
  const currentX = Math.min(rawX, maxVisibleX)
  const displayTime = isAtBoundary ? (maxVisibleX - startX) / (v * scale) : time

  // 奔跑小人步伐交替状态
  const runnerState = isAtBoundary ? 0 : Math.floor(time * 9) % 2

  // ── 打点轨迹 ──
  const dotTrail = useMemo(() => {
    const dots: number[] = []
    const dotInterval = Math.max(deltaT, 0.02)
    for (let t = 0; t <= displayTime + 0.001; t += dotInterval) {
      const x = startX + v * t * scale
      if (x <= maxVisibleX) dots.push(x)
    }
    return dots
  }, [displayTime, deltaT, v, scale, startX, maxVisibleX])

  // ── 平均速度区间（跟随物体移动）──
  // t1 = 当前时刻，t2 = 当前时刻 + Δt
  const t1 = time
  const t2 = time + deltaT
  const t1Pos = startX + v * t1 * scale
  const t2Pos = startX + v * t2 * scale
  const { deltaX } = calculateAverageVelocity(
    v * t1, v * t2, t1, t2
  )

  // ── 测速仪 ──
  const isDeltaTSmall = deltaT <= 0.05
  const speedometerValue = v // 瞬时速度

  // ── 字体 ──
  const fontSize = Math.max(10, canvasSize.width * 0.017)
  const smallFont = Math.max(9, fontSize * 0.85)

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

  // ── 物体尺寸 ──
  const objW = canvasSize.width * 0.06
  const objH = scene === 0 ? objW * 0.7 : objW * 0.9

  // ── 地标标签 ──
  const landmarkLabels = useMemo(() => {
    const count = 5
    const labels: { x: number; text: string }[] = []
    for (let i = 0; i <= count; i++) {
      const dist = (v * totalDuration * i) / count
      labels.push({
        x: startX + dist * scale,
        text: `${dist.toFixed(0)}m`,
      })
    }
    return labels
  }, [v, totalDuration, scale, startX])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {/* 定义科学美化渐变 */}
        <defs>
          <linearGradient id="bus-body-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="wheel-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4B5563" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
          <radialGradient id="runner-grad" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </radialGradient>
        </defs>

        {/* ── 1. 地面坐标轴 + 地标 ── */}
        <line
          x1={padding * 0.5}
          y1={groundY}
          x2={canvasSize.width - padding * 0.5}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />
        {landmarkLabels.map((lm, i) => (
          <g key={`lm-${i}`}>
            <line x1={lm.x} y1={groundY} x2={lm.x} y2={groundY + 6} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.tick} />
            <text x={lm.x} y={groundY + fontSize + 6} fontSize={smallFont} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
              {lm.text}
            </text>
          </g>
        ))}

        {/* ── 网格线 ── */}
        {gridLines.map((g) => (
          <line
            key={g.key}
            x1={g.x}
            y1={groundY - objH * 2}
            x2={g.x}
            y2={groundY + 4}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={STROKE.grid}
            strokeDasharray={DASH.guide.join(',')}
          />
        ))}

        {/* ── 起始线 ── */}
        <line
          x1={startX}
          y1={groundY - objH * 2}
          x2={startX}
          y2={groundY + 4}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={STROKE.axisBold}
          strokeDasharray={DASH.boundary.join(',')}
        />
        <text x={startX - fontSize} y={groundY + fontSize + 6} fontSize={fontSize} fill={PHYSICS_COLORS.axis} textAnchor="middle">0</text>

        {/* ── 2. 运动物体（公交车/科技奔跑剪影）── */}
        {scene === 0 ? (
          // 公交车精化美化
          <g transform={`translate(${currentX}, ${groundY - objH})`}>
            {/* 车身 */}
            <rect width={objW} height={objH - 4} rx={4} fill="url(#bus-body-grad)" stroke="#1D4ED8" strokeWidth={1.5} />
            {/* 车窗带折射高光线 */}
            <rect x={objW * 0.1} y={objH * 0.15} width={objW * 0.25} height={objH * 0.3} rx={1} fill="#EFF6FF" opacity={0.85} />
            <rect x={objW * 0.4} y={objH * 0.15} width={objW * 0.25} height={objH * 0.3} rx={1} fill="#EFF6FF" opacity={0.85} />
            <rect x={objW * 0.7} y={objH * 0.15} width={objW * 0.2} height={objH * 0.3} rx={1} fill="#EFF6FF" opacity={0.85} />
            <line x1={objW * 0.15} y1={objH * 0.15} x2={objW * 0.22} y2={objH * 0.45} stroke="#FFFFFF" strokeWidth={1} opacity={0.6} />
            <line x1={objW * 0.45} y1={objH * 0.15} x2={objW * 0.52} y2={objH * 0.45} stroke="#FFFFFF" strokeWidth={1} opacity={0.6} />
            {/* 刹车尾灯 */}
            <rect x={-2} y={objH * 0.35} width={3} height={6} rx={1} fill="#EF4444" opacity={0.9} />
            {/* 装饰条 */}
            <line x1={objW * 0.05} y1={objH * 0.55} x2={objW * 0.95} y2={objH * 0.55} stroke="#60A5FA" strokeWidth={1} opacity={0.5} />
            {/* 车轮（带钢圈） */}
            <g transform={`translate(${objW * 0.22}, ${objH - 3})`}>
              <circle r={objH * 0.18} fill="url(#wheel-grad)" />
              <circle r={objH * 0.09} fill="#9CA3AF" stroke="#4B5563" strokeWidth={0.5} />
              <circle r={objH * 0.04} fill="#F3F4F6" />
            </g>
            <g transform={`translate(${objW * 0.78}, ${objH - 3})`}>
              <circle r={objH * 0.18} fill="url(#wheel-grad)" />
              <circle r={objH * 0.09} fill="#9CA3AF" stroke="#4B5563" strokeWidth={0.5} />
              <circle r={objH * 0.04} fill="#F3F4F6" />
            </g>
          </g>
        ) : (
          // 科技感飞奔光流小人 (2 步伐交替)
          <g transform={`translate(${currentX}, ${groundY - objH})`}>
            {runnerState === 0 ? (
              <g>
                <circle cx={objW * 0.38} cy={objH * 0.18} r={objH * 0.13} fill="url(#runner-grad)" />
                <path d={`M ${objW*0.38},${objH*0.3} L ${objW*0.25},${objH*0.5} L ${objW*0.42},${objH*0.7} L ${objW*0.7},${objH*0.96} 
                          M ${objW*0.38},${objH*0.3} L ${objW*0.52},${objH*0.48} L ${objW*0.18},${objH*0.62} L ${objW*0.06},${objH*0.9} 
                          M ${objW*0.38},${objH*0.3} L ${objW*0.72},${objH*0.34} L ${objW*0.6},${objH*0.18} 
                          M ${objW*0.38},${objH*0.3} L ${objW*0.12},${objH*0.38} L ${objW*0.24},${objH*0.55}`} 
                      stroke="url(#runner-grad)" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </g>
            ) : (
              <g>
                <circle cx={objW * 0.42} cy={objH * 0.18} r={objH * 0.13} fill="url(#runner-grad)" />
                <path d={`M ${objW*0.42},${objH*0.3} L ${objW*0.35},${objH*0.5} L ${objW*0.62},${objH*0.72} L ${objW*0.42},${objH*0.96} 
                          M ${objW*0.42},${objH*0.3} L ${objW*0.52},${objH*0.48} L ${objW*0.75},${objH*0.6} L ${objW*0.82},${objH*0.88} 
                          M ${objW*0.42},${objH*0.3} L ${objW*0.12},${objH*0.26} L ${objW*0.24},${objH*0.1} 
                          M ${objW*0.42},${objH*0.3} L ${objW*0.64},${objH*0.38} L ${objW*0.52},${objH*0.55}`} 
                      stroke="url(#runner-grad)" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </g>
            )}
          </g>
        )}

        {/* ── 3. 打点轨迹（含感光光晕衰减）── */}
        {dotTrail.map((dx, i) => {
          const opacity = dotTrail.length <= 1 ? 0.8 : 0.2 + 0.7 * (i / (dotTrail.length - 1))
          return (
            <g key={`dot-${i}`}>
              {/* 外圈虚光晕 */}
              <circle cx={dx} cy={groundY + 2} r={OBJECT.minRadius + 2.5} fill={PHYSICS_COLORS.trackHistory} opacity={opacity * 0.25} />
              {/* 内点 */}
              <circle cx={dx} cy={groundY + 2} r={OBJECT.minRadius} fill={PHYSICS_COLORS.trackHistory} opacity={opacity} />
            </g>
          )
        })}

        {/* ── 4. 平均速度粗箭头 ── */}
        {showVectors && deltaT > 0 && (
          <g>
            <line
              x1={t1Pos}
              y1={groundY - objH * 1.6}
              x2={t2Pos}
              y2={groundY - objH * 1.6}
              stroke={PHYSICS_COLORS.averageVelocity}
              strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrowhead-avg-v)"
            />
            <text
              x={(t1Pos + t2Pos) / 2}
              y={groundY - objH * 1.6 - fontSize * 0.6}
              fontSize={fontSize}
              fill={PHYSICS_COLORS.averageVelocity}
              fontWeight="bold"
              textAnchor="middle"
            >
              v̄
            </text>
          </g>
        )}

        {/* ── 5. 瞬时速度细箭头 ── */}
        {showVectors && (
          <g>
            <line
              x1={currentX + objW}
              y1={groundY - objH * 0.5}
              x2={currentX + objW + v * scale * 0.3}
              y2={groundY - objH * 0.5}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={STROKE.vectorSub}
              markerEnd="url(#arrowhead-inst-v)"
            />
            <text
              x={currentX + objW + v * scale * 0.3 + fontSize}
              y={groundY - objH * 0.5 + fontSize * 0.35}
              fontSize={fontSize}
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v
            </text>
          </g>
        )}

        {/* ── 6. 测速仪微观视窗 ── */}
        {isDeltaTSmall && (
          <g transform={`translate(${canvasSize.width - padding - 80}, ${padding})`}>
            <rect width={70} height={50} rx={6} fill={colors.neutral[50]} stroke={PHYSICS_COLORS.magnifier} strokeWidth={STROKE.annotation} />
            <text x={35} y={18} fontSize={smallFont} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">测速仪</text>
            <text x={35} y={40} fontSize={fontSize * 1.2} fill={PHYSICS_COLORS.velocity} fontWeight="bold" textAnchor="middle">
              {speedometerValue.toFixed(1)}
            </text>
          </g>
        )}

        {/* ── 7. 位移大括号示意线 ── */}
        {deltaT > 0 && showVectors && (
          <g>
            <line x1={t1Pos} y1={groundY + 16} x2={t2Pos} y2={groundY + 16} stroke={PHYSICS_COLORS.displacement} strokeWidth={STROKE.vectorThin} />
            <line x1={t1Pos} y1={groundY + 12} x2={t1Pos} y2={groundY + 20} stroke={PHYSICS_COLORS.displacement} strokeWidth={STROKE.vectorThin} />
            <line x1={t2Pos} y1={groundY + 12} x2={t2Pos} y2={groundY + 20} stroke={PHYSICS_COLORS.displacement} strokeWidth={STROKE.vectorThin} />
            <text
              x={(t1Pos + t2Pos) / 2}
              y={groundY + 30}
              fontSize={smallFont}
              fill={PHYSICS_COLORS.displacement}
              textAnchor="middle"
            >
              Δx={deltaX.toFixed(1)}m
            </text>
          </g>
        )}

        {/* ── 5个标注 ── */}
        {deltaT > 0 && showVectors && (
          <g>
            <text x={t1Pos} y={groundY - objH * 2.2} fontSize={smallFont} fill={PHYSICS_COLORS.labelText} textAnchor="middle">t₁</text>
            <text x={t2Pos} y={groundY - objH * 2.2} fontSize={smallFont} fill={PHYSICS_COLORS.labelText} textAnchor="middle">t₂</text>
            <text x={(t1Pos + t2Pos) / 2} y={groundY - objH * 2.2} fontSize={smallFont} fill={PHYSICS_COLORS.averageVelocity} textAnchor="middle">Δt</text>
          </g>
        )}

        {/* ── 场景标签 ── */}
        <text x={padding} y={fontSize + 4} fontSize={fontSize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
          {scene === 0 ? '公交车进站' : '百米短跑冲线'}
        </text>

        {/* ── 箭头标记定义 ── */}
        <defs>
          <marker id="arrowhead-avg-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.averageVelocity} />
          </marker>
          <marker id="arrowhead-inst-v" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.velocity} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
