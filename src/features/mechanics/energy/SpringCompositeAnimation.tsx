import { useState, useMemo, useRef, useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { Ball } from '@/components/Physics/Ball'
import { Spring } from '@/components/UI/Spring'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { IDENTITY_SCENE_SCALE } from '@/scene/SceneScale'
import { precomputeVerticalSpringTrajectory, getVSStateAtTime } from '@/physics/verticalSpring'
import { GRAVITY } from '@/physics/constants'
import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { BasePhysicsChart, useChartContext } from '@/components/Chart'

// ── 右侧图表的自定义绘制层 ──
// 实现反向 Y轴高度共轴对齐，X轴代表能量，Y轴代表位置，左侧辅助线穿透
function SpringEnergyChartContent({
  m,
  k,
  h,
  xC,
  xB,
  g,
  Etot,
  y_A,
  physScale,
  state,
}: {
  m: number
  k: number
  h: number
  xC: number
  xB: number
  g: number
  Etot: number
  y_A: number
  physScale: number
  state: ReturnType<typeof getVSStateAtTime>
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, plotOrigin, plotSize, font } = ctx

  // 1. 生成大 SVG 物理高度 1:1 对齐的四条能量曲线
  const pointsCount = 100
  const yMin = -h
  const yMax = xC
  const dy = (yMax - yMin) / (pointsCount - 1)

  const epPoints: string[] = []
  const epePoints: string[] = []
  const ekPoints: string[] = []

  for (let i = 0; i < pointsCount; i++) {
    const curX = yMin + i * dy // 物理位移 x (向上为负，向下为正)
    const ep = m * g * (xC - curX)
    const epe = curX >= 0 ? 0.5 * k * curX * curX : 0
    const ek = Math.max(0, Etot - ep - epe)

    // 右侧 transform 偏移了 translate(380, 20)，所以 Y 坐标要减去 20
    const y_pixel = y_A + curX * physScale - 20

    epPoints.push(`${toSvgX(ep).toFixed(2)},${y_pixel.toFixed(2)}`)
    epePoints.push(`${toSvgX(epe).toFixed(2)},${y_pixel.toFixed(2)}`)
    ekPoints.push(`${toSvgX(ek).toFixed(2)},${y_pixel.toFixed(2)}`)
  }

  const epPath = `M ${epPoints.join(' L ')}`
  const epePath = `M ${epePoints.join(' L ')}`
  const ekPath = `M ${ekPoints.join(' L ')}`

  // 总能量竖直直线：X = toSvgX(Etot)
  const x_Etot = toSvgX(Etot)
  const y_top = y_A - h * physScale - 20
  const y_bottom = y_A + xC * physScale - 20

  // 实时水平游标线位置
  const y_current = y_A + state.x * physScale - 20

  // 辅助线向左穿透动画区的 X 坐标位移
  // 由于外层包裹在 translate(380, 20) 中，向左延长 340 像素刚好到达大 SVG 的 X = 40 处
  const x_left_penetrate = -340
  const x_right_edge = plotOrigin.x + plotSize.width

  return (
    <g>
      {/* ── 三条水平辅助线向右穿透进入图表区 ── */}
      {/* A线 (原长线) 穿透 */}
      <line
        x1={x_left_penetrate}
        y1={y_A - 20}
        x2={x_right_edge}
        y2={y_A - 20}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={1}
        strokeDasharray="3,3"
      />
      <text
        x={x_right_edge + 8}
        y={y_A - 20 + 3}
        fontSize={font(8.5)}
        fill={CANVAS_COLORS.labelTextLight}
        textAnchor="start"
        fontWeight="bold"
      >
        A线 (原长)
      </text>

      {/* B线 (平衡位置) 穿透 */}
      <line
        x1={x_left_penetrate}
        y1={y_A + xB * physScale - 20}
        x2={x_right_edge}
        y2={y_A + xB * physScale - 20}
        stroke={PHYSICS_COLORS.referencePoint}
        strokeWidth={1.2}
        strokeDasharray="3,3"
        opacity={0.8}
      />
      <text
        x={x_right_edge + 8}
        y={y_A + xB * physScale - 20 + 3}
        fontSize={font(9)}
        fill={PHYSICS_COLORS.frictionStatic}
        textAnchor="start"
        fontWeight="bold"
      >
        B线 (v最大)
      </text>

      {/* C线 (最低点) 穿透 */}
      <line
        x1={x_left_penetrate}
        y1={y_A + xC * physScale - 20}
        x2={x_right_edge}
        y2={y_A + xC * physScale - 20}
        stroke={PHYSICS_COLORS.heatLoss}
        strokeWidth={1.2}
        strokeDasharray="3,3"
        opacity={0.8}
      />
      <text
        x={x_right_edge + 8}
        y={y_A + xC * physScale - 20 + 3}
        fontSize={font(8.5)}
        fill={PHYSICS_COLORS.tangentLine}
        textAnchor="start"
        fontWeight="bold"
      >
        C线 (最低点)
      </text>

      {/* ── 能量曲线绘制 ── */}
      {/* 1. 重力势能 Ep (紫色向左下方倾斜的直线) */}
      <path d={epPath} fill="none" stroke={PHYSICS_COLORS.potentialGravity} strokeWidth={2} />

      {/* 2. 弹性势能 Epe (A线以上竖直零能量，A线以下向右下方弯曲的抛物线) */}
      <path d={epePath} fill="none" stroke={PHYSICS_COLORS.potentialElastic} strokeWidth={2} />

      {/* 3. 动能 Ek (A线前为直线，过了A线弯曲，顶点在纵向对齐B线，在C线归零) */}
      <path d={ekPath} fill="none" stroke={PHYSICS_COLORS.kineticEnergy} strokeWidth={2} />

      {/* 4. 总机械能 E_总 (竖直绝对直线) */}
      <line
        x1={x_Etot}
        y1={y_top}
        x2={x_Etot}
        y2={y_bottom}
        stroke={PHYSICS_COLORS.mechanicalEnergy}
        strokeWidth={2}
      />

      {/* ── 实时游标水平对齐穿透线 ── */}
      <line
        x1={x_left_penetrate}
        y1={y_current}
        x2={x_right_edge}
        y2={y_current}
        stroke={CANVAS_COLORS.trackHistory}
        strokeWidth={1}
        strokeDasharray="2,2"
        opacity={0.85}
      />

      {/* 与各条曲线的交点圆点 */}
      <circle cx={toSvgX(state.Ep)} cy={y_current} r={4} fill={PHYSICS_COLORS.potentialGravity} stroke="white" strokeWidth={1.2} />
      <circle cx={toSvgX(state.Epe)} cy={y_current} r={4} fill={PHYSICS_COLORS.potentialElastic} stroke="white" strokeWidth={1.2} />
      <circle cx={toSvgX(state.Ek)} cy={y_current} r={4} fill={PHYSICS_COLORS.kineticEnergy} stroke="white" strokeWidth={1.2} />
      <circle cx={toSvgX(Etot)} cy={y_current} r={4} fill={PHYSICS_COLORS.mechanicalEnergy} stroke="white" strokeWidth={1.2} />

      {/* 在交点处悬浮渲染能量实数小字标签 (在大 SVG 边缘避让处) */}
      <g transform={`translate(${x_right_edge + 8}, ${y_current})`}>
        {Math.abs(y_current - (y_A - 20)) > 15 && Math.abs(y_current - (y_A + xB * physScale - 20)) > 15 && Math.abs(y_current - (y_A + xC * physScale - 20)) > 15 && (
          <>
            <text x={0} y={-10} fontSize={font(8)} fill={PHYSICS_COLORS.potentialGravity} fontWeight="bold">
              {`Ep: ${state.Ep.toFixed(1)}J`}
            </text>
            <text x={0} y={2} fontSize={font(8)} fill={PHYSICS_COLORS.potentialElastic} fontWeight="bold">
              {`Ep': ${state.Epe.toFixed(1)}J`}
            </text>
            <text x={0} y={14} fontSize={font(8)} fill={PHYSICS_COLORS.kineticEnergy} fontWeight="bold">
              {`Ek: ${state.Ek.toFixed(1)}J`}
            </text>
          </>
        )}
      </g>
    </g>
  )
}

export default function SpringCompositeAnimation() {
  const { params, time, isPlaying, setIsPlaying, updateParam, setTime } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
      updateParam: s.updateParam,
      setTime: s.setTime,
    }))
  )

  const svgRef = useRef<SVGSVGElement>(null)

  // 1. 使用项目的响应式画布组件，使用 extraWide (800x440) 进行统一大屏展示
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.extraWide)
  const { font } = canvasSize

  // 2. 物理参数提取
  const m = params.m ?? 0.5
  const k = params.k ?? 50
  const h = params.h ?? 0.8
  const g = GRAVITY

  const showVectors = params.showVectors !== 0
  const autoPause = params.autoPause !== 0

  // 3. 预计算轨迹
  const trajectory = useMemo(() => {
    return precomputeVerticalSpringTrajectory(m, k, h, g, 15, 0.02)
  }, [m, k, h, g])

  // 当前时刻插值状态
  const state = useMemo(() => {
    return getVSStateAtTime(trajectory, time)
  }, [trajectory, time])

  // 4. 左侧动画区设计坐标与比例尺
  const DESIGN_WIDTH = 800
  const DESIGN_HEIGHT = 440
  const centerX = 190 // 动画区水平中心
  const y_ground = 420 // 地面 Y 像素
  const y_A = 160 // 弹簧顶端原长位置 Y 像素
  const physScale = 90 // 像素/米 比例尺

  // 小球中心 Y 像素位置：ballY = y_A - 14 + state.x * physScale (小球半径 r=14)
  const ballY = y_A - 14 + state.x * physScale

  const xB = (m * g) / k
  const t0 = Math.sqrt((2 * h) / g)
  const v0 = g * t0
  const omega = Math.sqrt(k / m)
  const A_amp = Math.sqrt(xB * xB + (v0 * v0) / (omega * omega))
  const xC = xB + A_amp // 最低压缩点

  const y_lineA = y_A
  const y_lineB = y_A + xB * physScale
  const y_lineC = y_A + xC * physScale

  // 弹簧顶端渲染位置：如果没碰到弹簧则保持原长，碰到了则贴紧小球底部 (ballY + 14)
  const springTopY = state.x < 0 ? y_A : ballY + 14

  // 5. 特征点平衡位置自动暂停逻辑 (仅执行暂停，不包含视觉特效)
  const phi = Math.PI + Math.atan(v0 / (omega * xB))
  const tSpring = (2 * (2 * Math.PI - phi)) / omega
  const T = 2 * t0 + tSpring
  const t_cross = t0 + (1.5 * Math.PI - phi) / omega // 下摆经过平衡点时刻

  const lastTimeRef = useRef(time)
  const lastCrossTimeRef = useRef(-1)

  useEffect(() => {
    if (!autoPause || !isPlaying) {
      lastTimeRef.current = time
      return
    }

    const T_period = T
    const cycleStart = Math.floor(lastTimeRef.current / T_period)
    const cycleEnd = Math.floor(time / T_period)

    for (let c = cycleStart; c <= cycleEnd; c++) {
      const t_cross_c = c * T_period + t_cross
      if (
        lastTimeRef.current < t_cross_c &&
        time >= t_cross_c &&
        lastCrossTimeRef.current !== t_cross_c
      ) {
        lastCrossTimeRef.current = t_cross_c
        setTime(t_cross_c)
        setIsPlaying(false)
        break
      }
    }

    lastTimeRef.current = time
  }, [time, autoPause, isPlaying, T, t_cross, setTime, setIsPlaying])

  // 6. 拖拽定位坐标反算：使用 getScreenCTM().inverse() 精确映射
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)
  const dragStartH = useRef(0)

  const getSVGCoords = (e: React.MouseEvent<SVGSVGElement> | MouseEvent) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const transformed = pt.matrixTransform(ctm.inverse())
    return { x: transformed.x, y: transformed.y }
  }

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPlaying) return
    const { x, y } = getSVGCoords(e)

    // 只对左半边小球的拖拽做出响应
    const distToBall = Math.hypot(x - centerX, y - ballY)
    if (distToBall <= 20) {
      setIsDragging(true)
      dragStartY.current = y
      dragStartH.current = h
    }
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return
    const { y } = getSVGCoords(e)
    const dy = dragStartY.current - y
    const dh = dy / physScale
    const nextH = Math.min(Math.max(dragStartH.current + dh, 0.2), 1.5)
    updateParam('h', nextH)
    setTime(0)
  }

  const handleMouseUpOrLeave = () => {
    if (isDragging) {
      setIsDragging(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center bg-white rounded-xl shadow-inner overflow-hidden select-none"
    >
      {/* 独立大 SVG 视图，整合左侧动力学场景与右侧高度共轴图表 */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`}
        className="w-full h-full bg-transparent"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        style={{ cursor: isDragging ? 'grabbing' : (!isPlaying ? 'grab' : 'default') }}
      >
        {/* ── 拖拽交互提示 ── */}
        {!isPlaying && !isDragging && (
          <text
            x={40}
            y={30}
            fontSize={font(9.5)}
            fill={CANVAS_COLORS.labelTextLight}
            fontWeight="semibold"
            className="animate-pulse"
          >
            💡 鼠标拖动左侧小球可改变初始释放高度 h
          </text>
        )}

        {/* ── 左半部分：动力学场景 ── */}
        <g>
          {/* 固定底座 */}
          <PhysicsGround
            x={centerX - 50}
            y={y_ground}
            width={100}
            type="bracket"
            appearance={{ color: CANVAS_COLORS.labelTextLight }}
          />

          {/* 地面 */}
          <PhysicsGround
            x={centerX - 90}
            y={y_ground + 8}
            width={180}
            type="ground"
            appearance={{ color: CANVAS_COLORS.trackHistory }}
          />

          {/* 弹簧渲染：底座固定在 y_ground，顶端在 springTopY */}
          <Spring
            x1={centerX}
            y1={springTopY}
            x2={centerX}
            y2={y_ground}
            coils={12}
            radius={12}
          />

          {/* 下落小球 */}
          <Ball
            cx={centerX}
            cy={ballY}
            r={14}
            type="oscillatorMetal"
            stroke={SCENE_COLORS.sphere.oscillatorMetal.stroke}
            strokeWidth={1.5}
          />

          {/* 物理矢量箭头渲染 */}
          {showVectors && (
            <g>
              {/* 重力 G: 灰色，绑定在小球中心 */}
              <VectorArrow
                origin={{ x: centerX, y: -ballY }}
                vector={{ x: 0, y: -m * g * 12 }}
                type="gravity"
                color={PHYSICS_COLORS.gravity}
                sceneScale={IDENTITY_SCENE_SCALE}
                label="G"
              />

              {/* 弹力 F: 蓝色，绑定在小球底端，只在接触压缩时显示 */}
              {state.x >= 0 && (
                <VectorArrow
                  origin={{ x: centerX, y: -(ballY + 14) }}
                  vector={{ x: 0, y: state.F_spring * 6 }}
                  type="elasticForce"
                  color={PHYSICS_COLORS.elasticForce}
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="F"
                />
              )}

              {/* 速度 v: 绿色，绑定在小球左侧 25 像素 */}
              {Math.abs(state.v) > 0.05 && (
                <VectorArrow
                  origin={{ x: centerX - 25, y: -ballY }}
                  vector={{ x: 0, y: -state.v * 16 }}
                  type="velocity"
                  color={PHYSICS_COLORS.velocity}
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="v"
                />
              )}

              {/* 加速度 a: 红色，绑定在小球右侧 25 像素 */}
              {Math.abs(state.a) > 0.05 && (
                <VectorArrow
                  origin={{ x: centerX + 25, y: -ballY }}
                  vector={{ x: 0, y: -state.a * 6 }}
                  type="acceleration"
                  color={PHYSICS_COLORS.acceleration}
                  sceneScale={IDENTITY_SCENE_SCALE}
                  label="a"
                />
              )}
            </g>
          )}

          {/* 左侧水平特征短虚线 (引导线，只延伸到中轴线) */}
          <g opacity={0.6}>
            <line x1={40} y1={y_lineA} x2={centerX + 20} y2={y_lineA} stroke={CANVAS_COLORS.axis} strokeWidth={1} strokeDasharray="3,3" />
            <line x1={40} y1={y_lineB} x2={centerX + 20} y2={y_lineB} stroke={PHYSICS_COLORS.referencePoint} strokeWidth={1.2} strokeDasharray="3,3" />
            <line x1={40} y1={y_lineC} x2={centerX + 20} y2={y_lineC} stroke={PHYSICS_COLORS.heatLoss} strokeWidth={1.2} strokeDasharray="3,3" />
          </g>
        </g>

        {/* ── 右半部分：自定义高度共轴能量图 (基于 BasePhysicsChart 组件组合构建) ── */}
        <g transform="translate(380, 20)">
          <BasePhysicsChart
            xDomain={[0, Math.max(state.Etot * 1.05, 10)]}
            yDomain={[xC, -h]} // 轴向反转映射，大值 xC 在底，小值 -h 在顶
            xLabel="E (J)"
            yLabel="x (m)"
            fixedSize={{ width: 380, height: 380 }}
            gridCount={{ x: 5, y: 5 }}
            formatX={(v: number) => `${v.toFixed(0)}J`}
            formatY={(_v: number) => ''} // 屏蔽纵轴密集的位移数字刻度
          >
            <SpringEnergyChartContent
              m={m}
              k={k}
              h={h}
              xC={xC}
              xB={xB}
              g={g}
              Etot={state.Etot}
              y_A={y_A}
              physScale={physScale}
              state={state}
            />
          </BasePhysicsChart>
        </g>
      </svg>
    </div>
  )
}
