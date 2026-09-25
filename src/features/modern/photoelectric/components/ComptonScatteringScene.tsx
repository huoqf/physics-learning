import React from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { PhotoelectricDerived } from '../model/photoelectricViewModel'

interface ComptonScatteringSceneProps {
  derived: PhotoelectricDerived
}

export const ComptonScatteringScene: React.FC<ComptonScatteringSceneProps> = ({ derived }) => {
  const { thetaDeg, deltaLambdaNm, recoilAngleDeg } = derived

  const cx = 350
  const cy = 280

  // 散射方向（向上偏折 thetaDeg）
  const sRad = (thetaDeg * Math.PI) / 180
  const scatteredLen = 220
  const sx = cx + scatteredLen * Math.cos(sRad)
  const sy = cy - scatteredLen * Math.sin(sRad)

  // 电子反冲方向（向下偏折 recoilAngleDeg）
  const eRad = (recoilAngleDeg * Math.PI) / 180
  const recoilLen = 180
  const ex = cx + recoilLen * Math.cos(eRad)
  const ey = cy + recoilLen * Math.sin(eRad)

  return (
    <div className="w-full h-full relative select-none">
      <svg className="w-full h-full" viewBox="0 0 700 600">
        {/* 背景卡片 */}
        <rect
          x={20}
          y={20}
          width={660}
          height={560}
          rx={8}
          fill={withAlpha(CANVAS_COLORS.axis, 0.03)}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1}
        />

        {/* 标题 */}
        <text
          x={40}
          y={50}
          fill={CANVAS_COLORS.labelText}
          fontSize={15}
          fontWeight="bold"
        >
          康普顿效应与光子动量碰撞模型
        </text>

        {/* 碰撞前基线 */}
        <line
          x1={60}
          y1={cy}
          x2={640}
          y2={cy}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* 1. 入射光子 (X 射线，短波长，高频) */}
        <path
          d={`
            M 80 ${cy}
            Q 110 ${cy - 16} 140 ${cy}
            Q 170 ${cy + 16} 200 ${cy}
            Q 230 ${cy - 16} 260 ${cy}
            Q 290 ${cy + 16} 320 ${cy}
            L ${cx - 10} ${cy}
          `}
          fill="none"
          stroke={PHYSICS_COLORS.wavelengthViolet}
          strokeWidth={2.5}
        />
        {/* 入射动量箭头 */}
        <polygon
          points={`${cx - 8},${cy} ${cx - 20},${cy - 6} ${cx - 20},${cy + 6}`}
          fill={PHYSICS_COLORS.wavelengthViolet}
        />
        <text
          x={180}
          y={cy - 28}
          textAnchor="middle"
          fill={PHYSICS_COLORS.wavelengthViolet}
          fontSize={13}
          fontWeight="bold"
        >
          入射光子 (波长 λ₀，动量 p₀ = h/λ₀)
        </text>

        {/* 2. 目标静止电子 */}
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill={PHYSICS_COLORS.velocity}
          stroke={CANVAS_COLORS.white}
          strokeWidth={2}
        />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill={CANVAS_COLORS.white}
          fontSize={12}
          fontWeight="bold"
        >
          e⁻
        </text>
        <text
          x={cx}
          y={cy + 30}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={11}
        >
          静止靶电子
        </text>

        {/* 3. 散射光子（波长变长，疏波） */}
        <g>
          {/* 散射轨迹线 */}
          <line
            x1={cx}
            y1={cy}
            x2={sx}
            y2={sy}
            stroke={PHYSICS_COLORS.wavelengthRed}
            strokeWidth={2}
            strokeDasharray="6 3"
          />
          {/* 散射箭头 */}
          <circle cx={sx} cy={sy} r={5} fill={PHYSICS_COLORS.wavelengthRed} />
          {/* 散射角 θ 弧线 */}
          <path
            d={`M ${cx + 50} ${cy} A 50 50 0 0 0 ${cx + 50 * Math.cos(sRad)} ${cy - 50 * Math.sin(sRad)}`}
            fill="none"
            stroke={CANVAS_COLORS.labelText}
            strokeWidth={1.5}
          />
          <text
            x={cx + 65}
            y={cy - 20}
            fill={PHYSICS_COLORS.wavelengthRed}
            fontSize={12}
            fontWeight="bold"
          >
            散射角 θ = {thetaDeg}°
          </text>
          <text
            x={sx + 10}
            y={sy}
            fill={PHYSICS_COLORS.wavelengthRed}
            fontSize={12}
            fontWeight="bold"
          >
            散射光子 (λ &gt; λ₀，波长变长！)
          </text>
        </g>

        {/* 4. 反冲电子 */}
        <g>
          <line
            x1={cx}
            y1={cy}
            x2={ex}
            y2={ey}
            stroke={PHYSICS_COLORS.acceleration}
            strokeWidth={2.5}
          />
          <circle cx={ex} cy={ey} r={8} fill={PHYSICS_COLORS.velocity} />
          <polygon
            points={`${ex},${ey} ${ex - 12 * Math.cos(eRad) - 6 * Math.sin(eRad)},${ey - 12 * Math.sin(eRad) + 6 * Math.cos(eRad)} ${ex - 12 * Math.cos(eRad) + 6 * Math.sin(eRad)},${ey - 12 * Math.sin(eRad) - 6 * Math.cos(eRad)}`}
            fill={PHYSICS_COLORS.acceleration}
          />
          <text
            x={ex + 12}
            y={ey + 4}
            fill={PHYSICS_COLORS.acceleration}
            fontSize={12}
            fontWeight="bold"
          >
            反冲电子 (动量 p_e, 动能 E_k)
          </text>
        </g>

        {/* 5. 动量守恒与波长改变量量化卡片 */}
        <g transform="translate(40, 410)">
          <rect
            x={0}
            y={0}
            width={620}
            height={140}
            rx={6}
            fill={CANVAS_COLORS.white}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={1}
          />
          <text
            x={20}
            y={30}
            fill={PHYSICS_COLORS.displacement}
            fontSize={14}
            fontWeight="bold"
          >
            康普顿散射公式：Δλ = λ&apos; - λ = λ_c (1 - cos θ)
          </text>
          <text
            x={20}
            y={58}
            fill={CANVAS_COLORS.labelText}
            fontSize={12}
          >
            当前散射角 θ = {thetaDeg}° 下波长增量: <tspan fill={PHYSICS_COLORS.acceleration} fontWeight="bold">Δλ = {deltaLambdaNm.toFixed(6)} nm</tspan> (电子康普顿波长 λ_c ≈ 0.002426 nm)
          </text>
          <text
            x={20}
            y={82}
            fill={CANVAS_COLORS.textMuted}
            fontSize={12}
          >
            能量守恒：hν = hν&apos; + E_k  |  动量守恒：p⃗ = p⃗&apos; + p⃗_e (矢量三角形)
          </text>
          <text
            x={20}
            y={112}
            fill={CANVAS_COLORS.labelText}
            fontSize={12}
            fontWeight="bold"
          >
            💡 高考核心结论：康普顿效应证实了光子不仅具有能量，还具有动量；波长变长是因为光子在弹性碰撞中将部分动能传递给了反冲电子。
          </text>
        </g>
      </svg>
    </div>
  )
}
