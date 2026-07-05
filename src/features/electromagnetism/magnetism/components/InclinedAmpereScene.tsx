import React, { useMemo } from 'react'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'
import { Rails } from '@/components/Physics/Rails'
import { ConductingRod } from '@/components/Physics/ConductingRod'
import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import type { SceneScale } from '@/scene'

type Point = { x: number; y: number }

const VIEW_W = 600
const VIEW_H = 300
const EFFECTIVE_L = 4.0

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const normalize = (v: Point): Point => {
  const len = Math.hypot(v.x, v.y)
  if (len < 1e-6) return { x: 1, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

const pointOnRail = (layout: ReturnType<typeof getInclinedLayout>, k: number, frontRatio = 0): Point => ({
  x: layout.rail1StartX + layout.railDx * k + layout.dx * frontRatio,
  y: layout.rail1StartY + layout.railDy * k + layout.dy * frontRatio,
})

const getDisplaySlopeAngleDeg = (theta: number) => {
  // 透视主视图对真实倾角做压缩：默认 θ=30° 基本保持旧版观感，
  // 但导轨、垂直斜面磁场、滑动箭头会使用同一屏幕倾角，避免几何不一致。
  return clamp(theta * 0.55 + 2, 8, 25)
}

const getInclinedLayout = (L: number, theta: number) => {
  const scaleL = 0.5 + L * 0.125
  const dx = 60 * scaleL
  const dy = 40 * scaleL
  const displayAngleRad = (getDisplaySlopeAngleDeg(theta) * Math.PI) / 180
  const railDx = 420
  const railDy = -railDx * Math.tan(displayAngleRad)

  return {
    rail1StartX: 65,
    rail1StartY: 230,
    rail1EndX: 65 + railDx,
    rail1EndY: 230 + railDy,
    railDx,
    railDy,
    dx,
    dy,
  }
}

const describeAmpereForce = (physicsResult: AdvancedAmperePhysicsResult, bFieldDir: number) => {
  if (Math.abs(physicsResult.F_ampere) < 1e-4) return 'F_安 = 0'
  if (bFieldDir === 0) return physicsResult.F_ampere > 0 ? 'F_安 水平向右' : 'F_安 水平向左'
  if (bFieldDir === 1) return physicsResult.F_ampere > 0 ? 'F_安 沿斜面向上' : 'F_安 沿斜面向下'
  return physicsResult.F_ampere > 0 ? 'F_安 竖直向上' : 'F_安 竖直向下'
}

interface InclinedAmpereSceneProps {
  x: number
  y: number
  w: number
  h: number
  physicsResult: AdvancedAmperePhysicsResult
  I: number
  B: number
  theta: number
  mu: number
  bFieldDir?: number
  showVectors?: boolean
  font?: (size: number) => number
}

export const InclinedAmpereScene: React.FC<InclinedAmpereSceneProps> = ({
  x,
  y,
  w,
  h,
  physicsResult,
  I,
  B,
  theta,
  mu,
  bFieldDir = 0,
  showVectors = false,
  font = (s) => s,
}) => {
  const scaleX = w / VIEW_W
  const scaleY = h / VIEW_H
  const scale = Math.min(scaleX, scaleY)

  const layout = useMemo(() => getInclinedLayout(EFFECTIVE_L, theta), [theta])
  const slopeUnit = useMemo(() => normalize({ x: layout.railDx, y: layout.railDy }), [layout.railDx, layout.railDy])
  const normalUnit = useMemo(() => normalize({ x: slopeUnit.y, y: -slopeUnit.x }), [slopeUnit])

  const a = physicsResult.a
  const hasLimit = physicsResult.isLimited
  const hasField = Math.abs(B) > 1e-4

  // 1. 物理阻尼碰壁弹性抖动计算
  const tLimit = useMemo(() => {
    if (Math.abs(a) <= 0.05) return 0
    return Math.sqrt(2.2 / Math.abs(a))
  }, [a])


  // 为了获取稳定变化的抖动，我们直接利用 physicsResult.isLimited 时 time 的溢出
  // 由于 React 外部有全局的 time (useAnimationStore)，我们直接依据 physicsResult 里的 x 来判定
  // 这里计算导体棒在轨道上的比例 (0-1)，加入阻尼碰壁抖动
  const rodRatio = useMemo(() => {
    const xMin = -1.1
    const xMax = 1.1
    let baseRatio = clamp((physicsResult.x - xMin) / (xMax - xMin), 0, 1)
    
    // 如果碰壁，根据速度计算阻尼回弹
    if (hasLimit && Math.abs(a) > 0.05) {
      // 溢出时间 dt 用全局 time 减去碰壁时刻
      // 由于我们外部有 time 传入，直接取 dt = Math.max(0, physicsResult.x === xMax ? 0.1 : 0.1) 
      // 我们可以让回弹的 dt 直接与 time 挂钩，通过 time 相对 tLimit 取模或计算
      // 我们可以从 solveAdvancedAmpere 得到 tLimit
      const vImpact = Math.abs(a) * tLimit
      const A = Math.min(0.04, vImpact * 0.008)
      // 使用模 1.5 周期以让动画在循环播放时碰壁产生连续的轻微弹性响应
      const checkT = Math.max(0, Math.sin(physicsResult.x * 10) * 0.5) 
      const bounce = A * Math.exp(-4.0 * checkT) * Math.cos(15.0 * checkT)
      
      if (a > 0) {
        baseRatio = 1.0 - Math.abs(bounce)
      } else {
        baseRatio = 0.0 + Math.abs(bounce)
      }
    }
    return baseRatio
  }, [physicsResult.x, hasLimit, a, tLimit])

  const bPositiveUnit = useMemo<Point>(() => {
    if (bFieldDir === 0) return { x: 0, y: -1 }
    if (bFieldDir === 1) return normalUnit
    return { x: 1, y: 0 }
  }, [bFieldDir, normalUnit])

  // 2. 磁感线穿过点分布计算：条数与 |B| 联动，废除大罩子
  const bFieldLines = useMemo(() => {
    if (!hasField) return []
    const lines = []
    const count = Math.max(2, Math.min(6, Math.floor(Math.abs(B) * 2.2) + 1))
    for (let i = 0; i < count; i++) {
      const kRail = count === 1 ? 0.5 : 0.2 + (0.6 * i) / (count - 1)
      const kFront = i % 2 === 0 ? 0.35 : 0.65
      const pBase = pointOnRail(layout, kRail, kFront)
      lines.push(pBase)
    }
    return lines
  }, [B, hasField, layout])

  const rodBack = pointOnRail(layout, rodRatio, 0)
  const rodFront = pointOnRail(layout, rodRatio, 1)

  const ampereDirection = useMemo<Point | null>(() => {
    const sign = Math.sign(physicsResult.F_ampere)
    if (sign === 0) return null
    if (bFieldDir === 0) return { x: sign, y: 0 }
    if (bFieldDir === 1) return { x: slopeUnit.x * sign, y: slopeUnit.y * sign }
    return { x: 0, y: -sign }
  }, [bFieldDir, physicsResult.F_ampere, slopeUnit])

  const ampereArrowLength = clamp(22 + Math.sqrt(Math.abs(physicsResult.F_ampere)) * 10, 24, 58)
  const motionSign = Math.sign(physicsResult.a)

  // 3. 构建 VectorArrow 的三维局部坐标系
  const localScale = useMemo<SceneScale>(() => {
    const cx = (rodBack.x + rodFront.x) / 2
    const cy = (rodBack.y + rodFront.y) / 2
    return {
      originX: cx,
      originY: cy,
      scaleX: 1,
      scaleY: 1,
      scale: 1,
      maxVectorLength: 60,
      refMagnitudes: { force: 2.0 },
    }
  }, [rodBack.x, rodBack.y, rodFront.x, rodFront.y])

  // 各力物理长度比例映射
  const gravityVal = 0.5 * 9.8
  const G_len = 45
  const N_len = clamp((physicsResult.N / gravityVal) * 45, 18, 65)
  const f_len = clamp((Math.abs(physicsResult.f) / gravityVal) * 45, 15, 60)
  const f_sign = Math.sign(physicsResult.f)
  const Fnet_len = clamp((Math.abs(physicsResult.R_parallel + physicsResult.f) / gravityVal) * 45, 20, 65)

  // 轨道各顶点坐标点，用于画 3D 实体斜劈
  const { rail1StartX: r1sx, rail1StartY: r1sy, railDx, railDy, dx, dy } = layout
  const r1ex = r1sx + railDx
  const r1ey = r1sy + railDy
  const groundY = 280

  return (
    <g transform={`translate(${x}, ${y})`}>
      <defs>
        {/* 斜面高质感淡蓝白渐变 */}
        <linearGradient id="incline-slope-grad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f0f9ff" />
        </linearGradient>
        {/* 前立面遮罩（轻量半透明） */}
        <linearGradient id="incline-front-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.45" />
        </linearGradient>
        {/* 右立面（轻量半透明阴影） */}
        <linearGradient id="incline-right-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* 3D 场景背景卡片底板 */}
      <rect x="0" y="0" width={w} height={h} fill="none" stroke="none" />
      <text
        x="20"
        y="25"
        fontSize={font(9)}
        fill={PHYSICS_COLORS.labelText}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        3D 场景展示 (斜坡)
      </text>

      {/* 安培力方向文字提示框 - 固定在左上角标题旁，避免遮挡重力 G 箭头 */}
      {Math.abs(physicsResult.F_ampere) > 1e-4 && (
        <g
          transform={`translate(145, 11)`}
          style={{ userSelect: 'none' }}
        >
          <rect
            x="0"
            y="0"
            width="110"
            height="18"
            rx="4"
            fill={withAlpha(PHYSICS_COLORS.lorentzForce, 0.08)}
            stroke={withAlpha(PHYSICS_COLORS.lorentzForce, 0.35)}
            strokeWidth="0.8"
          />
          <text
            x="55"
            y="10.5"
            fontSize={font(6.5)}
            fill={PHYSICS_COLORS.lorentzForce}
            fontWeight="extrabold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {describeAmpereForce(physicsResult, bFieldDir)}
          </text>
        </g>
      )}

      {/* 3D 物理核心场景（比例完美适配 700x325） */}
      <g transform={`scale(${scale})`}>
        {/* 3D 实体斜劈底座（三棱柱结构），在导轨下层绘制 */}
        <g>
          {/* 斜坡表面 */}
          <polygon
            points={`${r1sx},${r1sy} ${r1ex},${r1ey} ${r1ex + dx},${r1ey + dy} ${r1sx + dx},${r1sy + dy}`}
            fill="url(#incline-slope-grad)"
            stroke="#ced4da"
            strokeWidth="0.6"
          />
          {/* 前侧立面 */}
          <polygon
            points={`${r1sx + dx},${r1sy + dy} ${r1ex + dx},${r1ey + dy} ${r1ex + dx},${groundY} ${r1sx + dx},${groundY}`}
            fill="url(#incline-front-grad)"
            stroke="#adb5bd"
            strokeWidth="0.5"
          />
          {/* 右侧立面 */}
          <polygon
            points={`${r1ex},${r1ey} ${r1ex + dx},${r1ey + dy} ${r1ex + dx},${groundY} ${r1ex},${groundY}`}
            fill="url(#incline-right-grad)"
            stroke="#adb5bd"
            strokeWidth="0.5"
          />
        </g>

        {/* 3D 导轨架 */}
        <Rails type="inclined" theta={theta} width={VIEW_W} height={VIEW_H} L={EFFECTIVE_L} />

        {/* 匀强磁感线立体矢量丛 (废除绿色玻璃盒子) */}
        {hasField && (
          <g>
            {bFieldLines.map((line, idx) => {
              const isBPositive = B > 0
              const dir = normalize({
                x: bPositiveUnit.x * (isBPositive ? 1 : -1),
                y: bPositiveUnit.y * (isBPositive ? 1 : -1),
              })
              const lineStart = { x: line.x - dir.x * 25, y: line.y - dir.y * 25 }
              const lineEnd = { x: line.x + dir.x * 45, y: line.y + dir.y * 45 }
              const angleDeg = (Math.atan2(lineEnd.y - lineStart.y, lineEnd.x - lineStart.x) * 180) / Math.PI

              return (
                <g key={idx}>
                  {/* 1. 白色半透明发光底衬线（100% 剥离底座底色干扰） */}
                  <line
                    x1={lineStart.x}
                    y1={lineStart.y}
                    x2={lineEnd.x - dir.x * 5}
                    y2={lineEnd.y - dir.y * 5}
                    stroke="white"
                    strokeWidth="3.2"
                    opacity="0.85"
                  />
                  {/* 2. 磁感线主体（变实线、加粗至 1.8） */}
                  <line
                    x1={lineStart.x}
                    y1={lineStart.y}
                    x2={lineEnd.x - dir.x * 5}
                    y2={lineEnd.y - dir.y * 5}
                    stroke={PHYSICS_COLORS.magneticFieldLine}
                    strokeWidth="1.8"
                    opacity="1"
                  />
                  {/* 3. 磁感线箭头白色底衬 */}
                  <g transform={`translate(${lineEnd.x}, ${lineEnd.y}) rotate(${angleDeg})`}>
                    <polygon points="0,0 -7,-3 -7,3" fill="white" opacity="0.85" />
                    <polygon points="0,0 -7,-3 -7,3" fill={PHYSICS_COLORS.magneticField} opacity="1" />
                  </g>
                  {/* 4. 只在中间那根磁感线旁加 B 标号，且带有白边发光投影 */}
                  {idx === Math.floor(bFieldLines.length / 2) && (
                    <g>
                      <text
                        x={lineEnd.x + dir.x * 12}
                        y={lineEnd.y + dir.y * 12 + 1}
                        fontSize={font(8.5) / scale}
                        fill="white"
                        fontWeight="extrabold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinejoin="round"
                        opacity="0.9"
                      >
                        B
                      </text>
                      <text
                        x={lineEnd.x + dir.x * 12}
                        y={lineEnd.y + dir.y * 12 + 1}
                        fontSize={font(8.5) / scale}
                        fill={PHYSICS_COLORS.magneticField}
                        fontWeight="extrabold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ userSelect: 'none' }}
                      >
                        B
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </g>
        )}

        {/* 3D 导体棒 */}
        <ConductingRod
          type="inclined"
          x={rodRatio}
          theta={theta}
          currentDir={I > 0 ? 'in' : I < 0 ? 'out' : 'none'}
          L={EFFECTIVE_L}
          width={VIEW_W}
          height={VIEW_H}
        />

        {/* 经典红色电流矢量 I（绘制在棒中心正上方 15px 处） */}
        {Math.abs(I) > 1e-4 && (
          <VectorArrow
            origin={{ x: 0, y: 15 }}
            vector={I > 0 ? { x: -dx * 0.65, y: dy * 0.65 } : { x: dx * 0.65, y: -dy * 0.65 }}
            type="currentDirection"
            sceneScale={localScale}
            strokeWidth={2.2}
            label="I"
            font={font}
            glow
          />
        )}

        {/* 运动风线微特效 (加速运动中且未碰壁) */}
        {Math.abs(physicsResult.a) > 0.05 && !hasLimit && (
          <g opacity="0.3">
            <line
              x1={rodBack.x}
              y1={rodBack.y}
              x2={rodBack.x - slopeUnit.x * motionSign * 18}
              y2={rodBack.y - slopeUnit.y * motionSign * 18}
              stroke="#3B82F6"
              strokeWidth="0.9"
              strokeDasharray="2,3"
            />
            <line
              x1={rodFront.x}
              y1={rodFront.y}
              x2={rodFront.x - slopeUnit.x * motionSign * 18}
              y2={rodFront.y - slopeUnit.y * motionSign * 18}
              stroke="#3B82F6"
              strokeWidth="0.9"
              strokeDasharray="2,3"
            />
          </g>
        )}

        {/* 碰壁圆形波纹微特效 */}
        {hasLimit && Math.abs(a) > 0.05 && (
          <g>
            {/* 这里的 wave 动画由简易 React 内置正弦定时跳跃驱动，由于是 SVG 卡片，可以用简单的定时或比例 */}
            <circle
              cx={a > 0 ? r1ex : r1sx}
              cy={a > 0 ? r1ey : r1sy}
              r={12}
              fill="none"
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth="0.8"
              opacity={0.35}
              style={{ transformOrigin: `${a > 0 ? r1ex : r1sx}px ${a > 0 ? r1ey : r1sy}px`, transform: 'scale(1.3)' }}
            />
            <circle
              cx={a > 0 ? r1ex + dx : r1sx + dx}
              cy={a > 0 ? r1ey + dy : r1sy + dy}
              r={12}
              fill="none"
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth="0.8"
              opacity={0.35}
              style={{ transformOrigin: `${a > 0 ? r1ex + dx : r1sx + dx}px ${a > 0 ? r1ey + dy : r1sy + dy}px`, transform: 'scale(1.3)' }}
            />
          </g>
        )}

        {/* 3D 矢量受力显示联动 (使用 VectorArrow 且 Y 轴取反) */}
        {/* 安培力 F_安 (默认显示，洛伦兹紫) */}
        {ampereDirection && (
          <VectorArrow
            origin={{ x: 0, y: 0 }}
            vector={{ x: ampereDirection.x * ampereArrowLength, y: -ampereDirection.y * ampereArrowLength }}
            type="lorentzForce"
            sceneScale={localScale}
            strokeWidth={2.3}
            label="F_安"
            font={font}
            glow
          />
        )}

        {/* 重力 G (显示矢量时，深绿色) */}
        {showVectors && (
          <VectorArrow
            origin={{ x: 0, y: 0 }}
            vector={{ x: 0, y: -G_len }}
            type="gravity"
            sceneScale={localScale}
            strokeWidth={1.8}
            label="G"
            font={font}
          />
        )}

        {/* 支持力 N (显示矢量时，天蓝色) */}
        {showVectors && (
          <VectorArrow
            origin={{ x: 0, y: 0 }}
            vector={{ x: normalUnit.x * N_len, y: -normalUnit.y * N_len }}
            type="normalForce"
            sceneScale={localScale}
            strokeWidth={1.8}
            label="N"
            font={font}
          />
        )}

        {/* 摩擦力 f (显示矢量时，黄褐色) */}
        {showVectors && Math.abs(physicsResult.f) > 1e-4 && (
          <VectorArrow
            origin={{ x: 0, y: 0 }}
            vector={{ x: slopeUnit.x * f_sign * f_len, y: -slopeUnit.y * f_sign * f_len }}
            type="friction"
            sceneScale={localScale}
            strokeWidth={1.8}
            label={Math.abs(physicsResult.f) >= 0.98 * (mu * physicsResult.N) ? 'f (临界)' : 'f'}
            color={Math.abs(physicsResult.f) >= 0.98 * (mu * physicsResult.N) ? '#D97706' : undefined}
            glow={Math.abs(physicsResult.f) >= 0.98 * (mu * physicsResult.N)}
            font={font}
          />
        )}

        {/* 合力 F_合 (显示矢量时且运动加速，动力亮橙) */}
        {showVectors && Math.abs(physicsResult.a) > 0.05 && (
          <VectorArrow
            origin={{ x: 0, y: -8 }}
            vector={{ x: slopeUnit.x * motionSign * Fnet_len, y: -slopeUnit.y * motionSign * Fnet_len }}
            type="force"
            sceneScale={localScale}
            strokeWidth={2.4}
            label="F_合"
            font={font}
            glow
          />
        )}

        {/* 速度 v (显示矢量时且运动，经典蓝) */}
        {showVectors && Math.abs(physicsResult.a) > 0.05 && !hasLimit && (
          <VectorArrow
            origin={{ x: 0, y: -20 }}
            vector={{ x: slopeUnit.x * motionSign * 35, y: -slopeUnit.y * motionSign * 35 }}
            type="velocity"
            sceneScale={localScale}
            strokeWidth={1.8}
            label="v"
            font={font}
          />
        )}

        {/* 平衡状态下的滑动趋势 (显示矢量时，半透明淡橘色虚线) */}
        {showVectors && physicsResult.state === 'equilibrium' && Math.abs(physicsResult.R_parallel) > 0.02 && (
          <VectorArrow
            origin={{ x: 0, y: 0 }}
            vector={{
              x: slopeUnit.x * Math.sign(physicsResult.R_parallel) * 35,
              y: -slopeUnit.y * Math.sign(physicsResult.R_parallel) * 35,
            }}
            type="tension"
            color="#EA580C"
            sceneScale={localScale}
            strokeWidth={1.6}
            dashed
            label="滑动趋势"
            font={font}
          />
        )}
      </g>

      {/* 平衡/滑动提示标语（摆放在左下角，避开 3D 斜面） */}
      <g transform="translate(20, 290)">
        {physicsResult.state === 'equilibrium' ? (
          <g>
            <rect
              x="0"
              y="0"
              width="102"
              height="15"
              fill={withAlpha(PHYSICS_COLORS.forceNet, 0.12)}
              stroke={withAlpha(PHYSICS_COLORS.forceNet, 0.35)}
              strokeWidth="0.8"
              rx="4"
            />
            <text
              x="51"
              y="10.5"
              fontSize={font(7.2)}
              fill={PHYSICS_COLORS.forceNet}
              fontWeight="bold"
              textAnchor="middle"
              style={{ userSelect: 'none' }}
            >
              ✓ 导体棒静止平衡
            </text>
          </g>
        ) : (
          <g>
            <rect
              x="0"
              y="0"
              width="112"
              height="15"
              fill={withAlpha(PHYSICS_COLORS.forceArrowRed, 0.08)}
              stroke={withAlpha(PHYSICS_COLORS.forceArrowRed, 0.3)}
              strokeWidth="0.8"
              rx="4"
            />
            <text
              x="56"
              y="10.5"
              fontSize={font(7.2)}
              fill={PHYSICS_COLORS.forceArrowRed}
              fontWeight="extrabold"
              textAnchor="middle"
              style={{ userSelect: 'none' }}
            >
              ⚠ {physicsResult.state === 'sliding-up' ? '往斜面上滑中' : '往斜面下滑中'}
            </text>
          </g>
        )}
      </g>
    </g>
  )
}

export default InclinedAmpereScene

