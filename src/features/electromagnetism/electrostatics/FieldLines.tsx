import React, { useRef, useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { radius } from '@/theme/radius'
import { shadow } from '@/theme/shadow'
import { VectorArrow } from '@/components/Physics/VectorArrow'

// 物理与绘图常量
const COULOMB_K = 9e9
const CHARGE_RADIUS = 22
const DESIGN_M_PER_PX = 0.005 // 设计稿基准: 1px = 0.005m
const PROBE_CHARGE = 1e-6 // 探针试探电荷 +1.0 μC

interface Charge {
  x: number
  y: number
  q: number // 电量 μC
}

// 计算某点处的合电场强度 (V/m = N/C)
function electricField(charges: Charge[], px: number, py: number, mPerPx: number) {
  let ex = 0
  let ey = 0
  for (const c of charges) {
    const dx = px - c.x
    const dy = py - c.y
    const rPx = Math.sqrt(dx * dx + dy * dy)
    const rM = Math.max(0.02, rPx * mPerPx) // 防止除零，限制最小物理距离 2cm
    const qSI = c.q * 1e-6
    const mag = (COULOMB_K * qSI) / (rM * rM)
    ex += mag * (dx / rPx)
    ey += mag * (dy / rPx)
  }
  return { ex, ey }
}

// 计算某点处的合电势 (V)
function potential(charges: Charge[], px: number, py: number, mPerPx: number) {
  let v = 0
  for (const c of charges) {
    const dx = px - c.x
    const dy = py - c.y
    const rPx = Math.sqrt(dx * dx + dy * dy)
    const rM = Math.max(0.04, rPx * mPerPx) // 限制最小距离 4cm
    v += (COULOMB_K * c.q * 1e-6) / rM
  }
  return v
}

// 追踪一条电场线路径
function traceFieldLine(
  charges: Charge[],
  sx: number,
  sy: number,
  direction: 1 | -1, // 1=顺场强, -1=逆场强
  w: number,
  h: number,
  mPerPx: number
): { points: [number, number][]; arrowPos: [number, number, number] | null } {
  const points: [number, number][] = [[sx, sy]]
  let x = sx
  let y = sy
  const stepSize = 8 // 追踪步长（像素）
  const maxSteps = 150

  for (let i = 0; i < maxSteps; i++) {
    const { ex, ey } = electricField(charges, x, y, mPerPx)
    const mag = Math.sqrt(ex * ex + ey * ey)
    if (mag < 1e-3) break

    // 沿场强方向步进
    const dx = (direction * ex) / mag
    const dy = (direction * ey) / mag
    x += dx * stepSize
    y += dy * stepSize

    // 越界退出
    if (x < -50 || x > w + 50 || y < -50 || y > h + 50) {
      points.push([x, y])
      break
    }

    // 靠近电荷退出
    let nearCharge = false
    for (const c of charges) {
      const d = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2)
      if (d < CHARGE_RADIUS * 0.9) {
        nearCharge = true
        break
      }
    }
    if (nearCharge) break

    points.push([x, y])
  }

  // 计算中间箭头的绘制位置（大约在路径的 45% 处）
  let arrowPos: [number, number, number] | null = null
  if (points.length > 5) {
    const midIdx = Math.floor(points.length * 0.45)
    const p1 = points[midIdx]
    const p2 = points[midIdx + 1]
    if (p1 && p2) {
      const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0])
      arrowPos = [p1[0], p1[1], angle]
    }
  }

  return { points, arrowPos }
}

export default function FieldLines() {
    const params = useAnimationStore((s) => s.params)
  const updateParam = useAnimationStore((s) => s.updateParam)
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 480 })
  const { font } = canvasSize
  const svgRef = useRef<SVGSVGElement>(null)

  const w = canvasSize.width || 700
  const h = canvasSize.height || 480
  const cx = w / 2
  const cy = h / 2
  const separation = w * (160 / 700) // 响应式间距: 设计稿 700px 宽时为 160px
  const mPerPx = separation > 0 ? 0.8 / separation : DESIGN_M_PER_PX // 保持物理间距 0.8m

  // 从 params 获取控制参数
  const topology = params.topology ?? 2 // 0=单正, 1=单负, 2=等量异种, 3=等量同种
  const qSource = params.qSource ?? 5   // μC
  const showFieldLines = (params.showFieldLines ?? 1) === 1
  const showEquipotentials = (params.showEquipotentials ?? 1) === 1

  const probeX = params.probeX ?? cx
  const probeY = params.probeY ?? 150
  const isDragging = params.isDragging === 1

  // 1. 根据拓扑确定场源电荷配置
  const charges = useMemo<Charge[]>(() => {
    if (topology === 0) {
      return [{ x: cx, y: cy, q: qSource }]
    } else if (topology === 1) {
      return [{ x: cx, y: cy, q: -qSource }]
    } else if (topology === 2) {
      return [
        { x: cx - separation / 2, y: cy, q: qSource },
        { x: cx + separation / 2, y: cy, q: -qSource },
      ]
    } else {
      return [
        { x: cx - separation / 2, y: cy, q: qSource },
        { x: cx + separation / 2, y: cy, q: qSource },
      ]
    }
  }, [topology, qSource, cx, cy, separation])

  // 2. 交互逻辑：试探粒子探针的拖拽
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 检查是否点中探针 (半径 15px，扩大到 30px 热区)
    const dist = Math.sqrt((x - probeX) ** 2 + (y - probeY) ** 2)
    if (dist < 30) {
      svg.setPointerCapture(e.pointerId)
      updateParam('isDragging', 1)
      // 将当前坐标设为拖动起始参考坐标，重置做功
      updateParam('probeStartX', x)
      updateParam('probeStartY', y)
      updateParam('probeX', x)
      updateParam('probeY', y)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    let x = e.clientX - rect.left
    let y = e.clientY - rect.top

    // 画面边界保护
    x = Math.max(15, Math.min(w - 15, x))
    y = Math.max(15, Math.min(h - 15, y))

    // 避碰保护：防止试探电荷与源电荷完全重合（重合时场强和电势趋于无穷大）
    for (const c of charges) {
      const d = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2)
      if (d < CHARGE_RADIUS * 1.0) {
        return // 拒绝进入极近范围
      }
    }

    updateParam('probeX', x)
    updateParam('probeY', y)
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging) {
      updateParam('isDragging', 0)
      svgRef.current?.releasePointerCapture(e.pointerId)
    }
  }

  // 3. 计算电场线路径 (SVG Path)
  const fieldLinesPaths = useMemo(() => {
    if (!showFieldLines) return []

    const paths: { d: string; arrow: [number, number, number] | null; color: string }[] = []

    charges.forEach((ch) => {
      const isPos = ch.q > 0
      const emitAngleCount = 16
      const startRadius = CHARGE_RADIUS + 3
      const color = isPos ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge

      for (let i = 0; i < emitAngleCount; i++) {
        const angle = (i * Math.PI * 2) / emitAngleCount
        const sx = ch.x + Math.cos(angle) * startRadius
        const sy = ch.y + Math.sin(angle) * startRadius

        // 正电荷顺着场强追踪，负电荷逆着场强追踪
        const direction = isPos ? 1 : -1
        let { points, arrowPos } = traceFieldLine(charges, sx, sy, direction, w, h, mPerPx)
        if (points.length < 2) continue

        if (!isPos) {
          // 反转点数组，使电场线方向从外流向负电荷表面
          points = [...points].reverse()
          // 重新计算反转后的箭头方向
          if (points.length > 5) {
            const midIdx = Math.floor(points.length * 0.45)
            const p1 = points[midIdx]
            const p2 = points[midIdx + 1]
            if (p1 && p2) {
              const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0])
              arrowPos = [p1[0], p1[1], angle]
            }
          }
        }

        // 拼接成 path 的 d 属性字符串
        const dStr = points
          .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0].toFixed(1)},${p[1].toFixed(1)}`)
          .join(' ')

        paths.push({ d: dStr, arrow: arrowPos, color })
      }
    })

    return paths
  }, [charges, showFieldLines, w, h, mPerPx])

  // 4. 计算等势线网络 (Marching Squares 生成平滑线段)
  const equipotentialPaths = useMemo(() => {
    if (!showEquipotentials) return { type: 'none', data: [] }

    // 对于单电荷，直接采用精准的圆圈渲染，完美平滑且效率极高
    if (topology === 0 || topology === 1) {
      const paths: { cx: number; cy: number; r: number; opacity: number }[] = []
      const ch = charges[0]
      const count = 10
      // 间距按 1/r 映射以形成密度的渐变
      for (let i = 1; i <= count; i++) {
        const rPx = 30 + i * 28
        // 势能的绝对值决定透明度由深至浅
        const opacity = Math.max(0.1, Math.min(0.65, 0.7 - (i / count) * 0.55))
        paths.push({ cx: ch.x, cy: ch.y, r: rPx, opacity })
      }
      return { type: 'circle', data: paths }
    }

    // 对于双电荷，采用 Marching Squares 算法
    const gridStep = 8
    const cols = Math.floor(w / gridStep)
    const rows = Math.floor(h / gridStep)

    // 预计算整个网格的电势数据
    const gridPotential: number[][] = []
    for (let r = 0; r <= rows; r++) {
      gridPotential[r] = []
      for (let c = 0; c <= cols; c++) {
        gridPotential[r][c] = potential(charges, c * gridStep, r * gridStep, mPerPx)
      }
    }

    // 估算当前场中具有代表性的电势极值
    // 取在电荷表面的电势作为峰值参考
    const pPeak = (9000 * qSource) / 0.05
    const contourPotentials: number[] = []
    const contourCount = 14

    // 生成一系列等势线的目标电压
    // 对于等量异种电荷，电势分布在 -pPeak 到 +pPeak
    if (topology === 2) {
      for (let i = 0; i < contourCount; i++) {
        // 电势差从负到正，避开0V突变
        const t = -1.0 + (2.0 * (i + 0.5)) / contourCount
        contourPotentials.push(pPeak * t * 0.8)
      }
    } else {
      // 等量同种，电势在 0 到 1.5 * pPeak
      for (let i = 0; i < contourCount; i++) {
        const t = (i + 0.5) / contourCount
        contourPotentials.push(pPeak * 1.5 * t * 0.7)
      }
    }

    const paths: { d: string; opacity: number }[] = []

    contourPotentials.forEach((targetV) => {
      let dStr = ''

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v00 = gridPotential[r][c]
          const v10 = gridPotential[r][c + 1]
          const v01 = gridPotential[r + 1][c]
          const v11 = gridPotential[r + 1][c + 1]

          // 避开电荷内部的格点
          const cxCell = (c + 0.5) * gridStep
          const cyCell = (r + 0.5) * gridStep
          let tooClose = false
          for (const ch of charges) {
            if (Math.sqrt((cxCell - ch.x) ** 2 + (cyCell - ch.y) ** 2) < CHARGE_RADIUS * 1.1) {
              tooClose = true
              break
            }
          }
          if (tooClose) continue

          const interp = (a: number, b: number) => gridStep * ((targetV - a) / (b - a))
          const x0 = c * gridStep
          const y0 = r * gridStep

          const pts: [number, number][] = []
          if ((v00 < targetV) !== (v10 < targetV)) pts.push([x0 + interp(v00, v10), y0])
          if ((v10 < targetV) !== (v11 < targetV)) pts.push([x0 + gridStep, y0 + interp(v10, v11)])
          if ((v01 < targetV) !== (v11 < targetV)) pts.push([x0 + interp(v01, v11), y0 + gridStep])
          if ((v00 < targetV) !== (v01 < targetV)) pts.push([x0, y0 + interp(v00, v01)])

          if (pts.length === 2) {
            dStr += ` M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} L ${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)}`
          }
        }
      }

      if (dStr) {
        // 电势的绝对值越大，等势线画得越深
        const relativePot = Math.min(1.0, Math.abs(targetV) / pPeak)
        const opacity = Math.max(0.12, Math.min(0.7, 0.15 + relativePot * 0.55))
        paths.push({ d: dStr, opacity })
      }
    })

    return { type: 'path', data: paths }
  }, [topology, charges, showEquipotentials, qSource, w, h, mPerPx])

  // 5. 探针受力与能量分析
  const probePhysics = useMemo(() => {
    // 探针处的场强
    const { ex, ey } = electricField(charges, probeX, probeY, mPerPx)
    const eMag = Math.sqrt(ex * ex + ey * ey)

    // 电场力 F = qE
    const fMag = eMag * PROBE_CHARGE // 单位 N
    let forceArrow: [number, number] | null = null

    if (eMag > 1e-1) {
      // 归一化方向
      const dx = ex / eMag
      const dy = ey / eMag
      // 力的屏幕显示长度 (35px 到 90px 之间自适应)
      const arrowLen = Math.max(35, Math.min(90, (fMag / 5) * 45 + 35))
      forceArrow = [dx * arrowLen, dy * arrowLen]
    }

    // 计算当前的电势
    const phiCurrent = potential(charges, probeX, probeY, mPerPx)

    // 百分比映射参数
    const pPeak = (9000 * qSource) / 0.05
    const maxPot = (topology === 0 || topology === 3)
      ? pPeak * (topology === 3 ? 1.4 : 1.0)
      : (topology === 2 ? pPeak : 0)
    const minPot = (topology === 1)
      ? -pPeak
      : (topology === 2 ? -pPeak : 0)

    const potRange = maxPot - minPot
    const pctEp = potRange > 0
      ? Math.max(3, Math.min(97, ((phiCurrent - minPot) / potRange) * 100))
      : 50
    const pctEk = 100 - pctEp

    return {
      forceArrow,
      phiCurrent,
      pctEp,
      pctEk,
    }
  }, [charges, probeX, probeY, topology, qSource, mPerPx])



  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* 实时能量堆栈对比图表卡片 (毛玻璃质感) */}
      <div
        className="absolute right-4 bottom-4 z-10 bg-white/80 backdrop-blur-md border border-neutral-200/50 rounded-xl p-3 flex flex-col items-center select-none"
        style={{
          boxShadow: shadow.md,
          borderRadius: radius.lg,
          width: '150px',
        }}
      >
        <span className="font-bold text-neutral-500 mb-2.5" style={{ fontSize: font(10) }}>实时能量分配 (守恒)</span>
        
        {/* 双柱图区域 */}
        <div className="h-28 flex justify-around items-end w-full relative px-2">
          {/* 中间百分比虚线 */}
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-neutral-200 flex justify-between text-neutral-300 font-mono pointer-events-none" style={{ fontSize: font(7.5) }}>
            <span>100%</span>
          </div>
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-neutral-200 flex justify-between text-neutral-300 font-mono pointer-events-none" style={{ fontSize: font(7.5) }}>
            <span>50%</span>
          </div>

          {/* 动能柱 (青色) */}
          <div className="flex flex-col items-center h-full justify-end w-10">
            <div className="w-4 h-full bg-neutral-100/50 border border-neutral-200/30 rounded-full flex items-end overflow-hidden">
              <div
                className="w-full rounded-full transition-all duration-150 ease-out"
                style={{ height: `${probePhysics.pctEk}%`, backgroundColor: PHYSICS_COLORS.kineticEnergy }}
              />
            </div>
            <span className="font-bold mt-1 font-mono" style={{ fontSize: font(10), color: PHYSICS_COLORS.kineticEnergy }}>Ek</span>
            <span className="font-medium" style={{ fontSize: font(8), color: PHYSICS_COLORS.kineticEnergy }}>动能</span>
          </div>

          {/* 势能柱 (紫色) */}
          <div className="flex flex-col items-center h-full justify-end w-10">
            <div className="w-4 h-full bg-neutral-100/50 border border-neutral-200/30 rounded-full flex items-end overflow-hidden">
              <div
                className="w-full rounded-full transition-all duration-150 ease-out"
                style={{ height: `${probePhysics.pctEp}%`, backgroundColor: PHYSICS_COLORS.potentialEnergy }}
              />
            </div>
            <span className="font-bold mt-1 font-mono" style={{ fontSize: font(10), color: PHYSICS_COLORS.potentialEnergy }}>Ep</span>
            <span className="font-medium" style={{ fontSize: font(8), color: PHYSICS_COLORS.potentialEnergy }}>势能</span>
          </div>
        </div>
      </div>

      {/* SVG 动画视口 */}
      <svg
        ref={svgRef}
        width={w}
        height={h}
        className="w-full h-full bg-white block rounded-xl border border-neutral-100 select-none cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >


        {/* 2. 紫色等势面网络层 */}
        {showEquipotentials && (
          <g>
            {equipotentialPaths.type === 'circle' ? (
              // 圆圈渲染模式
              (equipotentialPaths.data as { cx: number; cy: number; r: number; opacity: number }[]).map((p, idx) => (
                <circle
                  key={`eq-circle-${idx}`}
                  cx={p.cx}
                  cy={p.cy}
                  r={p.r}
                  fill="none"
                  stroke={PHYSICS_COLORS.potentialEnergy}
                  strokeWidth={1.2}
                  strokeDasharray="4,4"
                  opacity={p.opacity}
                />
              ))
            ) : (
              // Marching Squares 路径模式
              (equipotentialPaths.data as { d: string; opacity: number }[]).map((p, idx) => (
                <path
                  key={`eq-path-${idx}`}
                  d={p.d}
                  fill="none"
                  stroke={PHYSICS_COLORS.potentialEnergy}
                  strokeWidth={1.2}
                  strokeDasharray="4,4"
                  opacity={p.opacity}
                />
              ))
            )}
          </g>
        )}

        {/* 3. 黄色电场线层 */}
        {showFieldLines && (
          <g>
            {fieldLinesPaths.map((line, idx) => (
              <g key={`ef-line-group-${idx}`}>
                {/* 电场线路径 */}
                <path
                  d={line.d}
                  fill="none"
                  stroke={PHYSICS_COLORS.electricFieldLine}
                  strokeWidth={1.3}
                  opacity={0.75}
                />
                {/* 沿线中部的指示箭头 */}
                {line.arrow && (
                  <polygon
                    points="-5.5,-4 6.5,0 -5.5,4"
                    fill={PHYSICS_COLORS.electricFieldLine}
                    opacity={0.8}
                    transform={`translate(${line.arrow[0]}, ${line.arrow[1]}) rotate(${(line.arrow[2] * 180) / Math.PI})`}
                  />
                )}
              </g>
            ))}
          </g>
        )}

        {/* 4. 场源电荷 */}
        {charges.map((ch, idx) => {
          const isPos = ch.q > 0
          const color = isPos ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge
          return (
            <g key={`source-charge-${idx}`}>
              {/* 电荷外圈立体光晕效果 */}
              <circle
                cx={ch.x}
                cy={ch.y}
                r={CHARGE_RADIUS * 2.2}
                fill={isPos ? 'url(#glow-positive)' : 'url(#glow-negative)'}
                opacity={0.8}
              />
              <circle
                cx={ch.x}
                cy={ch.y}
                r={CHARGE_RADIUS * 1.6}
                fill={color}
                opacity={0.12}
              />
              {/* 实体核心圆球 */}
              <circle
                cx={ch.x}
                cy={ch.y}
                r={CHARGE_RADIUS}
                fill={color}
                stroke="#FFFFFF"
                strokeWidth={1.5}
                className="drop-shadow-sm"
              />
              {/* 符号标注 */}
              <text
                x={ch.x}
                y={ch.y + 0.5}
                fontSize={font(17)}
                fontWeight="bold"
                fill="#FFFFFF"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {isPos ? '+' : '−'}
              </text>
              {/* 电荷电量标签 */}
              <text
                x={ch.x}
                y={ch.y + CHARGE_RADIUS + 15}
                fontSize={font(10.5)}
                fontWeight="bold"
                fill={colors.neutral[600]}
                textAnchor="middle"
              >
                {isPos ? '+' : ''}
                {ch.q.toFixed(1)} μC
              </text>
            </g>
          )
        })}

        {/* 5. 手持式粒子探针 (带虚线交互外圈) */}
        <g>
          {/* 探针拖动把手环 (在拖拽时显示动态放大效果) */}
          <circle
            cx={probeX}
            cy={probeY}
            r={24}
            fill="none"
            stroke={PHYSICS_COLORS.electricForce}
            strokeWidth={1.5}
            strokeDasharray="4,3"
            opacity={isDragging ? 0.9 : 0.4}
            className={isDragging ? 'animate-[spin_12s_linear_infinite]' : ''}
          />
          <circle
            cx={probeX}
            cy={probeY}
            r={15}
            fill="#FFFFFF"
            opacity={0.8}
          />
          {/* 探针核心粒子 (试探正电荷) */}
          <circle
            cx={probeX}
            cy={probeY}
            r={11}
            fill={PHYSICS_COLORS.positiveCharge}
            stroke="#FFFFFF"
            strokeWidth={1.2}
            className="drop-shadow-md"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          />
          <text
            x={probeX}
            y={probeY}
            fontSize={font(12)}
            fontWeight="black"
            fill="#FFFFFF"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ pointerEvents: 'none' }}
          >
            +
          </text>
          <text
            x={probeX}
            y={probeY - 20}
            fontSize={font(9.5)}
            fontWeight="bold"
            fill={PHYSICS_COLORS.labelText}
            textAnchor="middle"
          >
            探针 (1μC)
          </text>

          {/* 6. 探针受到的橙色电场力箭头 */}
          {probePhysics.forceArrow && (
            <g>
              <VectorArrow
                origin={{ x: 0, y: 0 }}
                vector={{ x: probePhysics.forceArrow[0], y: -probePhysics.forceArrow[1] }}
                type="electricForce"
                sceneScale={{ originX: probeX, originY: probeY, scaleX: 1, scaleY: 1, scale: 1, maxVectorLength: 999 }}
                pixelLength={Math.sqrt(probePhysics.forceArrow[0] ** 2 + probePhysics.forceArrow[1] ** 2)}
                strokeWidth={3}
              />
              <text
                x={probeX + probePhysics.forceArrow[0] + (probePhysics.forceArrow[0] >= 0 ? 12 : -12)}
                y={probeY + probePhysics.forceArrow[1] + (probePhysics.forceArrow[1] >= 0 ? 4 : -4)}
                fontSize={font(12)}
                fontWeight="black"
                fill={PHYSICS_COLORS.electricForce}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                F
              </text>
            </g>
          )}
        </g>

        {/* 定义箭头和样式 Defs */}
        <defs>
          {/* 正电荷光晕渐变 */}
          <radialGradient id="glow-positive" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PHYSICS_COLORS.positiveCharge} stopOpacity="0.25" />
            <stop offset="100%" stopColor={PHYSICS_COLORS.positiveCharge} stopOpacity="0" />
          </radialGradient>
          {/* 负电荷光晕渐变 */}
          <radialGradient id="glow-negative" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PHYSICS_COLORS.negativeCharge} stopOpacity="0.25" />
            <stop offset="100%" stopColor={PHYSICS_COLORS.negativeCharge} stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}
