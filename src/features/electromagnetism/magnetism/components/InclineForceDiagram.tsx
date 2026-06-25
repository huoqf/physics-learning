import React, { useMemo } from 'react'
import { colors } from '@/theme/colors'
import { PHYSICS_COLORS } from '@/theme/physics'
import { GRAVITY } from '@/physics/constants'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { computeScale } from '@/utils/coordinate'
import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'

interface InclineForceDiagramProps {
  x: number
  y: number
  w: number
  h: number
  physicsResult: AdvancedAmperePhysicsResult
  I: number
  B: number
  theta: number
  showForceComponents: boolean
}

export const InclineForceDiagram: React.FC<InclineForceDiagramProps> = ({
  x,
  y,
  w,
  h,
  physicsResult,
  I,
  B,
  theta,
  showForceComponents,
}) => {
  const thetaRad = (theta * Math.PI) / 180

  // 1. 斜面几何结构计算 (在 w, h 的局部视口内)
  const padX = 25
  const padY = 25
  const x0 = padX
  const y0 = h - padY

  const slopeW = w - 2 * padX
  // 斜面高度
  const slopeH = slopeW * Math.tan(thetaRad)

  // 斜坡终点 (右上角)
  const rightX = x0 + slopeW
  const topY = y0 - slopeH

  // 2. 导体棒在斜面上的像素位置
  // 物理坐标范围为 [-1.1, 1.1]
  const xMin = -1.1
  const xMax = 1.1
  const rodRatio = Math.max(0.08, Math.min(0.92, (physicsResult.x - xMin) / (xMax - xMin)))

  const px = x0 + rodRatio * slopeW
  const py = y0 - rodRatio * slopeH

  // 3. 矢量箭头绘制的坐标转换
  // 物理力到像素长度的映射比例：把最大重力 mg (~5N) 映射为 32 像素
  const forceScale = computeScale(w, h, { xMin: -5, xMax: 5, yMin: -5, yMax: 5 })

  const localScale = useMemo(() => {
    return {
      originX: px,
      originY: py,
      scaleX: forceScale,
      scaleY: forceScale,
      maxVectorLength: 60,
      refMagnitudes: { force: 2.0 },
    } as any
  }, [px, py])

  // 重力 mg (竖直向下，即 y 轴负方向，对于 y1 = originY - origin.y * scaleY，物理矢量 y 负值即向下)
  const m = 0.5
  const g = GRAVITY
  const G_phys = { x: 0, y: -m * g }

  // 支持力 N (垂直斜面向左上方)
  // 斜面方向的单位矢量是 (cosθ, sinθ)，支持力方向是 (-sinθ, cosθ)
  const N_phys = {
    x: -physicsResult.N * Math.sin(thetaRad),
    y: physicsResult.N * Math.cos(thetaRad),
  }

  // 安培力 F_安 (水平向右为正)
  const Fa_phys = { x: physicsResult.F_ampere, y: 0 }

  // 摩擦力 f (沿斜面向上为正，方向为 (cosθ, sinθ)，向下为负)
  const f_phys = {
    x: physicsResult.f * Math.cos(thetaRad),
    y: physicsResult.f * Math.sin(thetaRad),
  }

  // 4. 正交分解坐标轴与投影辅助线
  // 沿斜面坐标轴轴线：从棒心 px, py 沿 (cosθ, -sinθ)
  // 垂直斜面坐标轴轴线：从棒心 px, py 沿 (-sinθ, -cosθ)
  const axisLen = 45

  // 计算投影点
  const cosT = Math.cos(thetaRad)
  const sinT = Math.sin(thetaRad)

  // 重力在坐标轴上的投影分量 (像素级，从棒心算起)
  // 沿斜面重力分量 = mg * sinθ (沿斜面向下)
  // 垂直斜面重力分量 = mg * cosθ (垂直斜面向下)
  const G_mag = m * g * forceScale
  const G_proj_slope_x = -G_mag * sinT * cosT
  const G_proj_slope_y = G_mag * sinT * sinT
  const G_proj_perp_x = -G_mag * cosT * sinT
  const G_proj_perp_y = -G_mag * cosT * cosT

  // 安培力在坐标轴上的投影分量
  // 沿斜面安培力分量 = F_安 * cosθ (沿斜面向上为正)
  // 垂直斜面安培力分量 = F_安 * sinθ (垂直斜面向下)
  const Fa_mag = physicsResult.F_ampere * forceScale
  const Fa_proj_slope_x = Fa_mag * cosT * cosT
  const Fa_proj_slope_y = -Fa_mag * cosT * sinT
  const Fa_proj_perp_x = Fa_mag * sinT * -sinT
  const Fa_proj_perp_y = Fa_mag * sinT * -cosT

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* 侧视图底板 */}
      <rect
        x="0"
        y="0"
        width={w}
        height={h}
        fill={colors.neutral[50]}
        stroke={colors.neutral[200]}
        strokeWidth="1.2"
        rx="6"
      />
      <text
        x="12"
        y="18"
        fontSize="7.5"
        fill={colors.neutral[700]}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        2D 侧视受力图 (原理)
      </text>

      {/* 磁场文字标注 */}
      <text
        x={w - 12}
        y="18"
        fontSize="6.5"
        fill={PHYSICS_COLORS.magneticField}
        fontWeight="extrabold"
        textAnchor="end"
        style={{ userSelect: 'none' }}
      >
        磁场 B = {Math.abs(B).toFixed(1)} T {B > 1e-4 ? '(竖直向上 ↑)' : B < -1e-4 ? '(竖直向下 ↓)' : '(无磁场)'}
      </text>

      {/* 匀强磁场竖直箭头 (指示整个空间磁场) */}
      {Math.abs(B) > 1e-4 && (
        <g opacity="0.45">
          {Array.from({ length: 4 }).map((_, i) => {
            const fx = padX + 15 + i * ((slopeW - 30) / 3)
            const isBUp = B > 0
            const y1 = y0 - 10
            const y2 = y0 - slopeH - 15
            return (
              <g key={i}>
                <line
                  x1={fx}
                  y1={isBUp ? y1 : y2}
                  x2={fx}
                  y2={isBUp ? y2 : y1}
                  stroke={PHYSICS_COLORS.magneticField}
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                {/* 在最左侧的磁感线顶部侧面渲染带矢量箭头的 B 物理量标识 */}
                {i === 0 && (
                  <g transform={`translate(${fx - 10}, ${y2 + 1})`}>
                    {/* 上方的矢量箭头 */}
                    <path
                      d="M -3,-5 L 2,-5 M -0.5,-6.5 L 2,-5 L -0.5,-3.5"
                      fill="none"
                      stroke={PHYSICS_COLORS.magneticField}
                      strokeWidth="0.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.95"
                    />
                    <text
                      x="0"
                      y="1.5"
                      fontSize="7.5"
                      fill={PHYSICS_COLORS.magneticField}
                      fontWeight="bold"
                      fontStyle="italic"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ userSelect: 'none' }}
                    >
                      B
                    </text>
                  </g>
                )}
                <polygon
                  points={`${fx},${isBUp ? y2 : y1} ${fx - 1.8},${isBUp ? y2 + 3 : y1 - 3} ${fx + 1.8},${isBUp ? y2 + 3 : y1 - 3}`}
                  fill={PHYSICS_COLORS.magneticField}
                />
              </g>
            )
          })}
        </g>
      )}

      {/* 侧视斜劈 */}
      <polygon
        points={`${x0},${y0} ${rightX},${y0} ${rightX},${topY}`}
        fill={colors.neutral[200]}
        stroke={colors.neutral[400]}
        strokeWidth="1"
      />
      {/* 斜面高光顶边 */}
      <line
        x1={x0}
        y1={y0}
        x2={rightX}
        y2={topY}
        stroke={colors.neutral[100]}
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* 角度标注 */}
      <path
        d={`M ${x0 + 18} ${y0} A 18 18 0 0 0 ${x0 + 18 * Math.cos(thetaRad)} ${y0 - 18 * Math.sin(thetaRad)}`}
        fill="none"
        stroke={colors.neutral[400]}
        strokeWidth="0.8"
      />
      <text
        x={x0 + 22}
        y={y0 - 5}
        fontSize="5.5"
        fill={colors.neutral[500]}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        {theta}°
      </text>

      {/* 正交分解辅助坐标轴 */}
      {showForceComponents && (
        <g opacity="0.45">
          {/* 沿斜面坐标轴 (x') */}
          <line
            x1={px - axisLen * cosT}
            y1={py + axisLen * sinT}
            x2={px + axisLen * cosT}
            y2={py - axisLen * sinT}
            stroke={colors.neutral[600]}
            strokeWidth="0.8"
            strokeDasharray="3,3"
          />
          <text
            x={px + axisLen * cosT + 3}
            y={py - axisLen * sinT}
            fontSize="5"
            fill={colors.neutral[600]}
            fontWeight="bold"
          >
            x'
          </text>

          {/* 垂直斜面坐标轴 (y') */}
          <line
            x1={px + axisLen * sinT}
            y1={py + axisLen * cosT}
            x2={px - axisLen * sinT}
            y2={py - axisLen * cosT}
            stroke={colors.neutral[600]}
            strokeWidth="0.8"
            strokeDasharray="3,3"
          />
          <text
            x={px - axisLen * sinT - 6}
            y={py - axisLen * cosT}
            fontSize="5"
            fill={colors.neutral[600]}
            fontWeight="bold"
          >
            y'
          </text>
        </g>
      )}

      {/* 投影辅助虚线 (重力与安培力分解) */}
      {showForceComponents && (
        <g stroke={colors.neutral[400]} strokeWidth="0.6" strokeDasharray="1.5,1.5" opacity="0.8">
          {/* 重力投影到 y' 轴 (垂直斜面) */}
          <line
            x1={px}
            y1={py + G_mag}
            x2={px + G_proj_perp_x}
            y2={py - G_proj_perp_y}
          />
          {/* 重力投影到 x' 轴 (平行斜面) */}
          <line
            x1={px}
            y1={py + G_mag}
            x2={px + G_proj_slope_x}
            y2={py - G_proj_slope_y}
          />

          {/* 安培力投影到 y' 轴 (垂直斜面) */}
          <line
            x1={px + Fa_mag}
            y1={py}
            x2={px + Fa_proj_perp_x}
            y2={py - Fa_proj_perp_y}
          />
          {/* 安培力投影到 x' 轴 (平行斜面) */}
          <line
            x1={px + Fa_mag}
            y1={py}
            x2={px + Fa_proj_slope_x}
            y2={py - Fa_proj_slope_y}
          />
        </g>
      )}

      {/* 导体棒侧视圆截面 */}
      <g transform={`translate(${px}, ${py})`}>
        <circle
          cx="0"
          cy="0"
          r="7"
          fill={colors.neutral[100]}
          stroke={colors.neutral[800]}
          strokeWidth="1.5"
        />
        {/* 电流方向符号 */}
        {I > 0 ? (
          /* 向里 ⊗ */
          <g opacity="0.6">
            <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="1.2" />
            <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="1.2" />
          </g>
        ) : I < 0 ? (
          /* 向外 ⊙ */
          <circle cx="0" cy="0" r="1.8" fill={PHYSICS_COLORS.electricCurrent} />
        ) : null}
      </g>

      {/* 受力矢量箭头 */}
      {/* 重力 G (红色/深灰色) */}
      <VectorArrow
        origin={{ x: 0, y: 0 }}
        vector={G_phys}
        type="gravity"
        sceneScale={localScale}
        strokeWidth={1.8}
        pixelLength={G_mag}
      />
      <text
        x={px + 3}
        y={py + G_mag - 2}
        fontSize="6.5"
        fill={PHYSICS_COLORS.gravity ?? colors.neutral[600]}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        G
      </text>

      {/* 支持力 N (蓝色) */}
      <VectorArrow
        origin={{ x: 0, y: 0 }}
        vector={N_phys}
        type="normalForce"
        sceneScale={localScale}
        strokeWidth={1.8}
        pixelLength={physicsResult.N * forceScale}
      />
      <text
        x={px + N_phys.x * forceScale - 9}
        y={py - N_phys.y * forceScale + 2}
        fontSize="6.5"
        fill={PHYSICS_COLORS.normalForce}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        N
      </text>

      {/* 安培力 F_安 (橙色) */}
      {Math.abs(physicsResult.F_ampere) > 1e-4 && (
        <g>
          <VectorArrow
            origin={{ x: 0, y: 0 }}
            vector={Fa_phys}
            type="lorentzForce"
            sceneScale={localScale}
            strokeWidth={1.8}
            pixelLength={Math.abs(Fa_phys.x * forceScale)}
          />
          <text
            x={px + Fa_phys.x * forceScale + (physicsResult.F_ampere > 0 ? 3 : -18)}
            y={py - 3}
            fontSize="6.5"
            fill={PHYSICS_COLORS.lorentzForce}
            fontWeight="bold"
            style={{ userSelect: 'none' }}
          >
            F_安
          </text>
        </g>
      )}

      {/* 摩擦力 f */}
      {Math.abs(physicsResult.f) > 1e-4 && (
        <g>
          <VectorArrow
            origin={{ x: 0, y: 0 }}
            vector={f_phys}
            type="friction"
            sceneScale={localScale}
            strokeWidth={1.8}
            pixelLength={Math.abs(physicsResult.f * forceScale)}
          />
          <text
            x={px + f_phys.x * forceScale + (physicsResult.f > 0 ? 3 : -14)}
            y={py - f_phys.y * forceScale - 3}
            fontSize="6.5"
            fill={PHYSICS_COLORS.friction}
            fontWeight="bold"
            style={{ userSelect: 'none' }}
          >
            f
          </text>
        </g>
      )}

      {/* 运动失稳时的合外力粗红色箭头 */}
      {Math.abs(physicsResult.a) > 0.05 && (
        <g>
          <VectorArrow
            origin={{ x: 0, y: 3.5 }}
            vector={{
              x: physicsResult.a > 0 ? 2.5 * cosT : -2.5 * cosT,
              y: physicsResult.a > 0 ? 2.5 * sinT : -2.5 * sinT,
            }}
            type="acceleration"
            sceneScale={localScale}
            strokeWidth={2.5}
            pixelLength={2.5 * forceScale}
          />
          <text
            x={px + (physicsResult.a > 0 ? 15 * cosT + 4 : -15 * cosT - 12)}
            y={py - (physicsResult.a > 0 ? 15 * sinT + 12 : -15 * sinT + 3)}
            fontSize="6.5"
            fill={PHYSICS_COLORS.acceleration}
            fontWeight="extrabold"
            style={{ userSelect: 'none' }}
          >
            F_合
          </text>
        </g>
      )}
    </g>
  )
}

export default InclineForceDiagram
