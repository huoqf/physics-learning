import { useEffect } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

/**
 * 带电粒子在匀强偏转电场中运动（类平抛 / 示波管模型）。
 * 水平：匀速 x = v₀t；竖直：匀加速 a = qE/m，y = ½at²。
 *
 * 物理建模（真实几何，统一比例尺，符合高中物理）：
 *   - 板长 L=0.4 m，板间距 D=0.2 m（粒子从左侧沿中线射入）
 *   - 终止条件二选一：射出电场（x 达 L）或 打在极板上（|y| 达 D/2）
 *   - vx、vy 同一速度比例尺，合速度方向即轨迹切线
 * 参数：E(电场强度,×10³ N/C) / q(电量,μC) / m(质量,mg) / v0(初速度,m/s)
 */

// 真实几何常量（SI）
const PLATE_LENGTH = 0.4 // m
const PLATE_GAP = 0.2 // m（上下板间距）
const HALF_GAP = PLATE_GAP / 2
// 慢放：真实过程约 20ms 级，放慢到便于观察
const TIME_SCALE = 0.02

export default function ChargeInEField() {
  const { params, time, showVectors, showFormulas, showGrid, setIsPlaying } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 450 })

  const { E = 10, q = 5, m = 200, v0 = 20 } = params
  // SI 换算：E ×10³N/C，q μC(1e-6)，m mg(1e-6 kg)
  const ESI = E * 1e3
  const qSI = q * 1e-6
  const mSI = m * 1e-6
  const a = mSI > 0 ? (qSI * ESI) / mSI : 0 // 竖直加速度 a = qE/m

  // 终止时刻：射出电场 vs 打在极板
  const tExit = v0 > 0 ? PLATE_LENGTH / v0 : 0
  const tHit = a > 0 ? Math.sqrt((2 * HALF_GAP) / a) : Infinity
  const tEnd = Math.min(tExit, tHit)
  const hitsPlate = tHit < tExit

  // 仿真时间（慢放）
  const tSim = Math.min(time * TIME_SCALE, tEnd)

  // 物理位移（SI）
  const xPhys = v0 * tSim
  const yPhys = 0.5 * a * tSim * tSim
  const vy = a * tSim
  const vTotal = Math.sqrt(v0 * v0 + vy * vy)

  // ---- 画布几何：统一比例尺 ----
  const padX = 90
  const padTop = 60
  const region = {
    left: padX,
    right: canvasSize.width - 200,
    top: padTop,
    bottom: canvasSize.height - padTop,
  }
  const plateLenPx = region.right - region.left
  const plateGapPx = region.bottom - region.top
  const midY = (region.top + region.bottom) / 2
  // 统一比例：x 与 y 用各自方向铺满板区，但比例相同（按 px/m 取较小者，保证不变形）
  const scaleX = plateLenPx / PLATE_LENGTH
  const scaleY = plateGapPx / PLATE_GAP
  const scale = Math.min(scaleX, scaleY) // 单一 px/m，几何不变形
  const velPxPerMs = 4 // 速度矢量显示比例（px per m/s）

  // 屏幕坐标（正电荷向下偏，设 E 向下）
  const cx = region.left + xPhys * scale
  const cy = midY + yPhys * scale

  // 终止自动暂停
  const ended = time * TIME_SCALE >= tEnd
  useEffect(() => {
    if (ended && time > 0) setIsPlaying(false)
  }, [ended, time, setIsPlaying])

  // 轨迹点
  const pts: string[] = []
  const steps = 60
  for (let i = 0; i <= steps; i++) {
    const t = (tSim * i) / steps
    pts.push(`${region.left + v0 * t * scale},${midY + 0.5 * a * t * t * scale}`)
  }

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 8; i++) {
      const gx = region.left + (i * plateLenPx) / 8
      gridLines.push(
        <line key={`g-${i}`} x1={gx} y1={region.top} x2={gx} y2={region.bottom}
          stroke={PHYSICS_COLORS.grid} strokeWidth={1} strokeDasharray="4,4" />
      )
    }
    // 中线
    gridLines.push(
      <line key="mid" x1={region.left} y1={midY} x2={region.right} y2={midY}
        stroke={PHYSICS_COLORS.grid} strokeWidth={1} strokeDasharray="2,4" />
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}

        {/* 上极板（+）与下极板（−），E 由上指向下 */}
        <line x1={region.left} y1={region.top} x2={region.right} y2={region.top} stroke={PHYSICS_COLORS.forceNet} strokeWidth={4} />
        <text x={region.left - 16} y={region.top + 5} fontSize="16" fill={PHYSICS_COLORS.forceNet}>＋</text>
        <line x1={region.left} y1={region.bottom} x2={region.right} y2={region.bottom} stroke={PHYSICS_COLORS.electricField} strokeWidth={4} />
        <text x={region.left - 16} y={region.bottom + 5} fontSize="16" fill={PHYSICS_COLORS.electricField}>－</text>

        {/* 板长 / 板间距标注 */}
        <text x={(region.left + region.right) / 2} y={region.top - 10} fontSize="11" fill={PHYSICS_COLORS.axis} textAnchor="middle">
          板长 L = {PLATE_LENGTH} m
        </text>
        <text x={region.right + 8} y={midY} fontSize="11" fill={PHYSICS_COLORS.axis}>d = {PLATE_GAP} m</text>

        {/* 匀强电场线（向下，均匀分布） */}
        {showVectors && Array.from({ length: 6 }, (_, i) => {
          const fx = region.left + 30 + (i * (plateLenPx - 50)) / 5
          return (
            <line key={`E-${i}`} x1={fx} y1={region.top + 6} x2={fx} y2={region.bottom - 6}
              stroke={PHYSICS_COLORS.electricField} strokeWidth={1} strokeDasharray="6,5"
              markerEnd="url(#arrow-ef-down)" opacity={0.4} />
          )
        })}

        {/* 入射点参考 */}
        <circle cx={region.left} cy={midY} r={3} fill={PHYSICS_COLORS.axis} />

        {/* 轨迹 */}
        {pts.length > 1 && (
          <polyline points={pts.join(' ')} fill="none" stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={CANVAS_STYLE.stroke.trackHistory} strokeDasharray="6,4" opacity={0.6} />
        )}

        {/* 粒子 */}
        <circle cx={cx} cy={cy} r={9} fill={PHYSICS_COLORS.forceNet} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={2} />
        <text x={cx} y={cy + 4} fontSize="12" fill="#fff" textAnchor="middle" fontWeight="bold">+</text>

        {/* 速度分量矢量（同一比例，合矢量为真实切线） */}
        {showVectors && tSim > 0 && (
          <g>
            {/* vx */}
            <line x1={cx} y1={cy} x2={cx + v0 * velPxPerMs} y2={cy}
              stroke={PHYSICS_COLORS.velocity} strokeWidth={CANVAS_STYLE.stroke.vectorSub} markerEnd="url(#arrow-ef-v)" />
            {/* vy */}
            <line x1={cx} y1={cy} x2={cx} y2={cy + vy * velPxPerMs}
              stroke={PHYSICS_COLORS.acceleration} strokeWidth={CANVAS_STYLE.stroke.vectorSub} markerEnd="url(#arrow-ef-vy)" />
            {/* 合速度（切线方向） */}
            <line x1={cx} y1={cy} x2={cx + v0 * velPxPerMs} y2={cy + vy * velPxPerMs}
              stroke={PHYSICS_COLORS.forceNet} strokeWidth={CANVAS_STYLE.stroke.vectorMain} markerEnd="url(#arrow-ef-vt)" opacity={0.85} />
          </g>
        )}

        {/* 终止提示 */}
        {ended && (
          <text x={cx} y={cy - 18} fontSize="12" fill={hitsPlate ? PHYSICS_COLORS.electricField : PHYSICS_COLORS.kineticEnergy} textAnchor="middle" fontWeight="bold">
            {hitsPlate ? '打在极板上' : '射出电场'}
          </text>
        )}

        {showFormulas && (
          <g transform={`translate(${region.right + 16}, ${region.top})`}>
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">类平抛运动</text>
            <text x={0} y={24} fontSize="12" fill={PHYSICS_COLORS.axis}>水平：x = v₀t（匀速）</text>
            <text x={0} y={44} fontSize="12" fill={PHYSICS_COLORS.axis}>竖直：a = qE/m，y = ½at²</text>
            <text x={0} y={68} fontSize="12" fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              a = {a.toFixed(0)} m/s²
            </text>
            <text x={0} y={88} fontSize="12" fill={PHYSICS_COLORS.velocity}>v₀ = {v0} m/s</text>
            <text x={0} y={106} fontSize="12" fill={PHYSICS_COLORS.acceleration}>vy = {vy.toFixed(2)} m/s</text>
            <text x={0} y={124} fontSize="12" fill={PHYSICS_COLORS.forceNet}>v = {vTotal.toFixed(2)} m/s</text>
            <text x={0} y={146} fontSize="12" fill={PHYSICS_COLORS.axis}>偏转 y = {(yPhys * 100).toFixed(2)} cm</text>
            <text x={0} y={164} fontSize="12" fill={PHYSICS_COLORS.axis}>θ = {(Math.atan2(vy, v0) * 180 / Math.PI).toFixed(1)}°</text>
          </g>
        )}

        <defs>
          <marker id="arrow-ef-down" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill={PHYSICS_COLORS.electricField} />
          </marker>
          <marker id="arrow-ef-v" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrow-ef-vy" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
          <marker id="arrow-ef-vt" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
