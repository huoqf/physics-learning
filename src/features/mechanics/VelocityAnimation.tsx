import { useCanvasSize } from '@/utils'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, STROKE } from '@/theme/physics'
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

  // ── 物体位置 ──
  const rawX = startX + v * time * scale
  const isAtBoundary = rawX >= maxVisibleX
  const currentX = Math.min(rawX, maxVisibleX)
  const displayTime = isAtBoundary ? (maxVisibleX - startX) / (v * scale) : time

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
            <line x1={lm.x} y1={groundY} x2={lm.x} y2={groundY + 6} stroke={PHYSICS_COLORS.labelText} strokeWidth={1} />
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
            strokeDasharray="4,4"
          />
        ))}

        {/* ── 起始线 ── */}
        <line
          x1={startX}
          y1={groundY - objH * 2}
          x2={startX}
          y2={groundY + 4}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
          strokeDasharray="8,4"
        />
        <text x={startX - fontSize} y={groundY + fontSize + 6} fontSize={fontSize} fill={PHYSICS_COLORS.axis} textAnchor="middle">0</text>

        {/* ── 2. 运动物体（公交车/短跑运动员）── */}
        {scene === 0 ? (
          // 公交车简笔画
          <g transform={`translate(${currentX}, ${groundY - objH})`}>
            <rect width={objW} height={objH} rx={4} fill={PHYSICS_COLORS.objectFill} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={STROKE.objectLine} />
            {/* 车顶 */}
            <rect x={objW * 0.6} y={objH * 0.1} width={objW * 0.35} height={objH * 0.4} rx={2} fill={PHYSICS_COLORS.grid} />
            {/* 车轮 */}
            <circle cx={objW * 0.2} cy={objH - 2} r={objH * 0.12} fill={PHYSICS_COLORS.labelText} />
            <circle cx={objW * 0.8} cy={objH - 2} r={objH * 0.12} fill={PHYSICS_COLORS.labelText} />
          </g>
        ) : (
          // 短跑运动员简笔画
          <g transform={`translate(${currentX}, ${groundY - objH})`}>
            <circle cx={objW * 0.3} cy={objH * 0.15} r={objH * 0.15} fill={PHYSICS_COLORS.objectFill} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={STROKE.objectLine} />
            <line x1={objW * 0.3} y1={objH * 0.3} x2={objW * 0.3} y2={objH * 0.7} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={STROKE.objectLine} />
            <line x1={objW * 0.3} y1={objH * 0.7} x2={objW * 0.1} y2={objH} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={STROKE.objectLine} />
            <line x1={objW * 0.3} y1={objH * 0.7} x2={objW * 0.5} y2={objH} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={STROKE.objectLine} />
            <line x1={objW * 0.3} y1={objH * 0.45} x2={objW * 0.55} y2={objH * 0.3} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={STROKE.objectLine} />
            <line x1={objW * 0.3} y1={objH * 0.45} x2={objW * 0.05} y2={objH * 0.55} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={STROKE.objectLine} />
          </g>
        )}

        {/* ── 3. 打点轨迹 ── */}
        {dotTrail.map((dx, i) => (
          <circle
            key={`dot-${i}`}
            cx={dx}
            cy={groundY + 2}
            r={3}
            fill={PHYSICS_COLORS.trackHistory}
          />
        ))}

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
            <rect width={70} height={50} rx={6} fill="#F8FAFC" stroke={PHYSICS_COLORS.magnifier} strokeWidth={1.5} />
            <text x={35} y={18} fontSize={smallFont} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">测速仪</text>
            <text x={35} y={40} fontSize={fontSize * 1.2} fill={PHYSICS_COLORS.velocity} fontWeight="bold" textAnchor="middle">
              {speedometerValue.toFixed(1)}
            </text>
          </g>
        )}

        {/* ── 7. 位移大括号示意线 ── */}
        {deltaT > 0 && showVectors && (
          <g>
            <line x1={t1Pos} y1={groundY + 16} x2={t2Pos} y2={groundY + 16} stroke={PHYSICS_COLORS.displacement} strokeWidth={1.5} />
            <line x1={t1Pos} y1={groundY + 12} x2={t1Pos} y2={groundY + 20} stroke={PHYSICS_COLORS.displacement} strokeWidth={1.5} />
            <line x1={t2Pos} y1={groundY + 12} x2={t2Pos} y2={groundY + 20} stroke={PHYSICS_COLORS.displacement} strokeWidth={1.5} />
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
