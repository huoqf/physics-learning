import { useCallback, useMemo } from 'react'
import { useCanvasSize, useViewport } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { VectorArrow, PhysicsGround } from '@/components/Physics'
import { computeAngularFrequency, computePendulumState } from '@/physics/oscillation'
import type { SceneScale } from '@/scene'

// ─── 物理与设计常量 ──────────────────────────────────────────────────────
const DESIGN = { width: 700, height: 650 } as const

export default function SimplePendulumAnimation() {
  const { params, isPlaying, time, speed, showVectors, showFormulas } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      time: s.time,
      speed: s.speed,
      showVectors: s.showVectors,
      showFormulas: s.showFormulas,
    })),
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
  const { width, height, font } = canvasSize
  const vp = useViewport(canvasSize, {
    designWidth: DESIGN.width,
    designHeight: DESIGN.height,
  })

  // 摆长 L，重力加速度 g，最大摆角 theta0，初相 phiDeg
  const L = params.L ?? 1.0
  const g = params.g ?? 9.8
  const theta0Deg = params.theta0 ?? 8 // 限制在 2~10° 之间以满足小角简谐运动
  const phiDeg = params.phiDeg ?? 0
  const phi = (phiDeg * Math.PI) / 180
  const showGraph = params.showGraph ?? 1
  const showHelper = params.showHelper ?? 1

  const mass = 1.0 // 摆球质量，设定为 1.0 kg 用于受力展示

  // 周期 T 由物理公式物理决定
  const T = useMemo(() => 2 * Math.PI * Math.sqrt(L / g), [L, g])
  const omega = computeAngularFrequency(T)
  const phase = omega * time + phi

  // 使用物理纯函数计算单摆当前的精确运动状态与受力
  const state = useMemo(() => {
    return computePendulumState(mass, L, g, theta0Deg, phase)
  }, [mass, L, g, theta0Deg, phase])

  // ── 动画时钟：以 store.time 为规范时钟 ──
  const handleFrame = useCallback((deltaMs: number) => {
    const dt = deltaMs / 1000
    if (dt <= 0 || dt > 0.1) return
    const store = useAnimationStore.getState()
    store.setTime(store.time + dt * store.direction)
  }, [])
  useAnimationFrame(handleFrame, { playing: isPlaying, speed })

  // ── 矢量渲染助手 ──
  const renderVector = (
    startX: number,
    startY: number,
    vx: number,
    vy: number,
    length: number,
    color: string,
    type: 'displacement' | 'velocity' | 'acceleration' | 'force',
    label?: string,
  ) => {
    if ((vx === 0 && vy === 0) || length <= 1) return null
    const sceneScale: SceneScale = {
      scaleX: 1,
      scaleY: 1,
      scale: 1,
      originX: startX,
      originY: startY,
      maxVectorLength: length,
      refMagnitudes: {},
    }
    const mag = Math.sqrt(vx * vx + vy * vy)
    const dx = vx / mag
    const dy = vy / mag

    return (
      <VectorArrow
        origin={{ x: 0, y: 0 }}
        vector={{ x: dx, y: dy }}
        type={type === 'force' ? 'force' : type}
        sceneScale={sceneScale}
        color={color}
        pixelLength={length}
        font={font}
        label={label}
        glow
      />
    )
  }

  // ── 像素空间坐标计算 ──
  const sceneX0 = vp.visibleX + vp.visibleW * 0.05
  const sceneX1 = vp.visibleX + vp.visibleW * 0.56
  const sceneW = sceneX1 - sceneX0

  const pivotX = sceneX0 + sceneW * 0.46
  const pivotY = vp.visibleY + 50

  // 摆线长度的像素比例（设 1 米 = 160 像素）
  const linePixelLength = 160
  const rPx = L * linePixelLength

  // 摆球当前位置
  const ballX = pivotX + rPx * Math.sin(state.angle)
  const ballY = pivotY + rPx * Math.cos(state.angle)

  // ── 滚动传送带 x-t 描迹（沙摆实验） ──
  const graphY = pivotY + linePixelLength * 2.0 + 20 // 确保不遮挡最大摆长的球
  const graphH = vp.visibleH * 0.44
  const graphW = sceneW
  const graphX = sceneX0
  const vy = 100 // 传送带向下滚动速度 (px/s)

  const pendulumWavePath = useMemo(() => {
    if (!showGraph) return ''
    const points: string[] = []
    const step = 4
    const theta0Rad = (theta0Deg * Math.PI) / 180
    for (let py = graphY; py <= graphY + graphH; py += step) {
      const dy = py - graphY
      const tBack = time - dy / vy
      const phaseBack = omega * tBack + phi
      const angleBack = theta0Rad * Math.cos(phaseBack)
      const xBack = pivotX + rPx * Math.sin(angleBack)
      if (py === graphY) {
        points.push(`M ${xBack.toFixed(1)} ${py.toFixed(1)}`)
      } else {
        points.push(`L ${xBack.toFixed(1)} ${py.toFixed(1)}`)
      }
    }
    return points.join(' ')
  }, [showGraph, time, theta0Deg, omega, phi, pivotX, rPx, graphY, graphH])

  // ── 匀速圆周运动投影对比（参考圆） ──
  const rcCx = vp.visibleX + vp.visibleW * 0.8
  const rcCy = showGraph ? pivotY + rPx / 2 : vp.visibleY + vp.visibleH * 0.3
  // 简谐运动的水平最大振幅
  const theta0Rad = (theta0Deg * Math.PI) / 180
  const rcR = rPx * Math.sin(theta0Rad)
  const pointX = rcCx + rcR * Math.cos(phase)
  const pointY = rcCy - rcR * Math.sin(phase)

  // ── 力的合成矢量分析参数 ──
  const forceScale = 15 // 像素/牛顿 (用于摆球受力分析箭头的归一化)

  const tensionDx = pivotX - ballX
  const tensionDy = pivotY - ballY
  const tensionMag = Math.sqrt(tensionDx * tensionDx + tensionDy * tensionDy)

  // 切向回复力方向矢量 (垂直于悬挂绳，偏向平衡最低点)
  const tangentDx = -Math.cos(state.angle) * Math.sign(state.angle)
  const tangentDy = Math.sin(state.angle) * Math.sign(state.angle)

  const smallFs = font(11)
  const normFs = font(13)

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg width={width} height={height} className="bg-slate-50 rounded-lg shadow-inner">
        {/* 精致光影定义 */}
        <defs>
          <radialGradient id="ballGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </radialGradient>
        </defs>

        {/* ── 滚动传送带（沙摆模拟） ── */}
        {showGraph === 1 && (
          <g>
            <rect x={graphX} y={graphY} width={graphW} height={graphH} rx={12} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={2} />
            <line
              x1={graphX + 8}
              y1={graphY + 6}
              x2={graphX + 8}
              y2={graphY + graphH - 6}
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6 6"
              strokeDashoffset={-vy * time}
            />
            <line
              x1={graphX + graphW - 8}
              y1={graphY + 6}
              x2={graphX + graphW - 8}
              y2={graphY + graphH - 6}
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6 6"
              strokeDashoffset={-vy * time}
            />
            {/* 履带滚动横向纹理 */}
            {Array.from({ length: 8 }).map((_, i) => {
              const ly = graphY + ((vy * time + i * (graphH / 8)) % graphH)
              return (
                <line
                  key={i}
                  x1={graphX + 12}
                  y1={ly}
                  x2={graphX + graphW - 12}
                  y2={ly}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  opacity={0.5}
                />
              )
            })}
            {/* 滚轴 */}
            <circle cx={graphX + 22} cy={graphY + graphH / 2} r={12} fill="#94a3b8" />
            <line
              x1={graphX + 22 - 12}
              y1={graphY + graphH / 2}
              x2={graphX + 22 + 12}
              y2={graphY + graphH / 2}
              stroke="#f1f5f9"
              strokeWidth={2}
              transform={`rotate(${(vy * time * 2) % 360}, ${graphX + 22}, ${graphY + graphH / 2})`}
            />
            <circle cx={graphX + graphW - 22} cy={graphY + graphH / 2} r={12} fill="#94a3b8" />
            <line
              x1={graphX + graphW - 22 - 12}
              y1={graphY + graphH / 2}
              x2={graphX + graphW - 22 + 12}
              y2={graphY + graphH / 2}
              stroke="#f1f5f9"
              strokeWidth={2}
              transform={`rotate(${(vy * time * 2) % 360}, ${graphX + graphW - 22}, ${graphY + graphH / 2})`}
            />
            
            {/* 余弦曲线 */}
            <path d={pendulumWavePath} fill="none" stroke="#8b5cf6" strokeWidth={3.5} strokeLinecap="round" opacity={0.8} />

            {/* 相切虚线与投影小圆点 */}
            <line
              x1={ballX}
              y1={ballY}
              x2={ballX}
              y2={graphY}
              stroke="#a78bfa"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <circle cx={ballX} cy={graphY} r={4.5} fill="#7c3aed" />
          </g>
        )}

        {/* ── 单摆实物绘制 ── */}
        {/* 悬挂天花板 */}
        <PhysicsGround x={pivotX - 40} y={pivotY - 6} width={80} type="platform" appearance={{ thickness: 6 }} />
        {/* 悬挂销轴 */}
        <circle cx={pivotX} cy={pivotY} r={5} fill="#334155" stroke="#475569" strokeWidth={1} />

        {/* 摆球偏角辅助虚线 */}
        <line x1={pivotX} y1={pivotY} x2={pivotX} y2={pivotY + rPx} stroke={colors.neutral[300]} strokeWidth={1.2} strokeDasharray="4 4" />
        
        {/* 摆线 */}
        <line x1={pivotX} y1={pivotY} x2={ballX} y2={ballY} stroke="#475569" strokeWidth={2.2} />

        {/* 精致金属渐变摆球 */}
        <circle cx={ballX} cy={ballY} r={18} fill="url(#ballGradient)" stroke="#334155" strokeWidth={1.5} className="shadow-lg" />

        {/* 摆角数值和摆线文字 */}
        <text x={ballX} y={ballY - 24} fontSize={normFs} fontWeight="bold" fill="#334155" fontFamily={CANVAS_STYLE.FONT.family} textAnchor="middle">
          θ = {(state.angle * 180 / Math.PI).toFixed(1)}°
        </text>

        {/* ── 力的动态矢量分析 ── */}
        {showVectors && (
          <g>
            {/* 1. 重力 G（竖直向下，黄棕色） */}
            {renderVector(
              ballX,
              ballY,
              0,
              1,
              state.gravity * forceScale,
              PHYSICS_COLORS.gravity,
              'force',
              `G = ${state.gravity.toFixed(1)}N`,
            )}
            {/* 2. 绳子拉力 F_T（沿摆线斜向上，蓝色） */}
            {renderVector(
              ballX,
              ballY,
              tensionDx / tensionMag,
              tensionDy / tensionMag,
              state.tension * forceScale,
              '#3b82f6',
              'force',
              `F_拉 = ${state.tension.toFixed(1)}N`,
            )}
            {/* 3. 切向回复力 F_回（垂直摆线指向最低点，红色） */}
            {renderVector(
              ballX,
              ballY,
              tangentDx,
              tangentDy,
              Math.abs(state.restoringForce) * forceScale,
              '#ef4444',
              'force',
              `F_回 = ${Math.abs(state.restoringForce).toFixed(1)}N`,
            )}
          </g>
        )}

        {/* ── 匀速圆周运动投影对比（参考圆） ── */}
        {showHelper === 1 && (
          <g>
            <text x={rcCx} y={rcCy - rcR - 14} fontSize={smallFs} fill={colors.neutral[600]} fontFamily={CANVAS_STYLE.FONT.family} textAnchor="middle">
              参考圆（圆周运动直径投影）
            </text>
            <circle cx={rcCx} cy={rcCy} r={rcR} fill="none" stroke={colors.neutral[300]} strokeWidth={1.5} />
            <line x1={rcCx - rcR} y1={rcCy} x2={rcCx + rcR} y2={rcCy} stroke={colors.neutral[300]} strokeWidth={1} />
            
            {/* 旋转半径 */}
            <line x1={rcCx} y1={rcCy} x2={pointX} y2={pointY} stroke={colors.neutral[500]} strokeWidth={1.5} />
            <circle cx={pointX} cy={pointY} r={5} fill={PHYSICS_COLORS.velocity} />
            
            {/* 投影线与直径投影点 */}
            <line x1={pointX} y1={pointY} x2={pointX} y2={rcCy} stroke={colors.neutral[400]} strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={pointX} cy={rcCy} r={5} fill={PHYSICS_COLORS.displacement} />
            <line x1={rcCx} y1={rcCy} x2={pointX} y2={rcCy} stroke={PHYSICS_COLORS.displacement} strokeWidth={2.5} />
            
            {/* 同步投影对比虚线（将参考圆上的投影点与摆球的水平位置相连，证明二者在水平面上完全同步简谐运动） */}
            <line
              x1={pointX - rcCx + pivotX}
              y1={rcCy}
              x2={ballX}
              y2={ballY}
              stroke="#10b981"
              strokeWidth={1.2}
              strokeDasharray="5 5"
            />
          </g>
        )}

        {/* 三矢量矢量图例 */}
        <g fontFamily={CANVAS_STYLE.FONT.family} fontSize={smallFs} transform={`translate(0, 0)`}>
          <rect x={sceneX0} y={vp.visibleY + 10} width={260} height={26} rx={4} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1} />
          <circle cx={sceneX0 + 12} cy={vp.visibleY + 23} r={4.5} fill={PHYSICS_COLORS.displacement} />
          <text x={sceneX0 + 22} y={vp.visibleY + 27} fill={colors.neutral[600]}>
            水平位移 x
          </text>
          <circle cx={sceneX0 + 96} cy={vp.visibleY + 23} r={4.5} fill={PHYSICS_COLORS.velocity} />
          <text x={sceneX0 + 106} y={vp.visibleY + 27} fill={colors.neutral[600]}>
            速度 v
          </text>
          <circle cx={sceneX0 + 176} cy={vp.visibleY + 23} r={4.5} fill={PHYSICS_COLORS.acceleration} />
          <text x={sceneX0 + 186} y={vp.visibleY + 27} fill={colors.neutral[600]}>
            加速度/回复力
          </text>
        </g>

        {/* 动态公式看板 */}
        {showFormulas && (
          <text
            x={sceneX0}
            y={vp.visibleY + vp.visibleH - 12}
            fontSize={font(12)}
            fill={colors.neutral[500]}
            fontFamily={CANVAS_STYLE.FONT.family}
          >
            运动方程: θ = θ₀·cos(ωt + φ) | 周期: T = 2π√(L/g) = {T.toFixed(2)}s | ω = {omega.toFixed(2)} rad/s
          </text>
        )}
      </svg>
    </div>
  )
}
