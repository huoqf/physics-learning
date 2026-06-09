import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateAmpereForce } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'

const GRID_MARGIN = 40
const FONT = {
  title: 14,
  label: CANVAS_STYLE.font.labelSize,
  axis: CANVAS_STYLE.font.axisSize,
  magnetic: 16,
}

/** 安培力 F = BIL·sinθ：通电导线在磁场中受力，B/I/L/θ 可调，左手定则演示 */
export default function AmpereForce() {
  const { params, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  const { B = 1, I = 2, L = 5, angle = 90 } = params
  const { F } = calculateAmpereForce(B, I, L, angle)

  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2
  const pxPerUnit = 20
  const wireLen = L * pxPerUnit
  const wireAngleRad = ((angle >= 0 && angle <= 180 ? angle : 90) * Math.PI) / 180

  const wireX1 = cx - (wireLen / 2) * Math.cos(wireAngleRad)
  const wireY1 = cy + (wireLen / 2) * Math.sin(wireAngleRad)
  const wireX2 = cx + (wireLen / 2) * Math.cos(wireAngleRad)
  const wireY2 = cy - (wireLen / 2) * Math.sin(wireAngleRad)

  const arrowLen = F < 0.01 ? 0 : Math.min(100, Math.max(20, F * 8))
  const forceDir = I >= 0 ? 1 : -1

  const gridCols = 6
  const gridRows = 4
  const gridSpacingX = (canvasSize.width - 160) / (gridCols - 1)
  const gridSpacingY = (canvasSize.height - 140) / (gridRows - 1)

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const xPos = (i * canvasSize.width) / 10
      const yPos = (i * canvasSize.height) / 10
      gridLines.push(
        <line key={`gv-${i}`} x1={xPos} y1={GRID_MARGIN} x2={xPos} y2={canvasSize.height - GRID_MARGIN}
          stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="4,4" />,
        <line key={`gh-${i}`} x1={GRID_MARGIN} y1={yPos} x2={canvasSize.width - GRID_MARGIN} y2={yPos}
          stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="4,4" />
      )
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>
          <marker id="arrow-ampere-force" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
          </marker>
          <marker id="arrow-ampere-current" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.electricCurrent} />
          </marker>
        </defs>

        {gridLines}

        {/* 磁场 B 方向（垂直纸面向里/向外用符号表示） */}
        <g>
          <text x={cx} y={GRID_MARGIN} fontSize={FONT.title} fill={PHYSICS_COLORS.magneticField} textAnchor="middle" fontWeight="bold">
            B = {B.toFixed(1)} T（垂直纸面向里 ⊗）
          </text>
          {Array.from({ length: gridCols }).map((_, i) =>
            Array.from({ length: gridRows }).map((_, j) => (
              <text
                key={`b-${i}-${j}`}
                x={80 + i * gridSpacingX}
                y={80 + j * gridSpacingY}
                fontSize={FONT.magnetic}
                fill={PHYSICS_COLORS.magneticField}
                opacity={0.3}
                textAnchor="middle"
              >
                ⊗
              </text>
            ))
          )}
        </g>

        {/* 导线 */}
        <line x1={wireX1} y1={wireY1} x2={wireX2} y2={wireY2}
          stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        <circle cx={wireX1} cy={wireY1} r={CANVAS_STYLE.object.minRadius} fill={PHYSICS_COLORS.electricCurrent} />
        <circle cx={wireX2} cy={wireY2} r={CANVAS_STYLE.object.minRadius} fill={PHYSICS_COLORS.electricCurrent} />

        {/* 电流方向箭头 */}
        <line x1={wireX1} y1={wireY1} x2={wireX2} y2={wireY2}
          stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.vectorSub}
          markerEnd="url(#arrow-ampere-current)" opacity={0.8} />
        <text x={cx} y={cy - 12} fontSize={FONT.axis} fill={PHYSICS_COLORS.electricCurrent} textAnchor="middle">
          I = {Math.abs(I).toFixed(1)} A
        </text>

        {/* 安培力矢量 */}
        {showVectors && arrowLen > 0 && (
          <g>
            <line x1={cx} y1={cy} x2={cx} y2={cy + forceDir * arrowLen}
              stroke={PHYSICS_COLORS.forceNet} strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrow-ampere-force)" />
            <text x={cx + 14} y={cy + forceDir * arrowLen / 2} fontSize={FONT.label} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
              F
            </text>
          </g>
        )}

        {/* 角度标注 */}
        {angle !== 90 && (
          <g>
            <path d={`M ${cx + 30} ${cy} A 30 30 0 0 ${angle > 90 ? 1 : 0} ${cx + 30 * Math.cos(wireAngleRad)} ${cy - 30 * Math.sin(wireAngleRad)}`}
              fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.reference} />
            <text x={cx + 45} y={cy - 10} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText}>
              θ = {angle.toFixed(0)}°
            </text>
          </g>
        )}

        {/* 导线长度标注 */}
        <text x={cx} y={Math.max(wireY1, wireY2) + 24} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
          L = {L.toFixed(1)} m
        </text>

        {showFormulas && (
          <g transform={`translate(20, ${canvasSize.height - 120})`}>
            <text fontSize={FONT.title} fill={PHYSICS_COLORS.labelText} fontWeight="bold">安培力</text>
            <text x={0} y={24} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>F = BIL·sinθ</text>
            <text x={0} y={44} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>方向：左手定则</text>
            <text x={0} y={68} fontSize={FONT.label} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
              F = {F.toFixed(3)} N
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
