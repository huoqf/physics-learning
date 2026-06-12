import { useRef, useEffect } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE, SCENE_COLORS } from '@/theme/physics'
import { useEquilibriumPhysics } from './useEquilibriumPhysics'
import { GRAVITY } from '@/physics/constants'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

export default function EquilibriumAnimation() {
  const { params, showVectors, showFormulas, showGrid, isPlaying, time } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 450 })
  const svgRef = useRef<SVGSVGElement>(null)

  const eqScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: 0,
    originY: 0,
  }
  const eqSceneScale = createSceneScale(eqScene)

  // 1. 读取力学参数
  const m = params.m ?? 2.0
  const theta1 = params.theta1 ?? 45
  const theta2 = params.theta2 ?? 45
  const mode = params.mode ?? 0 // 0=基础悬挂, 1=平行四边形, 2=正交分解, 3=封闭三角形

  // 2. 调用物理引擎 Hook
  const physicsData = useEquilibriumPhysics({
    m,
    theta1,
    theta2,
    mode,
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
    isPlaying,
    time,
  })

  const {
    leftAnchor,
    rightAnchor,
    ballCenter,
    t1,
    t2,
    gravity,
    isOverloaded,
    brokenLine,
    gStart,
    gEnd,
    t1Start,
    t1End,
    t2Start,
    t2End,
    fNetEnd,
    t1xEnd,
    t1yEnd,
    t2xEnd,
    t2yEnd,
    triOrigin,
    triGEnd,
    triT1End,
    triT2End,
    leftArcPath,
    rightArcPath,
    leftTextPos,
    rightTextPos,
    startDrag,
    updateDragMouse,
    endDrag,
    resetPhysics,
  } = physicsData

  const centerX = canvasSize.width / 2
  const centerY = canvasSize.height / 2 - 45

  // 3. 背景物理网格
  const gridLines = []
  if (showGrid && canvasSize.width > 0) {
    for (let i = -6; i <= 6; i++) {
      const xPos = centerX + i * 50
      gridLines.push(
        <line
          key={`grid-x-${i}`}
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
    for (let i = -4; i <= 4; i++) {
      const yPos = centerY + i * 50
      gridLines.push(
        <line
          key={`grid-y-${i}`}
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

  // 4. 半透明量角器刻度底盘
  const protractorTicks = []
  if (brokenLine === 'none' && canvasSize.width > 0) {
    for (let deg = 15; deg < 90; deg += 15) {
      const rad = (deg * Math.PI) / 180
      protractorTicks.push(
        <line
          key={`tick-l-${deg}`}
          x1={ballCenter.cx - 30 * Math.cos(rad)}
          y1={ballCenter.cy - 30 * Math.sin(rad)}
          x2={ballCenter.cx - 36 * Math.cos(rad)}
          y2={ballCenter.cy - 36 * Math.sin(rad)}
          stroke={PHYSICS_COLORS.labelTextLight}
          strokeWidth={0.75}
          opacity={0.25}
        />,
        <line
          key={`tick-r-${deg}`}
          x1={ballCenter.cx + 30 * Math.cos(rad)}
          y1={ballCenter.cy - 30 * Math.sin(rad)}
          x2={ballCenter.cx + 36 * Math.cos(rad)}
          y2={ballCenter.cy - 36 * Math.sin(rad)}
          stroke={PHYSICS_COLORS.labelTextLight}
          strokeWidth={0.75}
          opacity={0.25}
        />
      )
    }
  }

  // 5. 绳子中点浮动力值气泡位置
  const t1Mid = { cx: (leftAnchor.cx + ballCenter.cx) / 2, cy: (leftAnchor.cy + ballCenter.cy) / 2 }
  const t2Mid = { cx: (rightAnchor.cx + ballCenter.cx) / 2, cy: (rightAnchor.cy + ballCenter.cy) / 2 }

  // 6. T-θ 关系曲线图表计算：不要写死像素，动态分配放大显示
  const hasRope = brokenLine !== 'both'
  const chartW = Math.max(185, Math.min(220, canvasSize.width * 0.32))
  const chartH = Math.max(125, Math.min(150, canvasSize.height * 0.32))
  const chartX0 = canvasSize.width - chartW - 20
  const chartY0 = canvasSize.height - 30

  const thetaToX = (thetaVal: number) => chartX0 + ((thetaVal - 10) / 80) * chartW
  const tToY = (tVal: number) => chartY0 - (tVal / 60) * chartH

  // 构建对称悬挂的正割关系理论曲线
  let secantPathD = ''
  if (canvasSize.width > 0) {
    const points: string[] = []
    for (let deg = 10; deg <= 90; deg += 2) {
      const rad = (deg * Math.PI) / 180
      const tVal = (m * GRAVITY) / (2 * Math.sin(rad))
      if (tVal <= 65) {
        points.push(`${thetaToX(deg)},${tToY(tVal)}`)
      }
    }
    secantPathD = points.length > 0 ? `M ${points.join(' L ')}` : ''
  }

  // 7. 处理全局松手事件
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      endDrag()
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    window.addEventListener('touchend', handleGlobalMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('touchend', handleGlobalMouseUp)
    }
  }, [endDrag])

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      {/* 绳索断裂时的扁平化重置按钮 */}
      {brokenLine !== 'none' && (
        <button
          onClick={resetPhysics}
          className="absolute top-4 right-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.97]"
        >
          <span>⚠ 绳子断裂！重置细绳</span>
        </button>
      )}

      <svg
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-neutral-50 rounded-xl shadow-inner border border-neutral-200"
        onMouseMove={(e) => updateDragMouse(e.clientX, e.clientY, svgRef.current)}
        onTouchMove={(e) => {
          if (e.touches.length > 0) {
            updateDragMouse(e.touches[0].clientX, e.touches[0].clientY, svgRef.current)
          }
        }}
      >
        {/* 背景细密网格 */}
        {gridLines}

        {/* ==================== 顶部天花板固定梁 ==================== */}
        <rect
          x={centerX - 220}
          y={leftAnchor.cy - 12}
          width={440}
          height={12}
          fill="url(#ceilingMetalGradient)"
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1.5}
        />
        <circle cx={leftAnchor.cx} cy={leftAnchor.cy} r={4.5} fill={PHYSICS_COLORS.labelText} />
        <circle cx={rightAnchor.cx} cy={rightAnchor.cy} r={4.5} fill={PHYSICS_COLORS.labelText} />

        {/* ==================== 半透明量角器底纹 ==================== */}
        {brokenLine === 'none' && (
          <g>
            <circle cx={ballCenter.cx} cy={ballCenter.cy} r={35} fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth={1} opacity={0.35} />
            <path
              d={`M ${ballCenter.cx - 35} ${ballCenter.cy} A 35 35 0 0 1 ${ballCenter.cx + 35} ${ballCenter.cy}`}
              fill="none"
              stroke={PHYSICS_COLORS.labelTextLight}
              strokeWidth={0.75}
              strokeDasharray="2,2"
              opacity={0.35}
            />
            {protractorTicks}
          </g>
        )}

        {/* ==================== 挂绳渲染 ==================== */}
        {/* 左绳 */}
        {(brokenLine === 'none' || brokenLine === 'right') && (
          <line
            x1={leftAnchor.cx}
            y1={leftAnchor.cy}
            x2={ballCenter.cx}
            y2={ballCenter.cy}
            stroke={isOverloaded && t1 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.axis}
            strokeWidth={CANVAS_STYLE.stroke.objectThin}
            className={isOverloaded && t1 > 35 ? "animate-pulse" : ""}
          />
        )}
        {/* 右绳 */}
        {(brokenLine === 'none' || brokenLine === 'left') && (
          <line
            x1={rightAnchor.cx}
            y1={rightAnchor.cy}
            x2={ballCenter.cx}
            y2={ballCenter.cy}
            stroke={isOverloaded && t2 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.axis}
            strokeWidth={CANVAS_STYLE.stroke.objectThin}
            className={isOverloaded && t2 > 35 ? "animate-pulse" : ""}
          />
        )}

        {/* ==================== 物理受力矢量 ==================== */}
        {showVectors && (
          <g>
            {/* 1. 重力 G */}
            <VectorArrow
              origin={{ x: gStart.cx, y: -gStart.cy }}
              vector={{ x: gEnd.cx - gStart.cx, y: -(gEnd.cy - gStart.cy) }}
              type="gravity"
              sceneScale={eqSceneScale}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              pixelLength={Math.hypot(gEnd.cx - gStart.cx, gEnd.cy - gStart.cy)}
            />
            <text
              x={gEnd.cx - 14}
              y={gEnd.cy + 4}
              fontSize={CANVAS_STYLE.font.label}
              fontFamily={CANVAS_STYLE.font.family}
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
            >
              G
            </text>

            {/* 2. 左绳拉力 T1 */}
            {(brokenLine === 'none' || brokenLine === 'right') && (
              <g>
                <VectorArrow
                  origin={{ x: t1Start.cx, y: -t1Start.cy }}
                  vector={{ x: t1End.cx - t1Start.cx, y: -(t1End.cy - t1Start.cy) }}
                  type="tension"
                  sceneScale={eqSceneScale}
                  color={isOverloaded && t1 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  pixelLength={Math.hypot(t1End.cx - t1Start.cx, t1End.cy - t1Start.cy)}
                />
                <text
                  x={t1End.cx - 16}
                  y={t1End.cy - 6}
                  fontSize={CANVAS_STYLE.font.label}
                  fontFamily={CANVAS_STYLE.font.family}
                  fill={isOverloaded && t1 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension}
                  fontWeight="bold"
                >
                  T₁
                </text>
              </g>
            )}

            {/* 3. 右绳拉力 T2 */}
            {(brokenLine === 'none' || brokenLine === 'left') && (
              <g>
                <VectorArrow
                  origin={{ x: t2Start.cx, y: -t2Start.cy }}
                  vector={{ x: t2End.cx - t2Start.cx, y: -(t2End.cy - t2Start.cy) }}
                  type="tension"
                  sceneScale={eqSceneScale}
                  color={isOverloaded && t2 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  pixelLength={Math.hypot(t2End.cx - t2Start.cx, t2End.cy - t2Start.cy)}
                />
                <text
                  x={t2End.cx + 8}
                  y={t2End.cy - 6}
                  fontSize={CANVAS_STYLE.font.label}
                  fontFamily={CANVAS_STYLE.font.family}
                  fill={isOverloaded && t2 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension}
                  fontWeight="bold"
                >
                  T₂
                </text>
              </g>
            )}

            {/* ==================== 模式 1：平行四边形定则辅助线与合力 ==================== */}
            {mode === 1 && brokenLine === 'none' && (
              <g>
                <line
                  x1={t1End.cx}
                  y1={t1End.cy}
                  x2={fNetEnd.cx}
                  y2={fNetEnd.cy}
                  stroke={PHYSICS_COLORS.forceComponent}
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
                <line
                  x1={t2End.cx}
                  y1={t2End.cy}
                  x2={fNetEnd.cx}
                  y2={fNetEnd.cy}
                  stroke={PHYSICS_COLORS.forceComponent}
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
                <VectorArrow
                  origin={{ x: ballCenter.cx, y: -ballCenter.cy }}
                  vector={{ x: fNetEnd.cx - ballCenter.cx, y: -(fNetEnd.cy - ballCenter.cy) }}
                  type="force"
                  sceneScale={eqSceneScale}
                  color={PHYSICS_COLORS.forceNet}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain + 0.5}
                  pixelLength={Math.hypot(fNetEnd.cx - ballCenter.cx, fNetEnd.cy - ballCenter.cy)}
                />
                <text
                  x={fNetEnd.cx + 8}
                  y={fNetEnd.cy + 12}
                  fontSize={CANVAS_STYLE.font.annotation}
                  fontFamily={CANVAS_STYLE.font.family}
                  fill={PHYSICS_COLORS.forceNet}
                  fontWeight="bold"
                >
                  F合
                </text>
              </g>
            )}

            {/* ==================== 模式 2：正交分解辅助线与分力 ==================== */}
            {mode === 2 && brokenLine === 'none' && (
              <g>
                {/* 坐标轴 */}
                <line x1={ballCenter.cx - 100} y1={ballCenter.cy} x2={ballCenter.cx + 100} y2={ballCenter.cy} stroke={PHYSICS_COLORS.axis} strokeWidth={1} strokeDasharray="4,4" />
                <line x1={ballCenter.cx} y1={ballCenter.cy - 100} x2={ballCenter.cx} y2={ballCenter.cy + 100} stroke={PHYSICS_COLORS.axis} strokeWidth={1} strokeDasharray="4,4" />
                <text x={ballCenter.cx + 104} y={ballCenter.cy + 4} fontSize={10} fill={PHYSICS_COLORS.labelTextLight}>+x</text>
                <text x={ballCenter.cx - 4} y={ballCenter.cy - 104} fontSize={10} fill={PHYSICS_COLORS.labelTextLight}>+y</text>

                {/* T1 投影虚垂线与分力 */}
                <line x1={t1End.cx} y1={t1End.cy} x2={t1xEnd.cx} y2={t1xEnd.cy} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={0.75} strokeDasharray="2,2" opacity={0.5} />
                <line x1={t1End.cx} y1={t1End.cy} x2={t1yEnd.cx} y2={t1yEnd.cy} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={0.75} strokeDasharray="2,2" opacity={0.5} />
                <VectorArrow
                  origin={{ x: ballCenter.cx, y: -ballCenter.cy }}
                  vector={{ x: t1xEnd.cx - ballCenter.cx, y: -(t1xEnd.cy - ballCenter.cy) }}
                  type="force"
                  sceneScale={eqSceneScale}
                  color={PHYSICS_COLORS.forceComponent}
                  strokeWidth={1.5}
                  pixelLength={Math.hypot(t1xEnd.cx - ballCenter.cx, t1xEnd.cy - ballCenter.cy)}
                />
                <VectorArrow
                  origin={{ x: ballCenter.cx, y: -ballCenter.cy }}
                  vector={{ x: t1yEnd.cx - ballCenter.cx, y: -(t1yEnd.cy - ballCenter.cy) }}
                  type="force"
                  sceneScale={eqSceneScale}
                  color={PHYSICS_COLORS.forceComponent}
                  strokeWidth={1.5}
                  pixelLength={Math.hypot(t1yEnd.cx - ballCenter.cx, t1yEnd.cy - ballCenter.cy)}
                />
                <text x={t1xEnd.cx - 18} y={t1xEnd.cy + 12} fontSize={10} fill={PHYSICS_COLORS.forceComponent} fontWeight="bold">T1x</text>
                <text x={t1yEnd.cx - 20} y={t1yEnd.cy - 6} fontSize={10} fill={PHYSICS_COLORS.forceComponent} fontWeight="bold">T1y</text>

                {/* T2 投影虚垂线与分力 */}
                <line x1={t2End.cx} y1={t2End.cy} x2={t2xEnd.cx} y2={t2xEnd.cy} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={0.75} strokeDasharray="2,2" opacity={0.5} />
                <line x1={t2End.cx} y1={t2End.cy} x2={t2yEnd.cx} y2={t2yEnd.cy} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={0.75} strokeDasharray="2,2" opacity={0.5} />
                <VectorArrow
                  origin={{ x: ballCenter.cx, y: -ballCenter.cy }}
                  vector={{ x: t2xEnd.cx - ballCenter.cx, y: -(t2xEnd.cy - ballCenter.cy) }}
                  type="force"
                  sceneScale={eqSceneScale}
                  color={PHYSICS_COLORS.forceComponent}
                  strokeWidth={1.5}
                  pixelLength={Math.hypot(t2xEnd.cx - ballCenter.cx, t2xEnd.cy - ballCenter.cy)}
                />
                <VectorArrow
                  origin={{ x: ballCenter.cx, y: -ballCenter.cy }}
                  vector={{ x: t2yEnd.cx - ballCenter.cx, y: -(t2yEnd.cy - ballCenter.cy) }}
                  type="force"
                  sceneScale={eqSceneScale}
                  color={PHYSICS_COLORS.forceComponent}
                  strokeWidth={1.5}
                  pixelLength={Math.hypot(t2yEnd.cx - ballCenter.cx, t2yEnd.cy - ballCenter.cy)}
                />
                <text x={t2xEnd.cx + 2} y={t2xEnd.cy + 12} fontSize={10} fill={PHYSICS_COLORS.forceComponent} fontWeight="bold">T2x</text>
                <text x={t2yEnd.cx + 6} y={t2yEnd.cy - 6} fontSize={10} fill={PHYSICS_COLORS.forceComponent} fontWeight="bold">T2y</text>
              </g>
            )}
          </g>
        )}

        {/* ==================== 悬浮气泡拉力标签 ==================== */}
        {(brokenLine === 'none' || brokenLine === 'right') && (
          <g>
            <rect x={t1Mid.cx - 28} y={t1Mid.cy - 22} width={56} height={18} fill="white" fillOpacity={0.88} stroke={PHYSICS_COLORS.grid} strokeWidth={1} rx={4} />
            <text x={t1Mid.cx} y={t1Mid.cy - 9} fontSize={10} fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.tension} fontWeight="bold" textAnchor="middle">
              {t1.toFixed(1)} N
            </text>
          </g>
        )}
        {(brokenLine === 'none' || brokenLine === 'left') && (
          <g>
            <rect x={t2Mid.cx - 28} y={t2Mid.cy - 22} width={56} height={18} fill="white" fillOpacity={0.88} stroke={PHYSICS_COLORS.grid} strokeWidth={1} rx={4} />
            <text x={t2Mid.cx} y={t2Mid.cy - 9} fontSize={10} fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.tension} fontWeight="bold" textAnchor="middle">
              {t2.toFixed(1)} N
            </text>
          </g>
        )}

        {/* ==================== 悬挂重物砝码 & 手势拖拽区 ==================== */}
        {/* 小球水平/垂直参考虚线 */}
        <line x1={ballCenter.cx - 60} y1={ballCenter.cy} x2={ballCenter.cx + 60} y2={ballCenter.cy} stroke={PHYSICS_COLORS.axis} strokeWidth={1} strokeDasharray="3,3" />
        <line x1={ballCenter.cx} y1={ballCenter.cy - 20} x2={ballCenter.cx} y2={ballCenter.cy + 50} stroke={PHYSICS_COLORS.axis} strokeWidth={1} strokeDasharray="3,3" />

        <g
          onMouseDown={(e) => startDrag(e.clientX, e.clientY, svgRef.current)}
          onTouchStart={(e) => {
            if (e.touches.length > 0) startDrag(e.touches[0].clientX, e.touches[0].clientY, svgRef.current)
          }}
          className="group cursor-grab active:cursor-grabbing"
        >
          {/* 隐藏的扩大的手势触发圆 */}
          <circle cx={ballCenter.cx} cy={ballCenter.cy} r={26} fill="transparent" opacity={0} />
          {/* 重物立体外圈 (采用 3D 拟物材质渐变) */}
          <circle
            cx={ballCenter.cx}
            cy={ballCenter.cy}
            r={CANVAS_STYLE.object.ball}
            fill="url(#steelSphereGradient)"
            stroke={SCENE_COLORS.sphere.brassWeight.stroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
            className="group-hover:scale-105 transition-transform"
          />
          {/* 砝码吊环和十字靶标线 */}
          <circle cx={ballCenter.cx} cy={ballCenter.cy} r={6} fill="none" stroke={PHYSICS_COLORS.labelText} strokeWidth={1} />
          <line x1={ballCenter.cx - 10} y1={ballCenter.cy} x2={ballCenter.cx + 10} y2={ballCenter.cy} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.75} opacity={0.6} />
          <line x1={ballCenter.cx} y1={ballCenter.cy - 10} x2={ballCenter.cx} y2={ballCenter.cy + 10} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.75} opacity={0.6} />
        </g>

        {/* ==================== 模式 3：三力闭合多边形 ==================== */}
        {mode === 3 && canvasSize.width > 0 && (
          <g>
            <rect x={centerX + 65} y={centerY + 30} width={185} height={140} fill="white" fillOpacity={0.85} stroke={PHYSICS_COLORS.grid} strokeWidth={1} rx={6} />
            <text x={centerX + 157} y={centerY + 48} fontSize={CANVAS_STYLE.font.annotation} fill={PHYSICS_COLORS.labelTextLight} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family} textAnchor="middle">
              三力封闭三角形
            </text>

            {/* 1. 重力 G (向下) */}
            <VectorArrow
              origin={{ x: triOrigin.cx, y: -triOrigin.cy }}
              vector={{ x: triGEnd.cx - triOrigin.cx, y: -(triGEnd.cy - triOrigin.cy) }}
              type="gravity"
              sceneScale={eqSceneScale}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              pixelLength={Math.hypot(triGEnd.cx - triOrigin.cx, triGEnd.cy - triOrigin.cy)}
            />
            <text x={triOrigin.cx - 14} y={(triOrigin.cy + triGEnd.cy) / 2 + 4} fontSize={CANVAS_STYLE.font.annotation} fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.gravity} fontWeight="bold">
              G
            </text>

            {/* 2. 张力 T1 */}
            {(brokenLine === 'none' || brokenLine === 'right') && (
              <g>
                <VectorArrow
                  origin={{ x: triGEnd.cx, y: -triGEnd.cy }}
                  vector={{ x: triT1End.cx - triGEnd.cx, y: -(triT1End.cy - triGEnd.cy) }}
                  type="tension"
                  sceneScale={eqSceneScale}
                  color={isOverloaded && t1 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  pixelLength={Math.hypot(triT1End.cx - triGEnd.cx, triT1End.cy - triGEnd.cy)}
                />
                <text x={(triGEnd.cx + triT1End.cx) / 2 - 16} y={(triGEnd.cy + triT1End.cy) / 2 - 6} fontSize={CANVAS_STYLE.font.annotation} fontFamily={CANVAS_STYLE.font.family} fill={isOverloaded && t1 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension} fontWeight="bold">
                  T₁
                </text>
              </g>
            )}

            {/* 3. 张力 T2 */}
            {(brokenLine === 'none' || brokenLine === 'left') && (
              <g>
                <VectorArrow
                  origin={{ x: triT1End.cx, y: -triT1End.cy }}
                  vector={{ x: triT2End.cx - triT1End.cx, y: -(triT2End.cy - triT1End.cy) }}
                  type="tension"
                  sceneScale={eqSceneScale}
                  color={isOverloaded && t2 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  pixelLength={Math.hypot(triT2End.cx - triT1End.cx, triT2End.cy - triT1End.cy)}
                />
                <text x={(triT1End.cx + triT2End.cx) / 2 + 10} y={(triT1End.cy + triT2End.cy) / 2 + 10} fontSize={CANVAS_STYLE.font.annotation} fontFamily={CANVAS_STYLE.font.family} fill={isOverloaded && t2 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension} fontWeight="bold">
                  T₂
                </text>
              </g>
            )}

            {/* 完美闭合原点 */}
            {brokenLine === 'none' && <circle cx={triOrigin.cx} cy={triOrigin.cy} r={3} fill={PHYSICS_COLORS.forceNet} />}
          </g>
        )}

        {/* ==================== 弧线与度数标注 ==================== */}
        {brokenLine === 'none' && leftArcPath && (
          <g>
            <path d={leftArcPath} fill="none" stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} strokeDasharray="1,1" />
            <rect x={leftTextPos.cx - 15} y={leftTextPos.cy - 8} width={30} height={14} fill="white" fillOpacity={0.8} rx={2} />
            <text x={leftTextPos.cx} y={leftTextPos.cy + 3} fontSize={11} fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
              {theta1.toFixed(0)}°
            </text>
          </g>
        )}

        {brokenLine === 'none' && rightArcPath && (
          <g>
            <path d={rightArcPath} fill="none" stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} strokeDasharray="1,1" />
            <rect x={rightTextPos.cx - 15} y={rightTextPos.cy - 8} width={30} height={14} fill="white" fillOpacity={0.8} rx={2} />
            <text x={rightTextPos.cx} y={rightTextPos.cy + 3} fontSize={11} fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
              {theta2.toFixed(0)}°
            </text>
          </g>
        )}

        {/* ==================== 左上角静态物理公式/参数 ==================== */}
        {showFormulas && (
          <g transform="translate(20, 30)">
            <text fontSize={CANVAS_STYLE.font.title} fill={PHYSICS_COLORS.labelText} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
              共点力平衡实验
            </text>
            <g transform="translate(0, 15)">
              <text x={0} y={15} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.labelTextLight} fontFamily={CANVAS_STYLE.font.family}>
                砝码质量 m = {m.toFixed(1)} kg
              </text>
              <text x={0} y={35} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.labelTextLight} fontFamily={CANVAS_STYLE.font.family}>
                重力大小 G = {gravity.toFixed(1)} N
              </text>
              {brokenLine === 'none' || brokenLine === 'right' ? (
                <text x={0} y={60} fontSize={CANVAS_STYLE.font.bodySize} fill={t1 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
                  绳 1 张力 T₁ = {t1.toFixed(1)} N
                </text>
              ) : (
                <text x={0} y={60} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.forceArrowRed} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family} className="animate-pulse">
                  绳 1 已断裂！
                </text>
              )}
              {brokenLine === 'none' || brokenLine === 'left' ? (
                <text x={0} y={80} fontSize={CANVAS_STYLE.font.bodySize} fill={t2 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
                  绳 2 张力 T₂ = {t2.toFixed(1)} N
                </text>
              ) : (
                <text x={0} y={80} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.forceArrowRed} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family} className="animate-pulse">
                  绳 2 已断裂！
                </text>
              )}
              
              {isOverloaded && brokenLine === 'none' && (
                <text x={0} y={105} fontSize={12} fill={PHYSICS_COLORS.forceArrowRed} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family} className="animate-pulse">
                  ⚠ 过载警示：拉力超过安全阈值！
                </text>
              )}
            </g>
          </g>
        )}

        {/* ==================== 右下角内嵌 T-θ 关系曲线图表 ==================== */}
        {hasRope && canvasSize.width > 0 && (
          <g>
            {/* 图表底色和边框 */}
            <rect x={chartX0 - 10} y={chartY0 - chartH - 10} width={chartW + 20} height={chartH + 20} fill="white" fillOpacity={0.9} stroke={PHYSICS_COLORS.grid} strokeWidth={1} rx={4} />
            <text x={chartX0 + chartW / 2} y={chartY0 - chartH - 2} fontSize={9} fill={PHYSICS_COLORS.labelTextLight} fontWeight="bold" textAnchor="middle">
              T - θ 关系图像 (G={gravity.toFixed(1)}N)
            </text>

            {/* 极限 50 N 红线 */}
            <line x1={chartX0} y1={tToY(50)} x2={chartX0 + chartW} y2={tToY(50)} stroke={PHYSICS_COLORS.forceArrowRed} strokeWidth={1} strokeDasharray="2,2" />
            <text x={chartX0 + chartW - 2} y={tToY(50) - 3} fontSize={8} fill={PHYSICS_COLORS.forceArrowRed} fontWeight="bold" textAnchor="end">
              极限 50N
            </text>

            {/* 图像坐标轴 */}
            <line x1={chartX0} y1={chartY0} x2={chartX0 + chartW + 5} y2={chartY0} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} />
            <line x1={chartX0} y1={chartY0} x2={chartX0} y2={chartY0 - chartH - 5} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} />
            <text x={chartX0 + chartW + 2} y={chartY0 + 9} fontSize={8} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">θ(°)</text>
            <text x={chartX0 - 4} y={chartY0 - chartH} fontSize={8} fill={PHYSICS_COLORS.labelTextLight}>T(N)</text>
            
            {/* 坐标刻度 */}
            <text x={thetaToX(10)} y={chartY0 + 9} fontSize={8} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">10°</text>
            <text x={thetaToX(90)} y={chartY0 + 9} fontSize={8} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">90°</text>
            <text x={chartX0 - 4} y={tToY(60) + 3} fontSize={8} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">60</text>
            <text x={chartX0 - 4} y={tToY(30) + 3} fontSize={8} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">30</text>

            {/* 正割理论曲线 */}
            {secantPathD && (
              <path d={secantPathD} fill="none" stroke={PHYSICS_COLORS.tension} strokeWidth={1.5} opacity={0.65} />
            )}

            {/* 映射当前的拉力状态点 (左绳/右绳) */}
            {(brokenLine === 'none' || brokenLine === 'right') && (
              <g>
                <circle cx={thetaToX(theta1)} cy={tToY(t1)} r={3.5} fill={PHYSICS_COLORS.tension} />
                <circle cx={thetaToX(theta1)} cy={tToY(t1)} r={7} fill="none" stroke={PHYSICS_COLORS.tension} strokeWidth={0.5} opacity={0.5} className="animate-ping" />
                <text x={thetaToX(theta1) + 5} y={tToY(t1) - 2} fontSize={7} fill={PHYSICS_COLORS.tension} fontWeight="bold">T₁</text>
              </g>
            )}
            {(brokenLine === 'none' || brokenLine === 'left') && (
              <g>
                <circle cx={thetaToX(theta2)} cy={tToY(t2)} r={3.5} fill={PHYSICS_COLORS.tension} />
                <circle cx={thetaToX(theta2)} cy={tToY(t2)} r={7} fill="none" stroke={PHYSICS_COLORS.tension} strokeWidth={0.5} opacity={0.5} className="animate-ping" />
                <text x={thetaToX(theta2) - 5} y={tToY(t2) - 2} fontSize={7} fill={PHYSICS_COLORS.tension} fontWeight="bold" textAnchor="end">T₂</text>
              </g>
            )}
          </g>
        )}

        {/* SVG Defs 定义渐变和各种箭头样式 */}
        <defs>
          {/* 天花板不锈钢拉丝梁渐变 (从 SCENE_COLORS.materials.sliderMetalGrad 获取) */}
          <linearGradient id="ceilingMetalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[0]} />
            <stop offset="30%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[1]} />
            <stop offset="70%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[3]} />
          </linearGradient>

          {/* 立体砝码小球径向渐变 (从 SCENE_COLORS.sphere.brassWeight 获取) */}
          <radialGradient id="steelSphereGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.brassWeight.gradient[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.sphere.brassWeight.gradient[1]} />
            <stop offset="85%" stopColor={SCENE_COLORS.sphere.brassWeight.gradient[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.brassWeight.gradient[3]} />
          </radialGradient>
          
          {/* 受力矢量箭头定义 */}
          <VectorDefs colors={[PHYSICS_COLORS.gravity, PHYSICS_COLORS.tension, PHYSICS_COLORS.forceArrowRed, PHYSICS_COLORS.forceNet, PHYSICS_COLORS.forceComponent]} />
        </defs>
      </svg>
    </div>
  )
}
