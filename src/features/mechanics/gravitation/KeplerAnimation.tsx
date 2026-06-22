import { useCanvasSize, useViewport, physicsToCanvas } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, CANVAS_STYLE, KEPLER_CONFIG, VECTOR_DISPLAY, INSET_CHART } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { calculateKeplerOrbit, solveKeplerEquation } from '@/physics/celestial'
import { useMemo } from 'react'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

// ─── 工具函数 ─────────────────────────────────────────────────────
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// ─── 阶段二：动态计算配置（语义化命名，主题驱动）────────────────────

export default function KeplerAnimation() {
    const {params, time, showVectors, showFormulas} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    showFormulas: s.showFormulas,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 450 })
  const { font } = canvasSize

  const vp = useViewport(canvasSize, {
    designWidth: 650,
    designHeight: 450,
  })

  const mode = params.mode ?? 0 // 0=第一定律, 1=第二定律, 2=第三定律

  // ─── 轨道缩放（由 vp.scale 驱动）──────────────────────────────
  const scale = KEPLER_CONFIG.scaleBase * vp.scale

  // ─── 行星 A (主行星) 轨道参数 ───
  const a1 = params.a ?? 4.5
  const b1 = params.b ?? 3.0
  const T1 = params.period ?? 10

  const c1 = Math.sqrt(Math.max(0, a1 * a1 - b1 * b1))
  const e1 = a1 > 0 ? c1 / a1 : 0
  const rMin = a1 - c1
  const rMax = a1 + c1

  // ─── 画面几何中心与焦点坐标 ───
  const centerX = vp.centerX
  const centerY = vp.centerY
  const sunX = centerX + c1 * scale  // 右焦点放置太阳
  const sunY = centerY
  const foci2X = centerX - c1 * scale // 左焦点(虚焦点)
  const foci2Y = centerY

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: {
      x: 0,
      y: 0,
      width: canvasSize.width,
      height: canvasSize.height,
    },
    originX: centerX,
    originY: centerY,
    worldWidth: canvasSize.width,
    worldHeight: canvasSize.height,
  }), [canvasSize.width, canvasSize.height, centerX, centerY]);

  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig]);

  // ─── 计算行星A实时物理状态 ───
  const orbitA = useMemo(() => {
    return calculateKeplerOrbit(a1, b1, time, T1)
  }, [a1, b1, time, T1])

  const { cx: planetXA, cy: planetYA } = physicsToCanvas(
    orbitA.x,
    orbitA.y,
    canvasSize.width,
    canvasSize.height,
    scale
  )

  // ─── 计算行星 B (外轨道行星，仅第三定律模式下渲染) ───
  const a2 = params.a2 ?? 7.5
  const b2 = params.b2 ?? 6.0
  const T2 = T1 * Math.sqrt(Math.pow(a2 / a1, 3)) // T² ∝ a³ 自动联动

  const orbitB = useMemo(() => {
    return calculateKeplerOrbit(a2, b2, time, T2)
  }, [a2, b2, time, T2])

  const { cx: planetXB, cy: planetYB } = physicsToCanvas(
    orbitB.x,
    orbitB.y,
    canvasSize.width,
    canvasSize.height,
    scale
  )

  // ─── 行星 A 尾迹轨迹采样 ───
  const trailA = useMemo(() => {
    const points = []
    const step = 0.12 // 采样时间间隔
    const count = 7
    for (let i = 1; i <= count; i++) {
      const histTime = Math.max(0, time - i * step)
      const histOrbit = calculateKeplerOrbit(a1, b1, histTime, T1)
      const { cx, cy } = physicsToCanvas(
        histOrbit.x,
        histOrbit.y,
        canvasSize.width,
        canvasSize.height,
        scale
      )
      points.push({
        x: cx,
        y: cy,
        opacity: 0.7 * (1 - i / (count + 1)),
      })
    }
    return points
  }, [a1, b1, time, T1, canvasSize, scale])

  // ─── 第二定律面积区间扇形路径 ───
  const deltaTPercent = KEPLER_CONFIG.sweepTimeRatio
  const deltaM = 2 * Math.PI * deltaTPercent

  // 1. 近日点扇形
  const perihelionSector = useMemo(() => {
    const M_start = -deltaM / 2
    const M_end = deltaM / 2
    const E_start = solveKeplerEquation(M_start, e1)
    const E_end = solveKeplerEquation(M_end, e1)

    const { cx: xA, cy: yA } = physicsToCanvas(
      a1 * Math.cos(E_start),
      b1 * Math.sin(E_start),
      canvasSize.width,
      canvasSize.height,
      scale
    )
    const { cx: xB, cy: yB } = physicsToCanvas(
      a1 * Math.cos(E_end),
      b1 * Math.sin(E_end),
      canvasSize.width,
      canvasSize.height,
      scale
    )

    return `M ${sunX} ${sunY} L ${xA} ${yA} A ${a1 * scale} ${b1 * scale} 0 0 0 ${xB} ${yB} Z`
  }, [a1, b1, e1, sunX, sunY, canvasSize, deltaM, scale])

  // 2. 远日点扇形
  const aphelionSector = useMemo(() => {
    const M_start = Math.PI - deltaM / 2
    const M_end = Math.PI + deltaM / 2
    const E_start = solveKeplerEquation(M_start, e1)
    const E_end = solveKeplerEquation(M_end, e1)

    const { cx: xA, cy: yA } = physicsToCanvas(
      a1 * Math.cos(E_start),
      b1 * Math.sin(E_start),
      canvasSize.width,
      canvasSize.height,
      scale
    )
    const { cx: xB, cy: yB } = physicsToCanvas(
      a1 * Math.cos(E_end),
      b1 * Math.sin(E_end),
      canvasSize.width,
      canvasSize.height,
      scale
    )

    return `M ${sunX} ${sunY} L ${xA} ${yA} A ${a1 * scale} ${b1 * scale} 0 0 0 ${xB} ${yB} Z`
  }, [a1, b1, e1, sunX, sunY, canvasSize, deltaM, scale])

  // 判定行星当前平近点角是否落在扇形区间
  const M_current = ((2 * Math.PI) / T1 * time) % (2 * Math.PI)
  const isInPerihelion = M_current <= deltaM / 2 || M_current >= 2 * Math.PI - deltaM / 2
  const isInAphelion = M_current >= Math.PI - deltaM / 2 && M_current <= Math.PI + deltaM / 2

  // ─── 动态矢量显示配置 ─────────────────────────────────────────────
  const vectorConfig = useMemo(() => {
    const shortSide = Math.min(canvasSize.width, canvasSize.height)
    return {
      velocity: {
        scale: VECTOR_DISPLAY.velocity.scaleBase,
        minLength: VECTOR_DISPLAY.velocity.minLength,
        maxLength: shortSide * VECTOR_DISPLAY.velocity.maxLengthRatio,
      },
      force: {
        scale: VECTOR_DISPLAY.force.scaleBase,
        minLength: VECTOR_DISPLAY.force.minLength,
        maxLength: shortSide * VECTOR_DISPLAY.force.maxLengthRatio,
      },
    }
  }, [canvasSize])

  // ─── 矢量箭头大小计算 ───
  // 1. 速度矢量 (经典蓝，与实际物理速度大小成正比)
  const speedScale = vectorConfig.velocity.scale
  const vxA = orbitA.vx * speedScale * scale * 0.05
  const vyA = -orbitA.vy * speedScale * scale * 0.05

  // 2. 引力矢量 (引力绿，与 1/r² 成正比)
  const forceScale = vectorConfig.force.scale
  const gravityMagA = forceScale / (orbitA.r * orbitA.r)
  const forceDirXA = (sunX - planetXA) / (orbitA.r * scale)
  const forceDirYA = (sunY - planetYA) / (orbitA.r * scale)
  const fxA = forceDirXA * gravityMagA
  const fyA = forceDirYA * gravityMagA

  // ─── 动态画中画图表尺寸 ─────────────────────────────────────────────
  const chartDimensions = useMemo(() => {
    const width = clamp(
      canvasSize.width * INSET_CHART.widthRatio,
      INSET_CHART.minWidth,
      canvasSize.width * INSET_CHART.maxWidthRatio
    )
    const height = clamp(
      canvasSize.height * INSET_CHART.heightRatio,
      INSET_CHART.minHeight,
      canvasSize.height * INSET_CHART.maxHeightRatio
    )
    const padding = canvasSize.width * INSET_CHART.paddingRatio
    return { width, height, padding }
  }, [canvasSize])

  // ─── 第三定律画中画图表几何计算 ───
  const chartW = chartDimensions.width
  const chartH = chartDimensions.height
  const chartX0 = canvasSize.width - chartW - chartDimensions.padding
  const chartY0 = canvasSize.height - chartDimensions.padding

  // 动力学量程换算
  const a3_1 = a1 * a1 * a1
  const t2_1 = T1 * T1
  const k_ratio = t2_1 / a3_1 // 物理常数 k

  const a3_2 = a2 * a2 * a2
  const t2_2 = T2 * T2

  // 动态分配量程，保证斜线恒为对角线
  const maxA3 = Math.max(a3_1, a3_2) * 1.15
  const maxT2 = maxA3 * k_ratio

  const a3ToX = (val: number) => chartX0 + (val / maxA3) * chartW
  const t2ToY = (val: number) => chartY0 - (val / maxT2) * chartH

  return (
    <div ref={containerRef} className="w-full h-full relative flex items-center justify-center">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-neutral-50 rounded-xl shadow-inner border border-neutral-200"
      >
        {/* ── 统一材质与渐变定义 (完全去除颜色硬编码) ── */}
        <defs>
          {/* 恒星(太阳)耀斑径向渐变 */}
          <radialGradient id="sun-glow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={SCENE_COLORS.bulb.glowCenter} />
            <stop offset="25%" stopColor={SCENE_COLORS.bulb.glowInner} />
            <stop offset="65%" stopColor={SCENE_COLORS.bulb.glowOuter} />
            <stop offset="100%" stopColor={SCENE_COLORS.bulb.glowFade} />
          </radialGradient>
          {/* 行星 A (蓝色) 3D球体渐变 */}
          <radialGradient id="planet-a-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.planetCool.gradient[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.sphere.planetCool.gradient[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.planetCool.gradient[3]} />
          </radialGradient>
          {/* 行星 B (红色) 3D球体渐变 */}
          <radialGradient id="planet-b-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.planetWarm.gradient[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.sphere.planetWarm.gradient[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.planetWarm.gradient[3]} />
          </radialGradient>
          {/* 虚焦点 3D 渐变 */}
          <radialGradient id="foci-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PHYSICS_COLORS.axis} />
            <stop offset="100%" stopColor={PHYSICS_COLORS.axis} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* ── 辅助坐标轴 ── */}
        <line
          x1={10}
          y1={centerY}
          x2={canvasSize.width - 10}
          y2={centerY}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        <line
          x1={centerX}
          y1={10}
          x2={centerX}
          y2={canvasSize.height - 10}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        {/* ── 2. 第二定律扫过面积扇形 (mode === 1) ── */}
        {mode === 1 && (
          <g>
            {/* 近日点扫过面积 */}
            <path
              d={perihelionSector}
              fill={PHYSICS_COLORS.electricField}
              fillOpacity={isInPerihelion ? 0.28 : 0.12}
              stroke={PHYSICS_COLORS.electricField}
              strokeOpacity={0.35}
              strokeWidth={1}
              className="transition-all duration-200"
            />
            <text
              x={centerX + a1 * scale - 25}
              y={centerY + b1 * scale * 0.32}
              fill={PHYSICS_COLORS.friction}
              fontSize={font(10)}
              fontWeight="bold"
              className="select-none"
            >
              近日面积 S₁
            </text>

            {/* 远日点扫过面积 */}
            <path
              d={aphelionSector}
              fill={PHYSICS_COLORS.electricField}
              fillOpacity={isInAphelion ? 0.28 : 0.12}
              stroke={PHYSICS_COLORS.electricField}
              strokeOpacity={0.35}
              strokeWidth={1}
              className="transition-all duration-200"
            />
            <text
              x={centerX - a1 * scale + 5}
              y={centerY + b1 * scale * 0.32}
              fill={PHYSICS_COLORS.friction}
              fontSize={font(10)}
              fontWeight="bold"
              className="select-none"
            >
              远日面积 S₂
            </text>
          </g>
        )}

        {/* ── 3. 轨道线 ── */}
        {/* 行星 A 轨道线 */}
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={a1 * scale}
          ry={b1 * scale}
          fill="none"
          stroke={PHYSICS_COLORS.velocity}
          strokeOpacity={0.22}
          strokeWidth={1.5}
        />

        {/* 行星 B 轨道线 (仅 mode === 2 渲染) */}
        {mode === 2 && (
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={a2 * scale}
            ry={b2 * scale}
            fill="none"
            stroke={PHYSICS_COLORS.acceleration}
            strokeOpacity={0.18}
            strokeWidth={1.5}
          />
        )}

        {/* ── 4. 第一定律两焦点和连线 (mode === 0) ── */}
        {mode === 0 && (
          <g>
            {/* 行星到主焦点(太阳)连线 r1 */}
            <line
              x1={planetXA}
              y1={planetYA}
              x2={sunX}
              y2={sunY}
              stroke={PHYSICS_COLORS.displacement}
              strokeOpacity={0.65}
              strokeWidth={1.2}
              strokeDasharray="4,4"
            />
            {/* 行星到副焦点连线 r2 */}
            <line
              x1={planetXA}
              y1={planetYA}
              x2={foci2X}
              y2={foci2Y}
              stroke={PHYSICS_COLORS.potentialEnergy}
              strokeOpacity={0.65}
              strokeWidth={1.2}
              strokeDasharray="4,4"
            />
            {/* 标示 r1 */}
            <text
              x={(planetXA + sunX) / 2 + 10}
              y={(planetYA + sunY) / 2 - 8}
              fill={PHYSICS_COLORS.displacement}
              fontSize={font(11)}
              fontWeight="bold"
              className="font-mono bg-white"
            >
              r₁={orbitA.r.toFixed(2)}
            </text>
            {/* 标示 r2 */}
            <text
              x={(planetXA + foci2X) / 2 - 25}
              y={(planetYA + foci2Y) / 2 - 8}
              fill={PHYSICS_COLORS.potentialEnergy}
              fontSize={font(11)}
              fontWeight="bold"
              className="font-mono bg-white"
            >
              r₂={(2 * a1 - orbitA.r).toFixed(2)}
            </text>

            {/* 副焦点(虚焦点)十字星 */}
            <g transform={`translate(${foci2X}, ${foci2Y})`}>
              <circle r={10} fill="url(#foci-grad)" opacity={0.7} />
              <line x1={-8} y1={0} x2={8} y2={0} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} />
              <line x1={0} y1={-8} x2={0} y2={8} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} />
              <text x={10} y={15} fill={PHYSICS_COLORS.labelTextLight} fontSize={font(9)} className="select-none font-semibold">
                副焦点 F₂
              </text>
            </g>

            {/* 几何定义底部验证条 */}
            <g transform={`translate(20, ${canvasSize.height - 20})`}>
              <text fill={PHYSICS_COLORS.labelText} fontSize={font(11)} className="font-semibold select-none">
                第一定律验证 (椭圆定义)：r₁ + r₂ = 2a = {(orbitA.r + (2 * a1 - orbitA.r)).toFixed(1)}（恒定值）
              </text>
            </g>
          </g>
        )}

        {/* ── 5. 行星尾迹渐变虚影 (仅 mode !== 2 显示) ── */}
        {mode !== 2 &&
          trailA.map((pt, i) => (
            <circle
              key={`trail-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={7 * (1 - i / 10)}
              fill={PHYSICS_COLORS.velocity}
              opacity={0.28 * pt.opacity}
            />
          ))}

        {/* ── 6. 行星 A 渲染 ── */}
        <circle cx={planetXA} cy={planetYA} r={10} fill="url(#planet-a-grad)" />
        <text
          x={planetXA + 12}
          y={planetYA - 12}
          fill={PHYSICS_COLORS.labelText}
          fontSize={font(11)}
          fontWeight="bold"
          className="select-none"
        >
          {mode === 2 ? '行星 A' : '行星'}
        </text>

        {/* ── 7. 行星 B 渲染 (仅 mode === 2 渲染) ── */}
        {mode === 2 && (
          <g>
            <circle cx={planetXB} cy={planetYB} r={8} fill="url(#planet-b-grad)" />
            <text
              x={planetXB + 12}
              y={planetYB - 12}
              fill={PHYSICS_COLORS.labelText}
              fontSize={font(11)}
              fontWeight="bold"
              className="select-none"
            >
              行星 B
            </text>
          </g>
        )}

        {/* ── 8. 恒星(太阳)渲染 ── */}
        <circle cx={sunX} cy={sunY} r={28} fill="url(#sun-glow-grad)" className="animate-pulse" />
        <circle cx={sunX} cy={sunY} r={14} fill={PHYSICS_COLORS.electricFieldLine} stroke={PHYSICS_COLORS.electricField} strokeWidth={1} />
        <text
          x={sunX - 11}
          y={sunY + 32}
          fill={PHYSICS_COLORS.electricField}
          fontSize={font(11)}
          fontWeight="bold"
          className="select-none"
        >
          太阳 (焦点 F₁)
        </text>

        {/* ── 9. 物理矢量箭头渲染 (showVectors) ── */}
        {showVectors && (
          <g>
            {/* 行星 A 速度 (经典蓝) */}
            <VectorArrow
              origin={{ x: planetXA - centerX, y: centerY - planetYA }}
              vector={{ x: vxA, y: -vyA }}
              type="velocity"
              sceneScale={sceneScale}
            />
            <text
              x={planetXA + vxA + (vxA >= 0 ? 8 : -14)}
              y={planetYA + vyA + (vyA >= 0 ? 8 : -8)}
              fill={PHYSICS_COLORS.velocity}
              fontSize={font(12)}
              fontWeight="bold"
              className="italic select-none"
            >
              v
            </text>

            {/* 行星 A 万有引力 (重力深绿) */}
            <VectorArrow
              origin={{ x: planetXA - centerX, y: centerY - planetYA }}
              vector={{ x: fxA, y: -fyA }}
              type="gravity"
              sceneScale={sceneScale}
            />
            <text
              x={planetXA + fxA + (fxA >= 0 ? 8 : -14)}
              y={planetYA + fyA + (fyA >= 0 ? 8 : -8)}
              fill={PHYSICS_COLORS.gravity}
              fontSize={font(12)}
              fontWeight="bold"
              className="italic select-none"
            >
              F
            </text>
          </g>
        )}

        {/* ── 10. 第二定律模式下，面积扫过时间卡片 ── */}
        {mode === 1 && (
          <g transform={`translate(${canvasSize.width - 160}, 25)`}>
            <rect
              width={140}
              height={50}
              rx={6}
              fill={colors.neutral.white}
              fillOpacity={0.9}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={1}
            />
            <text x={70} y={18} fill={PHYSICS_COLORS.labelTextLight} fontSize={font(9)} textAnchor="middle" className="select-none font-semibold">
              扫过时间占周期百分比
            </text>
            <text
              x={70}
              y={40}
              fill={(isInPerihelion || isInAphelion) ? CANVAS_COLORS.annotation : PHYSICS_COLORS.gravity}
              fontSize={font(15)}
              fontWeight="bold"
              textAnchor="middle"
              className="font-mono"
            >
              {(deltaTPercent * 100).toFixed(0)}% (恒定)
            </text>
          </g>
        )}

        {/* ── 11. 第三定律模式下，T² - a³ 对角直线图像 (画中画) ── */}
        {mode === 2 && (
          <g>
            {/* 图表底色和边框 */}
            <rect
              x={chartX0 - 10}
              y={chartY0 - chartH - 10}
              width={chartW + 20}
              height={chartH + 20}
              fill={colors.neutral.white}
              fillOpacity={0.9}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={1}
              rx={6}
            />
            <text
              x={chartX0 + chartW / 2}
              y={chartY0 - chartH - 2}
              fontSize={font(9)}
              fill={PHYSICS_COLORS.labelTextLight}
              fontWeight="bold"
              textAnchor="middle"
            >
              T² - a³ 关系图像
            </text>

            {/* 图像坐标轴 */}
            <line x1={chartX0} y1={chartY0} x2={chartX0 + chartW + 5} y2={chartY0} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} />
            <line x1={chartX0} y1={chartY0} x2={chartX0} y2={chartY0 - chartH - 5} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} />
            <text x={chartX0 + chartW + 2} y={chartY0 + 9} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">a³</text>
            <text x={chartX0 - 4} y={chartY0 - chartH} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight}>T²</text>

            {/* 坐标刻度 */}
            <text x={chartX0} y={chartY0 + 9} fontSize={font(7)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">0</text>
            <text x={chartX0 + chartW} y={chartY0 + 9} fontSize={font(7)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
              {maxA3.toFixed(0)}
            </text>
            <text x={chartX0 - 4} y={chartY0 - chartH + 3} fontSize={font(7)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">
              {maxT2.toFixed(0)}
            </text>

            {/* 第三定律理论正比斜率线 */}
            <line
              x1={chartX0}
              y1={chartY0}
              x2={chartX0 + chartW}
              y2={chartY0 - chartH}
              stroke={PHYSICS_COLORS.friction}
              strokeWidth={1.5}
              strokeOpacity={0.65}
            />
            <text
              x={chartX0 + chartW - 10}
              y={chartY0 - chartH + 12}
              fontSize={font(8)}
              fill={PHYSICS_COLORS.friction}
              fontWeight="semibold"
            >
              斜率 k
            </text>

            {/* 行星 A 在图表中的当前状态游标点 (经典蓝) */}
            <circle cx={a3ToX(a3_1)} cy={t2ToY(t2_1)} r={4} fill={PHYSICS_COLORS.velocity} />
            <circle cx={a3ToX(a3_1)} cy={t2ToY(t2_1)} r={8} fill="none" stroke={PHYSICS_COLORS.velocity} strokeWidth={0.5} opacity={0.5} className="animate-ping" />
            <text x={a3ToX(a3_1) - 6} y={t2ToY(t2_1) - 5} fontSize={font(7)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">A</text>

            {/* 行星 B 在图表中的当前状态游标点 (天空蓝/次要速度) */}
            <circle cx={a3ToX(a3_2)} cy={t2ToY(t2_2)} r={4} fill={PHYSICS_COLORS.averageVelocity} />
            <circle cx={a3ToX(a3_2)} cy={t2ToY(t2_2)} r={8} fill="none" stroke={PHYSICS_COLORS.averageVelocity} strokeWidth={0.5} opacity={0.5} className="animate-ping" />
            <text x={a3ToX(a3_2) + 6} y={t2ToY(t2_2) - 5} fontSize={font(7)} fill={PHYSICS_COLORS.averageVelocity} fontWeight="bold">B</text>
          </g>
        )}

        {/* ── 12. 实验公式与大标题 (showFormulas) ── */}
        {showFormulas && (
          <g transform="translate(20, 30)">
            <text
              fontSize={CANVAS_STYLE.font.title}
              fill={PHYSICS_COLORS.labelText}
              fontWeight="bold"
              fontFamily={CANVAS_STYLE.font.family}
              className="select-none"
            >
              {mode === 0 && '开普勒第一定律 (轨道与双焦点)'}
              {mode === 1 && '开普勒第二定律 (等时间面积守恒)'}
              {mode === 2 && '开普勒第三定律 (周期长半轴正比)'}
            </text>
            <g transform="translate(0, 15)">
              <text
                x={0}
                y={15}
                fontSize={CANVAS_STYLE.font.bodySize}
                fill={PHYSICS_COLORS.labelTextLight}
                fontFamily={CANVAS_STYLE.font.family}
                className="select-none"
              >
                {mode === 0 && `椭圆偏心率 e = ${e1.toFixed(2)}`}
                {mode === 1 && `近日点距日 r_min = ${rMin.toFixed(2)}`}
                {mode === 2 && `内长半轴 a₁ = ${a1.toFixed(1)}, 周期 T₁ = ${T1.toFixed(1)}s`}
              </text>
              <text
                x={0}
                y={35}
                fontSize={CANVAS_STYLE.font.bodySize}
                fill={PHYSICS_COLORS.labelTextLight}
                fontFamily={CANVAS_STYLE.font.family}
                className="select-none"
              >
                {mode === 0 && `焦半径之和 r₁ + r₂ = 2a = ${(2 * a1).toFixed(1)}`}
                {mode === 1 && `远日点距日 r_max = ${rMax.toFixed(2)}`}
                {mode === 2 && `外长半轴 a₂ = ${a2.toFixed(1)}, 周期 T₂ = ${T2.toFixed(1)}s`}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  )
}
