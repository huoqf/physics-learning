import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { getPointsUpToTime } from '@/utils'
import { VectorArrow, PhysicsGround, Block, EnergyBars } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

import { VelocityTimeChart } from '@/components/Chart'

import { Spring } from '@/components/UI'
import { precomputeSpringBlocks, interpolateSpringBlocks } from '@/physics/momentumApplication/springBlocks'
import { useChartContext } from '@/components/Chart'


const DESIGN = CANVAS_PRESETS.splitV // 840×325
const GROUND_X = 0
const GROUND_Y = 240
const GROUND_WIDTH = DESIGN.width
const SPRING_PX_PER_M = 55
const SPRING_ORIGIN_X = Math.round(DESIGN.width * 0.5)
const SPRING_NATURAL_LENGTH_PX = 110
const BLOCK_SIZE = { width: 42, height: 42 }
const CRITICAL_TIP = { x: -50, y: -10, width: 100, height: 20 }
const SPRING_SIM = { duration: 3.5, dt: 0.016 }

// 质心速度水平虚线组件
function CenterOfMassVelocityLine({ vG, font }: { vG: number; font: (base: number) => number }) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgY, plotOrigin, plotSize } = ctx
  const y = toSvgY(vG)
  const x1 = plotOrigin.x
  const x2 = plotOrigin.x + plotSize.width

  return (
    <g>
      <line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke={colors.warning[500]}
        strokeWidth={1.2}
        strokeDasharray="3,3"
      />
      <text
        x={x2 - 8}
        y={y - 4}
        fill={colors.warning[600]}
        fontSize={font(8)}
        fontWeight="bold"
        textAnchor="end"
      >
        vG = {vG.toFixed(2)} m/s (质心速度)
      </text>
    </g>
  )
}

export default function SpringBlocksAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.splitV })
  const { font } = canvasSize

  // 参数解析
  const mA_spring = params.mA_spring ?? 2
  const mB_spring = params.mB_spring ?? 3
  const v0_spring = params.v0_spring ?? 5
  const k_spring = params.k_spring ?? 20
  const connectionMode_spring = params.connectionMode_spring ?? 0

  const sceneScale = useSceneScale({
    vp, preset,
    anchor: 'custom',
    customScaleX: SPRING_PX_PER_M,
    customScaleY: SPRING_PX_PER_M,
    customOriginX: SPRING_ORIGIN_X,
    customOriginY: GROUND_Y,
    maxVectorLength: 55,
    refMagnitudes: { velocity: 8, elasticForce: 50 },
  })

  // 物理数据计算
  const states = useMemo(() => {
    return precomputeSpringBlocks(mA_spring, mB_spring, v0_spring, k_spring, 1.5, 3.5, SPRING_SIM.duration, SPRING_SIM.dt, connectionMode_spring)
  }, [mA_spring, mB_spring, v0_spring, k_spring, connectionMode_spring])

  const springState = useMemo(() => interpolateSpringBlocks(states, time), [states, time])

  // 临界状态时间点计算
  const criticalTimes = useMemo(() => {
    let tTouch = 0
    let tShortest = 0
    let tRestore = 0
    let maxDelta = 0

    for (let i = 0; i < states.length; i++) {
      const pt = states[i]
      if (tTouch === 0 && pt.delta > 0.001) {
        tTouch = pt.t
      }
      if (pt.delta > maxDelta) {
        maxDelta = pt.delta
        tShortest = pt.t
      }
    }

    // 寻找在 tShortest 之后，首次 delta 恢复原长的时刻
    const postShortest = states.filter((pt) => pt.t > tShortest)
    const restorePt = postShortest.find((pt) => pt.delta <= 0.001)
    tRestore = restorePt ? restorePt.t : SPRING_SIM.duration

    return { tTouch, tShortest, tRestore }
  }, [states])

  // 图表多阶段背景配置
  const stages = useMemo(() => {
    const { tTouch, tShortest, tRestore } = criticalTimes

    const list = [
      {
        from: 0,
        to: tTouch,
        color: colors.neutral[100],
        opacity: 0.15,
        label: '1. 匀速接近',
        showDividers: true,
      },
      {
        from: tTouch,
        to: tShortest,
        color: colors.warning[100],
        opacity: 0.15,
        label: '2. 减速压缩',
        showDividers: true,
      },
      {
        from: tShortest,
        to: tRestore,
        color: colors.success[100],
        opacity: 0.15,
        label: '3. 变加速释放',
        showDividers: true,
      },
    ]

    if (connectionMode_spring === 0) {
      list.push({
        from: tRestore,
        to: SPRING_SIM.duration,
        color: colors.neutral[100],
        opacity: 0.12,
        label: '4. 完全分离',
        showDividers: true,
      })
    } else {
      list.push({
        from: tRestore,
        to: SPRING_SIM.duration,
        color: colors.warning[100],
        opacity: 0.12,
        label: '4. 反向拉伸 (振动)',
        showDividers: true,
      })
    }

    return list
  }, [criticalTimes, connectionMode_spring])

  // 质心速度
  const vG = useMemo(() => {
    return (mA_spring * v0_spring) / (mA_spring + mB_spring)
  }, [mA_spring, mB_spring, v0_spring])

  // 能量实时分配柱状图数据
  const energyBarItems = useMemo(() => {
    return [
      {
        key: 'ekA',
        label: 'EkA',
        value: springState.EkA,
        color: PHYSICS_COLORS.kineticEnergy,
      },
      {
        key: 'ekB',
        label: 'EkB',
        value: springState.EkB,
        color: PHYSICS_COLORS.kineticEnergy,
      },
      {
        key: 'ep',
        label: 'Ep',
        value: springState.Ep,
        color: PHYSICS_COLORS.potentialEnergy,
      },
    ]
  }, [springState.EkA, springState.EkB, springState.Ep])

  // 图表数据
  const {
    vtDomain_A, vtDomain_B, vtPoints_A, vtPoints_B,
    etDomain_Ek, etDomain_Ep, etDomain_Total,
    etPoints_Ek, etPoints_Ep, etPoints_Total
  } = useMemo(() => {
    const vtDomain_A = states.map(pt => ({ t: pt.t, v: pt.vA }))
    const vtDomain_B = states.map(pt => ({ t: pt.t, v: pt.vB }))
    const vtPoints_A = getPointsUpToTime(vtDomain_A, time)
    const vtPoints_B = getPointsUpToTime(vtDomain_B, time)

    const etDomain_Ek = states.map(pt => ({ t: pt.t, v: pt.EkA + pt.EkB }))
    const etDomain_Ep = states.map(pt => ({ t: pt.t, v: pt.Ep }))
    const etDomain_Total = states.map(pt => ({ t: pt.t, v: pt.Etotal }))
    const etPoints_Ek = getPointsUpToTime(etDomain_Ek, time)
    const etPoints_Ep = getPointsUpToTime(etDomain_Ep, time)
    const etPoints_Total = getPointsUpToTime(etDomain_Total, time)

    return {
      vtDomain_A, vtDomain_B, vtPoints_A, vtPoints_B,
      etDomain_Ek, etDomain_Ep, etDomain_Total,
      etPoints_Ek, etPoints_Ep, etPoints_Total
    }
  }, [states, time])

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 box-border bg-neutral-50 overflow-hidden">
      {/* 上方图表与能量柱展示 */}
      <div className="flex-1 min-h-[160px] grid grid-cols-3 gap-2">
        <div className="bg-white border border-neutral-200/80 rounded-xl p-2.5 shadow-sm relative overflow-hidden flex flex-col">
          <div className="flex-grow min-h-0 relative">
            <VelocityTimeChart
              mode="animated"
              points={vtPoints_A}
              domainPoints={vtDomain_A}
              currentTime={time}
              tMax={6}
              title=""
              xLabel="t (s)"
              yLabel=""
              additionalSeries={[{ points: vtPoints_B, domainPoints: vtDomain_B, label: '滑块 B', series: 'secondary' }]}
              showArea={false}
              stages={stages}
            >
              <CenterOfMassVelocityLine vG={vG} font={font} />
            </VelocityTimeChart>
          </div>
        </div>
        <div className="bg-white border border-neutral-200/80 rounded-xl p-2.5 shadow-sm relative overflow-hidden flex flex-col">
          <div className="flex-grow min-h-0 relative">
            <VelocityTimeChart
              mode="animated"
              points={etPoints_Ek}
              domainPoints={etDomain_Ek}
              currentTime={time}
              tMax={6}
              title=""
              xLabel="t (s)"
              yLabel=""
              additionalSeries={[
                { points: etPoints_Ep, domainPoints: etDomain_Ep, label: '弹性势能 Ep', series: 'secondary' },
                { points: etPoints_Total, domainPoints: etDomain_Total, label: '总机械能', series: 'success' }
              ]}
              showArea={false}
              stages={stages}
            />
          </div>
        </div>
        <div className="bg-white border border-neutral-200/80 rounded-xl p-2.5 shadow-sm relative overflow-hidden flex flex-col">
          <div className="text-ui-base font-bold text-neutral-800 border-b pb-1 mb-1.5 flex items-center justify-between">
            <span>能量实时分配</span>
            <span className="text-ui-sm text-neutral-400 font-mono">E (J)</span>
          </div>
          <div className="flex-grow min-h-0 flex items-center justify-center">
            <EnergyBars items={energyBarItems} initialEtot={springState.Etotal} compact={true} />
          </div>
        </div>
      </div>

      {/* 下方物理仿真动画区 */}
      <div className="flex-1 min-h-[220px] bg-white border border-neutral-200/80 rounded-xl shadow-sm relative overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0">
          <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
            {/* 地面 (开启 isSmooth 光滑镜面效果) */}
            <PhysicsGround x={GROUND_X} y={GROUND_Y} width={GROUND_WIDTH} isSmooth={true} appearance={{ color: PHYSICS_COLORS.labelText }} />

            {/* 光滑水平地面教学标识 */}
            <text x="20" y={GROUND_Y - 6} fill={colors.neutral[400]} fontSize={font(8)} fontWeight="bold" fontStyle="italic">
              光滑水平地面 (μ = 0)
            </text>

            {/* 滑块 A (重新映射 xA_px 为其右端面位置，防止最深压缩时发生重叠) */}
            {(() => {
              const xA_px = SPRING_ORIGIN_X + springState.xA * SPRING_PX_PER_M
              const forceA = -k_spring * springState.delta
              // 质心物理坐标（用于受力分析箭头对齐）
              const xA_center = springState.xA - (BLOCK_SIZE.width / 2) / SPRING_PX_PER_M
              return (
                <g>
                  <Block
                    x={xA_px - BLOCK_SIZE.width}
                    y={GROUND_Y - BLOCK_SIZE.height}
                    width={BLOCK_SIZE.width}
                    height={BLOCK_SIZE.height}
                    type="metal"
                    label={`A (${mA_spring}kg)`}
                    strokeWidth={CANVAS_STYLE.stroke.objectLine}
                    font={canvasSize.font}
                    showCenterOfMass={true}
                    translucent={true}
                  />
                  {/* 矢量箭头起点高度根据车身调整 (速度在车顶 0.65m，弹力在质心 0.375m) */}
                  <VectorArrow originPixel={{ x: xA_center, y: 0.65 }} vector={{ x: springState.vA, y: 0 }} type="velocity" sceneScale={sceneScale} label={`${springState.vA.toFixed(1)}m/s`} />
                  <VectorArrow originPixel={{ x: xA_center, y: 0.375 }} vector={{ x: forceA, y: 0 }} type="elasticForce" sceneScale={sceneScale} label={Math.abs(forceA) > 0.05 ? `${Math.abs(forceA).toFixed(1)}N` : undefined} />
                </g>
              )
            })()}

            {/* 滑块 B (重新映射 xB_px 为其左端面位置，防止最深压缩时发生重叠) */}
            {(() => {
              const xB_px = SPRING_ORIGIN_X + springState.xB * SPRING_PX_PER_M
              const forceB = k_spring * springState.delta
              // 质心物理坐标（用于受力分析箭头对齐）
              const xB_center = springState.xB + (BLOCK_SIZE.width / 2) / SPRING_PX_PER_M
              return (
                <g>
                  <Block
                    x={xB_px}
                    y={GROUND_Y - BLOCK_SIZE.height}
                    width={BLOCK_SIZE.width}
                    height={BLOCK_SIZE.height}
                    type="metal"
                    label={`B (${mB_spring}kg)`}
                    strokeWidth={CANVAS_STYLE.stroke.objectLine}
                    font={canvasSize.font}
                    showCenterOfMass={true}
                    translucent={true}
                  />
                  {/* 矢量箭头起点高度根据车身调整 (速度在车顶 0.65m，弹力在质心 0.375m) */}
                  <VectorArrow originPixel={{ x: xB_center, y: 0.65 }} vector={{ x: springState.vB, y: 0 }} type="velocity" sceneScale={sceneScale} label={`${springState.vB.toFixed(1)}m/s`} />
                  <VectorArrow originPixel={{ x: xB_center, y: 0.375 }} vector={{ x: forceB, y: 0 }} type="elasticForce" sceneScale={sceneScale} label={Math.abs(forceB) > 0.05 ? `${Math.abs(forceB).toFixed(1)}N` : undefined} />
                </g>
              )
            })()}

            {/* 弹簧 (精准抵在 A 的右端面和 B 的左端面之间，高度刚好对应中线 GROUND_Y - 15) */}
            {(() => {
              const xA_px = SPRING_ORIGIN_X + springState.xA * SPRING_PX_PER_M
              const xB_px = SPRING_ORIGIN_X + springState.xB * SPRING_PX_PER_M
              const springRight_px = xB_px
              let springLeft_px = springRight_px - SPRING_NATURAL_LENGTH_PX

              if (connectionMode_spring === 1) {
                springLeft_px = xA_px
              } else {
                springLeft_px = Math.max(xA_px, springLeft_px)
              }

              const isSeparated = connectionMode_spring === 0 && springState.delta === 0 && time > 0.5 && springState.vB > springState.vA
              return <Spring x1={springLeft_px} y1={GROUND_Y - 15} x2={springRight_px} y2={GROUND_Y - 15} coils={10} radius={7} isLightWeight={isSeparated} color={isSeparated ? SCENE_COLORS.charts.referenceLine : undefined} />
            })()}

            {/* 能量状态转换指示（悬浮在弹簧上方，居中渲染） */}
            {(() => {
              const prevT = Math.max(0, time - 0.05)
              const prevState = interpolateSpringBlocks(states, prevT)
              const isEnergyToSpring = springState.Ep > prevState.Ep + 0.1
              const isSpringToEnergy = springState.Ep < prevState.Ep - 0.1

              if (isEnergyToSpring) return <g transform={`translate(${SPRING_ORIGIN_X - 75}, 87)`}><path d="M 50 0 L 0 0 M 8 -4 L 0 0 L 8 4" stroke={PHYSICS_COLORS.kineticEnergy} strokeWidth="2" strokeLinecap="round" /><text x="25" y="-6" fill={PHYSICS_COLORS.kineticEnergy} fontSize={font(8)} fontWeight="bold" textAnchor="middle">动能 &rArr; 弹性能</text></g>
              if (isSpringToEnergy) return <g transform={`translate(${SPRING_ORIGIN_X - 75}, 87)`}><path d="M 0 0 L 50 0 M 42 -4 L 50 0 L 42 4" stroke={PHYSICS_COLORS.potentialElastic} strokeWidth="2" strokeLinecap="round" /><text x="25" y="-6" fill={PHYSICS_COLORS.potentialElastic} fontSize={font(8)} fontWeight="bold" textAnchor="middle">弹性能 &rArr; 动能</text></g>
              return null
            })()}

            {/* 临界提示 */}
            {(() => {
              const maxDeltaPt = states.reduce((max, pt) => (pt.delta > max.delta ? pt : max), { delta: 0, t: 0 })
              const isCompressShortest = Math.abs(time - maxDeltaPt.t) < 0.08

              const { tRestore } = criticalTimes
              const isRestoring = Math.abs(time - tRestore) < 0.08

              const minDeltaPt = states.reduce((min, pt) => (pt.delta < min.delta ? pt : min), { delta: 0, t: 0 })
              const isStretchLongest = connectionMode_spring === 1 && minDeltaPt.delta < -0.05 && Math.abs(time - minDeltaPt.t) < 0.08

              if (isCompressShortest) return <g transform={`translate(${SPRING_ORIGIN_X}, 135)`}><rect x={CRITICAL_TIP.x} y={CRITICAL_TIP.y} width={CRITICAL_TIP.width} height={CRITICAL_TIP.height} fill={SCENE_COLORS.safety.safetyYellow} opacity="0.9" rx="3" /><text x="0" y="3" fill={CANVAS_COLORS.labelText} fontSize={canvasSize.font(9)} fontWeight="bold" textAnchor="middle">🔥 压缩最短 (共速点)</text></g>
              if (isRestoring) {
                const label = connectionMode_spring === 1 ? '⚡️ 恢复原长 (平衡点)' : '⚡️ 恢复原长 (分离点)'
                return <g transform={`translate(${SPRING_ORIGIN_X}, 135)`}><rect x={CRITICAL_TIP.x} y={CRITICAL_TIP.y} width={CRITICAL_TIP.width} height={CRITICAL_TIP.height} fill={SCENE_COLORS.pendulum.equilibrium} opacity="0.9" rx="3" /><text x="0" y="3" fill={colors.neutral.white} fontSize={canvasSize.font(9)} fontWeight="bold" textAnchor="middle">{label}</text></g>
              }
              if (isStretchLongest) return <g transform={`translate(${SPRING_ORIGIN_X}, 135)`}><rect x={CRITICAL_TIP.x} y={CRITICAL_TIP.y} width={CRITICAL_TIP.width} height={CRITICAL_TIP.height} fill={SCENE_COLORS.safety.safetyYellow} opacity="0.9" rx="3" /><text x="0" y="3" fill={CANVAS_COLORS.labelText} fontSize={canvasSize.font(9)} fontWeight="bold" textAnchor="middle">🔥 拉伸最长 (共速点)</text></g>

              return null
            })()}
          </AnimationSvgCanvas>
        </div>
      </div>
    </div>
  )
}
