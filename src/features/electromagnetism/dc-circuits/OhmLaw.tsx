import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { calculateOhmLaw } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { LightBulb, DialMeter, DCSource } from '@/components/Physics'

/** ─── 电路设计坐标（700×325，与 CANVAS_PRESETS.splitV 对齐） ─── */
/** 以 DC Source 接线柱对齐导线为基准反推所有坐标；回路下移 20px 避免灯泡光晕与电压表重叠 */
const CIRCUIT = {
  /** 回路矩形 */
  rect: { x: 140, y: 100, w: 440, h: 160 },
  /** 顶部中点（元件位置） */
  top: { x: 360, y: 100 },
  /** 底部中点（DC Source 中心，接线柱在 y+22 = 回路底边） */
  bottom: { x: 360, y: 238 },
  /** 左侧分流节点 */
  nodeLeft: { x: 220, y: 100 },
  /** 右侧分流节点 */
  nodeRight: { x: 500, y: 100 },
  /** 电压表位置（半径28，中心y=30 → 顶部y=2刚好可见） */
  voltmeter: { x: 360, y: 30 },
  /** 电流表位置（串联在右侧导线上） */
  ammeter: { x: 580, y: 180 },
} as const

export default function OhmLaw() {
    const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const mode = params.mode ?? 0 // 0=定值电阻, 1=小灯泡
  const U = params.U ?? 2
  const R = params.R ?? 10
  const isBulb = mode === 1

  // 物理计算
  let I = 0
  let P = 0
  let R_eff = R

  if (!isBulb) {
    const res = calculateOhmLaw(U, R)
    I = res.I
    P = U * I
    R_eff = R
  } else {
    R_eff = 5 + 2 * U
    I = U / R_eff
    P = U * I
  }

  const { rect: r, nodeLeft, nodeRight, voltmeter, ammeter } = CIRCUIT

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <defs>
        {/* 表盘金属圈渐变 */}
        <linearGradient id="dial-ring" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={CANVAS_COLORS.trackHistory} />
          <stop offset="100%" stopColor={CANVAS_COLORS.labelTextLight} />
        </linearGradient>
      </defs>

      {/* ==================== 1. 导线与并联节点 ==================== */}
      {/* 闭合回路导线底色线 */}
      <rect
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        fill="none"
        stroke={PHYSICS_COLORS.grid}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 内部铜芯线 */}
      <rect
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        fill="none"
        stroke={PHYSICS_COLORS.trackHistory}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 电压表并联支路导线 */}
      <path
        d={`M ${nodeLeft.x} ${nodeLeft.y} L ${nodeLeft.x} ${voltmeter.y} L ${voltmeter.x} ${voltmeter.y}`}
        fill="none"
        stroke={PHYSICS_COLORS.trackHistory}
        strokeWidth={3}
      />
      <path
        d={`M ${nodeRight.x} ${nodeRight.y} L ${nodeRight.x} ${voltmeter.y} L ${voltmeter.x} ${voltmeter.y}`}
        fill="none"
        stroke={PHYSICS_COLORS.trackHistory}
        strokeWidth={3}
      />

      {/* 并联分流节点 */}
      <circle cx={nodeLeft.x} cy={nodeLeft.y} r={4.5} fill={PHYSICS_COLORS.labelText} />
      <circle cx={nodeRight.x} cy={nodeRight.y} r={4.5} fill={PHYSICS_COLORS.labelText} />

      {/* ==================== 2. 直流稳压电源 ==================== */}
      <DCSource type="instrument" x={CIRCUIT.bottom.x} y={CIRCUIT.bottom.y} voltage={U} polarity="right-positive" />

      {/* ==================== 4. 待测元件区域 ==================== */}
      {!isBulb ? (
        /* ----- A. 定值电阻元件 ----- */
        <g transform={`translate(${CIRCUIT.top.x}, ${CIRCUIT.top.y})`}>
          <rect
            x={-20}
            y={-10}
            width={40}
            height={20}
            fill={SCENE_COLORS.circuit.resistorFill}
            stroke={SCENE_COLORS.circuit.resistorStroke}
            strokeWidth={2}
          />
          <text x={0} y={4} fill={CANVAS_COLORS.labelText} fontSize={font(11)} fontWeight="bold" textAnchor="middle">
            R
          </text>
          <text x={0} y={24} fill={CANVAS_COLORS.labelTextLight} fontSize={font(11)} fontWeight="bold" textAnchor="middle">
            定值电阻 R
          </text>
        </g>
      ) : (
        /* ----- B. 小灯泡元件 ----- */
        <LightBulb x={CIRCUIT.top.x} y={CIRCUIT.top.y} power={P} time={time} />
      )}

      {/* ==================== 5. 理想表盘组件 ==================== */}
      <DialMeter type="V" value={U} max={10} x={voltmeter.x} y={voltmeter.y} />
      <DialMeter type="A" value={I} max={2} x={ammeter.x} y={ammeter.y} />
    </AnimationSvgCanvas>
  )
}
