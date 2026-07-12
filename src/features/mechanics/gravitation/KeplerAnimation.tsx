import { VectorArrow } from '@/components/Physics'
import { useCanvasSize, useViewport } from '@/utils'
import { useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, CANVAS_STYLE, KEPLER_CONFIG, INSET_CHART } from '@/theme/physics'
import { useMemo, useCallback } from 'react'

import { RelationChart } from '@/components/Chart'
import { physicsToCanvasWithOrigin } from '@/utils/coordinate'
import { useKeplerPhysics } from './hooks/useKeplerPhysics'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export default function KeplerAnimation() {
  const DESIGN_WIDTH = 840
  const DESIGN_HEIGHT = 650

  const { params, time, showVectors, showFormulas } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      showFormulas: s.showFormulas,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
  const { font } = canvasSize

  const vp = useViewport(canvasSize, {
    designWidth: DESIGN_WIDTH,
    designHeight: DESIGN_HEIGHT,
  })

  const orbitScale = KEPLER_CONFIG.scaleBase * vp.scale

  const kepler = useKeplerPhysics(params, time, {
    centerX: vp.centerX,
    centerY: vp.centerY,
    scale: vp.scale,
  })

  const {
    mode, a1, b1, e1, rMin, rMax, T1,
    a2, b2, T2,
    sunPhysX, sunPhysY, foci2PhysX, foci2PhysY,
    planetX, planetY, orbitA,
    planetBX, planetBY,
    trail,
    sectorPoints,
    isInPerihelion, isInAphelion,
    deltaTPercent,
    vxA, vyA, fxA, fyA,
    a3_1, t2_1, a3_2, t2_2, maxA3, maxT2,
    scale,
  } = kepler

  // ── 物理坐标 → 画布坐标转换（原点在 vp.centerX/centerY）──
  const toCanvas = useCallback(
    (px: number, py: number) =>
      physicsToCanvasWithOrigin(px, py, vp.centerX, vp.centerY, orbitScale),
    [vp.centerX, vp.centerY, orbitScale],
  )

  const { cx: sunCx, cy: sunCy } = toCanvas(sunPhysX, sunPhysY)
  const { cx: foci2Cx, cy: foci2Cy } = toCanvas(foci2PhysX, foci2PhysY)
  const { cx: planetCx, cy: planetCy } = toCanvas(planetX, planetY)
  const { cx: planetBCx, cy: planetBCy } = toCanvas(planetBX, planetBY)

  // ── sceneScale（物理坐标 → 当前 SVG 坐标）──
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.full,
    anchor: 'custom',
    customOriginX: vp.centerX,
    customOriginY: vp.centerY,
    customScaleX: orbitScale,
    customScaleY: orbitScale,
  })

  // ── 画中画图表尺寸（从 canvasSize 计算）──
  const chartW = useMemo(() => clamp(
    canvasSize.width * INSET_CHART.widthRatio,
    INSET_CHART.minWidth,
    canvasSize.width * INSET_CHART.maxWidthRatio,
  ), [canvasSize.width])

  const chartH = useMemo(() => clamp(
    canvasSize.height * INSET_CHART.heightRatio,
    INSET_CHART.minHeight,
    canvasSize.height * INSET_CHART.maxHeightRatio,
  ), [canvasSize.height])

  const chartPadding = canvasSize.width * INSET_CHART.paddingRatio

  // ── 扇形 SVG path 构建 ──
  const perihelionSector = useMemo(() => {
    const [sun, arcStart, arcEnd] = sectorPoints.perihelion
    const s0 = toCanvas(sun.x, sun.y)
    const s1 = toCanvas(arcStart.x, arcStart.y)
    const s2 = toCanvas(arcEnd.x, arcEnd.y)
    return `M ${s0.cx} ${s0.cy} L ${s1.cx} ${s1.cy} A ${a1 * orbitScale} ${b1 * orbitScale} 0 0 0 ${s2.cx} ${s2.cy} Z`
  }, [sectorPoints.perihelion, toCanvas, a1, b1, orbitScale])

  const aphelionSector = useMemo(() => {
    const [sun, arcStart, arcEnd] = sectorPoints.aphelion
    const s0 = toCanvas(sun.x, sun.y)
    const s1 = toCanvas(arcStart.x, arcStart.y)
    const s2 = toCanvas(arcEnd.x, arcEnd.y)
    return `M ${s0.cx} ${s0.cy} L ${s1.cx} ${s1.cy} A ${a1 * orbitScale} ${b1 * orbitScale} 0 0 0 ${s2.cx} ${s2.cy} Z`
  }, [sectorPoints.aphelion, toCanvas, a1, b1, orbitScale])

  return (
    <div ref={containerRef} className="w-full h-full relative flex items-center justify-center">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-neutral-50 rounded-xl shadow-inner border border-neutral-200"
      >
        {/* ── 统一材质与渐变定义 ── */}
        <defs>
          <radialGradient id="sun-glow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={SCENE_COLORS.bulb.glowCenter} />
            <stop offset="25%" stopColor={SCENE_COLORS.bulb.glowInner} />
            <stop offset="65%" stopColor={SCENE_COLORS.bulb.glowOuter} />
            <stop offset="100%" stopColor={SCENE_COLORS.bulb.glowFade} />
          </radialGradient>
          <radialGradient id="planet-a-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.planetCool.gradient[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.sphere.planetCool.gradient[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.planetCool.gradient[3]} />
          </radialGradient>
          <radialGradient id="planet-b-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.planetWarm.gradient[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.sphere.planetWarm.gradient[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.planetWarm.gradient[3]} />
          </radialGradient>
          <radialGradient id="foci-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PHYSICS_COLORS.axis} />
            <stop offset="100%" stopColor={PHYSICS_COLORS.axis} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* ── 辅助坐标轴 ── */}
        <line
          x1={10}
          y1={vp.centerY}
          x2={canvasSize.width - 10}
          y2={vp.centerY}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        <line
          x1={vp.centerX}
          y1={10}
          x2={vp.centerX}
          y2={canvasSize.height - 10}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        {/* ── 2. 第二定律扫过面积扇形 (mode === 1) ── */}
        {mode === 1 && (
          <g>
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
              x={vp.centerX + a1 * scale - 25}
              y={vp.centerY + b1 * scale * 0.32}
              fill={PHYSICS_COLORS.friction}
              fontSize={font(10)}
              fontWeight="bold"
              className="select-none"
            >
              近日面积 S₁
            </text>

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
              x={vp.centerX - a1 * scale + 5}
              y={vp.centerY + b1 * scale * 0.32}
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
        <ellipse
          cx={vp.centerX}
          cy={vp.centerY}
          rx={a1 * scale}
          ry={b1 * scale}
          fill="none"
          stroke={PHYSICS_COLORS.velocity}
          strokeOpacity={0.22}
          strokeWidth={1.5}
        />

        {mode === 2 && (
          <ellipse
            cx={vp.centerX}
            cy={vp.centerY}
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
            <line
              x1={planetCx}
              y1={planetCy}
              x2={sunCx}
              y2={sunCy}
              stroke={PHYSICS_COLORS.displacement}
              strokeOpacity={0.65}
              strokeWidth={1.2}
              strokeDasharray="4,4"
            />
            <line
              x1={planetCx}
              y1={planetCy}
              x2={foci2Cx}
              y2={foci2Cy}
              stroke={PHYSICS_COLORS.potentialEnergy}
              strokeOpacity={0.65}
              strokeWidth={1.2}
              strokeDasharray="4,4"
            />
            <text
              x={(planetCx + sunCx) / 2 + 10}
              y={(planetCy + sunCy) / 2 - 8}
              fill={PHYSICS_COLORS.displacement}
              fontSize={font(11)}
              fontWeight="bold"
              className="font-mono bg-white"
            >
              r₁={orbitA.r.toFixed(2)}
            </text>
            <text
              x={(planetCx + foci2Cx) / 2 - 25}
              y={(planetCy + foci2Cy) / 2 - 8}
              fill={PHYSICS_COLORS.potentialEnergy}
              fontSize={font(11)}
              fontWeight="bold"
              className="font-mono bg-white"
            >
              r₂={(2 * a1 - orbitA.r).toFixed(2)}
            </text>

            <g transform={`translate(${foci2Cx}, ${foci2Cy})`}>
              <circle r={10} fill="url(#foci-grad)" opacity={0.7} />
              <line x1={-8} y1={0} x2={8} y2={0} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} />
              <line x1={0} y1={-8} x2={0} y2={8} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} />
              <text x={10} y={15} fill={PHYSICS_COLORS.labelTextLight} fontSize={font(9)} className="select-none font-semibold">
                副焦点 F₂
              </text>
            </g>

            <g transform={`translate(20, ${canvasSize.height - 20})`}>
              <text fill={PHYSICS_COLORS.labelText} fontSize={font(11)} className="font-semibold select-none">
                第一定律验证 (椭圆定义)：r₁ + r₂ = 2a = {(orbitA.r + (2 * a1 - orbitA.r)).toFixed(1)}（恒定值）
              </text>
            </g>
          </g>
        )}

        {/* ── 5. 行星尾迹渐变虚影 ── */}
        {mode !== 2 &&
          trail.map((pt, i) => {
            const { cx, cy } = toCanvas(pt.x, pt.y)
            return (
              <circle
                key={`trail-${i}`}
                cx={cx}
                cy={cy}
                r={7 * (1 - i / 10)}
                fill={PHYSICS_COLORS.velocity}
                opacity={0.28 * pt.opacity}
              />
            )
          })}

        {/* ── 6. 行星 A 渲染 ── */}
        <circle cx={planetCx} cy={planetCy} r={10} fill="url(#planet-a-grad)" />
        <text
          x={planetCx + 12}
          y={planetCy - 12}
          fill={PHYSICS_COLORS.labelText}
          fontSize={font(11)}
          fontWeight="bold"
          className="select-none"
        >
          {mode === 2 ? '行星 A' : '行星'}
        </text>

        {/* ── 7. 行星 B 渲染 (仅 mode === 2) ── */}
        {mode === 2 && (
          <g>
            <circle cx={planetBCx} cy={planetBCy} r={8} fill="url(#planet-b-grad)" />
            <text
              x={planetBCx + 12}
              y={planetBCy - 12}
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
        <circle cx={sunCx} cy={sunCy} r={28} fill="url(#sun-glow-grad)" className="animate-pulse" />
        <circle cx={sunCx} cy={sunCy} r={14} fill={SCENE_COLORS.bulb.glowInner} stroke={SCENE_COLORS.bulb.glowOuter} strokeWidth={1} />
        <text
          x={sunCx - 11}
          y={sunCy + 32}
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
            <VectorArrow
              origin={{ x: planetX, y: planetY }}
              vector={{ x: vxA, y: vyA }}
              type="velocity"
              sceneScale={sceneScale}
              label="v"
              font={font}
            />

            <VectorArrow
              origin={{ x: planetX, y: planetY }}
              vector={{ x: fxA, y: fyA }}
              type="gravity"
              sceneScale={sceneScale}
              label="F"
              font={font}
            />
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
