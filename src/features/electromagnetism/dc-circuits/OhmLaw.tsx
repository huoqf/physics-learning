import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { calculateOhmLaw, calculateMeterExpansion, calculateBulbResistance } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { LightBulb, DialMeter, DCSource, VectorArrow } from '@/components/Physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'

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
        // 规范布局（splitV 840×325）：
        //   主回路：左竖边 x=180, 上导线 y=110, 右竖边 x=680, 下导线 y=245
        //   待测元件 R 放上导线中偏左：中心(380, 110)，左端 355，右端 405
        //   电压表 V 并联跨接在待测元件两端：中心(380, 52)，节点在 330 和 430
        //   电流表 A 串联在上导线右段居中：中心(540, 110)，远离拐角 140px，消灭“拐角画表”
        //   直流电源：底导线中央 (430, 245)，标准原理图符号
        <g>
          {/* ── 1. 主回路导线：统一 2.5px 规范线宽 ── */}
          {/* 左竖边 */}
          <line x1={180} y1={110} x2={180} y2={245} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          {/* 上导线左段：左竖顶(180, 110) → 电压表左节点(330, 110) → 待测元件左端(355, 110) */}
          <line x1={180} y1={110} x2={355} y2={110} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          {/* 上导线中段：待测元件右端(405, 110) → 电压表右节点(430, 110) → 电流表左端子(516, 110) */}
          <line x1={405} y1={110} x2={516} y2={110} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          {/* 上导线右段：电流表右端子(564, 110) → 右竖顶(680, 110) */}
          <line x1={564} y1={110} x2={680} y2={110} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          {/* 右竖边 */}
          <line x1={680} y1={110} x2={680} y2={245} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          {/* 底导线左段：左竖底(180, 245) → 电源负极(410, 245) */}
          <line x1={180} y1={245} x2={410} y2={245} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          {/* 底导线右段：电源正极(450, 245) → 右竖底(680, 245) */}
          <line x1={450} y1={245} x2={680} y2={245} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />

          {/* ── 2. 电压表并联跨接引线（内收端正，节点规范） ── */}
          <path d="M 330 110 L 330 52 L 356 52" fill="none" stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
          <path d="M 404 52 L 430 52 L 430 110" fill="none" stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
          <circle cx={330} cy={110} r={3.5} fill={SCENE_COLORS.circuit.wire} />
          <circle cx={430} cy={110} r={3.5} fill={SCENE_COLORS.circuit.wire} />

          {/* ── 3. 电表：标准原理图符号 ── */}
          <DialMeter type="V" variant="symbolic" value={U} max={10} x={380} y={52} r={24} font={font} labelPosition="top" />
          <DialMeter type="A" variant="symbolic" value={I} max={2} x={540} y={110} r={24} font={font} labelPosition="top" />

          {/* ── 4. 标准直流电源 ── */}
          <DCSource type="symbol" orientation="horizontal" x={430} y={245} voltage={U} label={`电源 U = ${U.toFixed(1)}V`} polarity="right-positive" />

          {/* ── 5. 待测元件（中心 x=380, y=110） ── */}
          {meterMode === 0 ? (
            <g transform="translate(380, 110)">
              <rect x={-25} y={-11} width={50} height={22} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={2} />
              <text x={0} y={3} fill={CANVAS_COLORS.labelText} fontSize={font(10.5)} fontWeight="bold" textAnchor="middle">R</text>
              <text x={0} y={25} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9.5)} textAnchor="middle">待测电阻 ({R}Ω)</text>
            </g>
          ) : (
            <LightBulb x={380} y={110} power={P} time={time} />
          )}

          {/* ── 6. 电流方向矢量（避让导线，杜绝压线） ── */}
          {I > 0.01 && (
            <g>
              <VectorArrow
                originDesign={{ x: 540, y: 245 }}
                vector={{ x: 1, y: 0 }}
                type="currentDirection"
                arrowType="visual-only"
                sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={22}
                font={font}
              />
              <VectorArrow
                originDesign={{ x: 680, y: 180 }}
                vector={{ x: 0, y: -1 }}
                type="currentDirection"
                arrowType="visual-only"
                sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={22}
                font={font}
              />
              <VectorArrow
                originDesign={{ x: 480, y: 110 }}
                vector={{ x: -1, y: 0 }}
                type="currentDirection"
                arrowType="visual-only"
                sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={22}
                font={font}
              />
              <VectorArrow
                originDesign={{ x: 180, y: 180 }}
                vector={{ x: 0, y: 1 }}
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
        // 串联分压原理：U_m = Ig * (Rg + Rs)
        // 布局：左竖边 x=180, 右竖边 x=660, 顶导线 y=135, 底导线 y=255
        // 改装大虚线框：x: 260 ~ 580, y: 65 ~ 205
        <g>
          {/* ── 1. 外围供电主回路导线：统一 2.5px ── */}
          <line x1={180} y1={135} x2={180} y2={255} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={660} y1={135} x2={660} y2={255} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={180} y1={255} x2={400} y2={255} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={440} y1={255} x2={660} y2={255} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />

          {/* 顶导线两端引线 */}
          <line x1={180} y1={135} x2={260} y2={135} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={580} y1={135} x2={660} y2={135} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />

          {/* 电源组件：标准直流电源符号 */}
          <DCSource type="symbol" orientation="horizontal" x={420} y={255} voltage={U} label={`电源 U = ${U.toFixed(1)}V`} polarity="right-positive" />

          {/* ── 2. 改装电压表整体封装（高中物理标准虚线大框） ── */}
          <rect
            x={260}
            y={65}
            width={320}
            height={140}
            rx={6}
            fill={withAlpha(PHYSICS_COLORS.electricPotential, 0.04)}
            stroke={PHYSICS_COLORS.electricPotential}
            strokeWidth={1.8}
            strokeDasharray="6,4"
          />
          <text x={420} y={88} fill={PHYSICS_COLORS.electricPotential} fontSize={font(11.5)} fontWeight="bold" textAnchor="middle">
            改装电压表 V (量程 U_m = {(Ig * (Rg + Rs)).toFixed(1)} V)
          </text>

          {/* 改装电表接线柱标示 */}
          <circle cx={260} cy={135} r={3.5} fill={SCENE_COLORS.circuit.wire} />
          <text x={260} y={122} fill={PHYSICS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">-</text>
          <circle cx={580} cy={135} r={3.5} fill={SCENE_COLORS.circuit.wire} />
          <text x={580} y={122} fill={PHYSICS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">+</text>

          {/* ── 3. 内部串联元件与点对点导线 ── */}
          <line x1={260} y1={135} x2={326} y2={135} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={374} y1={135} x2={452} y2={135} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={508} y1={135} x2={580} y2={135} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />

          {/* 敏感表头 G */}
          <g transform="translate(350, 135)">
            <circle cx={0} cy={0} r={24} fill={CANVAS_COLORS.white} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
            <text x={0} y={6.5} fontSize={font(16)} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
              G
            </text>
            <text x={0} y={38} fontSize={font(9.5)} fill={CANVAS_COLORS.labelText} fontWeight="bold" textAnchor="middle">
              表头 Rg = {Rg}Ω
            </text>
            <text x={0} y={51} fontSize={font(9)} fill={PHYSICS_COLORS.electricCurrent} textAnchor="middle">
              Ig = {(Ig * 1000).toFixed(0)}mA (当前 {(I_g_meas * 1000).toFixed(2)}mA)
            </text>
          </g>

          {/* 串联分压电阻 Rs */}
          <g transform="translate(480, 135)">
            <rect x={-28} y={-12} width={56} height={24} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={2} rx={2} />
            <text x={0} y={3.5} fill={CANVAS_COLORS.labelText} fontSize={font(11)} fontWeight="bold" textAnchor="middle">Rs</text>
            <text x={0} y={36} fontSize={font(9.5)} fill={CANVAS_COLORS.labelText} fontWeight="bold" textAnchor="middle">
              分压电阻 Rs = {Rs}Ω
            </text>
            <text x={0} y={49} fontSize={font(9)} fill={PHYSICS_COLORS.electricPotential} textAnchor="middle">
              分压 Us = {(I_g_meas * Rs).toFixed(2)}V
            </text>
          </g>

          {/* ── 4. 高中物理规范电流方向矢量（避让导线） ── */}
          {I_g_meas > 0.00001 && (
            <g>
              <VectorArrow originDesign={{ x: 500, y: 255 }} vector={{ x: 1, y: 0 }} type="currentDirection" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE} pixelLength={22} font={font} />
              <VectorArrow originDesign={{ x: 660, y: 195 }} vector={{ x: 0, y: -1 }} type="currentDirection" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE} pixelLength={22} font={font} />
              <VectorArrow originDesign={{ x: 620, y: 135 }} vector={{ x: -1, y: 0 }} type="currentDirection" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE} pixelLength={22} font={font} />
              <text x={620} y={118} fill={PHYSICS_COLORS.electricCurrent} fontSize={font(9.5)} fontWeight="bold" textAnchor="middle">
                I = {(I_g_meas * 1000).toFixed(2)} mA
              </text>
              <VectorArrow originDesign={{ x: 180, y: 195 }} vector={{ x: 0, y: 1 }} type="currentDirection" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE} pixelLength={22} font={font} />
            </g>
          )}
        </g>
      ) : (
        // ==================== 模式2：改装为电流表 ====================
        // 并联分流原理：I_m = Ig + (Ig * Rg) / Rp
        // 纵向拉大：顶导线 y=120, 底导线 y=265 (纵向跨度 145px)
        // 改装大虚线框：x: 260 ~ 580, y: 48 ~ 212
        // 表头 G 位于 y=95，分流电阻 Rp 位于 y=165，底导线电源位于 y=265
        <g>
          {/* ── 1. 外围供电主回路导线：统一 2.5px ── */}
          <line x1={180} y1={120} x2={180} y2={265} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={660} y1={120} x2={660} y2={265} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={180} y1={265} x2={400} y2={265} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={440} y1={265} x2={660} y2={265} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />

          {/* 顶导线两端引线 */}
          <line x1={180} y1={120} x2={260} y2={120} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          <line x1={580} y1={120} x2={660} y2={120} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />

          {/* 电源组件：标准直流电源符号 */}
          <DCSource type="symbol" orientation="horizontal" x={420} y={265} voltage={U} label={`电源 U = ${U.toFixed(1)}V`} polarity="right-positive" />
          <text x={420} y={298} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9.5)} textAnchor="middle">
            干路总电流 I = {(I_g_meas * (1 + Rg / Rp)).toFixed(3)} A
          </text>

          {/* ── 2. 改装电流表整体封装（高中物理标准虚线大框） ── */}
          <rect
            x={260}
            y={42}
            width={320}
            height={170}
            rx={6}
            fill={withAlpha(PHYSICS_COLORS.electricCurrent, 0.04)}
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth={1.8}
            strokeDasharray="6,4"
          />
          <text x={420} y={60} fill={PHYSICS_COLORS.electricCurrent} fontSize={font(11.5)} fontWeight="bold" textAnchor="middle">
            改装电流表 A (量程 I_m = {((Ig * Rg) / Rp + Ig).toFixed(3)} A)
          </text>

          {/* 改装电表接线柱标示 */}
          <circle cx={260} cy={120} r={3.5} fill={SCENE_COLORS.circuit.wire} />
          <text x={260} y={108} fill={PHYSICS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">-</text>
          <circle cx={580} cy={120} r={3.5} fill={SCENE_COLORS.circuit.wire} />
          <text x={580} y={108} fill={PHYSICS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">+</text>

          {/* ── 3. 内部并联分流拓扑导线 ── */}
          {/* 左侧汇流总线：汇流节点(300, 120)连接负接线柱(260, 120) */}
          <line x1={260} y1={120} x2={300} y2={120} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />
          {/* 右侧分流总线：分流节点(540, 120)连接正接线柱(580, 120) */}
          <line x1={540} y1={120} x2={580} y2={120} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" />

          {/* 上支路（表头 G，高度 y=105）：
              分流节点(540, 120)向上折至(540, 105) → 表头右端子(442, 105)
              表头左端子(398, 105)向左至(300, 105) → 向下折至汇流节点(300, 120) */}
          <path d="M 540 120 L 540 105 L 442 105" fill="none" stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
          <path d="M 398 105 L 300 105 L 300 120" fill="none" stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />

          {/* 下支路（分流电阻 Rp，高度 y=160）：
              分流节点(540, 120)向下折至(540, 160) → 电阻右端子(448, 160)
              电阻左端子(392, 160)向左至(300, 160) → 向上折至汇流节点(300, 120) */}
          <path d="M 540 120 L 540 160 L 448 160" fill="none" stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
          <path d="M 392 160 L 300 160 L 300 120" fill="none" stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />

          {/* 分流/汇流关键节点小圆点 */}
          <circle cx={300} cy={120} r={3.5} fill={SCENE_COLORS.circuit.wire} />
          <circle cx={540} cy={120} r={3.5} fill={SCENE_COLORS.circuit.wire} />

          {/* 上支路：敏感表头 G */}
          <g transform="translate(420, 105)">
            <circle cx={0} cy={0} r={22} fill={CANVAS_COLORS.white} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} />
            <text x={0} y={6.5} fontSize={font(16)} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
              G
            </text>
            <text x={0} y={-27} fontSize={font(9)} fill={CANVAS_COLORS.labelText} fontWeight="bold" textAnchor="middle">
              表头 Rg = {Rg}Ω (Ig = {(I_g_meas * 1000).toFixed(2)} mA)
            </text>
          </g>

          {/* 下支路：并联分流电阻 Rp */}
          <g transform="translate(420, 160)">
            <rect x={-28} y={-11} width={56} height={22} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={2} rx={2} />
            <text x={0} y={3.5} fill={CANVAS_COLORS.labelText} fontSize={font(10.5)} fontWeight="bold" textAnchor="middle">Rp</text>
            <text x={0} y={23} fontSize={font(9)} fill={CANVAS_COLORS.labelText} fontWeight="bold" textAnchor="middle">
              分流电阻 Rp = {Rp}Ω
            </text>
            <text x={0} y={35} fontSize={font(9)} fill={PHYSICS_COLORS.electricCurrent} textAnchor="middle">
              Ip = {(I_g_meas * Rg / Rp).toFixed(3)} A
            </text>
          </g>

          {/* ── 4. 高中物理规范电流方向矢量 ── */}
          {I_g_meas > 0.00001 && (
            <g>
              <VectorArrow originDesign={{ x: 500, y: 265 }} vector={{ x: 1, y: 0 }} type="currentDirection" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE} pixelLength={22} font={font} />
              <VectorArrow originDesign={{ x: 660, y: 195 }} vector={{ x: 0, y: -1 }} type="currentDirection" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE} pixelLength={22} font={font} />
              <VectorArrow originDesign={{ x: 620, y: 120 }} vector={{ x: -1, y: 0 }} type="currentDirection" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE} pixelLength={22} font={font} />
              <text x={620} y={105} fill={PHYSICS_COLORS.electricCurrent} fontSize={font(9.5)} fontWeight="bold" textAnchor="middle">
                I总 = {(I_g_meas * (1 + Rg / Rp)).toFixed(3)} A
              </text>
              <VectorArrow originDesign={{ x: 485, y: 95 }} vector={{ x: -1, y: 0 }} type="currentDirection" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE} pixelLength={18} label="Ig" font={font} />
              <VectorArrow originDesign={{ x: 485, y: 160 }} vector={{ x: -1, y: 0 }} type="currentDirection" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE} pixelLength={18} label="Ip" font={font} />
              <VectorArrow originDesign={{ x: 220, y: 120 }} vector={{ x: -1, y: 0 }} type="currentDirection" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE} pixelLength={22} font={font} />
              <VectorArrow originDesign={{ x: 180, y: 195 }} vector={{ x: 0, y: 1 }} type="currentDirection" arrowType="visual-only" sceneScale={IDENTITY_SCENE_SCALE} pixelLength={22} font={font} />
            </g>
          )}
        </g>
      )}
    </AnimationSvgCanvas>
  )
}
