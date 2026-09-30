import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { calculateMotorCircuit } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, COMMON_MATERIALS } from '@/theme/physics'
import { DialMeter, DCSource, VectorArrow } from '@/components/Physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import { colors } from '@/theme/colors'

export default function NonPureCircuit() {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const motorState = params.motorState ?? 1
  const U = params.U ?? 10
  const mass = params.mass ?? 0.5
  const R_protect = 2.0
  const r_M = 1.0
  const E_back = 5.0

  const res = calculateMotorCircuit(U, R_protect, r_M, motorState, E_back, mass)

  const rotationSpeed = motorState === 1 ? 180 : 0
  const motorAngle = (time * rotationSpeed) % 360

  const liftDistance = motorState === 1 ? (time * res.v_lift * 60) % 90 : 0
  const weightY = 220 - liftDistance

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-white rounded-xl">
      <defs>
        <radialGradient id="motor-danger-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={CANVAS_COLORS.alertRed} stopOpacity="0.8" />
          <stop offset="60%" stopColor={CANVAS_COLORS.alertRed} stopOpacity="0.3" />
          <stop offset="100%" stopColor={CANVAS_COLORS.alertRed} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g>
        {/* ── 1. 主回路导线：左竖、顶横、右竖及底横（电源处留空） ── */}
        {/* 底槽粗线 */}
        <line x1={160} y1={50} x2={160} y2={230} stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" />
        <line x1={160} y1={50} x2={560} y2={50} stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" />
        <line x1={560} y1={50} x2={560} y2={230} stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" />
        <line x1={160} y1={230} x2={340} y2={230} stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" />
        <line x1={380} y1={230} x2={560} y2={230} stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" />

        {/* 铜芯导线主体 */}
        <line x1={160} y1={50} x2={160} y2={230} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3.2} strokeLinecap="round" />
        <line x1={160} y1={50} x2={560} y2={50} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3.2} strokeLinecap="round" />
        <line x1={560} y1={50} x2={560} y2={230} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3.2} strokeLinecap="round" />
        <line x1={160} y1={230} x2={340} y2={230} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3.2} strokeLinecap="round" />
        <line x1={380} y1={230} x2={560} y2={230} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3.2} strokeLinecap="round" />

        {/* ── 2. 直流稳压电源（水平标准原理图符号：长细为正、短粗为负，正极在左，顺时针供电） ── */}
        <DCSource
          type="symbol"
          orientation="horizontal"
          x={360}
          y={230}
          voltage={U}
          label={`电源 U = ${U.toFixed(1)}V`}
          polarity="left-positive"
        />

        {/* ── 3. 保护电阻 R保 ── */}
        <g transform="translate(240, 50)">
          <rect x={-20} y={-10} width={40} height={20} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={2} />
          <text x={0} y={3} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">R保</text>
          <text x={0} y={22} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9)} textAnchor="middle">{R_protect}Ω</text>
        </g>

        {/* ── 4. 电表与并联测量分支 ── */}
        {/* 干路电流表 A（右竖边串联） */}
        <DialMeter type="A" value={res.I} max={5} x={560} y={140} r={28} font={font} />

        {/* 电动机两端并联电压表引线与节点 */}
        <path d="M 400 50 L 400 130 L 420 130" fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth={2.5} />
        <path d="M 480 50 L 480 130 L 440 130" fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth={2.5} />
        <circle cx={400} cy={50} r={4} fill={PHYSICS_COLORS.labelText} />
        <circle cx={480} cy={50} r={4} fill={PHYSICS_COLORS.labelText} />
        <DialMeter type="V" value={res.U_M} max={15} x={440} y={130} r={28} font={font} />

        {/* ── 5. 电动机及重物提升机构 ── */}
        {motorState === 0 && (
          <circle cx={440} cy={50} r={40} fill="url(#motor-danger-glow)" className="animate-pulse" />
        )}

        <g transform="translate(440, 50)">
          <circle cx={0} cy={0} r={22} fill={colors.neutral[200]} stroke={colors.neutral[600]} strokeWidth={2.2} />
          <circle cx={0} cy={0} r={10} fill={colors.neutral[400]} />
          <line x1={0} y1={0} x2={10 * Math.cos((motorAngle * Math.PI) / 180)} y2={10 * Math.sin((motorAngle * Math.PI) / 180)} stroke={CANVAS_COLORS.alertRed} strokeWidth={2} />
          <text x={0} y={-26} fill={PHYSICS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">电动机 (rM=1Ω)</text>
          <text x={0} y={4} fill={colors.neutral[800]} fontSize={font(12)} fontWeight="extrabold" textAnchor="middle">M</text>

          <line x1={10} y1={0} x2={10} y2={weightY - 50} stroke={PHYSICS_COLORS.forceComponent} strokeWidth={1.5} />

          <g transform={`translate(10, ${weightY - 50})`}>
            <path d="M 0 0 L 0 6 A 4 4 0 0 0 0 14" fill="none" stroke={COMMON_MATERIALS.structStrokePale} strokeWidth={1.5} />
            <rect x={-10} y={14} width={20} height={16} fill={colors.neutral[500]} rx={2} stroke={colors.neutral[700]} strokeWidth={1.5} />
            <text x={0} y={26} fill={CANVAS_COLORS.white} fontSize={font(9)} fontWeight="bold" textAnchor="middle">{mass.toFixed(1)}kg</text>
          </g>
        </g>

        {motorState === 0 && (
          <g transform="translate(440, 110)">
            <rect x={-35} y={-8} width={70} height={16} rx={3} fill={CANVAS_COLORS.alertRed} />
            <text x={0} y={4} fill={CANVAS_COLORS.white} fontSize={font(8.5)} fontWeight="bold" textAnchor="middle" className="animate-pulse">电机堵转!</text>
          </g>
        )}

        {/* ── 6. 高中物理标准电流方向箭头指示（复用 VectorArrow，顺时针外电路） ── */}
        {res.I > 0.01 && (
          <g>
            {/* 顶横导线电流箭头（向右） */}
            <VectorArrow
              originDesign={{ x: 320, y: 50 }}
              vector={{ x: 1, y: 0 }}
              type="currentDirection"
              arrowType="visual-only"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={26}
              label={`I = ${res.I.toFixed(2)}A`}
              font={font}
            />
            {/* 左竖导线电流箭头（向上） */}
            <VectorArrow
              originDesign={{ x: 160, y: 155 }}
              vector={{ x: 0, y: 1 }}
              type="currentDirection"
              arrowType="visual-only"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={20}
              font={font}
            />
            {/* 右竖导线电流箭头（向下） */}
            <VectorArrow
              originDesign={{ x: 560, y: 195 }}
              vector={{ x: 0, y: -1 }}
              type="currentDirection"
              arrowType="visual-only"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={20}
              font={font}
            />
          </g>
        )}
      </g>
    </AnimationSvgCanvas>
  )
}
