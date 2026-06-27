import { useMemo, useId } from 'react'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { VelocityTimeChart } from '@/components/Chart'
import { Block } from '@/components/Physics/Block'
import { Spring } from '@/components/UI'
import { getPointsUpToTime } from '@/utils'
import { precomputeSpringBlocks, interpolateSpringBlocks } from '@/physics/momentumApplication'

const GROUND_X = 0
const GROUND_Y = 130
const GROUND_WIDTH = 700
const SPRING_PX_PER_M = 40
const SPRING_ORIGIN_X = 350
const SPRING_NATURAL_LENGTH_PX = 80
const BLOCK_SIZE = { width: 40, height: 24 }
const ENERGY_CUP = { width: 30, height: 25, maxHeight: 20, padding: 3, innerWidth: 24 }
const CRITICAL_TIP = { x: -50, y: -10, width: 100, height: 20 }
const SPRING_SIM = { duration: 3.5, dt: 0.016 }

interface SpringProps {
  time: number
  mA_spring: number
  mB_spring: number
  v0_spring: number
  k_spring: number
  canvasSize: { width: number; height: number; font: (size: number) => number }
  sceneScale: Record<string, unknown>
}

function useSpringData({ mA_spring, mB_spring, v0_spring, k_spring, time }: { mA_spring: number; mB_spring: number; v0_spring: number; k_spring: number; time: number }) {
  const springBlocksStates = useMemo(() => {
    return precomputeSpringBlocks(mA_spring, mB_spring, v0_spring, k_spring, 1.5, 3.5, SPRING_SIM.duration, SPRING_SIM.dt)
  }, [mA_spring, mB_spring, v0_spring, k_spring])

  const springState = useMemo(() => interpolateSpringBlocks(springBlocksStates, time), [springBlocksStates, time])

  const springVtDomain_A = useMemo(() => springBlocksStates.map(pt => ({ t: pt.t, v: pt.vA })), [springBlocksStates])
  const springVtDomain_B = useMemo(() => springBlocksStates.map(pt => ({ t: pt.t, v: pt.vB })), [springBlocksStates])
  const springVtPoints_A = useMemo(() => getPointsUpToTime(springVtDomain_A, time), [springVtDomain_A, time])
  const springVtPoints_B = useMemo(() => getPointsUpToTime(springVtDomain_B, time), [springVtDomain_B, time])

  const springEtDomain_Ek = useMemo(() => springBlocksStates.map(pt => ({ t: pt.t, v: pt.EkA + pt.EkB })), [springBlocksStates])
  const springEtDomain_Ep = useMemo(() => springBlocksStates.map(pt => ({ t: pt.t, v: pt.Ep })), [springBlocksStates])
  const springEtDomain_Total = useMemo(() => springBlocksStates.map(pt => ({ t: pt.t, v: pt.Etotal })), [springBlocksStates])
  const springEtPoints_Ek = useMemo(() => getPointsUpToTime(springEtDomain_Ek, time), [springEtDomain_Ek, time])
  const springEtPoints_Ep = useMemo(() => getPointsUpToTime(springEtDomain_Ep, time), [springEtDomain_Ep, time])
  const springEtPoints_Total = useMemo(() => getPointsUpToTime(springEtDomain_Total, time), [springEtDomain_Total, time])

  return { springBlocksStates, springState, springVtDomain_A, springVtDomain_B, springVtPoints_A, springVtPoints_B, springEtDomain_Ek, springEtDomain_Ep, springEtDomain_Total, springEtPoints_Ek, springEtPoints_Ep, springEtPoints_Total }
}

export function SpringBlocksCharts(props: SpringProps) {
  const { springVtDomain_A, springVtDomain_B, springVtPoints_A, springVtPoints_B, springEtDomain_Ek, springEtDomain_Ep, springEtDomain_Total, springEtPoints_Ek, springEtPoints_Ep, springEtPoints_Total } = useSpringData(props)

  return (
    <>
      <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
        <div className="flex-grow min-h-0 relative">
          <VelocityTimeChart mode="animated" points={springVtPoints_A} domainPoints={springVtDomain_A} currentTime={props.time} tMax={6} title="速度-时间图像 (V-T)" xLabel="时间 t (s)" yLabel="速度 v (m/s)" additionalSeries={[{ points: springVtPoints_B, domainPoints: springVtDomain_B, label: '滑块 B', series: 'secondary' }]} showArea={false} />
        </div>
      </div>
      <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
        <div className="flex-grow min-h-0 relative">
          <VelocityTimeChart mode="animated" points={springEtPoints_Ek} domainPoints={springEtDomain_Ek} currentTime={props.time} tMax={6} title="能量-时间图像 (E-T)" xLabel="时间 t (s)" yLabel="能量 E (J)" additionalSeries={[{ points: springEtPoints_Ep, domainPoints: springEtDomain_Ep, label: '弹性势能 Ep', series: 'secondary' }, { points: springEtPoints_Total, domainPoints: springEtDomain_Total, label: '总机械能', series: 'success' }]} showArea={false} />
        </div>
      </div>
    </>
  )
}

export function SpringBlocksSvg(props: SpringProps) {
  const gradIdSteel = useId()
  const gradIdVacuum = useId()
  const { springBlocksStates, springState } = useSpringData(props)
  const { mA_spring, mB_spring, canvasSize, sceneScale, time } = props

  return (
    <>
      <defs>
        <radialGradient id={gradIdSteel} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
          <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
          <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
          <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
        </radialGradient>
        <radialGradient id={gradIdVacuum} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[0]} />
          <stop offset="40%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[1]} />
          <stop offset="80%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[2]} />
          <stop offset="100%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[3]} />
        </radialGradient>
      </defs>

      <PhysicsGround x={GROUND_X} y={GROUND_Y} width={GROUND_WIDTH} appearance={{ color: PHYSICS_COLORS.labelText, showHatch: true }} />

      {(() => {
        const xA_px = SPRING_ORIGIN_X + springState.xA * SPRING_PX_PER_M
        return (
          <g>
            <Block x={xA_px - BLOCK_SIZE.width / 2} y={GROUND_Y - BLOCK_SIZE.height} width={BLOCK_SIZE.width} height={BLOCK_SIZE.height} type="metal" label={`A (${mA_spring}kg)`} strokeWidth={CANVAS_STYLE.stroke.objectLine} font={canvasSize.font} />
            <VectorArrow origin={{ x: springState.xA, y: 0.24 }} vector={{ x: springState.vA, y: 0 }} type="velocity" sceneScale={sceneScale as never} label={`${springState.vA.toFixed(1)}m/s`} />
          </g>
        )
      })()}

      {(() => {
        const xB_px = SPRING_ORIGIN_X + springState.xB * SPRING_PX_PER_M
        return (
          <g>
            <Block x={xB_px - BLOCK_SIZE.width / 2} y={GROUND_Y - BLOCK_SIZE.height} width={BLOCK_SIZE.width} height={BLOCK_SIZE.height} type="metal" label={`B (${mB_spring}kg)`} strokeWidth={CANVAS_STYLE.stroke.objectLine} font={canvasSize.font} />
            <VectorArrow origin={{ x: springState.xB, y: 0.24 }} vector={{ x: springState.vB, y: 0 }} type="velocity" sceneScale={sceneScale as never} label={`${springState.vB.toFixed(1)}m/s`} color={PHYSICS_COLORS.elasticForce} />
          </g>
        )
      })()}

      {(() => {
        const xA_px = SPRING_ORIGIN_X + springState.xA * SPRING_PX_PER_M
        const xB_px = SPRING_ORIGIN_X + springState.xB * SPRING_PX_PER_M
        const springRight_px = xB_px - BLOCK_SIZE.width / 2
        let springLeft_px = springRight_px - SPRING_NATURAL_LENGTH_PX
        if (xA_px + BLOCK_SIZE.width / 2 > springLeft_px) springLeft_px = xA_px + BLOCK_SIZE.width / 2
        const isSeparated = springState.delta <= 0 && time > 0.5 && springState.vB > springState.vA
        return <Spring x1={springLeft_px} y1={GROUND_Y - 12} x2={springRight_px} y2={GROUND_Y - 12} coils={10} radius={7} isLightWeight={isSeparated} color={isSeparated ? SCENE_COLORS.charts.referenceLine : undefined} />
      })()}

      <g>
        <g transform="translate(190, 8)">
          <rect x="0" y="10" width={ENERGY_CUP.width} height={ENERGY_CUP.height} fill="none" stroke={SCENE_COLORS.charts.referenceLine} strokeWidth="1.5" rx="1" />
          {(() => {
            const ratio = springState.EkA + springState.EkB
            const h = Math.max(0, Math.min(ENERGY_CUP.maxHeight, (ratio / springState.Etotal) * ENERGY_CUP.maxHeight))
            return <rect x={`${ENERGY_CUP.padding}`} y={33 - h} width={ENERGY_CUP.innerWidth} height={h} fill={PHYSICS_COLORS.kineticEnergy} opacity="0.8" />
          })()}
          <text x="15" y="-1" fill={PHYSICS_COLORS.velocity} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">动能 Ek</text>
        </g>
        <g transform="translate(480, 8)">
          <rect x="0" y="10" width={ENERGY_CUP.width} height={ENERGY_CUP.height} fill="none" stroke={SCENE_COLORS.charts.referenceLine} strokeWidth="1.5" rx="1" />
          {(() => {
            const ratio = springState.Ep
            const h = Math.max(0, Math.min(ENERGY_CUP.maxHeight, (ratio / springState.Etotal) * ENERGY_CUP.maxHeight))
            return <rect x={`${ENERGY_CUP.padding}`} y={33 - h} width={ENERGY_CUP.innerWidth} height={h} fill={PHYSICS_COLORS.potentialEnergy} opacity="0.8" />
          })()}
          <text x="15" y="-1" fill={PHYSICS_COLORS.potentialEnergy} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">势能 Ep</text>
        </g>
        {(() => {
          const prevT = Math.max(0, time - 0.05)
          const prevState = interpolateSpringBlocks(springBlocksStates, prevT)
          const isCompressing = springState.delta > prevState.delta && springState.delta > 0.001
          const isReleasing = springState.delta < prevState.delta && springState.delta > 0.001
          if (isCompressing) return <g transform="translate(325, 20)"><path d="M 0 0 L 50 0 M 42 -4 L 50 0 L 42 4" stroke={PHYSICS_COLORS.kineticEnergy} strokeWidth="2.5" strokeLinecap="round" /><text x="25" y="-6" fill={PHYSICS_COLORS.kineticEnergy} fontSize={8} textAnchor="middle">动能 &rArr; 弹性能</text></g>
          if (isReleasing) return <g transform="translate(325, 20)"><path d="M 50 0 L 0 0 M 8 -4 L 0 0 L 8 4" stroke={PHYSICS_COLORS.potentialElastic} strokeWidth="2.5" strokeLinecap="round" /><text x="25" y="-6" fill={PHYSICS_COLORS.potentialElastic} fontSize={8} textAnchor="middle">弹性能 &rArr; 动能</text></g>
          return null
        })()}
      </g>

      {(() => {
        const maxDeltaPt = springBlocksStates.reduce((max, pt) => (pt.delta > max.delta ? pt : max), { delta: 0, t: 0 })
        const isCompressShortest = Math.abs(time - maxDeltaPt.t) < 0.08
        const separatedPt = springBlocksStates.find(pt => pt.delta <= 0.0001 && pt.t > 0.5)
        const isSeparating = separatedPt && Math.abs(time - separatedPt.t) < 0.08
        if (isCompressShortest) return <g transform={`translate(${SPRING_ORIGIN_X}, 75)`}><rect x={CRITICAL_TIP.x} y={CRITICAL_TIP.y} width={CRITICAL_TIP.width} height={CRITICAL_TIP.height} fill={SCENE_COLORS.safety.safetyYellow} opacity="0.9" rx="3" /><text x="0" y="3" fill={CANVAS_COLORS.labelText} fontSize={canvasSize.font(9)} fontWeight="bold" textAnchor="middle">🔥 压缩最短 (共速点)</text></g>
        if (isSeparating) return <g transform={`translate(${SPRING_ORIGIN_X}, 75)`}><rect x={CRITICAL_TIP.x} y={CRITICAL_TIP.y} width={CRITICAL_TIP.width} height={CRITICAL_TIP.height} fill={SCENE_COLORS.pendulum.equilibrium} opacity="0.9" rx="3" /><text x="0" y="3" fill={colors.neutral.white} fontSize={canvasSize.font(9)} fontWeight="bold" textAnchor="middle">⚡️ 恢复原长 (分离点)</text></g>
        return null
      })()}
    </>
  )
}
