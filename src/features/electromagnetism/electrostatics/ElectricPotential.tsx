import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateElectricPotential, calculateElectricField } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'

const FONT = {
  title: 14,
  label: CANVAS_STYLE.font.labelSize,
  axis: CANVAS_STYLE.font.axisSize,
  small: 11,
}
const CHARGE_RADIUS = CANVAS_STYLE.object.pointMassRadius + 4

/** 电势与等势面：V=kq/r，沿电场线方向电势降低，等势面与电场线垂直 */
export default function ElectricPotential() {
  const { params, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 500 })

  const { q = 5, rTest = 5 } = params // q: μC, rTest: 试探点距离 cm

  const k = 9e9
  const qSI = q * 1e-6
  const positive = q >= 0
  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2
  const pxPerCm = 26

  // 电势计算
  const rTestSI = (rTest || 0.01) * 0.01
  const { V } = calculateElectricPotential(k, Math.abs(qSI), rTestSI)
  const { E } = calculateElectricField(k, Math.abs(qSI), rTestSI)

  // 等势面同心圆（不同电势值对应的圆环）
  const equipotentialLevels = [2, 4, 6, 8, 10, 12]
  const vAt = (r: number) => {
    const rSI = r * 0.01
    return calculateElectricPotential(k, Math.abs(qSI), rSI).V
  }

  // 电场线（从正电荷向外或从无限远指向负电荷）
  const fieldLineCount = 12
  const directions = Array.from({ length: fieldLineCount }, (_, i) => (i * Math.PI * 2) / fieldLineCount)
  const lineInner = CHARGE_RADIUS + 4
  const lineOuter = 180

  // 试探点位置（水平向右）
  const testX = cx + rTest * pxPerCm
  const testY = cy

  // 电势颜色插值：正电荷从红到蓝，负电荷从蓝到红
  const getVColor = (v: number, maxV: number) => {
    const ratio = Math.min(1, Math.abs(v) / maxV)
    if (positive) {
      const r = Math.round(239 + (59 - 239) * ratio)
      const g = Math.round(68 + (131 - 68) * ratio)
      const b = Math.round(68 + (246 - 68) * ratio)
      return `rgb(${r},${g},${b})`
    } else {
      const r = Math.round(59 + (239 - 59) * ratio)
      const g = Math.round(131 + (68 - 131) * ratio)
      const b = Math.round(246 + (68 - 246) * ratio)
      return `rgb(${r},${g},${b})`
    }
  }

  const maxV = Math.abs(vAt(2))

  const gridLines = []
  if (showGrid) {
    for (let i = 1; i <= 5; i++) {
      gridLines.push(
        <circle key={`ring-${i}`} cx={cx} cy={cy} r={i * 40}
          fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="4,4" />
      )
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>
          <marker id="arrow-epotential" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.electricField} />
          </marker>
          <marker id="arrow-epotential-e" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill={PHYSICS_COLORS.electricField} />
          </marker>
        </defs>

        {gridLines}

        {/* 等势面（不同颜色的同心圆环） */}
        {equipotentialLevels.map((r, i) => {
          const v = vAt(r)
          const rPx = r * pxPerCm
          return (
            <circle key={`eq-${i}`} cx={cx} cy={cy} r={rPx}
              fill="none" stroke={getVColor(v, maxV)}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub} strokeDasharray="3,4" opacity={0.7} />
          )
        })}

        {/* 电场线（箭头方向表示电势降低方向） */}
        {showVectors && directions.map((a, i) => {
          const x1 = cx + Math.cos(a) * lineInner
          const y1 = cy + Math.sin(a) * lineInner
          const x2 = cx + Math.cos(a) * lineOuter
          const y2 = cy + Math.sin(a) * lineOuter

          return (
            <line key={`ef-${i}`}
              x1={positive ? x1 : x2} y1={positive ? y1 : y2}
              x2={positive ? x2 : x1} y2={positive ? y2 : y1}
              stroke={PHYSICS_COLORS.electricField}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              markerEnd="url(#arrow-epotential)" opacity={0.5} />
          )
        })}

        {/* 试探点 */}
        <circle cx={testX} cy={testY} r={8} fill={PHYSICS_COLORS.forceNet}
          stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        <text x={testX} y={testY - 14} fontSize={FONT.label} fill={PHYSICS_COLORS.forceNet} textAnchor="middle" fontWeight="bold">
          P
        </text>

        {/* P 点场强方向（沿电场线切线） */}
        {showVectors && (
          <line x1={testX} y1={testY} x2={testX + (positive ? 30 : -30)} y2={testY}
            stroke={PHYSICS_COLORS.electricField} strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            markerEnd="url(#arrow-epotential-e)" />
        )}

        {/* 源电荷 */}
        <circle cx={cx} cy={cy} r={CHARGE_RADIUS} fill={positive ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
          stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        <text x={cx} y={cy + 6} fontSize={FONT.title} fill={PHYSICS_COLORS.objectFill} textAnchor="middle" fontWeight="bold">
          {positive ? '+' : '−'}
        </text>
        <text x={cx} y={cy + CHARGE_RADIUS + 18} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
          Q = {q} μC
        </text>

        {/* 距离标注 */}
        <line x1={cx} y1={cy + 45} x2={testX} y2={cy + 45}
          stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.reference} />
        <line x1={cx} y1={cy + 40} x2={cx} y2={cy + 50}
          stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.reference} />
        <line x1={testX} y1={cy + 40} x2={testX} y2={cy + 50}
          stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.reference} />
        <text x={(cx + testX) / 2} y={cy + 60} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
          r = {rTest.toFixed(1)} cm
        </text>

        {/* 电势标注 */}
        <text x={testX} y={testY + 24} fontSize={FONT.axis} fill={PHYSICS_COLORS.electricPotential} textAnchor="middle" fontWeight="bold">
          V = {(V * 1e-6).toFixed(2)} ×10⁶ V
        </text>

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize={FONT.title} fill={PHYSICS_COLORS.labelText} fontWeight="bold">电势与电势差</text>
            <text x={0} y={24} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>V = k·q/r（V）</text>
            <text x={0} y={44} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>q = {q} μC，r = {rTest.toFixed(1)} cm</text>
            <text x={0} y={68} fontSize={FONT.axis} fill={PHYSICS_COLORS.electricPotential}>
              P 点 V = {(V * 1e-6).toFixed(2)} ×10⁶ V
            </text>
            <text x={0} y={88} fontSize={FONT.axis} fill={PHYSICS_COLORS.electricField}>
              P 点 E = {E.toExponential(2)} N/C
            </text>
            <text x={0} y={112} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>
              高考要点：沿电场线方向电势降低
            </text>
            <text x={0} y={132} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>
              高考要点：等势面上移动电荷，电场力不做功
            </text>
            <text x={0} y={156} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>
              正电荷周围电势为正，负电荷周围电势为负
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
