import { calculateVelocitySelectorTrajectory } from '@/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { CapacitorPlates } from '@/components/Physics/CapacitorPlates'
import { ParticleEmitter } from '@/components/Physics/ParticleEmitter'
import { worldToPixel } from '@/scene'
import { CANVAS_STYLE, FONT, PHYSICS_COLORS } from '@/theme/physics'
import type { VelocitySelectorChartData, VelocitySelectorChartGeometry, VelocitySelectorLayout, VelocitySelectorParams, MagneticFieldSign } from '../model/velocitySelectorModel'
import { VelocitySelectorChart } from './VelocitySelectorChart'

function BasicVectors({
  singleParticle,
  layout,
}: {
  singleParticle: ReturnType<typeof calculateVelocitySelectorTrajectory>
  layout: VelocitySelectorLayout
}) {
  const { point } = singleParticle
  const { px: pPixelX, py: pPixelY } = worldToPixel(point.x, point.y, layout.sceneScale)
  const velVec = { x: point.vx, y: point.vy }
  const forceVec = { x: point.fx, y: point.fy }

  return (
    <g>
      <VectorArrow
        origin={{ x: point.x, y: point.y }}
        vector={velVec}
        type="velocity"
        sceneScale={layout.sceneScale}
        strokeWidth={CANVAS_STYLE.stroke.vectorMain}
      />
      <text
        x={pPixelX + (point.vx > 0 ? 15 : -25)}
        y={pPixelY - (point.vy > 0 ? 15 : -15)}
        fontSize={FONT.labelSize}
        fill={PHYSICS_COLORS.velocity}
        fontWeight="bold"
      >
        v
      </text>

      {Math.abs(point.fx) > 0.01 || Math.abs(point.fy) > 0.01 ? (
        <g>
          <VectorArrow
            origin={{ x: point.x, y: point.y }}
            vector={forceVec}
            type="lorentzForce"
            sceneScale={layout.sceneScale}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
          />
          <text
            x={pPixelX + (point.fx > 0 ? 15 : -25)}
            y={pPixelY - (point.fy > 0 ? 15 : -15)}
            fontSize={FONT.labelSize}
            fill={PHYSICS_COLORS.lorentzForce}
            fontWeight="bold"
          >
            F_洛
          </text>
        </g>
      ) : null}
    </g>
  )
}

function ElectricFieldLines({ layout }: { layout: VelocitySelectorLayout }) {
  return (
    <g opacity="0.4">
      {Array.from({ length: 6 }).map((_, i) => {
        const lineX = layout.xPlatePx + 30 + (i * (layout.wPlatePx - 60)) / 5
        return (
          <g key={`e-line-${i}`}>
            <line
              x1={lineX}
              y1={layout.cy - layout.gapPlatePx / 2 + 8}
              x2={lineX}
              y2={layout.cy + layout.gapPlatePx / 2 - 8}
              stroke={PHYSICS_COLORS.electricFieldLine}
              strokeWidth="2.0"
              strokeDasharray="4,3"
            />
            <polygon
              points={`${lineX},${layout.cy + layout.gapPlatePx / 2 - 8} ${lineX - 4},${layout.cy + layout.gapPlatePx / 2 - 14} ${lineX + 4},${layout.cy + layout.gapPlatePx / 2 - 14}`}
              fill={PHYSICS_COLORS.electricFieldLine}
            />
          </g>
        )
      })}
    </g>
  )
}

export function VelocitySelectorScene({
  width,
  height,
  gradId,
  params,
  isPlaying,
  showVectors,
  singleParticle,
  layout,
  magneticFieldSigns,
  chartData,
  chartGeometry,
  chartCurvePath,
  font,
}: {
  width: number
  height: number
  gradId: string
  params: VelocitySelectorParams
  isPlaying: boolean
  showVectors: boolean
  singleParticle: ReturnType<typeof calculateVelocitySelectorTrajectory> | null
  layout: VelocitySelectorLayout
  magneticFieldSigns: MagneticFieldSign[]
  chartData: VelocitySelectorChartData | null
  chartGeometry: VelocitySelectorChartGeometry
  chartCurvePath: string
  font: (v: number) => number
}) {
  return (
    <svg
      width={width}
      height={height}
      className="bg-white rounded-xl shadow-inner absolute top-0 left-0 select-none pointer-events-none"
    >
      <defs>
        <VectorDefs colors={[PHYSICS_COLORS.velocity, PHYSICS_COLORS.lorentzForce, PHYSICS_COLORS.electricForce]} />
      </defs>

      {magneticFieldSigns.map((cross) => (
        <text
          key={cross.id}
          x={cross.x}
          y={cross.y + 5}
          fontSize={font(15)}
          fill={PHYSICS_COLORS.magneticFieldCross}
          opacity="0.32"
          textAnchor="middle"
          fontWeight="bold"
        >
          ⊗
        </text>
      ))}

      {params.mode === 0 && singleParticle && showVectors && (
        <BasicVectors singleParticle={singleParticle} layout={layout} />
      )}

      {params.mode === 1 && (
        <CapacitorPlates
          x={layout.xPlatePx}
          y={layout.cy}
          width={layout.wPlatePx}
          gap={layout.gapPlatePx}
          chargeSign={params.E > 0.01 ? 1 : 0}
          showField={params.showElectricField}
          thickness={8}
        />
      )}

      {params.mode === 1 && params.showElectricField && params.E > 0.01 && <ElectricFieldLines layout={layout} />}

      <ParticleEmitter
        x={layout.cxIn}
        y={layout.cy}
        active={isPlaying}
        chargeSign={params.mode === 0 ? params.q : params.qOverM}
      />

      {params.mode === 1 && chartData && (
        <VelocitySelectorChart
          chartData={chartData}
          chartGeometry={chartGeometry}
          chartCurvePath={chartCurvePath}
          currentVelocity={params.v0}
          glowId={gradId}
          font={font}
        />
      )}
    </svg>
  )
}
