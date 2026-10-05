import type { CSSProperties } from 'react'
import { DialMeter, Rheostat } from '@/components/Physics'
import { CANVAS_STYLE, FONT, PHYSICS_COLORS } from '@/theme/physics'
import type { CoilPaths3D, TransformerDerived, TransformerLayout, TransformerParams } from '../model/transformerModel'

type TransformerResult = {
  U2: number
  I2: number
  I1: number
  P_input: number
  P_output: number
  isShortCircuit: boolean
}

function TransformerDefs({ sourceX, cy, scale }: { sourceX: number; cy: number; scale: number }) {
  return (
    <defs>
      <style>{`
        @keyframes tf-flux-flow {
          from { stroke-dashoffset: 0 }
          to { stroke-dashoffset: var(--flux-offset, -24) }
        }
        @keyframes tf-wave-move {
          from { transform: translateX(0); }
          to { transform: translateX(var(--wave-offset, 22px)); }
        }
      `}</style>
      <clipPath id="source-clip">
        <circle cx={sourceX} cy={cy} r={12.5 * scale} />
      </clipPath>
    </defs>
  )
}

function TransformerCore({ layout }: { layout: TransformerLayout }) {
  return (
    <>
      <rect
        x={layout.coreLeft}
        y={layout.coreTop}
        width={layout.coreRight - layout.coreLeft}
        height={layout.coreH}
        fill={PHYSICS_COLORS.objectFillNeutral}
        stroke={PHYSICS_COLORS.objectStroke}
        strokeWidth={CANVAS_STYLE.stroke.objectLine}
        rx={4}
        ry={4}
      />
      <rect
        x={layout.innerLeft}
        y={layout.innerTop}
        width={layout.innerRight - layout.innerLeft}
        height={layout.innerBottom - layout.innerTop}
        fill="white"
        stroke={PHYSICS_COLORS.objectStroke}
        strokeWidth={CANVAS_STYLE.stroke.objectLine}
        rx={2}
        ry={2}
      />
      {Array.from({ length: 4 }).map((_, i) => (
        <g key={`core-lam-g-${i}`}>
          <line
            x1={layout.coreLeft + (i + 1) * (layout.coreColumnW / 5)}
            y1={layout.coreTop + 2}
            x2={layout.coreLeft + (i + 1) * (layout.coreColumnW / 5)}
            y2={layout.coreBottom - 2}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={0.8}
            opacity={0.45}
          />
          <line
            x1={layout.innerRight + (i + 1) * (layout.coreColumnW / 5)}
            y1={layout.coreTop + 2}
            x2={layout.innerRight + (i + 1) * (layout.coreColumnW / 5)}
            y2={layout.coreBottom - 2}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={0.8}
            opacity={0.45}
          />
        </g>
      ))}
    </>
  )
}

function FluxRings({ layout, derived }: { layout: TransformerLayout; derived: TransformerDerived }) {
  const offsets = [-4, 0, 4]
  return (
    <>
      <rect
        x={layout.v1X}
        y={layout.coreTop + layout.coreColumnW / 2}
        width={layout.v2X - layout.v1X}
        height={layout.coreBottom - layout.coreTop - layout.coreColumnW}
        fill="none"
        stroke={PHYSICS_COLORS.magneticField}
        strokeWidth={layout.coreColumnW - 4}
        opacity={0.06}
        rx={6}
      />
      {offsets.map((offset, i) => {
        const rx = layout.v1X + offset
        const ry = layout.coreTop + layout.coreColumnW / 2 + offset
        const rw = layout.v2X - layout.v1X - 2 * offset
        const rh = layout.coreBottom - layout.coreTop - layout.coreColumnW - 2 * offset
        const path = `M ${rx} ${ry} L ${rx + rw} ${ry} L ${rx + rw} ${ry + rh} L ${rx} ${ry + rh} Z`
        return (
          <path
            key={`flux-ring-${i}`}
            d={path}
            fill="none"
            stroke={PHYSICS_COLORS.magneticField}
            strokeWidth={1.0 + (3 - i) * 0.3}
            strokeDasharray={`${4} ${14}`}
            strokeLinecap="round"
            style={{
              animation: 'tf-flux-flow linear infinite',
              animationDuration: `${derived.fluxFlowDur}s`,
              animationDelay: `${i * -0.25}s`,
              ['--flux-offset' as string]: '-24',
              opacity: 0.85 - i * 0.15,
            } as CSSProperties}
          />
        )
      })}
    </>
  )
}

function CoilFront({
  coil,
  color,
  glowRadius,
  glowOpacity,
  label,
  labelX,
  labelY,
  font,
}: {
  coil: CoilPaths3D
  color: string
  glowRadius: number
  glowOpacity: number
  label: string
  labelX: number
  labelY: number
  font: (v: number) => number
}) {
  return (
    <g>
      <path
        d={coil.frontD}
        fill="none"
        stroke={color}
        strokeWidth={CANVAS_STYLE.stroke.objectLine + 3}
        strokeLinecap="round"
        opacity={glowOpacity * 0.3}
        style={{ filter: `blur(${glowRadius}px)` }}
      />
      <path d={coil.frontD} fill="none" stroke={color} strokeWidth={CANVAS_STYLE.stroke.objectLine} strokeLinecap="round" />
      <text x={labelX} y={labelY} fontSize={font(FONT.axisSize)} fill={color} textAnchor="middle" fontWeight="bold">
        {label}
      </text>
    </g>
  )
}

function CircuitsAndMeters({
  params,
  result,
  derived,
  layout,
  font,
}: {
  params: TransformerParams
  result: TransformerResult
  derived: TransformerDerived
  layout: TransformerLayout
  font: (v: number) => number
}) {
  const s = layout.scale
  const wireColor1 = PHYSICS_COLORS.electricCurrent
  const wireColor2 = PHYSICS_COLORS.magnetSouth

  // 变阻器端子坐标精确计算
  const rhScale = layout.rheostatW / 140
  const termInX = layout.rheostatX - 73 * rhScale
  const termInY = layout.cy - 20 * rhScale
  const termOutX = layout.rheostatX + 73 * rhScale
  const termOutY = layout.cy + 10 * rhScale

  return (
    <>
      {/* ────────────────── 1. 原线圈输入回路（横平竖直、端子级精准对接） ────────────────── */}
      <g>
        {/* 上干路：电源上端 -> V1 并联节点 -> A1 电流表 -> 原线圈上端 */}
        <path
          d={`M ${layout.sourceX} ${layout.cy - 14 * s} V ${layout.wireYTop} H ${layout.meterA1X - layout.meterR}`}
          fill="none"
          stroke={wireColor1}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />
        <path
          d={`M ${layout.meterA1X + layout.meterR} ${layout.wireYTop} H ${layout.primaryLeft}`}
          fill="none"
          stroke={wireColor1}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />

        {/* 下干路：电源下端 -> V1 节点 -> 原线圈下端 */}
        <path
          d={`M ${layout.sourceX} ${layout.cy + 14 * s} V ${layout.wireYBot} H ${layout.primaryLeft}`}
          fill="none"
          stroke={wireColor1}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />

        {/* 电压表 V1 垂直并联支路与接点 */}
        <line
          x1={layout.meterV1X}
          y1={layout.wireYTop}
          x2={layout.meterV1X}
          y2={layout.cy - layout.meterR}
          stroke={wireColor1}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />
        <line
          x1={layout.meterV1X}
          y1={layout.cy + layout.meterR}
          x2={layout.meterV1X}
          y2={layout.wireYBot}
          stroke={wireColor1}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />
        <circle cx={layout.meterV1X} cy={layout.wireYTop} r={2.8} fill={wireColor1} />
        <circle cx={layout.meterV1X} cy={layout.wireYBot} r={2.8} fill={wireColor1} />

        {/* 交流电源符号与正弦波 */}
        <circle
          cx={layout.sourceX}
          cy={layout.cy}
          r={14 * s}
          fill={PHYSICS_COLORS.objectFill}
          stroke={wireColor1}
          strokeWidth={CANVAS_STYLE.stroke.objectThin}
        />
        <g clipPath="url(#source-clip)">
          <path
            d={derived.wavePath}
            fill="none"
            stroke={wireColor1}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            style={{
              animation: 'tf-wave-move 1.2s linear infinite',
              ['--wave-offset' as string]: `${22 * s}px`,
            } as CSSProperties}
          />
        </g>
        <text x={layout.sourceX} y={layout.cy + 28 * s} fontSize={font(FONT.smallSize)} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
          ~ {params.U1} V
        </text>

        {/* 高中物理标准电流矢量指示：清晰箭头 + 表头读数 */}
        {derived.displayI1 > 0.01 && (
          <g>
            {/* 上母线电流箭头指向原线圈 */}
            <polygon
              points={`${(layout.meterA1X + layout.meterR + layout.primaryLeft) / 2 + 4},${layout.wireYTop} ${(layout.meterA1X + layout.meterR + layout.primaryLeft) / 2 - 4},${layout.wireYTop - 3.5} ${(layout.meterA1X + layout.meterR + layout.primaryLeft) / 2 - 4},${layout.wireYTop + 3.5}`}
              fill={wireColor1}
            />
            {/* 电流表读数安置在 A1 表盘正下方，空旷无遮挡 */}
            <text
              x={layout.meterA1X}
              y={layout.wireYTop + layout.meterR + 14 * s}
              fontSize={font(10)}
              fill={wireColor1}
              fontWeight="bold"
              textAnchor="middle"
            >
              I₁ = {derived.displayI1.toFixed(2)} A
            </text>
            {/* 下母线回流箭头指向电源 */}
            <polygon
              points={`${(layout.primaryLeft + layout.meterV1X) / 2 - 4},${layout.wireYBot} ${(layout.primaryLeft + layout.meterV1X) / 2 + 4},${layout.wireYBot - 3.5} ${(layout.primaryLeft + layout.meterV1X) / 2 + 4},${layout.wireYBot + 3.5}`}
              fill={wireColor1}
            />
          </g>
        )}
      </g>

      {/* ────────────────── 2. 副线圈输出回路（横平竖直、端子级精准对接） ────────────────── */}
      <g>
        {/* 上干路：副线圈上端 -> V2 并联节点 -> A2 电流表 -> 变阻器左上端子 */}
        <path
          d={`M ${layout.secondaryRight} ${layout.wireYTop} H ${layout.meterA2X - layout.meterR}`}
          fill="none"
          stroke={wireColor2}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />
        <path
          d={`M ${layout.meterA2X + layout.meterR} ${layout.wireYTop} H ${termInX} V ${termInY}`}
          fill="none"
          stroke={wireColor2}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />

        {/* 下干路：变阻器右下端子 -> 拐弯至下母线 -> 穿过 V2 节点 -> 副线圈下端 */}
        <path
          d={`M ${termOutX} ${termOutY} V ${layout.wireYBot} H ${layout.secondaryRight}`}
          fill="none"
          stroke={wireColor2}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />

        {/* 电压表 V2 垂直并联支路与接点 */}
        <line
          x1={layout.meterV2X}
          y1={layout.wireYTop}
          x2={layout.meterV2X}
          y2={layout.cy - layout.meterR}
          stroke={wireColor2}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />
        <line
          x1={layout.meterV2X}
          y1={layout.cy + layout.meterR}
          x2={layout.meterV2X}
          y2={layout.wireYBot}
          stroke={wireColor2}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />
        <circle cx={layout.meterV2X} cy={layout.wireYTop} r={2.8} fill={wireColor2} />
        <circle cx={layout.meterV2X} cy={layout.wireYBot} r={2.8} fill={wireColor2} />

        {/* 高中物理标准电流矢量指示：清晰箭头 + 数值标注 */}
        {derived.displayI2 > 0.01 && (
          <g>
            {/* 上母线电流箭头指向变阻器负载 */}
            <polygon
              points={`${(layout.meterA2X + layout.meterR + termInX) / 2 + 4},${layout.wireYTop} ${(layout.meterA2X + layout.meterR + termInX) / 2 - 4},${layout.wireYTop - 3.5} ${(layout.meterA2X + layout.meterR + termInX) / 2 - 4},${layout.wireYTop + 3.5}`}
              fill={wireColor2}
            />
            {/* 电流表读数安置在 A2 表盘正下方，空旷无遮挡 */}
            <text
              x={layout.meterA2X}
              y={layout.wireYTop + layout.meterR + 14 * s}
              fontSize={font(10)}
              fill={wireColor2}
              fontWeight="bold"
              textAnchor="middle"
            >
              I₂ = {derived.displayI2.toFixed(2)} A
            </text>
            {/* 下母线回流箭头指向副线圈 */}
            <polygon
              points={`${(layout.secondaryRight + layout.meterV2X) / 2 - 4},${layout.wireYBot} ${(layout.secondaryRight + layout.meterV2X) / 2 + 4},${layout.wireYBot - 3.5} ${(layout.secondaryRight + layout.meterV2X) / 2 + 4},${layout.wireYBot + 3.5}`}
              fill={wireColor2}
            />
          </g>
        )}
      </g>

      {/* 滑动变阻器负载 */}
      <Rheostat
        x={layout.rheostatX}
        y={layout.cy}
        value={params.R}
        min={5}
        max={200}
        width={layout.rheostatW}
        label="R"
        unit="Ω"
        font={font}
      />

      {/* ────────────────── 3. 四只电表规范接入电路 ────────────────── */}
      {/* 原边电压表 V₁ (跨接在原边输入两端) */}
      <DialMeter type="V" value={params.U1} max={derived.v1Max} x={layout.meterV1X} y={layout.cy} r={layout.meterR} font={font} />
      <text x={layout.meterV1X} y={layout.cy - layout.meterR - 5 * s} fontSize={font(FONT.smallSize)} fill={PHYSICS_COLORS.emf} textAnchor="middle" fontWeight="bold">
        V₁
      </text>

      {/* 原边电流表 A₁ (串联在原边上干路) */}
      <DialMeter type="A" value={derived.displayI1} max={derived.a1Max} x={layout.meterA1X} y={layout.wireYTop} r={layout.meterR} font={font} />
      <text x={layout.meterA1X} y={layout.wireYTop - layout.meterR - 5 * s} fontSize={font(FONT.smallSize)} fill={PHYSICS_COLORS.electricCurrent} textAnchor="middle" fontWeight="bold">
        A₁
      </text>

      {/* 副边电压表 V₂ (跨接在副边输出两端) */}
      <DialMeter type="V" value={result.U2} max={derived.v2Max} x={layout.meterV2X} y={layout.cy} r={layout.meterR} font={font} />
      <text x={layout.meterV2X} y={layout.cy - layout.meterR - 5 * s} fontSize={font(FONT.smallSize)} fill={PHYSICS_COLORS.magnetSouth} textAnchor="middle" fontWeight="bold">
        V₂
      </text>

      {/* 副边电流表 A₂ (串联在副边上干路) */}
      <DialMeter type="A" value={derived.displayI2} max={derived.a2Max} x={layout.meterA2X} y={layout.wireYTop} r={layout.meterR} font={font} />
      <text x={layout.meterA2X} y={layout.wireYTop - layout.meterR - 5 * s} fontSize={font(FONT.smallSize)} fill={PHYSICS_COLORS.magnetSouth} textAnchor="middle" fontWeight="bold">
        A₂
      </text>
    </>
  )
}

export function TransformerScene({
  params,
  result,
  derived,
  layout,
  primaryCoils,
  secondaryCoils,
  font,
}: {
  params: TransformerParams
  result: TransformerResult
  derived: TransformerDerived
  layout: TransformerLayout
  primaryCoils: CoilPaths3D
  secondaryCoils: CoilPaths3D
  font: (v: number) => number
}) {
  const s = layout.scale
  return (
    <>
      <TransformerDefs sourceX={layout.sourceX} cy={layout.cy} scale={layout.scale} />

      <path d={primaryCoils.backD} fill="none" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.objectLine - 0.5} opacity={0.4} strokeLinecap="round" />
      <path d={secondaryCoils.backD} fill="none" stroke={PHYSICS_COLORS.magnetSouth} strokeWidth={CANVAS_STYLE.stroke.objectLine - 0.5} opacity={0.4} strokeLinecap="round" />

      <TransformerCore layout={layout} />
      <FluxRings layout={layout} derived={derived} />

      <CoilFront
        coil={primaryCoils}
        color={PHYSICS_COLORS.electricCurrent}
        glowRadius={derived.glowRadius1}
        glowOpacity={derived.primaryGlowOpacity}
        label={`原线圈 n₁=${params.n1}`}
        labelX={layout.v1X}
        labelY={layout.coreTop - 12 * s}
        font={font}
      />
      <CoilFront
        coil={secondaryCoils}
        color={PHYSICS_COLORS.magnetSouth}
        glowRadius={derived.glowRadius2}
        glowOpacity={derived.secondaryGlowOpacity}
        label={`副线圈 n₂=${params.n2}`}
        labelX={layout.v2X}
        labelY={layout.coreTop - 12 * s}
        font={font}
      />

      <CircuitsAndMeters params={params} result={result} derived={derived} layout={layout} font={font} />
    </>
  )
}
