import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { calculateMotorCircuit } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, COMMON_MATERIALS } from '@/theme/physics'
import { DialMeter } from '@/components/Physics'
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

  const particleSpeed = res.I * 100
  const particleOffset = (time * particleSpeed) % 40

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
        <rect x={160} y={50} width={400} height={180} fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        <rect x={160} y={50} width={400} height={180} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />

        <g transform="translate(360, 230)">
          <line x1={-30} y1={0} x2={0} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <line x1={10} y1={0} x2={40} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <line x1={0} y1={-12} x2={0} y2={12} stroke={CANVAS_COLORS.labelText} strokeWidth={4} />
          <line x1={10} y1={-20} x2={10} y2={20} stroke={SCENE_COLORS.circuit.batteryPos} strokeWidth={2.5} />
          <text x={5} y={-25} fill={CANVAS_COLORS.labelText} fontSize={font(10)} textAnchor="middle">电源 U = {U.toFixed(1)}V</text>
        </g>

        <g transform="translate(240, 50)">
          <rect x={-20} y={-10} width={40} height={20} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={2} />
          <text x={0} y={3} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">R保</text>
          <text x={0} y={22} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9)} textAnchor="middle">{R_protect}Ω</text>
        </g>

        <DialMeter type="A" value={res.I} max={5} x={560} y={140} r={28} font={font} />

        <path d="M 400 50 L 400 130 L 420 130" fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth={2.5} />
        <path d="M 480 50 L 480 130 L 440 130" fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth={2.5} />
        <circle cx={400} cy={50} r={4} fill={PHYSICS_COLORS.labelText} />
        <circle cx={480} cy={50} r={4} fill={PHYSICS_COLORS.labelText} />
        <DialMeter type="V" value={res.U_M} max={15} x={440} y={130} r={28} font={font} />

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

        {res.I > 0.01 && (
          <g>
            {[0, 80, 160, 240, 320, 400, 480, 560, 640].map((baseOffset) => {
              const totalDist = 400 * 2 + 180 * 2
              const curPos = (baseOffset + particleOffset) % totalDist
              let px = 160, py = 50
              if (curPos < 400) {
                px = 160 + curPos
                py = 50
              } else if (curPos < 400 + 180) {
                px = 560
                py = 50 + (curPos - 400)
              } else if (curPos < 400 * 2 + 180) {
                px = 560 - (curPos - 400 - 180)
                py = 230
              } else {
                px = 160
                py = 230 - (curPos - 400 * 2 - 180)
              }
              if (Math.abs(px - 240) < 30 && py === 50) return null
              if (Math.abs(px - 440) < 30 && py === 50) return null
              if (Math.abs(px - 360) < 40 && py === 230) return null
              if (px === 560 && Math.abs(py - 140) < 35) return null

              return (
                <circle key={baseOffset} cx={px} cy={py} r={3} fill={PHYSICS_COLORS.velocityX} style={{ filter: `drop-shadow(0px 0px 1px ${PHYSICS_COLORS.velocityX})` }} />
              )
            })}
          </g>
        )}
      </g>
    </AnimationSvgCanvas>
  )
}
