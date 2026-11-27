import React, { useRef, useState, useMemo, useEffect } from 'react'
import { useAnimationViewport } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { calculateNonUniformEField } from '@/physics'
import {
  useElectricPotentialPhysics,
  Q_SOURCE, X_Q, Y_Q, X_A, Y_A, X_B, Y_B, X_REF, X_GROUND, Y_GROUND, RUN_DURATION,
  POTENTIAL_DESIGN_W, POTENTIAL_DESIGN_H,
} from './hooks/useElectricPotentialPhysics'
import { ElectricPotentialChartScene } from './ElectricPotentialChartScene'
import { ElectricPotentialAnimScene } from './ElectricPotentialAnimScene'
import type { PathPoint } from './hooks/useElectricPotentialPhysics'

export default function ElectricPotential() {
  const { params, time, isPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
    }))
  )
  const updateParam = useAnimationStore((s) => s.updateParam)
  const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)

  const { containerRef: chartContainerRef, canvasSize: chartCanvasSize, vp: chartVp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const chartSvgRef = useRef<SVGSVGElement>(null)

  const baseEField = params.baseEField ?? 150 // V/m
  const qProbe = params.qProbe ?? 1.0 // μC
  const zeroRef = params.zeroRef ?? 0 // 0=无穷远为0V, 1=大地为0V
  const drawMode = params.drawMode ?? 0 // 0=直线, 1=手绘
  const hoverX = params.hoverX ?? 0.5 // 图像上光标的相对位置
  const phiA = params.phiA ?? 0

  const [handPath, setHandPath] = useState<PathPoint[]>([])

  // 1. 同步 A、B 点电势到 store
  useEffect(() => {
    const zeroRefStr: 'infinity' | 'ground' = zeroRef === 1 ? 'ground' : 'infinity'
    const resA = calculateNonUniformEField(X_A, Y_A, baseEField, X_Q, Y_Q, Q_SOURCE, zeroRefStr, X_REF, X_GROUND, Y_GROUND)
    const resB = calculateNonUniformEField(X_B, Y_B, baseEField, X_Q, Y_Q, Q_SOURCE, zeroRefStr, X_REF, X_GROUND, Y_GROUND)
    updateParam('phiA', resA.phi)
    updateParam('phiB', resB.phi)
  }, [baseEField, zeroRef, updateParam])

  // 2. 切换回直线模式时清空旧手绘路径
  useEffect(() => {
    if (drawMode === 0) {
      setHandPath([])
    }
  }, [drawMode])

  // 3. 动画播放结束自动停机
  useEffect(() => {
    if (isPlaying && time >= RUN_DURATION) {
      setIsPlaying(false)
    }
  }, [time, isPlaying, setIsPlaying])

  // 4. 构建当前实际滑行路径
  const activePath = useMemo<PathPoint[]>(() => {
    if (drawMode === 1 && handPath.length >= 2) {
      return handPath
    }
    return [
      { x: X_A, y: Y_A },
      { x: X_B, y: Y_B },
    ]
  }, [drawMode, handPath])

  const runProgress = Math.min(1.0, Math.max(0, time / RUN_DURATION))

  const physics = useElectricPotentialPhysics({
    baseEField,
    qProbe,
    zeroRef,
    drawMode,
    hoverX,
    activePath,
    runProgress,
    phiA,
  })

  // 同步 Hover 切线斜率到 Store
  useEffect(() => {
    updateParam('slopeK', Math.abs(physics.hoverPhysics.Ex))
  }, [physics.hoverPhysics.Ex, updateParam])

  // 绘制手绘路径的 SVG Path D
  const handPathD = useMemo(() => {
    if (handPath.length === 0) return ''
    return handPath
      .map((p, idx) => {
        const { cx, cy } = physics.physicsToDesign(p.x, p.y)
        return `${idx === 0 ? 'M' : 'L'} ${cx.toFixed(1)},${cy.toFixed(1)}`
      })
      .join(' ')
  }, [handPath, physics])

  // 上半屏图表的 Hover 交互（映射至设计坐标再反推绘图区比例）
  const handleChartPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = chartSvgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    if (rect.width <= 0) return
    const svgX = e.clientX - rect.left
    const designX = (svgX - chartVp.tx) / chartVp.scale
    const relativeX = (designX - physics.chartPadding.left) / physics.chartWidth
    const clampedPct = Math.max(0.0, Math.min(1.0, relativeX))
    updateParam('hoverX', clampedPct)
  }

  return (
    <div className="w-full h-full flex flex-col select-none bg-neutral-50 overflow-hidden">
      {/* ==================== 上半屏：图表区域 (splitV) ==================== */}
      <ElectricPotentialChartScene
        w={POTENTIAL_DESIGN_W}
        hChart={POTENTIAL_DESIGN_H}
        chartContainerRef={chartContainerRef}
        chartTransform={chartVp.transform}
        physics={physics}
        isPlaying={isPlaying}
        runProgress={runProgress}
        particlePhysicsPos={physics.particlePhysicsPos}
        onPointerMove={handleChartPointerMove}
        chartSvgRef={chartSvgRef}
        font={chartCanvasSize.font}
      />

      {/* ==================== 下半屏：动画展示区域 (splitV) ==================== */}
      <ElectricPotentialAnimScene
        physics={physics}
        drawMode={drawMode}
        isPlaying={isPlaying}
        runProgress={runProgress}
        qProbe={qProbe}
        handPath={handPath}
        handPathD={handPathD}
        onHandPathChange={setHandPath}
      />
    </div>
  )
}
