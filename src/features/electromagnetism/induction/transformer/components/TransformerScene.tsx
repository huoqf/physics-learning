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
        @keyframes tf-electron-flow {
          from { stroke-dashoffset: 0 }
          to { stroke-dashoffset: var(--electron-offset, -24) }
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
  current,
  flowDuration,
  glowRadius,
  glowOpacity,
  label,
  labelX,
  labelY,
  font,
  reverse = false,
}: {
  coil: CoilPaths3D
  color: string
  current: number
  flowDuration: number
  glowRadius: number
  glowOpacity: number
  label: string
  labelX: number
  labelY: number
  font: (v: number) => number
  reverse?: boolean
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
      {current > 0.01 && (
        <path
          d={coil.frontD}
          fill="none"
          stroke={color}
          strokeWidth={CANVAS_STYLE.stroke.objectLine + 1}
          strokeDasharray={`${4} ${20}`}
          strokeLinecap="round"
          opacity={0.8}
          style={{
            animation: 'tf-electron-flow linear infinite',
            animationDuration: `${flowDuration}s`,
            animationDirection: reverse ? 'reverse' : undefined,
            ['--electron-offset' as string]: '-24',
          }}
        />
      )}
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
  return (
    <>
      <g>
        <path
          d={`M ${layout.sourceX} ${layout.cy - 14 * s} V ${layout.coreTop + 10 * s} H ${layout.primaryLeft}`}
          fill="none"
          stroke={PHYSICS_COLORS.electricCurrent}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />
        <path
          d={`M ${layout.primaryLeft} ${layout.coreBottom - 10 * s} H ${layout.sourceX} V ${layout.cy + 14 * s}`}
          fill="none"
          stroke={PHYSICS_COLORS.electricCurrent}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />
        <circle
          cx={layout.sourceX}
          cy={layout.cy}
          r={14 * s}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.electricCurrent}
          strokeWidth={CANVAS_STYLE.stroke.objectThin}
        />
        <g clipPath="url(#source-clip)">
          <path
            d={derived.wavePath}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            style={{
              animation: 'tf-wave-move 1.2s linear infinite',
              ['--wave-offset' as string]: `${22 * s}px`,
            } as CSSProperties}
          />
        </g>
        <text x={layout.sourceX} y={layout.cy + 30 * s} fontSize={font(FONT.smallSize)} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
          U₁={params.U1}V
        </text>
      </g>

      <g>
        <path
          d={`M ${layout.secondaryRight} ${layout.coreTop + 10 * s} H ${layout.rheostatX} V ${layout.cy - 12.3 * s}`}
          fill="none"
          stroke={PHYSICS_COLORS.magnetSouth}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />
        <path
          d={`M ${layout.rheostatX} ${layout.cy + 6.15 * s} V ${layout.coreBottom - 10 * s} H ${layout.secondaryRight}`}
          fill="none"
          stroke={PHYSICS_COLORS.magnetSouth}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          strokeLinecap="round"
        />
      </g>

      <Rheostat x={layout.rheostatX} y={layout.cy} value={params.R} min={5} max={200} width={layout.rheostatW} label="R" unit="Ω" />

      <DialMeter type="V" value={params.U1} max={derived.v1Max} x={layout.v1X} y={layout.meterTopY} r={layout.meterR} />
      <text x={layout.v1X} y={layout.meterTopY - layout.meterR - 4} fontSize={font(FONT.smallSize)} fill={PHYSICS_COLORS.emf} textAnchor="middle" fontWeight="bold">V₁</text>
      <DialMeter type="A" value={derived.displayI1} max={derived.a1Max} x={layout.v1X} y={layout.meterBotY} r={layout.meterR} />
      <text x={layout.v1X} y={layout.meterBotY + layout.meterR + 10} fontSize={font(FONT.smallSize)} fill={PHYSICS_COLORS.electricCurrent} textAnchor="middle" fontWeight="bold">A₁</text>
      <DialMeter type="V" value={result.U2} max={derived.v2Max} x={layout.v2X} y={layout.meterTopY} r={layout.meterR} />
      <text x={layout.v2X} y={layout.meterTopY - layout.meterR - 4} fontSize={font(FONT.smallSize)} fill={PHYSICS_COLORS.magnetSouth} textAnchor="middle" fontWeight="bold">V₂</text>
      <DialMeter type="A" value={derived.displayI2} max={derived.a2Max} x={layout.v2X} y={layout.meterBotY} r={layout.meterR} />
      <text x={layout.v2X} y={layout.meterBotY + layout.meterR + 10} fontSize={font(FONT.smallSize)} fill={PHYSICS_COLORS.magnetSouth} textAnchor="middle" fontWeight="bold">A₂</text>
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
        current={result.I1}
        flowDuration={derived.primaryFlowDur}
        glowRadius={derived.glowRadius1}
        glowOpacity={derived.primaryGlowOpacity}
        label={`原线圈 n₁=${params.n1}`}
        labelX={layout.v1X}
        labelY={layout.meterTopY - layout.meterR - 18}
        font={font}
      />
      <CoilFront
        coil={secondaryCoils}
        color={PHYSICS_COLORS.magnetSouth}
        current={result.I2}
        flowDuration={derived.secondaryFlowDur}
        glowRadius={derived.glowRadius2}
        glowOpacity={derived.secondaryGlowOpacity}
        label={`副线圈 n₂=${params.n2}`}
        labelX={layout.v2X}
        labelY={layout.meterTopY - layout.meterR - 18}
        font={font}
        reverse
      />

      <CircuitsAndMeters params={params} result={result} derived={derived} layout={layout} font={font} />
    </>
  )
}
