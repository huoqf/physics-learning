import { VectorArrow, VectorDefs, CapacitorPlates } from '@/components/Physics'
import { calculateVelocitySelectorTrajectory } from '@/physics'

import { ParticleEmitter, MagneticFieldSymbols } from '@/components/Physics'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import { CANVAS_STYLE, FONT, PHYSICS_COLORS } from '@/theme/physics'
import type { VelocitySelectorChartData, VelocitySelectorChartGeometry, VelocitySelectorLayout, VelocitySelectorParams, MagneticFieldSign } from '../model/velocitySelectorModel'
import { VelocitySelectorChart } from './VelocitySelectorChart'

function BasicVectors({
  singleParticle,
  sceneScale,
}: {
  singleParticle: ReturnType<typeof calculateVelocitySelectorTrajectory>
  sceneScale: SceneScale
}) {
  const { point } = singleParticle
  const { px: pDesignX, py: pDesignY } = worldToDesign(point.x, point.y, sceneScale)
  const velVec = { x: point.vx, y: point.vy }
  const forceVec = { x: point.fx, y: point.fy }

  return (
    <g>
      <VectorArrow
        originPixel={{ x: pDesignX, y: pDesignY }}
        vector={velVec}
        type="velocity"
        sceneScale={sceneScale}
        strokeWidth={CANVAS_STYLE.stroke.vectorMain}
      />
      <text
        x={pDesignX + (point.vx > 0 ? 15 : -25)}
        y={pDesignY - (point.vy > 0 ? 15 : -15)}
        fontSize={FONT.labelSize}
        fill={PHYSICS_COLORS.velocity}
        fontWeight="bold"
      >
        v
      </text>

      {Math.abs(point.fx) > 0.01 || Math.abs(point.fy) > 0.01 ? (
        <g>
          <VectorArrow
            originPixel={{ x: pDesignX, y: pDesignY }}
            vector={forceVec}
            type="lorentzForce"
            sceneScale={sceneScale}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
          />
          <text
            x={pDesignX + (point.fx > 0 ? 15 : -25)}
            y={pDesignY - (point.fy > 0 ? 15 : -15)}
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
  gradId,
  params,
  isPlaying,
  showVectors,
  singleParticle,
  layout,
  sceneScale,
  magneticFieldSigns,
  chartData,
  chartGeometry,
  chartCurvePath,
  font,
}: {
  gradId: string
  params: VelocitySelectorParams
  isPlaying: boolean
  showVectors: boolean
  singleParticle: ReturnType<typeof calculateVelocitySelectorTrajectory> | null
  layout: VelocitySelectorLayout
  sceneScale: SceneScale
  magneticFieldSigns: MagneticFieldSign[]
  chartData: VelocitySelectorChartData | null
  chartGeometry: VelocitySelectorChartGeometry
  chartCurvePath: string
  font: (v: number) => number
}) {
  return (
    <>
      <defs>
        <VectorDefs colors={[PHYSICS_COLORS.velocity, PHYSICS_COLORS.lorentzForce, PHYSICS_COLORS.electricForce]} />
      </defs>

      <MagneticFieldSymbols
        points={magneticFieldSigns.map((s) => ({ x: s.x, y: s.y + 5 }))}
        direction="in"
        opacity={0.32}
      />

      {params.mode === 0 && singleParticle && showVectors && (
        <BasicVectors singleParticle={singleParticle} sceneScale={sceneScale} />
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
    </>
  )
}
