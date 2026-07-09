import { VectorArrow, VectorDefs } from '@/components/Physics'
import { useEffect, useMemo } from 'react'
import { useCanvasSize, useViewport } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_STYLE, CANVAS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { withAlpha } from '@/theme/physics'

import { createSceneScaleFromViewport } from '@/scene'
import { calculateVectorPixelLength } from '@/utils/vectorLength'
import { VelocityTimeChart, ChartDataSeries } from '@/components/Chart'
import { Card } from '@/components/UI'
import {
  calculateChargeInEFieldTrajectory,
  getChargeInEFieldTimeScale,
} from '@/physics/electromagnetism'

// SVG 设计坐标系常量（对应 CANVAS_PRESETS.splitV）
const DESIGN_WIDTH = 700
const DESIGN_HEIGHT = 325

// SVG 几何常量
const PARTICLE_RADIUS = 10       // 粒子圆半径
const TERMINAL_CORE_RADIUS = 4   // 发射口圆半径
const INTERSECTION_DOT_RADIUS = 3 // 交点标记圆半径

export default function ChargeInEField() {
  const { params, time, showVectors, showGrid, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      showVectors: s.showVectors,
      showGrid: s.showGrid,
      setIsPlaying: s.setIsPlaying,
    }))
  )
  const [, canvasSize] = useCanvasSize(CANVAS_PRESETS.splitV)
  const vp = useViewport(canvasSize, { designWidth: DESIGN_WIDTH, designHeight: DESIGN_HEIGHT })
  const { font } = canvasSize

  const U = params.U ?? 150
  const v0 = params.v0 ?? 15
  const q = params.q ?? 2
  const freq = params.freq ?? 30
  const isAC = params.isAC ?? 0
  const useGravity = params.useGravity ?? 0
  const phi0 = params.phi0 ?? 0

  // 物理几何常数 (SI)
  const PLATE_LENGTH = 0.4 // m
  const PLATE_GAP = 0.2 // m
  const HALF_GAP = PLATE_GAP / 2
  const PARTICLE_MASS = 10 * 1e-6 // 10 mg (10e-6 kg)

  // 1. 进行高精度仿真
  const simResult = useMemo(() => {
    return calculateChargeInEFieldTrajectory({
      U,
      d: PLATE_GAP,
      L: PLATE_LENGTH,
      q: q * 1e-6,
      m: PARTICLE_MASS,
      v0,
      g: useGravity === 1 ? 9.8 : 0,
      isAC: isAC === 1,
      freq,
      phi0,
    })
  }, [U, v0, q, freq, isAC, useGravity, phi0, PARTICLE_MASS])

  const { tEnd, points, hitType } = simResult

  // 仿真慢放时间比例：实现动态映射
  const TIME_SCALE = getChargeInEFieldTimeScale(tEnd, isAC === 1)
  const tSim = Math.min(time * TIME_SCALE, tEnd)

  // 2. 终止自动暂停
  const ended = time * TIME_SCALE >= tEnd
  useEffect(() => {
    if (ended && time > 0) {
      setIsPlaying(false)
    }
  }, [ended, time, setIsPlaying])

  // 3. 对当前时刻 tSim 进行线性插值
  const currentState = useMemo(() => {
    const pts = points
    if (pts.length === 0) {
      return { t: tSim, x: 0, y: 0, vx: v0, vy: 0, ax: 0, ay: 0 }
    }
    const lastPt = pts[pts.length - 1]
    if (tSim <= 0) return pts[0]
    if (tSim >= lastPt.t) return lastPt

    const dt = pts[1].t - pts[0].t || 0.0001
    const idx = Math.floor(tSim / dt)
    const p1 = pts[Math.min(idx, pts.length - 1)]
    const p2 = pts[Math.min(idx + 1, pts.length - 1)]
    if (!p1 || !p2 || p1.t === p2.t) return p1
    const frac = (tSim - p1.t) / (p2.t - p1.t)
    return {
      t: tSim,
      x: p1.x + (p2.x - p1.x) * frac,
      y: p1.y + (p2.y - p1.y) * frac,
      vx: p1.vx + (p2.vx - p1.vx) * frac,
      vy: p1.vy + (p2.vy - p1.vy) * frac,
      ax: p1.ax + (p2.ax - p1.ax) * frac,
      ay: p1.ay + (p2.ay - p1.ay) * frac,
    }
  }, [tSim, points, v0])

  // 4. 采用优化后的固定设计尺寸 (方式 A，大尺寸饱满构图，极度削减留白)
  const midY = 162.5
  const scale = 1300 // 1m = 1300px，视觉上放大 1.3 倍
  const startX = 100 // 粒子枪出口移至 100px

  const topPlateY = midY - HALF_GAP * scale // 32.5px
  const bottomPlateY = midY + HALF_GAP * scale // 292.5px

  const cx = startX + currentState.x * scale
  const cy = midY + currentState.y * scale

  // 5. 极板极性与电场线动态方向
  const curFieldSign = useMemo(() => {
    if (isAC && freq > 0) {
      const T = 1 / freq
      const tStart = phi0 * T
      const phase = ((tSim + tStart) % T) / T
      return phase < 0.5 ? 1 : -1
    }
    return 1
  }, [tSim, isAC, freq, phi0])

  // 6. 生成运动历史轨迹
  const historyPathPoints = useMemo(() => {
    const pts: string[] = []
    for (const pt of points) {
      if (pt.t > tSim + 1e-9) break
      pts.push(`${startX + pt.x * scale},${midY + pt.y * scale}`)
    }
    return pts.join(' ')
  }, [points, tSim])

  // 7. 矢量工具 sceneScale
  const sceneScale = useMemo(() => {
    const maxVal = Math.max(v0, 10)
    const maxAcc = Math.max(Math.abs(currentState.ay), 25)
    return createSceneScaleFromViewport(vp, 'transform', {
      designWidth: DESIGN_WIDTH,
      designHeight: DESIGN_HEIGHT,
      refMagnitudes: {
        velocity: maxVal,
        acceleration: maxAcc,
        electricField: 10,
        electricForce: maxAcc,
        gravity: maxAcc,
      },
    })
  }, [vp, v0, currentState.ay])

  // 8. 速度分解虚线框的终点坐标
  const refMag = Math.max(v0, 10)
  const velocityScaleFactor = sceneScale.maxVectorLength / refMag
  const vx_px = currentState.vx * velocityScaleFactor
  const vy_px = currentState.vy * velocityScaleFactor

  const vMag = Math.hypot(currentState.vx, currentState.vy)
  const totalPxLen = calculateVectorPixelLength(vMag, 'velocity', sceneScale.maxVectorLength, refMag)
  const vxPxLen = vMag > 0 ? totalPxLen * (Math.abs(currentState.vx) / vMag) : 0
  const vyPxLen = vMag > 0 ? totalPxLen * (Math.abs(currentState.vy) / vMag) : 0

  // 9. 反向延长线、速度偏角和位移偏角的数学计算与可视化绘制
  const drawAngleArc = (ocx: number, ocy: number, startAngle: number, endAngle: number, radius: number) => {
    const x1 = ocx + radius * Math.cos(startAngle)
    const y1 = ocy + radius * Math.sin(startAngle)
    const x2 = ocx + radius * Math.cos(endAngle)
    const y2 = ocy + radius * Math.sin(endAngle)
    const largeArcFlag = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0
    const sweepFlag = endAngle > startAngle ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}`
  }

  const tangentData = useMemo(() => {
    if (isAC === 1 || useGravity === 1 || !showVectors) return null

    const vx = currentState.vx
    const vy = currentState.vy
    if (Math.abs(vy) < 1e-4) return null

    const k = vy / vx
    const x = currentState.x
    const y = currentState.y

    // 速度反向延长线在水平中线 (y=0) 的物理 x 交点
    const xInter = x - y / k
    const cInterX = startX + xInter * scale

    // 物理起点 X=0 处的 Y 像素位置（延长线终点）
    const yStart = y - k * x
    const pxYStart = midY + yStart * scale

    const theta = Math.atan2(vy, vx)
    const alpha = Math.atan2(y, x)

    return {
      xInter,
      cInterX,
      pxYStart,
      theta,
      alpha,
    }
  }, [currentState, isAC, useGravity, showVectors])

  // X/Y 网格线（基于正方形 65px 网格，完美贴合极板，避免计算抖动）
  const gridLines = useMemo(() => {
    if (!showGrid) return null
    const lines = []
    // 纵向网格 (100px - 620px，共 8 个间隔，每格 65px)
    for (let i = 0; i <= 8; i++) {
      const gx = startX + i * 65
      lines.push(
        <line
          key={`gx-${i}`}
          x1={gx}
          y1={topPlateY}
          x2={gx}
          y2={bottomPlateY}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={CANVAS_STYLE.stroke.grid}
          strokeDasharray="4,4"
        />
      )
    }
    // 横向网格 (32.5px - 292.5px，共 4 个间隔，每格 65px)
    for (let i = 0; i <= 4; i++) {
      const gy = topPlateY + i * 65
      lines.push(
        <line
          key={`gy-${i}`}
          x1={startX}
          y1={gy}
          x2={startX + 520}
          y2={gy}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={CANVAS_STYLE.stroke.grid}
          strokeDasharray="4,4"
        />
      )
    }
    // 水平中心参考中线
    lines.push(
      <line
        key="mid"
        x1={startX}
        y1={midY}
        x2={700}
        y2={midY}
        stroke={PHYSICS_COLORS.grid}
        strokeWidth={CANVAS_STYLE.stroke.reference}
        strokeDasharray="2,4"
      />
    )
    return lines
  }, [showGrid, topPlateY, bottomPlateY])

  // 10. 图表数据映射
  // (1) 速度图像数据
  const vtPoints = useMemo(() => {
    return points.map((p) => ({ t: p.t, v: p.vy }))
  }, [points])

  const vxSeries = useMemo(() => {
    return [
      {
        points: points.map((p) => ({ t: p.t, v: p.vx })),
        domainPoints: points.map((p) => ({ t: p.t, v: p.vx })),
        label: 'vₓ (水平分速度)',
        series: 'secondary' as const,
      },
    ]
  }, [points])

  const chartYBounds = useMemo(() => {
    const vys = points.map((p) => p.vy)
    const maxV = Math.max(...vys, v0, 5)
    const minV = Math.min(...vys, -5)
    const range = maxV - minV
    return {
      min: minV - range * 0.15 - 1,
      max: maxV + range * 0.15 + 1,
    }
  }, [points, v0])

  // (2) 能量图像数据 (以毫焦 mJ 为单位)
  const energyData = useMemo(() => {
    const T = freq > 0 ? 1 / freq : 0.02
    const tStart = phi0 * T

    // 动能
    const ekPoints = points.map((p) => ({
      t: p.t,
      v: 0.5 * PARTICLE_MASS * (p.vx * p.vx + p.vy * p.vy) * 1000,
    }))

    // 电势能 (以中轴线为零电势参考点)
    const epPoints = points.map((p) => {
      const phase = isAC === 1 ? ((p.t + tStart) % T) / T : 0
      const fieldSign = isAC === 1 ? (phase < 0.5 ? 1 : -1) : 1
      const Ep = -q * 1e-6 * (U / PLATE_GAP) * fieldSign * p.y * 1000
      return { t: p.t, v: Ep }
    })

    // 重力势能 (以中轴线为零势能参考点)
    const egPoints = points.map((p) => ({
      t: p.t,
      v: useGravity === 1 ? -PARTICLE_MASS * 9.8 * p.y * 1000 : 0,
    }))

    // 总能量
    const etotPoints = points.map((p, idx) => ({
      t: p.t,
      v: ekPoints[idx].v + epPoints[idx].v + egPoints[idx].v,
    }))

    return { ekPoints, epPoints, egPoints, etotPoints }
  }, [points, U, q, freq, isAC, phi0, useGravity, PARTICLE_MASS])

  const energySeries = useMemo(() => {
    const seriesList: ChartDataSeries[] = [
      {
        points: energyData.epPoints,
        domainPoints: energyData.epPoints,
        label: '电势能 Eₚ',
        series: 'secondary' as const,
      },
    ]

    if (useGravity === 1) {
      seriesList.push({
        points: energyData.egPoints,
        domainPoints: energyData.egPoints,
        label: '重力势能 E_g',
        series: 'success' as const,
      })
    }

    seriesList.push({
      points: energyData.etotPoints,
      domainPoints: energyData.etotPoints,
      label: '总能量 E_总',
      series: 'accent' as const,
    })

    return seriesList
  }, [energyData, useGravity])

  const energyYBounds = useMemo(() => {
    const vals = [
      ...energyData.ekPoints.map((p) => p.v),
      ...energyData.epPoints.map((p) => p.v),
      ...energyData.etotPoints.map((p) => p.v),
    ]
    if (useGravity === 1) {
      vals.push(...energyData.egPoints.map((p) => p.v))
    }
    const maxVal = Math.max(...vals, 1)
    const minVal = Math.min(...vals, -1)
    const range = maxVal - minVal
    return {
      min: minVal - range * 0.15 - 0.2,
      max: maxVal + range * 0.15 + 0.2,
    }
  }, [energyData, useGravity])

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* 图像区 (放上方，占 h-[260px] 左右，并列展示 v-t & E-t，无切换按钮，最大化绘图空间) */}
      <Card className="h-[260px] p-3 select-none">
        <div className="w-full h-full flex gap-4">
          <div className="flex-1 min-w-0 h-full relative">
            <VelocityTimeChart
              points={vtPoints}
              domainPoints={vtPoints}
              additionalSeries={vxSeries}
              currentTime={tSim}
              tMax={simResult.tEnd}
              vRange={[chartYBounds.min, chartYBounds.max]}
              title="速度分量 v_y & v_x 随时间变化"
              showArea
            />
          </div>
          <div className="flex-1 min-w-0 h-full relative">
            <VelocityTimeChart
              points={energyData.ekPoints}
              domainPoints={energyData.ekPoints}
              additionalSeries={energySeries}
              currentTime={tSim}
              tMax={simResult.tEnd}
              vRange={[energyYBounds.min, energyYBounds.max]}
              yLabel="E (mJ)"
              title="能量转换 (动能 E_k, 电势能 E_p, 重力势能 E_g, 总能量 E_总)"
              series="primary"
            />
          </div>
        </div>
      </Card>

      {/* 动画反馈区 (放下方，自适应高度填充，viewBox 700x325，大比例构图无留白) */}
      <Card className="flex-1 min-h-0 p-3 relative flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 700 325"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full select-none"
        >
          <defs>
            <VectorDefs
              colors={[
                PHYSICS_COLORS.velocity,
                PHYSICS_COLORS.velocityY,
                PHYSICS_COLORS.acceleration,
                PHYSICS_COLORS.electricForce,
                PHYSICS_COLORS.gravity,
              ]}
            />
          </defs>

          {/* 网格参考 */}
          {gridLines}

          {/* 粒子发射枪 */}
          <rect
            x={startX - 24}
            y={midY - 8}
            width={24}
            height={16}
            fill={SCENE_COLORS.electricalApparatus.terminalBody}
            rx={2}
            stroke={CANVAS_COLORS.labelText}
            strokeWidth={CANVAS_STYLE.stroke.objectThin}
          />
          <circle cx={startX - 24} cy={midY} r={TERMINAL_CORE_RADIUS} fill={SCENE_COLORS.electricalApparatus.terminalCore} />

          {/* 上极板 */}
          <line
            x1={startX}
            y1={topPlateY}
            x2={startX + 520}
            y2={topPlateY}
            stroke={curFieldSign > 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
            strokeWidth={CANVAS_STYLE.stroke.groundLine}
            strokeLinecap="round"
          />
          <text
            x={startX - 15}
            y={topPlateY + 5}
            fontSize={font(14)}
            fontWeight="bold"
            textAnchor="end"
            fill={curFieldSign > 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
          >
            {curFieldSign > 0 ? '＋' : '－'}
          </text>

          {/* 下极板 */}
          <line
            x1={startX}
            y1={bottomPlateY}
            x2={startX + 520}
            y2={bottomPlateY}
            stroke={curFieldSign > 0 ? PHYSICS_COLORS.negativeCharge : PHYSICS_COLORS.positiveCharge}
            strokeWidth={CANVAS_STYLE.stroke.groundLine}
            strokeLinecap="round"
          />
          <text
            x={startX - 15}
            y={bottomPlateY + 5}
            fontSize={font(14)}
            fontWeight="bold"
            textAnchor="end"
            fill={curFieldSign > 0 ? PHYSICS_COLORS.negativeCharge : PHYSICS_COLORS.positiveCharge}
          >
            {curFieldSign > 0 ? '－' : '＋'}
          </text>

          {/* 均匀分布的电场强度指示 */}
          {showVectors &&
            Array.from({ length: 7 }, (_, i) => {
              const fx = startX + 25 + (i * 470) / 6
              const startY = curFieldSign > 0 ? topPlateY + 6 : bottomPlateY - 6
              const endY = curFieldSign > 0 ? bottomPlateY - 6 : topPlateY + 6
              return (
                <g key={`E-line-${i}`}>
                  <line
                    x1={fx}
                    y1={startY}
                    x2={fx}
                    y2={endY}
                    stroke={PHYSICS_COLORS.electricField}
                    strokeWidth={CANVAS_STYLE.stroke.fieldLineThin}
                    strokeDasharray="5,4"
                  />
                  {/* 随极性反转的电场箭头 */}
                  <path
                    d={
                      curFieldSign > 0
                        ? `M ${fx - 4} ${midY - 3} L ${fx} ${midY + 3} L ${fx + 4} ${midY - 3}`
                        : `M ${fx - 4} ${midY + 3} L ${fx} ${midY - 3} L ${fx + 4} ${midY + 3}`
                    }
                    fill="none"
                    stroke={PHYSICS_COLORS.electricField}
                    strokeWidth={CANVAS_STYLE.stroke.fieldLine}
                  />
                </g>
              )
            })}
          {showVectors && (
            <text
              x={startX + 510}
              y={midY - 10}
              fontSize={font(11)}
              fill={PHYSICS_COLORS.electricField}
              fontWeight="bold"
              textAnchor="end"
            >
              E (匀强电场)
            </text>
          )}

          {/* 轨迹线 */}
          {historyPathPoints && (
            <polyline
              points={historyPathPoints}
              fill="none"
              stroke={PHYSICS_COLORS.trackHistory}
              strokeWidth={CANVAS_STYLE.stroke.trackHistory}
              strokeDasharray="3,3"
            />
          )}
          {/* 速度反向延长线与夹角可视化（平抛几何推论） */}
          {tangentData && (
            <g>
              {/* 1. 速度反向延长虚线 */}
              <line
                x1={tangentData.pxYStart > 0 ? startX : tangentData.cInterX} // 裁剪在区域内
                y1={tangentData.pxYStart}
                x2={cx}
                y2={cy}
                stroke={PHYSICS_COLORS.tangentLine}
                strokeWidth={CANVAS_STYLE.stroke.tangent}
                strokeDasharray="3,3"
              />

              {/* 2. 发射点到粒子的位移虚线 */}
              <line
                x1={startX}
                y1={midY}
                x2={cx}
                y2={cy}
                stroke={PHYSICS_COLORS.displacement}
                strokeWidth={CANVAS_STYLE.stroke.reference}
                strokeDasharray="3,3"
                opacity={0.7}
              />

              {/* 3. 水平中轴线交点圆圈与标记 */}
              <circle cx={tangentData.cInterX} cy={midY} r={INTERSECTION_DOT_RADIUS} fill={PHYSICS_COLORS.tangentLine} />
              <text
                x={tangentData.cInterX}
                y={midY - 8}
                fontSize={font(10)}
                fill={PHYSICS_COLORS.tangentLine}
                fontWeight="bold"
                textAnchor="middle"
              >
                {currentState.x < PLATE_LENGTH ? 'x/2' : 'L/2'}
              </text>

              {/* 4. 速度偏角 θ 弧线与文字标注 */}
              {Math.abs(tangentData.theta) > 0.02 && (
                <g>
                  <path
                    d={drawAngleArc(tangentData.cInterX, midY, 0, tangentData.theta, 24)}
                    fill="none"
                    stroke={PHYSICS_COLORS.tangentLine}
                    strokeWidth={CANVAS_STYLE.stroke.tangent}
                  />
                  <text
                    x={tangentData.cInterX + 30 * Math.cos(tangentData.theta / 2)}
                    y={midY + 30 * Math.sin(tangentData.theta / 2) + 4}
                    fontSize={font(11)}
                    fill={PHYSICS_COLORS.tangentLine}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    θ
                  </text>
                </g>
              )}

              {/* 5. 位移偏角 α 弧线与文字标注 */}
              {Math.abs(tangentData.alpha) > 0.02 && (
                <g>
                  <path
                    d={drawAngleArc(startX, midY, 0, tangentData.alpha, 28)}
                    fill="none"
                    stroke={PHYSICS_COLORS.displacement}
                    strokeWidth={CANVAS_STYLE.stroke.tangent}
                  />
                  <text
                    x={startX + 36 * Math.cos(tangentData.alpha / 2)}
                    y={midY + 36 * Math.sin(tangentData.alpha / 2) + 4}
                    fontSize={font(11)}
                    fill={PHYSICS_COLORS.displacement}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    α
                  </text>
                </g>
              )}
            </g>
          )}

          {/* 粒子 */}
          <circle
            cx={cx}
            cy={cy}
            r={PARTICLE_RADIUS}
            fill={PHYSICS_COLORS.positiveCharge}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={CANVAS_STYLE.stroke.objectLine}
          />
          <text
            x={cx}
            y={cy + 4.5}
            fontSize={font(13)}
            fill={CANVAS_COLORS.annotation}
            textAnchor="middle"
            fontWeight="bold"
          >
            +
          </text>

          {/* 速度分量与速度分解虚线框 */}
          {showVectors && !ended && (
            <g>
              {/* 矩形分解虚线框 */}
              <line
                x1={cx + vx_px}
                y1={cy}
                x2={cx + vx_px}
                y2={cy + vy_px}
                stroke={PHYSICS_COLORS.axis}
                strokeWidth={CANVAS_STYLE.stroke.reference}
                strokeDasharray="3,3"
              />
              <line
                x1={cx}
                y1={cy + vy_px}
                x2={cx + vx_px}
                y2={cy + vy_px}
                stroke={PHYSICS_COLORS.axis}
                strokeWidth={CANVAS_STYLE.stroke.reference}
                strokeDasharray="3,3"
              />

              {/* v0 (水平分速度，经典蓝) */}
              <VectorArrow
                origin={{ x: cx, y: -cy }}
                vector={{ x: currentState.vx, y: 0 }}
                type="velocityX"
                sceneScale={sceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                pixelLength={vxPxLen}
              />
              <text
                x={cx + vx_px + 8}
                y={cy + 3}
                fontSize={font(10)}
                fill={PHYSICS_COLORS.velocityX}
                fontWeight="bold"
              >
                v₀
              </text>

              {/* vy (竖直分速度，浅蓝) */}
              {Math.abs(currentState.vy) > 0.05 && (
                <VectorArrow
                  origin={{ x: cx, y: -cy }}
                  vector={{ x: 0, y: -currentState.vy }}
                  type="velocityY"
                  sceneScale={sceneScale}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  pixelLength={vyPxLen}
                />
              )}
              <text
                x={cx - 3}
                y={cy + vy_px + (vy_px > 0 ? 12 : -4)}
                fontSize={font(10)}
                fill={PHYSICS_COLORS.velocityY}
                fontWeight="bold"
                textAnchor="middle"
              >
                vᵧ
              </text>

              {/* 合速度 v (深蓝) */}
              <VectorArrow
                origin={{ x: cx, y: -cy }}
                vector={{ x: currentState.vx, y: -currentState.vy }}
                type="velocity"
                sceneScale={sceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                pixelLength={totalPxLen}
              />
              <text
                x={cx + vx_px + 8}
                y={cy + vy_px + (vy_px > 0 ? 8 : -4)}
                fontSize={font(10)}
                fill={PHYSICS_COLORS.velocity}
                fontWeight="bold"
              >
                v
              </text>

              {/* 电场力 F_E (紫色) */}
              <VectorArrow
                origin={{ x: cx, y: -cy }}
                vector={{ x: 0, y: -currentState.ay + (useGravity ? 9.8 : 0) }}
                type="electricForce"
                sceneScale={sceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              />

              {/* 重力 mg (绿色) */}
              {useGravity === 1 && (
                <VectorArrow
                  origin={{ x: cx, y: -cy }}
                  vector={{ x: 0, y: -9.8 }}
                  type="gravity"
                  sceneScale={sceneScale}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                />
              )}
            </g>
          )}

          {/* 终止状态指示 */}
          {ended && (
            <g transform={`translate(${cx}, ${cy + (cy > midY ? -18 : 24)})`}>
              <rect x={-45} y={-14} width={90} height={20} fill={withAlpha(CANVAS_COLORS.labelText, 0.85)} rx={4} />
              <text fontSize={font(10)} fill={CANVAS_COLORS.objectFill} textAnchor="middle" fontWeight="bold" y={0}>
                {hitType === 'top' ? '撞击上极板' : hitType === 'bottom' ? '撞击下极板' : '已射出电场'}
              </text>
            </g>
          )}
        </svg>
      </Card>
    </div>
  )
}
