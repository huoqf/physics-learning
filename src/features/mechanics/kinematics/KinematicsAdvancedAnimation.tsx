import { Block, VectorArrow } from '@/components/Physics'
import { useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme'
import { PHYSICS_COLORS, STROKE, CANVAS_COLORS } from '@/theme/physics'

import { calculateVectorPixelLength } from '@/utils/vectorLength'
import { RelationChart } from '@/components/Chart'
import { useChartContext } from '@/components/Chart'
import { Card } from '@/components/UI'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'

// ── Viewport 布局常量（上下分区条带场景，设计坐标绑定 splitV preset） ──
const DESIGN_W = CANVAS_PRESETS.splitV.width
const DESIGN_H = CANVAS_PRESETS.splitV.height
const ORIGIN_X = 70   // 物理起点在设计坐标中的 X
const TRACK_LEN = 700 // 轨道的设计坐标长度（物理长度 30m）
const GROUND_Y = 210  // 轨道在设计坐标中的 Y
const SCALE_X = TRACK_LEN / 30
const BLOCK_W = 56
const BLOCK_H = 28

// ── 截距辅助线与解析气泡插件 ──
function InterceptBubble({ chartMode, v0 }: { chartMode: number; v0: number }) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY, font } = ctx

  const b = chartMode === 0 ? v0 * v0 : v0
  const label = chartMode === 0 ? `截距 b = v₀² = ${b.toFixed(1)}` : `截距 b = v₀ = ${b.toFixed(1)}`

  // 物理坐标系截距点为 (0, b)
  const cx = toSvgX(0)
  const cy = toSvgY(b)

  // 气泡卡片：画在截距点右上方
  const bubbleW = font(120)
  const bubbleH = font(18)
  const bx = cx + font(8)
  const by = cy - bubbleH / 2

  return (
    <g>
      {/* 截距交点 */}
      <circle cx={cx} cy={cy} r={4.5} fill="none" stroke={PHYSICS_COLORS.acceleration} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={2} fill={PHYSICS_COLORS.acceleration} />

      {/* 气泡框 */}
      <rect
        x={bx}
        y={by}
        width={bubbleW}
        height={bubbleH}
        rx={3}
        fill={CANVAS_COLORS.dangerBg}
        stroke={CANVAS_COLORS.dangerBorder}
        strokeWidth={1}
      />
      <text
        x={bx + bubbleW / 2}
        y={by + bubbleH / 2 + font(3)}
        fontSize={font(9)}
        fill={PHYSICS_COLORS.acceleration}
        fontWeight="bold"
        textAnchor="middle"
        className="select-none font-sans"
      >
        {label}
      </text>
    </g>
  )
}

export default function KinematicsAdvancedAnimation() {
  const { params, time, isPlaying, setIsPlaying, showVectors } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
      showVectors: s.showVectors,
    }))
  )

  // 标准 Viewport 路径：上下分区中的下方条带场景使用 splitV preset
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const v0 = params.v0 ?? 4.0
  const a = params.a ?? 2.0
  const chartMode = params.chartMode ?? 0
  const showAux = params.showAux ?? 1

  // 刹车计算与拦截
  const isBraking = a < 0
  const tBrake = isBraking ? -v0 / a : Infinity
  const xMax = isBraking ? -(v0 * v0) / (2 * a) : Infinity
  const isStopped = isBraking && time >= tBrake

  // 落地/刹车自动暂停
  useEffect(() => {
    if (isStopped && isPlaying) {
      setIsPlaying(false)
    }
  }, [isStopped, isPlaying, setIsPlaying])

  const tEff = isStopped ? tBrake : time
  const x = v0 * tEff + 0.5 * a * tEff * tEff
  const v = v0 + a * tEff

  // 轨道缩放设计坐标
  const sliderX = ORIGIN_X + x * SCALE_X
  const sliderY = GROUND_Y - BLOCK_H

  // 生成历史轨迹点
  const trajectoryPoints = []
  const interval = 0.2
  for (let tHist = 0; tHist < tEff; tHist += interval) {
    const xHist = v0 * tHist + 0.5 * a * tHist * tHist
    const cx = ORIGIN_X + xHist * SCALE_X
    trajectoryPoints.push(
      <circle
        key={tHist}
        cx={cx}
        cy={GROUND_Y - BLOCK_H / 2}
        r={2.5}
        fill={PHYSICS_COLORS.trackHistory}
        opacity={0.5}
      />
    )
  }

  // 轨道上的刻度尺刻度
  const ticks = []
  for (let m = 0; m <= 30; m += 1) {
    const isMajor = m % 5 === 0
    const tickX = ORIGIN_X + m * SCALE_X
    const tickHeight = isMajor ? 6 : 3
    ticks.push(
      <g key={m}>
        <line
          x1={tickX}
          y1={GROUND_Y + 6}
          x2={tickX}
          y2={GROUND_Y + 6 + tickHeight}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={isMajor ? 1.5 : 1}
        />
        {isMajor && (
          <text
            x={tickX}
            y={GROUND_Y + 22}
            fontSize={font(8)}
            fill={PHYSICS_COLORS.labelTextLight}
            textAnchor="middle"
            className="select-none font-mono"
          >
            {m}m
          </text>
        )}
      </g>
    )
  }

  // 矢量箭头尺寸计算与渲染：使用统一 VectorArrow，物理量级由 refMagnitudes 归一化
  const blockCenterX = sliderX + BLOCK_W / 2
  const maxVelocity = Math.max(Math.abs(v0) + Math.abs(a) * 10, Math.abs(v), 10)
  const maxAcceleration = Math.max(Math.abs(a) * 2, 5)
  const vectorSceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'custom',
    customOriginX: 0,
    customOriginY: 0,
    customScaleX: 1,
    customScaleY: 1,
    refMagnitudes: { velocity: maxVelocity, acceleration: maxAcceleration },
    maxVectorLength: Math.min(DESIGN_W, DESIGN_H) * 0.25,
  })
  const velocityArrowY = sliderY - 8
  const accelerationArrowY = sliderY - 22
  const velocityArrowLen = calculateVectorPixelLength(
    v, 'velocity', vectorSceneScale.maxVectorLength, maxVelocity,
  )
  const accelerationArrowLen = calculateVectorPixelLength(
    Math.abs(a), 'acceleration', vectorSceneScale.maxVectorLength, maxAcceleration,
  )

  // ── 图表数据 points 计算 ──
  const points = []
  if (chartMode === 0) {
    // v^2 - x 模式
    const step = 0.5
    const xLimit = isBraking ? Math.min(30, xMax) : 30
    for (let curX = 0; curX <= xLimit + 1e-9; curX += step) {
      const curV2 = Math.max(0, v0 * v0 + 2 * a * curX)
      points.push({ x: curX, y: curV2 })
    }
    if (isBraking && xMax < 30) {
      points.push({ x: xMax, y: 0 })
    }
  } else {
    // x/t - t 模式
    const step = 0.2
    const tLimit = isBraking ? Math.min(10, tBrake) : 10
    for (let curT = 0; curT <= tLimit + 1e-9; curT += step) {
      const curXOverT = curT === 0 ? v0 : (v0 * curT + 0.5 * a * curT * curT) / curT
      points.push({ x: curT, y: curXOverT })
    }
    if (isBraking && tBrake < 10) {
      points.push({ x: tBrake, y: 0.5 * v0 })
    }
  }

  // 计算图表纵轴上限 yMax
  let yMax = 10
  if (chartMode === 0) {
    yMax = isBraking ? v0 * v0 : v0 * v0 + 2 * a * 30
  } else {
    yMax = isBraking ? v0 : v0 + 0.5 * a * 10
  }
  yMax = Math.max(10, yMax) * 1.15

  // 游标当前位置
  const cursorX = chartMode === 0 ? x : tEff

  return (
    <div className="flex flex-col h-full w-full gap-3 p-3 overflow-hidden select-none">
      {/* 上侧：图表反馈区 */}
      <Card className="flex-1 min-h-0 flex flex-col p-3 relative">
        <h3 className="text-xs font-semibold text-neutral-600 mb-1.5 shrink-0">函数图像分析</h3>
        <div className="flex-1 min-h-0 relative">
          <RelationChart
            title={chartMode === 0 ? "v² - x 关系图象" : "x/t - t 关系图象"}
            xLabel={chartMode === 0 ? "位移 x (m)" : "时间 t (s)"}
            yLabel={chartMode === 0 ? "速度平方 v² (m²/s²)" : "比值 x/t (m/s)"}
            xDomain={chartMode === 0 ? [0, 30] : [0, 10]}
            yDomain={[0, yMax]}
            points={points}
            cursorX={cursorX}
            cursorVariant="highlight"
            series="primary"
            showGrid={true}
          >
            {showAux === 1 && (
              <InterceptBubble chartMode={chartMode} v0={v0} />
            )}
          </RelationChart>
        </div>
      </Card>

      {/* 下侧：物理仿真轨道 */}
      <Card className="flex-1 min-h-0 flex flex-col p-3">
        <h3 className="text-xs font-semibold text-neutral-600 mb-1.5 shrink-0">物理仿真轨道</h3>
        <AnimationSvgCanvas
          containerRef={containerRef}
          transform={vp.transform}
          className="flex-1 min-h-0 w-full bg-white rounded-lg relative overflow-hidden"
        >
              {/* 起始标志线 */}
              <line
                x1={ORIGIN_X}
                y1={GROUND_Y - 50}
                x2={ORIGIN_X}
                y2={GROUND_Y + 6}
                stroke={PHYSICS_COLORS.acceleration}
                strokeWidth={1}
                strokeDasharray="2,2"
                opacity={0.6}
              />
              <text
                x={ORIGIN_X}
                y={GROUND_Y - 55}
                fontSize={font(8)}
                fill={PHYSICS_COLORS.acceleration}
                textAnchor="middle"
                className="select-none font-sans font-medium"
              >
                起点 (x=0)
              </text>

              {/* 水平测试轨道 */}
              <line
                x1={ORIGIN_X}
                y1={GROUND_Y}
                x2={ORIGIN_X + TRACK_LEN}
                y2={GROUND_Y}
                stroke={PHYSICS_COLORS.axis}
                strokeWidth={3}
                strokeLinecap="round"
              />

              {/* 刻度尺底线 */}
              <line
                x1={ORIGIN_X}
                y1={GROUND_Y + 6}
                x2={ORIGIN_X + TRACK_LEN}
                y2={GROUND_Y + 6}
                stroke={PHYSICS_COLORS.axis}
                strokeWidth={1}
              />

              {/* 刻度线 */}
              {ticks}

              {/* 历史足迹点 */}
              {trajectoryPoints}

              {/* 滑块 */}
              <Block
                x={sliderX}
                y={sliderY}
                width={BLOCK_W}
                height={BLOCK_H}
                type="metal"
                label=""
              />

              {/* 矢量箭头 */}
              {showVectors && v > 0 && (
                <g>
                  <VectorArrow
                    originPixel={{ x: blockCenterX, y: velocityArrowY }}
                    vector={{ x: v, y: 0 }}
                    type="velocity"
                    sceneScale={vectorSceneScale}
                    strokeWidth={STROKE.vectorMain}
                  />
                  <text
                    x={blockCenterX + velocityArrowLen / 2}
                    y={velocityArrowY - 5}
                    fontSize={font(8)}
                    fill={PHYSICS_COLORS.velocity}
                    fontWeight="bold"
                    textAnchor="middle"
                    className="select-none font-mono"
                  >
                    v = {v.toFixed(1)} m/s
                  </text>
                </g>
              )}

              {showVectors && Math.abs(a) > 0.05 && (
                <g>
                  <VectorArrow
                    originPixel={{ x: blockCenterX, y: accelerationArrowY }}
                    vector={{ x: a, y: 0 }}
                    type="acceleration"
                    sceneScale={vectorSceneScale}
                    strokeWidth={STROKE.vectorSub}
                  />
                  <text
                    x={blockCenterX + (a > 0 ? 1 : -1) * accelerationArrowLen / 2}
                    y={accelerationArrowY - 5}
                    fontSize={font(8)}
                    fill={PHYSICS_COLORS.acceleration}
                    fontWeight="bold"
                    textAnchor="middle"
                    className="select-none font-mono"
                  >
                    a = {a.toFixed(1)} m/s²
                  </text>
                </g>
              )}
        </AnimationSvgCanvas>
      </Card>
    </div>
  )
}
