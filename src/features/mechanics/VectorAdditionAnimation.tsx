import { useRef, useState, useEffect } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { canvasToPhysics } from '@/utils/coordinate'
import { useVectorAdditionPhysics } from './useVectorAdditionPhysics'

// 特殊磁力吸附角度定义
const SNAP_ANGLES = [0, 30, 45, 60, 90, 120, 150, 180]
const SNAP_ANGLE_THRESHOLD = 2.5 // 角度吸附门槛（度）
const SNAP_FORCE_THRESHOLD = 0.15 // 大小吸附门槛（N）

export default function VectorAdditionAnimation() {
  const { params, showVectors, showFormulas, showGrid, isPlaying, time, updateParam } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 450 })
  const svgRef = useRef<SVGSVGElement>(null)

  // 1. 获取当前力学参数（未设定时使用 Registry 默认值）
  const f1 = params.f1 ?? 10
  const f2 = params.f2 ?? 8
  const angle = params.angle ?? 60
  const mode = params.mode ?? 0 // 0 = 平行四边形, 1 = 三角形, 2 = 正交分解
  
  const scale = 15 // 1 N = 15 px

  // 2. 调用计算型 Hook 包装物理及坐标换算逻辑（新规范）
  const physicsData = useVectorAdditionPhysics({
    f1,
    f2,
    angle,
    mode,
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
    scale,
    time,
    isPlaying,
  })

  // 3. 拖拽交互状态管理
  const [activeDrag, setActiveDrag] = useState<'f1' | 'f2' | 'f' | null>(null)

  // 处理手势按下
  const handleDragStart = (target: 'f1' | 'f2' | 'f', e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setActiveDrag(target)
  }

  // 核心拖动处理函数（含精密吸附）
  const handleDragMove = (clientX: number, clientY: number) => {
    if (!activeDrag || !svgRef.current || canvasSize.width === 0) return

    const rect = svgRef.current.getBoundingClientRect()
    const cx = clientX - rect.left
    const cy = clientY - rect.top

    // 转换为物理坐标 (px, py)
    const { x: px, y: py } = canvasToPhysics(cx, cy, canvasSize.width, canvasSize.height, scale)

    if (activeDrag === 'f1') {
      // ===== 拖拽 F1 (分力 1) =====
      // 力的合成模式下，F1 始终沿 x 轴正方向，拖拽只能改变其大小
      let newF1 = px
      
      // 大小吸附（接近 0.5N 整数倍时吸附）
      const roundedF1 = Math.round(newF1 * 2) / 2
      if (Math.abs(newF1 - roundedF1) < SNAP_FORCE_THRESHOLD) {
        newF1 = roundedF1
      }
      
      // 限幅限制 [1, 20]
      newF1 = Math.max(1, Math.min(20, newF1))
      updateParam('f1', newF1)
    } else if (activeDrag === 'f2') {
      // ===== 拖拽 F2 (分力 2) =====
      // 力的合成模式下，F2 可以自由旋转并拉伸
      let rawF2 = Math.sqrt(px * px + py * py)
      let rawAngle = Math.abs((Math.atan2(py, px) * 180) / Math.PI)

      // 夹角 θ 限制在 [0, 180] 之间
      rawAngle = Math.max(0, Math.min(180, rawAngle))

      // 磁性角度吸附
      for (const snapA of SNAP_ANGLES) {
        if (Math.abs(rawAngle - snapA) < SNAP_ANGLE_THRESHOLD) {
          rawAngle = snapA
          break
        }
      }

      // 大小吸附
      const roundedF2 = Math.round(rawF2 * 2) / 2
      if (Math.abs(rawF2 - roundedF2) < SNAP_FORCE_THRESHOLD) {
        rawF2 = roundedF2
      }

      // 限幅限制 [1, 20]
      const newF2 = Math.max(1, Math.min(20, rawF2))
      const newAngle = Math.max(0, Math.min(180, rawAngle))

      updateParam('f2', newF2)
      updateParam('angle', newAngle)
    } else if (activeDrag === 'f') {
      // ===== 拖拽 F (正交分解中的合力) =====
      // 此时 f1 作为待分解力的模，angle 作为它的方向角
      let rawF = Math.sqrt(px * px + py * py)
      let rawAngle = Math.abs((Math.atan2(py, px) * 180) / Math.PI)

      // 夹角 θ 限制在 [0, 180] 之间
      rawAngle = Math.max(0, Math.min(180, rawAngle))

      // 角度吸附
      for (const snapA of SNAP_ANGLES) {
        if (Math.abs(rawAngle - snapA) < SNAP_ANGLE_THRESHOLD) {
          rawAngle = snapA
          break
        }
      }

      // 大小吸附
      const roundedF = Math.round(rawF * 2) / 2
      if (Math.abs(rawF - roundedF) < SNAP_FORCE_THRESHOLD) {
        rawF = roundedF
      }

      const newF1 = Math.max(1, Math.min(20, rawF))
      const newAngle = Math.max(0, Math.min(180, rawAngle))

      updateParam('f1', newF1)
      updateParam('angle', newAngle)
    }
  }

  // 绑定全局鼠标/触摸释放事件
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (activeDrag) setActiveDrag(null)
    }
    
    window.addEventListener('mouseup', handleGlobalMouseUp)
    window.addEventListener('touchend', handleGlobalMouseUp)
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('touchend', handleGlobalMouseUp)
    }
  }, [activeDrag])

  const centerX = canvasSize.width / 2
  const centerY = canvasSize.height / 2

  // 4. 构建精密坐标轴刻度及标注 (Grid & Ticks)
  const ticks = []
  const tickLength = 4
  if (canvasSize.width > 0) {
    // 沿 X 轴刻度 (每隔 5N 标数字，每隔 1N 画个刻度线)
    for (let fVal = -20; fVal <= 20; fVal++) {
      if (fVal === 0) continue
      const cx = centerX + fVal * scale
      const isMajor = fVal % 5 === 0
      ticks.push(
        <line
          key={`tick-x-${fVal}`}
          x1={cx}
          y1={centerY - (isMajor ? tickLength * 1.5 : tickLength)}
          x2={cx}
          y2={centerY + (isMajor ? tickLength * 1.5 : tickLength)}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={isMajor ? CANVAS_STYLE.stroke.tickBold : CANVAS_STYLE.stroke.tick}
        />
      )
      if (isMajor && cx > 30 && cx < canvasSize.width - 30) {
        ticks.push(
          <text
            key={`tick-text-x-${fVal}`}
            x={cx}
            y={centerY + 16}
            fontSize={CANVAS_STYLE.font.axis}
            fontFamily={CANVAS_STYLE.font.family}
            fill={PHYSICS_COLORS.labelTextLight}
            textAnchor="middle"
          >
            {fVal}N
          </text>
        )
      }
    }
    // 沿 Y 轴刻度
    for (let fVal = -10; fVal <= 15; fVal++) {
      if (fVal === 0) continue
      const cy = centerY - fVal * scale
      const isMajor = fVal % 5 === 0
      ticks.push(
        <line
          key={`tick-y-${fVal}`}
          x1={centerX - (isMajor ? tickLength * 1.5 : tickLength)}
          y1={cy}
          x2={centerX + (isMajor ? tickLength * 1.5 : tickLength)}
          y2={cy}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={isMajor ? CANVAS_STYLE.stroke.tickBold : CANVAS_STYLE.stroke.tick}
        />
      )
      if (isMajor && cy > 30 && cy < canvasSize.height - 30) {
        ticks.push(
          <text
            key={`tick-text-y-${fVal}`}
            x={centerX - 12}
            y={cy + 4}
            fontSize={CANVAS_STYLE.font.axis}
            fontFamily={CANVAS_STYLE.font.family}
            fill={PHYSICS_COLORS.labelTextLight}
            textAnchor="end"
          >
            {fVal}N
          </text>
        )
      }
    }
  }

  // 5. 动态背景网格 (Grid Lines)
  const gridLines = []
  if (showGrid && canvasSize.width > 0) {
    // 每隔 5N 绘制一条细网格
    for (let fVal = -20; fVal <= 20; fVal += 5) {
      const xPos = centerX + fVal * scale
      gridLines.push(
        <line
          key={`grid-x-${fVal}`}
          x1={xPos}
          y1={10}
          x2={xPos}
          y2={canvasSize.height - 10}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={CANVAS_STYLE.stroke.grid}
          opacity={CANVAS_STYLE.opacity.grid}
          strokeDasharray="4,4"
        />
      )
    }
    for (let fVal = -15; fVal <= 15; fVal += 5) {
      const yPos = centerY - fVal * scale
      gridLines.push(
        <line
          key={`grid-y-${fVal}`}
          x1={10}
          y1={yPos}
          x2={canvasSize.width - 10}
          y2={yPos}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={CANVAS_STYLE.stroke.grid}
          opacity={CANVAS_STYLE.opacity.grid}
          strokeDasharray="4,4"
        />
      )
    }
  }

  const {
    origin,
    f1End,
    f2End,
    fResultantEnd,
    f1ToResultant,
    f2ToResultant,
    f2ShiftedStart,
    f2ShiftedEnd,
    fxEnd,
    fyEnd,
    fxProj,
    fyProj,
    thetaArcPath,
    thetaTextPos,
    alphaArcPath,
    alphaTextPos,
  } = physicsData

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      <svg
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-neutral-50 rounded-xl shadow-inner border border-neutral-200"
        onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
        onTouchMove={(e) => {
          if (e.touches.length > 0) {
            handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
          }
        }}
      >
        {/* 背景网格 */}
        {gridLines}

        {/* 刻度及标注 */}
        {ticks}

        {/* 精密坐标轴（X与Y轴，主轴加粗） */}
        <line
          x1={20}
          y1={centerY}
          x2={canvasSize.width - 20}
          y2={centerY}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={CANVAS_STYLE.stroke.axisBold}
        />
        <line
          x1={centerX}
          y1={20}
          x2={centerX}
          y2={canvasSize.height - 20}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={CANVAS_STYLE.stroke.axisBold}
        />

        {/* 原点十字靶标与受力实体节点 */}
        <circle
          cx={centerX}
          cy={centerY}
          r={CANVAS_STYLE.object.pointMassRadius}
          fill={PHYSICS_COLORS.labelText}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={1.5}
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={12}
          fill="none"
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1}
          strokeDasharray="2,2"
        />

        {showVectors && (
          <g>
            {/* ==================== 模式 2：正交分解渲染 ==================== */}
            {mode === 2 && (
              <>
                {/* 水平分力 Fx */}
                <line
                   x1={origin.cx}
                   y1={origin.cy}
                   x2={fxEnd.cx}
                   y2={fxEnd.cy}
                   stroke={PHYSICS_COLORS.forceComponent}
                   strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                   opacity={CANVAS_STYLE.opacity.vectorSub}
                   markerEnd="url(#arrowhead-fcomp)"
                 />
                 <text
                   x={fxEnd.cx > origin.cx ? fxEnd.cx - 8 : fxEnd.cx + 8}
                   y={origin.cy + 18}
                   fontSize={CANVAS_STYLE.font.label}
                   fontFamily={CANVAS_STYLE.font.family}
                   fill={PHYSICS_COLORS.forceComponent}
                   fontWeight="bold"
                   textAnchor={fxEnd.cx > origin.cx ? "end" : "start"}
                 >
                   F_x
                 </text>
 
                 {/* 竖直分力 Fy */}
                 <line
                   x1={origin.cx}
                   y1={origin.cy}
                   x2={fyEnd.cx}
                   y2={fyEnd.cy}
                   stroke={PHYSICS_COLORS.forceComponent}
                   strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                   opacity={CANVAS_STYLE.opacity.vectorSub}
                   markerEnd="url(#arrowhead-fcomp)"
                 />
                <text
                  x={origin.cx - 12}
                  y={fyEnd.cy > origin.cy ? fyEnd.cy - 6 : fyEnd.cy + 14}
                  fontSize={CANVAS_STYLE.font.label}
                  fontFamily={CANVAS_STYLE.font.family}
                  fill={PHYSICS_COLORS.forceComponent}
                  fontWeight="bold"
                  textAnchor="end"
                >
                  F_y
                </text>

                {/* 投影虚线 */}
                <line
                  x1={fxProj.x1}
                  y1={fxProj.y1}
                  x2={fxProj.x2}
                  y2={fxProj.y2}
                  stroke={PHYSICS_COLORS.axis}
                  strokeWidth={CANVAS_STYLE.stroke.reference}
                  strokeDasharray={CANVAS_STYLE.dash.projection.join(',')}
                />
                <line
                  x1={fyProj.x1}
                  y1={fyProj.y1}
                  x2={fyProj.x2}
                  y2={fyProj.y2}
                  stroke={PHYSICS_COLORS.axis}
                  strokeWidth={CANVAS_STYLE.stroke.reference}
                  strokeDasharray={CANVAS_STYLE.dash.projection.join(',')}
                />

                {/* 待分解合力 F */}
                <line
                  x1={origin.cx}
                  y1={origin.cy}
                  x2={fResultantEnd.cx}
                  y2={fResultantEnd.cy}
                  stroke={PHYSICS_COLORS.forceNet}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  markerEnd="url(#arrowhead-main)"
                />
                <text
                  x={fResultantEnd.cx + (fResultantEnd.cx > origin.cx ? 8 : -14)}
                  y={fResultantEnd.cy + (fResultantEnd.cy > origin.cy ? 14 : -8)}
                  fontSize={CANVAS_STYLE.font.labelBold}
                  fontFamily={CANVAS_STYLE.font.family}
                  fill={PHYSICS_COLORS.forceNet}
                  fontWeight="bold"
                >
                  F
                </text>

                {/* 待分解合力 F 拖拽靶区 */}
                <g
                  onMouseDown={(e) => handleDragStart('f', e)}
                  onTouchStart={(e) => {
                    if (e.touches.length > 0) handleDragStart('f', e)
                  }}
                  className="group cursor-grab active:cursor-grabbing"
                >
                  {/* 隐性大把手 */}
                  <circle cx={fResultantEnd.cx} cy={fResultantEnd.cy} r={16} fill="transparent" opacity={0} />
                  {/* 可见同心圆靶环 */}
                  <circle
                    cx={fResultantEnd.cx}
                    cy={fResultantEnd.cy}
                    r={6}
                    fill={PHYSICS_COLORS.forceNet}
                    stroke="white"
                    strokeWidth={1.5}
                    className="group-hover:scale-125 transition-transform shadow-md"
                  />
                  <circle
                    cx={fResultantEnd.cx}
                    cy={fResultantEnd.cy}
                    r={10}
                    fill="none"
                    stroke={PHYSICS_COLORS.forceNet}
                    strokeWidth={1}
                    opacity={0.4}
                    className="animate-pulse"
                  />
                </g>
              </>
            )}

            {/* ==================== 模式 0：平行四边形定则渲染 ==================== */}
            {mode === 0 && (
              <>
                {/* 分力 F1 */}
                <line
                  x1={origin.cx}
                  y1={origin.cy}
                  x2={f1End.cx}
                  y2={f1End.cy}
                  stroke={PHYSICS_COLORS.appliedForce}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  markerEnd="url(#arrowhead-f1)"
                />
                <text
                  x={f1End.cx}
                  y={f1End.cy + 18}
                  fontSize={CANVAS_STYLE.font.label}
                  fontFamily={CANVAS_STYLE.font.family}
                  fill={PHYSICS_COLORS.appliedForce}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  F₁
                </text>

                {/* F1 拖拽把手 */}
                <g
                  onMouseDown={(e) => handleDragStart('f1', e)}
                  onTouchStart={(e) => {
                    if (e.touches.length > 0) handleDragStart('f1', e)
                  }}
                  className="group cursor-ew-resize"
                >
                  <circle cx={f1End.cx} cy={f1End.cy} r={16} fill="transparent" opacity={0} />
                  <circle
                    cx={f1End.cx}
                    cy={f1End.cy}
                    r={6}
                    fill={PHYSICS_COLORS.appliedForce}
                    stroke="white"
                    strokeWidth={1.5}
                    className="group-hover:scale-125 transition-transform"
                  />
                </g>

                {/* 分力 F2 */}
                <line
                  x1={origin.cx}
                  y1={origin.cy}
                  x2={f2End.cx}
                  y2={f2End.cy}
                  stroke={PHYSICS_COLORS.tension}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  markerEnd="url(#arrowhead-f2)"
                />
                <text
                  x={f2End.cx + (f2End.cx > origin.cx ? 8 : -16)}
                  y={f2End.cy - 8}
                  fontSize={CANVAS_STYLE.font.label}
                  fontFamily={CANVAS_STYLE.font.family}
                  fill={PHYSICS_COLORS.tension}
                  fontWeight="bold"
                  textAnchor={f2End.cx > origin.cx ? "start" : "end"}
                >
                  F₂
                </text>

                {/* F2 拖拽把手 */}
                <g
                  onMouseDown={(e) => handleDragStart('f2', e)}
                  onTouchStart={(e) => {
                    if (e.touches.length > 0) handleDragStart('f2', e)
                  }}
                  className="group cursor-grab active:cursor-grabbing"
                >
                  <circle cx={f2End.cx} cy={f2End.cy} r={16} fill="transparent" opacity={0} />
                  <circle
                    cx={f2End.cx}
                    cy={f2End.cy}
                    r={6}
                    fill={PHYSICS_COLORS.tension}
                    stroke="white"
                    strokeWidth={1.5}
                    className="group-hover:scale-125 transition-transform"
                  />
                </g>

                {/* 平行四边形辅助边线 */}
                <line
                  x1={f1ToResultant.x1}
                  y1={f1ToResultant.y1}
                  x2={f1ToResultant.x2}
                  y2={f1ToResultant.y2}
                  stroke={PHYSICS_COLORS.tension}
                  strokeWidth={CANVAS_STYLE.stroke.reference}
                  opacity={CANVAS_STYLE.opacity.reference}
                  strokeDasharray={CANVAS_STYLE.dash.reference.join(',')}
                />
                <line
                  x1={f2ToResultant.x1}
                  y1={f2ToResultant.y1}
                  x2={f2ToResultant.x2}
                  y2={f2ToResultant.y2}
                  stroke={PHYSICS_COLORS.appliedForce}
                  strokeWidth={CANVAS_STYLE.stroke.reference}
                  opacity={CANVAS_STYLE.opacity.reference}
                  strokeDasharray={CANVAS_STYLE.dash.reference.join(',')}
                />

                {/* 合力 F */}
                <line
                  x1={origin.cx}
                  y1={origin.cy}
                  x2={fResultantEnd.cx}
                  y2={fResultantEnd.cy}
                  stroke={PHYSICS_COLORS.forceNet}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  markerEnd="url(#arrowhead-main)"
                />
                <text
                  x={fResultantEnd.cx + 8}
                  y={fResultantEnd.cy - 8}
                  fontSize={CANVAS_STYLE.font.labelBold}
                  fontFamily={CANVAS_STYLE.font.family}
                  fill={PHYSICS_COLORS.forceNet}
                  fontWeight="bold"
                >
                  F
                </text>
              </>
            )}

            {/* ==================== 模式 1：三角形定则渲染 ==================== */}
            {mode === 1 && (
              <>
                {/* 分力 F1 */}
                <line
                  x1={origin.cx}
                  y1={origin.cy}
                  x2={f1End.cx}
                  y2={f1End.cy}
                  stroke={PHYSICS_COLORS.appliedForce}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  markerEnd="url(#arrowhead-f1)"
                />
                <text
                  x={f1End.cx}
                  y={f1End.cy + 18}
                  fontSize={CANVAS_STYLE.font.label}
                  fontFamily={CANVAS_STYLE.font.family}
                  fill={PHYSICS_COLORS.appliedForce}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  F₁
                </text>

                {/* F1 拖拽把手 */}
                <g
                  onMouseDown={(e) => handleDragStart('f1', e)}
                  onTouchStart={(e) => {
                    if (e.touches.length > 0) handleDragStart('f1', e)
                  }}
                  className="group cursor-ew-resize"
                >
                  <circle cx={f1End.cx} cy={f1End.cy} r={16} fill="transparent" opacity={0} />
                  <circle
                    cx={f1End.cx}
                    cy={f1End.cy}
                    r={6}
                    fill={PHYSICS_COLORS.appliedForce}
                    stroke="white"
                    strokeWidth={1.5}
                    className="group-hover:scale-125 transition-transform"
                  />
                </g>

                {/* 隐藏的 F2 拖拽原点把手（即使在平移状态下，也允许通过原把手虚影位置或平移后位置拖拽 F2） */}
                <g
                  onMouseDown={(e) => handleDragStart('f2', e)}
                  onTouchStart={(e) => {
                    if (e.touches.length > 0) handleDragStart('f2', e)
                  }}
                  className="group cursor-grab active:cursor-grabbing"
                >
                  <circle cx={f2End.cx} cy={f2End.cy} r={16} fill="transparent" opacity={0} />
                  <circle
                    cx={f2End.cx}
                    cy={f2End.cy}
                    r={5}
                    fill="none"
                    stroke={PHYSICS_COLORS.tension}
                    strokeWidth={1}
                    strokeDasharray="2,2"
                    opacity={0.5}
                  />
                </g>

                {/* 平移后首尾相接的 F2 矢量 */}
                <line
                  x1={f2ShiftedStart.cx}
                  y1={f2ShiftedStart.cy}
                  x2={f2ShiftedEnd.cx}
                  y2={f2ShiftedEnd.cy}
                  stroke={PHYSICS_COLORS.tension}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  markerEnd="url(#arrowhead-f2)"
                />
                <text
                  x={f2ShiftedEnd.cx + (f2ShiftedEnd.cx > f2ShiftedStart.cx ? 8 : -16)}
                  y={f2ShiftedEnd.cy - 8}
                  fontSize={CANVAS_STYLE.font.label}
                  fontFamily={CANVAS_STYLE.font.family}
                  fill={PHYSICS_COLORS.tension}
                  fontWeight="bold"
                  textAnchor={f2ShiftedEnd.cx > f2ShiftedStart.cx ? "start" : "end"}
                >
                  F₂
                </text>

                {/* 平移过程中的辅助导轨线（首首连接线、尾尾连接线，弱化） */}
                {isPlaying && (
                  <line
                    x1={origin.cx}
                    y1={origin.cy}
                    x2={f1End.cx}
                    y2={f1End.cy}
                    stroke={PHYSICS_COLORS.axis}
                    strokeWidth={CANVAS_STYLE.stroke.guide}
                    opacity={CANVAS_STYLE.opacity.guide}
                    strokeDasharray={CANVAS_STYLE.dash.guide.join(',')}
                  />
                )}

                {/* 闭合合力 F */}
                <line
                  x1={origin.cx}
                  y1={origin.cy}
                  x2={fResultantEnd.cx}
                  y2={fResultantEnd.cy}
                  stroke={PHYSICS_COLORS.forceNet}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  markerEnd="url(#arrowhead-main)"
                />
                <text
                  x={fResultantEnd.cx + 8}
                  y={fResultantEnd.cy - 8}
                  fontSize={CANVAS_STYLE.font.labelBold}
                  fontFamily={CANVAS_STYLE.font.family}
                  fill={PHYSICS_COLORS.forceNet}
                  fontWeight="bold"
                >
                  F
                </text>
              </>
            )}
          </g>
        )}

        {/* ==================== 弧线与度数标注 ==================== */}
        {/* 夹角 θ 弧线 */}
        {thetaArcPath && (
          <g>
            <path
              d={thetaArcPath}
              fill="none"
              stroke={PHYSICS_COLORS.labelTextLight}
              strokeWidth={1.2}
              strokeDasharray="2,2"
            />
            {/* 度数背景框（防坐标轴重叠遮挡） */}
            <rect
              x={thetaTextPos.cx - 16}
              y={thetaTextPos.cy - 9}
              width={32}
              height={16}
              fill="white"
              fillOpacity={0.85}
              rx={3}
            />
            <text
              x={thetaTextPos.cx}
              y={thetaTextPos.cy + 3}
              fontSize={CANVAS_STYLE.font.annotation}
              fontFamily={CANVAS_STYLE.font.family}
              fill={PHYSICS_COLORS.labelText}
              textAnchor="middle"
            >
              {angle.toFixed(0)}°
            </text>
          </g>
        )}

        {/* 合力偏角 α 弧线 (仅合成模式下且 theta != 0) */}
        {mode !== 2 && alphaArcPath && (
          <g>
            <path
              d={alphaArcPath}
              fill="none"
              stroke={PHYSICS_COLORS.forceNet}
              strokeWidth={1}
            />
            <rect
              x={alphaTextPos.cx - 18}
              y={alphaTextPos.cy - 9}
              width={36}
              height={16}
              fill="white"
              fillOpacity={0.85}
              rx={3}
            />
            <text
              x={alphaTextPos.cx}
              y={alphaTextPos.cy + 3}
              fontSize={11}
              fontFamily={CANVAS_STYLE.font.family}
              fill={PHYSICS_COLORS.forceNet}
              fontWeight="bold"
              textAnchor="middle"
            >
              α={physicsData.resultAngleDeg.toFixed(0)}°
            </text>
          </g>
        )}

        {/* ==================== 静态标注（公式与参数） ==================== */}
        {showFormulas && (
          <g transform="translate(20, 30)">
            <text
              fontSize={CANVAS_STYLE.font.title}
              fill={PHYSICS_COLORS.labelText}
              fontWeight="bold"
              fontFamily={CANVAS_STYLE.font.family}
            >
              {mode === 2 ? "力的正交分解" : "力的合成（共点力）"}
            </text>
            
            <g transform="translate(0, 15)">
              {mode === 2 ? (
                <>
                  <text x={0} y={15} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.forceNet} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
                    原合力 F = {f1.toFixed(1)} N
                  </text>
                  <text x={0} y={35} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.labelTextLight} fontFamily={CANVAS_STYLE.font.family}>
                    分解偏角 θ = {angle.toFixed(0)}°
                  </text>
                  <text x={0} y={65} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.forceComponent} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
                    水平分量 F_x = {physicsData.fxVal.toFixed(2)} N
                  </text>
                  <text x={0} y={85} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.forceComponent} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
                    竖直分量 F_y = {physicsData.fyVal.toFixed(2)} N
                  </text>
                </>
              ) : (
                <>
                  <text x={0} y={15} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.appliedForce} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
                    分力 F₁ = {f1.toFixed(1)} N
                  </text>
                  <text x={0} y={35} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.tension} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
                    分力 F₂ = {f2.toFixed(1)} N
                  </text>
                  <text x={0} y={55} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.labelTextLight} fontFamily={CANVAS_STYLE.font.family}>
                    夹角 θ = {angle.toFixed(0)}°
                  </text>
                  <text x={0} y={85} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.forceNet} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
                    合力 F = {physicsData.fResultant.toFixed(2)} N
                  </text>
                  <text x={0} y={105} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.forceNet} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
                    合力偏角 α = {physicsData.resultAngleDeg.toFixed(1)}°
                  </text>
                </>
              )}
            </g>
          </g>
        )}

        {/* SVG Marker 箭头统一定义 */}
        <defs>
          <marker id="arrowhead-main" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
          </marker>
          {/* 特异分力箭头颜色 */}
          <marker id="arrowhead-f1" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.appliedForce} />
          </marker>
          <marker id="arrowhead-f2" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.tension} />
          </marker>
          <marker id="arrowhead-fcomp" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.forceComponent} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
