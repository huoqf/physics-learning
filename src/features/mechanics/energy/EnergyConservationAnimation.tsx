import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useState, useMemo, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS, ENERGY_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { RelationChart } from '@/components/Chart'
import {
  precomputePendulumTrajectory,
  precomputeValleyTrajectory,
  getECStateAtTime,
} from '@/physics/energyConservation'
import { physicsToCanvasWithOrigin } from '@/utils/coordinate'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'
import { PendulumScene } from './PendulumScene'
import { ValleyScene } from './ValleyScene'
import { EnergyConservationBarChart } from './EnergyConservationBarChart'

/**
 * 机械能守恒定律实验室（全新重构美化规范版）
 * 
 * 双场景模式：
 * 1. 模式 0：经典单摆实验（动能与势能无损往复转化）
 * 2. 模式 1：山谷滑行实验室（阻尼过山车与摩擦内能生热能量守恒）
 */
export default function EnergyConservationAnimation() {
    const {params, time, isPlaying, setIsPlaying, showVectors, updateParam, setTime} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    isPlaying: s.isPlaying,
    setIsPlaying: s.setIsPlaying,
    showVectors: s.showVectors,
    updateParam: s.updateParam,
    setTime: s.setTime,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.standard)
  const vp = useViewport(canvasSize, { designWidth: 700, designHeight: 420 })
  const { font } = canvasSize
  const svgRef = useRef<SVGSVGElement>(null)

  const mode = params.mode ?? 0
  const m = params.m ?? 2.0              // kg
  const g = params.g ?? 9.8              // m/s²
  const L = params.L ?? 5.0              // 摆线长度 (m, 模式0)
  const theta0 = params.theta0 ?? 45     // 初始偏角 (度)
  const R = params.R ?? 5.0              // 山谷半径 (m, 模式1)
  const mu = params.mu ?? 0.1            // 摩擦因数 (模式1)
  const tMax = 15                         // 最大模拟时间 15s

  // ── 拖拽状态 Ref ──
  const dragRef = useRef<{
    isDraggingObj: boolean
    isDraggingRefLine: boolean
    startY: number
    startX: number
    startVal: number
  }>({
    isDraggingObj: false,
    isDraggingRefLine: false,
    startY: 0,
    startX: 0,
    startVal: 0,
  })

  const [cursorType, setCursorType] = useState<'default' | 'grab' | 'grabbing' | 'ns-resize'>('default')

  // ── 布局与映射参数 ──
  const padding = vp.visibleW * 0.06
  const wallX = vp.visibleW - padding * 0.8
  // 上半部 52% 为图表，下半部 48% 为动画
  const chartBottom = vp.visibleH * 0.52
  const chartLeft = padding * 1.5
  const chartRight = vp.visibleW - padding
  const chartWidth = chartRight - chartLeft

  // 动画区地面与中心基准
  const groundY = vp.visibleH * 0.85
  const animLeftBoundary = padding * 1.5
  const animRightBoundary = wallX - 110 // 避让右侧卡片
  const animCenterX = (animLeftBoundary + animRightBoundary) / 2
  const objW = vp.visibleW * 0.05
  const objH = objW * 0.6 // 小车更扁更精致

  const animAreaHeight = groundY - chartBottom
  const R_pix_base = animAreaHeight * 0.7     // 基准像素长度（对应 5.0m）
  const activeRadius = mode === 0 ? L : R     // 当前物理半径 (m)
  const refRadius = 5.0                        // 参考半径 (m)
  // R_pix 随物理半径比例缩放，使不同摆长/轨道半径在画布上呈现不同视觉长度
  const R_pix = Math.min(
    Math.max(R_pix_base * (activeRadius / refRadius), animAreaHeight * 0.25),
    animAreaHeight * 0.9
  )

  // 模式 0 悬挂点与摆线
  const hangY = vp.visibleH * 0.55 + 15

  // 模式 1 山谷轨道圆心
  const valleyCenterY = groundY - R_pix

  // ── 物理坐标转换参数 ──
  const R_model = mode === 0 ? L : R       // 当前模式下的轨道半径 (m)
  const physScale = R_pix / R_model        // 物理→像素比例尺 (px/m)
  const pivotX = animCenterX               // 物理原点 X (px)
  const pivotY = mode === 0 ? hangY : valleyCenterY // 物理原点 Y (px)

  // 摆球或滑块像素坐标（通过 physicsToCanvasWithOrigin 转换，符合铁律 1.2）
  const getObjectPixelPos = (thetaRad: number) => {
    const physX = R_model * Math.sin(thetaRad)
    const physY = -R_model * Math.cos(thetaRad)
    const { cx, cy } = physicsToCanvasWithOrigin(physX, physY, pivotX, pivotY, physScale)
    return { x: cx, y: cy }
  }

  // ── 预计算物理轨迹与插值 ──
  const trajectory = useMemo(() => {
    if (mode === 0) {
      return precomputePendulumTrajectory(m, L, theta0, g, tMax)
    } else {
      return precomputeValleyTrajectory(m, R, mu, theta0, g, tMax)
    }
  }, [mode, m, g, L, theta0, R, mu])

  const state = useMemo(
    () => getECStateAtTime(trajectory, time),
    [trajectory, time]
  )

  // 获取零势能面及偏移量参数
  const hRef = params.hRef ?? 0.0
  const E_offset = m * g * hRef
  const Ep_adj = state.Ep - E_offset
  const Etot_adj = state.Etot - E_offset

  const lowestY = mode === 0 ? hangY + R_pix : groundY
  const yRefLine = lowestY - hRef * physScale

  // ── 拖拽响应事件 ──
  const handleMouseDown = (e: React.MouseEvent<SVGElement>) => {
    if (isPlaying) return

    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // 1. 检查是否点击在零势能面附近
    if (Math.abs(mouseY - yRefLine) <= 8) {
      dragRef.current = {
        isDraggingObj: false,
        isDraggingRefLine: true,
        startY: mouseY,
        startX: mouseX,
        startVal: hRef,
      }
      setCursorType('ns-resize')
      return
    }

    // 2. 检查是否点击在摆球或滑块上
    const pos = getObjectPixelPos(state.theta)
    const isOverObj =
      mode === 0
        ? Math.hypot(mouseX - pos.x, mouseY - pos.y) <= 18
        : mouseX >= pos.x - objW * 0.6 &&
          mouseX <= pos.x + objW * 0.6 &&
          mouseY >= pos.y - objH - 5 &&
          mouseY <= pos.y + 10

    if (isOverObj) {
      dragRef.current = {
        isDraggingObj: true,
        isDraggingRefLine: false,
        startY: mouseY,
        startX: mouseX,
        startVal: theta0,
      }
      setCursorType('grabbing')
    }
  }

  const getCursorType = (mouseX: number, mouseY: number, hRefVal: number): 'default' | 'grab' | 'grabbing' | 'ns-resize' => {
    if (isPlaying) return 'default'
    if (dragRef.current.isDraggingRefLine) return 'ns-resize'
    if (dragRef.current.isDraggingObj) return 'grabbing'

    const curLowestY = mode === 0 ? hangY + R_pix : groundY
    const curYRefLine = curLowestY - hRefVal * physScale
    if (Math.abs(mouseY - curYRefLine) <= 8) {
      return 'ns-resize'
    }

    const pos = getObjectPixelPos(state.theta)
    const isOverObj =
      mode === 0
        ? Math.hypot(mouseX - pos.x, mouseY - pos.y) <= 18
        : mouseX >= pos.x - objW * 0.6 &&
          mouseX <= pos.x + objW * 0.6 &&
          mouseY >= pos.y - objH - 5 &&
          mouseY <= pos.y + 10

    if (isOverObj) return 'grab'
    return 'default'
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    if (dragRef.current.isDraggingRefLine) {
      const dy = mouseY - dragRef.current.startY
      let nextHRef = dragRef.current.startVal - dy / physScale
      const maxHRef = R_model * 1.2
      nextHRef = Math.max(-2.0, Math.min(maxHRef, nextHRef))
      updateParam('hRef', nextHRef)
      setCursorType('ns-resize')
      return
    }

    if (dragRef.current.isDraggingObj) {
      const centerY = mode === 0 ? hangY : valleyCenterY
      const dx = mouseX - animCenterX
      const dy = mouseY - centerY
      
      // 计算拖拉对应的偏角 (rad -> deg)
      const thetaRad = Math.atan2(dx, dy)
      let thetaDeg = (thetaRad * 180) / Math.PI

      // 限制拖拽边界
      const limit = mode === 0 ? 60 : 70
      thetaDeg = Math.max(-limit, Math.min(limit, thetaDeg))

      updateParam('theta0', Math.round(thetaDeg))
      setTime(0)
      setIsPlaying(false)
      setCursorType('grabbing')
      return
    }

    setCursorType(getCursorType(mouseX, mouseY, hRef))
  }

  const handleMouseUpOrLeave = () => {
    dragRef.current = {
      isDraggingObj: false,
      isDraggingRefLine: false,
      startY: 0,
      startX: 0,
      startVal: 0,
    }
    setCursorType('default')
  }

  // ── 柱状图高度及范围 ──
  const initialTotalEnergy = trajectory.length > 0 ? trajectory[0].Etot : 10
  const maxEnergy = Math.max(initialTotalEnergy * 1.15, 10)
  const maxBarH = 55

  const barEk_H = (state.Ek / maxEnergy) * maxBarH
  const barEp_H = (Ep_adj / maxEnergy) * maxBarH
  const barQ_H = (state.Q / maxEnergy) * maxBarH
  const barTot_H = (Etot_adj / maxEnergy) * maxBarH

  const visiblePoints = useMemo(
    () => trajectory.filter(p => p.t <= time + 0.01),
    [trajectory, time]
  )

  // ── 速度矢量缩放参考 ──
  // 理论最大速度（由能量守恒导出）
  const maxV = mode === 0
    ? Math.sqrt(2 * g * L * (1 - Math.cos(theta0 * Math.PI / 180)))
    : Math.sqrt(2 * g * R * (1 - Math.cos(theta0 * Math.PI / 180)))

  const objPos = getObjectPixelPos(state.theta)
  const thetaDeg = (state.theta * 180) / Math.PI



  // 绘制山谷 150° 对称轨道线
  const arcLimitDeg = 72
  const arcStartX = animCenterX - R_pix * Math.sin(arcLimitDeg * Math.PI / 180)
  const arcStartY = valleyCenterY + R_pix * Math.cos(arcLimitDeg * Math.PI / 180)
  const arcEndX = animCenterX + R_pix * Math.sin(arcLimitDeg * Math.PI / 180)
  const arcEndY = valleyCenterY + R_pix * Math.cos(arcLimitDeg * Math.PI / 180)

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: { x: 0, y: 0, width: vp.visibleW, height: vp.visibleH },
    originX: 0,
    originY: 0,
    worldWidth: vp.visibleW,
    worldHeight: vp.visibleH,
  }), [vp.visibleW, vp.visibleH]);
  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig]);

  // 动态 Y 范围计算
  const chartYMin = Math.min(0, -E_offset) * 1.1
  const chartYMax = Math.max(initialTotalEnergy, initialTotalEnergy - E_offset) * 1.15
  const dynamicYDomain: [number, number] = [chartYMin, Math.max(chartYMax, 10)]

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
      {/* 拖拽交互提示气泡 */}
      {!isPlaying && (
        <div className="absolute top-3 right-4 alert-card-neutral py-1 px-2.5 font-semibold pointer-events-none z-10" style={{ fontSize: font(9) }}>
          鼠标拖动 {mode === 0 ? '摆球' : '滑块'} 改变初始角，拖拽“零势能面”演示重力势能相对性
        </div>
      )}


      {/* 主 SVG 画面 */}
      <svg
        ref={svgRef}
        width={vp.visibleW}
        height={vp.visibleH}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{ cursor: cursorType }}
        className="bg-transparent"
      >
        <defs>
          {/* 小车材质 */}
          <linearGradient id="block-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.woodSphereGrad[0]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.woodSphereGrad[1]} />
          </linearGradient>
          {/* 单摆摆球径向渐变 */}
          <radialGradient id="pendulum-bob-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.pendulumBob.gradient[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.sphere.pendulumBob.gradient[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.sphere.pendulumBob.gradient[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.pendulumBob.gradient[3]} />
          </radialGradient>
        </defs>

        {/* ══════════════════════════════════════════════ */}
        {/* 上半部分：图表区（RelationChart） */}
        {/* ══════════════════════════════════════════════ */}
        <foreignObject x={chartLeft - 30} y={0} width={chartWidth + 30} height={chartBottom + 15}>
          <div style={{ width: '100%', height: '100%' }}>
            <RelationChart
              points={visiblePoints.map(p => ({ x: p.t, y: p.Ep - E_offset }))}
              additionalSeries={[
                {
                  points: visiblePoints.map(p => ({ x: p.t, y: p.Ek })),
                  label: 'Ek (动能)',
                  series: 'secondary',
                  color: PHYSICS_COLORS.kineticEnergy,
                },
                ...(mode === 1
                  ? [{
                      points: visiblePoints.map(p => ({ x: p.t, y: p.Q })),
                      label: 'Q (内能)',
                      series: 'secondary' as const,
                      color: ENERGY_COLORS.internalEnergy,
                    }]
                  : []),
                {
                  points: visiblePoints.map(p => ({ x: p.t, y: p.Etot - E_offset })),
                  label: mode === 0 ? 'E (总机械能)' : 'E总 (总能量)',
                  series: 'secondary' as const,
                  color: colors.neutral[500],
                  strokeDasharray: [4, 2],
                  strokeWidth: 1.2,
                },
              ]}
              xDomain={[0, tMax]}
              yDomain={dynamicYDomain}
              xLabel="t (s)"
              yLabel="E (J)"
              title={mode === 0 ? 'E-t (单摆动能/重力势能及机械能消长守恒图)' : 'E-t (山谷阻尼动能/势能/内能及总能量守恒图)'}
              color={PHYSICS_COLORS.potentialEnergy}
              cursorX={state.t}
              cursorLabel={() => null}
            />
          </div>
        </foreignObject>

        {/* ══════════════════════════════════════════════ */}
        {/* 下半部分：动画区 */}
        {/* ══════════════════════════════════════════════ */}

        {mode === 0 ? (
          <PendulumScene
            animCenterX={animCenterX}
            hangY={hangY}
            R_pix={R_pix}
            objPos={objPos}
            state={state}
            showVectors={showVectors}
            maxV={maxV}
            sceneScale={sceneScale}
            yRefLine={yRefLine}
            hRef={hRef}
            font={font}
            handleMouseDown={handleMouseDown}
          />
        ) : (
          <ValleyScene
            animCenterX={animCenterX}
            groundY={groundY}
            R_pix={R_pix}
            arcStartX={arcStartX}
            arcStartY={arcStartY}
            arcEndX={arcEndX}
            arcEndY={arcEndY}
            objPos={objPos}
            objW={objW}
            objH={objH}
            thetaDeg={thetaDeg}
            state={state}
            m={m}
            showVectors={showVectors}
            maxV={maxV}
            sceneScale={sceneScale}
            yRefLine={yRefLine}
            hRef={hRef}
            font={font}
            handleMouseDown={handleMouseDown}
          />
        )}

        {/* ── 三柱/四柱能量守恒验证面板卡片 ── */}
        <EnergyConservationBarChart
          mode={mode}
          wallX={wallX}
          vpVisibleH={vp.visibleH}
          state={state}
          Ep_adj={Ep_adj}
          Etot_adj={Etot_adj}
          barEk_H={barEk_H}
          barEp_H={barEp_H}
          barQ_H={barQ_H}
          barTot_H={barTot_H}
          font={font}
        />
      </svg>
    </div>
  )
}
