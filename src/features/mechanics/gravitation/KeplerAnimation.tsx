import { PhysicsVectorArrow } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, CANVAS_STYLE, KEPLER_CONFIG, INSET_CHART } from '@/theme/physics'
import { useMemo, useCallback } from 'react'

import { RelationChart } from '@/components/Chart'
import { worldToDesign } from '@/scene'
import { useKeplerPhysics } from './hooks/useKeplerPhysics'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export default function KeplerAnimation() {
  const { params, time, showVectors, showFormulas } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      showFormulas: s.showFormulas,
    }))
  )
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
  const { font } = canvasSize

  const kepler = useKeplerPhysics(params, time)

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
  } = kepler

  // ── sceneScale（物理坐标 → 设计坐标，anchor:'center' + centerSource:'design'）──
  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'center',
    physicsScaleDesign: KEPLER_CONFIG.scaleBase,
    centerSource: 'design',
  })

  // ── 物理坐标 → 设计坐标转换 ──
  const toDesign = useCallback(
    (px: number, py: number) => worldToDesign(px, py, sceneScale),
    [sceneScale],
  )

  const { px: sunDx, py: sunDy } = toDesign(sunPhysX, sunPhysY)
  const { px: foci2Dx, py: foci2Dy } = toDesign(foci2PhysX, foci2PhysY)
  const { px: planetDx, py: planetDy } = toDesign(planetX, planetY)
  const { px: planetBDx, py: planetBDy } = toDesign(planetBX, planetBY)

  // ── 画中画图表尺寸（从设计坐标计算）──
  const chartW = useMemo(() => clamp(
    preset.width * INSET_CHART.widthRatio,
    INSET_CHART.minWidth,
    preset.width * INSET_CHART.maxWidthRatio,
  ), [preset.width])

  const chartH = useMemo(() => clamp(
    preset.height * INSET_CHART.heightRatio,
    INSET_CHART.minHeight,
    preset.height * INSET_CHART.maxHeightRatio,
  ), [preset.height])

  const chartPadding = preset.width * INSET_CHART.paddingRatio

  // ── 扇形 SVG path 构建 ──
  const perihelionSector = useMemo(() => {
    const [sun, arcStart, arcEnd] = sectorPoints.perihelion
    const s0 = toDesign(sun.x, sun.y)
    const s1 = toDesign(arcStart.x, arcStart.y)
    const s2 = toDesign(arcEnd.x, arcEnd.y)
    return `M ${s0.px} ${s0.py} L ${s1.px} ${s1.py} A ${a1 * sceneScale.scaleX} ${b1 * sceneScale.scaleX} 0 0 0 ${s2.px} ${s2.py} Z`
  }, [sectorPoints.perihelion, toDesign, a1, b1, sceneScale.scaleX])

  const aphelionSector = useMemo(() => {
    const [sun, arcStart, arcEnd] = sectorPoints.aphelion
    const s0 = toDesign(sun.x, sun.y)
    const s1 = toDesign(arcStart.x, arcStart.y)
    const s2 = toDesign(arcEnd.x, arcEnd.y)
    return `M ${s0.px} ${s0.py} L ${s1.px} ${s1.py} A ${a1 * sceneScale.scaleX} ${b1 * sceneScale.scaleX} 0 0 0 ${s2.px} ${s2.py} Z`
  }, [sectorPoints.aphelion, toDesign, a1, b1, sceneScale.scaleX])

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
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
        y1={sceneScale.originY}
        x2={preset.width - 10}
        y2={sceneScale.originY}
        stroke={PHYSICS_COLORS.axis}
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <line
        x1={sceneScale.originX}
        y1={10}
        x2={sceneScale.originX}
        y2={preset.height - 10}
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
            x={sceneScale.originX + a1 * sceneScale.scaleX - 25}
            y={sceneScale.originY + b1 * sceneScale.scaleX * 0.32}
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
            x={sceneScale.originX - a1 * sceneScale.scaleX + 5}
            y={sceneScale.originY + b1 * sceneScale.scaleX * 0.32}
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
        cx={sceneScale.originX}
        cy={sceneScale.originY}
        rx={a1 * sceneScale.scaleX}
        ry={b1 * sceneScale.scaleX}
        fill="none"
        stroke={PHYSICS_COLORS.velocity}
        strokeOpacity={0.22}
        strokeWidth={1.5}
      />

      {mode === 2 && (
        <ellipse
          cx={sceneScale.originX}
          cy={sceneScale.originY}
          rx={a2 * sceneScale.scaleX}
          ry={b2 * sceneScale.scaleX}
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
            x1={planetDx}
            y1={planetDy}
            x2={sunDx}
            y2={sunDy}
            stroke={PHYSICS_COLORS.displacement}
            strokeOpacity={0.65}
            strokeWidth={1.2}
            strokeDasharray="4,4"
          />
          <line
            x1={planetDx}
            y1={planetDy}
            x2={foci2Dx}
            y2={foci2Dy}
            stroke={PHYSICS_COLORS.potentialEnergy}
            strokeOpacity={0.65}
            strokeWidth={1.2}
            strokeDasharray="4,4"
          />
          <text
            x={(planetDx + sunDx) / 2 + 10}
            y={(planetDy + sunDy) / 2 - 8}
            fill={PHYSICS_COLORS.displacement}
            fontSize={font(11)}
            fontWeight="bold"
            className="font-mono bg-white"
          >
            r₁={orbitA.r.toFixed(2)}
          </text>
          <text
            x={(planetDx + foci2Dx) / 2 - 25}
            y={(planetDy + foci2Dy) / 2 - 8}
            fill={PHYSICS_COLORS.potentialEnergy}
            fontSize={font(11)}
            fontWeight="bold"
            className="font-mono bg-white"
          >
            r₂={(2 * a1 - orbitA.r).toFixed(2)}
          </text>

          <g transform={`translate(${foci2Dx}, ${foci2Dy})`}>
            <circle r={10} fill="url(#foci-grad)" opacity={0.7} />
            <line x1={-8} y1={0} x2={8} y2={0} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} />
            <line x1={0} y1={-8} x2={0} y2={8} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} />
            <text x={10} y={15} fill={PHYSICS_COLORS.labelTextLight} fontSize={font(9)} className="select-none font-semibold">
              副焦点 F₂
            </text>
          </g>

          <g transform={`translate(20, ${preset.height - 20})`}>
            <text fill={PHYSICS_COLORS.labelText} fontSize={font(11)} className="font-semibold select-none">
              第一定律验证 (椭圆定义)：r₁ + r₂ = 2a = {(orbitA.r + (2 * a1 - orbitA.r)).toFixed(1)}（恒定值）
            </text>
          </g>
        </g>
      )}

      {/* ── 5. 行星尾迹渐变虚影 ── */}
      {mode !== 2 &&
        trail.map((pt, i) => {
          const { px, py } = toDesign(pt.x, pt.y)
          return (
            <circle
              key={`trail-${i}`}
              cx={px}
              cy={py}
              r={7 * (1 - i / 10)}
              fill={PHYSICS_COLORS.velocity}
              opacity={0.28 * pt.opacity}
            />
          )
        })}

      {/* ── 6. 行星 A 渲染 ── */}
      <circle cx={planetDx} cy={planetDy} r={10} fill="url(#planet-a-grad)" />
      <text
        x={planetDx + 12}
        y={planetDy - 12}
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
          <circle cx={planetBDx} cy={planetBDy} r={8} fill="url(#planet-b-grad)" />
          <text
            x={planetBDx + 12}
            y={planetBDy - 12}
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
      <circle cx={sunDx} cy={sunDy} r={28} fill="url(#sun-glow-grad)" className="animate-pulse" />
      <circle cx={sunDx} cy={sunDy} r={14} fill={SCENE_COLORS.bulb.glowInner} stroke={SCENE_COLORS.bulb.glowOuter} strokeWidth={1} />
      <text
        x={sunDx - 11}
        y={sunDy + 32}
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
          <PhysicsVectorArrow
            originDesign={{ x: planetDx, y: planetDy }}
            vector={{ x: vxA, y: vyA }}
            type="velocity"
            sceneScale={sceneScale}
            label="v"
            font={font}
          />

          <PhysicsVectorArrow
            originDesign={{ x: planetDx, y: planetDy }}
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
        <g transform={`translate(${preset.width - 160}, 25)`}>
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
        <g transform={`translate(${preset.width - chartW - chartPadding}, ${preset.height - chartH - chartPadding})`}>
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
    </AnimationSvgCanvas>
  )
}
