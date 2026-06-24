import { useEffect, useRef, useState } from 'react'
import { useCanvasSize, PX_PER_METER } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, STROKE, FONT, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { Spring } from '@/components/UI'
import { calculateConnectedBody, calculateConnectedBodyTimeline, GRAVITY } from '@/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'

/** 连接体场景布局常量 */
const LAYOUT = {
  groundOffset: 80,         // 地面距画布底部 (px)
  blockMaxWidth: 65,        // 质量块最大宽度 (px)
  blockWidthRatio: 0.11,    // 质量块宽度占画布比
  blockMaxHeight: 50,       // 质量块最大高度 (px)
  blockHeightRatio: 0.13,   // 质量块高度占画布比
  wheelRadius: 6,           // 车轮半径 (px)
  springMaxStretchRatio: 0.7, // 弹簧最大拉伸占绳长比
  ropeMinLength: 40,        // 绳最小长度 (px)
  ropeLengthRatio: 0.12,    // 绳长占画布比
  startXRatio: 0.15,        // 起始位置占画布比
  endXRatio: 0.85,          // 终止位置占画布比
}

/** 弹簧视觉动效参数（非严格物理量，仅用于动画表现） */
const SPRING_VISUAL = {
  /** 视觉振荡角频率 (rad/s)，调参值非物理推导 */
  visualOmega: 11.5,
  /** 视觉阻尼系数，调参值非物理推导 */
  visualDamping: 1.6,
  /** 张力到像素拉伸的换算系数 */
  tensionToStretchScale: 11,
  /** 弹簧像素拉伸视觉放大系数 */
  stretchVisualScale: 15,
}

export default function ConnectedBodiesAnimation() {
    const {params, time, showVectors, showGrid, isPlaying, setIsPlaying, updateParam} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    showGrid: s.showGrid,
    isPlaying: s.isPlaying,
    setIsPlaying: s.setIsPlaying,
    updateParam: s.updateParam,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.mediumWide)
  const { font } = canvasSize

  const {
    m1 = 2,
    m2 = 3,
    F = 15,
    mu = 0.1,
    advancedMode = 0,
    analysisView = 0, // 0=普通, 1=整体, 2=隔离m1, 3=隔离m2
    connectionType = 0, // 0=细绳, 1=弹簧
  } = params

  // 1. 物理计算（单一来源：calculateConnectedBody）
  const physicsResult = calculateConnectedBody(m1, m2, F, mu, GRAVITY)
  const { isMoving: isMovingPhysically, a: acceleration, T: tension } = physicsResult
  const totalMass = m1 + m2

  // 2. 屏幕自适应布局与行程参数计算
  const animWidth = canvasSize.width
  const animHeight = canvasSize.height
  const groundY = animHeight - LAYOUT.groundOffset

  const startX = animWidth * LAYOUT.startXRatio
  const endX = animWidth * LAYOUT.endXRatio

  // 质量块的宽度自适应
  const w1 = Math.min(LAYOUT.blockMaxWidth, animWidth * LAYOUT.blockWidthRatio)
  const h1 = Math.min(LAYOUT.blockMaxHeight, animHeight * LAYOUT.blockHeightRatio)
  const w2 = Math.min(LAYOUT.blockMaxWidth, animWidth * LAYOUT.blockWidthRatio)
  const h2 = Math.min(LAYOUT.blockMaxHeight, animHeight * LAYOUT.blockHeightRatio)

  const defaultRopeL = Math.max(LAYOUT.ropeMinLength, animWidth * LAYOUT.ropeLengthRatio)

  // 3. 弹簧弹性拉紧与简谐震荡计算（视觉动效，非严格物理模型）
  let springDx = 0
  let effectiveTime = time
  
  if (connectionType === 1) {
    // 简谐震荡公式模拟启动时的收缩拉伸：dx = dx_static * (1 - e^-beta*t * cos(omega*t))
    if (isPlaying && time > 0 && isMovingPhysically) {
      const dxStatic = tension / SPRING_VISUAL.tensionToStretchScale
      springDx = dxStatic * (1 - Math.exp(-SPRING_VISUAL.visualDamping * time) * Math.cos(SPRING_VISUAL.visualOmega * time))
    } else {
      springDx = tension / SPRING_VISUAL.tensionToStretchScale
    }
  }

  // 加上限幅保护，防止弹簧过度拉伸拉爆
  const maxSpringDx = defaultRopeL * LAYOUT.springMaxStretchRatio
  const finalSpringDx = Math.min(maxSpringDx, springDx)

  const currentRopeL = connectionType === 0 ? defaultRopeL : defaultRopeL + finalSpringDx * SPRING_VISUAL.stretchVisualScale

  const totalGroupW = w1 + w2 + currentRopeL
  const maxTravel = Math.max(10, endX - startX - totalGroupW)

  // 恒加速度模式下，动态推算时间终点以刚好触及边界
  const maxDisplacementTime = acceleration > 0.01
    ? Math.sqrt((2 * (maxTravel / PX_PER_METER)) / acceleration)
    : Infinity

  if (advancedMode === 0) {
    effectiveTime = maxDisplacementTime !== Infinity && time >= maxDisplacementTime ? maxDisplacementTime : time
  } else {
    // 进阶模式下，时间到 4s 强制停止
    effectiveTime = Math.min(time, 4.0)
  }

  const isMoving = isPlaying && time > 0 && (advancedMode === 0 ? time < maxDisplacementTime : time < 4.0) && isMovingPhysically

  // 使用 React 副作用安全关闭播放
  useEffect(() => {
    if (!isPlaying) return
    if (advancedMode === 0) {
      if (maxDisplacementTime !== Infinity && time >= maxDisplacementTime) {
        setIsPlaying(false)
      }
    } else {
      if (time >= 4.0) {
        setIsPlaying(false)
      }
    }
  }, [time, maxDisplacementTime, isPlaying, advancedMode, setIsPlaying])

  // 4. 物理位移（纯物理量，单位 m）→ 像素映射
  const timeline = calculateConnectedBodyTimeline(m1, m2, F, mu, GRAVITY, effectiveTime)
  const maxTimeline = calculateConnectedBodyTimeline(m1, m2, F, mu, GRAVITY, advancedMode === 0 ? maxDisplacementTime : 4.0)
  const dispX = maxTimeline.s > 0.001 ? (timeline.s / maxTimeline.s) * maxTravel : 0

  const m1X = startX + dispX
  const m1Y = groundY - h1
  const m2X = m1X + w1 + currentRopeL
  const m2Y = groundY - h2

  // 5. 传动连接部件绘制数据生成
  const ropeLeftX = m1X + w1
  const ropeRightX = m2X
  const ropeY = groundY - h1 / 2

  let connectionSvgElement = null
  if (connectionType === 0) {
    // 细绳：钢丝绳
    connectionSvgElement = (
      <g>
        <line
          x1={ropeLeftX}
          y1={ropeY}
          x2={ropeRightX}
          y2={ropeY}
          stroke={SCENE_COLORS.surface.ropeColor}
          strokeWidth={3}
        />
        {/* 细绳高亮光流束（滑动时流动） */}
        {isMoving && (
          <line
            x1={ropeLeftX}
            y1={ropeY}
            x2={ropeRightX}
            y2={ropeY}
            stroke={SCENE_COLORS.surface.ropeActive}
            strokeWidth={3}
            strokeDasharray="6,4"
            className="animate-pulse"
          />
        )}
      </g>
    )
  } else {
    // 弹簧：统一的 3D 螺旋轻质弹簧组件
    connectionSvgElement = (
      <g>
        <Spring
          x1={ropeLeftX}
          y1={ropeY}
          x2={ropeRightX}
          y2={ropeY}
          coils={12}
          radius={11}
          isLightWeight={true}
        />
        {/* 轻质弹簧文字标注 */}
        <g transform={`translate(${(ropeLeftX + ropeRightX) / 2}, ${ropeY - 16})`}>
          <rect
            x={-38}
            y={-10}
            width={76}
            height={15}
            rx={3}
            fill="white"
            fillOpacity={0.85}
            stroke={SCENE_COLORS.spring.lightCoilStroke}
            strokeWidth={0.5}
          />
          <text
            fontSize={font(9)}
            fill={SCENE_COLORS.spring.lightCoilStroke}
            textAnchor="middle"
            fontWeight="bold"
            y={1}
          >
            轻质弹簧 (m ≈ 0)
          </text>
        </g>
      </g>
    )
  }

  // 6. 车轮滚动旋转角度计算
  const wheelRadius = LAYOUT.wheelRadius
  // 滚动弧度 = 位移 / 半径
  const wheelRotation = wheelRadius > 0 ? (dispX / wheelRadius) * (180 / Math.PI) : 0

  // 绘制带十字辐条的滚动轮子
  const renderWheels = (boxX: number, boxW: number) => {
    const wY = groundY - wheelRadius
    const cx1 = boxX + boxW * 0.22
    const cx2 = boxX + boxW * 0.78
    return (
      <g>
        {/* 轮子一 */}
        <circle cx={cx1} cy={wY} r={wheelRadius} fill={colors.neutral[800]} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
        <circle cx={cx1} cy={wY} r={1.5} fill={colors.neutral.white} />
        <line x1={cx1 - wheelRadius} y1={wY} x2={cx1 + wheelRadius} y2={wY} stroke={colors.neutral.white} strokeWidth={0.8} transform={`rotate(${wheelRotation}, ${cx1}, ${wY})`} />
        <line x1={cx1} y1={wY - wheelRadius} x2={cx1} y2={wY + wheelRadius} stroke={colors.neutral.white} strokeWidth={0.8} transform={`rotate(${wheelRotation}, ${cx1}, ${wY})`} />

        {/* 轮子二 */}
        <circle cx={cx2} cy={wY} r={wheelRadius} fill={colors.neutral[800]} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
        <circle cx={cx2} cy={wY} r={1.5} fill={colors.neutral.white} />
        <line x1={cx2 - wheelRadius} y1={wY} x2={cx2 + wheelRadius} y2={wY} stroke={colors.neutral.white} strokeWidth={0.8} transform={`rotate(${wheelRotation}, ${cx2}, ${wY})`} />
        <line x1={cx2} y1={wY - wheelRadius} x2={cx2} y2={wY + wheelRadius} stroke={colors.neutral.white} strokeWidth={0.8} transform={`rotate(${wheelRotation}, ${cx2}, ${wY})`} />
      </g>
    )
  }

  // 7. 外拉力 F 的鼠标拖拽直接操控手势
  const arrowLength = Math.max(15, (F / 30) * 60)
  const dragTargetX = m2X + w2 + arrowLength

  const cbScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: 0,
    originY: 0,
    refMagnitudes: { force: Math.max(F, 30), friction: Math.max(F, 30), tension: Math.max(F, 30) },
  }
  const cbSceneScale = createSceneScale(cbScene)

  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ clientX: 0, startF: 0 })

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    dragStartRef.current = { clientX: e.clientX, startF: F }
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - dragStartRef.current.clientX
      const deltaF = deltaX / 5.5
      const newF = Math.min(30, Math.max(0, Math.round(dragStartRef.current.startF + deltaF)))
      updateParam('F', newF)
    }

    const handlePointerUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, updateParam])

  // 8. 四种受力分析模式高亮蒙版与包裹框渲染
  const isNormalView = analysisView === 0
  const isSystemView = analysisView === 1
  const isM1View = analysisView === 2
  const isM2View = analysisView === 3

  // 网格线绘制
  const gridLines = []
  if (showGrid) {
    const gridCount = 12
    for (let i = 0; i <= gridCount; i++) {
      const xPos = startX + (i * (animWidth - startX - 50)) / gridCount
      gridLines.push(
        <line
          key={`cb-grid-${i}`}
          x1={xPos}
          y1={30}
          x2={xPos}
          y2={groundY}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={0.5}
          strokeDasharray="3,3"
          opacity={0.3}
        />
      )
    }
  }

  // 力大小文本定义
  const f1_val = parseFloat((physicsResult.f1 ?? physicsResult.f1Max).toFixed(1))
  const f2_val = parseFloat((physicsResult.f2 ?? physicsResult.f2Max).toFixed(1))
  const T_val = parseFloat(tension.toFixed(1))

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      <svg width={animWidth} height={animHeight} className="bg-white rounded-lg shadow-inner">
        {gridLines}

        {/* 粗糙地平线 */}
        <line
          x1={20}
          y1={groundY}
          x2={animWidth - 20}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />
        <rect
          x={20}
          y={groundY}
          width={animWidth - 40}
          height={6}
          fill="url(#ground-pattern)"
          opacity={0.35}
        />

        {/* ==================== 视图一：整体法分析包裹系统框 ==================== */}
        {isSystemView && (
          <g>
            <rect
              x={m1X - 12}
              y={m1Y - 18}
              width={totalGroupW + 24}
              height={h1 + 32}
              fill={CANVAS_COLORS.objectFillNeutral}
              fillOpacity={0.15}
              stroke={CANVAS_COLORS.annotation}
              strokeWidth={1.8}
              strokeDasharray="4,3"
              rx={6}
            />
            {/* 系统信息小标签 */}
            <rect
              x={m1X + totalGroupW / 2 - 40}
              y={m1Y - 32}
              width={80}
              height={18}
              fill={CANVAS_COLORS.annotation}
              rx={3}
            />
            <text
              x={m1X + totalGroupW / 2}
              y={m1Y - 19}
              fontSize={FONT.annotation}
              fill="white"
              textAnchor="middle"
              fontWeight="bold"
            >
              整体 M = {totalMass}kg
            </text>
          </g>
        )}

        {/* ==================== 物体 m1 渲染分组 ==================== */}
        <g opacity={isM2View ? 0.2 : 1} className="transition-opacity duration-200">
          {/* 物体 m1 (太空灰拉丝金属渐变) */}
          <rect
            x={m1X}
            y={m1Y}
            width={w1}
            height={h1 - 6}
            fill="url(#m1-metal-grad)"
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            rx={4}
          />
          {/* 车轮 */}
          {renderWheels(m1X, w1)}
          {/* 质量文本 */}
          <text
            x={m1X + w1 / 2}
            y={m1Y + h1 / 2}
            fontSize={FONT.bodySize}
            fill="white"
            textAnchor="middle"
            fontWeight="bold"
          >
            {m1} kg
          </text>
          {/* 顶部物标 m1 */}
          <text
            x={m1X + w1 / 2}
            y={m1Y - 6}
            fontSize={FONT.axisSize}
            fill={PHYSICS_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            m₁
          </text>
        </g>

        {/* ==================== 传动连接部件 (绳/弹簧) ==================== */}
        {/* 在整体法中，内力 T 淡化不渲染其高亮箭，只显示淡色的细绳 */}
        <g opacity={isSystemView ? 0.22 : (isM1View || isM2View ? 0.9 : 1)} className="transition-opacity duration-200">
          {connectionSvgElement}
        </g>

        {/* ==================== 物体 m2 渲染分组 ==================== */}
        <g opacity={isM1View ? 0.2 : 1} className="transition-opacity duration-200">
          {/* 物体 m2 (琥珀红铜渐变) */}
          <rect
            x={m2X}
            y={m2Y}
            width={w2}
            height={h2 - 6}
            fill="url(#m2-metal-grad)"
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            rx={4}
          />
          {/* 车轮 */}
          {renderWheels(m2X, w2)}
          {/* 质量文本 */}
          <text
            x={m2X + w2 / 2}
            y={m2Y + h2 / 2}
            fontSize={FONT.bodySize}
            fill="white"
            textAnchor="middle"
            fontWeight="bold"
          >
            {m2} kg
          </text>
          {/* 顶部物标 m2 */}
          <text
            x={m2X + w2 / 2}
            y={m2Y - 6}
            fontSize={FONT.axisSize}
            fill={PHYSICS_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            m₂
          </text>
        </g>

        {/* ==================== 力学分析矢量箭头组 ==================== */}
        {showVectors && (
          <g className="transition-all duration-200">
            {/* --- 外力拉力 F (高亮橙红，作用在 m2 的右侧) --- */}
            {/* 在隔离 m1 视图中，外力 F 作用于 m2，故淡化表现 */}
            <g opacity={isM1View ? 0.15 : 1} className="transition-opacity duration-200">
              <VectorArrow
                origin={{ x: m2X + w2, y: -ropeY }}
                vector={{ x: F, y: 0 }}
                type="appliedForce"
                sceneScale={cbSceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                pixelLength={arrowLength}
              />
              <text
                x={dragTargetX + 8}
                y={ropeY + 4}
                fontSize={FONT.bodySize}
                fill={PHYSICS_COLORS.appliedForce}
                fontWeight="bold"
              >
                F = {F}N
              </text>
              {/* 拖拽热区圆圈 */}
              <circle
                cx={dragTargetX}
                cy={ropeY}
                r={12}
                fill={PHYSICS_COLORS.appliedForce}
                opacity={0.0}
                className="cursor-ew-resize hover:opacity-15 active:opacity-30 transition-opacity duration-150"
                onMouseDown={handleDragStart}
              />
            </g>

            {/* --- m1 的左侧摩擦力 f1 (作用在 m1 底板偏左) --- */}
            <g opacity={isM2View ? 0.15 : 1} className="transition-opacity duration-200">
              <VectorArrow
                origin={{ x: m1X, y: -(groundY - 10) }}
                vector={{ x: -f1_val, y: 0 }}
                type="friction"
                sceneScale={cbSceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                pixelLength={28}
              />
              <text
                x={m1X - 32}
                y={groundY - 14}
                fontSize={FONT.annotation}
                fill={PHYSICS_COLORS.friction}
                fontWeight="bold"
                textAnchor="end"
              >
                f₁ = {f1_val.toFixed(1)}N
              </text>
            </g>

            {/* --- m2 的左侧摩擦力 f2 (作用在 m2 底板偏左) --- */}
            <g opacity={isM1View ? 0.15 : 1} className="transition-opacity duration-200">
              <VectorArrow
                origin={{ x: m2X, y: -(groundY - 10) }}
                vector={{ x: -f2_val, y: 0 }}
                type="friction"
                sceneScale={cbSceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                pixelLength={28}
              />
              <text
                x={m2X - 32}
                y={groundY - 14}
                fontSize={FONT.annotation}
                fill={PHYSICS_COLORS.friction}
                fontWeight="bold"
                textAnchor="end"
              >
                f₂ = {f2_val.toFixed(1)}N
              </text>
            </g>

            {/* --- 绳/弹簧内力张力 T (在不同视图中呈现不同作用位置) --- */}
            {/* 整体法不考虑内力，隔离法高亮各侧受力 */}
            {!isSystemView && (
              <g>
                {/* m1 右侧的拉力 T （在隔离m1或普通视图时显示） */}
                {(isNormalView || isM1View) && (
                  <g>
                    <VectorArrow
                      origin={{ x: ropeLeftX, y: -ropeY }}
                      vector={{ x: T_val, y: 0 }}
                      type="tension"
                      sceneScale={cbSceneScale}
                      strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                      pixelLength={28}
                    />
                    <text
                      x={ropeLeftX + 10}
                      y={ropeY - 6}
                      fontSize={FONT.annotation}
                      fill={PHYSICS_COLORS.tension}
                      fontWeight="bold"
                    >
                      T = {T_val.toFixed(1)}N
                    </text>
                  </g>
                )}

                {/* m2 左侧的拉力 T （在隔离m2或普通视图时显示，方向向左） */}
                {(isNormalView || isM2View) && (
                  <g>
                    <VectorArrow
                      origin={{ x: ropeRightX, y: -ropeY }}
                      vector={{ x: -T_val, y: 0 }}
                      type="tension"
                      sceneScale={cbSceneScale}
                      strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                      pixelLength={28}
                    />
                    <text
                      x={ropeRightX - 38}
                      y={ropeY - 6}
                      fontSize={FONT.annotation}
                      fill={PHYSICS_COLORS.tension}
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      T = {T_val.toFixed(1)}N
                    </text>
                  </g>
                )}
              </g>
            )}
          </g>
        )}



        <defs>
          {/* 地面草坪阻力纹路 */}
          <pattern id="ground-pattern" width="10" height="6" patternUnits="userSpaceOnUse">
            <line x1="0" y1="6" x2="6" y2="0" stroke={colors.neutral[300]} strokeWidth="0.8" />
            <line x1="5" y1="6" x2="10" y2="1" stroke={colors.neutral[300]} strokeWidth="0.8" />
          </pattern>

          {/* m1 金属渐变 */}
          <linearGradient id="m1-metal-grad" x1="0" y1="0" x2="1" y2="0">
            {SCENE_COLORS.materials.sliderMetalGrad.map((color, idx) => (
              <stop
                key={`m1m-${idx}`}
                offset={`${(idx / (SCENE_COLORS.materials.sliderMetalGrad.length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </linearGradient>

          {/* m2 铜材质渐变 */}
          <linearGradient id="m2-metal-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SCENE_COLORS.coil.copperLight} />
            <stop offset="30%" stopColor={SCENE_COLORS.coil.copperBase} />
            <stop offset="70%" stopColor={SCENE_COLORS.coil.copperMid} />
            <stop offset="100%" stopColor={SCENE_COLORS.coil.copperDark} />
          </linearGradient>

          {/* 矢量箭头端点定义 */}
          <VectorDefs colors={[PHYSICS_COLORS.appliedForce, PHYSICS_COLORS.friction, PHYSICS_COLORS.tension]} />
        </defs>
      </svg>
      {/* 水平拉力直接拖拽控制小标提示 */}
      {showVectors && (
        <div style={{ fontSize: font(9) }} className="absolute right-4 bottom-14 bg-white/80 border border-neutral-100 px-2 py-0.5 rounded text-neutral-400 font-medium pointer-events-none select-none">
          💡 可用鼠标按住并左右拖拽拉力 F 箭头端点调节大小
        </div>
      )}
    </div>
  )
}
