import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateElectricField } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE, CHART_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

const COULOMB_K = 9e9

interface Point {
  x: number
  y: number
}

interface Charge {
  x: number
  y: number
  q: number // 单位 μC
}

// ---------------------------------------------------------------------
// 辅助函数：背景几何电场线追踪
// ---------------------------------------------------------------------
function traceSingleFieldLine(
  charges: Charge[],
  sx: number,
  sy: number,
  stepSign: number, // 1 = 顺场强(正电荷出发), -1 = 逆场强(负电荷出发)
  w: number,
  h: number
): Point[] {
  const pts: Point[] = [{ x: sx, y: sy }]
  let cx = sx
  let cy = sy
  const step = 8
  const maxSteps = 100

  for (let i = 0; i < maxSteps; i++) {
    let ex = 0
    let ey = 0
    let nearCharge = false

    for (const c of charges) {
      const dx = cx - c.x
      const dy = cy - c.y
      const r2 = dx * dx + dy * dy

      // 过于靠近某个电荷表面
      if (r2 < 400) { // 20px 半径的平方是 400
        if (i > 1) {
          nearCharge = true
          break
        }
      }

      const r = Math.sqrt(r2)
      if (r > 0.1) {
        // e 场强贡献 (采用简化比例用于几何线方向计算)
        const mag = c.q / r2
        ex += mag * (dx / r)
        ey += mag * (dy / r)
      }
    }

    if (nearCharge) break

    const eMag = Math.sqrt(ex * ex + ey * ey)
    if (eMag < 1e-6) break // 极点

    // 沿场强走
    cx += stepSign * (ex / eMag) * step
    cy += stepSign * (ey / eMag) * step

    // 越界限制
    if (cx < -50 || cx > w + 50 || cy < -50 || cy > h + 50) {
      pts.push({ x: cx, y: cy })
      break
    }

    pts.push({ x: cx, y: cy })
  }
  return pts
}

export default function ElectricField() {
    const {params, showFormulas, showGrid} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    showFormulas: s.showFormulas,
    showGrid: s.showGrid,
    }))
  )
  const updateParam = useAnimationStore((s) => s.updateParam)
  
  // 教学模式：0 = 基础单电荷，1 = 进阶双电荷
  const mode = params.mode ?? 0
  const qTest = params.qTest ?? 1.0 // 试探电荷电量 μC
  const rTest = params.rTest ?? 3.0 // 试探电荷距离 cm
  const showFieldLines = (params.showFieldLines ?? 1) === 1

  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 480 })
  const svgRef = useRef<SVGSVGElement>(null)

  const w = canvasSize.width
  const h = canvasSize.height
  const centerY = h / 2
  const pxPerCm = w / 20 // 20cm 跨满画布，700px 时恰好 35 px/cm

  // 基础模式下的物理区域源电荷中心 (位于偏左)
  const cx = w * 0.3
  const cy = centerY

  // 进阶模式下的两个固定源电荷位置
  const cx1 = w * 0.22
  const cy1 = centerY
  const cx2 = w * 0.52
  const cy2 = centerY

  // 试探电荷的实际像素坐标
  const [testX, setTestX] = useState(cx + rTest * pxPerCm)
  const [testY, setTestY] = useState(cy)
  const [isDragging, setIsDragging] = useState(false)

  // ---------------------------------------------------------------------
  // 源电荷与电量配置
  // ---------------------------------------------------------------------
  // 基础模式下的源电荷电量 Q (μC)
  const qSource = params.q ?? 5.0
  
  // 进阶模式下的电荷配置：0=异种, 1=同正, 2=同负
  const chargeConfig = params.chargeConfig ?? 0
  const q1 = chargeConfig === 2 ? -5.0 : 5.0
  const q2 = chargeConfig === 0 ? -5.0 : (chargeConfig === 2 ? -5.0 : 5.0)

  // ---------------------------------------------------------------------
  // 监听滑块参数更新 (非拖拽状态下同步 P 点位置)
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!isDragging) {
      if (mode === 0) {
        setTestX(cx + rTest * pxPerCm)
        setTestY(cy)
      } else {
        const midX = (cx1 + cx2) / 2
        const midY = (cy1 + cy2) / 2
        // 在进阶模式下，rTest 代表试探点到连线中点的水平距离
        setTestX(midX + rTest * pxPerCm)
        setTestY(midY)
      }
    }
  }, [rTest, mode, cx, cy, cx1, cx2, cy1, cy2, isDragging])

  // ---------------------------------------------------------------------
  // 物理计算：场强与静电力
  // ---------------------------------------------------------------------
  // 1. 基础模式下
  const basicPhysics = useMemo(() => {
    const dx = testX - cx
    const dy = cy - testY // 物理 y 轴向上为正
    const distPx = Math.sqrt(dx * dx + dy * dy)
    const distCm = distPx / pxPerCm
    const distM = distCm * 0.01

    const qSI = qSource * 1e-6
    const qTestSI = qTest * 1e-6

    // 计算场强大小
    const { E } = calculateElectricField(COULOMB_K, Math.abs(qSI), Math.max(0.005, distM))
    
    // 场强矢量方向
    const angle = Math.atan2(dy, dx)
    const dirFactor = qSource >= 0 ? 1 : -1
    const Ex = E * dirFactor * Math.cos(angle)
    const Ey = E * dirFactor * Math.sin(angle)

    // 电场力矢量
    const Fx = qTestSI * Ex
    const Fy = qTestSI * Ey
    const F = Math.sqrt(Fx * Fx + Fy * Fy)

    return { distCm, distM, E, Ex, Ey, F, Fx, Fy }
  }, [testX, testY, cx, cy, qSource, qTest, pxPerCm])

  // 2. 进阶模式下
  const advancedPhysics = useMemo(() => {
    // 电荷 1
    const dx1 = testX - cx1
    const dy1 = cy1 - testY
    const r1Px = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    const r1M = Math.max(0.2, r1Px / pxPerCm) * 0.01 // 防止过于靠近除零
    const E1_val = calculateElectricField(COULOMB_K, Math.abs(q1 * 1e-6), r1M).E
    const angle1 = Math.atan2(dy1, dx1)
    const dir1 = q1 >= 0 ? 1 : -1
    const E1x = E1_val * dir1 * Math.cos(angle1)
    const E1y = E1_val * dir1 * Math.sin(angle1)

    // 电荷 2
    const dx2 = testX - cx2
    const dy2 = cy2 - testY
    const r2Px = Math.sqrt(dx2 * dx2 + dy2 * dy2)
    const r2M = Math.max(0.2, r2Px / pxPerCm) * 0.01
    const E2_val = calculateElectricField(COULOMB_K, Math.abs(q2 * 1e-6), r2M).E
    const angle2 = Math.atan2(dy2, dx2)
    const dir2 = q2 >= 0 ? 1 : -1
    const E2x = E2_val * dir2 * Math.cos(angle2)
    const E2y = E2_val * dir2 * Math.sin(angle2)

    // 合场强
    const Ex = E1x + E2x
    const Ey = E1y + E2y
    const E = Math.sqrt(Ex * Ex + Ey * Ey)

    // 合力
    const qTestSI = qTest * 1e-6
    const Fx = qTestSI * Ex
    const Fy = qTestSI * Ey
    const F = Math.sqrt(Fx * Fx + Fy * Fy)

    const midX = (cx1 + cx2) / 2
    const midY = (cy1 + cy2) / 2
    const distCm = Math.sqrt((testX - midX) ** 2 + (testY - midY) ** 2) / pxPerCm

    return { E1x, E1y, E2x, E2y, Ex, Ey, E, F, Fx, Fy, distCm }
  }, [testX, testY, cx1, cy1, cx2, cy2, q1, q2, qTest, pxPerCm])

  // ---------------------------------------------------------------------
  // 鼠标拖拽事件处理
  // ---------------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 检查是否点中试探电荷 P (半径 12px，扩大热区到 24px)
    const dist = Math.sqrt((x - testX) ** 2 + (y - testY) ** 2)
    if (dist < 24) {
      setIsDragging(true)
      svg.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    let x = e.clientX - rect.left
    let y = e.clientY - rect.top

    // 物理边界限制，防止拖拽出画面外
    x = Math.max(15, Math.min(w - 15, x))
    y = Math.max(15, Math.min(h - 15, y))

    // 限制在各自模式下的物理区域中，且不要与源电荷完全重合
    if (mode === 0) {
      // 基础模式限制在左侧区域
      x = Math.min(w * 0.58, x)
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (d < 18) return // 防止重合
      
      setTestX(x)
      setTestY(y)

      const distCm = d / pxPerCm
      const clampedCm = Math.max(1.0, Math.min(6.0, distCm))
      updateParam('rTest', clampedCm)
    } else {
      // 进阶模式限制在整宽
      const d1 = Math.sqrt((x - cx1) ** 2 + (y - cy1) ** 2)
      const d2 = Math.sqrt((x - cx2) ** 2 + (y - cy2) ** 2)
      if (d1 < 18 || d2 < 18) return // 防止与两个源电荷重合

      setTestX(x)
      setTestY(y)

      const midX = (cx1 + cx2) / 2
      const midY = (cy1 + cy2) / 2
      const distCm = Math.sqrt((x - midX) ** 2 + (y - midY) ** 2) / pxPerCm
      const clampedCm = Math.max(0.1, Math.min(8.0, distCm))
      updateParam('rTest', clampedCm)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging) {
      setIsDragging(false)
      svgRef.current?.releasePointerCapture(e.pointerId)
    }
  }

  // ---------------------------------------------------------------------
  // 矢量箭头在 Canvas/SVG 中的坐标映射与几何闭合计算
  // ---------------------------------------------------------------------
  // 构造虚拟 SceneConfig 适配 VectorArrow
  const basicScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: w, height: h },
    originX: 0,
    originY: 0,
  }
  const sceneScale = createSceneScale(basicScene)

  // 1. 基础模式箭头
  const basicArrows = useMemo(() => {
    const { Ex, Ey, Fx, Fy, E, F } = basicPhysics
    if (E < 1e-9) return null

    // 场强 E 像素长度：使用对数+线性缓冲，在 1.0~6.0cm 下长度优雅限制在 35~80px
    const eLen = Math.max(25, Math.min(85, (E / 5e7) * 20 + 35))
    
    // 力 F 像素长度：正比于 qTest 大小，且和 E 独立
    // 为体现对比，在 qTest = 2.0 时，F 长度达到 100px。qTest = 0 时，长度为 0
    const fLen = qTest === 0 ? 0 : Math.max(20, Math.min(110, (F / 10) * 12 + 35))

    return {
      vectorE: { x: Ex, y: Ey },
      pixelLenE: eLen,
      vectorF: { x: Fx, y: Fy },
      pixelLenF: fLen,
    }
  }, [basicPhysics, qTest])

  // 2. 进阶模式箭头 (要求分矢量与合矢量在像素上几何闭合，构成完美的平行四边形)
  const advancedArrows = useMemo(() => {
    const { E1x, E1y, E2x, E2y, Ex, Ey, Fx, Fy } = advancedPhysics
    
    // 为了使 $\vec{E}_1 + \vec{E}_2 = \vec{E}_{net}$ 在屏幕上绝对闭合，
    // 我们必须计算统一的像素缩放因子。
    // 我们让三个场强分量中最大的那个物理分量，映射到最大 85px 长度的屏幕像素上。
    const maxE = Math.max(
      Math.sqrt(E1x * E1x + E1y * E1y),
      Math.sqrt(E2x * E2x + E2y * E2y),
      Math.sqrt(Ex * Ex + Ey * Ey)
    )
    const scale = maxE > 1e-9 ? Math.min(1.2e-6, 75 / maxE) : 1.2e-6

    // 得到屏幕上的分量像素长度
    const pxE1 = { x: E1x * scale, y: E1y * scale }
    const pxE2 = { x: E2x * scale, y: E2y * scale }
    const pxEnet = { x: Ex * scale, y: Ey * scale }

    const lenE1 = Math.sqrt(pxE1.x * pxE1.x + pxE1.y * pxE1.y)
    const lenE2 = Math.sqrt(pxE2.x * pxE2.x + pxE2.y * pxE2.y)
    const lenEnet = Math.sqrt(pxEnet.x * pxEnet.x + pxEnet.y * pxEnet.y)

    // 力 F 矢量单独缩放
    const F_mag = Math.sqrt(Fx * Fx + Fy * Fy)
    const lenF = qTest === 0 ? 0 : Math.max(20, Math.min(100, (F_mag / 10) * 10 + 35))

    // 辅助平行四边形虚线的顶点坐标 (Canvas 坐标系，y轴向下)
    // 分别连结分矢量终点和合矢量终点
    const e1Tip = { x: testX + pxE1.x, y: testY - pxE1.y }
    const e2Tip = { x: testX + pxE2.x, y: testY - pxE2.y }
    const enetTip = { x: testX + pxEnet.x, y: testY - pxEnet.y }

    return {
      vectorE1: { x: E1x, y: E1y },
      lenE1,
      vectorE2: { x: E2x, y: E2y },
      lenE2,
      vectorEnet: { x: Ex, y: Ey },
      lenEnet,
      vectorF: { x: Fx, y: Fy },
      lenF,
      e1Tip,
      e2Tip,
      enetTip,
    }
  }, [advancedPhysics, testX, testY, qTest])

  // ---------------------------------------------------------------------
  // 背景电场线 SVG Path 计算 (仅当参数/模式变化时更新)
  // ---------------------------------------------------------------------
  const fieldLinesPaths = useMemo(() => {
    if (!showFieldLines) return []

    if (mode === 0) {
      // 1. 基础模式：16 方向放射状直线
      const paths: string[] = []
      const dirCount = 16
      const rInner = 20
      const rOuter = 220
      const pos = qSource >= 0

      for (let i = 0; i < dirCount; i++) {
        const a = (i * Math.PI * 2) / dirCount
        const cos = Math.cos(a)
        const sin = Math.sin(a)

        const x1 = cx + cos * (pos ? rInner : rOuter)
        const y1 = cy + sin * (pos ? rInner : rOuter)
        const x2 = cx + cos * (pos ? rOuter : rInner)
        const y2 = cy + sin * (pos ? rOuter : rInner)

        paths.push(`M ${x1.toFixed(1)},${y1.toFixed(1)} L ${x2.toFixed(1)},${y2.toFixed(1)}`)
      }
      return paths
    } else {
      // 2. 进阶模式：双电荷场强线
      const paths: string[] = []
      const charges: Charge[] = [
        { x: cx1, y: cy1, q: q1 },
        { x: cx2, y: cy2, q: q2 },
      ]

      const emitFromCharge = (ch: Charge, isPos: boolean, numLines = 12) => {
        const stepSign = isPos ? 1 : -1
        for (let i = 0; i < numLines; i++) {
          const angle = (Math.PI * 2 * i) / numLines
          // 从电荷表面出发
          const sx = ch.x + 22 * Math.cos(angle)
          const sy = ch.y + 22 * Math.sin(angle)

          let linePoints = traceSingleFieldLine(charges, sx, sy, stepSign, w, h)
          if (linePoints.length > 2) {
            // 对负电荷发射的电场线，倒序使得线条方向从外流向电荷表面 (末端 marker 刚好指向负电荷)
            if (!isPos) {
              linePoints.reverse()
            }
            const d = linePoints.map((p, idx) => 
              (idx === 0 ? 'M' : 'L') + ` ${p.x.toFixed(1)},${p.y.toFixed(1)}`
            ).join(' ')
            paths.push(d)
          }
        }
      }

      // 等量异种：主要由正电荷发射即可
      // 等量同种：两边都需要发射
      if (chargeConfig === 0) {
        // 异种：左边正，右边负。左边发射，部分流向右边，部分出界
        emitFromCharge(charges[0], q1 > 0, 16)
      } else {
        // 同种：两边同为正或同为负
        emitFromCharge(charges[0], q1 > 0, 12)
        emitFromCharge(charges[1], q2 > 0, 12)
      }

      return paths
    }
  }, [mode, qSource, q1, q2, chargeConfig, showFieldLines, cx, cy, cx1, cy1, cx2, cy2, w, h])

  // ---------------------------------------------------------------------
  // 图像数据与坐标映射 (仅在基础模式下)
  // ---------------------------------------------------------------------
  const chartProps = useMemo(() => {
    if (mode !== 0) return null

    // 图像布局
    const chartW = w * 0.16
    const chartH = h * 0.3
    const bottomY_E = h * 0.42
    const bottomY_F = h * 0.84
    const topY_E = bottomY_E - chartH
    const topY_F = bottomY_F - chartH
    const chartLeft = w * 0.7

    // 物理参数范围
    const rMin = 1.0 // cm
    const rMax = 6.0 // cm

    // 坐标映射
    const toX = (rVal: number) => chartLeft + ((rVal - rMin) / (rMax - rMin)) * chartW

    // 电场场强最大最小值定义 (在 r = 1.2cm 处截断以获得平缓曲线)
    const qSI = Math.abs(qSource * 1e-6)
    const { E: eMax } = calculateElectricField(COULOMB_K, qSI, 1.2 * 0.01)
    const toYE = (eVal: number) => {
      const clamped = Math.min(eVal, eMax)
      return bottomY_E - (clamped / eMax) * chartH
    }

    // 电场力纵轴以固定的最大电量 qTest = 2.0uC 计算量程上限，保证滑块拉动时曲线高度稳定，只移动标注点
    const fMax = eMax * 2.0 * 1e-6
    const toYF = (fVal: number) => {
      const clamped = Math.min(fVal, fMax)
      return bottomY_F - (clamped / fMax) * chartH
    }

    // 曲线点生成
    const points: { r: number; E: number; F: number }[] = []
    const step = 0.1
    for (let r = rMin; r <= rMax + 0.01; r += step) {
      const rSI = r * 0.01
      const { E } = calculateElectricField(COULOMB_K, qSI, rSI)
      const F = E * Math.abs(qTest) * 1e-6
      points.push({ r, E, F })
    }

    // 生成 SVG Path 字符串
    const pathE = points.map((p, idx) => 
      `${idx === 0 ? 'M' : 'L'} ${toX(p.r).toFixed(1)},${toYE(p.E).toFixed(1)}`
    ).join(' ')

    const pathF = points.map((p, idx) => 
      `${idx === 0 ? 'M' : 'L'} ${toX(p.r).toFixed(1)},${toYF(p.F).toFixed(1)}`
    ).join(' ')

    return {
      chartW,
      chartH,
      chartLeft,
      bottomY_E,
      bottomY_F,
      topY_E,
      topY_F,
      toX,
      toYE,
      toYF,
      pathE,
      pathF,
      eMax,
      fMax,
    }
  }, [mode, qSource, qTest, w, h])

  // ---------------------------------------------------------------------
  // 辅助网格环与线
  // ---------------------------------------------------------------------
  const gridLines = useMemo(() => {
    if (!showGrid) return null

    const lines: React.ReactNode[] = []
    if (mode === 0) {
      // 基础模式以源电荷为中心的 4 层同心环
      for (let i = 1; i <= 5; i++) {
        lines.push(
          <circle
            key={`ring-${i}`}
            cx={cx}
            cy={cy}
            r={i * pxPerCm}
            fill="none"
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={CANVAS_STYLE.stroke.grid}
            strokeDasharray={CANVAS_STYLE.dash.axis.join(' ')}
          />
        )
      }
    } else {
      // 进阶模式下采用矩形平面虚线网格
      const gridSpacing = 40
      for (let gx = 0; gx < w; gx += gridSpacing) {
        lines.push(
          <line
            key={`gx-${gx}`}
            x1={gx}
            y1={0}
            x2={gx}
            y2={h}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={CANVAS_STYLE.stroke.grid}
            strokeDasharray={CANVAS_STYLE.dash.axis.join(' ')}
          />
        )
      }
      for (let gy = 0; gy < h; gy += gridSpacing) {
        lines.push(
          <line
            key={`gy-${gy}`}
            x1={0}
            y1={gy}
            x2={w}
            y2={gy}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={CANVAS_STYLE.stroke.grid}
            strokeDasharray={CANVAS_STYLE.dash.axis.join(' ')}
          />
        )
      }
    }
    return lines
  }, [showGrid, mode, cx, cy, w, h, pxPerCm])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        ref={svgRef}
        width={w}
        height={h}
        className="bg-white rounded-lg shadow-inner select-none cursor-crosshair block"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* 1. 坐标背景与辅助网格 */}
        {gridLines}

        {/* 2. 背景电场线图辅助 */}
        {fieldLinesPaths.map((d, idx) => (
          <path
            key={`field-line-${idx}`}
            d={d}
            stroke={PHYSICS_COLORS.electricFieldLine}
            strokeWidth={1.2}
            strokeDasharray="4,4"
            fill="none"
            markerEnd="url(#arrow-efield)"
            opacity={0.3}
          />
        ))}

        {/* 3. 基础模式下的物理粒子与图表 */}
        {mode === 0 && (
          <g>
            {/* 物理场景分隔线 */}
            <line
              x1={w * 0.6}
              y1={20}
              x2={w * 0.6}
              y2={h - 20}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={1}
              strokeDasharray="5,5"
            />

            {/* 大源电荷 Q */}
            <circle
              cx={cx}
              cy={cy}
              r={24}
              fill={qSource >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
              stroke={PHYSICS_COLORS.objectStroke}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            <text
              x={cx}
              y={cy + 7}
              fontSize="22"
              fill={colors.neutral.white}
              textAnchor="middle"
              fontWeight="bold"
            >
              {qSource >= 0 ? '+' : '−'}
            </text>
            <text
              x={cx}
              y={cy - 30}
              fontSize={CANVAS_STYLE.font.labelSize}
              fill={PHYSICS_COLORS.labelText}
              textAnchor="middle"
              fontWeight="bold"
            >
              源电荷 Q = {qSource > 0 ? '+' : ''}{qSource.toFixed(1)} μC
            </text>

            {/* 试探电荷 P */}
            <circle
              cx={testX}
              cy={testY}
              r={12}
              fill={qTest > 0 ? PHYSICS_COLORS.positiveCharge : (qTest < 0 ? PHYSICS_COLORS.negativeCharge : colors.neutral[300])}
              stroke={isDragging ? PHYSICS_COLORS.electricForce : PHYSICS_COLORS.objectStroke}
              strokeWidth={isDragging ? 2.5 : CANVAS_STYLE.stroke.objectLine}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            />
            <text
              x={testX}
              y={testY + 4}
              fontSize="12"
              fill={qTest === 0 ? colors.neutral[800] : colors.neutral.white}
              textAnchor="middle"
              fontWeight="bold"
            >
              {qTest > 0 ? '+' : (qTest < 0 ? '−' : '0')}
            </text>
            <text
              x={testX}
              y={testY - 18}
              fontSize={CANVAS_STYLE.font.axisSize}
              fill={PHYSICS_COLORS.labelText}
              textAnchor="middle"
            >
              q = {qTest > 0 ? '+' : ''}{qTest.toFixed(1)} μC
            </text>

            {/* 基础模式下的 E / F 矢量箭头 */}
            {basicArrows && (
              <g>
                {/* 场强 E (黄色) */}
                <VectorArrow
                  origin={{ x: testX, y: -testY }}
                  vector={basicArrows.vectorE}
                  type="electricField"
                  sceneScale={sceneScale}
                  pixelLength={basicArrows.pixelLenE}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                />
                <text
                  x={testX + (basicArrows.vectorE.x >= 0 ? 1 : -1) * (basicArrows.pixelLenE + 14)}
                  y={testY - (basicArrows.vectorE.y >= 0 ? 1 : -1) * 6 + 4}
                  fontSize={CANVAS_STYLE.font.labelSize}
                  fill={PHYSICS_COLORS.electricField}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  E
                </text>

                {/* 静电力 F (橙色, 仅在 qTest !== 0 时绘制) */}
                {qTest !== 0 && (
                  <>
                    <VectorArrow
                      origin={{ x: testX, y: -testY }}
                      vector={basicArrows.vectorF}
                      type="electricForce"
                      sceneScale={sceneScale}
                      pixelLength={basicArrows.pixelLenF}
                      strokeWidth={CANVAS_STYLE.stroke.vectorMain + 0.5}
                    />
                    <text
                      x={testX + (basicArrows.vectorF.x >= 0 ? 1 : -1) * (basicArrows.pixelLenF + 14)}
                      y={testY - (basicArrows.vectorF.y >= 0 ? 1 : -1) * 6 + 18}
                      fontSize={CANVAS_STYLE.font.labelSize}
                      fill={PHYSICS_COLORS.electricForce}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      F
                    </text>
                  </>
                )}
              </g>
            )}

            {/* 4. 对比图表渲染 */}
            {chartProps && (
              <g>
                {/* E-r 图表 */}
                <g>
                  {/* 外边框 */}
                  <rect
                    x={chartProps.chartLeft}
                    y={chartProps.topY_E - 15}
                    width={chartProps.chartW + 15}
                    height={chartProps.chartH + 30}
                    fill="white"
                    stroke={CHART_COLORS.axisLine}
                    rx={4}
                  />
                  <text
                    x={chartProps.chartLeft + chartProps.chartW / 2 + 5}
                    y={chartProps.topY_E - 4}
                    fontSize="10"
                    fill={CHART_COLORS.titleText}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    E-r 场强曲线
                  </text>
                  <line
                    x1={chartProps.chartLeft}
                    y1={chartProps.topY_E}
                    x2={chartProps.chartLeft}
                    y2={chartProps.bottomY_E}
                    stroke={CHART_COLORS.axisLine}
                    strokeWidth={1.5}
                  />
                  <line
                    x1={chartProps.chartLeft}
                    y1={chartProps.bottomY_E}
                    x2={chartProps.chartLeft + chartProps.chartW}
                    y2={chartProps.bottomY_E}
                    stroke={CHART_COLORS.axisLine}
                    strokeWidth={1.5}
                  />
                  <text
                    x={chartProps.chartLeft + chartProps.chartW}
                    y={chartProps.bottomY_E + 12}
                    fontSize="8"
                    fill={CHART_COLORS.labelText}
                    textAnchor="end"
                  >
                    r/cm
                  </text>
                  <text
                    x={chartProps.chartLeft - 5}
                    y={chartProps.topY_E + 8}
                    fontSize="8"
                    fill={CHART_COLORS.labelText}
                    textAnchor="end"
                  >
                    E
                  </text>
                  {/* 曲折线 */}
                  <path
                    d={chartProps.pathE}
                    fill="none"
                    stroke={PHYSICS_COLORS.electricField}
                    strokeWidth={1.8}
                  />
                  {/* 当前值小圆点 */}
                  <circle
                    cx={chartProps.toX(basicPhysics.distCm)}
                    cy={chartProps.toYE(basicPhysics.E)}
                    r={4}
                    fill={PHYSICS_COLORS.electricField}
                    stroke="white"
                    strokeWidth={1.2}
                  />
                </g>

                {/* F-r 图表 */}
                <g>
                  {/* 外边框 */}
                  <rect
                    x={chartProps.chartLeft}
                    y={chartProps.topY_F - 15}
                    width={chartProps.chartW + 15}
                    height={chartProps.chartH + 30}
                    fill="white"
                    stroke={CHART_COLORS.axisLine}
                    rx={4}
                  />
                  <text
                    x={chartProps.chartLeft + chartProps.chartW / 2 + 5}
                    y={chartProps.topY_F - 4}
                    fontSize="10"
                    fill={CHART_COLORS.titleText}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    F-r 静电力曲线
                  </text>
                  <line
                    x1={chartProps.chartLeft}
                    y1={chartProps.topY_F}
                    x2={chartProps.chartLeft}
                    y2={chartProps.bottomY_F}
                    stroke={CHART_COLORS.axisLine}
                    strokeWidth={1.5}
                  />
                  <line
                    x1={chartProps.chartLeft}
                    y1={chartProps.bottomY_F}
                    x2={chartProps.chartLeft + chartProps.chartW}
                    y2={chartProps.bottomY_F}
                    stroke={CHART_COLORS.axisLine}
                    strokeWidth={1.5}
                  />
                  <text
                    x={chartProps.chartLeft + chartProps.chartW}
                    y={chartProps.bottomY_F + 12}
                    fontSize="8"
                    fill={CHART_COLORS.labelText}
                    textAnchor="end"
                  >
                    r/cm
                  </text>
                  <text
                    x={chartProps.chartLeft - 5}
                    y={chartProps.topY_F + 8}
                    fontSize="8"
                    fill={CHART_COLORS.labelText}
                    textAnchor="end"
                  >
                    F
                  </text>
                  {/* 曲折线 */}
                  <path
                    d={chartProps.pathF}
                    fill="none"
                    stroke={PHYSICS_COLORS.electricForce}
                    strokeWidth={1.8}
                  />
                  {/* 当前值小圆点 */}
                  <circle
                    cx={chartProps.toX(basicPhysics.distCm)}
                    cy={chartProps.toYF(basicPhysics.F)}
                    r={4}
                    fill={PHYSICS_COLORS.electricForce}
                    stroke="white"
                    strokeWidth={1.2}
                  />
                </g>
              </g>
            )}
          </g>
        )}

        {/* 5. 进阶模式：双电荷与矢量叠加的平行四边形定则 */}
        {mode === 1 && (
          <g>
            {/* 固定电荷 1 */}
            <circle
              cx={cx1}
              cy={cy1}
              r={20}
              fill={q1 >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
              stroke={PHYSICS_COLORS.objectStroke}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            <text
              x={cx1}
              y={cy1 + 6}
              fontSize="18"
              fill={colors.neutral.white}
              textAnchor="middle"
              fontWeight="bold"
            >
              {q1 >= 0 ? '+' : '−'}
            </text>
            <text
              x={cx1}
              y={cy1 - 26}
              fontSize={CANVAS_STYLE.font.axisSize}
              fill={PHYSICS_COLORS.labelText}
              textAnchor="middle"
            >
              Q₁ = {q1 > 0 ? '+' : ''}{q1.toFixed(0)} μC
            </text>

            {/* 固定电荷 2 */}
            <circle
              cx={cx2}
              cy={cy2}
              r={20}
              fill={q2 >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
              stroke={PHYSICS_COLORS.objectStroke}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
            />
            <text
              x={cx2}
              y={cy2 + 6}
              fontSize="18"
              fill={colors.neutral.white}
              textAnchor="middle"
              fontWeight="bold"
            >
              {q2 >= 0 ? '+' : '−'}
            </text>
            <text
              x={cx2}
              y={cy2 - 26}
              fontSize={CANVAS_STYLE.font.axisSize}
              fill={PHYSICS_COLORS.labelText}
              textAnchor="middle"
            >
              Q₂ = {q2 > 0 ? '+' : ''}{q2.toFixed(0)} μC
            </text>

            {/* 试探电荷 P */}
            <circle
              cx={testX}
              cy={testY}
              r={12}
              fill={qTest > 0 ? PHYSICS_COLORS.positiveCharge : (qTest < 0 ? PHYSICS_COLORS.negativeCharge : colors.neutral[300])}
              stroke={isDragging ? PHYSICS_COLORS.electricForce : PHYSICS_COLORS.objectStroke}
              strokeWidth={isDragging ? 2.5 : CANVAS_STYLE.stroke.objectLine}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            />
            <text
              x={testX}
              y={testY + 4}
              fontSize="12"
              fill={qTest === 0 ? colors.neutral[800] : colors.neutral.white}
              textAnchor="middle"
              fontWeight="bold"
            >
              {qTest > 0 ? '+' : (qTest < 0 ? '−' : '0')}
            </text>
            <text
              x={testX}
              y={testY - 18}
              fontSize={CANVAS_STYLE.font.axisSize}
              fill={PHYSICS_COLORS.labelText}
              textAnchor="middle"
            >
              q = {qTest > 0 ? '+' : ''}{qTest.toFixed(1)} μC
            </text>

            {/* 进阶矢量叠加绘制 */}
            {advancedArrows && (
              <g>
                {/* 1. 分矢量 E1 (浅黄色虚线) */}
                <g opacity={0.7}>
                  <VectorArrow
                    origin={{ x: testX, y: -testY }}
                    vector={advancedArrows.vectorE1}
                    type="electricField"
                    sceneScale={sceneScale}
                    pixelLength={advancedArrows.lenE1}
                    strokeWidth={2.0}
                  />
                </g>
                <text
                  x={advancedArrows.e1Tip.x}
                  y={advancedArrows.e1Tip.y - 6}
                  fontSize="11"
                  fill={PHYSICS_COLORS.electricField}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  E₁
                </text>

                {/* 2. 分矢量 E2 (浅黄色虚线) */}
                <g opacity={0.7}>
                  <VectorArrow
                    origin={{ x: testX, y: -testY }}
                    vector={advancedArrows.vectorE2}
                    type="electricField"
                    sceneScale={sceneScale}
                    pixelLength={advancedArrows.lenE2}
                    strokeWidth={2.0}
                  />
                </g>
                <text
                  x={advancedArrows.e2Tip.x}
                  y={advancedArrows.e2Tip.y - 6}
                  fontSize="11"
                  fill={PHYSICS_COLORS.electricField}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  E₂
                </text>

                {/* 3. 平行四边形辅助虚线 */}
                {advancedArrows.lenE1 > 1e-2 && advancedArrows.lenE2 > 1e-2 && (
                  <g>
                    <line
                      x1={advancedArrows.e1Tip.x}
                      y1={advancedArrows.e1Tip.y}
                      x2={advancedArrows.enetTip.x}
                      y2={advancedArrows.enetTip.y}
                      stroke={PHYSICS_COLORS.electricPotential}
                      strokeWidth={1.2}
                      strokeDasharray="3,3"
                      opacity={0.7}
                    />
                    <line
                      x1={advancedArrows.e2Tip.x}
                      y1={advancedArrows.e2Tip.y}
                      x2={advancedArrows.enetTip.x}
                      y2={advancedArrows.enetTip.y}
                      stroke={PHYSICS_COLORS.electricPotential}
                      strokeWidth={1.2}
                      strokeDasharray="3,3"
                      opacity={0.7}
                    />
                  </g>
                )}

                {/* 4. 合场强 E (粗黄色实线) */}
                <VectorArrow
                  origin={{ x: testX, y: -testY }}
                  vector={advancedArrows.vectorEnet}
                  type="electricField"
                  sceneScale={sceneScale}
                  pixelLength={advancedArrows.lenEnet}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain + 0.8}
                />
                <text
                  x={advancedArrows.enetTip.x + (advancedArrows.vectorEnet.x >= 0 ? 1 : -1) * 12}
                  y={advancedArrows.enetTip.y + 4}
                  fontSize="12"
                  fill={PHYSICS_COLORS.electricField}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  E合
                </text>

                {/* 5. 电场力 F (粗橙色实线, 仅在 qTest !== 0 时绘制) */}
                {qTest !== 0 && (
                  <>
                    <VectorArrow
                      origin={{ x: testX, y: -testY }}
                      vector={advancedArrows.vectorF}
                      type="electricForce"
                      sceneScale={sceneScale}
                      pixelLength={advancedArrows.lenF}
                      strokeWidth={CANVAS_STYLE.stroke.vectorMain + 1.2}
                    />
                    <text
                      x={testX + (advancedArrows.vectorF.x >= 0 ? 1 : -1) * (advancedArrows.lenF + 14)}
                      y={testY - (advancedArrows.vectorF.y >= 0 ? 1 : -1) * 6 + 18}
                      fontSize={CANVAS_STYLE.font.labelSize}
                      fill={PHYSICS_COLORS.electricForce}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      F合
                    </text>
                  </>
                )}
              </g>
            )}
          </g>
        )}

        {/* 公式悬浮看板 (如果 showFormulas 开启) */}
        {showFormulas && (
          <g transform="translate(20, 20)">
            <rect
              x={0}
              y={0}
              width={210}
              height={mode === 0 ? 130 : 110}
              fill={colors.neutral.white}
              opacity={0.92}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={1.5}
              rx={6}
            />
            <g transform="translate(12, 18)">
              <text
                fontSize={CANVAS_STYLE.font.bodySize}
                fill={PHYSICS_COLORS.labelText}
                fontWeight="bold"
              >
                {mode === 0 ? '电场强度比值定义' : '合电场强度矢量叠加'}
              </text>
              
              {mode === 0 ? (
                <>
                  <text x={0} y={24} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText}>
                    场强大小：E = {basicPhysics.E.toExponential(2)} N/C
                  </text>
                  <text x={0} y={44} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText}>
                    静电力：F = {basicPhysics.F.toExponential(2)} N
                  </text>
                  <text x={0} y={64} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.electricField} fontWeight="bold">
                    定义式：E = F / |q|
                  </text>
                  <text x={0} y={84} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.electricForce} fontWeight="bold">
                    决定式：E = k·Q/r²
                  </text>
                  <text x={0} y={100} fontSize="10" fill={colors.neutral[500]}>
                    * 改变试探电荷 q，E保持恒定！
                  </text>
                </>
              ) : (
                <>
                  <text x={0} y={24} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText}>
                    E₁ = {Math.sqrt(advancedPhysics.E1x**2 + advancedPhysics.E1y**2).toExponential(1)} N/C
                  </text>
                  <text x={0} y={44} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText}>
                    E₂ = {Math.sqrt(advancedPhysics.E2x**2 + advancedPhysics.E2y**2).toExponential(1)} N/C
                  </text>
                  <text x={0} y={64} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.electricField} fontWeight="bold">
                    合场强：E合 = E₁ + E₂
                  </text>
                  <text x={0} y={82} fontSize="10" fill={colors.neutral[500]}>
                    * 拖拽 P 点感受平行四边形合成
                  </text>
                </>
              )}
            </g>
          </g>
        )}

        {/* Defs：箭头 Marker 与虚线滤镜等 */}
        <defs>
          <marker
            id="arrow-efield"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.electricFieldLine} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
