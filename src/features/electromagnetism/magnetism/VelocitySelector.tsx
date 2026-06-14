import { useEffect, useRef, useMemo, useId } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateVelocitySelectorTrajectory } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE, FONT } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { CapacitorPlates } from '@/components/Physics/CapacitorPlates'
import { ParticleEmitter } from '@/components/Physics/ParticleEmitter'
import { createSceneScale, worldToPixel } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

interface ParticleState {
  id: number
  tEmit: number
  v0: number
  q: number
}

export default function VelocitySelector() {
  const gradId = useId()
  const [sizeRef, canvasSize] = useCanvasSize({ width: 700, height: 420 })
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const { params, time, isPlaying, showVectors } = useAnimationStore()

  const mode = params.mode ?? 0 // 0: 基础, 1: 进阶
  const v0_param = params.v0 ?? 10.0
  const B_param = params.B ?? 1.0
  const E_param = params.E ?? 10.0
  const qOverM_param = params.qOverM ?? 1.0
  const q_param = params.q ?? 1.0 // 基础模式下的电荷符号 (1.0 或 -1.0)
  const keepTrack = params.keepTrack === 1
  const showElectricField = params.showElectricField === 1

  // 1. 物理模型与缩放参数设定
  const L_phys = 5.0 // 极板长度 (m)
  const d_phys = 2.0 // 极板间距 (m)
  const m_phys = 1.0 // 质量固定为 1kg

  // 根据模式与视口尺寸自适应计算几何中心和比例尺，避免硬编码像素
  const cx_in = canvasSize.width * 0.20 // 入射点 X 坐标占宽度的 20%
  const cy = mode === 0 ? canvasSize.height * 0.50 : canvasSize.height * 0.68 // 几何中心 Y 坐标自适应
  
  // 5.0m 的板长在水平方向占画布宽度的 65%
  const scaleX = (canvasSize.width * 0.65) / L_phys
  // 2.0m 的板间距在垂直方向占画布高度的 20%
  const scaleY = (canvasSize.height * 0.20) / d_phys

  const x_plate_px = cx_in
  const w_plate_px = L_phys * scaleX
  const gap_plate_px = d_phys * scaleY

  // 矢量归一化比例尺
  const selectorScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: cx_in,
    originY: cy,
    worldWidth: canvasSize.width / scaleX,
    worldHeight: canvasSize.height / scaleY,
    refMagnitudes: {
      force: 20,
      velocity: 20,
    },
  }
  const sceneScale = createSceneScale(selectorScene)

  // 2. 连续粒子流发射控制（进阶模式）
  const particlesRef = useRef<ParticleState[]>([])
  const lastEmitTimeRef = useRef<number>(0)
  const nextParticleIdRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(time)

  // 检测重置或时间轴拖动
  if (time === 0 || time < lastTimeRef.current) {
    particlesRef.current = []
    lastEmitTimeRef.current = 0
    nextParticleIdRef.current = 0
  }
  lastTimeRef.current = time

  // 多粒子发射逻辑
  if (mode === 1 && isPlaying) {
    const emitInterval = 0.16 // 发射间隔时间 (s)
    if (time - lastEmitTimeRef.current >= emitInterval) {
      // 速度筛选点
      const v_filter = B_param > 0.01 ? E_param / B_param : 0
      
      // 生成 7 种不同速度的粒子簇（以 v_filter 为中心带有分布，包括满足条件的 v_filter 自身）
      const ratios = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6]
      const newParticles = ratios.map((r) => {
        const id = nextParticleIdRef.current++
        return {
          id,
          tEmit: time,
          v0: v_filter * r,
          q: qOverM_param,
        }
      })
      particlesRef.current = [...particlesRef.current, ...newParticles]
      lastEmitTimeRef.current = time
    }
  }

  // 3. 计算单粒子物理状态（基础模式）
  const singleParticle = useMemo(() => {
    if (mode !== 0) return null
    // 基础模式 E = 0, 荷质比 q = q_param
    const res = calculateVelocitySelectorTrajectory(
      q_param,
      m_phys,
      v0_param,
      0, // E = 0
      B_param,
      L_phys * 3, // 基础模式下不需要撞板或穿出，平铺磁场，让其跑得足够远
      d_phys * 3,
      time
    )
    return res
  }, [mode, q_param, v0_param, B_param, time])

  // 4. 粒子列表状态计算与绘制（Canvas）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (mode === 0 && singleParticle) {
      // ─── 基础模式单个粒子绘制 ───
      const { point } = singleParticle
      const { px, py } = worldToPixel(point.x, point.y, sceneScale)

      // 绘制历史轨迹
      if (keepTrack && time > 0) {
        ctx.beginPath()
        ctx.lineWidth = CANVAS_STYLE.stroke.reference
        ctx.strokeStyle = PHYSICS_COLORS.trackHistory
        ctx.setLineDash([4, 3])

        // 生成从 0 到当前时刻的 80 个采样点
        for (let i = 0; i <= 80; i++) {
          const t_sample = (time * i) / 80
          const res = calculateVelocitySelectorTrajectory(
            q_param,
            m_phys,
            v0_param,
            0,
            B_param,
            L_phys * 3,
            d_phys * 3,
            t_sample
          )
          const { px: sx, py: sy } = worldToPixel(res.point.x, res.point.y, sceneScale)
          if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy)
        }
        ctx.stroke()
        ctx.setLineDash([])
      }

      // 绘制粒子
      ctx.beginPath()
      ctx.arc(px, py, CANVAS_STYLE.object.pointMassRadius, 0, 2 * Math.PI)
      ctx.fillStyle = q_param >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge
      ctx.fill()
      ctx.strokeStyle = PHYSICS_COLORS.objectStroke
      ctx.lineWidth = CANVAS_STYLE.stroke.objectLine
      ctx.stroke()
    } else if (mode === 1) {
      // ─── 进阶模式多粒子流绘制 ───
      const activeParticles = particlesRef.current

      // 过滤并更新粒子位置
      const updatedParticles: ParticleState[] = []

      activeParticles.forEach((p) => {
        const t = time - p.tEmit
        if (t < 0) return

        const res = calculateVelocitySelectorTrajectory(
          p.q,
          m_phys,
          p.v0,
          E_param,
          B_param,
          L_phys,
          d_phys,
          t
        )

        const { px, py } = worldToPixel(res.point.x, res.point.y, sceneScale)

        // 粒子如果离开屏幕过远或撞击时间已过较久则清除
        const isOutOfScreen = px > canvasSize.width + 100 || py < -100 || py > canvasSize.height + 100
        const isExpiredHit = res.hitsPlate && res.tHit !== null && t > res.tHit + 0.3 // 撞板后留存0.3s淡出

        if (isOutOfScreen || isExpiredHit) {
          return // 被过滤丢弃
        }

        updatedParticles.push(p)

        // 绘制该粒子的尾迹
        ctx.beginPath()
        ctx.lineWidth = 2
        // 电性指示尾迹颜色
        ctx.strokeStyle = p.q >= 0 
          ? PHYSICS_COLORS.positiveCharge 
          : PHYSICS_COLORS.negativeCharge
        
        // 渐变不透明度
        let alpha = 0.45
        if (res.hitsPlate && res.tHit !== null && t > res.tHit) {
          alpha = Math.max(0, 0.45 * (1 - (t - res.tHit) / 0.3)) // 撞板后淡出
        }
        ctx.globalAlpha = alpha

        // 用 12 个采样点生成一段短的渐变尾迹，凸显高阶偏转的曲线质感
        const tEndTrace = res.hitsPlate && res.tHit !== null ? Math.min(t, res.tHit) : t
        const tStartTrace = Math.max(0, tEndTrace - 0.25) // 最近的0.25s
        
        for (let i = 0; i <= 10; i++) {
          const t_sample = tStartTrace + ((tEndTrace - tStartTrace) * i) / 10
          const traceRes = calculateVelocitySelectorTrajectory(
            p.q,
            m_phys,
            p.v0,
            E_param,
            B_param,
            L_phys,
            d_phys,
            t_sample
          )
          const { px: sx, py: sy } = worldToPixel(traceRes.point.x, traceRes.point.y, sceneScale)
          if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy)
        }
        ctx.stroke()
        ctx.globalAlpha = 1.0

        // 绘制粒子小圆点
        ctx.beginPath()
        ctx.arc(px, py, CANVAS_STYLE.object.pointMassRadius - 1.5, 0, 2 * Math.PI)
        ctx.fillStyle = p.q >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge
        
        let pAlpha = 1.0
        if (res.hitsPlate && res.tHit !== null && t > res.tHit) {
          pAlpha = Math.max(0, 1.0 - (t - res.tHit) / 0.3) // 撞板渐隐
        }
        ctx.globalAlpha = pAlpha
        ctx.fill()
        ctx.strokeStyle = PHYSICS_COLORS.objectStroke
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.globalAlpha = 1.0
      })

      particlesRef.current = updatedParticles
    }
  }, [mode, singleParticle, time, keepTrack, E_param, B_param, qOverM_param, q_param, canvasSize])

  // 5. $y - v$ 偏转图表曲线构建 (仅进阶模式)
  const chartData = useMemo(() => {
    if (mode !== 1) return null

    const points: { v: number; y: number }[] = []
    const vMin = 1.0
    const vMax = 25.0
    const stepCount = 80
    const vFilter = B_param > 0.01 ? E_param / B_param : 0

    for (let i = 0; i <= stepCount; i++) {
      const v = vMin + ((vMax - vMin) * i) / stepCount
      const res = calculateVelocitySelectorTrajectory(
        qOverM_param,
        m_phys,
        v,
        E_param,
        B_param,
        L_phys,
        d_phys,
        L_phys / Math.max(0.1, v) * 2 // 足够长时间
      )
      points.push({ v, y: res.point.y })
    }

    // 求当前滑块初速度对应的偏转位移
    const currentRes = calculateVelocitySelectorTrajectory(
      qOverM_param,
      m_phys,
      v0_param,
      E_param,
      B_param,
      L_phys,
      d_phys,
      L_phys / Math.max(0.1, v0_param) * 2
    )

    return { points, currentY: currentRes.point.y, vFilter }
  }, [mode, E_param, B_param, qOverM_param, v0_param])

  // 6. 图表像素坐标映射，自适应画布大小
  const chartWidth = w_plate_px // 与极板同宽
  const chartHeight = canvasSize.height * 0.20 // 占高度的 20%
  const chartXOffset = cx_in
  const chartYOffset = canvasSize.height * 0.08 // 占高度的 8%

  const toChartX = (v: number) => {
    const vMin = 1.0
    const vMax = 25.0
    return chartXOffset + ((v - vMin) / (vMax - vMin)) * chartWidth
  }

  const toChartY = (yVal: number) => {
    // y 物理范围为 [-d_phys/2, d_phys/2]，即 [-1.0, 1.0]
    // 映射到图表像素中线偏移，向上为y正方向
    const halfH = chartHeight / 2
    return chartYOffset + halfH - (yVal / (d_phys / 2)) * halfH
  }

  const chartCurvePath = useMemo(() => {
    if (!chartData) return ''
    return chartData.points
      .map((p, idx) => {
        const sx = toChartX(p.v)
        const sy = toChartY(p.y)
        return `${idx === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`
      })
      .join(' ')
  }, [chartData])

  // 7. 网格辅助线（已删除）

  // 8. 磁场背景平铺 (绿色“×”，代表向里 ⊗)
  const magneticFieldSigns = useMemo(() => {
    const cols = 8
    const rows = mode === 0 ? 5 : 3
    const startX = cx_in + 15
    const endX = cx_in + w_plate_px - 15
    const stepX = (endX - startX) / Math.max(1, cols - 1)
    
    const startY = mode === 0 ? cy - canvasSize.height * 0.24 : cy - gap_plate_px / 2 + 15
    const endY = mode === 0 ? cy + canvasSize.height * 0.24 : cy + gap_plate_px / 2 - 15
    const stepY = (endY - startY) / Math.max(1, rows - 1)

    const arr = []
    if (B_param > 0.01) {
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          arr.push({
            id: `b-cross-${i}-${j}`,
            x: startX + i * stepX,
            y: startY + j * stepY,
          })
        }
      }
    }
    return arr
  }, [mode, B_param, cy, gap_plate_px, w_plate_px])

  return (
    <div ref={sizeRef} className="w-full h-full relative">
      {/* 底层 SVG —— 绘制静态板、场、坐标和图表 */}
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-xl shadow-inner absolute top-0 left-0 select-none pointer-events-none"
      >
        <defs>
          <VectorDefs colors={[PHYSICS_COLORS.velocity, PHYSICS_COLORS.lorentzForce, PHYSICS_COLORS.electricForce]} />
        </defs>

        {/* 磁场背景 */}
        {magneticFieldSigns.map((cross) => (
          <text
            key={cross.id}
            x={cross.x}
            y={cross.y + 5}
            fontSize="15"
            fill={PHYSICS_COLORS.magneticFieldCross}
            opacity="0.32"
            textAnchor="middle"
            fontWeight="bold"
          >
            ⊗
          </text>
        ))}

        {/* 基础模式下的物理量矢量箭头 */}
        {mode === 0 && singleParticle && showVectors && (
          <g>
            {(() => {
              const { point } = singleParticle
              const { px: pPixelX, py: pPixelY } = worldToPixel(point.x, point.y, sceneScale)

              // 物理速度矢量和洛伦兹力矢量
              const velVec = { x: point.vx, y: point.vy }
              const forceVec = { x: point.fx, y: point.fy }

              return (
                <g>
                  {/* 速度矢量 (蓝色) */}
                  <VectorArrow
                    origin={{ x: point.x, y: point.y }}
                    vector={velVec}
                    type="velocity"
                    sceneScale={sceneScale}
                    strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  />
                  <text
                    x={pPixelX + (point.vx > 0 ? 15 : -25)}
                    y={pPixelY - (point.vy > 0 ? 15 : -15)}
                    fontSize={FONT.labelSize}
                    fill={PHYSICS_COLORS.velocity}
                    fontWeight="bold"
                  >
                    v
                  </text>

                  {/* 洛伦兹力矢量 (橙色) */}
                  {Math.abs(point.fx) > 0.01 || Math.abs(point.fy) > 0.01 ? (
                    <g>
                      <VectorArrow
                        origin={{ x: point.x, y: point.y }}
                        vector={forceVec}
                        type="force"
                        color={PHYSICS_COLORS.lorentzForce}
                        sceneScale={sceneScale}
                        strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                      />
                      <text
                        x={pPixelX + (point.fx > 0 ? 15 : -25)}
                        y={pPixelY - (point.fy > 0 ? 15 : -15)}
                        fontSize={FONT.labelSize}
                        fill={PHYSICS_COLORS.lorentzForce}
                        fontWeight="bold"
                      >
                        F_洛
                      </text>
                    </g>
                  ) : null}
                </g>
              )
            })()}
          </g>
        )}

        {/* 进阶模式下的平行金属板 */}
        {mode === 1 && (
          <CapacitorPlates
            x={x_plate_px}
            y={cy}
            width={w_plate_px}
            gap={gap_plate_px}
            chargeSign={E_param > 0.01 ? 1 : 0} // 默认上正下负
            showField={showElectricField}
            thickness={8}
          />
        )}

        {/* 进阶模式下的电场线指示 (黄色箭头) */}
        {mode === 1 && showElectricField && E_param > 0.01 && (
          <g opacity="0.4">
            {Array.from({ length: 6 }).map((_, i) => {
              const lineX = x_plate_px + 30 + (i * (w_plate_px - 60)) / 5
              return (
                <g key={`e-line-${i}`}>
                  <line
                    x1={lineX}
                    y1={cy - gap_plate_px / 2 + 8}
                    x2={lineX}
                    y2={cy + gap_plate_px / 2 - 8}
                    stroke={PHYSICS_COLORS.electricFieldLine}
                    strokeWidth="2.0"
                    strokeDasharray="4,3"
                  />
                  <polygon
                    points={`${lineX},${cy + gap_plate_px / 2 - 8} ${lineX - 4},${cy + gap_plate_px / 2 - 14} ${lineX + 4},${cy + gap_plate_px / 2 - 14}`}
                    fill={PHYSICS_COLORS.electricFieldLine}
                  />
                </g>
              )
            })}
          </g>
        )}

        {/* 粒子发射器 */}
        <ParticleEmitter
          x={cx_in}
          y={cy}
          active={isPlaying}
          chargeSign={mode === 0 ? q_param : qOverM_param}
        />

        {/* 进阶模式：y - v 偏转折线图表 */}
        {mode === 1 && chartCurvePath && chartData && (
          <g>
            <rect
              x={chartXOffset - 10}
              y={chartYOffset - 15}
              width={chartWidth + 30}
              height={chartHeight + 25}
              fill={colors.neutral[50]}
              rx={6}
              stroke={colors.neutral[200]}
              strokeWidth="1.2"
            />
            <text
              x={chartXOffset + chartWidth / 2}
              y={chartYOffset - 4}
              fontSize="11"
              fill={colors.neutral[600]}
              fontWeight="bold"
              textAnchor="middle"
            >
              穿出位移与速度关系 y - v 图像
            </text>

            {/* 坐标轴 */}
            {/* 速度 v 轴 */}
            <line
              x1={chartXOffset}
              y1={toChartY(0)}
              x2={chartXOffset + chartWidth + 10}
              y2={toChartY(0)}
              stroke={colors.neutral[400]}
              strokeWidth="1.2"
            />
            <polygon
              points={`${chartXOffset + chartWidth + 10},${toChartY(0) - 3.5} ${chartXOffset + chartWidth + 16},${toChartY(0)} ${chartXOffset + chartWidth + 10},${toChartY(0) + 3.5}`}
              fill={colors.neutral[400]}
            />
            <text
              x={chartXOffset + chartWidth + 16}
              y={toChartY(0) + 12}
              fontSize="9"
              fill={colors.neutral[500]}
              fontWeight="bold"
              textAnchor="middle"
            >
              v
            </text>

            {/* 位移 y 轴 */}
            <line
              x1={chartXOffset}
              y1={chartYOffset + chartHeight}
              x2={chartXOffset}
              y2={chartYOffset - 5}
              stroke={colors.neutral[400]}
              strokeWidth="1.2"
            />
            <polygon
              points={`${chartXOffset - 3.5},${chartYOffset - 5} ${chartXOffset},${chartYOffset - 11} ${chartXOffset + 3.5},${chartYOffset - 5}`}
              fill={colors.neutral[400]}
            />
            <text
              x={chartXOffset - 8}
              y={chartYOffset - 4}
              fontSize="9"
              fill={colors.neutral[500]}
              fontWeight="bold"
            >
              y
            </text>

            {/* 0 刻度 */}
            <text
              x={chartXOffset - 8}
              y={toChartY(0) + 3}
              fontSize="9"
              fill={colors.neutral[400]}
            >
              0
            </text>

            {/* 极板上限 +d/2 和下限 -d/2 虚线标记 */}
            <line
              x1={chartXOffset}
              y1={toChartY(d_phys / 2)}
              x2={chartXOffset + chartWidth}
              y2={toChartY(d_phys / 2)}
              stroke={colors.neutral[300]}
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <line
              x1={chartXOffset}
              y1={toChartY(-d_phys / 2)}
              x2={chartXOffset + chartWidth}
              y2={toChartY(-d_phys / 2)}
              stroke={colors.neutral[300]}
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <text
              x={chartXOffset + chartWidth + 4}
              y={toChartY(d_phys / 2) + 3}
              fontSize="8"
              fill={colors.neutral[400]}
            >
              +d/2
            </text>
            <text
              x={chartXOffset + chartWidth + 4}
              y={toChartY(-d_phys / 2) + 3}
              fontSize="8"
              fill={colors.neutral[400]}
            >
              -d/2
            </text>

            {/* 理论曲线路径 */}
            <path
              d={chartCurvePath}
              fill="none"
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* 速度过滤器中线标识 (v_filter 处位移为 0) */}
            {chartData.vFilter > 1.0 && chartData.vFilter < 25.0 && (
              <g>
                <circle
                  cx={toChartX(chartData.vFilter)}
                  cy={toChartY(0)}
                  r="3.5"
                  fill={PHYSICS_COLORS.magneticField}
                />
                <line
                  x1={toChartX(chartData.vFilter)}
                  y1={chartYOffset}
                  x2={toChartX(chartData.vFilter)}
                  y2={chartYOffset + chartHeight}
                  stroke={PHYSICS_COLORS.magneticField}
                  strokeWidth="1"
                  strokeDasharray="2,2"
                  opacity="0.5"
                />
                <text
                  x={toChartX(chartData.vFilter)}
                  y={chartYOffset + chartHeight - 4}
                  fontSize="8"
                  fill={PHYSICS_COLORS.magneticField}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  v_滤 = {(chartData.vFilter).toFixed(1)}
                </text>
              </g>
            )}

            {/* 当前速度指示红点 */}
            {v0_param >= 1.0 && v0_param <= 25.0 && (
              <circle
                cx={toChartX(v0_param)}
                cy={toChartY(chartData.currentY)}
                r="4.5"
                fill={colors.danger[500]}
                stroke="#fff"
                strokeWidth="1.5"
                filter={`url(#glow-${gradId})`}
              />
            )}
          </g>
        )}
      </svg>

      {/* 顶层透明 Canvas —— 高频粒子和轨迹残影渲染 */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />
    </div>
  )
}
