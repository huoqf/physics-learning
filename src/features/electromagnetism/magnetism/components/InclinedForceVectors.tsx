import React from 'react'
import { PhysicsVectorArrow } from '@/components/Physics'
import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'
import type { SceneScale } from '@/scene'
import type { Point } from './inclineSceneUtils'

interface InclinedForceVectorsProps {
  physicsResult: AdvancedAmperePhysicsResult
  I: number
  mu: number
  showVectors: boolean
  font: (size: number) => number
  localScale: SceneScale
  ampereDirection: Point | null
  ampereArrowLength: number
  motionSign: number
  slopeUnit: Point
  normalUnit: Point
  G_len: number
  N_len: number
  f_len: number
  f_sign: number
  Fnet_len: number
  dx: number
  dy: number
  rodBack: Point
  rodFront: Point
}

export const InclinedForceVectors: React.FC<InclinedForceVectorsProps> = ({
  physicsResult,
  I,
  mu,
  showVectors,
  font,
  localScale,
  ampereDirection,
  ampereArrowLength,
  motionSign,
  slopeUnit,
  normalUnit,
  G_len,
  N_len,
  f_len,
  f_sign,
  Fnet_len,
  dx,
  dy,
  rodBack,
  rodFront,
}) => {
  const a = physicsResult.a
  const hasLimit = physicsResult.isLimited

  return (
    <>
      {/* 电流矢量 I（绘制在棒中心正上方 15px 处） */}
      {Math.abs(I) > 1e-4 && (
        <PhysicsVectorArrow
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
      {Math.abs(a) > 0.05 && !hasLimit && (
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

      {/* 安培力 F_安 (默认显示，洛伦兹紫) */}
      {ampereDirection && (
        <PhysicsVectorArrow
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
        <PhysicsVectorArrow
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
        <PhysicsVectorArrow
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
        <PhysicsVectorArrow
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
      {showVectors && Math.abs(a) > 0.05 && (
        <PhysicsVectorArrow
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
      {showVectors && Math.abs(a) > 0.05 && !hasLimit && (
        <PhysicsVectorArrow
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
        <PhysicsVectorArrow
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
    </>
  )
}
