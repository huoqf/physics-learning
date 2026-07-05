import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { useMemo } from 'react'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { RelationChart } from '@/components/Chart'
import { createSceneScaleFromViewport } from '@/scene'
import { useKeplerPhysics } from './hooks/useKeplerPhysics'

export default function KeplerAnimation() {
  const DESIGN_WIDTH = 700
  const DESIGN_HEIGHT = 450

  const { params, time, showVectors, showFormulas } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      showFormulas: s.showFormulas,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.tall)
  const { font } = canvasSize

  const vp = useViewport(canvasSize, {
    designWidth: DESIGN_WIDTH,
    designHeight: DESIGN_HEIGHT,
  })

  const kepler = useKeplerPhysics(params, time, canvasSize, {
    centerX: vp.centerX,
    centerY: vp.centerY,
    scale: vp.scale,
  })

  const {
    mode, a1, b1, e1, rMin, rMax, T1,
    a2, b2, T2,
    centerX, centerY, sunX, sunY, foci2X, foci2Y,
    planetXA, planetYA, orbitA,
    planetXB, planetYB,
    trailA,
    perihelionSector, aphelionSector,
    isInPerihelion, isInAphelion,
    deltaTPercent,
    vxA, vyA, fxA, fyA,
    chartW, chartH, chartPadding,
    a3_1, t2_1, a3_2, t2_2, maxA3, maxT2,
    scale,
  } = kepler

  const sceneScale = useMemo(() => createSceneScaleFromViewport(vp, 'centerScale'), [vp]);

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
              fill={CANVAS_COLORS.annotation}
              fillOpacity={isInPerihelion ? 0.28 : 0.12}
              stroke={CANVAS_COLORS.annotation}
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
              fill={CANVAS_COLORS.annotation}
              fillOpacity={isInAphelion ? 0.28 : 0.12}
              stroke={CANVAS_COLORS.annotation}
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
        <circle cx={sunX} cy={sunY} r={14} fill={SCENE_COLORS.bulb.glowInner} stroke={SCENE_COLORS.bulb.glowOuter} strokeWidth={1} />
        <text
          x={sunX - 11}
          y={sunY + 32}
          fill={PHYSICS_COLORS.labelText}
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
              fill={CANVAS_COLORS.white}
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
          <g transform={`translate(${canvasSize.width - chartW - chartPadding}, ${canvasSize.height - chartH - chartPadding})`}>
            <RelationChart
              points={[{ x: a3_1, y: t2_1 }, { x: a3_2, y: t2_2 }]}
              xDomain={[0, maxA3]}
              yDomain={[0, maxT2]}
              xLabel="a³"
              yLabel="T²"
              title="T² - a³ 关系图像"
              series="primary"
              fixedSize={{ width: chartW, height: chartH }}
              variant="mini"
              showGrid={false}
              markers={[
                {
                  axis: 'point',
                  x: maxA3,
                  y: maxT2,
                  label: '斜率 k',
                  color: PHYSICS_COLORS.friction,
                },
                {
                  axis: 'point',
                  x: a3_1,
                  y: t2_1,
                  label: 'A',
                  color: PHYSICS_COLORS.velocity,
                },
                {
                  axis: 'point',
                  x: a3_2,
                  y: t2_2,
                  label: 'B',
                  color: PHYSICS_COLORS.averageVelocity,
                },
              ]}
              additionalSeries={[
                {
                  points: [
                    { x: 0, y: 0 },
                    { x: maxA3, y: maxT2 },
                  ],
                  color: PHYSICS_COLORS.friction,
                  strokeDasharray: [4, 4],
                  strokeWidth: 1.5,
                },
              ]}
            />
          </g>
        )}

        {/* ── 12. 实验公式与大标题 (showFormulas) ── */}
        {showFormulas && (
          <g transform="translate(20, 30)">
            <text
              fontSize={font(18)}
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
                fontSize={font(13)}
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
                fontSize={font(13)}
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
