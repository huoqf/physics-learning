import { Rails, ConductingRod, VectorArrow, DCSource } from '@/components/Physics'
import React, { useMemo } from 'react'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'

import { UniformMagneticField } from './UniformMagneticField'
import type { BasicAmperePhysicsResult } from '../ampereForceModel'
import type { SceneScale } from '@/scene'

interface BasicAmpereSceneProps {
  x: number // 归一化布局 X 起点
  y: number // 归一化布局 Y 起点
  w: number // 归一化布局宽
  h: number // 归一化布局高
  physicsResult: BasicAmperePhysicsResult
  I: number
  B: number
  L: number // 导线有效长度 L (决定轨道间距)
  time: number
  showVectors: boolean
  isLimited: boolean
  font?: (size: number) => number
}

export const BasicAmpereScene: React.FC<BasicAmpereSceneProps> = ({
  x,
  y,
  w,
  h,
  physicsResult,
  I,
  B,
  L,
  time,
  showVectors,
  isLimited,
  font = (s) => s,
}) => {
  // 1. 局部坐标定位
  const cx = w / 2
  const cy = h / 2

  const padX = w * 0.15
  const railW = w - 2 * padX
  
  // 轨道间距 spacing 随有效长度 L 发生线性形变
  // L 在 2.0 ~ 5.0m 之间变化，railH (间距) 对应在 80 ~ 200 像素之间缩放
  const railH = L * 40

  // 导体棒物理坐标映射为局部像素坐标
  // 物理坐标范围为 [-1.6, 1.6]
  const pMin = -1.6
  const pMax = 1.6
  const rodX = cx + ((physicsResult.x - 0) / (pMax - pMin)) * railW

  // 2. 局部物理量矢量比例尺
  const localScale = useMemo<SceneScale>(() => {
    return {
      originX: rodX,
      originY: cy,
      scaleX: 8.0, // 力矢量像素比例
      scaleY: 8.0,
      scale: 8.0,
      maxVectorLength: 90,
      refMagnitudes: {
        force: 2.0,
        velocity: 2.0,
        currentDirection: 2.5,
        lorentzForce: 2.0,
      },
    }
  }, [rodX, cy])

  // 3. 电源位置与连接导线 (自适应 railH 间距)
  const powerX = cx - railW / 2 - 55
  const powerY = cy - 25
  const powerW = 30
  const powerH = 50

  const wire1Path = `M ${powerX + powerW} ${powerY + 12} L ${cx - railW / 2} ${cy - railH / 2}`
  const wire2Path = `M ${powerX + powerW} ${powerY + 38} L ${cx - railW / 2} ${cy + railH / 2}`

  const hasCurrent = Math.abs(I) > 1e-4

  return (
    // 使用 translate 移至 (x, y) 局部坐标系，保证导体棒与导轨在 Y 方向完美对齐不发生错位
    <g transform={`translate(${x}, ${y})`}>
      {/* 水平双轨道 */}
      <Rails
        type="horizontal"
        width={w}
        height={h}
        cx={cx}
        cy={cy}
        length={railW}
        spacing={railH}
      />

      {/* 匀强磁场点阵区 (铺在轨道上层) */}
      <UniformMagneticField
        x={cx - railW / 2 - 10}
        y={cy - railH / 2 - 25}
        w={railW + 20}
        h={railH + 50}
        B={B}
      />

      {/* 磁场文字标注 */}
      <text
        x={cx}
        y={cy - railH / 2 - 12}
        fontSize={font(9.5)}
        fill={PHYSICS_COLORS.magneticField}
        fontWeight="extrabold"
        textAnchor="middle"
        style={{ userSelect: 'none' }}
      >
        匀强磁场 B = {Math.abs(B).toFixed(1)} T {B > 1e-4 ? '(⊗ 垂直纸面向里)' : B < -1e-4 ? '(⊙ 垂直纸面向外)' : '(无磁场)'}
      </text>

      {/* 电源至轨道的导线 (黑色发光底条) */}
      <path d={wire1Path} fill="none" stroke={PHYSICS_COLORS.gridSubtle} strokeWidth="3" />
      <path d={wire2Path} fill="none" stroke={PHYSICS_COLORS.gridSubtle} strokeWidth="3" />
      <path d={wire1Path} fill="none" stroke={PHYSICS_COLORS.strokeDark} strokeWidth="1.5" />
      <path d={wire2Path} fill="none" stroke={PHYSICS_COLORS.strokeDark} strokeWidth="1.5" />

      {/* 导线电流动画流光 */}
      {hasCurrent && (
        <g>
          {/* 上支路导线 */}
          <path
            d={wire1Path}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth="1.8"
            strokeDasharray="5,6"
            strokeDashoffset={I > 0 ? time * 20 : -time * 20}
            opacity="0.85"
          />
          {/* 下支路导线 */}
          <path
            d={wire2Path}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth="1.8"
            strokeDasharray="5,6"
            strokeDashoffset={I > 0 ? -time * 20 : time * 20}
            opacity="0.85"
          />
        </g>
      )}

      {/* 电源盒子 */}
      <DCSource 
        x={powerX + powerW / 2} 
        y={powerY + powerH / 2} 
        type="instrument" 
        width={powerW} 
        height={powerH} 
        polarity={I > 0 ? 'left-positive' : 'right-positive'}
        label="电源"
        voltage={Math.abs(I) * 5}
      />

      {/* 运动的通电导体棒 */}
      <ConductingRod
        type="horizontal"
        x={rodX}
        currentDir={
          physicsResult.currentDir === 'positive'
            ? 'in'
            : physicsResult.currentDir === 'negative'
            ? 'out'
            : 'none'
        }
        spacing={railH}
        height={h}
      />

      {/* 矢量箭头 (只在 showVectors 时渲染) */}
      {showVectors && (
        <g>
          {/* 安培力箭头 (橙色，由棒中心向左或向右) */}
          <VectorArrow
            vector={{ x: physicsResult.F, y: 0 }}
            type="lorentzForce"
            sceneScale={localScale}
            strokeWidth={3}
          />
          {physicsResult.FAbs > 1e-4 && (
            <text
              x={rodX + (physicsResult.F > 0 ? 30 : -45)}
              y={cy - 6}
              fontSize={font(11)}
              fill={PHYSICS_COLORS.lorentzForce}
              fontWeight="bold"
              style={{ userSelect: 'none' }}
            >
              F_安
            </text>
          )}

          {/* 电流方向箭头 (红色，在棒上垂直向下或向上) */}
          {hasCurrent && (
            <g>
              <VectorArrow
                vector={{ x: 0, y: I > 0 ? 2.5 : -2.5 }}
                type="currentDirection"
                sceneScale={localScale}
                strokeWidth={3}
              />
            </g>
          )}
        </g>
      )}

      {/* 轨道端限位提示 */}
      {isLimited && (
        <g>
          <rect
            x={cx - 50}
            y={cy - railH / 2 - 27}
            width="100"
            height="11"
            fill={withAlpha(PHYSICS_COLORS.forceArrowRed, 0.08)}
            stroke={withAlpha(PHYSICS_COLORS.forceArrowRed, 0.3)}
            strokeWidth="0.8"
            rx="3"
          />
          <text
            x={cx}
            y={cy - railH / 2 - 20}
            fontSize={font(8)}
            fill={PHYSICS_COLORS.forceArrowRed}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            ⚠️ 已到达导轨边缘限位
          </text>
        </g>
      )}
    </g>
  )
}

export default BasicAmpereScene
