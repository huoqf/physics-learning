import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { calculateClosedCircuit } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { DialMeter, Rheostat } from '@/components/Physics'
import { useClosedCircuitScene } from './hooks/useClosedCircuitScene'

// ─── 设计坐标系常量 ───────────────────────────────────────────────
const DESIGN_H = 400

/** 场景布局常量 */
const LAYOUT = {
  loop: { left: 150, top: 120, width: 400, height: 200 },
  battery: { x: 240, y: 280, width: 220, height: 80, posX: 255, posY: 320, internalX: 370 },
  meter: { max: 8, radius: 32 },
  rheostat: { x: 350, y: 120 },
} as const

const LOOP_RIGHT = LAYOUT.loop.left + LAYOUT.loop.width
const LOOP_BOTTOM = LAYOUT.loop.top + LAYOUT.loop.height
const LOOP_CX = LAYOUT.loop.left + LAYOUT.loop.width / 2
const LOOP_CY = LAYOUT.loop.top + LAYOUT.loop.height / 2

/**
 * 闭合电路欧姆定律核心电路动画
 * 元素：1. 真实电源（虚线框、电池、内阻）、2. 滑动变阻器（游标联动）、3. 电流表、4. 电压表（路端并联）
 */
export default function ClosedCircuit() {
    const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
  const { font } = canvasSize

  const EMF = params.EMF ?? 6
  const r = params.r ?? 2
  const R = params.R ?? 10
  const highlightLoss = (params.highlightLoss ?? 0) === 1

  const { I, U_terminal } = calculateClosedCircuit(EMF, r, R)

  const { chargeParticles, heatOpacity } = useClosedCircuitScene(I, time, highlightLoss)

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-white rounded-xl">
        <defs>
          {/* 电源外壳金属质感渐变 */}
          <linearGradient id="battery-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={CANVAS_COLORS.labelTextLight} />
            <stop offset="100%" stopColor={CANVAS_COLORS.labelText} />
          </linearGradient>

          {/* 内阻发热暗红色系渐变 */}
          <radialGradient id="heat-grad" cx="70%" cy="50%" r="50%">
            <stop offset="0%" stopColor={CANVAS_COLORS.dangerDark} stopOpacity="1" />
            <stop offset="70%" stopColor={CANVAS_COLORS.dangerGradient} stopOpacity="0.8" />
            <stop offset="100%" stopColor={CANVAS_COLORS.dangerGradient} stopOpacity="0" />
          </radialGradient>


        </defs>

        {/* 垂直居中：内容设计高度 400，画布 preset 高度 650 */}
        <g transform={`translate(0, ${(preset.height - DESIGN_H) / 2})`}>

        {/* ==================== 1. 主回路导线与并联引线 ==================== */}
        {/* 并联电压表导线 */}
        <path
          d="M 180 320 L 180 210 L 318 210"
          fill="none"
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path
          d="M 520 320 L 520 210 L 382 210"
          fill="none"
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* 主回路导线底槽 */}
        <rect
          x={LAYOUT.loop.left}
          y={LAYOUT.loop.top}
          width={LAYOUT.loop.width}
          height={LAYOUT.loop.height}
          fill="none"
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 主回路铜芯导线 */}
        <rect
          x={LAYOUT.loop.left}
          y={LAYOUT.loop.top}
          width={LAYOUT.loop.width}
          height={LAYOUT.loop.height}
          fill="none"
          stroke={PHYSICS_COLORS.trackHistory}
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 并联节点圆点 */}
        <circle cx={LAYOUT.loop.left + 30} cy={LOOP_BOTTOM} r={4.5} fill={PHYSICS_COLORS.labelText} />
        <circle cx={LOOP_RIGHT - 30} cy={LOOP_BOTTOM} r={4.5} fill={PHYSICS_COLORS.labelText} />

        {/* ==================== 2. 微观电荷流动动画 ==================== */}
        {/* 主回路上流动的带电粒子，流速与电流成正比，电压表并联支路无粒子流动 */}
        {chargeParticles.map((pt, idx) => (
          <circle
            key={`charge-cc-${idx}`}
            cx={pt.x}
            cy={pt.y}
            r={3.8}
            fill={PHYSICS_COLORS.electricCurrent}
            style={{
              filter: `drop-shadow(0px 0px 2px ${PHYSICS_COLORS.electricCurrent})`,
            }}
          />
        ))}

        {/* ==================== 3. 理想电压表与电流表 ==================== */}
        {/* 路端电压表 V (悬浮并联在电源两端) */}
        <DialMeter type="V" value={U_terminal} max={LAYOUT.meter.max} x={LOOP_CX} y={LOOP_CY - 10} r={LAYOUT.meter.radius} />

        {/* 干路电流表 A (串联在右侧干路) */}
        <DialMeter type="A" value={I} max={LAYOUT.meter.max} x={LOOP_RIGHT} y={LOOP_CY} r={LAYOUT.meter.radius} />

        {/* ==================== 4. 滑动变阻器元件 R ==================== */}
        <Rheostat x={LAYOUT.rheostat.x} y={LAYOUT.rheostat.y} value={R} min={0.1} max={20} showLabel={false} />

        {/* ==================== 5. 真实电源区域 (虚线框内) ==================== */}
        {/* 真实电源外部虚线外框 */}
        <rect
          x={LAYOUT.battery.x}
          y={LAYOUT.battery.y}
          width={LAYOUT.battery.width}
          height={LAYOUT.battery.height}
          fill="none"
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1.5}
          strokeDasharray="4,4"
          rx={6}
        />
        <text
          x={LOOP_CX}
          y={LAYOUT.battery.y - 7}
          fill={PHYSICS_COLORS.labelText}
          fontSize={font(11)}
          fontWeight="bold"
          textAnchor="middle"
        >
          真实电源 (电动势 E, 内阻 r)
        </text>

        {/* 热焦耳损耗视觉高亮遮罩层 (暗红色系渐变，随着电流 I 的平方发热量加深) */}
        <rect
          x={LAYOUT.battery.x + 1.5}
          y={LAYOUT.battery.y + 1.5}
          width={LAYOUT.battery.width - 3}
          height={LAYOUT.battery.height - 3}
          rx={5}
          fill="url(#heat-grad)"
          opacity={heatOpacity}
          style={{ transition: 'opacity 0.2s ease-out' }}
          pointerEvents="none"
        />

        {/* A. 理想电源部分 (化学能泵送) */}
        <g transform={`translate(${LAYOUT.battery.posX}, ${LAYOUT.battery.posY})`}>
          {/* 接线端连线 */}
          <line x1={-5} y1={0} x2={20} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <line x1={30} y1={0} x2={55} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />

          {/* 负极片 (短粗) */}
          <line x1={20} y1={-10} x2={20} y2={10} stroke={CANVAS_COLORS.labelText} strokeWidth={4} />
          {/* 正极片 (长细) */}
          <line x1={30} y1={-18} x2={30} y2={18} stroke={SCENE_COLORS.circuit.batteryPos} strokeWidth={2.2} />


        </g>

        {/* 内部过渡导线 */}
        <line x1={LAYOUT.battery.posX + 55} y1={LAYOUT.battery.posY} x2={LAYOUT.battery.internalX} y2={LAYOUT.battery.posY} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />

        {/* B. 内阻部分 r */}
        <g transform={`translate(${LAYOUT.battery.internalX}, ${LAYOUT.battery.posY})`}>
          {/* 电阻器符号 (高考标准矩形框) */}
          <rect
            x={0}
            y={-9}
            width={36}
            height={18}
            fill={SCENE_COLORS.circuit.resistorFill}
            stroke={SCENE_COLORS.circuit.resistorStroke}
            strokeWidth={2}
          />
          {/* 阻值字母标注 */}
          <text x={18} y={4} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">
            r
          </text>
          
          {/* 连接回主干路 */}
          <line x1={36} y1={0} x2={80} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />


        </g>
        </g>
    </AnimationSvgCanvas>
  )
}
