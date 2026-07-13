import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { calculateClosedCircuit } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { DialMeter, Rheostat } from '@/components/Physics'
import { useClosedCircuitScene } from './hooks/useClosedCircuitScene'

const LAYOUT = {
  loop: { left: 180, top: 50, width: 440, height: 170 },
  battery: { x: 280, y: 180, width: 240, height: 70, posX: 295, posY: 220, internalX: 410 },
  meter: { max: 8, radius: 30 },
  rheostat: { x: 380, y: 50 },
} as const

const LOOP_RIGHT = LAYOUT.loop.left + LAYOUT.loop.width
const LOOP_BOTTOM = LAYOUT.loop.top + LAYOUT.loop.height

export default function ClosedCircuit() {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.splitV })
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
        {/* 内阻发热暗红色系渐变 */}
        <radialGradient id="heat-grad" cx="70%" cy="50%" r="50%">
          <stop offset="0%" stopColor={CANVAS_COLORS.dangerDark} stopOpacity="1" />
          <stop offset="70%" stopColor={CANVAS_COLORS.dangerGradient} stopOpacity="0.8" />
          <stop offset="100%" stopColor={CANVAS_COLORS.dangerGradient} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 垂直居中 */}
      <g>
        {/* ==================== 1. 主回路导线与并联引线 ==================== */}
        {/* 并联电压表导线 */}
        <path
          d="M 210 220 L 210 135 L 366 135"
          fill="none"
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <path
          d="M 590 220 L 590 135 L 434 135"
          fill="none"
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2.5}
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
        <circle cx={210} cy={LOOP_BOTTOM} r={4.5} fill={PHYSICS_COLORS.labelText} />
        <circle cx={590} cy={LOOP_BOTTOM} r={4.5} fill={PHYSICS_COLORS.labelText} />

        {/* ==================== 2. 微观电荷流动与能量泵送动画 ==================== */}
        {chargeParticles.map((pt, idx) => {
          // 判定电荷是否位于化学能电源内部的泵送区间 (x: 295 -> 350) 且在底部线 y: 220 上
          const isPumping = Math.abs(pt.y - 220) < 5 && pt.x >= 295 && pt.x <= 350
          const particleColor = isPumping ? '#22c55e' : PHYSICS_COLORS.electricCurrent

          return (
            <circle
              key={`charge-cc-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={3.8}
              fill={particleColor}
              style={{
                filter: `drop-shadow(0px 0px 3px ${particleColor})`,
                transition: 'fill 0.15s ease',
              }}
            />
          )
        })}

        {/* ==================== 3. 理想表头与测量 ==================== */}
        {/* 路端电压表 V */}
        <DialMeter type="V" value={U_terminal} max={LAYOUT.meter.max} x={400} y={135} r={LAYOUT.meter.radius} font={font} />

        {/* 干路电流表 A */}
        <DialMeter type="A" value={I} max={LAYOUT.meter.max} x={LOOP_RIGHT} y={135} r={LAYOUT.meter.radius} font={font} />

        {/* ==================== 4. 滑动变阻器元件 R ==================== */}
        <Rheostat x={LAYOUT.rheostat.x} y={LAYOUT.rheostat.y} value={R} min={0.1} max={20} showLabel={false} />

        {/* ==================== 5. 真实电源区域 (虚线框内) ==================== */}
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
          x={400}
          y={LAYOUT.battery.y - 6}
          fill={PHYSICS_COLORS.labelText}
          fontSize={font(11)}
          fontWeight="bold"
          textAnchor="middle"
        >
          真实电源 (电动势 E, 内阻 r)
        </text>

        {/* 热焦耳损耗发热遮罩 */}
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
          <line x1={-15} y1={0} x2={20} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
          <line x1={30} y1={0} x2={55} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />

          {/* 负极片 */}
          <line x1={20} y1={-10} x2={20} y2={10} stroke={CANVAS_COLORS.labelText} strokeWidth={4} />
          {/* 正极片 */}
          <line x1={30} y1={-18} x2={30} y2={18} stroke={SCENE_COLORS.circuit.batteryPos} strokeWidth={2.2} />

          {/* 非静电力做功泵送绿色向右箭头 */}
          {I > 0.05 && (
            <g transform="translate(18, -25)">
              <line x1={-8} y1={0} x2={12} y2={0} stroke="#22c55e" strokeWidth={2} />
              <path d="M 6 -3 L 12 0 L 6 3" fill="none" stroke="#22c55e" strokeWidth={1.5} />
              <text x={2} y={-4} fill="#22c55e" fontSize={font(9)} fontWeight="bold" textAnchor="middle">F非</text>
            </g>
          )}
        </g>

        {/* 内部过渡导线 */}
        <line x1={LAYOUT.battery.posX + 55} y1={LAYOUT.battery.posY} x2={LAYOUT.battery.internalX} y2={LAYOUT.battery.posY} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />

        {/* B. 内阻部分 r */}
        <g transform={`translate(${LAYOUT.battery.internalX}, ${LAYOUT.battery.posY})`}>
          <rect
            x={0}
            y={-9}
            width={36}
            height={18}
            fill={SCENE_COLORS.circuit.resistorFill}
            stroke={SCENE_COLORS.circuit.resistorStroke}
            strokeWidth={2}
          />
          <text x={18} y={4} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">
            r
          </text>
          
          <line x1={36} y1={0} x2={110} y2={0} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={3} />
        </g>
      </g>
    </AnimationSvgCanvas>
  )
}
