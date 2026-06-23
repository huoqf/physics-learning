import { useEffect, useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_STYLE, CANVAS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { withAlpha } from '@/theme/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { createSceneScale } from '@/scene/SceneScale'
import { calculateVectorPixelLength } from '@/utils/vectorLength'
import { VelocityTimeChart } from '@/components/Chart'
import {
  calculateChargeInEFieldTrajectory,
  getChargeInEFieldTimeScale,
} from '@/physics/electromagnetism'

export default function ChargeInEField() {
    const {params, time, showVectors, showGrid, setIsPlaying} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    showGrid: s.showGrid,
    setIsPlaying: s.setIsPlaying,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.tall)
  const { font } = canvasSize

  const U = params.U ?? 200
  const v0 = params.v0 ?? 20
  const q = params.q ?? 5
  const freq = params.freq ?? 50
  const isAC = params.isAC ?? 0
  const useGravity = params.useGravity ?? 0

  // 物理几何常数 (SI)
  const PLATE_LENGTH = 0.4 // m
  const PLATE_GAP = 0.2 // m
  const HALF_GAP = PLATE_GAP / 2

  // 1. 进行高精度仿真
  const simResult = useMemo(() => {
    return calculateChargeInEFieldTrajectory({
      U,
      d: PLATE_GAP,
      L: PLATE_LENGTH,
      q: q * 1e-6,
      m: 50 * 1e-6, // 50 mg
      v0,
      g: useGravity === 1 ? 9.8 : 0,
      isAC: isAC === 1,
      freq,
    })
  }, [U, v0, q, freq, isAC, useGravity])

  const { tEnd, points, hitType } = simResult

  // 仿真慢放时间比例：直流下 2.5秒播完，交变下 8秒播完，实现动态映射
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

  // 4. 铺满式物理舞台尺寸设计
  // 上下划分：上面为动画区，下面 150px 为 MiniChart 图像区
  const chartHeight = 150
  const animHeight = Math.max(200, canvasSize.height - chartHeight - 20)
  
  const padX = 80
  const padTop = 35
  const region = {
    left: padX,
    right: canvasSize.width - 40,
    top: padTop,
    bottom: animHeight - 30,
  }
  const plateLenPx = region.right - region.left
  const plateGapPx = region.bottom - region.top
  const midY = (region.top + region.bottom) / 2

  // 双轴自适应等比例缩放
  const scaleX = plateLenPx / PLATE_LENGTH
  const scaleY = plateGapPx / PLATE_GAP
  const scale = Math.min(scaleX, scaleY) // 保证横纵等比例，物理几何不失真

  // 极板的真实像素位置
  const topPlateY = midY - HALF_GAP * scale
  const bottomPlateY = midY + HALF_GAP * scale

  // 粒子屏幕坐标（入口中心为物理 (0,0)，y 轴向下为正）
  const cx = region.left + currentState.x * scale
  const cy = midY + currentState.y * scale

  // 5. 极板极性与电场线动态方向
  const curFieldSign = useMemo(() => {
    if (isAC && freq > 0) {
      const T = 1 / freq
      const phase = (tSim % T) / T
      return phase < 0.5 ? 1 : -1
    }
    return 1
  }, [tSim, isAC, freq])

  // 6. 生成运动历史轨迹
  const historyPathPoints = useMemo(() => {
    const pts: string[] = []
    for (const pt of points) {
      if (pt.t > tSim + 1e-9) break
      pts.push(`${region.left + pt.x * scale},${midY + pt.y * scale}`)
    }
    return pts.join(' ')
  }, [points, tSim, scale, region.left, midY])

  // 7. 矢量工具 sceneScale
  const sceneScale = useMemo(() => {
    const maxVal = Math.max(v0, 10)
    // 仿真中，引力重力为 9.8，合加速度最大可到约 40 左右
    const maxAcc = Math.max(Math.abs(currentState.ay), 25)
    return createSceneScale({
      vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: animHeight },
      originX: 0,
      originY: 0,
      refMagnitudes: {
        velocity: maxVal,
        acceleration: maxAcc,
        electricField: 10,
        electricForce: maxAcc,
        gravity: maxAcc // 统一力的尺度，以便重力和电场力可以在视觉上比较大小
      }
    })
  }, [v0, currentState.ay, canvasSize.width, animHeight])

  // 8. 速度分解虚线框的终点坐标
  const refMag = Math.max(v0, 10)
  const velocityScaleFactor = sceneScale.maxVectorLength / refMag
  const vx_px = currentState.vx * velocityScaleFactor
  const vy_px = currentState.vy * velocityScaleFactor

  // 8a. 速度矢量统一缩放，确保平行四边形法则成立
  const vMag = Math.hypot(currentState.vx, currentState.vy)
  const totalPxLen = calculateVectorPixelLength(vMag, 'velocity', sceneScale.maxVectorLength, refMag)
  const vxPxLen = vMag > 0 ? totalPxLen * (Math.abs(currentState.vx) / vMag) : 0
  const vyPxLen = vMag > 0 ? totalPxLen * (Math.abs(currentState.vy) / vMag) : 0

  // 9. 图像自适应量程
  const chartYBounds = useMemo(() => {
    const vys = points.map(p => p.vy)
    const maxV = Math.max(...vys, 5)
    const minV = Math.min(...vys, -5)
    const range = maxV - minV
    return {
      min: minV - range * 0.15 - 1,
      max: maxV + range * 0.15 + 1
    }
  }, [points])

  // 10. 映射图表数据点
  const vtPoints = useMemo(() => {
    return points.map(p => ({ t: p.t, v: p.vy }))
  }, [points])

  // X 轴网格线
  const gridLines = useMemo(() => {
    if (!showGrid) return null
    const lines = []
    // 纵向网格
    for (let i = 0; i <= 8; i++) {
      const gx = region.left + (i * plateLenPx) / 8
      lines.push(
        <line key={`gx-${i}`} x1={gx} y1={topPlateY} x2={gx} y2={bottomPlateY}
          stroke={PHYSICS_COLORS.grid} strokeWidth={1} strokeDasharray="4,4" />
      )
    }
    // 横向网格
    for (let i = 0; i <= 4; i++) {
      const gy = topPlateY + (i * (bottomPlateY - topPlateY)) / 4
      lines.push(
        <line key={`gy-${i}`} x1={region.left} y1={gy} x2={region.right} y2={gy}
          stroke={PHYSICS_COLORS.grid} strokeWidth={1} strokeDasharray="4,4" />
      )
    }
    // 中线
    lines.push(
      <line key="mid" x1={region.left} y1={midY} x2={region.right} y2={midY}
        stroke={PHYSICS_COLORS.grid} strokeWidth={1.2} strokeDasharray="2,4" />
    )
    return lines
  }, [showGrid, region.left, region.right, topPlateY, bottomPlateY, plateLenPx, midY])

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col gap-4">
      {/* 动画反馈区 */}
      <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-neutral-100 p-3 relative">
        <svg width={canvasSize.width - 26} height={animHeight} className="overflow-visible select-none">
          <defs>
            <VectorDefs colors={[PHYSICS_COLORS.velocity, PHYSICS_COLORS.velocityY, PHYSICS_COLORS.acceleration, PHYSICS_COLORS.electricForce, PHYSICS_COLORS.gravity]} />
          </defs>

          {/* 网格参考 */}
          {gridLines}

          {/* 粒子发射枪 */}
          <rect x={region.left - 24} y={midY - 8} width={24} height={16} fill={SCENE_COLORS.electricalApparatus.terminalBody} rx={2} stroke={CANVAS_COLORS.labelText} strokeWidth={1.5} />
          <circle cx={region.left - 24} cy={midY} r={4} fill={SCENE_COLORS.electricalApparatus.terminalCore} />

          {/* 上极板 */}
          <line x1={region.left} y1={topPlateY} x2={region.right} y2={topPlateY}
            stroke={curFieldSign > 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
            strokeWidth={5} strokeLinecap="round" />
          <text x={region.left - 15} y={topPlateY + 5} fontSize={font(14)} fontWeight="bold" textAnchor="end"
            fill={curFieldSign > 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}>
            {curFieldSign > 0 ? '＋' : '－'}
          </text>

          {/* 下极板 */}
          <line x1={region.left} y1={bottomPlateY} x2={region.right} y2={bottomPlateY}
            stroke={curFieldSign > 0 ? PHYSICS_COLORS.negativeCharge : PHYSICS_COLORS.positiveCharge}
            strokeWidth={5} strokeLinecap="round" />
          <text x={region.left - 15} y={bottomPlateY + 5} fontSize={font(14)} fontWeight="bold" textAnchor="end"
            fill={curFieldSign > 0 ? PHYSICS_COLORS.negativeCharge : PHYSICS_COLORS.positiveCharge}>
            {curFieldSign > 0 ? '－' : '＋'}
          </text>

          {/* 均匀分布的电场强度指示 */}
          {showVectors && Array.from({ length: 7 }, (_, i) => {
            const fx = region.left + 25 + (i * (plateLenPx - 50)) / 6
            const startY = curFieldSign > 0 ? topPlateY + 6 : bottomPlateY - 6
            const endY = curFieldSign > 0 ? bottomPlateY - 6 : topPlateY + 6
            return (
              <g key={`E-line-${i}`}>
                <line x1={fx} y1={startY} x2={fx} y2={endY}
                  stroke={PHYSICS_COLORS.electricField} strokeWidth={1.2} strokeDasharray="5,4" />
                {/* 随极性反转的电场箭头 */}
                <path d={curFieldSign > 0 
                  ? `M ${fx - 4} ${midY - 3} L ${fx} ${midY + 3} L ${fx + 4} ${midY - 3}` 
                  : `M ${fx - 4} ${midY + 3} L ${fx} ${midY - 3} L ${fx + 4} ${midY + 3}`}
                  fill="none" stroke={PHYSICS_COLORS.electricField} strokeWidth={1.5} />
              </g>
            )
          })}
          {showVectors && (
            <text x={region.right - 10} y={midY - 10} fontSize={font(11)} fill={PHYSICS_COLORS.electricField} fontWeight="bold" textAnchor="end">
              E (匀强电场)
            </text>
          )}

          {/* 轨迹线 */}
          {historyPathPoints && (
            <polyline points={historyPathPoints} fill="none" stroke={PHYSICS_COLORS.trackHistory}
              strokeWidth={CANVAS_STYLE.stroke.trackHistory} strokeDasharray="3,3" />
          )}

          {/* 粒子 */}
          <circle cx={cx} cy={cy} r={10} fill={PHYSICS_COLORS.positiveCharge} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={2} />
          <text x={cx} y={cy + 4.5} fontSize={font(13)} fill={CANVAS_COLORS.annotation} textAnchor="middle" fontWeight="bold">+</text>

          {/* 速度分量与速度分解虚线框 */}
          {showVectors && !ended && (
            <g>
              {/* 矩形分解虚线框 */}
              <line x1={cx + vx_px} y1={cy} x2={cx + vx_px} y2={cy + vy_px}
                stroke={PHYSICS_COLORS.axis} strokeWidth={1} strokeDasharray="3,3" />
              <line x1={cx} y1={cy + vy_px} x2={cx + vx_px} y2={cy + vy_px}
                stroke={PHYSICS_COLORS.axis} strokeWidth={1} strokeDasharray="3,3" />

              {/* v0 (水平分速度，经典蓝) */}
              <VectorArrow
                origin={{ x: cx, y: -cy }}
                vector={{ x: currentState.vx, y: 0 }}
                type="velocityX"
                sceneScale={sceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                pixelLength={vxPxLen}
              />
              <text x={cx + vx_px + 8} y={cy + 3} fontSize={font(10)} fill={PHYSICS_COLORS.velocityX} fontWeight="bold">v₀</text>

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
              <text x={cx - 3} y={cy + vy_px + (vy_px > 0 ? 12 : -4)} fontSize={font(10)} fill={PHYSICS_COLORS.velocityY} fontWeight="bold" textAnchor="middle">vᵧ</text>

              {/* 合速度 v (深蓝) */}
              <VectorArrow
                origin={{ x: cx, y: -cy }}
                vector={{ x: currentState.vx, y: -currentState.vy }}
                type="velocity"
                sceneScale={sceneScale}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                pixelLength={totalPxLen}
              />
              <text x={cx + vx_px + 8} y={cy + vy_px + (vy_px > 0 ? 8 : -4)} fontSize={font(10)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>

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
      </div>

      {/* 图像显示区 */}
      <div className="h-[150px] bg-white rounded-xl shadow-sm border border-neutral-100 p-2">
        <VelocityTimeChart
          points={vtPoints}
          currentTime={tSim}
          tMax={simResult.tEnd}
          vRange={[chartYBounds.min, chartYBounds.max]}
          title="vᵧ - t 图像"
          showArea
        />
      </div>
    </div>
  )
}
