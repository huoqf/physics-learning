import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

const FONT = {
  title: CANVAS_STYLE.font.bodySize ?? 14,
  label: CANVAS_STYLE.font.labelSize,
  axis: CANVAS_STYLE.font.axisSize,
}
const CHARGE_RADIUS = CANVAS_STYLE.object.pointMassRadius + 4

/** 电场线+等势面：同种/异种电荷对，电场线从正到负，等势面与电场线垂直 */
export default function FieldLines() {
  const { params, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 500 })

  const { q1 = 5, q2 = -5, distance = 8 } = params // q: μC, distance: cm

  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2
  const halfDistPx = distance * 18
  const leftX = cx - halfDistPx
  const rightX = cx + halfDistPx

  const isPositive1 = q1 > 0
  const isNegative1 = q1 < 0
  const isPositive2 = q2 > 0
  const isNegative2 = q2 < 0
  const q1Zero = Math.abs(q1) < 0.01
  const q2Zero = Math.abs(q2) < 0.01

  const isOpposite = (isPositive1 && isNegative2) || (isNegative1 && isPositive2)
  const isSameSign = (isPositive1 && isPositive2) || (isNegative1 && isNegative2)
  const anyZero = q1Zero || q2Zero
  const bothZero = q1Zero && q2Zero

  const gridLines = []
  if (showGrid) {
    for (let i = 1; i <= 6; i++) {
      gridLines.push(
        <circle key={`ring1-${i}`} cx={leftX} cy={cy} r={i * 30}
          fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="4,4" />,
        <circle key={`ring2-${i}`} cx={rightX} cy={cy} r={i * 30}
          fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="4,4" />
      )
    }
  }

  const chargeColor1 = isPositive1 ? PHYSICS_COLORS.positiveCharge : isNegative1 ? PHYSICS_COLORS.negativeCharge : PHYSICS_COLORS.labelText
  const chargeColor2 = isPositive2 ? PHYSICS_COLORS.positiveCharge : isNegative2 ? PHYSICS_COLORS.negativeCharge : PHYSICS_COLORS.labelText

  const fieldLineCount = 16
  const equipotentialLevels = 6
  const rOffset = CHARGE_RADIUS + 4

  const chargeSymbol1 = q1Zero ? '0' : isPositive1 ? '+' : '−'
  const chargeSymbol2 = q2Zero ? '0' : isPositive2 ? '+' : '−'

  let title = ''
  let fieldLineDesc = ''
  if (bothZero) {
    title = '无电场（两电荷均为零）'
    fieldLineDesc = '无电场线'
  } else if (anyZero) {
    title = '单电荷电场'
    fieldLineDesc = (q1Zero ? q2 : q1) > 0
      ? '从正电荷向外辐射'
      : '从无限远指向负电荷'
  } else if (isOpposite) {
    title = '异种电荷电场'
    fieldLineDesc = '从正电荷出发，终止于负电荷'
  } else {
    title = '同种电荷电场'
    fieldLineDesc = isPositive1
      ? '从两正电荷向外辐射，中间相互排斥'
      : '从无限远指向两负电荷，中间相互排斥'
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>
          <marker id="arrow-fieldlines" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.electricField} />
          </marker>
        </defs>

        {gridLines}

        {/* 电场线 */}
        {showVectors && !bothZero && Array.from({ length: fieldLineCount }, (_, i) => {
          const angle = (i * Math.PI * 2) / fieldLineCount

          if (anyZero) {
            // 单电荷：点电荷放射状电场
            const baseX = q1Zero ? rightX : leftX
            const isPositive = q1Zero ? isPositive2 : isPositive1
            const sx = baseX + Math.cos(angle) * rOffset
            const sy = cy + Math.sin(angle) * rOffset
            const ex = baseX + Math.cos(angle) * 140
            const ey = cy + Math.sin(angle) * 140
            return (
              <line key={`el-${i}`}
                x1={isPositive ? sx : ex} y1={isPositive ? sy : ey}
                x2={isPositive ? ex : sx} y2={isPositive ? ey : sy}
                stroke={PHYSICS_COLORS.electricField}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                markerEnd="url(#arrow-fieldlines)" opacity={0.6} />
            )
          } else if (isOpposite) {
            // 异种电荷：电场线从正电荷出发，终止于负电荷
            const startX = isPositive1 ? leftX : rightX
            const endX = isPositive1 ? rightX : leftX

            const sx = startX + Math.cos(angle) * rOffset
            const sy = cy + Math.sin(angle) * rOffset
            const ex = endX + Math.cos(angle) * rOffset
            const ey = cy + Math.sin(angle) * rOffset

            const midX = (sx + ex) / 2
            const midY = (sy + ey) / 2
            const dx = endX - startX
            const perpLen = Math.abs(dx)
            // 弯曲方向：垂直于连线，sin(angle)>0 向上弯，<0 向下弯
            const bend = Math.sin(angle) * 40
            const cpx = midX
            const cpy = midY + (dx / perpLen) * bend

            return (
              <path key={`el-${i}`}
                d={`M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}`}
                fill="none" stroke={PHYSICS_COLORS.electricField}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                markerEnd="url(#arrow-fieldlines)" opacity={0.6} />
            )
          } else if (isSameSign) {
            // 同种电荷：电场线相互排斥，中间弯曲远离
            // 每电荷各画 16 条线覆盖 2π，中间区域向外弯曲
            const isLeft = i < fieldLineCount / 2
            const baseX = isLeft ? leftX : rightX
            const localIdx = i % (fieldLineCount / 2)
            const localAngle = (localIdx * Math.PI * 2) / (fieldLineCount / 2)

            const sx = baseX + Math.cos(localAngle) * rOffset
            const sy = cy + Math.sin(localAngle) * rOffset
            const ex = baseX + Math.cos(localAngle) * 140
            const ey = cy + Math.sin(localAngle) * 140

            // 判断是否指向另一电荷方向
            // 左电荷 cos>0 指向右（另一电荷），右电荷 cos<0 指向左（另一电荷）
            const towardOther = isLeft ? Math.cos(localAngle) > 0 : Math.cos(localAngle) < 0

            if (!towardOther) {
              // 背离另一电荷：直线
              return (
                <line key={`el-${i}`}
                  x1={isPositive1 ? sx : ex} y1={isPositive1 ? sy : ey}
                  x2={isPositive1 ? ex : sx} y2={isPositive1 ? ey : sy}
                  stroke={PHYSICS_COLORS.electricField}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  markerEnd="url(#arrow-fieldlines)" opacity={0.6} />
              )
            }

            // 指向另一电荷：Bézier 曲线向外弯曲
            // bendAmount 正比于 cos 的绝对值（越直指对方，弯曲越大）
            const bendAmount = Math.abs(Math.cos(localAngle)) * 50
            // 弯曲方向：垂直于连线，sin>0 向上，<0 向下
            const bendDir = Math.sin(localAngle) >= 0 ? 1 : -1
            // 控制点在中点位置向外偏移
            const midX = (sx + ex) / 2
            const midY = (sy + ey) / 2
            // 垂直于连线方向 = 竖直方向（两电荷同水平线）
            const cpx = midX
            const cpy = midY + bendDir * bendAmount

            return (
              <path key={`el-${i}`}
                d={`M ${isPositive1 ? sx : ex} ${isPositive1 ? sy : ey} Q ${cpx} ${cpy} ${isPositive1 ? ex : sx} ${isPositive1 ? ey : sy}`}
                fill="none" stroke={PHYSICS_COLORS.electricField}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                markerEnd="url(#arrow-fieldlines)" opacity={0.6} />
            )
          }
          return null
        })}

        {/* 等势面（虚线圆） */}
        {showVectors && !bothZero && Array.from({ length: equipotentialLevels }, (_, i) => {
          const r = 25 + i * 22
          if (anyZero) {
            const baseX = q1Zero ? rightX : leftX
            return (
              <circle key={`eq-${i}`} cx={baseX} cy={cy} r={r}
                fill="none" stroke={PHYSICS_COLORS.electricPotential}
                strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="3,4" opacity={0.4} />
            )
          }
          return (
            <g key={`eq-${i}`}>
              <circle cx={leftX} cy={cy} r={r}
                fill="none" stroke={PHYSICS_COLORS.electricPotential}
                strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="3,4" opacity={0.4} />
              <circle cx={rightX} cy={cy} r={r}
                fill="none" stroke={PHYSICS_COLORS.electricPotential}
                strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="3,4" opacity={0.4} />
            </g>
          )
        })}

        {/* 电荷 q1 */}
        <circle cx={leftX} cy={cy} r={CHARGE_RADIUS} fill={chargeColor1}
          stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        <text x={leftX} y={cy + 6} fontSize={FONT.title} fill={PHYSICS_COLORS.objectFill} textAnchor="middle" fontWeight="bold">
          {chargeSymbol1}
        </text>
        <text x={leftX} y={cy + CHARGE_RADIUS + 18} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
          q₁ = {q1} μC
        </text>

        {/* 电荷 q2 */}
        <circle cx={rightX} cy={cy} r={CHARGE_RADIUS} fill={chargeColor2}
          stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        <text x={rightX} y={cy + 6} fontSize={FONT.title} fill={PHYSICS_COLORS.objectFill} textAnchor="middle" fontWeight="bold">
          {chargeSymbol2}
        </text>
        <text x={rightX} y={cy + CHARGE_RADIUS + 18} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
          q₂ = {q2} μC
        </text>

        {/* 距离标注 */}
        <line x1={leftX} y1={cy + 50} x2={rightX} y2={cy + 50}
          stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.reference} />
        <line x1={leftX} y1={cy + 45} x2={leftX} y2={cy + 55}
          stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.reference} />
        <line x1={rightX} y1={cy + 45} x2={rightX} y2={cy + 55}
          stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.reference} />
        <text x={cx} y={cy + 66} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
          d = {distance} cm
        </text>

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize={FONT.title} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
              {title}
            </text>
            <text x={0} y={24} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>
              电场线：{fieldLineDesc}
            </text>
            {!bothZero && (
              <text x={0} y={44} fontSize={FONT.axis} fill={PHYSICS_COLORS.electricPotential}>
                等势面（虚线）：与电场线处处垂直
              </text>
            )}
            {!bothZero && (
              <>
                <text x={0} y={68} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>
                  高考要点：沿电场线方向电势降低
                </text>
                <text x={0} y={88} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>
                  高考要点：等势面上移动电荷，电场力不做功
                </text>
              </>
            )}
          </g>
        )}
      </svg>
    </div>
  )
}