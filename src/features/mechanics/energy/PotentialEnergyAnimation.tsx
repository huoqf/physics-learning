import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useMemo, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { createSceneScale } from '@/scene'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { KatexFormula } from '@/components/UI'
import {
  precomputeGravityTrajectory,
  precomputeSpringTrajectory,
  getPEStateAtTime,
} from '@/physics/potentialEnergy'
import { usePEInteraction } from './usePEInteraction'
import { GravityScene } from './GravityScene'
import { ElasticScene } from './ElasticScene'
import { EnergyBarChart } from './EnergyBarChart'
import { EnergyTimeChart } from './EnergyTimeChart'

export default function PotentialEnergyAnimation() {
  const { params, time, isPlaying, setIsPlaying, showVectors, updateParam, setTime } = useAnimationStore(
    useShallow((s) => ({
      params: s.params, time: s.time, isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying, showVectors: s.showVectors,
      updateParam: s.updateParam, setTime: s.setTime,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.standard)
  const { font } = canvasSize
  const svgRef = useRef<SVGSVGElement>(null)

  const mode = params.mode ?? 0
  const m = params.m ?? 2
  const g = params.g ?? 9.8
  const y0 = params.y0 ?? 8
  const y_ref = params.y_ref ?? 3
  const k = params.k ?? 100
  const x0 = params.x0 ?? 2.0
  const tMax = 15

  // 布局
  const padding = canvasSize.width * 0.03
  const fontSize = Math.max(10, canvasSize.width * 0.016)
  const smallFont = Math.max(9, fontSize * 0.8)
  const dividerX = canvasSize.width * 0.50
  const chartLeft = dividerX + canvasSize.width * 0.02
  const chartRight = canvasSize.width - padding
  const chartWidth = chartRight - chartLeft
  const chartAreaTop = padding
  const chartAreaBottom = canvasSize.height * 0.90
  const barAreaTop = chartAreaTop
  const barAreaBottom = chartAreaTop + (chartAreaBottom - chartAreaTop) * 0.32
  const etAreaBottom = chartAreaBottom
  const animLeft = padding
  const animRight = dividerX - padding * 0.5
  const animWidth = animRight - animLeft
  const animCenterX = (animLeft + animRight) / 2
  const bottomY = canvasSize.height * 0.92

  // 坐标转换
  const groundY = canvasSize.height * 0.82
  const objW = Math.min(animWidth * 0.18, canvasSize.width * 0.075)
  const ballR = objW * 0.45
  const animTopMargin = canvasSize.height * 0.08
  const animHeightLimit = groundY - animTopMargin
  const scaleY = animHeightLimit / 10
  const toPixelY = (yVal: number) => groundY - yVal * scaleY
  const scaleX = (animWidth * 0.35) / 3
  const toPixelX = (xVal: number) => animCenterX + xVal * scaleX

  // 物理计算
  const trajectory = useMemo(() => {
    return mode === 0
      ? precomputeGravityTrajectory(m, g, y0, y_ref, 0.7, tMax)
      : precomputeSpringTrajectory(m, k, x0, tMax)
  }, [mode, m, g, y0, y_ref, k, x0])

  const state = useMemo(() => getPEStateAtTime(trajectory, time), [trajectory, time])

  // 拖拽交互
  const { hoveredTarget, cursor, handleMouseDown, handleMouseMove, handleMouseUpOrLeave } = usePEInteraction({
    mode, isPlaying, svgRef, toPixelY, toPixelX, groundY, objW, ballR,
    animLeft, animRight, animCenterX, scaleY, scaleX, state, y_ref, y0, x0,
    updateParam, setTime, setIsPlaying,
  })

  // 能量柱参数
  const initialEp = mode === 0 ? m * g * (y0 - y_ref) : 0.5 * k * x0 * x0
  const deltaEp = state.Ep - initialEp
  const maxBarH = (barAreaBottom - barAreaTop) * 0.55
  const maxEnergyVal = Math.max(mode === 0 ? (m * g * 10) : (0.5 * k * 3 * 3), 10)
  const barW_H = (Math.abs(state.W) / maxEnergyVal) * maxBarH
  const barDeltaEp_H = (Math.abs(-deltaEp) / maxEnergyVal) * maxBarH
  const barBaseY = barAreaTop + 18 + maxBarH + 5

  // 图表数据
  const gravityMaxE = m * g * 10
  const springMaxE = 0.5 * k * 3.2 * 3.2
  const springCurvePoints = useMemo(() => {
    return Array.from({ length: 81 }, (_, idx) => {
      const xVal = -3.2 + (idx * 6.4) / 80
      return { x: xVal, y: 0.5 * k * xVal * xVal }
    })
  }, [k])
  const visiblePoints = useMemo(() => trajectory.filter(p => p.t <= time + 0.01), [trajectory, time])

  // 公式
  const getLiveFormula = () => mode === 0
    ? `E_p = mgh = ${state.Ep.toFixed(1)}\\text{J}`
    : `E_{pe} = \\frac{1}{2}kx^2 = ${state.Ep.toFixed(1)}\\text{J}`

  // 底部标注
  const bottomLabels = mode === 0
    ? [
        { label: '高度', value: `${state.pos.toFixed(2)} m`, color: PHYSICS_COLORS.potentialEnergy },
        { label: '速度', value: `${Math.abs(state.v).toFixed(2)} m/s`, color: PHYSICS_COLORS.velocity },
        { label: 'Ep', value: `${state.Ep.toFixed(1)} J`, color: PHYSICS_COLORS.potentialEnergy },
        { label: 'Ek', value: `${state.Ek.toFixed(1)} J`, color: PHYSICS_COLORS.kineticEnergy },
        { label: 'W重', value: `${state.W.toFixed(1)} J`, color: PHYSICS_COLORS.work },
      ]
    : [
        { label: '形变', value: `${state.pos.toFixed(2)} m`, color: PHYSICS_COLORS.potentialElastic },
        { label: '速度', value: `${Math.abs(state.v).toFixed(2)} m/s`, color: PHYSICS_COLORS.velocity },
        { label: 'Ep弹', value: `${state.Ep.toFixed(1)} J`, color: PHYSICS_COLORS.potentialElastic },
        { label: 'Ek', value: `${state.Ek.toFixed(1)} J`, color: PHYSICS_COLORS.kineticEnergy },
        { label: 'W弹', value: `${state.W.toFixed(1)} J`, color: PHYSICS_COLORS.work },
      ]

  const sceneScale = useMemo(() => createSceneScale({
    vectorBounds: { x: 0, y: 0, width: 600, height: 450 },
    originX: 0, originY: 0, worldWidth: 600, worldHeight: 450,
  }), [])

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
      {/* 拖拽提示 */}
      {!isPlaying && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-neutral-50 text-neutral-400 font-semibold rounded border pointer-events-none z-10 animate-pulse" style={{ fontSize: font(9) }}>
          {mode === 0 ? '拖动物块改变释放高度，拖动虚线改变零势能面' : '拖动滑块可调节初始形变大小'}
        </div>
      )}

      {/* 实时公式 */}
      <div
        className="absolute bg-white/95 px-2 py-0.5 rounded shadow-sm border border-neutral-200 pointer-events-none z-10 transition-all duration-100 ease-out"
        style={{
          left: mode === 0 ? `${animCenterX}px` : `${toPixelX(state.pos) + objW * 0.5}px`,
          bottom: mode === 0 ? `${canvasSize.height - toPixelY(state.pos) + 2 * ballR + 10}px` : `${canvasSize.height - groundY + ballR + 10}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <span style={{ fontSize: font(10) }}>
          <KatexFormula formula={getLiveFormula()} mode="inline"
            className={`font-semibold ${mode === 0 ? 'text-violet-700' : 'text-violet-900'}`} />
        </span>
      </div>

      {/* 主 SVG */}
      <svg ref={svgRef} width={canvasSize.width} height={canvasSize.height}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave}
        style={{ cursor }} className="bg-transparent"
      >
        <defs>
          <radialGradient id="steel-sphere-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
          </radialGradient>
        </defs>

        {/* 左侧动画舞台 */}
        {mode === 0 ? (
          <GravityScene animLeft={animLeft} animRight={animRight} animCenterX={animCenterX}
            groundY={groundY} ballR={ballR} toPixelY={toPixelY} state={state}
            m={m} y_ref={y_ref} showVectors={showVectors} isPlaying={isPlaying}
            hoveredTarget={hoveredTarget} smallFont={smallFont} font={font} sceneScale={sceneScale} />
        ) : (
          <ElasticScene animLeft={animLeft} animRight={animRight}
            groundY={groundY} objW={objW} toPixelX={toPixelX} state={state}
            m={m} showVectors={showVectors} isPlaying={isPlaying}
            hoveredTarget={hoveredTarget} smallFont={smallFont} font={font} sceneScale={sceneScale} />
        )}

        {/* 分隔线 */}
        <line x1={dividerX} y1={padding} x2={dividerX} y2={canvasSize.height * 0.90} stroke={CANVAS_COLORS.grid} strokeWidth={1} />

        {/* 右侧对比柱 */}
        <EnergyBarChart mode={mode} chartLeft={chartLeft} chartWidth={chartWidth}
          barAreaTop={barAreaTop} barBaseY={barBaseY} maxBarH={maxBarH}
          barW_H={barW_H} barDeltaEp_H={barDeltaEp_H} state={state} deltaEp={deltaEp}
          font={font} smallFont={smallFont} />

        {/* 右侧图表 */}
        <EnergyTimeChart mode={mode} chartLeft={chartLeft} chartWidth={chartWidth}
          barAreaBottom={barAreaBottom} etAreaBottom={etAreaBottom}
          visiblePoints={visiblePoints} springCurvePoints={springCurvePoints}
          tMax={tMax} gravityMaxE={gravityMaxE} springMaxE={springMaxE} state={state} />

        {/* 底部标注 */}
        <line x1={padding} y1={bottomY - 6} x2={canvasSize.width - padding} y2={bottomY - 6} stroke={CANVAS_COLORS.grid} strokeWidth={0.5} />
        {bottomLabels.map((item, idx) => {
          const spacing = canvasSize.width / bottomLabels.length
          const cx = spacing * idx + spacing * 0.5
          return (
            <g key={`bottom-${idx}`}>
              <text x={cx} y={bottomY + 4} fontSize={font(8)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle" fontWeight="semibold">{item.label}</text>
              <text x={cx} y={bottomY + 16} fontSize={font(9)} fill={item.color} textAnchor="middle" fontWeight="bold">{item.value}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
