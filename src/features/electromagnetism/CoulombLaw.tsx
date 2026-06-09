import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateCoulombForce, calculateCoulombPendulum, GRAVITY } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE, SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

/** 库仑定律 F = kq₁q₂/r²：基础模式-两点电荷；进阶模式-双丝线悬挂小球 */
export default function CoulombLaw() {
  const { params, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 450 })

  const mode = params.mode ?? 0 // 0=基础, 1=双球悬挂
  const showForceAnalysis = (params.showForceAnalysis ?? 0) === 1

  return (
    <div ref={containerRef} className="w-full h-full">
      {mode === 0
        ? <BasicMode params={params} showVectors={showVectors} showFormulas={showFormulas} showGrid={showGrid} canvasSize={canvasSize} />
        : <PendulumMode params={params} showVectors={showVectors} showFormulas={showFormulas} showGrid={showGrid} showForceAnalysis={showForceAnalysis} canvasSize={canvasSize} />
      }
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 基础模式：两点电荷水平排列
// ═══════════════════════════════════════════════════════════════════════
function BasicMode({
  params,
  showVectors,
  showFormulas,
  showGrid,
  canvasSize,
}: {
  params: Record<string, number>
  showVectors: boolean
  showFormulas: boolean
  showGrid: boolean
  canvasSize: { width: number; height: number }
}) {
  const { q1 = 2, q2 = -3, r = 4 } = params
  const k = 9e9
  const q1SI = q1 * 1e-6
  const q2SI = q2 * 1e-6
  const rSI = r * 0.01
  const { F } = calculateCoulombForce(k, Math.abs(q1SI), Math.abs(q2SI), rSI || 1e-9)

  const attractive = q1 * q2 < 0
  const centerY = canvasSize.height / 2
  const pxPerCm = 28
  const gap = r * pxPerCm
  const cx = canvasSize.width / 2
  const x1 = cx - gap / 2
  const x2 = cx + gap / 2
  const chargeR = 22

  // 力箭头长度（对数压缩）
  const arrowLen = Math.max(20, Math.min(90, 30 * Math.log10(F * 1e3 + 10)))

  const colorOf = (q: number) => (q >= 0 ? PHYSICS_COLORS.forceNet : PHYSICS_COLORS.electricField)
  const leftArrowDir = attractive ? 1 : -1
  const rightArrowDir = attractive ? -1 : 1

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const xPos = (i * canvasSize.width) / 10
      gridLines.push(
        <line key={`g-${i}`} x1={xPos} y1={40} x2={xPos} y2={canvasSize.height - 40}
          stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid} strokeDasharray={CANVAS_STYLE.dash.axis.join(' ')} />
      )
    }
  }

  return (
    <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
      {gridLines}

      {/* 水平基准线 */}
      <line x1={40} y1={centerY} x2={canvasSize.width - 40} y2={centerY}
        stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} strokeDasharray="4,4" opacity={0.3} />

      {/* 距离标注线 */}
      <line x1={x1} y1={centerY + 50} x2={x2} y2={centerY + 50} stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} />
      <line x1={x1} y1={centerY + 44} x2={x1} y2={centerY + 56} stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} />
      <line x1={x2} y1={centerY + 44} x2={x2} y2={centerY + 56} stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} />
      <text x={cx} y={centerY + 70} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.axis} textAnchor="middle">
        r = {r.toFixed(1)} cm
      </text>

      {/* 力矢量箭头 */}
      {showVectors && (
        <g>
          <line x1={x1} y1={centerY} x2={x1 + leftArrowDir * arrowLen} y2={centerY}
            stroke={PHYSICS_COLORS.forceNet} strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            markerEnd="url(#arrow-coulomb)" />
          <line x1={x2} y1={centerY} x2={x2 + rightArrowDir * arrowLen} y2={centerY}
            stroke={PHYSICS_COLORS.forceNet} strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            markerEnd="url(#arrow-coulomb)" />
          {/* 力标签 */}
          <text x={x1 + leftArrowDir * arrowLen / 2} y={centerY - 12}
            fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.forceNet} textAnchor="middle" fontWeight="bold">
            F
          </text>
          <text x={x2 + rightArrowDir * arrowLen / 2} y={centerY - 12}
            fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.forceNet} textAnchor="middle" fontWeight="bold">
            F
          </text>
        </g>
      )}

      {/* 电荷 A */}
      <circle cx={x1} cy={centerY} r={chargeR} fill={colorOf(q1)} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
      <text x={x1} y={centerY + 6} fontSize="20" fill={colors.neutral[0]} textAnchor="middle" fontWeight="bold">
        {q1 >= 0 ? '+' : '−'}
      </text>
      <text x={x1} y={centerY - chargeR - 8} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
        q₁ = {q1} μC
      </text>

      {/* 电荷 B */}
      <circle cx={x2} cy={centerY} r={chargeR} fill={colorOf(q2)} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
      <text x={x2} y={centerY + 6} fontSize="20" fill={colors.neutral[0]} textAnchor="middle" fontWeight="bold">
        {q2 >= 0 ? '+' : '−'}
      </text>
      <text x={x2} y={centerY - chargeR - 8} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
        q₂ = {q2} μC
      </text>

      {showFormulas && (
        <g transform="translate(20, 20)">
          <text fontSize={CANVAS_STYLE.font.title} fill={PHYSICS_COLORS.labelText} fontWeight="bold">库仑定律</text>
          <text x={0} y={24} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.axis}>F = k·q₁q₂/r²</text>
          <text x={0} y={44} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.axis}>k = 9×10⁹ N·m²/C²</text>
          <text x={0} y={68} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
            F = {F.toExponential(2)} N
          </text>
          <text x={0} y={88} fontSize={CANVAS_STYLE.font.axisSize} fill={attractive ? PHYSICS_COLORS.electricField : PHYSICS_COLORS.forceNet}>
            {attractive ? '异号电荷 → 相互吸引' : '同号电荷 → 相互排斥'}
          </text>
        </g>
      )}

      <defs>
        <marker id="arrow-coulomb" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
        </marker>
      </defs>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// 进阶模式：双丝线悬挂小球动态平衡
// ═══════════════════════════════════════════════════════════════════════
function PendulumMode({
  params,
  showVectors,
  showFormulas,
  showGrid,
  showForceAnalysis,
  canvasSize,
}: {
  params: Record<string, number>
  showVectors: boolean
  showFormulas: boolean
  showGrid: boolean
  showForceAnalysis: boolean
  canvasSize: { width: number; height: number }
}) {
  const { q1 = 2, q2 = -3 } = params
  const L_cm = params.L ?? 20
  const m = params.m ?? 0.05
  const k = 9e9
  const g = GRAVITY
  const L = L_cm * 0.01 // cm → m

  const { theta, r: rPend, F, attractive } = calculateCoulombPendulum(k, q1 * 1e-6, q2 * 1e-6, m, L, g)
  const thetaDeg = (theta * 180) / Math.PI

  // SVG 坐标系
  const cx = canvasSize.width / 2
  const hangY = 60 // 悬挂点 y
  const pxPerCm = Math.min(12, (canvasSize.height - 120) / (L_cm * 1.2)) // 自适应缩放
  const Lpx = L_cm * pxPerCm

  // 球位置（SVG 坐标：y 向下为正）
  const sign = attractive ? -1 : 1
  const ball1X = cx + sign * Lpx * Math.sin(theta)
  const ball1Y = hangY + Lpx * Math.cos(theta)
  const ball2X = cx - sign * Lpx * Math.sin(theta)
  const ball2Y = hangY + Lpx * Math.cos(theta)
  const ballR = 16

  // 力箭头缩放
  const forceScale = Math.min(80, Math.max(25, 40 * Math.log10(F * 1e6 + 10)))
  const gravScale = Math.min(60, Math.max(20, 30 * Math.log10(m * g * 1e3 + 10)))

  // 夹角弧线
  const arcR = 35
  const arcPath1 = describeArc(cx, hangY, arcR, 90, 90 + thetaDeg * (sign > 0 ? -1 : 1))
  const arcPath2 = describeArc(cx, hangY, arcR, 90, 90 - thetaDeg * (sign > 0 ? -1 : 1))

  // 距离标注
  const distY = Math.max(ball1Y, ball2Y) + 40

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const xPos = (i * canvasSize.width) / 10
      gridLines.push(
        <line key={`g-${i}`} x1={xPos} y1={40} x2={xPos} y2={canvasSize.height - 40}
          stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid} strokeDasharray={CANVAS_STYLE.dash.axis.join(' ')} />
      )
    }
  }

  return (
    <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
      {gridLines}

      {/* 天花板 */}
      <rect x={cx - 120} y={hangY - 10} width={240} height={10} fill="url(#ceilingMetalGrad)" stroke={PHYSICS_COLORS.axis} strokeWidth={1.5} />
      <circle cx={cx} cy={hangY} r={4} fill={PHYSICS_COLORS.labelText} />

      {/* 竖直参考线（虚线） */}
      <line x1={cx} y1={hangY} x2={cx} y2={hangY + Lpx + 20}
        stroke={PHYSICS_COLORS.axis} strokeWidth={1} strokeDasharray="4,4" opacity={0.3} />

      {/* 丝线 */}
      <line x1={cx} y1={hangY} x2={ball1X} y2={ball1Y}
        stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.objectThin} />
      <line x1={cx} y1={hangY} x2={ball2X} y2={ball2Y}
        stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.objectThin} />

      {/* 夹角弧线与标注 */}
      {thetaDeg > 1 && (
        <g>
          {arcPath1 && <path d={arcPath1} fill="none" stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} />}
          {arcPath2 && <path d={arcPath2} fill="none" stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} />}
          <text x={cx + sign * (arcR + 14) * Math.sin(theta / 2)} y={hangY + (arcR + 14) * Math.cos(theta / 2) + 4}
            fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
            θ={thetaDeg.toFixed(1)}°
          </text>
        </g>
      )}

      {/* 距离标注线 */}
      <line x1={ball1X} y1={distY} x2={ball2X} y2={distY} stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} />
      <line x1={ball1X} y1={distY - 5} x2={ball1X} y2={distY + 5} stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} />
      <line x1={ball2X} y1={distY - 5} x2={ball2X} y2={distY + 5} stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} />
      <text x={cx} y={distY + 18} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.axis} textAnchor="middle">
        r = {(rPend * 100).toFixed(2)} cm
      </text>

      {/* 库仑力矢量 */}
      {showVectors && (
        <g>
          {/* 球1库仑力 */}
          <line x1={ball1X} y1={ball1Y} x2={ball1X + sign * forceScale} y2={ball1Y}
            stroke={PHYSICS_COLORS.forceNet} strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            markerEnd="url(#arrow-coulomb-pend)" />
          <text x={ball1X + sign * forceScale / 2} y={ball1Y - 10}
            fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.forceNet} textAnchor="middle" fontWeight="bold">F</text>

          {/* 球2库仑力 */}
          <line x1={ball2X} y1={ball2Y} x2={ball2X - sign * forceScale} y2={ball2Y}
            stroke={PHYSICS_COLORS.forceNet} strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            markerEnd="url(#arrow-coulomb-pend)" />
          <text x={ball2X - sign * forceScale / 2} y={ball2Y - 10}
            fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.forceNet} textAnchor="middle" fontWeight="bold">F</text>
        </g>
      )}

      {/* 受力分析（隔离法） */}
      {showForceAnalysis && showVectors && (
        <g>
          {/* 球1 受力分解 */}
          {/* 重力 G */}
          <line x1={ball1X} y1={ball1Y} x2={ball1X} y2={ball1Y + gravScale}
            stroke={PHYSICS_COLORS.gravity} strokeWidth={CANVAS_STYLE.stroke.vectorSub}
            markerEnd="url(#arrow-coulomb-grav)" />
          <text x={ball1X + 10} y={ball1Y + gravScale} fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.gravity} fontWeight="bold">mg</text>

          {/* 绳拉力 T */}
          <line x1={ball1X} y1={ball1Y} x2={cx + (ball1X - cx) * 0.6} y2={hangY + (ball1Y - hangY) * 0.6}
            stroke={PHYSICS_COLORS.tension} strokeWidth={CANVAS_STYLE.stroke.vectorSub}
            markerEnd="url(#arrow-coulomb-tension)" />
          <text x={(ball1X + cx) / 2 - 14} y={(ball1Y + hangY) / 2}
            fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.tension} fontWeight="bold">T</text>

          {/* 球2 受力分解 */}
          {/* 重力 G */}
          <line x1={ball2X} y1={ball2Y} x2={ball2X} y2={ball2Y + gravScale}
            stroke={PHYSICS_COLORS.gravity} strokeWidth={CANVAS_STYLE.stroke.vectorSub}
            markerEnd="url(#arrow-coulomb-grav)" />
          <text x={ball2X + 10} y={ball2Y + gravScale} fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.gravity} fontWeight="bold">mg</text>

          {/* 绳拉力 T */}
          <line x1={ball2X} y1={ball2Y} x2={cx + (ball2X - cx) * 0.6} y2={hangY + (ball2Y - hangY) * 0.6}
            stroke={PHYSICS_COLORS.tension} strokeWidth={CANVAS_STYLE.stroke.vectorSub}
            markerEnd="url(#arrow-coulomb-tension)" />
          <text x={(ball2X + cx) / 2 + 14} y={(ball2Y + hangY) / 2}
            fontSize={CANVAS_STYLE.font.label} fill={PHYSICS_COLORS.tension} fontWeight="bold">T</text>
        </g>
      )}

      {/* 小球 A */}
      <circle cx={ball1X} cy={ball1Y} r={ballR}
        fill={q1 >= 0 ? PHYSICS_COLORS.forceNet : PHYSICS_COLORS.electricField}
        stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
      <text x={ball1X} y={ball1Y + 5} fontSize="16" fill={colors.neutral[0]} textAnchor="middle" fontWeight="bold">
        {q1 >= 0 ? '+' : '−'}
      </text>
      <text x={ball1X} y={ball1Y - ballR - 6} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
        q₁={q1}μC
      </text>

      {/* 小球 B */}
      <circle cx={ball2X} cy={ball2Y} r={ballR}
        fill={q2 >= 0 ? PHYSICS_COLORS.forceNet : PHYSICS_COLORS.electricField}
        stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
      <text x={ball2X} y={ball2Y + 5} fontSize="16" fill={colors.neutral[0]} textAnchor="middle" fontWeight="bold">
        {q2 >= 0 ? '+' : '−'}
      </text>
      <text x={ball2X} y={ball2Y - ballR - 6} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
        q₂={q2}μC
      </text>

      {showFormulas && (
        <g transform="translate(20, 20)">
          <text fontSize={CANVAS_STYLE.font.title} fill={PHYSICS_COLORS.labelText} fontWeight="bold">双丝线悬挂平衡</text>
          <text x={0} y={24} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.axis}>F = k·q₁q₂/r²</text>
          <text x={0} y={44} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.axis}>tanθ = F/(mg)</text>
          <text x={0} y={68} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
            θ = {thetaDeg.toFixed(1)}°
          </text>
          <text x={0} y={88} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.forceNet}>
            F = {F.toExponential(2)} N
          </text>
        </g>
      )}

      <defs>
        <marker id="arrow-coulomb-pend" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
        </marker>
        <marker id="arrow-coulomb-grav" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.gravity} />
        </marker>
        <marker id="arrow-coulomb-tension" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.tension} />
        </marker>
        <linearGradient id="ceilingMetalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[0]} />
          <stop offset="30%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[1]} />
          <stop offset="70%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[2]} />
          <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[3]} />
        </linearGradient>
      </defs>
    </svg>
  )
}

/**
 * SVG 弧线路径描述（用于夹角标注）
 * @param cx 圆心 x
 * @param cy 圆心 y
 * @param r 半径
 * @param startAngle 起始角（度，0=右，90=下）
 * @param endAngle 终止角
 */
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
  const sweepFlag = endAngle > startAngle ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
