import { useCanvasSize, useViewport } from '@/utils'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS, STROKE, DASH, OPACITY, withAlpha } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { calculateWorkBasic, calculateWorkAdvanced, classifyWorkType } from '@/physics/work'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

/** 场景布局配置（试点阶段：组件内局部常量） */
const SCENE_LAYOUT = {
  designWidth: 700,
  designHeight: 350,
} as const

/**
 * 恒力做功动画 —— "力与位移的夹角投影"
 *
 * 双轨模式：
 * - 基础模式（mode=0）：理想恒力与方向投影，μ=0
 * - 进阶模式（mode=1）：摩擦力做功与脱地临界
 *
 * Canvas 7 元素 / 5 标注（严格上限）
 */
export default function WorkAnimation() {
    const {params, time, showVectors, showGrid} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    showGrid: s.showGrid,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 350 })

  // ── Viewport（试点：比例布局型使用 visibleX/Y/W/H）──
  const vp = useViewport(canvasSize, {
    designWidth: SCENE_LAYOUT.designWidth,
    designHeight: SCENE_LAYOUT.designHeight,
  })

  const mode = params.mode ?? 0           // 0=基础, 1=进阶
  const F = params.F ?? 10                // N
  const angleDeg = params.angleDeg ?? 30  // °
  const s = params.s ?? 5                 // m
  const m = params.m ?? 2                 // kg
  const mu = params.mu ?? 0.3             // 动摩擦因数
  const g = params.g ?? 9.8              // m/s²

  // ── 动态布局（基于 viewport 可视区域）──
  const padding = vp.visibleW * 0.07
  const groundY = vp.visibleY + vp.visibleH * 0.72
  const scale = (vp.visibleW - 2 * padding) / 12  // 12m 可视范围
  const startX = vp.visibleX + padding
  const maxVisibleX = vp.visibleX + vp.visibleW - padding

  // ── 物体尺寸 ──
  const objW = vp.visibleW * 0.06
  const objH = objW * 0.7

  // ── 位移动画：滑块从左向右移动 s 米 ──
  const maxAnimTime = 4 // 4秒完成位移
  const progress = Math.min(time / maxAnimTime, 1)
  const currentS = s * progress
  const blockX = startX + currentS * scale

  // ── 物理计算 ──
  const workType = classifyWorkType(angleDeg)

  const basicResult = useMemo(
    () => calculateWorkBasic(F, s, angleDeg),
    [F, s, angleDeg]
  )

  const advancedResult = useMemo(
    () => calculateWorkAdvanced(F, s, angleDeg, m, mu, g),
    [F, s, angleDeg, m, mu, g]
  )

  // 当前时刻的做功量（随动画进度增长）
  const currentWorkBasic = useMemo(
    () => calculateWorkBasic(F, currentS, angleDeg),
    [F, currentS, angleDeg]
  )

  const currentWorkAdvanced = useMemo(
    () => calculateWorkAdvanced(F, currentS, angleDeg, m, mu, g),
    [F, currentS, angleDeg, m, mu, g]
  )

  // ── 脱地浮动效果 ──
  const isLiftedOff = mode === 1 && advancedResult.isLiftedOff
  const floatOffset = isLiftedOff ? 6 * Math.sin(time * 4) : 0

  // ── 投影颜色语义 ──
  const projectionColor = useMemo((): string => {
    if (workType === 'positive') return PHYSICS_COLORS.work       // 做功绿
    if (workType === 'negative') return PHYSICS_COLORS.friction   // 警告红褐
    return PHYSICS_COLORS.labelTextLight                          // 灰白
  }, [workType])

  // ── 字体 ──
  const fontSize = Math.max(10, vp.visibleW * 0.017)
  const smallFont = Math.max(9, fontSize * 0.85)

  // ── 网格线 ──
  const gridLines = useMemo(() => {
    if (!showGrid) return []
    const lines: { x: number; key: string }[] = []
    const gridCount = Math.max(8, Math.floor(vp.visibleW / 60))
    for (let i = 0; i <= gridCount; i++) {
      lines.push({
        x: startX + (i * (maxVisibleX - startX)) / gridCount,
        key: `grid-${i}`,
      })
    }
    return lines
  }, [showGrid, vp.visibleW, startX, maxVisibleX])

  // ── 地标标签 ──
  const landmarkLabels = useMemo(() => {
    const count = 5
    const labels: { x: number; text: string }[] = []
    for (let i = 0; i <= count; i++) {
      const dist = (12 * i) / count
      labels.push({
        x: startX + dist * scale,
        text: `${dist.toFixed(0)}m`,
      })
    }
    return labels
  }, [scale, startX])

  // ── 力箭头绘制参数 ──
  const forceArrowLen = Math.min(F * 2.5, 80)  // 像素长度
  const angleRad = (angleDeg * Math.PI) / 180
  const forceDx = forceArrowLen * Math.cos(angleRad)
  const forceDy = -forceArrowLen * Math.sin(angleRad)  // SVG y轴反转

  // 投影虚线终点
  const projEndX = forceDx

  // ── 起始位置标记 ──
  const originX = startX

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: 0,
    originY: 0,
    worldWidth: canvasSize.width,
    worldHeight: canvasSize.height,
  }), [canvasSize.width, canvasSize.height]);
  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {/* 定义渐变 */}
        <defs>
          <linearGradient id="block-body-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SCENE_COLORS.magnet.southLight} />
            <stop offset="100%" stopColor={SCENE_COLORS.magnet.southMid} />
          </linearGradient>
          <linearGradient id="block-wheel-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.steel.gradient[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.steel.gradient[3]} />
          </linearGradient>
          {/* 力箭头标记（使用 VectorArrow 组件） */}
        </defs>

        {/* ── 1. 地面坐标轴 + 地标 ── */}
        <line
          x1={startX}
          y1={groundY}
          x2={maxVisibleX}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />
        {landmarkLabels.map((lm, i) => (
          <g key={`lm-${i}`}>
            <line x1={lm.x} y1={groundY} x2={lm.x} y2={groundY + 6} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.tick} />
            <text x={lm.x} y={groundY + fontSize + 6} fontSize={smallFont} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
              {lm.text}
            </text>
          </g>
        ))}

        {/* ── 网格线 ── */}
        {gridLines.map((g) => (
          <line
            key={g.key}
            x1={g.x}
            y1={groundY - objH * 2.5}
            x2={g.x}
            y2={groundY + 4}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={STROKE.grid}
            strokeDasharray={DASH.guide.join(',')}
          />
        ))}

        {/* ── 起始线 ── */}
        <line
          x1={originX}
          y1={groundY - objH * 2.5}
          x2={originX}
          y2={groundY + 4}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={STROKE.axisBold}
          strokeDasharray={DASH.boundary.join(',')}
        />
        <text x={originX - fontSize} y={groundY + fontSize + 6} fontSize={fontSize} fill={PHYSICS_COLORS.axis} textAnchor="middle">0</text>

        {/* ── 2. 滑块（复用小车 SVG 渐变模型）── */}
        <g transform={`translate(${blockX}, ${groundY - objH + floatOffset})`}>
          {/* 车身 */}
          <rect width={objW} height={objH - 4} rx={4} fill="url(#block-body-grad)" stroke={SCENE_COLORS.magnet.southMid} strokeWidth={1.5} />
          {/* 车窗带折射高光线 */}
          <rect x={objW * 0.1} y={objH * 0.15} width={objW * 0.25} height={objH * 0.3} rx={1} fill={PHYSICS_COLORS.objectFill} opacity={0.85} />
          <rect x={objW * 0.4} y={objH * 0.15} width={objW * 0.25} height={objH * 0.3} rx={1} fill={PHYSICS_COLORS.objectFill} opacity={0.85} />
          <rect x={objW * 0.7} y={objH * 0.15} width={objW * 0.2} height={objH * 0.3} rx={1} fill={PHYSICS_COLORS.objectFill} opacity={0.85} />
          <line x1={objW * 0.15} y1={objH * 0.15} x2={objW * 0.22} y2={objH * 0.45} stroke={colors.neutral.white} strokeWidth={1} opacity={0.6} />
          <line x1={objW * 0.45} y1={objH * 0.15} x2={objW * 0.52} y2={objH * 0.45} stroke={colors.neutral.white} strokeWidth={1} opacity={0.6} />
          {/* 装饰条 */}
          <line x1={objW * 0.05} y1={objH * 0.55} x2={objW * 0.95} y2={objH * 0.55} stroke={PHYSICS_COLORS.velocityY} strokeWidth={1} opacity={0.5} />
          {/* 车轮（带钢圈） */}
          <g transform={`translate(${objW * 0.22}, ${objH - 3})`}>
            <circle r={objH * 0.18} fill="url(#block-wheel-grad)" />
            <circle r={objH * 0.09} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.sphere.steel.gradient[2]} strokeWidth={0.5} />
            <circle r={objH * 0.04} fill={SCENE_COLORS.materials.sliderMetalGrad[0]} />
          </g>
          <g transform={`translate(${objW * 0.78}, ${objH - 3})`}>
            <circle r={objH * 0.18} fill="url(#block-wheel-grad)" />
            <circle r={objH * 0.09} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.sphere.steel.gradient[2]} strokeWidth={0.5} />
            <circle r={objH * 0.04} fill={SCENE_COLORS.materials.sliderMetalGrad[0]} />
          </g>
        </g>

        {/* ── 3. 拉力 F 矢量箭头 ── */}
        {showVectors && F > 0 && (
          <g>
            {/* 拉力 F 主箭头 */}
            <VectorArrow
              origin={{ x: blockX + objW * 0.5, y: -(groundY - objH * 0.5 + floatOffset) }}
              vector={{ x: forceDx, y: -forceDy }}
              type="appliedForce"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorMain}
              pixelLength={Math.sqrt(forceDx ** 2 + forceDy ** 2)}
            />
            {/* F 标签 */}
            <text
              x={blockX + objW * 0.5 + forceDx + fontSize * 0.3}
              y={groundY - objH * 0.5 + forceDy + floatOffset}
              fontSize={fontSize}
              fill={PHYSICS_COLORS.appliedForce}
              fontWeight="bold"
            >
              F
            </text>

            {/* ── 4. 投影虚线 Fx ── */}
            {Math.abs(basicResult.Fx) > 0.01 && (
              <g>
                {/* 从 F 箭头尖端到水平投影的虚线 */}
                <line
                  x1={blockX + objW * 0.5 + forceDx}
                  y1={groundY - objH * 0.5 + forceDy + floatOffset}
                  x2={blockX + objW * 0.5 + projEndX}
                  y2={groundY - objH * 0.5 + floatOffset}
                  stroke={projectionColor}
                  strokeWidth={STROKE.vectorThin}
                  strokeDasharray={DASH.guide.join(',')}
                  opacity={OPACITY.guide}
                />
                {/* 投影矢量 Fx */}
                {workType === 'positive' ? (
                  <VectorArrow
                    origin={{ x: blockX + objW * 0.5, y: -(groundY - objH * 0.5 + floatOffset) }}
                    vector={{ x: projEndX, y: 0 }}
                    type="velocity"
                    sceneScale={sceneScale}
                    color={projectionColor}
                    strokeWidth={STROKE.vectorSub}
                    pixelLength={Math.abs(projEndX)}
                  />
                ) : (
                  <VectorArrow
                    origin={{ x: blockX + objW * 0.5, y: -(groundY - objH * 0.5 + floatOffset) }}
                    vector={{ x: projEndX, y: 0 }}
                    type="velocity"
                    sceneScale={sceneScale}
                    color={projectionColor}
                    strokeWidth={STROKE.vectorSub}
                    pixelLength={Math.abs(projEndX)}
                  />
                )}
                {/* Fx 标签 */}
                <text
                  x={blockX + objW * 0.5 + projEndX / 2}
                  y={groundY - objH * 0.5 - fontSize * 0.5 + floatOffset}
                  fontSize={smallFont}
                  fill={projectionColor}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Fx
                </text>
              </g>
            )}

            {/* θ=90° 时投影缩为一点 */}
            {Math.abs(basicResult.Fx) <= 0.01 && (
              <circle
                cx={blockX + objW * 0.5}
                cy={groundY - objH * 0.5 + floatOffset}
                r={3}
                fill={projectionColor}
              />
            )}

            {/* ── 角度弧线 θ ── */}
            {angleDeg > 0 && angleDeg < 180 && (
              <g>
                {(() => {
                  const arcR = Math.min(20, forceArrowLen * 0.4)
                  const endAngle = -angleRad
                  const x1 = blockX + objW * 0.5 + arcR
                  const y1 = groundY - objH * 0.5 + floatOffset
                  const x2 = blockX + objW * 0.5 + arcR * Math.cos(endAngle)
                  const y2 = groundY - objH * 0.5 + arcR * Math.sin(endAngle) + floatOffset
                  const largeArc = angleDeg > 180 ? 1 : 0
                  return (
                    <path
                      d={`M ${x1} ${y1} A ${arcR} ${arcR} 0 ${largeArc} 0 ${x2} ${y2}`}
                      fill="none"
                      stroke={PHYSICS_COLORS.labelTextLight}
                      strokeWidth={STROKE.guide}
                    />
                  )
                })()}
                <text
                  x={blockX + objW * 0.5 + Math.cos(-angleRad / 2) * 28}
                  y={groundY - objH * 0.5 + Math.sin(-angleRad / 2) * 28 + fontSize * 0.35 + floatOffset}
                  fontSize={smallFont}
                  fill={PHYSICS_COLORS.labelTextLight}
                  textAnchor="middle"
                >
                  θ
                </text>
              </g>
            )}
          </g>
        )}

        {/* ── 5. 进阶模式：支持力、重力、摩擦力 ── */}
        {mode === 1 && showVectors && (
          <g>
            {/* 重力 mg 向下 */}
            <VectorArrow
              origin={{ x: blockX + objW * 0.5, y: -(groundY - objH * 0.5 + floatOffset) }}
              vector={{ x: 0, y: -Math.min(advancedResult.weight * 1.5, 50) }}
              type="gravity"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorSub}
              pixelLength={Math.min(advancedResult.weight * 1.5, 50)}
            />
            <text
              x={blockX + objW * 0.5 - fontSize}
              y={groundY - objH * 0.5 + Math.min(advancedResult.weight * 1.5, 50) + floatOffset}
              fontSize={smallFont}
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
            >
              mg
            </text>

            {/* 支持力 F_N 向上（未脱地时显示） */}
            {!isLiftedOff && advancedResult.F_N > 0 && (
              <g>
                <VectorArrow
                  origin={{ x: blockX + objW * 0.5 + 8, y: -(groundY + floatOffset) }}
                  vector={{ x: 0, y: Math.min(advancedResult.F_N * 1.5, 40) }}
                  type="normalForce"
                  sceneScale={sceneScale}
                  strokeWidth={STROKE.vectorSub}
                  pixelLength={Math.min(advancedResult.F_N * 1.5, 40)}
                />
                <text
                  x={blockX + objW * 0.5 + 8 + fontSize * 0.5}
                  y={groundY - Math.min(advancedResult.F_N * 1.5, 40) + floatOffset}
                  fontSize={smallFont}
                  fill={PHYSICS_COLORS.normalForce}
                  fontWeight="bold"
                >
                  FN
                </text>
              </g>
            )}

            {/* 摩擦力 f 向左（未脱地且有摩擦力时显示） */}
            {!isLiftedOff && advancedResult.f > 0 && (
              <g>
                <VectorArrow
                  origin={{ x: blockX + objW * 0.3, y: -(groundY - objH * 0.15 + floatOffset) }}
                  vector={{ x: -Math.min(advancedResult.f * 3, 40), y: 0 }}
                  type="friction"
                  sceneScale={sceneScale}
                  strokeWidth={STROKE.vectorSub}
                  pixelLength={Math.min(advancedResult.f * 3, 40)}
                />
                <text
                  x={blockX + objW * 0.3 - Math.min(advancedResult.f * 3, 40) - fontSize * 0.5}
                  y={groundY - objH * 0.15 + fontSize * 0.35 + floatOffset}
                  fontSize={smallFont}
                  fill={PHYSICS_COLORS.friction}
                  fontWeight="bold"
                >
                  f
                </text>
              </g>
            )}
          </g>
        )}

        {/* ── 6. 位移标注 ── */}
        {showVectors && currentS > 0.1 && (
          <g>
            <line
              x1={originX}
              y1={groundY + 16}
              x2={blockX}
              y2={groundY + 16}
              stroke={PHYSICS_COLORS.displacement}
              strokeWidth={STROKE.vectorThin}
            />
            <line x1={originX} y1={groundY + 12} x2={originX} y2={groundY + 20} stroke={PHYSICS_COLORS.displacement} strokeWidth={STROKE.vectorThin} />
            <line x1={blockX} y1={groundY + 12} x2={blockX} y2={groundY + 20} stroke={PHYSICS_COLORS.displacement} strokeWidth={STROKE.vectorThin} />
            <text
              x={(originX + blockX) / 2}
              y={groundY + 30}
              fontSize={smallFont}
              fill={PHYSICS_COLORS.displacement}
              textAnchor="middle"
            >
              s={currentS.toFixed(1)}m
            </text>
          </g>
        )}

        {/* ── 7. 脱地警告 ── */}
        {isLiftedOff && (
          <g>
            <rect
              x={vp.centerX - 160}
              y={vp.visibleY + padding * 0.5}
              width={320}
              height={36}
              rx={6}
              fill={colors.accent[100]}
              stroke={colors.accent[600]}
              strokeWidth={1.5}
            />
            <text
              x={vp.centerX}
              y={vp.visibleY + padding * 0.5 + 22}
              fontSize={smallFont}
              fill={colors.accent[800]}
              fontWeight="bold"
              textAnchor="middle"
            >
              滑块脱离地面！FN=0，滑动摩擦力降为 0
            </text>
          </g>
        )}

        {/* ── 场景标签 ── */}
        <text x={startX} y={vp.visibleY + fontSize + 4} fontSize={fontSize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
          {mode === 0 ? '恒力做功 · 基础模式' : '恒力做功 · 进阶模式（含摩擦力）'}
        </text>

        {/* ── 做功类型指示 ── */}
        {showVectors && (
          <g transform={`translate(${maxVisibleX - 90}, ${groundY - objH * 2.5})`}>
            <rect width={90} height={28} rx={4} fill={
              workType === 'positive' ? withAlpha(PHYSICS_COLORS.work, 0.15) :
              workType === 'negative' ? withAlpha(PHYSICS_COLORS.heatLoss, 0.15) : colors.neutral[50]
            } stroke={projectionColor} strokeWidth={1} />
            <text x={45} y={18} fontSize={smallFont} fill={projectionColor} fontWeight="bold" textAnchor="middle">
              {workType === 'positive' ? '正功 W>0' : workType === 'negative' ? '负功 W<0' : '不做功 W=0'}
            </text>
          </g>
        )}

        {/* ── 右下角物理量速览 ── */}
        <g transform={`translate(${maxVisibleX - 120}, ${groundY - objH * 1.5})`}>
          {mode === 0 ? (
            <g>
              <text x={0} y={0} fontSize={smallFont} fill={PHYSICS_COLORS.work} fontWeight="bold">
                W = {currentWorkBasic.W.toFixed(1)} J
              </text>
              <text x={0} y={fontSize * 1.3} fontSize={smallFont} fill={PHYSICS_COLORS.labelTextLight}>
                Fx = {currentWorkBasic.Fx.toFixed(1)} N
              </text>
            </g>
          ) : (
            <g>
              <text x={0} y={0} fontSize={smallFont} fill={PHYSICS_COLORS.work} fontWeight="bold">
                WF = {currentWorkAdvanced.W_F.toFixed(1)} J
              </text>
              <text x={0} y={fontSize * 1.3} fontSize={smallFont} fill={PHYSICS_COLORS.friction}>
                Wf = {currentWorkAdvanced.W_f.toFixed(1)} J
              </text>
              <text x={0} y={fontSize * 2.6} fontSize={smallFont} fill={PHYSICS_COLORS.forceNet}>
                Wnet = {currentWorkAdvanced.W_net.toFixed(1)} J
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  )
}
