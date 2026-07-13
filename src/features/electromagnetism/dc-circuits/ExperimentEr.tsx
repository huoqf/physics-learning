import { useEffect } from 'react'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { calculateExperimentEr } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { DialMeter, Rheostat } from '@/components/Physics'
import { colors } from '@/theme/colors'

export default function ExperimentEr() {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const trajectory = useAnimationStore((s) => s.physicsState.trajectory)
  const setPhysicsState = useAnimationStore((s) => s.setPhysicsState)

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const wiring = params.wiring ?? 0 // 0=电路甲:外接法, 1=电路乙:内接法
  const R_slider = params.R_slider ?? 10
  const E_real = 6.0
  const r_real = 2.0
  const RV = 1000.0
  const RA = 0.5

  const res = calculateExperimentEr(E_real, r_real, R_slider, wiring, RV, RA)

  // 当切换接线方式时，自动清除打点记录
  useEffect(() => {
    setPhysicsState((prev) => ({ ...prev, trajectory: [] }))
  }, [wiring, setPhysicsState])

  const handleRecord = () => {
    const isDup = trajectory.some((p) => Math.abs(p.x - res.I_meas) < 0.001)
    if (isDup) return
    setPhysicsState((prev) => ({
      ...prev,
      trajectory: [...prev.trajectory, { x: res.I_meas, y: res.U_meas }].sort((a, b) => a.x - b.x)
    }))
  }

  const handleClear = () => {
    setPhysicsState((prev) => ({ ...prev, trajectory: [] }))
  }

  const particleSpeed = res.I_meas * 120
  const particleOffset = (time * particleSpeed) % 40

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-white rounded-xl">
      <defs>
        <filter id="btn-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.1" />
        </filter>
      </defs>

      <g>
        <rect x={180} y={50} width={460} height={170} fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        <rect x={180} y={50} width={460} height={170} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />

        <rect x={200} y={180} width={180} height={60} fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth={1.5} strokeDasharray="4,3" rx={4} />
        <text x={290} y={172} fill={PHYSICS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">待测电源 (E, r)</text>
        
        <g transform="translate(210, 220)">
          <line x1={0} y1={0} x2={25} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <line x1={25} y1={-10} x2={25} y2={10} stroke={CANVAS_COLORS.labelText} strokeWidth={4} />
          <line x1={33} y1={-18} x2={33} y2={18} stroke={SCENE_COLORS.circuit.batteryPos} strokeWidth={2.5} />
          <line x1={33} y1={0} x2={60} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <rect x={60} y={-8} width={30} height={16} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={1.5} />
          <text x={75} y={4} fill={CANVAS_COLORS.labelText} fontSize={font(9)} fontWeight="bold" textAnchor="middle">r</text>
          <line x1={90} y1={0} x2={170} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
        </g>

        <Rheostat x={380} y={50} value={R_slider} min={0.1} max={50} showLabel={false} />

        <DialMeter type="A" value={res.I_meas} max={3} x={640} y={135} r={30} font={font} />

        {wiring === 0 ? (
          <g>
            <path d="M 200 220 L 200 135 L 360 135" fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth={2.5} />
            <path d="M 640 168 L 640 220 L 440 220 L 440 135" fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth={2.5} />
            <circle cx={200} cy={220} r={4} fill={PHYSICS_COLORS.labelText} />
            <circle cx={640} cy={220} r={4} fill={PHYSICS_COLORS.labelText} />
            <DialMeter type="V" value={res.U_meas} max={6} x={400} y={135} r={30} font={font} />
          </g>
        ) : (
          <g>
            <path d="M 310 50 L 310 135 L 360 135" fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth={2.5} />
            <path d="M 510 50 L 510 135 L 440 135" fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth={2.5} />
            <circle cx={310} cy={50} r={4} fill={PHYSICS_COLORS.labelText} />
            <circle cx={510} cy={50} r={4} fill={PHYSICS_COLORS.labelText} />
            <DialMeter type="V" value={res.U_meas} max={6} x={400} y={135} r={30} font={font} />
          </g>
        )}

        {res.I_meas > 0.01 && (
          <g>
            {[0, 80, 160, 240, 320, 400, 480, 560, 640].map((baseOffset) => {
              const totalDist = 460 * 2 + 170 * 2
              const curPos = (baseOffset + particleOffset) % totalDist
              let px = 180, py = 50
              if (curPos < 460) {
                px = 180 + curPos
                py = 50
              } else if (curPos < 460 + 170) {
                px = 640
                py = 50 + (curPos - 460)
              } else if (curPos < 460 * 2 + 170) {
                px = 640 - (curPos - 460 - 170)
                py = 220
              } else {
                px = 180
                py = 220 - (curPos - 460 * 2 - 170)
              }
              if (Math.abs(px - 380) < 60 && py === 50) return null
              if (Math.abs(px - 290) < 60 && py === 220) return null
              if (px === 640 && Math.abs(py - 135) < 35) return null

              return (
                <circle key={baseOffset} cx={px} cy={py} r={3} fill="#ffb703" style={{ filter: 'drop-shadow(0px 0px 1px #ffb703)' }} />
              )
            })}
          </g>
        )}

        <g transform="translate(690, 45)" filter="url(#btn-glow)">
          <g className="cursor-pointer" onClick={handleRecord}>
            <rect x={0} y={0} width={130} height={32} rx={6} fill="#22c55e" />
            <text x={65} y={20} fill="#fff" fontSize={font(11)} fontWeight="bold" textAnchor="middle">记录当前点 (I, U)</text>
          </g>
          <g className="cursor-pointer" onClick={handleClear} transform="translate(0, 42)">
            <rect x={0} y={0} width={130} height={32} rx={6} fill="#ef4444" />
            <text x={65} y={20} fill="#fff" fontSize={font(11)} fontWeight="bold" textAnchor="middle">清除实验记录</text>
          </g>
          <g transform="translate(0, 85)">
            <rect x={0} y={0} width={130} height={40} rx={6} fill={colors.neutral[100]} stroke={colors.neutral[300]} strokeWidth={1} />
            <text x={10} y={16} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9)}>当前已记数据点：</text>
            <text x={115} y={30} fill="#22c55e" fontSize={font(16)} fontWeight="bold" textAnchor="end">{trajectory.length}</text>
          </g>
        </g>
      </g>
    </AnimationSvgCanvas>
  )
}
