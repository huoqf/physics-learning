import { useCanvasSize } from '@/utils'
import { useState, useMemo, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS, STROKE, CHART_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { KatexFormula } from '@/components/UI'
import {
  precomputePendulumTrajectory,
  precomputeValleyTrajectory,
  getECStateAtTime,
} from '@/physics/energyConservation'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

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
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 420 })
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
    isDragging: boolean
    startY: number
    startX: number
    startVal: number
  }>({
    isDragging: false,
    startY: 0,
    startX: 0,
    startVal: 0,
  })

  const [isHovered, setIsHovered] = useState(false)

  // ── 布局与映射参数 ──
  const padding = canvasSize.width * 0.06
  const wallX = canvasSize.width - padding * 0.8
  const fontSize = Math.max(10, canvasSize.width * 0.016)
  const smallFont = Math.max(9, fontSize * 0.8)

  // 上半部 52% 为图表，下半部 48% 为动画
  const chartTop = canvasSize.height * 0.06
  const chartBottom = canvasSize.height * 0.52
  const chartLeft = padding * 1.5
  const chartRight = canvasSize.width - padding
  const chartWidth = chartRight - chartLeft

  // 动画区地面与中心基准
  const groundY = canvasSize.height * 0.85
  const animLeftBoundary = padding * 1.5
  const animRightBoundary = wallX - 110 // 避让右侧卡片
  const animCenterX = (animLeftBoundary + animRightBoundary) / 2
  const objW = canvasSize.width * 0.07
  const objH = objW * 0.7 // 小车扁一点

  const animAreaHeight = groundY - chartBottom
  const R_pix = animAreaHeight * 0.7 // 摆线长度占动画区高度的 70%

  // 模式 0 悬挂点与摆线
  const hangY = canvasSize.height * 0.55 + 15

  // 模式 1 山谷轨道圆心
  const valleyCenterY = groundY - R_pix

  // 摆球或滑块坐标映射
  const getObjectPixelPos = (thetaRad: number) => {
    if (mode === 0) {
      return {
        x: animCenterX + R_pix * Math.sin(thetaRad),
        y: hangY + R_pix * Math.cos(thetaRad),
      }
    } else {
      return {
        x: animCenterX + R_pix * Math.sin(thetaRad),
        y: valleyCenterY + R_pix * Math.cos(thetaRad),
      }
    }
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

  // ── 拖拽响应事件 ──
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (isPlaying) return

    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // 检查是否点击在摆球或滑块上
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
        isDragging: true,
        startY: mouseY,
        startX: mouseX,
        startVal: theta0,
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    if (dragRef.current.isDragging) {
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
      return
    }

    if (isPlaying) {
      setIsHovered(false)
      return
    }

    // 判断 Hover 状态
    const pos = getObjectPixelPos(state.theta)
    const isOverObj =
      mode === 0
        ? Math.hypot(mouseX - pos.x, mouseY - pos.y) <= 18
        : mouseX >= pos.x - objW * 0.6 &&
          mouseX <= pos.x + objW * 0.6 &&
          mouseY >= pos.y - objH - 5 &&
          mouseY <= pos.y + 10

    setIsHovered(isOverObj)
  }

  const handleMouseUpOrLeave = () => {
    dragRef.current = {
      isDragging: false,
      startY: 0,
      startX: 0,
      startVal: 0,
    }
  }

  // ── 三柱能量对比柱参数 ──
  const initialE = mode === 0 ? m * g * L * (1 - Math.cos((theta0 * Math.PI) / 180)) : m * g * R * (1 - Math.cos((theta0 * Math.PI) / 180))
  const maxEnergy = Math.max(initialE * 1.15, 10)
  const maxBarH = 55

  const barEk_H = (state.Ek / maxEnergy) * maxBarH
  const barEp_H = (state.Ep / maxEnergy) * maxBarH
  // 第三柱：单摆为机械能，山谷为总能量 (机械能+内能)
  const barTot_H = (state.Etot / maxEnergy) * maxBarH

  // ── 图表曲线 Y 映射 ──
  const toChartX = (t: number) => chartLeft + (t / tMax) * chartWidth
  const toChartY = (energyVal: number) => chartBottom - (energyVal / maxEnergy) * (chartBottom - chartTop - 15)

  const visiblePoints = useMemo(
    () => trajectory.filter(p => p.t <= time + 0.01),
    [trajectory, time]
  )

  const objPos = getObjectPixelPos(state.theta)
  const thetaDeg = (state.theta * 180) / Math.PI

  // ── 随动公式 ──
  const getLiveFormula = () => {
    if (mode === 0) {
      return `E = E_k + E_p = ${state.Etot.toFixed(1)}\\text{J}`;
    } else {
      return `E_{\\text{总}} = E_{\\text{机}} + Q = ${state.Etot.toFixed(1)}\\text{J}`;
    }
  }

  // 绘制山谷 150° 对称轨道线
  const arcLimitDeg = 72
  const arcStartX = animCenterX - R_pix * Math.sin(arcLimitDeg * Math.PI / 180)
  const arcStartY = valleyCenterY + R_pix * Math.cos(arcLimitDeg * Math.PI / 180)
  const arcEndX = animCenterX + R_pix * Math.sin(arcLimitDeg * Math.PI / 180)
  const arcEndY = valleyCenterY + R_pix * Math.cos(arcLimitDeg * Math.PI / 180)

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: 0,
    originY: 0,
    worldWidth: canvasSize.width,
    worldHeight: canvasSize.height,
  }), [canvasSize.width, canvasSize.height]);
  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
      {/* 拖拽交互提示气泡 */}
      {!isPlaying && (
        <div className="absolute top-3 right-4 px-2 py-0.5 bg-neutral-50 text-neutral-400 font-semibold rounded border pointer-events-none z-10 animate-pulse" style={{ fontSize: font(9) }}>
          💡 鼠标按住并左右摆动 {mode === 0 ? '摆球' : '滑块'} 可自由调节起摆初始角度
        </div>
      )}

      {/* 随物块移动的实时物理公式 */}
      <div
        className="absolute bg-white/95 px-2 py-0.5 rounded shadow-sm border border-neutral-200 pointer-events-none z-10 transition-all duration-100 ease-out"
        style={{
          left: `${objPos.x}px`,
          bottom: mode === 0 ? `${canvasSize.height - objPos.y + 18}px` : `${canvasSize.height - objPos.y + objH + 12}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <span style={{ fontSize: font(10) }}>
          <KatexFormula
            formula={getLiveFormula()}
            mode="inline"
            className="text-violet-700 font-semibold"
          />
        </span>
      </div>

      {/* 主 SVG 画面 */}
      <svg
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{ cursor: isHovered ? 'grab' : 'default' }}
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
        {/* 上半部分：图表区 */}
        {/* ══════════════════════════════════════════════ */}
        <g>
          <text x={chartLeft} y={chartTop - 4} fontSize={smallFont} fill={PHYSICS_COLORS.mechanicalEnergy} fontWeight="bold">
            {mode === 0 ? 'E-t (单摆动能/重力势能及机械能消长守恒图)' : 'E-t (山谷阻尼动能/势能/内能及总能量守恒图)'}
          </text>
          
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
          <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

          {/* 刻度 */}
          {[0, 0.5, 1].map((frac, i) => {
            const energyVal = maxEnergy * frac
            const y = toChartY(energyVal)
            return (
              <g key={`ep-y-${i}`}>
                <line x1={chartLeft - 3} y1={y} x2={chartLeft} y2={y} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                <text x={chartLeft - 5} y={y + 3} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="end">
                  {energyVal.toFixed(0)}J
                </text>
              </g>
            )
          })}
          {[0, 0.5, 1].map((frac, i) => {
            const tVal = tMax * frac
            const xPos = toChartX(tVal)
            return (
              <g key={`ep-x-${i}`}>
                <line x1={xPos} y1={chartBottom} x2={xPos} y2={chartBottom + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                <text x={xPos} y={chartBottom + 9} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="middle">{tVal.toFixed(0)}s</text>
              </g>
            )
          })}

          {/* 图例 */}
          <g transform={`translate(${chartRight - (mode === 0 ? 180 : 235)}, ${chartTop - 12})`}>
            <line x1={0} y1={3} x2={8} y2={3} stroke={PHYSICS_COLORS.potentialEnergy} strokeWidth={1.5} />
            <text x={12} y={5} fontSize={font(7)} fill={CHART_COLORS.tickLabel}>Ep (重力势能)</text>

            <line x1={65} y1={3} x2={73} y2={3} stroke={PHYSICS_COLORS.kineticEnergy} strokeWidth={1.5} />
            <text x={77} y={5} fontSize={font(7)} fill={CHART_COLORS.tickLabel}>Ek (动能)</text>

            {mode === 1 && (
              <>
                <line x1={115} y1={3} x2={123} y2={3} stroke={colors.danger[600]} strokeWidth={1.5} />
                <text x={127} y={5} fontSize={font(7)} fill={CHART_COLORS.tickLabel}>Q (内能/摩擦热)</text>
              </>
            )}

            <line x1={mode === 0 ? 115 : 180} y1={3} x2={mode === 0 ? 123 : 188} y2={3} stroke={colors.neutral[500]} strokeWidth={1.5} strokeDasharray="3,1" />
            <text x={mode === 0 ? 127 : 192} y={5} fontSize={font(7)} fill={CHART_COLORS.tickLabel}>
              {mode === 0 ? 'E (总机械能)' : 'E总 (总能量)'}
            </text>
          </g>

          {/* 曲线绘制 */}
          {visiblePoints.length >= 2 && (
            <g>
              {/* 1. 重力势能 Ep */}
              <polyline
                points={visiblePoints.map(p => `${toChartX(p.t)},${toChartY(p.Ep)}`).join(' ')}
                fill="none"
                stroke={PHYSICS_COLORS.potentialEnergy}
                strokeWidth={STROKE.chartMain}
              />
              {/* 2. 动能 Ek */}
              <polyline
                points={visiblePoints.map(p => `${toChartX(p.t)},${toChartY(p.Ek)}`).join(' ')}
                fill="none"
                stroke={PHYSICS_COLORS.kineticEnergy}
                strokeWidth={STROKE.chartMain}
              />
              {/* 3. 内能 Q (仅在山谷模式下绘制) */}
              {mode === 1 && (
                <polyline
                  points={visiblePoints.map(p => `${toChartX(p.t)},${toChartY(p.Q)}`).join(' ')}
                  fill="none"
                  stroke={colors.danger[600]}
                  strokeWidth={STROKE.chartMain}
                />
              )}
              {/* 4. 总能量 Etot */}
              <polyline
                points={visiblePoints.map(p => `${toChartX(p.t)},${toChartY(p.Etot)}`).join(' ')}
                fill="none"
                stroke={colors.neutral[500]}
                strokeWidth={1.2}
                strokeDasharray="4,2"
              />
            </g>
          )}

          {/* 同步亮点 */}
          <circle cx={toChartX(state.t)} cy={toChartY(state.Ep)} r={3} fill={PHYSICS_COLORS.potentialEnergy} stroke={colors.neutral.white} strokeWidth={1} />
          <circle cx={toChartX(state.t)} cy={toChartY(state.Ek)} r={3} fill={PHYSICS_COLORS.kineticEnergy} stroke={colors.neutral.white} strokeWidth={1} />
          {mode === 1 && <circle cx={toChartX(state.t)} cy={toChartY(state.Q)} r={3} fill={colors.danger[600]} stroke={colors.neutral.white} strokeWidth={1} />}
        </g>

        {/* ══════════════════════════════════════════════ */}
        {/* 下半部分：动画区 */}
        {/* ══════════════════════════════════════════════ */}

        {mode === 0 ? (
          // ─── 经典单摆动画场景 ───
          <g>
            {/* 顶部悬挂支架 */}
            <rect x={animCenterX - 20} y={hangY - 12} width={40} height={12} fill={colors.neutral[400]} rx={1} />
            <line x1={animCenterX - 30} y1={hangY} x2={animCenterX + 30} y2={hangY} stroke={colors.neutral[600]} strokeWidth={2} />

            {/* 运动极限虚导线范围 */}
            <path
              d={`M ${animCenterX - R_pix * Math.sin(60 * Math.PI / 180)} ${hangY + R_pix * Math.cos(60 * Math.PI / 180)} A ${R_pix} ${R_pix} 0 0 0 ${animCenterX + R_pix * Math.sin(60 * Math.PI / 180)} ${hangY + R_pix * Math.cos(60 * Math.PI / 180)}`}
              fill="none"
              stroke={colors.neutral[100]}
              strokeWidth={1}
              strokeDasharray="3,3"
            />

            {/* 零势能基准底线（最低点） */}
            <line
              x1={animCenterX - 110}
              y1={hangY + R_pix}
              x2={animCenterX + 110}
              y2={hangY + R_pix}
              stroke={colors.success[500]}
              strokeWidth={0.8}
              strokeDasharray="3,2"
              opacity={0.7}
            />
            <text x={animCenterX} y={hangY + R_pix + 10} fontSize={font(7.5)} fill={colors.success[700]} textAnchor="middle">
              参考零势能面 (y=0)
            </text>

            {/* 摆线 */}
            <line
              x1={animCenterX}
              y1={hangY}
              x2={objPos.x}
              y2={objPos.y}
              stroke={colors.neutral[700]}
              strokeWidth={1.2}
            />
            {/* 轴心点 */}
            <circle cx={animCenterX} cy={hangY} r={3} fill={colors.neutral[800]} />

            {/* 摆球 */}
            <circle
              cx={objPos.x}
              cy={objPos.y}
              r={12}
              fill="url(#pendulum-bob-grad)"
              stroke={SCENE_COLORS.sphere.pendulumBob.stroke}
              strokeWidth={1.5}
            />
            
            {/* 切向速度矢量 v */}
            {showVectors && Math.abs(state.v) > 0.15 && (
              <VectorArrow
                origin={{ x: objPos.x, y: -objPos.y }}
                vector={{ x: Math.cos(state.theta) * state.v * 7, y: Math.sin(state.theta) * state.v * 7 }}
                type="velocity"
                sceneScale={sceneScale}
                pixelLength={Math.sqrt((Math.cos(state.theta) * state.v * 7) ** 2 + (-Math.sin(state.theta) * state.v * 7) ** 2)}
              />
            )}
          </g>
        ) : (
          // ─── 山谷滑行过山车场景 ───
          <g>
            {/* 凹圆弧轨道线 */}
            <path
              d={`M ${arcStartX} ${arcStartY} A ${R_pix} ${R_pix} 0 0 0 ${arcEndX} ${arcEndY}`}
              fill="none"
              stroke={PHYSICS_COLORS.labelText}
              strokeWidth={STROKE.groundLine}
            />
            <path
              d={`M ${arcStartX} ${arcStartY} A ${R_pix} ${R_pix} 0 0 0 ${arcEndX} ${arcEndY}`}
              fill="none"
              stroke={colors.neutral[100]}
              strokeWidth={0.5}
              opacity={0.8}
            />

            {/* 底部零势能参考虚线 */}
            <line
              x1={animCenterX - 110}
              y1={groundY}
              x2={animCenterX + 110}
              y2={groundY}
              stroke={colors.success[500]}
              strokeWidth={0.8}
              strokeDasharray="3,2"
              opacity={0.7}
            />
            <text x={animCenterX} y={groundY + 10} fontSize={font(7.5)} fill={colors.success[700]} textAnchor="middle">
              谷底零势能面 (y=0)
            </text>

            {/* 小车（沿圆弧贴紧滑行，并顺着切向倾角旋转） */}
            <g transform={`translate(${objPos.x}, ${objPos.y}) rotate(${-thetaDeg}) translate(${-objW / 2}, ${-objH})`}>
              {/* 木车身 */}
              <rect width={objW} height={objH - 1} rx={2} fill="url(#block-grad)" stroke={SCENE_COLORS.materials.woodSphereGrad[1]} strokeWidth={1.5} />
              
              <text x={objW * 0.5} y={objH * 0.6} fontSize={smallFont - 0.5} fill={colors.neutral[800]} fontWeight="bold" textAnchor="middle">
                {m.toFixed(1)}kg
              </text>
              {/* 轮子 */}
              <circle cx={objW * 0.25} cy={objH - 0.5} r={2} fill={colors.neutral[800]} />
              <circle cx={objW * 0.75} cy={objH - 0.5} r={2} fill={colors.neutral[800]} />

              {/* 切向速度矢量 v */}
              {showVectors && Math.abs(state.v) > 0.1 && (
                <VectorArrow
                  origin={{ x: objW * 0.5, y: -(objH + 3) }}
                  vector={{ x: state.v * 7, y: 0 }}
                  type="velocity"
                  sceneScale={sceneScale}
                  pixelLength={Math.sqrt((state.v * 7) ** 2 + 0)}
                />
              )}
            </g>

            {/* 阶段状态指示：卡死停在坡上时闪烁提示 */}
            {state.phase === 1 && (
              <g transform={`translate(${animCenterX - 45}, ${groundY - 110})`}>
                <rect width={90} height={18} rx={3} fill="rgba(239, 68, 68, 0.08)" stroke="rgba(239, 68, 68, 0.4)" strokeWidth={0.8} />
                <text x={45} y={12} fontSize={font(7.5)} fontWeight="bold" textAnchor="middle" fill={colors.danger[700]}>
                  ⚠️ 摩擦受力平衡已静止
                </text>
              </g>
            )}
          </g>
        )}

        {/* ── 三柱能量守恒验证面板卡片 ── */}
        <g transform={`translate(${wallX - 90}, ${canvasSize.height * 0.58})`}>
          {/* 半透明白底毛玻璃 */}
          <rect width={90} height={85} rx={6} fill={SCENE_COLORS.labels.glassPanelBg} stroke={colors.neutral[200]} strokeWidth={0.8} />

          <g transform="translate(0, 65)">
            <line x1={8} y1={0} x2={82} y2={0} stroke={colors.neutral[400]} strokeWidth={0.8} />

            {/* 柱 1：动能 Ek (青色) */}
            <rect
              x={12}
              y={-barEk_H}
              width={14}
              height={Math.max(barEk_H, 0.5)}
              fill={PHYSICS_COLORS.kineticEnergy}
              opacity={0.85}
              rx={0.5}
            />
            <text x={19} y={-barEk_H - 4} fontSize={font(7.5)} fill={PHYSICS_COLORS.kineticEnergy} textAnchor="middle" fontWeight="bold">
              {state.Ek.toFixed(0)}
            </text>
            <text x={19} y={12} fontSize={font(7.5)} fill={PHYSICS_COLORS.kineticEnergy} textAnchor="middle" fontWeight="semibold">
              Ek
            </text>

            {/* 柱 2：重力势能 Ep (紫色) */}
            <rect
              x={38}
              y={-barEp_H}
              width={14}
              height={Math.max(barEp_H, 0.5)}
              fill={PHYSICS_COLORS.potentialEnergy}
              opacity={0.85}
              rx={0.5}
            />
            <text x={45} y={-barEp_H - 4} fontSize={font(7.5)} fill={PHYSICS_COLORS.potentialEnergy} textAnchor="middle" fontWeight="bold">
              {state.Ep.toFixed(0)}
            </text>
            <text x={45} y={12} fontSize={font(7.5)} fill={PHYSICS_COLORS.potentialEnergy} textAnchor="middle" fontWeight="semibold">
              Ep
            </text>

            {/* 柱 3：总能量 Etot (深灰色) */}
            <rect
              x={64}
              y={-barTot_H}
              width={14}
              height={Math.max(barTot_H, 0.5)}
              fill={colors.neutral[500]}
              opacity={0.85}
              rx={0.5}
            />
            <text x={71} y={-barTot_H - 4} fontSize={font(7.5)} fill={colors.neutral[600]} textAnchor="middle" fontWeight="bold">
              {state.Etot.toFixed(0)}
            </text>
            <text x={71} y={12} fontSize={font(7.5)} fill={colors.neutral[600]} textAnchor="middle" fontWeight="semibold">
              {mode === 0 ? 'E机' : 'E总'}
            </text>
          </g>
        </g>
      </svg>
    </div>
  )
}
