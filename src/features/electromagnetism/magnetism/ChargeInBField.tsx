import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateChargeInMagField } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { IDENTITY_SCENE_SCALE } from '@/scene'

const GRID_MARGIN = 40
const CHARGE_RADIUS = CANVAS_STYLE.object.pointMassRadius
const VECTOR_LEN_V = 40

/** 带电粒子在匀强磁场中圆周运动：r = mv/(qB)，T = 2πm/(qB)，轨迹实时绘制 */
export default function ChargeInBField() {
  const {params, time, showVectors, showFormulas, showGrid} = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      showFormulas: s.showFormulas,
      showGrid: s.showGrid,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.wide)
  const { font } = canvasSize

  const { q = 1, m = 1, v = 10, B = 1 } = params
  const { r, T, omega } = calculateChargeInMagField(Math.abs(q), m, Math.abs(v), B)

  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2
  const scale = Math.min(canvasSize.width, canvasSize.height) / 2.5 / Math.max(r, 0.1)
  const rPx = r * scale

  const theta = T > 0 ? ((time % T) / T) * 2 * Math.PI : 0
  const px = cx + rPx * Math.cos(theta)
  const py = cy - rPx * Math.sin(theta)

  const chargeColor = q >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge

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

  const fLen = rPx > 0 ? Math.min(60, Math.max(15, rPx * 0.25)) : 0

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>
        </defs>

        {gridLines}

        {/* 磁场 B 方向 */}
        <g>
          <text x={cx} y={GRID_MARGIN} fontSize={font(14)} fill={PHYSICS_COLORS.magneticField} textAnchor="middle" fontWeight="bold">
            B = {B.toFixed(1)} T（垂直纸面向里 ⊗）
          </text>
          {Array.from({ length: gridCols }).map((_, i) =>
            Array.from({ length: gridRows }).map((_, j) => (
              <text
                key={`b-${i}-${j}`}
                x={80 + i * gridSpacingX}
                y={80 + j * gridSpacingY}
                fontSize={font(16)}
                fill={PHYSICS_COLORS.magneticField}
                opacity={0.2}
                textAnchor="middle"
              >
                ⊗
              </text>
            ))
          )}
        </g>

        {/* 圆周轨道（虚线） */}
        <circle cx={cx} cy={cy} r={rPx} fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="6,4" />

        {/* 圆心到粒子半径线 */}
        <line x1={cx} y1={cy} x2={px} y2={py}
          stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="3,3" opacity={0.6} />
        <text x={(cx + px) / 2 + 6} y={(cy + py) / 2} fontSize={font(CANVAS_STYLE.font.axisSize)} fill={PHYSICS_COLORS.labelText}>
          r
        </text>

        {/* 圆心 */}
        <circle cx={cx} cy={cy} r={CANVAS_STYLE.object.minRadius} fill={PHYSICS_COLORS.labelText} />
        <text x={cx + 8} y={cy + 4} fontSize={font(CANVAS_STYLE.font.axisSize)} fill={PHYSICS_COLORS.labelText}>O</text>

        {/* 带电粒子 */}
        <circle cx={px} cy={py} r={CHARGE_RADIUS} fill={chargeColor} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        <text x={px} y={py + 4} fontSize={font(16)} fill={PHYSICS_COLORS.objectFill} textAnchor="middle" fontWeight="bold">
          {q >= 0 ? '+' : '−'}
        </text>

        {/* 速度矢量（沿切线） */}
        {showVectors && (
          <g>
            <VectorArrow
              origin={{ x: px, y: py }}
              vector={{ x: -Math.sin(theta), y: Math.cos(theta) }}
              type="velocity"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={VECTOR_LEN_V}
            />
            <text x={px - Math.sin(theta) * 25 - 8} y={py - Math.cos(theta) * 25 - 6}
              fontSize={font(CANVAS_STYLE.font.axisSize)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              v
            </text>
          </g>
        )}

        {/* 洛伦兹力矢量（指向圆心） */}
        {showVectors && fLen > 0 && (
          <g>
            <VectorArrow
              origin={{ x: px, y: py }}
              vector={{ x: -Math.cos(theta), y: -Math.sin(theta) }}
              type="lorentzForce"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={fLen}
            />
            <text x={px - Math.cos(theta) * fLen / 2 + 8} y={py + Math.sin(theta) * fLen / 2}
              fontSize={font(CANVAS_STYLE.font.axisSize)} fill={PHYSICS_COLORS.lorentzForce} fontWeight="bold">
              F
            </text>
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize={font(14)} fill={PHYSICS_COLORS.labelText} fontWeight="bold">带电粒子在磁场中运动</text>
            <text x={0} y={24} fontSize={font(CANVAS_STYLE.font.axisSize)} fill={PHYSICS_COLORS.axis}>r = mv/(qB)</text>
            <text x={0} y={42} fontSize={font(CANVAS_STYLE.font.axisSize)} fill={PHYSICS_COLORS.axis}>T = 2πm/(qB)</text>
            <text x={0} y={60} fontSize={font(CANVAS_STYLE.font.axisSize)} fill={PHYSICS_COLORS.axis}>ω = qB/m</text>
            <text x={0} y={84} fontSize={font(CANVAS_STYLE.font.labelSize)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              r = {r.toFixed(3)} m
            </text>
            <text x={0} y={102} fontSize={font(CANVAS_STYLE.font.labelSize)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              T = {T.toFixed(3)} s
            </text>
            <text x={0} y={120} fontSize={font(CANVAS_STYLE.font.labelSize)} fill={PHYSICS_COLORS.magneticField} fontWeight="bold">
              ω = {omega.toFixed(3)} rad/s
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
