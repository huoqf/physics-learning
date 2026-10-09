import { useMemo } from 'react'
import { CANVAS_COLORS, PHYSICS_COLORS, CHART_COLORS, withAlpha } from '@/theme/physics'
import type { MicroEstimationResult, SubstancePreset } from '@/physics/brownianMotion'

interface MicroSceneProps {
  substance: SubstancePreset
  estimation: MicroEstimationResult
  inputMode: number
  inputValue: number
  width: number
  height: number
  font: (size: number) => number
}

export function MicroScene({
  substance,
  estimation,
  inputMode,
  inputValue,
  width,
  height,
  font,
}: MicroSceneProps) {
  const isSphere = substance.model === 'sphere'

  // 左半边：宏观样品示意区 (Macro scale)
  const leftCenterX = width * 0.28
  const leftCenterY = height * 0.5

  // 右半边：微观放大镜头 (Micro scale)
  const rightCenterX = width * 0.72
  const rightCenterY = height * 0.5
  const lensRadius = Math.min(width * 0.22, height * 0.38)

  // 微观阵列点位生成
  const moleculePoints = useMemo(() => {
    const pts: { x: number; y: number; r: number }[] = []
    if (isSphere) {
      // 液体/固体：致密紧挨的微观球体阵列
      const r = lensRadius * 0.12
      const step = r * 1.95
      for (let x = -lensRadius + r; x <= lensRadius - r; x += step) {
        for (let y = -lensRadius + r; y <= lensRadius - r; y += step) {
          if (x * x + y * y <= (lensRadius - r * 1.2) * (lensRadius - r * 1.2)) {
            pts.push({ x: rightCenterX + x, y: rightCenterY + y, r })
          }
        }
      }
    } else {
      // 气体：稀疏随机分布在立方体空间中的气体分子
      const count = 18
      const r = lensRadius * 0.08
      for (let i = 0; i < count; i++) {
        const angle = (i * 137.5 * Math.PI) / 180
        const dist = (Math.sqrt(i) / Math.sqrt(count)) * (lensRadius * 0.75)
        const x = rightCenterX + Math.cos(angle) * dist
        const y = rightCenterY + Math.sin(angle) * dist
        pts.push({ x, y, r })
      }
    }
    return pts
  }, [isSphere, lensRadius, rightCenterX, rightCenterY])

  return (
    <g>
      {/* ── 宏观区域 ────────────────────────────────────────── */}
      <rect
        x={20}
        y={20}
        width={width * 0.44}
        height={height - 40}
        rx={12}
        fill={CANVAS_COLORS.white}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={1}
      />
      <text
        x={35}
        y={45}
        fontSize={font(12)}
        fontWeight="bold"
        fill={CANVAS_COLORS.labelText}
      >
        宏观物质样本（待测体系）
      </text>

      {/* 宏观样品图形表现 */}
      <g transform={`translate(${leftCenterX}, ${leftCenterY})`}>
        {substance.symbol === 'H₂O' ? (
          // 水滴/烧杯水样
          <g>
            <path
              d="M 0 -60 C 25 -30 45 10 40 40 C 35 65 -35 65 -40 40 C -45 10 -25 -30 0 -60 Z"
              fill={withAlpha(PHYSICS_COLORS.velocity, 0.4)}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={2}
            />
            <text
              y={85}
              textAnchor="middle"
              fontSize={font(11)}
              fontWeight="bold"
              fill={PHYSICS_COLORS.velocity}
            >
              水滴 (H₂O)
            </text>
          </g>
        ) : substance.model === 'cube' ? (
          // 标况气体容器
          <g>
            <rect
              x={-55}
              y={-50}
              width={110}
              height={100}
              rx={6}
              fill={withAlpha(CANVAS_COLORS.objectFill, 0.6)}
              stroke={CANVAS_COLORS.axis}
              strokeWidth={2}
            />
            <rect
              x={-50}
              y={-45}
              width={100}
              height={90}
              fill={withAlpha(PHYSICS_COLORS.velocity, 0.08)}
            />
            <text
              y={75}
              textAnchor="middle"
              fontSize={font(11)}
              fontWeight="bold"
              fill={CANVAS_COLORS.labelText}
            >
              标况气体容器 (22.4 L/mol)
            </text>
          </g>
        ) : (
          // 固体金属块
          <g>
            <rect
              x={-50}
              y={-45}
              width={100}
              height={90}
              rx={4}
              fill={withAlpha(CHART_COLORS.equilibrium, 0.4)}
              stroke={CHART_COLORS.equilibrium}
              strokeWidth={2}
            />
            <text
              y={70}
              textAnchor="middle"
              fontSize={font(11)}
              fontWeight="bold"
              fill={CHART_COLORS.equilibrium}
            >
              {substance.name} 金属样品 ({substance.symbol})
            </text>
          </g>
        )}

        {/* 宏观规格参数标签卡片 */}
        <text
          y={substance.symbol === 'H₂O' ? 110 : 95}
          textAnchor="middle"
          fontSize={font(10)}
          fill={CANVAS_COLORS.labelText}
        >
          {inputMode === 0 ? `质量 m = ${inputValue} g` : `体积 V = ${inputValue} cm³`}
        </text>
        <text
          y={substance.symbol === 'H₂O' ? 128 : 113}
          textAnchor="middle"
          fontSize={font(10)}
          fill={PHYSICS_COLORS.forceNet}
          fontWeight="medium"
        >
          摩尔质量 M = {(substance.molMass * 1000).toFixed(0)} g/mol
        </text>
      </g>

      {/* ── 放大镜跨尺度视线 ─────────────────────────────────── */}
      <line
        x1={leftCenterX + 55}
        y1={leftCenterY}
        x2={rightCenterX - lensRadius}
        y2={rightCenterY}
        stroke={PHYSICS_COLORS.forceNet}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.6}
      />
      <text
        x={(leftCenterX + rightCenterX - lensRadius + 55) / 2}
        y={leftCenterY - 10}
        textAnchor="middle"
        fontSize={font(9)}
        fill={PHYSICS_COLORS.forceNet}
      >
        放大 ×10¹⁰
      </text>

      {/* ── 微观区域 (放大透镜内) ─────────────────────────────── */}
      <circle
        cx={rightCenterX}
        cy={rightCenterY}
        r={lensRadius}
        fill={CANVAS_COLORS.white}
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={3}
      />
      <circle
        cx={rightCenterX}
        cy={rightCenterY}
        r={lensRadius - 3}
        fill={withAlpha(PHYSICS_COLORS.velocity, 0.04)}
      />

      {/* 放大透镜标题 */}
      <text
        x={rightCenterX}
        y={rightCenterY - lensRadius - 12}
        textAnchor="middle"
        fontSize={font(12)}
        fontWeight="bold"
        fill={CANVAS_COLORS.labelText}
      >
        微观分子排布模型：{isSphere ? '球体紧密排列（固体/液体）' : '立方体均摊模型（气体）'}
      </text>

      {/* 微观分子群渲染 */}
      {moleculePoints.map((pt, idx) => (
        <circle
          key={idx}
          cx={pt.x}
          cy={pt.y}
          r={pt.r}
          fill={isSphere ? withAlpha(PHYSICS_COLORS.velocity, 0.75) : withAlpha(PHYSICS_COLORS.velocityX, 0.85)}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={1.5}
        />
      ))}

      {/* 微观尺度尺寸指示标尺 */}
      {isSphere ? (
        // 球体直径标尺
        <g transform={`translate(${rightCenterX}, ${rightCenterY + lensRadius * 0.65})`}>
          <line
            x1={-lensRadius * 0.12}
            y1={0}
            x2={lensRadius * 0.12}
            y2={0}
            stroke={PHYSICS_COLORS.forceNet}
            strokeWidth={1.8}
          />
          <text
            y={16}
            textAnchor="middle"
            fontSize={font(10)}
            fill={PHYSICS_COLORS.forceNet}
            fontWeight="bold"
          >
            分子直径 d ≈ {(estimation.size * 1e10).toFixed(2)} Å (10⁻¹⁰ m)
          </text>
        </g>
      ) : (
        // 气体平均距离标尺
        <g transform={`translate(${rightCenterX}, ${rightCenterY + lensRadius * 0.65})`}>
          <line
            x1={-lensRadius * 0.25}
            y1={0}
            x2={lensRadius * 0.25}
            y2={0}
            stroke={PHYSICS_COLORS.forceNet}
            strokeWidth={1.8}
          />
          <text
            y={16}
            textAnchor="middle"
            fontSize={font(10)}
            fill={PHYSICS_COLORS.forceNet}
            fontWeight="bold"
          >
            分子平均间距 L ≈ {(estimation.size * 1e10).toFixed(2)} Å (10⁻⁹ m)
          </text>
        </g>
      )}

      {/* 底部桥梁公式注记 */}
      <rect
        x={rightCenterX - lensRadius}
        y={height - 52}
        width={lensRadius * 2}
        height={34}
        rx={6}
        fill={withAlpha(PHYSICS_COLORS.velocity, 0.08)}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={1}
      />
      <text
        x={rightCenterX}
        y={height - 30}
        textAnchor="middle"
        fontSize={font(10)}
        fill={CANVAS_COLORS.axis}
        fontWeight="medium"
      >
        桥梁关系：N = (m / M) · N_A = (V / V_mol) · N_A
      </text>
    </g>
  )
}
