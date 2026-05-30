import { useEffect } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

/**
 * 带电粒子在匀强电场中运动（类平抛）：水平匀速 + 竖直匀加速。
 * 参数：E(电场强度,N/C·10³) / q(电量,μC) / m(质量,×10⁻⁶kg) / v0(初速度,m/s)
 */
export default function ChargeInEField() {
  const { params, time, showVectors, showFormulas, showGrid, setIsPlaying } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 450 })

  const { E = 10, q = 2, m = 5, v0 = 8 } = params
  // 单位换算到 SI
  const ESI = E * 1e3
  const qSI = q * 1e-6
  const mSI = m * 1e-6
  // 竖直加速度 a = qE/m
  const a = (qSI * ESI) / mSI

  // 极板区域
  const plateLeft = 90
  const plateTop = 90
  const plateBottom = canvasSize.height - 90
  const plateRight = canvasSize.width - 200
  const plateLen = plateRight - plateLeft
  const midY = (plateTop + plateBottom) / 2

  // 比例：让运动在板内可见
  const xScale = 40 // px per (m/s · s 量级)
  const yScale = 4e-4 // px per m（a 量级较大，压缩）

  // 出板时间（水平走完板长）
  const exitTime = v0 > 0 ? plateLen / (v0 * xScale) : 0
  const tEff = Math.min(time, exitTime)

  const x = plateLeft + v0 * tEff * xScale
  const yDrop = 0.5 * a * tEff * tEff * yScale
  const y = midY + yDrop // 正电荷向下偏（设 E 向下）
  const vy = a * tEff

  // 到达板右端自动暂停
  const atExit = time >= exitTime
  useEffect(() => {
    if (atExit && time > 0) setIsPlaying(false)
  }, [atExit, time, setIsPlaying])

  // 轨迹
  const pts: string[] = []
  for (let t = 0; t <= tEff; t += exitTime / 60 || 1) {
    const px = plateLeft + v0 * t * xScale
    const py = midY + 0.5 * a * t * t * yScale
    pts.push(`${px},${Math.min(plateBottom - 4, py)}`)
  }

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 8; i++) {
      const gx = plateLeft + (i * plateLen) / 8
      gridLines.push(
        <line key={`g-${i}`} x1={gx} y1={plateTop} x2={gx} y2={plateBottom}
          stroke={PHYSICS_COLORS.grid} strokeWidth={1} strokeDasharray="4,4" />
      )
    }
  }

  const clampedY = Math.min(plateBottom - 6, y)

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}

        {/* 上极板（+）与下极板（−），E 由上指向下 */}
        <line x1={plateLeft} y1={plateTop} x2={plateRight} y2={plateTop} stroke={PHYSICS_COLORS.forceNet} strokeWidth={4} />
        <text x={plateLeft - 16} y={plateTop + 5} fontSize="16" fill={PHYSICS_COLORS.forceNet}>＋</text>
        <line x1={plateLeft} y1={plateBottom} x2={plateRight} y2={plateBottom} stroke={PHYSICS_COLORS.electricField} strokeWidth={4} />
        <text x={plateLeft - 16} y={plateBottom + 5} fontSize="16" fill={PHYSICS_COLORS.electricField}>－</text>

        {/* 匀强电场线（向下） */}
        {showVectors && Array.from({ length: 6 }, (_, i) => {
          const fx = plateLeft + 30 + (i * (plateLen - 40)) / 5
          return (
            <line key={`E-${i}`} x1={fx} y1={plateTop + 6} x2={fx} y2={plateBottom - 6}
              stroke={PHYSICS_COLORS.electricField} strokeWidth={1} strokeDasharray="6,5"
              markerEnd="url(#arrow-ef-down)" opacity={0.45} />
          )
        })}

        {/* 轨迹 */}
        {pts.length > 1 && (
          <polyline points={pts.join(' ')} fill="none" stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={CANVAS_STYLE.stroke.trackHistory} strokeDasharray="6,4" opacity={0.6} />
        )}

        {/* 粒子 */}
        <circle cx={x} cy={clampedY} r={9} fill={PHYSICS_COLORS.forceNet} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={2} />
        <text x={x} y={clampedY + 4} fontSize="12" fill="#fff" textAnchor="middle" fontWeight="bold">+</text>

        {/* 速度分量矢量 */}
        {showVectors && tEff > 0 && (
          <g>
            <line x1={x} y1={clampedY} x2={x + v0 * 4} y2={clampedY}
              stroke={PHYSICS_COLORS.velocity} strokeWidth={CANVAS_STYLE.stroke.vectorSub} markerEnd="url(#arrow-ef-v)" />
            <line x1={x} y1={clampedY} x2={x} y2={clampedY + Math.min(60, vy * 1.5)}
              stroke={PHYSICS_COLORS.acceleration} strokeWidth={CANVAS_STYLE.stroke.vectorSub} markerEnd="url(#arrow-ef-vy)" />
          </g>
        )}

        {showFormulas && (
          <g transform={`translate(${plateRight + 16}, ${plateTop})`}>
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">类平抛运动</text>
            <text x={0} y={24} fontSize="12" fill={PHYSICS_COLORS.axis}>水平：x = v₀t（匀速）</text>
            <text x={0} y={44} fontSize="12" fill={PHYSICS_COLORS.axis}>竖直：a = qE/m</text>
            <text x={0} y={64} fontSize="12" fill={PHYSICS_COLORS.axis}>y = ½at²</text>
            <text x={0} y={90} fontSize="12" fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              a = {a.toExponential(2)} m/s²
            </text>
            <text x={0} y={110} fontSize="12" fill={PHYSICS_COLORS.velocity}>v₀ = {v0} m/s</text>
            <text x={0} y={130} fontSize="12" fill={PHYSICS_COLORS.axis}>vy = {vy.toFixed(1)} m/s</text>
            <text x={0} y={154} fontSize="12" fill={PHYSICS_COLORS.axis}>t = {tEff.toFixed(2)} s</text>
          </g>
        )}

        <defs>
          <marker id="arrow-ef-down" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill={PHYSICS_COLORS.electricField} />
          </marker>
          <marker id="arrow-ef-v" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrow-ef-vy" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
