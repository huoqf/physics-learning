import { VectorArrow, EnergyBars } from '@/components/Physics'
import React, { useRef, useMemo } from 'react'
import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { CANVAS_PRESETS } from '@/theme/spacing'

import { useSceneScale } from '@/hooks'

// 物理与绘图常量
const COULOMB_K = 9e9
const CHARGE_RADIUS = 22
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

  // 计算中间箭头的绘制位置（大约在路径 45% 处）
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
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
  const { font } = canvasSize
  const svgRef = useRef<SVGSVGElement>(null)

  const w = preset.width
  const h = preset.height
  const cx = w / 2
  const cy = h / 2
  const separation = 160 // 设计稿中固定的极板/电荷间距像素值
  const mPerPx = 0.8 / separation // 保持物理间距 0.8m

  // 从 params 获取控制参数
  const topology = params.topology ?? 2 // 0=单正, 1=单负, 2=等量异种, 3=等量同种
  const qSource = params.qSource ?? 5   // μC
  const showFieldLines = (params.showFieldLines ?? 1) === 1
  const showEquipotentials = (params.showEquipotentials ?? 1) === 1

  const probeX = params.probeX ?? cx
  const probeY = params.probeY ?? 150
  const isDragging = params.isDragging === 1

  // 1. 根据拓扑确定场源电荷配置 (使用设计坐标)
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

  // 场景缩放（用于 VectorArrow 的 originPixel 模式）
  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'custom',
    customOriginX: 0,
    customOriginY: 0,
    customScaleX: 1,
    customScaleY: 1,
  })

  // 2. 交互逻辑：将屏幕坐标映射到设计坐标
  const clientToDesign = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const svgPt = pt.matrixTransform(ctm.inverse())
    return {
      x: (svgPt.x - vp.tx) / vp.scale,
      y: (svgPt.y - vp.ty) / vp.scale,
    }
  }

  // 指针事件绑定（AnimationSvgCanvas 仅支持 mouse events，需手动绑定 pointer events）
  React.useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const onPointerDown = (e: PointerEvent) => {
      const pt = clientToDesign(e.clientX, e.clientY)
      if (!pt) return
      const { x, y } = pt

      const dist = Math.sqrt((x - probeX) ** 2 + (y - probeY) ** 2)
      if (dist < 30) {
        svg.setPointerCapture(e.pointerId)
        updateParam('isDragging', 1)
        updateParam('probeStartX', x)
        updateParam('probeStartY', y)
        updateParam('probeX', x)
        updateParam('probeY', y)
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      const pt = clientToDesign(e.clientX, e.clientY)
      if (!pt) return

      const x = Math.max(15, Math.min(w - 15, pt.x))
      const y = Math.max(15, Math.min(h - 15, pt.y))

      for (const c of charges) {
        const d = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2)
        if (d < CHARGE_RADIUS * 1.0) {
          return
        }
      }

      updateParam('probeX', x)
      updateParam('probeY', y)
    }

    const onPointerUp = (e: PointerEvent) => {
      if (isDragging) {
        updateParam('isDragging', 0)
        svg.releasePointerCapture(e.pointerId)
      }
    }

    svg.addEventListener('pointerdown', onPointerDown)
    svg.addEventListener('pointermove', onPointerMove)
    svg.addEventListener('pointerup', onPointerUp)
    return () => {
      svg.removeEventListener('pointerdown', onPointerDown)
      svg.removeEventListener('pointermove', onPointerMove)
      svg.removeEventListener('pointerup', onPointerUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clientToDesign reads svgRef.current which is stable
  }, [isDragging, probeX, probeY, charges, w, h, vp.tx, vp.ty, vp.scale, updateParam])

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

        const direction = isPos ? 1 : -1
        let { points, arrowPos } = traceFieldLine(charges, sx, sy, direction, w, h, mPerPx)
        if (points.length < 2) continue

        if (!isPos) {
          points = [...points].reverse()
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

        const dStr = points
          .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0].toFixed(1)},${p[1].toFixed(1)}`)
          .join(' ')

        paths.push({ d: dStr, arrow: arrowPos, color })
      }
    })

    return paths
  }, [charges, showFieldLines, w, h, mPerPx])

  // 4. 计算等势线网络
  const equipotentialPaths = useMemo(() => {
    if (!showEquipotentials) return { type: 'none', data: [] }

    if (topology === 0 || topology === 1) {
      const paths: { cx: number; cy: number; r: number; opacity: number }[] = []
      const ch = charges[0]
      const count = 10
      for (let i = 1; i <= count; i++) {
        const rPx = 30 + i * 28
        const opacity = Math.max(0.1, Math.min(0.65, 0.7 - (i / count) * 0.55))
        paths.push({ cx: ch.x, cy: ch.y, r: rPx, opacity })
      }
      return { type: 'circle', data: paths }
    }

    const gridStep = 8
    const cols = Math.floor(w / gridStep)
    const rows = Math.floor(h / gridStep)

    const gridPotential: number[][] = []
    for (let r = 0; r <= rows; r++) {
      gridPotential[r] = []
      for (let c = 0; c <= cols; c++) {
        gridPotential[r][c] = potential(charges, c * gridStep, r * gridStep, mPerPx)
      }
    }

    const pPeak = (9000 * qSource) / 0.05
    const contourPotentials: number[] = []
    const contourCount = 14

    if (topology === 2) {
      for (let i = 0; i < contourCount; i++) {
        const t = -1.0 + (2.0 * (i + 0.5)) / contourCount
        contourPotentials.push(pPeak * t * 0.8)
      }
    } else {
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
        const relativePot = Math.min(1.0, Math.abs(targetV) / pPeak)
        const opacity = Math.max(0.12, Math.min(0.7, 0.15 + relativePot * 0.55))
        paths.push({ d: dStr, opacity })
      }
    })

    return { type: 'path', data: paths }
  }, [topology, charges, showEquipotentials, qSource, w, h, mPerPx])

  // 5. 探针受力与能量分析
  const probePhysics = useMemo(() => {
    const { ex, ey } = electricField(charges, probeX, probeY, mPerPx)
    const eMag = Math.sqrt(ex * ex + ey * ey)

    const fMag = eMag * PROBE_CHARGE // 单位 N
    let forceArrow: [number, number] | null = null

    if (eMag > 1e-1) {
      const dx = ex / eMag
      const dy = ey / eMag
      const arrowLen = Math.max(35, Math.min(90, (fMag / 5) * 45 + 35))
      forceArrow = [dx * arrowLen, dy * arrowLen]
    }

    const phiCurrent = potential(charges, probeX, probeY, mPerPx)

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
    <div className="w-full h-full relative">
      {/* 实时能量分配卡片 */}
      <div className="absolute right-4 bottom-4 z-10" style={{ width: '150px' }}>
        <EnergyBars
          items={[
            { key: 'Ek', label: 'Ek', value: probePhysics.pctEk, color: PHYSICS_COLORS.kineticEnergy },
            { key: 'Ep', label: 'Ep', value: probePhysics.pctEp, color: PHYSICS_COLORS.potentialEnergy },
          ]}
          title="实时能量分配"
          font={font}
        />
      </div>

      <AnimationSvgCanvas
        containerRef={containerRef}
        transform={vp.transform}
        svgRef={svgRef}
        className="bg-white rounded-xl border border-neutral-100 cursor-crosshair"
      >
        <defs>
          <radialGradient id="glow-positive" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PHYSICS_COLORS.positiveCharge} stopOpacity="0.25" />
            <stop offset="100%" stopColor={PHYSICS_COLORS.positiveCharge} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glow-negative" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PHYSICS_COLORS.negativeCharge} stopOpacity="0.25" />
            <stop offset="100%" stopColor={PHYSICS_COLORS.negativeCharge} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. 紫色等势面网络层 */}
        {showEquipotentials && (
          <g>
            {equipotentialPaths.type === 'circle' ? (
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

        {/* 2. 黄色电场线层 */}
        {showFieldLines && (
          <g>
            {fieldLinesPaths.map((line, idx) => (
              <g key={`ef-line-group-${idx}`}>
                <path
                  d={line.d}
                  fill="none"
                  stroke={PHYSICS_COLORS.electricFieldLine}
                  strokeWidth={1.3}
                  opacity={0.75}
                />
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

        {/* 3. 场源电荷 */}
        {charges.map((ch, idx) => {
          const isPos = ch.q > 0
          const color = isPos ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge
          return (
            <g key={`source-charge-${idx}`}>
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
              <circle
                cx={ch.x}
                cy={ch.y}
                r={CHARGE_RADIUS}
                fill={color}
                stroke={colors.neutral.white}
                strokeWidth={1.5}
                className="drop-shadow-sm"
              />
              <text
                x={ch.x}
                y={ch.y + 0.5}
                fontSize={font(17)}
                fontWeight="bold"
                fill={colors.neutral.white}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {isPos ? '+' : '−'}
              </text>
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

        {/* 4. 手持式粒子探针 */}
        <g>
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
            fill={colors.neutral.white}
            opacity={0.8}
          />
          <circle
            cx={probeX}
            cy={probeY}
            r={11}
            fill={PHYSICS_COLORS.positiveCharge}
            stroke={colors.neutral.white}
            strokeWidth={1.2}
            className="drop-shadow-md"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          />
          <text
            x={probeX}
            y={probeY}
            fontSize={font(12)}
            fontWeight="black"
            fill={colors.neutral.white}
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

          {/* 5. 探针受到的橙色电场力箭头 */}
          {probePhysics.forceArrow && (
            <g>
              <VectorArrow
                originPixel={{ x: probeX, y: probeY }}
                vector={{ x: probePhysics.forceArrow[0], y: -probePhysics.forceArrow[1] }}
                type="electricForce"
                sceneScale={sceneScale}
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
      </AnimationSvgCanvas>
    </div>
  )
}
