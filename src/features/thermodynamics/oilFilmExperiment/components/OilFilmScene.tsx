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

/** 油膜边缘起伏：单位半径方向上的归一化轮廓（多边形生成与格点包含判定共用同一函数） */
function filmEdgeWobble(angle: number): number {
  return (
    1.0 +
    0.12 * Math.sin(angle * 3) +
    0.08 * Math.cos(angle * 5 + 0.8) -
    0.06 * Math.sin(angle * 2 - 0.5)
  )
}

/** 油膜轮廓多边形顶点数 */
const FILM_EDGE_POINTS = 28

/** 单位轮廓多边形的面积（鞋带公式）——把"物理展开面积"标定为"像素半径"用 */
const FILM_EDGE_UNIT_AREA = (() => {
  const pts: [number, number][] = []
  for (let i = 0; i < FILM_EDGE_POINTS; i++) {
    const a = (i * 2 * Math.PI) / FILM_EDGE_POINTS
    const r = filmEdgeWobble(a)
    pts.push([r * Math.cos(a), r * Math.sin(a)])
  }
  let twice = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    twice += x1 * y2 - x2 * y1
  }
  return Math.abs(twice) / 2
})()

/** 单位轮廓的最大半径（决定缩小时油膜能否装进浅盘） */
const FILM_EDGE_MAX_WOBBLE = (() => {
  let max = 0
  for (let i = 0; i < 720; i++) max = Math.max(max, filmEdgeWobble((i * Math.PI) / 360))
  return max
})()

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

  // 浅盘物理半径标定为 11.5 cm；油膜等效物理半径由展开面积反算
  const filmRadiusCm = Math.sqrt(calcResult.areaCm2 / Math.PI)

  // 每厘米对应的画布像素：先按浅盘标定，若油膜（含边缘起伏）超出浅盘可视范围则整体缩小比例。
  // 必须让「1 cm 方格」与「油膜半径」共用同一个 pxPerCm——否则画出来的格子数与
  // 看板报出的 N 格对不上（极端参数下油膜面积可达 1000+ cm²，旧代码把半径一夹，
  // 图里只剩三百来格，学生一数就和读数打架）。
  const pxPerCm = Math.min(
    dishRadius / 11.5,
    (dishRadius * 0.85) / Math.max(filmRadiusCm * FILM_EDGE_MAX_WOBBLE, 1e-6),
  )
  // 方格板每个方格对应 1.0 cm × 1.0 cm，边长严格等于 pxPerCm
  const cellSize = pxPerCm

  // 油膜多边形面积必须等于物理展开面积：A_px = S(cm²) × (1cm 的像素数)²
  const filmRadius = Math.sqrt(
    (calcResult.areaCm2 * cellSize * cellSize) / FILM_EDGE_UNIT_AREA,
  )

  // 生成真实高考实验特征的不规则单分子油膜平滑多边形轮廓
  const filmPath = useMemo(() => {
    const dPts: [number, number][] = []
    for (let i = 0; i < FILM_EDGE_POINTS; i++) {
      const angle = (i * 2 * Math.PI) / FILM_EDGE_POINTS
      const r = filmRadius * filmEdgeWobble(angle)
      dPts.push([centerX + r * Math.cos(angle), centerY + r * Math.sin(angle)])
    }
    return (
      dPts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`, '') + ' Z'
    )
  }, [centerX, centerY, filmRadius])

  // 生成坐标方格网络（第 3 步方格板）
  const gridCells = useMemo(() => {
    if (step < 3) return []
    const cells: { x: number; y: number; state: 'full' | 'empty'; edgeGap: number }[] = []
    const boardHalf = dishRadius * 0.85

    for (let x = centerX - boardHalf; x + cellSize <= centerX + boardHalf; x += cellSize) {
      for (let y = centerY - boardHalf; y + cellSize <= centerY + boardHalf; y += cellSize) {
        const dx = x + cellSize / 2 - centerX
        const dy = y + cellSize / 2 - centerY
        const dist = Math.hypot(dx, dy)
        // 方格中心落在油膜轮廓内即计为一格（"超过半格算一格"的等价判定）
        const edge = filmRadius * filmEdgeWobble(Math.atan2(dy, dx))
        cells.push({ x, y, state: dist <= edge ? 'full' : 'empty', edgeGap: Math.abs(dist - edge) })
      }
    }

    // 图上数出来的格数必须与看板 N 完全一致：只允许在轮廓边界上增删最接近的几个格，
    // 不允许像旧代码那样用 0.88/1.08 两个魔法系数去近似，那样会多报 17% 的格。
    const target = calcResult.gridCount
    if (target > 0 && target !== cells.filter((c) => c.state === 'full').length) {
      const ranked = [...cells].sort((a, b) => a.edgeGap - b.edgeGap).slice(0, target)
      const counted = new Set(ranked)
      for (const c of cells) c.state = counted.has(c) ? 'full' : 'empty'
    }
    return cells
  }, [step, centerX, centerY, dishRadius, filmRadius, cellSize, calcResult.gridCount])

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
            单滴纯油酸体积 V = 1/(80×500) mL = 2.5×10⁻⁵ mL = 2.5×10⁻¹¹ m³
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
              width={cellSize}
              height={cellSize}
              fill={c.state === 'full' ? withAlpha(PHYSICS_COLORS.velocity, 0.35) : 'none'}
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
          ? `测得油膜有效方格数 N = ${calcResult.gridCount} 格，有效面积 S = ${calcResult.areaCm2.toFixed(1)} cm²，估算分子直径 d = ${(calcResult.moleculeDiameterM * 1e9).toFixed(2)} nm (${(calcResult.moleculeDiameterM * 1e10).toFixed(1)} Å)`
          : '实验核心思想：单分子油膜假设 + 球形分子紧密排列模型'}
      </text>
    </g>
  )
}
