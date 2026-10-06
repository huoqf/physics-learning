import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { calculateMotorCircuit } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { DialMeter, DCSource } from '@/components/Physics'
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
        {/* ── 1. 主回路导线：端子级精准对接，规整矩形回路 ── */}
        {/* 左竖边干路：左下拐角 (80, 245) -> 左上拐角 (80, 65) */}
        <line x1={80} y1={65} x2={80} y2={245} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />

        {/* 顶横边：左上拐角 -> 保护电阻左端 (135, 65) */}
        <line x1={80} y1={65} x2={135} y2={65} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
        {/* 保护电阻右端 (185, 65) -> 电流表左端子 (236, 65) */}
        <line x1={185} y1={65} x2={236} y2={65} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
        {/* 电流表右端子 (284, 65) -> 右上拐角 (370, 65) */}
        <line x1={284} y1={65} x2={370} y2={65} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />

        {/* 右竖边（电动机支路）：右上拐角 (370, 65) -> 上分流节点 (370, 100) -> 电机顶端子 (370, 126) */}
        <line x1={370} y1={65} x2={370} y2={100} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={370} y1={100} x2={370} y2={126} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
        {/* 电机底端子 (370, 174) -> 下汇流节点 (370, 200) -> 右下拐角 (370, 245) */}
        <line x1={370} y1={174} x2={370} y2={200} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={370} y1={200} x2={370} y2={245} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />

        {/* 底横边：左下拐角 -> 电源正极 (205, 245)；电源负极 (245, 245) -> 右下拐角 (370, 245) */}
        <line x1={80} y1={245} x2={205} y2={245} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={245} y1={245} x2={370} y2={245} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />

        {/* ── 2. 直流稳压电源（水平标准原理图符号：长细正极在左，短粗负极在右） ── */}
        <DCSource
          type="symbol"
          orientation="horizontal"
          x={225}
          y={245}
          voltage={U}
          label={`电源 U = ${U.toFixed(1)}V`}
          polarity="left-positive"
        />

        {/* ── 3. 保护电阻 R保 (中心 x=160, y=65) ── */}
        <g transform="translate(160, 65)">
          <rect x={-25} y={-11} width={50} height={22} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={2} />
          <text x={0} y={3} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">R保</text>
          <text x={0} y={25} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9.5)} textAnchor="middle">{R_protect}Ω</text>
        </g>

        {/* ── 4. 干路电流表 A（顶横边串联，中心 x=260, y=65, r=24） ── */}
        <DialMeter type="A" variant="symbolic" value={res.I} max={5} x={260} y={65} r={24} font={font} labelPosition="top" />

        {/* ── 5. 电动机端电压表并联测量分支（位于回路内侧，中心 x=290, y=150, r=24） ── */}
        {/* 上分支：节点 (370, 100) -> 左折到 (290, 100) -> 进电压表顶端 (290, 126) */}
        <path d="M 370 100 L 290 100 L 290 126" fill="none" stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
        {/* 下分支：电压表底端 (290, 174) -> 到 (290, 200) -> 右折到节点 (370, 200) */}
        <path d="M 290 174 L 290 200 L 370 200" fill="none" stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
        {/* 并联节点圆点 */}
        <circle cx={370} cy={100} r={3.5} fill={SCENE_COLORS.circuit.wire} />
        <circle cx={370} cy={200} r={3.5} fill={SCENE_COLORS.circuit.wire} />
        <DialMeter type="V" variant="symbolic" value={res.U_M} max={15} x={290} y={150} r={24} font={font} labelPosition="left" />

        {/* ── 6. 电动机电气符号 (右竖边中心 x=370, y=150) ── */}
        {motorState === 0 && (
          <circle cx={370} cy={150} r={36} fill="url(#motor-danger-glow)" className="animate-pulse" />
        )}

        <g transform="translate(370, 150)">
          <circle cx={0} cy={0} r={24} fill={CANVAS_COLORS.white} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
          <circle cx={0} cy={0} r={9} fill={colors.neutral[200]} stroke={colors.neutral[500]} strokeWidth={1.5} />
          {/* 电机转子动感指针 */}
          <line x1={0} y1={0} x2={9 * Math.cos((motorAngle * Math.PI) / 180)} y2={9 * Math.sin((motorAngle * Math.PI) / 180)} stroke={CANVAS_COLORS.alertRed} strokeWidth={2} />
          <text x={0} y={-29} fill={PHYSICS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">电动机 (rM=1Ω)</text>
          <text x={0} y={4.5} fill={colors.neutral[800]} fontSize={font(13)} fontWeight="extrabold" textAnchor="middle">M</text>
        </g>

        {/* 电机堵转报警框（位于电机正下方，安全避让） */}
        {motorState === 0 && (
          <g transform="translate(370, 188)">
            <rect x={-32} y={-7} width={64} height={15} rx={3} fill={CANVAS_COLORS.alertRed} />
            <text x={0} y={4} fill={CANVAS_COLORS.white} fontSize={font(8.5)} fontWeight="bold" textAnchor="middle" className="animate-pulse">电机堵转!</text>
          </g>
        )}

        {/* ── 7. 机械动力学输出系统（彻底独立于右侧空旷区，绝对零导线穿透） ── */}
        {/* 水平机械联轴传动轴：从电机右侧边缘 (394, 150) 水平平直延伸至卷扬滑轮 (560, 150) */}
        <line x1={394} y1={150} x2={560} y2={150} stroke={colors.neutral[500]} strokeWidth={2.5} strokeDasharray="5,3" />
        <text x={477} y={142} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9)} textAnchor="middle">传动轴</text>

        <g transform="translate(560, 150)">
          {/* 卷扬机构定滑轮 */}
          <circle cx={0} cy={0} r={15} fill={colors.neutral[300]} stroke={colors.neutral[700]} strokeWidth={2} />
          <circle cx={0} cy={0} r={4} fill={colors.neutral[800]} />
          {/* 滑轮支架示意 */}
          <path d="M 0 -15 L 0 -24 M -8 -24 L 8 -24" stroke={colors.neutral[600]} strokeWidth={2} />
          <text x={0} y={-28} fill={CANVAS_COLORS.labelText} fontSize={font(9.5)} fontWeight="bold" textAnchor="middle">卷扬机</text>

          {/* 垂直吊绳（沿滑轮右侧切线垂下） */}
          <line x1={15} y1={0} x2={15} y2={Math.max(20, weightY - 150)} stroke={colors.neutral[700]} strokeWidth={1.8} />

          {/* 悬挂重物砝码 */}
          <g transform={`translate(15, ${Math.max(20, weightY - 150)})`}>
            {/* 挂钩 */}
            <path d="M 0 0 L 0 5 A 3 3 0 0 0 0 11" fill="none" stroke={colors.neutral[700]} strokeWidth={1.5} />
            <rect x={-12} y={11} width={24} height={18} fill={colors.neutral[500]} rx={2} stroke={colors.neutral[800]} strokeWidth={1.5} />
            <text x={0} y={24} fill={CANVAS_COLORS.white} fontSize={font(9.5)} fontWeight="bold" textAnchor="middle">{mass.toFixed(1)}kg</text>
            <text x={22} y={23} fill={PHYSICS_COLORS.forceComponent} fontSize={font(8.5)} textAnchor="start">G=mg</text>
          </g>

          {/* 机械输出参数实时铭牌 */}
          {motorState === 1 && (() => {
            const P_in_motor = res.U_M * res.I
            const etaMotor = P_in_motor > 0 ? (res.P_mech / P_in_motor) * 100 : 0
            const etaTotal = (res.P_mech / (res.P_total || 1)) * 100
            return (
              <g transform="translate(60, -20)">
                <rect x={-5} y={-14} width={94} height={46} rx={4} fill={withAlpha(CANVAS_COLORS.white, 0.92)} stroke={colors.neutral[300]} strokeWidth={1} />
                <text x={0} y={0} fill={PHYSICS_COLORS.velocity} fontSize={font(9)} fontWeight="bold">v = {res.v_lift.toFixed(2)} m/s</text>
                <text x={0} y={14} fill={PHYSICS_COLORS.power} fontSize={font(9)} fontWeight="bold">P机 = {res.P_mech.toFixed(1)} W</text>
                <text x={0} y={26} fill={CANVAS_COLORS.labelTextLight} fontSize={font(7.8)}>η电机={etaMotor.toFixed(0)}% (总η={etaTotal.toFixed(0)}%)</text>
              </g>
            )
          })()}
        </g>
      </g>
    </AnimationSvgCanvas>
  )
}
