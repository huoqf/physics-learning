import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { calculateOhmLaw, calculateMeterExpansion, calculateBulbResistance } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { LightBulb, DialMeter, DCSource, VectorArrow } from '@/components/Physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
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
        // 布局说明（splitV 840×325）：
        //   主回路：左竖边 x=180, 上导线 y=110, 右竖边 x=660, 下导线 y=250
        //   电源 (instrument) 中心 (420, 250)，正极 x+22=442, 负极 x-22=398，均在 y≈272
        //   → 下导线 y=250 处接电源顶面接线柱即可（instrument 高 80，中心 y=250，接线柱在 y=250+22=272）
        //   电流表 A 串联在上导线右段：导线从 R 右端节点(540,110) → 电流表左(630,110) → 断开 → 电流表右(690,110) → 右竖边 x=760
        //   待测元件 R 放上导线中段：中心(420,110)，左端 x=396, 右端 x=444（宽48）
        //   电压表 V 并联：从待测元件左端节点(396,110) 向上 → (396,48) → (444,48) → 待测元件右端节点(444,110)
        <g>
          {/* ── 主回路导线（分段，电流表断开处留空）── */}
          {/* 左竖边 */}
          <line x1={180} y1={110} x2={180} y2={250} stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" />
          <line x1={180} y1={110} x2={180} y2={250} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} strokeLinecap="round" />
          {/* 上导线左段：左竖顶(180,110) → 待测元件左端节点(396,110) */}
          <line x1={180} y1={110} x2={396} y2={110} stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" />
          <line x1={180} y1={110} x2={396} y2={110} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} strokeLinecap="round" />
          {/* 上导线中段：待测元件右端节点(444,110) → 电流表左端(600,110) */}
          <line x1={444} y1={110} x2={600} y2={110} stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" />
          <line x1={444} y1={110} x2={600} y2={110} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} strokeLinecap="round" />
          {/* 上导线右段：电流表右端(660,110) → 右竖顶(760,110) */}
          <line x1={660} y1={110} x2={760} y2={110} stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" />
          <line x1={660} y1={110} x2={760} y2={110} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} strokeLinecap="round" />
          {/* 右竖边 */}
          <line x1={760} y1={110} x2={760} y2={250} stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" />
          <line x1={760} y1={110} x2={760} y2={250} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} strokeLinecap="round" />
          {/* 下导线左段：左竖底(180,250) → 电源负极(398,250) */}
          <line x1={180} y1={250} x2={398} y2={250} stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" />
          <line x1={180} y1={250} x2={398} y2={250} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} strokeLinecap="round" />
          {/* 下导线右段：电源正极(442,250) → 右竖底(760,250) */}
          <line x1={442} y1={250} x2={760} y2={250} stroke={PHYSICS_COLORS.grid} strokeWidth={8} strokeLinecap="round" />
          <line x1={442} y1={250} x2={760} y2={250} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} strokeLinecap="round" />

          {/* ── 电压表并联引线：从待测元件两端节点引出 ── */}
          {/* 左端引线：(396,110) → (396,48) */}
          <line x1={396} y1={110} x2={396} y2={48} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={2.5} strokeLinecap="round" />
          {/* 顶部横线：(396,48) → (444,48) */}
          <line x1={396} y1={48} x2={444} y2={48} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={2.5} strokeLinecap="round" />
          {/* 右端引线：(444,48) → (444,110) */}
          <line x1={444} y1={48} x2={444} y2={110} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={2.5} strokeLinecap="round" />
          {/* 并联节点圆点 */}
          <circle cx={396} cy={110} r={4.5} fill={PHYSICS_COLORS.labelText} />
          <circle cx={444} cy={110} r={4.5} fill={PHYSICS_COLORS.labelText} />

          {/* ── 电表 ── */}
          {/* 电压表 V：上方引线中点 x=(396+444)/2=420, y=48 */}
          <DialMeter type="V" value={U} max={10} x={420} y={48} r={28} font={font} />
          {/* 电流表 A：串联在上导线右段，中心 (630, 110) */}
          <DialMeter type="A" value={I} max={2} x={630} y={110} r={28} font={font} />

          {/* ── 理想直流源（instrument 类型，正极右侧 polarity='right-positive'） ── */}
          <DCSource type="instrument" x={420} y={250} voltage={U} polarity="right-positive" />

          {/* ── 待测元件（上导线中央，中心 x=420, y=110） ── */}
          {meterMode === 0 ? (
            <g transform="translate(420, 110)">
              <rect x={-24} y={-12} width={48} height={24} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={2} />
              <text x={0} y={4} fill={CANVAS_COLORS.labelText} fontSize={font(11)} fontWeight="bold" textAnchor="middle">R</text>
              <text x={0} y={28} fill={CANVAS_COLORS.labelTextLight} fontSize={font(10)} textAnchor="middle">待测定值电阻</text>
            </g>
          ) : (
            <LightBulb x={420} y={110} power={P} time={time} />
          )}

          {/* ── 高中物理规范电流方向矢量指示（逆时针外电路：正极向右出，经外电路上导线向左流经表头与电阻，流回负极）── */}
          {I > 0.01 && (
            <g>
              {/* 下导线正极流出段（向右） */}
              <VectorArrow
                originDesign={{ x: 500, y: 250 }}
                vector={{ x: 1, y: 0 }}
                type="currentDirection"
                arrowType="visual-only"
                sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={22}
                font={font}
              />
              {/* 右竖边向上流动 */}
              <VectorArrow
                originDesign={{ x: 760, y: 200 }}
                vector={{ x: 0, y: 1 }}
                type="currentDirection"
                arrowType="visual-only"
                sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={22}
                font={font}
              />
              {/* 上导线中段（由右向左流经电流表和待测元件） */}
              <VectorArrow
                originDesign={{ x: 540, y: 110 }}
                vector={{ x: -1, y: 0 }}
                type="currentDirection"
                arrowType="visual-only"
                sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={26}
                label={`I = ${I.toFixed(2)}A`}
                font={font}
              />
              {/* 左竖边向下流回电源负极 */}
              <VectorArrow
                originDesign={{ x: 180, y: 160 }}
                vector={{ x: 0, y: -1 }}
                type="currentDirection"
                arrowType="visual-only"
                sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={22}
                font={font}
              />
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
          {/* P1修复：原文将电压值U误当电流量纲输出；此处计算实际总电流 I = U/(Rg*Rp/(Rg+Rp)) 近似，用已计算 I_g_meas 换算 */}
          <text x={420} y={292} fill={CANVAS_COLORS.labelTextLight} fontSize={font(10)} textAnchor="middle">
            调节电压改变干路总电流 I = {(I_g_meas * (1 + Rg / Rp)).toFixed(3)} A
          </text>

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
