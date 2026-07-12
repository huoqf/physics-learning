import React, { useRef, useState, useMemo, useEffect } from 'react'
import { useAnimationViewport } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { calculateNonUniformEField } from '@/physics'
import { useElectricPotentialPhysics, Q_SOURCE, X_Q, Y_Q, X_A, Y_A, X_B, Y_B, X_REF, X_GROUND, Y_GROUND, RUN_DURATION } from './hooks/useElectricPotentialPhysics'
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

  const { containerRef, canvasSize } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
  const { font } = canvasSize
  const animSvgRef = useRef<SVGSVGElement>(null)
  const chartSvgRef = useRef<SVGSVGElement>(null)

  // 读取左侧控制参数
  const baseEField = params.baseEField ?? 150 // V/m
  const qProbe = params.qProbe ?? 1.0 // μC
  const zeroRef = params.zeroRef ?? 0 // 0=无穷远为0V, 1=大地为0V
  const drawMode = params.drawMode ?? 0 // 0=直线, 1=手绘
  const hoverX = params.hoverX ?? 0.5 // 图像上光标的相对位置
  const phiA = params.phiA ?? 0

  // 自适应尺寸逻辑
  const w = canvasSize.width
  const hTotal = canvasSize.height
  const hChart = hTotal / 2
  const hAnim = hTotal / 2

  // 手绘路径状态（物理坐标）
  const [handPath, setHandPath] = useState<PathPoint[]>([])
  const [isDrawing, setIsDrawing] = useState(false)

  // 1. 同步 A、B 点电势到 store
  useEffect(() => {
    const zeroRefStr: 'infinity' | 'ground' = zeroRef === 1 ? 'ground' : 'infinity'
    const resA = calculateNonUniformEField(X_A, Y_A, baseEField, X_Q, Y_Q, Q_SOURCE, zeroRefStr, X_REF, X_GROUND, Y_GROUND)
    const resB = calculateNonUniformEField(X_B, Y_B, baseEField, X_Q, Y_Q, Q_SOURCE, zeroRefStr, X_REF, X_GROUND, Y_GROUND)
    updateParam('phiA', resA.phi)
    updateParam('phiB', resB.phi)
  }, [baseEField, zeroRef, updateParam])

  // 2. 动画播放结束自动停机
  useEffect(() => {
    if (isPlaying && time >= RUN_DURATION) {
      setIsPlaying(false)
    }
  }, [time, isPlaying, setIsPlaying])

  // 3. 构建当前实际滑行路径
  const activePath = useMemo<PathPoint[]>(() => {
    if (drawMode === 1 && handPath.length >= 2) {
      return handPath
    }
    // 默认直线
    return [
      { x: X_A, y: Y_A },
      { x: X_B, y: Y_B },
    ]
  }, [drawMode, handPath])

  // 根据当前播放时间插值获取粒子物理位置
  const runProgress = Math.min(1.0, time / RUN_DURATION)

  // 调用物理计算 hook
  const physics = useElectricPotentialPhysics({
    baseEField,
    qProbe,
    zeroRef,
    drawMode,
    hoverX,
    activePath,
    runProgress,
    phiA,
    w,
    hAnim,
    hChart,
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
        const { cx, cy } = physics.physicsToCanvas(p.x, p.y)
        return `${idx === 0 ? 'M' : 'L'} ${cx.toFixed(1)},${cy.toFixed(1)}`
      })
      .join(' ')
  }, [handPath, physics])

  // 4. 手绘路径绘制事件
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drawMode !== 1 || isPlaying) return
    const svg = animSvgRef.current
    if (!svg) return
    const { x: xc, y: yc } = (() => { const r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } })()
    const { xp, yp } = physics.canvasToPhysics(xc, yc)

    // 检查是否在 A 锚点附近 (小于 0.45 米)
    const distToA = Math.hypot(xp - X_A, yp - Y_A)
    if (distToA < 0.45) {
      setIsDrawing(true)
      setHandPath([{ x: X_A, y: Y_A }])
      svg.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return
    const svg = animSvgRef.current
    if (!svg) return
    const { x: xc, y: yc } = (() => { const r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } })()
    const { xp, yp } = physics.canvasToPhysics(xc, yc)

    // 限制在下半屏的合理物理界限内
    const xpClamped = Math.max(0.1, Math.min(6.9, xp))
    const ypClamped = Math.max(0.1, Math.min(3.4, yp))

    const distToQ = Math.hypot(xpClamped - X_Q, ypClamped - Y_Q)
    if (distToQ < 0.3) return // 防止路径穿过场源中心点

    const lastPt = handPath[handPath.length - 1]
    const distToLast = Math.hypot(xpClamped - lastPt.x, ypClamped - lastPt.y)

    // 物理距离大于 0.08 米才记录新点
    if (distToLast > 0.08) {
      setHandPath((prev) => [...prev, { x: xpClamped, y: ypClamped }])
    }
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return
    setIsDrawing(false)
    animSvgRef.current?.releasePointerCapture(e.pointerId)

    if (handPath.length < 3) {
      setHandPath([])
      return
    }

    // 没画到B，强行闭合到 B 保持轨道完整
    setHandPath((prev) => [...prev, { x: X_B, y: Y_B }])
  }

  // 上半屏图表的 Hover 交互
  const handleChartPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = chartSvgRef.current
    if (!svg) return
    const { x: xc } = (() => { const r = svg.getBoundingClientRect(); return { x: e.clientX - r.left } })()

    // 计算相对绘图区域的 x 比例
    const relativeX = (xc - physics.chartPadding.left) / physics.chartWidth
    const clampedPct = Math.max(0.0, Math.min(1.0, relativeX))
    updateParam('hoverX', clampedPct)
  }

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col select-none bg-neutral-50 overflow-hidden">
      {/* ==================== 上半屏：图表区域 ==================== */}
      <ElectricPotentialChartScene
        w={w}
        hChart={hChart}
        physics={physics}
        isPlaying={isPlaying}
        particlePhysicsPos={physics.particlePhysicsPos}
        onPointerMove={handleChartPointerMove}
        chartSvgRef={chartSvgRef}
        font={font}
      />

      {/* ==================== 下半屏：动画展示区域 ==================== */}
      <ElectricPotentialAnimScene
        w={w}
        hAnim={hAnim}
        physics={physics}
        drawMode={drawMode}
        isPlaying={isPlaying}
        runProgress={runProgress}
        qProbe={qProbe}
        handPath={handPath}
        handPathD={handPathD}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        animSvgRef={animSvgRef}
        font={font}
      />
    </div>
  )
}
