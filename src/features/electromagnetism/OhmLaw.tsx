import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateOhmLaw } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

/** 欧姆定律 I = U/R：U-I 图像（过原点直线，斜率 1/R），工作点标注 */
export default function OhmLaw() {
  const { params, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 450 })

  const { U = 6, R = 3 } = params
  const { I } = calculateOhmLaw(U, R)

  // 坐标系：左下原点，x=U(0~12V)，y=I(0~ Umax/Rmin)
  const padL = 60
  const padB = 50
  const padT = 30
  const padR = 30
  const ox = padL
  const oy = canvasSize.height - padB
  const plotW = canvasSize.width - padL - padR
  const plotH = canvasSize.height - padT - padB

  const Umax = 12
  const Imax = 6 // 量程上限，A
  const xOf = (u: number) => ox + (u / Umax) * plotW
  const yOf = (i: number) => oy - (Math.min(i, Imax) / Imax) * plotH

  // U-I 直线：I = U/R，取 U=0..Umax
  const lineX2 = xOf(Umax)
  const lineY2 = yOf(Umax / R)

  const gridLines = []
  if (showGrid) {
    for (let u = 0; u <= Umax; u += 2) {
      gridLines.push(<line key={`gx-${u}`} x1={xOf(u)} y1={padT} x2={xOf(u)} y2={oy} stroke={PHYSICS_COLORS.grid} strokeWidth={1} strokeDasharray="4,4" />)
    }
    for (let i = 0; i <= Imax; i += 1) {
      gridLines.push(<line key={`gy-${i}`} x1={ox} y1={yOf(i)} x2={ox + plotW} y2={yOf(i)} stroke={PHYSICS_COLORS.grid} strokeWidth={1} strokeDasharray="4,4" />)
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}

        {/* 坐标轴 */}
        <line x1={ox} y1={oy} x2={ox + plotW} y2={oy} stroke={PHYSICS_COLORS.axis} strokeWidth={2} markerEnd="url(#arrow-ohm-axis)" />
        <line x1={ox} y1={oy} x2={ox} y2={padT} stroke={PHYSICS_COLORS.axis} strokeWidth={2} markerEnd="url(#arrow-ohm-axis)" />
        <text x={ox + plotW - 6} y={oy + 24} fontSize="13" fill={PHYSICS_COLORS.axis} textAnchor="end">U / V</text>
        <text x={ox - 36} y={padT + 6} fontSize="13" fill={PHYSICS_COLORS.axis}>I / A</text>

        {/* 刻度 */}
        {[0, 2, 4, 6, 8, 10, 12].map((u) => (
          <text key={`tx-${u}`} x={xOf(u)} y={oy + 16} fontSize="10" fill={PHYSICS_COLORS.axis} textAnchor="middle">{u}</text>
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <text key={`ty-${i}`} x={ox - 10} y={yOf(i) + 4} fontSize="10" fill={PHYSICS_COLORS.axis} textAnchor="end">{i}</text>
        ))}

        {/* U-I 直线 */}
        <line x1={ox} y1={oy} x2={lineX2} y2={lineY2} stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.vectorMain} />

        {/* 工作点 + 投影 */}
        <line x1={xOf(U)} y1={oy} x2={xOf(U)} y2={yOf(I)} stroke={PHYSICS_COLORS.electricPotential} strokeWidth={1} strokeDasharray="5,4" />
        <line x1={ox} y1={yOf(I)} x2={xOf(U)} y2={yOf(I)} stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={1} strokeDasharray="5,4" />
        <circle cx={xOf(U)} cy={yOf(I)} r={6} fill={PHYSICS_COLORS.forceNet} />

        {showFormulas && (
          <g transform="translate(80, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">欧姆定律 I = U/R</text>
            <text x={0} y={22} fontSize="12" fill={PHYSICS_COLORS.axis}>电压 U = {U} V，电阻 R = {R} Ω</text>
            <text x={0} y={42} fontSize="13" fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold">电流 I = {I.toFixed(2)} A</text>
            <text x={0} y={62} fontSize="11" fill={PHYSICS_COLORS.axis}>图线斜率 = 1/R = {(1 / R).toFixed(3)} S（越陡电阻越小）</text>
          </g>
        )}

        <defs>
          <marker id="arrow-ohm-axis" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill={PHYSICS_COLORS.axis} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
