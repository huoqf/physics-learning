import { useMemo } from 'react'
import { CANVAS_COLORS, PHYSICS_COLORS, CHART_COLORS, THERMO_COLORS, withAlpha } from '@/theme/physics'
import type { OilFilmResult } from '@/physics/oilFilmExperiment'

interface OilFilmSceneProps {
  step: number // 0: 溶液配制与滴瓶, 1: 滴管滴下油酸酒精, 2: 痱子粉被推开铺展成油膜, 3: 玻璃板方格计数
  calcResult: OilFilmResult
  width: number
  height: number
  font: (size: number) => number
}

export function OilFilmScene({
  step,
  calcResult,
  width,
  height,
  font,
}: OilFilmSceneProps) {
  const centerX = width * 0.5
  const centerY = height * 0.5
  const dishRadius = Math.min(width * 0.4, height * 0.42)

  // 根据计算面积缩放油膜半径 (设计像素)
  const filmRadius = useMemo(() => {
    const scale = Math.sqrt(calcResult.areaCm2 / 250)
    return Math.min(dishRadius * 0.78, Math.max(dishRadius * 0.4, dishRadius * 0.62 * scale))
  }, [calcResult.areaCm2, dishRadius])

  // 生成真实高考实验特征的不规则单分子油膜平滑多边形轮廓
  const filmPath = useMemo(() => {
    const pointsCount = 28
    const dPts: [number, number][] = []
    for (let i = 0; i < pointsCount; i++) {
      const angle = (i * 2 * Math.PI) / pointsCount
      // 引入几个不同谐波的起伏模拟不规则油膜边缘
      const wobble =
        1.0 +
        0.12 * Math.sin(angle * 3) +
        0.08 * Math.cos(angle * 5 + 0.8) -
        0.06 * Math.sin(angle * 2 - 0.5)
      const r = filmRadius * wobble
      const px = centerX + r * Math.cos(angle)
      const py = centerY + r * Math.sin(angle)
      dPts.push([px, py])
    }
    return (
      dPts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`, '') + ' Z'
    )
  }, [centerX, centerY, filmRadius])

  // 生成坐标方格网络（第 3 步方格板）
  const gridCells = useMemo(() => {
    if (step < 3) return []
    const cellSize = 22
    const cells: { x: number; y: number; state: 'full' | 'half' | 'empty' }[] = []
    const startX = centerX - dishRadius * 0.85
    const endX = centerX + dishRadius * 0.85
    const startY = centerY - dishRadius * 0.85
    const endY = centerY + dishRadius * 0.85

    for (let x = startX; x <= endX; x += cellSize) {
      for (let y = startY; y <= endY; y += cellSize) {
        const midX = x + cellSize / 2
        const midY = y + cellSize / 2
        const dist = Math.sqrt((midX - centerX) ** 2 + (midY - centerY) ** 2)
        if (dist <= filmRadius * 0.85) {
          cells.push({ x, y, state: 'full' })
        } else if (dist <= filmRadius * 1.1) {
          cells.push({ x, y, state: 'half' })
        } else if (dist <= dishRadius * 0.85) {
          cells.push({ x, y, state: 'empty' })
        }
      }
    }
    return cells
  }, [step, centerX, centerY, dishRadius, filmRadius])

  return (
    <g>
      {/* ── 实验浅盘背景 ────────────────────────────────────── */}
      {/* 浅盘外金属边缘 */}
      <circle
        cx={centerX}
        cy={centerY}
        r={dishRadius + 14}
        fill={withAlpha(CHART_COLORS.equilibrium, 0.15)}
        stroke={CHART_COLORS.equilibrium}
        strokeWidth={3}
      />
      {/* 浅水盘盘身 */}
      <circle
        cx={centerX}
        cy={centerY}
        r={dishRadius}
        fill={withAlpha(PHYSICS_COLORS.velocity, 0.08)}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={1.5}
      />
      <text
        x={centerX}
        y={centerY - dishRadius - 22}
        textAnchor="middle"
        fontSize={font(13)}
        fontWeight="bold"
        fill={CANVAS_COLORS.labelText}
      >
        水浅盘盛水与单分子油膜铺展模拟 (俯视图)
      </text>

      {/* 步骤 1~3：浅盘上的痱子粉层 */}
      {step >= 1 && (
        <circle
          cx={centerX}
          cy={centerY}
          r={dishRadius - 6}
          fill="none"
          stroke={withAlpha(CANVAS_COLORS.grid, 0.8)}
          strokeWidth={4}
          strokeDasharray="2 3"
        />
      )}

      {/* 步骤 0：溶液配制示意卡 */}
      {step === 0 && (
        <g transform={`translate(${centerX - 130}, ${centerY - 90})`}>
          <rect
            x={0}
            y={0}
            width={260}
            height={180}
            rx={10}
            fill={CANVAS_COLORS.white}
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={1.8}
          />
          <text
            x={130}
            y={35}
            textAnchor="middle"
            fontSize={font(12)}
            fontWeight="bold"
            fill={PHYSICS_COLORS.velocity}
          >
            步骤 1：油酸酒精溶液配制
          </text>
          <text x={24} y={75} fontSize={font(10)} fill={CANVAS_COLORS.axis}>
            • 取 1 mL 纯油酸注入容量瓶
          </text>
          <text x={24} y={105} fontSize={font(10)} fill={CANVAS_COLORS.axis}>
            • 加入纯酒精配成 500 mL 溶液 (1:500 稀释)
          </text>
          <text x={24} y={135} fontSize={font(10)} fill={CANVAS_COLORS.axis}>
            • 用注射器测出 1 mL 溶液滴数 (如 80 滴)
          </text>
          <text
            x={130}
            y={165}
            textAnchor="middle"
            fontSize={font(9)}
            fill={THERMO_COLORS.heatAbsorb}
            fontWeight="bold"
          >
            单滴纯油酸体积 V = 1/(80×500) mL ≈ 2.5×10⁻¹¹ m³
          </text>
        </g>
      )}

      {/* 步骤 1：滴管与液滴滴落 */}
      {step === 1 && (
        <g>
          <circle
            cx={centerX}
            cy={centerY}
            r={dishRadius - 10}
            fill={withAlpha(CANVAS_COLORS.grid, 0.45)}
          />
          <text
            x={centerX}
            y={centerY - 30}
            textAnchor="middle"
            fontSize={font(11)}
            fill={CANVAS_COLORS.axis}
          >
            水面已均匀撒上一薄层痱子粉（石松粉）
          </text>
          <path
            d={`M ${centerX - 10} ${centerY - 100} L ${centerX + 10} ${centerY - 100} L ${centerX + 4} ${centerY - 45} L ${centerX - 4} ${centerY - 45} Z`}
            fill={withAlpha(CANVAS_COLORS.objectFill, 0.8)}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={1.5}
          />
          <circle
            cx={centerX}
            cy={centerY - 35}
            r={7}
            fill={PHYSICS_COLORS.velocity}
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={1.5}
          />
          <text
            x={centerX}
            y={centerY - 10}
            textAnchor="middle"
            fontSize={font(10)}
            fill={PHYSICS_COLORS.velocity}
            fontWeight="bold"
          >
            一滴油酸酒精溶液滴入水面
          </text>
        </g>
      )}

      {/* 步骤 2 或 3：油膜扩散成单分子层 */}
      {step >= 2 && (
        <g>
          <circle
            cx={centerX}
            cy={centerY}
            r={dishRadius - 10}
            fill={withAlpha(CANVAS_COLORS.grid, 0.55)}
          />

          <path
            d={filmPath}
            fill={withAlpha(PHYSICS_COLORS.velocity, 0.28)}
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={2.4}
          />

          {step === 2 && (
            <g>
              <text
                x={centerX}
                y={centerY - 10}
                textAnchor="middle"
                fontSize={font(12)}
                fontWeight="bold"
                fill={PHYSICS_COLORS.velocity}
              >
                单分子油膜扩散稳定边界
              </text>
              <text
                x={centerX}
                y={centerY + 14}
                textAnchor="middle"
                fontSize={font(10)}
                fill={CANVAS_COLORS.axis}
              >
                酒精已溶于水，纯油酸在表面张力下展成单分子层
              </text>
            </g>
          )}
        </g>
      )}

      {/* 步骤 3：盖上方格玻璃板并数方格 */}
      {step === 3 && (
        <g>
          <rect
            x={centerX - dishRadius * 0.88}
            y={centerY - dishRadius * 0.88}
            width={dishRadius * 1.76}
            height={dishRadius * 1.76}
            fill="none"
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />

          {gridCells.map((c, i) => (
            <rect
              key={i}
              x={c.x}
              y={c.y}
              width={22}
              height={22}
              fill={
                c.state === 'full'
                  ? withAlpha(PHYSICS_COLORS.velocity, 0.35)
                  : c.state === 'half'
                    ? withAlpha(THERMO_COLORS.heatAbsorb, 0.25)
                    : 'none'
              }
              stroke={withAlpha(CANVAS_COLORS.axis, 0.25)}
              strokeWidth={0.8}
            />
          ))}

          <g transform={`translate(${centerX - 130}, ${centerY + dishRadius - 35})`}>
            <rect
              x={0}
              y={0}
              width={260}
              height={32}
              rx={6}
              fill={CANVAS_COLORS.white}
              stroke={CANVAS_COLORS.axis}
              strokeWidth={1}
            />
            <text
              x={130}
              y={20}
              textAnchor="middle"
              fontSize={font(10)}
              fontWeight="bold"
              fill={CANVAS_COLORS.labelText}
            >
              高考数格法则：满半格算一格，不满半格舍去
            </text>
          </g>
        </g>
      )}

      {/* 底部当前步骤测量结果指示 */}
      <text
        x={centerX}
        y={height - 20}
        textAnchor="middle"
        fontSize={font(11)}
        fontWeight="bold"
        fill={THERMO_COLORS.heatAbsorb}
      >
        {step === 3
          ? `测得油膜有效方格数 N ≈ ${calcResult.gridCount} 格，有效面积 S = ${calcResult.areaCm2.toFixed(1)} cm²，估算分子直径 d = ${(calcResult.moleculeDiameterM * 1e10).toFixed(2)} × 10⁻¹⁰ m`
          : '实验核心思想：单分子油膜假设 + 球形分子紧密排列模型'}
      </text>
    </g>
  )
}
