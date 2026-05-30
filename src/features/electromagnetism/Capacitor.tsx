import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateCapacitor } from '@/physics'
import { PHYSICS_COLORS } from '@/theme/physicsColors'

/**
 * 平行板电容器 C = εS/d（ε = εᵣ·ε₀）。
 *
 * 高考核心：接电源（U 不变）vs 断开电源（Q 不变）两种情形。
 *   - 接电源：U 恒定 → 改 S/d/εᵣ 时 C 变、Q=CU 变、E=U/d 仅随 d 变
 *   - 断电源：Q 恒定 → 改 S/d/εᵣ 时 C 变、U=Q/C 变；E=Q/(εS) 与 d 无关
 *
 * 参数：S(正对面积,cm²) / d(板间距,mm) / epsilon_r(相对介电常数) / U(电源电压,V) / connected(1接源 0断开)
 */

const EPS0 = 8.85e-12
// 断开电源时保持的电荷量基准（取默认状态 S=100cm² d=5mm εᵣ=1 U=12V 充电后断开）
const Q_FIXED = EPS0 * (100 * 1e-4) / (5 * 1e-3) * 12

export default function Capacitor() {
  const { params, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 460 })

  const { S = 100, d = 5, epsilon_r = 1, U = 12, connected = 1 } = params
  const isConnected = connected >= 0.5
  const hasDielectric = epsilon_r > 1

  // ---- 物理计算（SI） ----
  const { C } = calculateCapacitor(EPS0 * epsilon_r, S * 1e-4, d * 1e-3)
  // 接电源：U 给定，Q=CU；断开：Q 固定，U=Q/C
  const voltage = isConnected ? U : Q_FIXED / C
  const charge = isConnected ? C * voltage : Q_FIXED
  const field = voltage / (d * 1e-3) // E = U/d (V/m)

  // ---- 画布几何（间距∝d，板宽∝S，互相独立） ----
  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2 + 10
  const gapPx = Math.max(24, Math.min(180, d * 16)) // 仅由 d 决定
  const plateW = Math.max(80, Math.min(280, S * 1.4)) // 仅由 S 决定（正对面积）
  const plateThick = 12
  const topPlateY = cy - gapPx / 2
  const botPlateY = cy + gapPx / 2
  const plateLeft = cx - plateW / 2

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 8; i++) {
      const gx = (i * canvasSize.width) / 8
      gridLines.push(
        <line key={`g-${i}`} x1={gx} y1={30} x2={gx} y2={canvasSize.height - 30}
          stroke={PHYSICS_COLORS.grid} strokeWidth={1} strokeDasharray="4,4" />
      )
    }
  }

  // 电场线数量随板宽
  const fieldCount = Math.max(3, Math.min(9, Math.round(plateW / 36)))

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}

        {/* 电介质填充板间 */}
        {hasDielectric && (
          <rect x={plateLeft} y={topPlateY + plateThick} width={plateW} height={gapPx - plateThick}
            fill={PHYSICS_COLORS.electricField} opacity={0.12} />
        )}

        {/* 板间匀强电场线（向下，+→−） */}
        {showVectors && Array.from({ length: fieldCount }, (_, i) => {
          const fx = plateLeft + (plateW * (i + 0.5)) / fieldCount
          return (
            <line key={`E-${i}`} x1={fx} y1={topPlateY + plateThick} x2={fx} y2={botPlateY}
              stroke={PHYSICS_COLORS.electricField} strokeWidth={1} strokeDasharray="5,4"
              markerEnd="url(#arrow-cap-E)" opacity={0.5} />
          )
        })}

        {/* 上极板 +Q */}
        <rect x={plateLeft} y={topPlateY} width={plateW} height={plateThick} fill={PHYSICS_COLORS.forceNet} rx={2} />
        <text x={cx} y={topPlateY - 8} fontSize="13" fill={PHYSICS_COLORS.forceNet} textAnchor="middle">
          +Q
        </text>
        {/* 下极板 −Q */}
        <rect x={plateLeft} y={botPlateY} width={plateW} height={plateThick} fill={PHYSICS_COLORS.electricField} rx={2} />
        <text x={cx} y={botPlateY + plateThick + 16} fontSize="13" fill={PHYSICS_COLORS.electricField} textAnchor="middle">
          −Q
        </text>

        {/* 板间距标注 */}
        <line x1={plateLeft + plateW + 20} y1={topPlateY + plateThick} x2={plateLeft + plateW + 20} y2={botPlateY}
          stroke={PHYSICS_COLORS.axis} strokeWidth={1} markerStart="url(#tick-cap)" markerEnd="url(#tick-cap)" />
        <text x={plateLeft + plateW + 26} y={cy + 4} fontSize="12" fill={PHYSICS_COLORS.axis}>d = {d} mm</text>

        {/* 电源 / 断开开关 示意 */}
        <g>
          {/* 左侧连线 */}
          <line x1={plateLeft} y1={topPlateY + plateThick / 2} x2={plateLeft - 50} y2={topPlateY + plateThick / 2} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />
          <line x1={plateLeft} y1={botPlateY + plateThick / 2} x2={plateLeft - 50} y2={botPlateY + plateThick / 2} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />
          <line x1={plateLeft - 50} y1={topPlateY + plateThick / 2} x2={plateLeft - 50} y2={isConnected ? cy - 18 : cy - 26} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />
          <line x1={plateLeft - 50} y1={botPlateY + plateThick / 2} x2={plateLeft - 50} y2={cy + 18} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />
          {isConnected ? (
            <>
              {/* 电池符号 */}
              <line x1={plateLeft - 62} y1={cy - 18} x2={plateLeft - 38} y2={cy - 18} stroke={PHYSICS_COLORS.forceNet} strokeWidth={4} />
              <line x1={plateLeft - 56} y1={cy - 6} x2={plateLeft - 44} y2={cy - 6} stroke={PHYSICS_COLORS.forceNet} strokeWidth={2} />
              <line x1={plateLeft - 62} y1={cy + 6} x2={plateLeft - 38} y2={cy + 6} stroke={PHYSICS_COLORS.forceNet} strokeWidth={4} />
              <line x1={plateLeft - 56} y1={cy + 18} x2={plateLeft - 44} y2={cy + 18} stroke={PHYSICS_COLORS.forceNet} strokeWidth={2} />
              <text x={plateLeft - 90} y={cy + 4} fontSize="11" fill={PHYSICS_COLORS.forceNet}>接电源</text>
            </>
          ) : (
            <>
              {/* 断开缺口 */}
              <line x1={plateLeft - 50} y1={cy - 26} x2={plateLeft - 36} y2={cy - 14} stroke={PHYSICS_COLORS.axis} strokeWidth={2} />
              <circle cx={plateLeft - 50} cy={cy - 26} r={2.5} fill={PHYSICS_COLORS.axis} />
              <circle cx={plateLeft - 50} cy={cy + 18} r={2.5} fill={PHYSICS_COLORS.axis} />
              <text x={plateLeft - 96} y={cy + 4} fontSize="11" fill={PHYSICS_COLORS.axis}>已断开</text>
            </>
          )}
        </g>

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">平行板电容器</text>
            <text x={0} y={22} fontSize="12" fill={PHYSICS_COLORS.axis}>C = ε·S/d，ε = εᵣ·ε₀</text>
            <text x={0} y={42} fontSize="12" fill={PHYSICS_COLORS.axis}>
              S = {S} cm²，d = {d} mm，εᵣ = {epsilon_r}
            </text>
            <text x={0} y={64} fontSize="13" fill={PHYSICS_COLORS.electricField} fontWeight="bold">
              C = {(C * 1e12).toFixed(2)} pF
            </text>
            <text x={0} y={84} fontSize="12" fill={isConnected ? PHYSICS_COLORS.forceNet : PHYSICS_COLORS.axis}>
              U = {voltage.toFixed(2)} V {isConnected ? '（电源恒定）' : '= Q/C'}
            </text>
            <text x={0} y={102} fontSize="12" fill={!isConnected ? PHYSICS_COLORS.forceNet : PHYSICS_COLORS.axis}>
              Q = {(charge * 1e9).toFixed(3)} nC {isConnected ? '= CU' : '（电荷守恒）'}
            </text>
            <text x={0} y={120} fontSize="12" fill={PHYSICS_COLORS.electricField}>
              E = U/d = {field.toFixed(0)} V/m
            </text>
            <text x={0} y={142} fontSize="11" fill={PHYSICS_COLORS.axis}>
              {isConnected
                ? 'U 不变：改 C 则 Q 变；E=U/d 仅随 d 变'
                : 'Q 不变：改 C 则 U 变；E=Q/(εS) 与 d 无关'}
            </text>
          </g>
        )}

        <defs>
          <marker id="arrow-cap-E" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill={PHYSICS_COLORS.electricField} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
