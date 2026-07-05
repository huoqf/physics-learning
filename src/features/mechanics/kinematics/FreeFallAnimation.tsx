import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useEffect, useMemo, useState } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
} from '@/theme/physics'
import { useFreeFallPhysics } from './useFreeFallPhysics'
import { getPhysicsAtTime, GRAVITY } from '@/physics'
import { createSceneScaleFromViewport } from '@/scene'
import { MATERIAL, TUBE_PHYSICAL_HEIGHT } from './freeFallConfig'
import type { MaterialA, MaterialB } from './freeFallConfig'
import { useFreeFallLayout } from './useFreeFallLayout'
import { FreeFallScene } from './FreeFallScene'
import type { ChartDataSeries } from '@/components/Chart'

const TIME_SLICE_COLORS = [CHART_COLORS.primary, CHART_COLORS.compareB, CHART_COLORS.compareC, CHART_COLORS.criticalPt] as const
const TIME_SLICE_RATIOS = [1, 3, 5, 7] as const

export default function FreeFallAnimation() {
  const { params, time, showVectors, showGrid, showTimeSlices, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params, time: s.time, showVectors: s.showVectors,
      showGrid: s.showGrid, showTimeSlices: s.showTimeSlices, setIsPlaying: s.setIsPlaying,
    }))
  )
  const FF_DESIGN = CANVAS_PRESETS.full
  const [containerRef, canvasSize] = useCanvasSize(FF_DESIGN, { presetCompensation: 1.2 })
  const vp = useViewport(canvasSize, { designWidth: FF_DESIGN.width, designHeight: FF_DESIGN.height })

  // 参数
  const pressure = params.pressure ?? 0
  const objectA: MaterialA = (params.objectA === 1 ? 'coin' : 'ironBall') as MaterialA
  const objectB: MaterialB = (params.objectB === 1 ? 'paper' : 'feather') as MaterialB
  const g = params.g ?? 9.8
  const v0 = params.v0 ?? 0
  const matA = MATERIAL[objectA]
  const matB = MATERIAL[objectB]
  const dragKA = pressure * matA.baseDragK
  const dragKB = pressure * matB.baseDragK

  // 波纹状态
  const [rippleA, setRippleA] = useState<{ x: number; y: number; time: number } | null>(null)
  const [rippleB, setRippleB] = useState<{ x: number; y: number; time: number } | null>(null)

  // 布局
  const layout = useFreeFallLayout({ width: FF_DESIGN.width, height: FF_DESIGN.height })
  const { stageHeight, originY, groundY, ballX, featherX } = layout

  // 缩放
  const maxFallHeight = TUBE_PHYSICAL_HEIGHT
  const scale = useMemo(() => (maxFallHeight > 0 ? stageHeight / maxFallHeight : 25), [maxFallHeight, stageHeight])

  const ffSceneScale = useMemo(() => createSceneScaleFromViewport(vp, 'transform', {
    designWidth: FF_DESIGN.width,
    designHeight: FF_DESIGN.height,
    refMagnitudes: { velocity: Math.sqrt(2 * g * TUBE_PHYSICAL_HEIGHT), acceleration: GRAVITY, gravity: GRAVITY, force: 0.5 },
  }), [vp, g])

  // 物理引擎
  const { points: pointsA, groundTime: groundTimeA, currentState: stateA } = useFreeFallPhysics(v0, g, dragKA, matA.mass, maxFallHeight, time)
  const { points: pointsB, currentState: stateB } = useFreeFallPhysics(v0, g, dragKB, matB.mass, maxFallHeight, time)

  const isLandedA = stateA.isLanded
  const isLandedB = stateB.isLanded
  const effectiveVA = isLandedA ? 0 : stateA.v
  const effectiveVB = isLandedB ? 0 : stateB.v
  const currentYA = originY + stateA.y * scale
  const currentYB = originY + stateB.y * scale
  const renderYA = Math.min(currentYA, groundY - 14)
  const renderYB = Math.min(currentYB, groundY - 10)

  // 落地判断
  const isAllLanded = isLandedA && isLandedB
  useEffect(() => { if (isAllLanded && time > 0) setIsPlaying(false) }, [isAllLanded, time, setIsPlaying])

  // 波纹同步
  useEffect(() => {
    setRippleA(isLandedA ? { x: ballX, y: groundY, time } : null)
  }, [isLandedA, ballX, groundY, time])
  useEffect(() => {
    setRippleB(isLandedB ? { x: featherX + stateB.swayDx, y: groundY, time } : null)
  }, [isLandedB, featherX, stateB.swayDx, groundY, time])

  // 轨迹
  const trailA = useMemo(() => pointsA.filter(p => p.t <= time + 1e-9).map(p => ({ x: ballX, y: originY + p.y * scale })), [pointsA, time, ballX, originY, scale])
  const trailB = useMemo(() => pointsB.filter(p => p.t <= time + 1e-9).map(p => ({ x: featherX + p.swayDx, y: originY + p.y * scale })), [pointsB, time, featherX, originY, scale])

  // 频闪点
  const flashPointsRenderA = useMemo(() => {
    if (!showGrid || showTimeSlices) return null
    const pts = pointsA.filter(p => p.t <= time + 1e-9 && Math.round(p.t * 100) % 10 === 0)
    return pts.map((pt, i) => {
      const cy = originY + pt.y * scale
      const opacity = pts.length <= 1 ? 0.5 : 0.3 + 0.7 * (i / (pts.length - 1))
      return <circle key={`fa-${i}`} cx={ballX} cy={Math.min(cy, groundY - 14)} r={4} fill={PHYSICS_COLORS.referencePoint} opacity={opacity} />
    })
  }, [showGrid, showTimeSlices, pointsA, time, originY, scale, ballX, groundY])

  const flashPointsRenderB = useMemo(() => {
    if (!showGrid || showTimeSlices) return null
    const pts = pointsB.filter(p => p.t <= time + 1e-9 && Math.round(p.t * 100) % 10 === 0)
    return pts.map((pt, i) => {
      const cy = originY + pt.y * scale
      const opacity = pts.length <= 1 ? 0.5 : 0.3 + 0.7 * (i / (pts.length - 1))
      return <circle key={`fb-${i}`} cx={featherX + pt.swayDx} cy={Math.min(cy, groundY - 10)} r={3} fill={CHART_COLORS.compareB} opacity={opacity * 0.7} />
    })
  }, [showGrid, showTimeSlices, pointsB, time, originY, scale, featherX, groundY])

  const flashPointsTableA = useMemo(() => pointsA.filter(p => p.t <= time + 1e-9 && Math.round(p.t * 100) % 10 === 0), [pointsA, time])
  const flashPointsTableB = useMemo(() => pointsB.filter(p => p.t <= time + 1e-9 && Math.round(p.t * 100) % 10 === 0), [pointsB, time])

  // 时间切片
  const timeSliceBlocks = useMemo(() => {
    if (!showTimeSlices) return []
    const blocks: Array<{ y: number; height: number; ratio: number | null; color: string; displacement: number }> = []
    const sliceTime = groundTimeA / 4
    for (let i = 0; i < 4; i++) {
      const t1 = i * sliceTime
      const t2 = (i + 1) * sliceTime
      const res1 = getPhysicsAtTime(pointsA, t1, groundTimeA)
      const res2 = getPhysicsAtTime(pointsA, t2, groundTimeA)
      const dy = res2.y - res1.y
      blocks.push({ y: originY + res1.y * scale, height: dy * scale, ratio: dragKA === 0 ? TIME_SLICE_RATIOS[i] : null, color: TIME_SLICE_COLORS[i], displacement: dy })
    }
    return blocks
  }, [pointsA, groundTimeA, dragKA, showTimeSlices, originY, scale])

  // 标签（环境说明已移至右侧屏，主屏不再重复）
  const tubeLabel = useMemo(() => {
    if (pressure <= 0.01) return '牛顿管（真空）'
    if (pressure >= 0.99) return '牛顿管（有空气）'
    return `牛顿管（气压 ${(pressure * 100).toFixed(0)}%）`
  }, [pressure])

  // v-t 图
  const vtXMax = useMemo(() => Math.round(Math.max(Math.min(groundTimeA * 1.2, 8), 2) * 10) / 10, [groundTimeA])
  const vtPointsA = useMemo(() => pointsA.filter(p => p.t <= Math.min(time, vtXMax) + 1e-9).map(p => ({ t: p.t, v: p.v })), [pointsA, time, vtXMax])
  const vtPointsB = useMemo(() => pointsB.filter(p => p.t <= Math.min(time, vtXMax) + 1e-9).map(p => ({ t: p.t, v: p.v })), [pointsB, time, vtXMax])
  const vtDomainPointsA = useMemo(() => pointsA.filter(p => p.t <= vtXMax + 1e-9).map(p => ({ t: p.t, v: p.v })), [pointsA, vtXMax])
  const vtDomainPointsB = useMemo(() => pointsB.filter(p => p.t <= vtXMax + 1e-9).map(p => ({ t: p.t, v: p.v })), [pointsB, vtXMax])
  const vtAdditionalSeries: ChartDataSeries[] = useMemo(() => [{
    points: vtPointsB, domainPoints: vtDomainPointsB, label: matB.label,
    series: 'accent', showArea: true, areaVariant: 'alt', areaIntensity: 'subtle',
  }], [vtPointsB, vtDomainPointsB, matB.label])

  return (
    <div ref={containerRef} className="w-full h-full">
      <FreeFallScene
        layout={layout}
        objectA={objectA} objectB={objectB} matA={matA} matB={matB}
        pressure={pressure} g={g}
        stateA={stateA} stateB={stateB}
        effectiveVA={effectiveVA} effectiveVB={effectiveVB}
        renderYA={renderYA} renderYB={renderYB}
        showVectors={showVectors} showGrid={showGrid} showTimeSlices={showTimeSlices}
        timeSliceBlocks={timeSliceBlocks}
        flashPointsRenderA={flashPointsRenderA} flashPointsRenderB={flashPointsRenderB}
        trailA={trailA} trailB={trailB}
        flashPointsTableA={flashPointsTableA} flashPointsTableB={flashPointsTableB}
        rippleA={rippleA} rippleB={rippleB} time={time}
        vtXMax={vtXMax}
        vtPointsA={vtPointsA} vtPointsB={vtPointsB}
        vtDomainPointsA={vtDomainPointsA} vtDomainPointsB={vtDomainPointsB}
        vtAdditionalSeries={vtAdditionalSeries}
        ffSceneScale={ffSceneScale}
        tubeLabel={tubeLabel}
      />
    </div>
  )
}
