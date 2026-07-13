import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { calculateOhmLaw, calculateMeterExpansion, calculateBulbResistance } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { LightBulb, DialMeter, DCSource } from '@/components/Physics'
import { colors } from '@/theme/colors'

export default function OhmLaw() {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const mode = params.mode ?? 0 // 0=伏安特性, 1=改装电压表, 2=改装电流表
  const meterMode = params.meterMode ?? 0 // 0=定值电阻, 1=小灯泡
  const U = params.U ?? 2
  const R = params.R ?? 10
  const Rs = params.Rs ?? 1400
  const Rp = params.Rp ?? 0.5
  const Rg = params.Rg ?? 100
  const Ig = params.Ig ?? 0.001

  // 物理计算
  let I = 0
  let P = 0
  let I_g_meas = 0

  if (mode === 0) {
    if (meterMode === 0) {
      const res = calculateOhmLaw(U, R)
      I = res.I
      P = U * I
    } else {
      const bulb = calculateBulbResistance(U)
      I = bulb.I
      P = bulb.P
    }
  } else if (mode === 1) {
    const res = calculateMeterExpansion(1, U, Rg, Ig, Rs, Rp)
    I_g_meas = res.I_g_meas
  } else {
    const res = calculateMeterExpansion(2, U, Rg, Ig, Rs, Rp)
    I_g_meas = res.I_g_meas
  }

  // 粒子流动动画控制
  const particleSpeed = mode === 0 ? I * 10 : (mode === 1 ? I_g_meas * 10000 : U * 5)
  const particleOffset = (time * particleSpeed) % 40

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <defs>
        {/* 虚线框阴影 */}
        <filter id="box-shadow-ohm" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.06" />
        </filter>
      </defs>

      {mode === 0 ? (
        // ==================== 模式0：伏安特性探究 ====================
        <g>
          {/* 回路矩形 840x325 视口，回路置于 x: 180, y: 110, w: 480, h: 140 */}
          <rect x={180} y={110} width={480} height={140} fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          <rect x={180} y={110} width={480} height={140} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

          {/* 并联电压表导线 */}
          <path d="M 280 110 L 280 40 L 560 40 L 560 110" fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <circle cx={280} cy={110} r={4.5} fill={PHYSICS_COLORS.labelText} />
          <circle cx={560} cy={110} r={4.5} fill={PHYSICS_COLORS.labelText} />

          {/* 表盘 */}
          <DialMeter type="V" value={U} max={10} x={420} y={40} r={30} font={font} />
          <DialMeter type="A" value={I} max={2} x={660} y={180} r={30} font={font} />

          {/* 理想直流源 */}
          <DCSource type="instrument" x={420} y={250} voltage={U} polarity="right-positive" />

          {/* 待测元件 */}
          {meterMode === 0 ? (
            <g transform="translate(420, 110)">
              <rect x={-24} y={-12} width={48} height={24} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={2} />
              <text x={0} y={4} fill={CANVAS_COLORS.labelText} fontSize={font(11)} fontWeight="bold" textAnchor="middle">R</text>
              <text x={0} y={26} fill={CANVAS_COLORS.labelTextLight} fontSize={font(10)} textAnchor="middle">待测定值电阻</text>
            </g>
          ) : (
            <g transform="translate(0, 110)">
              <LightBulb x={420} y={0} power={P} time={time} />
              <text x={420} y={26} fill={CANVAS_COLORS.labelTextLight} fontSize={font(10)} textAnchor="middle">待测小灯泡</text>
            </g>
          )}

          {/* 电荷流动粒子 */}
          {I > 0.01 && (
            <g>
              {[0, 80, 160, 240, 320, 400, 480, 560, 640].map((baseOffset) => {
                const totalDist = 480 * 2 + 140 * 2 // 1240
                const curPos = (baseOffset + particleOffset) % totalDist
                let px = 180, py = 110
                if (curPos < 480) {
                  px = 180 + curPos
                  py = 110
                } else if (curPos < 480 + 140) {
                  px = 660
                  py = 110 + (curPos - 480)
                } else if (curPos < 480 * 2 + 140) {
                  px = 660 - (curPos - 480 - 140)
                  py = 250
                } else {
                  px = 180
                  py = 250 - (curPos - 480 * 2 - 140)
                }
                if (Math.abs(px - 420) < 40 && Math.abs(py - 110) < 15) return null
                if (Math.abs(px - 420) < 45 && Math.abs(py - 250) < 15) return null
                if (Math.abs(px - 660) < 20 && Math.abs(py - 180) < 35) return null

                return (
                  <circle key={baseOffset} cx={px} cy={py} r={3.5} fill={PHYSICS_COLORS.electricCurrent} />
                )
              })}
            </g>
          )}
        </g>
      ) : mode === 1 ? (
        // ==================== 模式1：改装为电压表 ====================
        <g>
          <rect x={180} y={150} width={480} height={100} fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          <rect x={180} y={150} width={480} height={100} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <DCSource type="instrument" x={420} y={250} voltage={U} polarity="right-positive" />

          {/* 改装电压表虚线外框 */}
          <rect x={280} y={80} width={280} height={130} rx={8} fill={withAlpha(colors.neutral[50], 0.4)} stroke={PHYSICS_COLORS.electricPotential} strokeWidth={1.5} strokeDasharray="4,4" filter="url(#box-shadow-ohm)" />
          <text x={420} y={98} fill={PHYSICS_COLORS.electricPotential} fontSize={font(11)} fontWeight="bold" textAnchor="middle">
            改装电压表 V (量程 U_m = {(Ig * (Rg + Rs)).toFixed(1)} V)
          </text>

          {/* 敏感表头 G */}
          <g>
            <DialMeter type="A" value={I_g_meas} max={Ig} x={350} y={145} r={28} font={font} />
            <circle cx={350} cy={145 + 18.5} r={8} fill={withAlpha(colors.neutral[100], 0.94)} />
            <text x={350} y={145 + 21.5} fontSize={font(10)} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold" textAnchor="middle">G</text>
            <text x={350} y={193} fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle">表头 Rg = {Rg}Ω</text>
          </g>

          {/* 串联分压电阻 Rs */}
          <g transform="translate(480, 145)">
            <rect x={-20} y={-10} width={40} height={20} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={2} />
            <text x={0} y={3} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">Rs</text>
            <text x={0} y={22} fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle">分压电阻 Rs = {Rs}Ω</text>
          </g>

          {/* 内部接线 */}
          <line x1={280} y1={150} x2={310} y2={150} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <line x1={390} y1={150} x2={460} y2={150} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <line x1={500} y1={150} x2={560} y2={150} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
        </g>
      ) : (
        // ==================== 模式2：改装为电流表 ====================
        <g>
          <rect x={180} y={150} width={480} height={100} fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          <rect x={180} y={150} width={480} height={100} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <DCSource type="instrument" x={420} y={250} voltage={U} polarity="right-positive" />
          <text x={420} y={292} fill={CANVAS_COLORS.labelTextLight} fontSize={font(10)} textAnchor="middle">调节电压改变干路总电流 I = {U.toFixed(2)} A</text>

          {/* 改装电流表虚线外框 */}
          <rect x={280} y={65} width={280} height={160} rx={8} fill={withAlpha(colors.neutral[50], 0.4)} stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={1.5} strokeDasharray="4,4" filter="url(#box-shadow-ohm)" />
          <text x={420} y={83} fill={PHYSICS_COLORS.electricCurrent} fontSize={font(11)} fontWeight="bold" textAnchor="middle">
            改装电流表 A (量程 I_m = {((Ig * Rg) / Rp + Ig).toFixed(3)} A)
          </text>

          {/* 敏感表头 G */}
          <g>
            <DialMeter type="A" value={I_g_meas} max={Ig} x={420} y={110} r={26} font={font} />
            <circle cx={420} cy={110 + 17.5} r={7.5} fill={withAlpha(colors.neutral[100], 0.94)} />
            <text x={420} y={110 + 20.5} fontSize={font(9)} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold" textAnchor="middle">G</text>
            <text x={420} y={150} fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle">表头 Rg = {Rg}Ω</text>
          </g>

          {/* 并联分流电阻 Rp */}
          <g transform="translate(420, 185)">
            <rect x={-20} y={-10} width={40} height={20} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={2} />
            <text x={0} y={3} fill={CANVAS_COLORS.labelText} fontSize={font(9)} fontWeight="bold" textAnchor="middle">Rp</text>
            <text x={0} y={22} fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle">分流电阻 Rp = {Rp}Ω</text>
          </g>

          <path d="M 280 150 L 320 150 L 320 110 L 380 110" fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <path d="M 320 150 L 320 185 L 400 185" fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <path d="M 560 150 L 520 150 L 520 110 L 460 110" fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <path d="M 520 150 L 520 185 L 440 185" fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />

          <circle cx={320} cy={150} r={4} fill={PHYSICS_COLORS.labelText} />
          <circle cx={520} cy={150} r={4} fill={PHYSICS_COLORS.labelText} />
        </g>
      )}
    </AnimationSvgCanvas>
  )
}
