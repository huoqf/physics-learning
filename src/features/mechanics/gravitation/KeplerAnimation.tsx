import { PhysicsVectorArrow } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, CANVAS_STYLE, KEPLER_CONFIG, INSET_CHART, VECTOR_VISUAL_WEIGHT } from '@/theme/physics'
import { useMemo, useCallback } from 'react'

import { RelationChart } from '@/components/Chart'
import { worldToDesign } from '@/scene'
import { refFromPeak } from '@/utils/vectorRefs'
import { calculateVectorPixelLength } from '@/utils/vectorLength'
import { useKeplerPhysics } from './hooks/useKeplerPhysics'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** 太阳与行星图元半径（design unit）。
 *
 * 统一从 KEPLER_CONFIG 取：物理层判断"近日点是否已进入恒星本体"用的是同一个 sunCoreR，
 * 渲染与校验不允许各写一个 14（否则改一处就会静默失配）。 */
const SUN_GLOW_R = KEPLER_CONFIG.sunGlowR
const SUN_CORE_R = KEPLER_CONFIG.sunCoreR
const PLANET_R = KEPLER_CONFIG.planetR

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
    mode, a1, b1, e1, rMin, rMax, T1, mass,
    a2, b2, T2,
    sunPhysX, sunPhysY, foci2PhysX, foci2PhysY,
    planetX, planetY, orbitA,
    orbitBCenterX, planetBX, planetBY, orbitSpanX,
    trail,
    sectorPoints,
    isInPerihelion, isInAphelion,
    deltaTPercent,
    vxA, vyA, fxA, fyA,
    a3_1, t2_1, a3_2, t2_2, k_ratio, maxA3, maxT2, referenceFamily,
    sweptTrace,
    legality,
  } = kepler

  // ── sceneScale（物理坐标 → 设计坐标，anchor:'center' + centerSource:'design'）──
  //
  // 矢量上限必须与轨道用同一把尺（世界尺），不能吃 useSceneScale 的默认值：
  //   · 默认 maxVectorLength = 可视区短边 × 0.3（画布尺），而本页几何由 physicsScaleDesign
  //     = scaleBase(32 design-unit/m) 固定 —— 两把尺互不相干，于是峰值箭头
  //     （恒为 0.9·maxVectorLength·weight）与轨道大小完全无关：
  //       a₁ 从 2.5 拖到 5.5，半长轴 80 → 176 px，而箭头恒 198.7 px，
  //       比值在 2.48 → 1.13 之间乱跳；换窗口还会再漂（实测 175.5 / 198.9 / 177.9 px，
  //       同一时刻轨道恒为 288 × 192）。
  //   · 改为 0.6 × 半长轴像素后，峰值 v = 0.54 × 半长轴，对 a₁ 与容器都恒定。
  const maxVectorLength = KEPLER_CONFIG.scaleBase * a1 * 0.6

  // ── 引力箭头的填充率按「几何距离」封顶，而不是取一个固定百分比 ──
  // 约束：箭头尖必须停在太阳本体之外（否则箭尖与标签会埋进日面，读作"斥力/起点错位"）。
  //   可用长度 = r_min·S − 太阳本体半径 − 2 px 余量
  //   F 峰值 = fill · maxVectorLength · weight[gravity]
  // 默认 a₁=4.5 / b₁=3.0（e≈0.745）：r_min≈1.15 m → 36.7 px，可用 20.7 px（≈0.56·r_min）。
  // 这里不用固定的 45%（=0.45·86.4·0.7≈27 px）：那样箭尖会落到 9 px 处，正好埋在 14 px 的日面里。
  // 也不取满 0.75·r_min：那同样是 27 px，箭尖同样入日。几何封顶在极端参数下还会自动收缩
  // （a₁=5.5 / b₁=1.5 → e≈0.96，r_min 仅 6.7 px），固定百分比则会直接戳穿太阳。
  // 代价：e 越大 F 越短（远日点只剩亚像素），这是 1/r² 在 e=0.75 下 47 倍量程的必然结果 ——
  // 线性映射只能保一头，这里优先保「方向指向太阳、不产生斥力错觉」。
  const rMinPx = rMin * KEPLER_CONFIG.scaleBase
  // 下限 6 px：b₁ 拉到 1.5、a₁ 拉到 5.5 时 e≈0.96，近日点距日只剩 6.7 px —— 行星本身已压在日面上，
  // 此时"箭头不进日面"已无解，与其让箭头塌成 0（画面上等同于矢量消失），不如保一个可见的短箭。
  const gravityPeakPx = Math.max(6, Math.min(0.75 * rMinPx, rMinPx - SUN_CORE_R - 2))
  const gravityFill = Math.max(
    1e-3,
    Math.min(1, gravityPeakPx / (maxVectorLength * VECTOR_VISUAL_WEIGHT.gravity)),
  )

  // ── 取景：让两轨并集的中心落在画布中心 ──
  // 第三定律模式下外轨共焦之后左端会伸到 c1 − c2 − a2（默认 8.625、最坏 18.0 世界单位），
  // 而画布半宽只有 13.125。把原点右移 `并集中点 × 比例尺` 之后，任何参数组合都留在画布内
  // （实测并集最大半宽 376 px < 420 px）。模式 0/1 只有内轨，中点恒为 0 → 与原来完全等价。
  const sceneCenterX = preset.width / 2 - orbitSpanX.center * KEPLER_CONFIG.scaleBase

  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'center',
    physicsScaleDesign: KEPLER_CONFIG.scaleBase,
    centerSource: 'custom',
    centerX: sceneCenterX,
    centerY: preset.height / 2,
    maxVectorLength,
    // 基准由轨道量程峰值反推（峰值箭头 = fill·maxVectorLength·weight）：
    // 速度在近日点最大、引力 ∝ 1/r² 也在近日点最大，写死常数在参数拉满时会撞上限。
    refMagnitudes: {
      velocity: refFromPeak(kepler.vectorPeaks.speed),
      gravity: kepler.vectorPeaks.gravity / gravityFill,
    },
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

  // ── 引力标签的落点：跟着箭杆走，画不出箭杆时不画标签 ──
  // 固定偏移（行星右下 10/15 px）会在两种情形出问题：
  //   ① 远日点 F 只剩零点几 px（e=0.75 时量程 47 倍），凭空留一个"悬空的 F"，有字无箭；
  //   ② a₁ 较小时该点会压到第二定律的「近日面积 S₁」标注（实测 a₁=2.5 / b₁=2.4 命中）。
  // 改为：沿箭杆 55% 处、向一侧垂直偏移 9 px；箭杆短到 8 px 以下则整个标签不画。
  const fMag = Math.hypot(fxA, fyA)
  const F_LABEL_MIN_LEN = 8
  const fArrowLen = calculateVectorPixelLength(
    fMag,
    'gravity',
    maxVectorLength,
    sceneScale.refMagnitudes?.gravity ?? 0,
  )
  const fAngle = Math.atan2(fyA, fxA)
  const fDirX = Math.cos(fAngle)
  const fDirY = -Math.sin(fAngle) // 设计坐标 y 向上 → 屏幕 y 向下
  const fLabelX = planetDx + fDirX * fArrowLen * 0.55 + fDirY * 9
  const fLabelY = planetDy + fDirY * fArrowLen * 0.55 - fDirX * 9

  // ── 第一定律的实测验证：r₂ 用副焦点的真实坐标量 ──
  // 旧实现 r₂ = 2a − r₁ 只是定义式的移项，r₁ + r₂ 恒等于 2a —— 椭圆画歪了这个数也不会动，
  // 所以那张"验证卡"什么都没验证。改成 hypot(行星 − 副焦点) 之后，一旦几何出错（正交轴失配、
  // b 反解错、焦点位置错）这个和会立刻偏离 2a，数字自己报警。
  const r2Real = Math.hypot(planetX - foci2PhysX, planetY - foci2PhysY)
  const rSumMeasured = orbitA.r + r2Real
  const rSumExpected = 2 * a1
  const rSumOk = Math.abs(rSumMeasured - rSumExpected) < Math.max(0.02, 0.002 * a1)

  // ── 面积–时间图：一个整周期内扫过面积的数值累积 ──
  const areaMax = sweptTrace.length > 0 ? sweptTrace[sweptTrace.length - 1].area : 1
  const areaChartW = 200
  const areaChartH = 132

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
            x={sceneScale.originX + a1 * sceneScale.scaleX - 45}
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

          {/* 近 / 远日距离：两条线段都以太阳为起点，在太阳处断开 —— 「a−c 与 a+c 拼成 2a」
              这件事因此是画出来的，不是只在右屏印两个数字。标签放到椭圆外侧，避开扇形与 S₂。 */}
          <line
            x1={sunDx}
            y1={sunDy}
            x2={sceneScale.originX + a1 * sceneScale.scaleX}
            y2={sceneScale.originY}
            stroke={PHYSICS_COLORS.displacement}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <line
            x1={sunDx}
            y1={sunDy}
            x2={sceneScale.originX - a1 * sceneScale.scaleX}
            y2={sceneScale.originY}
            stroke={PHYSICS_COLORS.potentialEnergy}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <text
            x={sceneScale.originX + a1 * sceneScale.scaleX + 24}
            y={sceneScale.originY + 4}
            fill={PHYSICS_COLORS.displacement}
            fontSize={font(10)}
            fontWeight="bold"
            className="select-none"
          >
            r_min={rMin.toFixed(2)}
          </text>
          <text
            x={sceneScale.originX - a1 * sceneScale.scaleX - 24}
            y={sceneScale.originY + 4}
            textAnchor="end"
            fill={PHYSICS_COLORS.potentialEnergy}
            fontSize={font(10)}
            fontWeight="bold"
            className="select-none"
          >
            r_max={rMax.toFixed(2)}
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
          cx={sceneScale.originX + orbitBCenterX * sceneScale.scaleX}
          cy={sceneScale.originY}
          rx={a2 * sceneScale.scaleX}
          ry={b2 * sceneScale.scaleX}
          fill="none"
          stroke={PHYSICS_COLORS.acceleration}
          strokeOpacity={0.18}
          strokeWidth={1.5}
        />
      )}

      {/* ── 3.5 半长轴 a（mode === 0）──
          高中最高频的错点是把 a 当成"行星到太阳的距离"。这里把 a 画成一条**固定**的线段
          （椭圆中心 → 远日侧顶点），与本模式下实时变化的 r₁ 同屏对照：
          a 不动、r 在变，"a ≠ r" 才看得见，而不是靠右屏一句文字。 */}
      {mode === 0 && (
        <g>
          <line
            x1={sceneScale.originX - a1 * sceneScale.scaleX}
            y1={sceneScale.originY}
            x2={sceneScale.originX}
            y2={sceneScale.originY}
            stroke={PHYSICS_COLORS.averageVelocity}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <text
            x={sceneScale.originX - (a1 * sceneScale.scaleX) / 2}
            y={sceneScale.originY - 6}
            textAnchor="middle"
            fill={PHYSICS_COLORS.averageVelocity}
            fontSize={font(11)}
            fontWeight="bold"
            className="select-none"
          >
            a
          </text>
        </g>
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
            x={(planetDx + sunDx) / 2 + 22}
            y={(planetDy + sunDy) / 2 + 14}
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
            r₂={r2Real.toFixed(2)}
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
              第一定律实测：r₁ + r₂ = <tspan fontWeight="bold">{rSumMeasured.toFixed(2)}</tspan>
              （2a = {rSumExpected.toFixed(2)}
              <tspan fill={rSumOk ? PHYSICS_COLORS.velocity : PHYSICS_COLORS.dangerText} fontWeight="bold">
                {rSumOk ? ' ✓ 相符' : ' ✗ 不符'}
              </tspan>
              ）
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
      <circle cx={planetDx} cy={planetDy} r={PLANET_R} fill="url(#planet-a-grad)" />
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
          <circle cx={planetBDx} cy={planetBDy} r={Math.round(PLANET_R * 0.8)} fill="url(#planet-b-grad)" />
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
      <circle cx={sunDx} cy={sunDy} r={SUN_GLOW_R} fill="url(#sun-glow-grad)" className="animate-pulse" />
      <circle cx={sunDx} cy={sunDy} r={SUN_CORE_R} fill={SCENE_COLORS.bulb.glowInner} stroke={SCENE_COLORS.bulb.glowOuter} strokeWidth={1} />
      {/* 太阳标题写在太阳**左下方**（右对齐）：原先居中偏右时，文字从 sunDx−11 一路铺到 sunDx+80，
          正好压住第二定律的「近日面积 S₁」标注（同一高度 y≈357），放大后是糊成一片的红黑字。
          下移到光晕以下（y = sunDy + SUN_GLOW_R + 22）再右对齐，是为了同时避开左侧的「远日面积 S₂」
          —— 实测 a₁=2.5~3.0 时 S₂ 从 x≈345 铺到 408，与该高度上的文字会撞。 */}
      <text
        x={sunDx - 10}
        y={sunDy + SUN_GLOW_R + 22}
        textAnchor="end"
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

          {/* F 的标签不走 VectorArrow 的默认锚点（箭尖外 10 px）：
              近日点行星离太阳只有 36.7 px，箭尖本就贴在日面外 2 px，
              标签必然落进太阳本体里，读起来像在给太阳贴 "F"。
              落点见上方 fLabelX/fLabelY：沿箭杆 55% 处向侧面偏移 9 px，
              箭杆短于 8 px 时整个标签不画（否则会出现"悬空的 F"）。 */}
          <PhysicsVectorArrow
            originDesign={{ x: planetDx, y: planetDy }}
            vector={{ x: fxA, y: fyA }}
            type="gravity"
            sceneScale={sceneScale}
            font={font}
          />
          {fArrowLen >= F_LABEL_MIN_LEN && (
            <text
              x={fLabelX}
              y={fLabelY}
              fill={PHYSICS_COLORS.gravity}
              fontSize={font(11)}
              fontWeight="bold"
              className="select-none"
            >
              F
            </text>
          )}
        </g>
      )}

      {/* ── 9.5 参数合法性告警 ──
          合法性由物理层 orbitLegality 给出（近日点是否已进入恒星本体），
          渲染层只负责把它显示出来，不在这里另算一遍判据。 */}
      {!legality.ok && (
        <text
          x={20}
          y={preset.height - 44}
          fill={PHYSICS_COLORS.dangerText}
          fontSize={font(11)}
          fontWeight="bold"
          className="select-none"
        >
          参数非法：{legality.reason}
        </text>
      )}

      {/* ── 10. 第二定律：面积–时间曲线（替换原来的"12% 恒定"文字卡）──
          原卡片印的是 KEPLER_CONFIG.sweepTimeRatio 这个常量本身 —— 把结论写死再显示成测量值。
          这里改成对整周期**数值累积**扫过面积（逐段三角形求和，不用 h/2 解析式）：
          曲线是直线、斜率为常数，就是"等时间扫过等面积"的直接证据。 */}
      {mode === 1 && sweptTrace.length > 1 && (
        <g>
          <text
            x={preset.width - 24}
            y={preset.height - areaChartH - 44}
            textAnchor="end"
            fill={PHYSICS_COLORS.labelTextLight}
            fontSize={font(10)}
            className="select-none"
          >
            两扇形各 Δt = {(deltaTPercent * 100).toFixed(0)}%T → 面积相同
          </text>
          <g transform={`translate(${preset.width - areaChartW - 24}, ${preset.height - areaChartH - 20})`}>
            <RelationChart
              points={sweptTrace.map((p) => ({ x: p.t, y: p.area }))}
              xDomain={[0, T1]}
              yDomain={[0, areaMax * 1.04]}
              xLabel="t / s"
              yLabel="S"
              title="扫过面积 S(t)"
              series="primary"
              fixedSize={{ width: areaChartW, height: areaChartH }}
              variant="mini"
              showGrid={false}
              cursorX={time % T1}
              cursorLabel={() => null}
            />
          </g>
        </g>
      )}

      {/* ── 11. 第三定律：a³ - T² 直线（斜率就是 k）──
          轴方向与教材定义 a³/T² = k 对齐：纵轴 a³、横轴 T²，斜率才能直接读作 k。
          （旧版画的是 T² 对 a³，斜率其实是 1/k，却把标记写成"斜率 k" —— 那是倒数。） */}
      {mode === 2 && (
        <g transform={`translate(${preset.width - chartW - chartPadding}, ${preset.height - chartH - chartPadding})`}>
          {/* 主曲线 = 同一中心天体的参考行星族：A、B 与它共线才叫"共线"，
              只有两个点时任何两点都能连成直线。 */}
          <RelationChart
            points={referenceFamily.map((p) => ({ x: p.t2, y: p.a3 }))}
            xDomain={[0, maxT2]}
            yDomain={[0, maxA3]}
            xLabel="T²"
            yLabel="a³"
            title="a³ - T²（斜率 = k）"
            series="primary"
            fixedSize={{ width: chartW, height: chartH }}
            variant="mini"
            showGrid={false}
            markers={[
              // 不再给斜率加标记点：point 标记的标签固定画在 (+6,−6)，而直线本身就是
              // 上升的，"斜率 k" 会与直线叠在一起（3 倍放大实测压线）。
              // 斜率含义已由标题「斜率 = k」与左上角公式行给出。
              {
                axis: 'point',
                x: t2_1,
                y: a3_1,
                label: 'A',
                color: PHYSICS_COLORS.velocity,
                // A 在直线中段：默认的右上方位正是直线的延伸方向，字母会被曲线穿过；
                // 右下是直线下侧空白区（点又离 Y 轴很近，不能用左侧）。
                labelSide: 'bottom-right',
              },
              {
                axis: 'point',
                x: t2_2,
                y: a3_2,
                label: 'B',
                color: PHYSICS_COLORS.averageVelocity,
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
              {mode === 0 && `a = ${a1.toFixed(1)}（固定）· e = ${e1.toFixed(2)} · b = a√(1−e²) = ${b1.toFixed(2)}`}
              {mode === 1 && `近日点距日 r_min = ${rMin.toFixed(2)}`}
              {mode === 2 && `内轨 a₁ = ${a1.toFixed(1)}, T₁ = ${T1.toFixed(2)}s（由 M 决定）`}
            </text>
            <text
              x={0}
              y={35}
              fontSize={font(13)}
              fill={PHYSICS_COLORS.labelTextLight}
              fontFamily={CANVAS_STYLE.font.family}
              className="select-none"
            >
              {mode === 0 && `焦半径实测 r₁ + r₂ = ${rSumMeasured.toFixed(2)}（2a = ${rSumExpected.toFixed(1)}）`}
              {mode === 1 && `远日点距日 r_max = ${rMax.toFixed(2)}`}
              {mode === 2 && `外轨 a₂ = ${a2.toFixed(1)}, T₂ = ${T2.toFixed(2)}s`}
            </text>
            {mode === 2 && (
              <text
                x={0}
                y={55}
                fontSize={font(13)}
                fill={PHYSICS_COLORS.labelTextLight}
                fontFamily={CANVAS_STYLE.font.family}
                className="select-none"
              >
                {`k = a³/T² = ${k_ratio.toFixed(3)}（中心天体 M = ${mass.toFixed(0)}，G = 1）`}
              </text>
            )}
          </g>
        </g>
      )}
    </AnimationSvgCanvas>
  )
}
