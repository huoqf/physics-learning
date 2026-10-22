import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_COLORS, SCENE_COLORS } from '@/theme/physics'
import {
  computeRCTransient,
  rcTauFromParams,
  RC_WINDOW_TAUS,
  type RCPhase,
} from '@/physics/electromagnetism/rcTransient'

// 设计坐标系（对应 CANVAS_PRESETS.splitV 的 840×325）
const W = 840
const H = 325

const LOOP = { left: 110, right: 545, top: 72, bottom: 238 } as const
const BATTERY_Y = (LOOP.top + LOOP.bottom) / 2
const SWITCH_X = 150
const SWITCH_LEN = 46
const RES_X1 = 300
const RES_X2 = 405
const CAP_GAP = 16

/**
 * RC 充放电暂态电路场景（作为「平行板电容器」页的第二种模式，不是独立页面）。
 *
 * 中屏只负责"电路 + 当前状态"，衰减曲线交给上方图表面板：
 * 同一时刻、同一套 `computeRCTransient`，图与数不会分叉。
 */
export default function CapacitorTransientLab() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    })),
  )
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.splitV })
  const { font } = canvasSize

  const emf = params.emf ?? 6
  const R = (params.R_t ?? 10) * 1e3
  const C = (params.C_t ?? 200) * 1e-6
  const phase: RCPhase = (params.phase ?? 0) === 1 ? 'discharge' : 'charge'

  const tau = rcTauFromParams(params)
  const windowSec = RC_WINDOW_TAUS * tau
  const t = Math.min(Math.max(time, 0), windowSec)
  const state = computeRCTransient(emf, R, C, t, phase)

  const isCharge = phase === 'charge'
  const wire = PHYSICS_COLORS.labelText
  const capX = LOOP.right
  // 右支路是竖直导线，电容必须是「上下两块水平极板」——
  // 若画成左右两块竖板，导线会接在两板缝隙里，等于极板被短接，是错误图形。
  const capPlateY1 = BATTERY_Y - CAP_GAP / 2
  const capPlateY2 = BATTERY_Y + CAP_GAP / 2
  const capPlateHalf = 34

  /** 顶边导线上的电流方向箭头（充电朝右、放电朝左） */
  const currentArrow = (() => {
    const y = LOOP.top
    const mid = (RES_X2 + capX) / 2
    const len = Math.min(52, Math.abs(state.i) * 1e3 * 60 + 18)
    const dir = isCharge ? 1 : -1
    const x1 = mid - (dir * len) / 2
    const x2 = mid + (dir * len) / 2
    const head = 7
    return (
      <g>
        <line x1={x1} y1={y} x2={x2} y2={y} stroke={PHYSICS_COLORS.velocity} strokeWidth={3} strokeLinecap="round" />
        <polygon
          points={`${x2},${y} ${x2 - dir * head},${y - head * 0.6} ${x2 - dir * head},${y + head * 0.6}`}
          fill={PHYSICS_COLORS.velocity}
        />
      </g>
    )
  })()

  // 右侧数据卡在 840 宽画布上的定位（左边距与底部电路之间留白）
  const cardX = W - 220
  const barW = 150
  const barH = 9
  const barX = cardX + 12
  const barY = 250

  return (
    <div className="w-full h-full">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        {/* ── 主回路导线 ─────────────────────────────────────────── */}
        <g>
          {/* 顶边 */}
          <line x1={LOOP.left} y1={LOOP.top} x2={LOOP.right} y2={LOOP.top} stroke={wire} strokeWidth={2.5} />
          {/* 底边 */}
          <line x1={LOOP.left} y1={LOOP.bottom} x2={LOOP.right} y2={LOOP.bottom} stroke={wire} strokeWidth={2.5} />
          {/* 左边（电池所在，上下两段） */}
          <line x1={LOOP.left} y1={LOOP.top} x2={LOOP.left} y2={BATTERY_Y - 22} stroke={wire} strokeWidth={2.5} />
          <line x1={LOOP.left} y1={BATTERY_Y + 22} x2={LOOP.left} y2={LOOP.bottom} stroke={wire} strokeWidth={2.5} />
          {/* 右边（电容器所在） */}
          <line x1={capX} y1={LOOP.top} x2={capX} y2={capPlateY1} stroke={wire} strokeWidth={2.5} />
          <line x1={capX} y1={capPlateY2} x2={capX} y2={LOOP.bottom} stroke={wire} strokeWidth={2.5} />
        </g>

        {/* ── 电源 ──────────────────────────────────────────────── */}
        <g opacity={isCharge ? 1 : 0.35}>
          <line x1={LOOP.left - 22} y1={BATTERY_Y - 12} x2={LOOP.left + 22} y2={BATTERY_Y - 12} stroke={PHYSICS_COLORS.positiveCharge} strokeWidth={4} />
          <line x1={LOOP.left - 11} y1={BATTERY_Y + 2} x2={LOOP.left + 11} y2={BATTERY_Y + 2} stroke={PHYSICS_COLORS.negativeCharge} strokeWidth={2.5} />
          <line x1={LOOP.left} y1={BATTERY_Y - 22} x2={LOOP.left} y2={BATTERY_Y - 12} stroke={wire} strokeWidth={2.5} />
          <line x1={LOOP.left} y1={BATTERY_Y + 2} x2={LOOP.left} y2={BATTERY_Y + 22} stroke={wire} strokeWidth={2.5} />
          <text x={LOOP.left - 30} y={BATTERY_Y - 14} fontSize={font(12)} fill={PHYSICS_COLORS.positiveCharge} fontWeight="bold" textAnchor="end">
            +
          </text>
          <text x={LOOP.left - 30} y={BATTERY_Y + 8} fontSize={font(12)} fill={PHYSICS_COLORS.negativeCharge} fontWeight="bold" textAnchor="end">
            −
          </text>
          <text x={LOOP.left - 58} y={BATTERY_Y + 4} fontSize={font(12)} fill={PHYSICS_COLORS.labelText} textAnchor="end" fontWeight="600">
            E = {params.emf ?? 6} V
          </text>
        </g>

        {/* ── 开关（充电闭合 / 放电断开） ─────────────────────────── */}
        <g>
          <circle cx={SWITCH_X} cy={LOOP.top} r={3.5} fill={wire} />
          <circle cx={SWITCH_X + SWITCH_LEN} cy={LOOP.top} r={3.5} fill={wire} />
          <line
            x1={SWITCH_X}
            y1={LOOP.top}
            x2={isCharge ? SWITCH_X + SWITCH_LEN : SWITCH_X + SWITCH_LEN * 0.82}
            y2={isCharge ? LOOP.top : LOOP.top - 26}
            stroke={wire}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <text x={SWITCH_X + SWITCH_LEN / 2} y={LOOP.top - 34} fontSize={font(11)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
            {isCharge ? 'S 闭合' : 'S 断开'}
          </text>
        </g>

        {/* ── 电阻 ──────────────────────────────────────────────── */}
        <g>
          <path
            d={(() => {
              const n = 6
              const step = (RES_X2 - RES_X1) / n
              let d = `M ${RES_X1} ${LOOP.top}`
              for (let k = 0; k < n; k++) {
                const x = RES_X1 + step * (k + 0.5)
                const y = LOOP.top + (k % 2 === 0 ? -13 : 13)
                d += ` L ${x} ${y}`
              }
              d += ` L ${RES_X2} ${LOOP.top}`
              return d
            })()}
            fill="none"
            stroke={SCENE_COLORS.circuit.capacitorSt}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <text x={(RES_X1 + RES_X2) / 2} y={LOOP.top - 30} fontSize={font(12)} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="600">
            R = {params.R_t ?? 10} kΩ
          </text>
        </g>

        {currentArrow}
        <text x={(RES_X2 + capX) / 2} y={LOOP.top + 22} fontSize={font(11)} fill={PHYSICS_COLORS.velocity} textAnchor="middle" fontWeight="600">
          i = {(Math.abs(state.i) * 1e3).toFixed(3)} mA
        </text>

        {/* ── 电容器（上下两块水平极板，极板间为介质间隙） ────────── */}
        <g>
          <line x1={capX - capPlateHalf} y1={capPlateY1} x2={capX + capPlateHalf} y2={capPlateY1} stroke={PHYSICS_COLORS.positiveCharge} strokeWidth={4} strokeLinecap="round" />
          <line x1={capX - capPlateHalf} y1={capPlateY2} x2={capX + capPlateHalf} y2={capPlateY2} stroke={PHYSICS_COLORS.negativeCharge} strokeWidth={4} strokeLinecap="round" />
          <text x={capX + capPlateHalf} y={capPlateY1 - 7} fontSize={font(12)} fill={PHYSICS_COLORS.positiveCharge} textAnchor="start" fontWeight="bold">
            +
          </text>
          <text x={capX + capPlateHalf} y={capPlateY2 + 15} fontSize={font(12)} fill={PHYSICS_COLORS.negativeCharge} textAnchor="start" fontWeight="bold">
            −
          </text>
          {/* u_C / C 标注放在回路内侧（右侧留给数据卡，写在电容右边会被卡片压住） */}
          <text x={capX - capPlateHalf - 12} y={BATTERY_Y + 4} fontSize={font(12)} fill={PHYSICS_COLORS.electricPotential} textAnchor="end" fontWeight="700">
            u_C = {state.uC.toFixed(2)} V
          </text>
          <text x={capX - capPlateHalf - 12} y={BATTERY_Y + 20} fontSize={font(11)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">
            C = {params.C_t ?? 200} μF
          </text>
        </g>

        {/* ── 右侧数据卡 ────────────────────────────────────────── */}
        <g>
          <rect x={cardX} y={72} width={196} height={150} rx={8} fill={CANVAS_COLORS.objectFillNeutral} stroke={CANVAS_COLORS.grid} strokeWidth={1.2} />
          <text x={cardX + 12} y={92} fontSize={font(12)} fill={PHYSICS_COLORS.labelText} fontWeight="700">
            {isCharge ? '充电过程' : '放电过程'} · τ = RC = {tau.toFixed(2)} s
          </text>
          <text x={cardX + 12} y={112} fontSize={font(11)} fill={PHYSICS_COLORS.labelTextLight}>
            t = {t.toFixed(2)} s (t/τ = {(t / tau).toFixed(2)})
          </text>
          <text x={cardX + 12} y={131} fontSize={font(11)} fill={PHYSICS_COLORS.labelTextLight}>
            q = C·u_C = {(state.q * 1e6).toFixed(1)} μC
          </text>
          <text x={cardX + 12} y={150} fontSize={font(11)} fill={PHYSICS_COLORS.capacitor}>
            ∫i dt（面积）= {(state.areaCharge * 1e6).toFixed(1)} μC
          </text>
          <text x={cardX + 12} y={169} fontSize={font(11)} fill={PHYSICS_COLORS.labelTextLight}>
            E_C = ½Cu² = {(state.storedEnergy * 1e3).toFixed(2)} mJ
          </text>
          <text x={cardX + 12} y={188} fontSize={font(11)} fill={PHYSICS_COLORS.labelTextLight}>
            P_热 = i²R = {(state.heatPower * 1e3).toFixed(2)} mW
          </text>
          <text x={cardX + 12} y={211} fontSize={font(10.5)} fill={PHYSICS_COLORS.labelTextLight}>
            {isCharge ? 'u_C = E(1 − e^(−t/τ))' : 'u_C = E·e^(−t/τ)'}
          </text>
        </g>

        {/* 进度条：u_C / E */}
        <g>
          <text x={barX} y={barY - 8} fontSize={font(10.5)} fill={PHYSICS_COLORS.labelTextLight}>
            u_C / E = {(state.progress * 100).toFixed(1)}%
          </text>
          <rect x={barX} y={barY} width={barW} height={barH} rx={barH / 2} fill={CANVAS_COLORS.grid} opacity={0.5} />
          <rect
            x={barX}
            y={barY}
            width={Math.max(0, Math.min(1, state.progress)) * barW}
            height={barH}
            rx={barH / 2}
            fill={PHYSICS_COLORS.electricPotential}
          />
        </g>

        <text x={LOOP.left} y={H - 14} fontSize={font(11)} fill={PHYSICS_COLORS.labelTextLight}>
          {isCharge
            ? '开关闭合瞬间 i 最大、u_C = 0；随后 i 按 e^(−t/τ) 衰减，u_C 按 1−e^(−t/τ) 上升，t = 5τ 时基本充满。'
            : '开关断开后电容器通过 R 放电：u_C 与 i 同时按 e^(−t/τ) 衰减，电阻把 ½CU² 全部转为内能。'}
        </text>
      </AnimationSvgCanvas>
    </div>
  )
}
