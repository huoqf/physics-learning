import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateCapacitor } from '@/physics'
import { PHYSICS_COLORS } from '@/theme/physicsColors'

/**
 * 平行板电容器 C = εS/d。
 * 参数：S(正对面积,cm²) / d(板间距,mm) / epsilon_r(相对介电常数) / U(电压,V)
 * 演示 d、S、介质对 C 的影响，及 Q=CU。
 */
export default function Capacitor() {
  const { params, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 450 })

  const { S = 100, d = 5, epsilon_r = 1, U = 12 } = params
  const eps0 = 8.85e-12
  const SSI = S * 1e-4
  const dSI = d * 1e-3
  const epsilon = eps0 * epsilon_r
  const { C } = calculateCapacitor(epsilon, SSI, dSI)
  const Q = C * U // 库仑

  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2
  // 板间距可视化（随 d 变化），板高随 √S 变化
  const gapPx = Math.max(20, Math.min(160, d * 18))
  const plateH = Math.max(80, Math.min(220, Math.sqrt(S) * 14))
  const plateW = 16
  const topY = cy - gapPx / 2
  const botY = cy + gapPx / 2
  const leftX = cx - 70
  const rightX = cx + 70 - plateW

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

  // 介质填充
  const hasDielectric = epsilon_r > 1

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}

        {/* 介质 */}
        {hasDielectric && (
          <rect x={leftX} y={topY} width={rightX + plateW - leftX} height={botY - topY}
            fill={PHYSICS_COLORS.electricField} opacity={0.12} />
        )}

        {/* 上极板（+Q） */}
        <rect x={leftX} y={topY - plateH / 2} width={rightX + plateW - leftX} height={plateW}
          fill={PHYSICS_COLORS.forceNet} rx={2} />
        <text x={cx} y={topY - plateH / 2 - 8} fontSize="14" fill={PHYSICS_COLORS.forceNet} textAnchor="middle">+Q</text>

        {/* 下极板（−Q） */}
        <rect x={leftX} y={botY + plateH / 2 - plateW} width={rightX + plateW - leftX} height={plateW}
          fill={PHYSICS_COLORS.electricField} rx={2} />
        <text x={cx} y={botY + plateH / 2 + 18} fontSize="14" fill={PHYSICS_COLORS.electricField} textAnchor="middle">−Q</text>

        {/* 板间电场线 */}
        {Array.from({ length: 5 }, (_, i) => {
          const fx = cx - 50 + i * 25
          return (
            <line key={`E-${i}`} x1={fx} y1={topY - plateH / 2 + plateW} x2={fx} y2={botY + plateH / 2 - plateW}
              stroke={PHYSICS_COLORS.electricField} strokeWidth={1} strokeDasharray="5,4"
              markerEnd="url(#arrow-cap-E)" opacity={0.5} />
          )
        })}

        {/* 间距标注 */}
        <line x1={rightX + plateW + 24} y1={topY - plateH / 2 + plateW} x2={rightX + plateW + 24} y2={botY + plateH / 2 - plateW}
          stroke={PHYSICS_COLORS.axis} strokeWidth={1} />
        <text x={rightX + plateW + 30} y={cy} fontSize="12" fill={PHYSICS_COLORS.axis}>d = {d} mm</text>

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">平行板电容器</text>
            <text x={0} y={24} fontSize="12" fill={PHYSICS_COLORS.axis}>C = ε·S/d，ε = εᵣ·ε₀</text>
            <text x={0} y={44} fontSize="12" fill={PHYSICS_COLORS.axis}>
              S = {S} cm²，d = {d} mm，εᵣ = {epsilon_r}
            </text>
            <text x={0} y={68} fontSize="13" fill={PHYSICS_COLORS.electricField} fontWeight="bold">
              C = {(C * 1e12).toFixed(2)} pF
            </text>
            <text x={0} y={88} fontSize="12" fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
              Q = CU = {(Q * 1e9).toFixed(2)} nC（U = {U} V）
            </text>
            <text x={0} y={112} fontSize="11" fill={PHYSICS_COLORS.axis}>d↑→C↓；S↑→C↑；插入电介质 εᵣ↑→C↑</text>
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
