import { Rails, ConductingRod } from '@/components/Physics'
import React from 'react'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'

import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'

import { useInclinedAmpereScene } from '../hooks/useInclinedAmpereScene'
import {
  VIEW_W,
  VIEW_H,
  EFFECTIVE_L,
  describeAmpereForce,
} from './inclineSceneUtils'
import { InclinedBFieldLines } from './InclinedBFieldLines'
import { InclinedForceVectors } from './InclinedForceVectors'

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

  const computed = useInclinedAmpereScene({
    physicsResult,
    I,
    B,
    theta,
    mu,
    bFieldDir,
  })

  const {
    layout,
    slopeUnit,
    normalUnit,
    rodRatio,
    bPositiveUnit,
    bFieldLines,
    rodBack,
    rodFront,
    ampereDirection,
    ampereArrowLength,
    motionSign,
    localScale,
    G_len,
    N_len,
    f_len,
    f_sign,
    Fnet_len,
  } = computed

  const a = physicsResult.a
  const hasLimit = physicsResult.isLimited
  const hasField = Math.abs(B) > 1e-4

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

        {/* 匀强磁感线立体矢量丛 */}
        {hasField && (
          <InclinedBFieldLines
            B={B}
            bFieldLines={bFieldLines}
            bPositiveUnit={bPositiveUnit}
            font={font}
            scale={scale}
          />
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

        {/* 碰壁圆形波纹微特效 */}
        {hasLimit && Math.abs(a) > 0.05 && (
          <g>
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

        {/* 3D 矢量受力显示联动 */}
        <InclinedForceVectors
          physicsResult={physicsResult}
          I={I}
          mu={mu}
          showVectors={showVectors}
          font={font}
          localScale={localScale}
          ampereDirection={ampereDirection}
          ampereArrowLength={ampereArrowLength}
          motionSign={motionSign}
          slopeUnit={slopeUnit}
          normalUnit={normalUnit}
          G_len={G_len}
          N_len={N_len}
          f_len={f_len}
          f_sign={f_sign}
          Fnet_len={Fnet_len}
          dx={dx}
          dy={dy}
          rodBack={rodBack}
          rodFront={rodFront}
        />
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
