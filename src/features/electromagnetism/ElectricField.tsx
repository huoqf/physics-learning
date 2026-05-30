import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateElectricField } from '@/physics'
import { PHYSICS_COLORS } from '@/theme/physicsColors'

/** 点电荷电场 E = kq/r²：场强随距离平方反比衰减，矢量场 + 试探点 */
export default function ElectricField() {
  const { params, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 500 })

  const { q = 5, rTest = 3 } = params // q: μC, rTest: 试探点距离 cm
  const k = 9e9
  const qSI = q * 1e-6
  const positive = q >= 0
  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2
  const pxPerCm = 26

  // 场强（试探点）
  const rTestSI = (rTest || 0.01) * 0.01
  const { E } = calculateElectricField(k, Math.abs(qSI), rTestSI)

  // 放射状电场线（8 方向），正电荷向外、负电荷向内
  const directions = Array.from({ length: 16 }, (_, i) => (i * Math.PI * 2) / 16)
  const lineInner = 26
  const lineOuter = 150

  const gridLines = []
  if (showGrid) {
    for (let i = 1; i <= 4; i++) {
      gridLines.push(
        <circle key={`ring-${i}`} cx={cx} cy={cy} r={i * 45}
          fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth={1} strokeDasharray="4,4" />
      )
    }
  }

  // 试探点位置（水平向右）
  const testX = cx + rTest * pxPerCm
  const testY = cy

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}

        {/* 电场线 */}
        {showVectors && directions.map((a, i) => {
          const x1 = cx + Math.cos(a) * lineInner
          const y1 = cy + Math.sin(a) * lineInner
          const x2 = cx + Math.cos(a) * lineOuter
          const y2 = cy + Math.sin(a) * lineOuter
          // 正电荷：箭头在外端朝外；负电荷：朝内（交换起止点）
          return (
            <line key={i}
              x1={positive ? x1 : x2} y1={positive ? y1 : y2}
              x2={positive ? x2 : x1} y2={positive ? y2 : y1}
              stroke={PHYSICS_COLORS.electricField} strokeWidth={1.5}
              markerEnd="url(#arrow-efield)" opacity={0.7} />
          )
        })}

        {/* 试探点电荷 + 该点场强方向 */}
        <circle cx={testX} cy={testY} r={6} fill={PHYSICS_COLORS.forceNet} />
        <text x={testX} y={testY - 12} fontSize="12" fill={PHYSICS_COLORS.forceNet} textAnchor="middle">P</text>

        {/* 源电荷 */}
        <circle cx={cx} cy={cy} r={24} fill={positive ? PHYSICS_COLORS.forceNet : PHYSICS_COLORS.electricField}
          stroke={PHYSICS_COLORS.objectStroke} strokeWidth={2} />
        <text x={cx} y={cy + 7} fontSize="22" fill="#fff" textAnchor="middle" fontWeight="bold">
          {positive ? '+' : '−'}
        </text>

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">点电荷电场强度</text>
            <text x={0} y={24} fontSize="12" fill={PHYSICS_COLORS.axis}>E = k·q/r²（N/C）</text>
            <text x={0} y={44} fontSize="12" fill={PHYSICS_COLORS.axis}>q = {q} μC，r = {rTest.toFixed(1)} cm</text>
            <text x={0} y={68} fontSize="13" fill={PHYSICS_COLORS.electricField} fontWeight="bold">
              P 点 E = {E.toExponential(2)} N/C
            </text>
            <text x={0} y={88} fontSize="12" fill={PHYSICS_COLORS.axis}>
              方向：{positive ? '由正电荷指向外（背离）' : '指向负电荷'}
            </text>
            <text x={0} y={108} fontSize="12" fill={PHYSICS_COLORS.axis}>距离加倍 → 场强变为 1/4（平方反比）</text>
          </g>
        )}

        <defs>
          <marker id="arrow-efield" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill={PHYSICS_COLORS.electricField} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
