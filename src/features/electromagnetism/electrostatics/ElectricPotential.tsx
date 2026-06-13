import React, { useRef, useState, useMemo, useEffect } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { radius } from '@/theme/radius'
import { shadow } from '@/theme/shadow'
import { calculateNonUniformEField } from '@/physics'

// 物理常量 (米制单位)
const Q_SOURCE = 2.0e-6 // 场源正电荷 +2.0 μC
const X_Q = 3.5 // 场源 x 坐标 (m)
const Y_Q = 2.2 // 场源 y 坐标 (m)
const X_A = 1.5 // A点 x 坐标 (m)
const Y_A = 1.2 // A点 y 坐标 (m)
const X_B = 5.5 // B点 x 坐标 (m)
const Y_B = 1.2 // B点 y 坐标 (m)
const X_REF = 3.5 // 匀强电场零势参考面 x 坐标 (m)
const X_GROUND = 3.5 // 接地参考 x 坐标 (m)
const Y_GROUND = 0.0 // 接地参考 y 坐标 (m) (画面最底端)

// 粒子滑行最大时长
const RUN_DURATION = 5.0 // 5.0 秒滑行完

interface PathPoint {
  x: number // 物理 x (m)
  y: number // 物理 y (m)
}

export default function ElectricPotential() {
  const { params, time, isPlaying } = useAnimationStore()
  const updateParam = useAnimationStore((s) => s.updateParam)
  const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)

  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 500 })
  const animSvgRef = useRef<SVGSVGElement>(null)
  const chartSvgRef = useRef<SVGSVGElement>(null)

  // 读取左侧控制参数
  const baseEField = params.baseEField ?? 150 // V/m
  const qProbe = params.qProbe ?? 1.0 // μC
  const zeroRef = params.zeroRef ?? 0 // 0=无穷远为0V, 1=大地为0V
  const drawMode = params.drawMode ?? 0 // 0=直线, 1=手绘
  const hoverX = params.hoverX ?? 0.5 // 图像上光标的相对位置 (0.0 到 1.0，对应物理 1.0m 到 6.0m)

  const zeroRefStr: 'infinity' | 'ground' = zeroRef === 1 ? 'ground' : 'infinity'

  // 自适应尺寸逻辑
  const w = canvasSize.width || 700
  const hTotal = canvasSize.height || 500
  const hChart = hTotal / 2
  const hAnim = hTotal / 2

  // 物理坐标转换函数 (下半屏动画区域专用)
  const physicsToCanvas = (xp: number, yp: number) => {
    const scaleX = w / 7.0
    const scaleY = hAnim / 3.5
    return {
      cx: xp * scaleX,
      cy: hAnim - yp * scaleY,
    }
  }

  const canvasToPhysics = (xc: number, yc: number) => {
    const scaleX = w / 7.0
    const scaleY = hAnim / 3.5
    return {
      xp: xc / scaleX,
      yp: (hAnim - yc) / scaleY,
    }
  }

  // A、B点的 Canvas 像素坐标
  const posA = useMemo(() => physicsToCanvas(X_A, Y_A), [w, hAnim])
  const posB = useMemo(() => physicsToCanvas(X_B, Y_B), [w, hAnim])
  const posQ = useMemo(() => physicsToCanvas(X_Q, Y_Q), [w, hAnim])

  // 手绘路径状态（物理坐标）
  const [handPath, setHandPath] = useState<PathPoint[]>([])
  const [isDrawing, setIsDrawing] = useState(false)

  // 1. 同步 A、B 点电势到 store
  useEffect(() => {
    const resA = calculateNonUniformEField(X_A, Y_A, baseEField, X_Q, Y_Q, Q_SOURCE, zeroRefStr, X_REF, X_GROUND, Y_GROUND)
    const resB = calculateNonUniformEField(X_B, Y_B, baseEField, X_Q, Y_Q, Q_SOURCE, zeroRefStr, X_REF, X_GROUND, Y_GROUND)
    updateParam('phiA', resA.phi)
    updateParam('phiB', resB.phi)
  }, [baseEField, zeroRefStr, updateParam])

  // 2. 动画播放结束自动停机
  useEffect(() => {
    if (isPlaying && time >= RUN_DURATION) {
      setIsPlaying(false)
    }
  }, [time, isPlaying, setIsPlaying])

  // 3. 构建当前实际滑行路径
  const activePath = useMemo<PathPoint[]>(() => {
    if (drawMode === 1 && handPath.length >= 2) {
      return handPath
    }
    // 默认直线
    return [
      { x: X_A, y: Y_A },
      { x: X_B, y: Y_B },
    ]
  }, [drawMode, handPath])

  // 计算路径累加长度
  const pathDistances = useMemo(() => {
    const dists: number[] = [0]
    let total = 0
    for (let i = 0; i < activePath.length - 1; i++) {
      const p1 = activePath[i]
      const p2 = activePath[i + 1]
      const d = Math.hypot(p2.x - p1.x, p2.y - p1.y)
      total += d
      dists.push(total)
    }
    return { dists, total }
  }, [activePath])

  // 根据当前播放时间插值获取粒子物理位置
  const runProgress = Math.min(1.0, time / RUN_DURATION)
  const particlePhysicsPos = useMemo<PathPoint>(() => {
    const targetD = runProgress * pathDistances.total
    const dists = pathDistances.dists
    
    // 寻找插值区间
    let idx = 0
    for (let i = 0; i < dists.length - 1; i++) {
      if (targetD >= dists[i] && targetD <= dists[i + 1]) {
        idx = i
        break
      }
    }
    
    const p1 = activePath[idx]
    const p2 = activePath[idx + 1]
    if (!p1 || !p2) return { x: X_A, y: Y_A }
    
    const segmentD = dists[idx + 1] - dists[idx]
    if (segmentD === 0) return p1
    
    const ratio = (targetD - dists[idx]) / segmentD
    return {
      x: p1.x + ratio * (p2.x - p1.x),
      y: p1.y + ratio * (p2.y - p1.y),
    }
  }, [runProgress, activePath, pathDistances])

  // 粒子处的场强与电势
  const particlePhysics = useMemo(() => {
    const pos = particlePhysicsPos
    const res = calculateNonUniformEField(
      pos.x,
      pos.y,
      baseEField,
      X_Q,
      Y_Q,
      Q_SOURCE,
      zeroRefStr,
      X_REF,
      X_GROUND,
      Y_GROUND
    )
    
    // 电势能 (J)
    const Ep = qProbe * 1e-6 * res.phi

    // 为了防负数并保持能量条美感，我们设一个上限基准值
    // 起始点 A 处的势能
    const phiA = params.phiA ?? 0
    const EpStart = qProbe * 1e-6 * phiA

    // 计算在此路径上最大的势能起伏以设定柱状图范围
    // 动能计算：E_k = E_k_start + (E_p_start - E_p)
    // 假设初动能足够粒子越过最高势垒，例如设初动能为恒定 1.0e-3 J (足够大)
    const EkStart = 2.0e-3
    const Ek = Math.max(0, EkStart + (EpStart - Ep))
    const totalEnergy = EkStart + EpStart

    // 映射到百分比
    // 对于势能柱和动能柱，我们用相对比值表示
    const maxVal = Math.max(Math.abs(Ek), Math.abs(Ep), totalEnergy, 1e-6)
    const pctEp = Math.max(3, Math.min(97, (Ep / maxVal) * 100))
    const pctEk = Math.max(3, Math.min(97, (Ek / maxVal) * 100))

    return {
      phi: res.phi,
      Ex: res.Ex,
      Ey: res.Ey,
      E: res.E,
      Ep,
      Ek,
      pctEp,
      pctEk,
    }
  }, [particlePhysicsPos, baseEField, zeroRefStr, qProbe, params.phiA])

  // 4. 手绘路径绘制事件
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drawMode !== 1 || isPlaying) return
    const svg = animSvgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const xc = e.clientX - rect.left
    const yc = e.clientY - rect.top
    const { xp, yp } = canvasToPhysics(xc, yc)

    // 检查是否在 A 锚点附近 (小于 0.45 米)
    const distToA = Math.hypot(xp - X_A, yp - Y_A)
    if (distToA < 0.45) {
      setIsDrawing(true)
      setHandPath([{ x: X_A, y: Y_A }])
      svg.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return
    const svg = animSvgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const xc = e.clientX - rect.left
    const yc = e.clientY - rect.top
    const { xp, yp } = canvasToPhysics(xc, yc)

    // 限制在下半屏的合理物理界限内 (防止滑到屏幕外或与点电荷过于接近)
    const xpClamped = Math.max(0.1, Math.min(6.9, xp))
    const ypClamped = Math.max(0.1, Math.min(3.4, yp))

    const distToQ = Math.hypot(xpClamped - X_Q, ypClamped - Y_Q)
    if (distToQ < 0.3) return // 防止路径穿过场源中心点

    const lastPt = handPath[handPath.length - 1]
    const distToLast = Math.hypot(xpClamped - lastPt.x, ypClamped - lastPt.y)

    // 物理距离大于 0.08 米才记录新点，避免点集太密
    if (distToLast > 0.08) {
      setHandPath((prev) => [...prev, { x: xpClamped, y: ypClamped }])
    }
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return
    setIsDrawing(false)
    animSvgRef.current?.releasePointerCapture(e.pointerId)

    if (handPath.length < 3) {
      // 路径太短，重置
      setHandPath([])
      return
    }

    const lastPt = handPath[handPath.length - 1]
    const distToB = Math.hypot(lastPt.x - X_B, lastPt.y - Y_B)

    // 如果最后距离 B 小于 0.8 米，自动吸附闭合到 B，否则清空
    if (distToB < 0.8) {
      setHandPath((prev) => [...prev, { x: X_B, y: Y_B }])
    } else {
      // 没画到B，强行闭合到 B 保持轨道完整
      setHandPath((prev) => [...prev, { x: X_B, y: Y_B }])
    }
  }

  // 5. 上半屏 φ-x 图线数据计算
  // 采样直线 y = Y_A = 1.2 m，自 x = 1.0 m 到 6.0 m
  const xStartPhys = 1.0
  const xEndPhys = 6.0
  const chartPoints = useMemo(() => {
    const pointsCount = 100
    const pts: { xPhys: number; phi: number }[] = []
    for (let i = 0; i <= pointsCount; i++) {
      const xp = xStartPhys + (i / pointsCount) * (xEndPhys - xStartPhys)
      const res = calculateNonUniformEField(
        xp,
        Y_A,
        baseEField,
        X_Q,
        Y_Q,
        Q_SOURCE,
        zeroRefStr,
        X_REF,
        X_GROUND,
        Y_GROUND
      )
      pts.push({ xPhys: xp, phi: res.phi })
    }
    return pts
  }, [baseEField, zeroRefStr])

  // 图表纵轴比例范围 (自适应)
  const chartYLimit = useMemo(() => {
    const phis = chartPoints.map((p) => p.phi)
    const min = Math.min(...phis)
    const max = Math.max(...phis)
    const diff = max - min
    const pad = diff > 0 ? diff * 0.15 : 10.0
    return {
      min: min - pad,
      max: max + pad,
    }
  }, [chartPoints])

  // 图表像素转换
  const chartPadding = { left: 60, right: 40, top: 30, bottom: 40 }
  const chartWidth = w - chartPadding.left - chartPadding.right
  const chartHeight = hChart - chartPadding.top - chartPadding.bottom

  const chartPhysToCanvas = (xp: number, phi: number) => {
    const xPct = (xp - xStartPhys) / (xEndPhys - xStartPhys)
    const yPct = (phi - chartYLimit.min) / (chartYLimit.max - chartYLimit.min)
    return {
      cx: chartPadding.left + xPct * chartWidth,
      cy: chartPadding.top + (1 - yPct) * chartHeight,
    }
  }



  // 计算 Hover 处物理点的电势与切线斜率
  const hoverPhysX = xStartPhys + hoverX * (xEndPhys - xStartPhys)
  const hoverPhysics = useMemo(() => {
    const res = calculateNonUniformEField(
      hoverPhysX,
      Y_A,
      baseEField,
      X_Q,
      Y_Q,
      Q_SOURCE,
      zeroRefStr,
      X_REF,
      X_GROUND,
      Y_GROUND
    )
    
    // 切线斜率 k = -Ex
    const slope = -res.Ex
    return {
      phi: res.phi,
      Ex: res.Ex,
      slope,
    }
  }, [hoverPhysX, baseEField, zeroRefStr])

  // 同步 Hover 切线斜率到 Store
  useEffect(() => {
    updateParam('slopeK', Math.abs(hoverPhysics.Ex))
  }, [hoverPhysics.Ex, updateParam])

  // 上半屏图表的 Hover 交互
  const handleChartPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = chartSvgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const xc = e.clientX - rect.left
    
    // 计算相对绘图区域的 x 比例
    const relativeX = (xc - chartPadding.left) / chartWidth
    const clampedPct = Math.max(0.0, Math.min(1.0, relativeX))
    updateParam('hoverX', clampedPct)
  }

  // 生成 φ-x SVG Path
  const chartPathD = useMemo(() => {
    return chartPoints
      .map((p, idx) => {
        const { cx, cy } = chartPhysToCanvas(p.xPhys, p.phi)
        return `${idx === 0 ? 'M' : 'L'} ${cx.toFixed(1)},${cy.toFixed(1)}`
      })
      .join(' ')
  }, [chartPoints, chartYLimit, w, hChart])

  // 计算 Hover 处的切线线段
  const tangentLinePath = useMemo(() => {
    const xp = hoverPhysX
    const phi = hoverPhysics.phi
    const k = hoverPhysics.slope // 物理斜率 V/m

    // 物理范围左右延伸 0.8m 绘制切线
    const x1 = xp - 0.8
    const y1 = phi + k * (x1 - xp)
    const x2 = xp + 0.8
    const y2 = phi + k * (x2 - xp)

    const p1 = chartPhysToCanvas(x1, y1)
    const p2 = chartPhysToCanvas(x2, y2)
    return { x1: p1.cx, y1: p1.cy, x2: p2.cx, y2: p2.cy }
  }, [hoverPhysX, hoverPhysics, chartYLimit, w, hChart])

  // 下半屏物理场强网格背景 (矢量场)
  const eFieldVectors = useMemo(() => {
    const vectors: { cx: number; cy: number; dx: number; dy: number; length: number; opacity: number }[] = []
    const cols = 9
    const rows = 5
    for (let c = 1; c < cols; c++) {
      for (let r = 1; r < rows; r++) {
        const xp = (c / cols) * 7.0
        const yp = (r / rows) * 3.5
        
        // 避开正电荷中心附近
        if (Math.hypot(xp - X_Q, yp - Y_Q) < 0.45) continue

        const res = calculateNonUniformEField(
          xp,
          yp,
          baseEField,
          X_Q,
          Y_Q,
          Q_SOURCE,
          zeroRefStr,
          X_REF,
          X_GROUND,
          Y_GROUND
        )

        const eMag = res.E
        if (eMag < 1.0) continue

        const angle = Math.atan2(res.Ey, res.Ex)
        
        // 自适应映射场强箭头的长度 (10px 到 25px)
        const arrowLen = Math.max(8, Math.min(22, (eMag / 400) * 14 + 8))
        // 映射透明度
        const opacity = Math.max(0.1, Math.min(0.4, (eMag / 400) * 0.3 + 0.1))

        const canvasPos = physicsToCanvas(xp, yp)
        vectors.push({
          cx: canvasPos.cx,
          cy: canvasPos.cy,
          dx: Math.cos(angle) * arrowLen,
          dy: -Math.sin(angle) * arrowLen, // 像素 y 轴反向
          length: arrowLen,
          opacity,
        })
      }
    }
    return vectors
  }, [baseEField, zeroRefStr, w, hAnim])

  // Hover 切片处的实时电场指示器 (绘制在动画区域)
  const hoverIndicator = useMemo(() => {
    const xp = hoverPhysX
    const yp = Y_A // 指示在 A-B 水平连线上
    const canvasPos = physicsToCanvas(xp, yp)
    
    // 计算该点的场强
    const res = calculateNonUniformEField(
      xp,
      yp,
      baseEField,
      X_Q,
      Y_Q,
      Q_SOURCE,
      zeroRefStr,
      X_REF,
      X_GROUND,
      Y_GROUND
    )
    
    const eMag = res.E
    const angle = Math.atan2(res.Ey, res.Ex)
    
    // 场强箭头显示尺寸 (放大展示)
    const arrowLen = Math.max(15, Math.min(60, (eMag / 400) * 35 + 15))
    const thickness = Math.max(1.5, Math.min(5.0, (eMag / 400) * 3.5 + 1.5))

    return {
      cx: canvasPos.cx,
      cy: canvasPos.cy,
      dx: Math.cos(angle) * arrowLen,
      dy: -Math.sin(angle) * arrowLen,
      eMag,
      thickness,
    }
  }, [hoverPhysX, baseEField, zeroRefStr, w, hAnim])

  // 粒子当前像素坐标
  const particleCanvasPos = physicsToCanvas(particlePhysicsPos.x, particlePhysicsPos.y)

  // 粒子受力矢量箭头
  const particleForceArrow = useMemo(() => {
    const eMag = particlePhysics.E
    if (eMag < 1.0) return null

    // F = qE，根据 qProbe 的符号决定方向
    const directionFactor = qProbe >= 0 ? 1 : -1
    const angle = Math.atan2(particlePhysics.Ey, particlePhysics.Ex) + (directionFactor === -1 ? Math.PI : 0)

    // 电场力箭头的长度 (20px 到 55px)
    const arrowLen = Math.max(18, Math.min(50, (Math.abs(qProbe) * eMag / 400) * 25 + 18))

    return {
      dx: Math.cos(angle) * arrowLen,
      dy: -Math.sin(angle) * arrowLen,
    }
  }, [particlePhysics.E, particlePhysics.Ex, particlePhysics.Ey, qProbe])

  // 绘制手绘路径的 SVG Path D
  const handPathD = useMemo(() => {
    if (handPath.length === 0) return ''
    return handPath
      .map((p, idx) => {
        const { cx, cy } = physicsToCanvas(p.x, p.y)
        return `${idx === 0 ? 'M' : 'L'} ${cx.toFixed(1)},${cy.toFixed(1)}`
      })
      .join(' ')
  }, [handPath, w, hAnim])

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col select-none bg-neutral-50 overflow-hidden">
      {/* ==================== 上半屏：图表区域 ==================== */}
      <div className="w-full flex-1 relative border-b border-neutral-200 bg-white">
        <svg
          ref={chartSvgRef}
          width={w}
          height={hChart}
          className="w-full h-full block cursor-ew-resize"
          onPointerMove={handleChartPointerMove}
        >
          {/* 网格背景线 */}
          {Array.from({ length: 6 }).map((_, i) => {
            const xp = xStartPhys + (i / 5) * (xEndPhys - xStartPhys)
            const p = chartPhysToCanvas(xp, chartYLimit.min)
            return (
              <line
                key={`grid-x-${i}`}
                x1={p.cx}
                y1={chartPadding.top}
                x2={p.cx}
                y2={chartPadding.top + chartHeight}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={1}
                strokeDasharray="2,3"
              />
            )
          })}
          {Array.from({ length: 5 }).map((_, i) => {
            const phi = chartYLimit.min + (i / 4) * (chartYLimit.max - chartYLimit.min)
            const p = chartPhysToCanvas(xStartPhys, phi)
            return (
              <line
                key={`grid-y-${i}`}
                x1={chartPadding.left}
                y1={p.cy}
                x2={chartPadding.left + chartWidth}
                y2={p.cy}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={1}
                strokeDasharray="2,3"
              />
            )
          })}

          {/* A点 / B点 垂直界限指示线 */}
          {(() => {
            const pA = chartPhysToCanvas(X_A, 0)
            const pB = chartPhysToCanvas(X_B, 0)
            return (
              <g opacity={0.65}>
                <line
                  x1={pA.cx}
                  y1={chartPadding.top}
                  x2={pA.cx}
                  y2={chartPadding.top + chartHeight}
                  stroke={PHYSICS_COLORS.axis}
                  strokeWidth={1.5}
                  strokeDasharray="4,4"
                />
                <line
                  x1={pB.cx}
                  y1={chartPadding.top}
                  x2={pB.cx}
                  y2={chartPadding.top + chartHeight}
                  stroke={PHYSICS_COLORS.axis}
                  strokeWidth={1.5}
                  strokeDasharray="4,4"
                />
                <text x={pA.cx} y={chartPadding.top - 8} fontSize={10} fontWeight="bold" fill={colors.neutral[500]} textAnchor="middle">
                  A点 (x=1.5m)
                </text>
                <text x={pB.cx} y={chartPadding.top - 8} fontSize={10} fontWeight="bold" fill={colors.neutral[500]} textAnchor="middle">
                  B点 (x=5.5m)
                </text>
              </g>
            )
          })()}

          {/* 坐标轴轴线 */}
          <line
            x1={chartPadding.left}
            y1={chartPadding.top + chartHeight}
            x2={chartPadding.left + chartWidth}
            y2={chartPadding.top + chartHeight}
            stroke={colors.neutral[400]}
            strokeWidth={1.5}
          />
          <line
            x1={chartPadding.left}
            y1={chartPadding.top}
            x2={chartPadding.left}
            y2={chartPadding.top + chartHeight}
            stroke={colors.neutral[400]}
            strokeWidth={1.5}
          />

          {/* 坐标轴标签 */}
          <text
            x={chartPadding.left + chartWidth}
            y={chartPadding.top + chartHeight + 22}
            fontSize={10}
            fill={colors.neutral[600]}
            textAnchor="end"
            fontWeight="bold"
          >
            位移 x / m
          </text>
          <text
            x={chartPadding.left - 12}
            y={chartPadding.top - 8}
            fontSize={10}
            fill={colors.neutral[600]}
            textAnchor="middle"
            fontWeight="bold"
          >
            电势 φ / V
          </text>

          {/* 坐标轴刻度与数值 */}
          {Array.from({ length: 6 }).map((_, i) => {
            const xp = xStartPhys + (i / 5) * (xEndPhys - xStartPhys)
            const p = chartPhysToCanvas(xp, chartYLimit.min)
            return (
              <g key={`lbl-x-${i}`}>
                <line x1={p.cx} y1={p.cy} x2={p.cx} y2={p.cy + 4} stroke={colors.neutral[400]} strokeWidth={1.5} />
                <text x={p.cx} y={p.cy + 16} fontSize={9.5} fill={colors.neutral[600]} textAnchor="middle" className="font-mono">
                  {xp.toFixed(1)}
                </text>
              </g>
            )
          })}
          {Array.from({ length: 5 }).map((_, i) => {
            const phi = chartYLimit.min + (i / 4) * (chartYLimit.max - chartYLimit.min)
            const p = chartPhysToCanvas(xStartPhys, phi)
            return (
              <g key={`lbl-y-${i}`}>
                <line x1={p.cx} y1={p.cy} x2={p.cx - 4} y2={p.cy} stroke={colors.neutral[400]} strokeWidth={1.5} />
                <text x={p.cx - 8} y={p.cy + 3.5} fontSize={9.5} fill={colors.neutral[600]} textAnchor="end" className="font-mono">
                  {Math.round(phi)}
                </text>
              </g>
            )
          })}

          {/* φ-x 关系曲线 */}
          <path
            d={chartPathD}
            fill="none"
            stroke={PHYSICS_COLORS.electricPotential}
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* 实时 Hover 的黄色切线与切点 */}
          {(() => {
            const pCut = chartPhysToCanvas(hoverPhysX, hoverPhysics.phi)
            return (
              <g>
                <line
                  x1={tangentLinePath.x1}
                  y1={tangentLinePath.y1}
                  x2={tangentLinePath.x2}
                  y2={tangentLinePath.y2}
                  stroke={PHYSICS_COLORS.tangentLine}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <circle cx={pCut.cx} cy={pCut.cy} r={5} fill={PHYSICS_COLORS.tangentLine} className="drop-shadow-sm" />
                {/* 悬浮数值卡片 */}
                <g transform={`translate(${pCut.cx + 12}, ${pCut.cy - 12})`}>
                  <rect
                    width={110}
                    height={38}
                    rx={4}
                    fill="white"
                    stroke={PHYSICS_COLORS.tangentLine}
                    strokeWidth={1}
                    fillOpacity={0.9}
                    className="shadow-sm"
                  />
                  <text x={8} y={15} fontSize={9} fill={colors.neutral[800]} fontWeight="bold">
                    k = -Eₓ = {hoverPhysics.slope.toFixed(1)} V/m
                  </text>
                  <text x={8} y={28} fontSize={9} fill={PHYSICS_COLORS.electricPotential} fontWeight="bold">
                    φ = {hoverPhysics.phi.toFixed(1)} V
                  </text>
                </g>
              </g>
            )
          })()}

          {/* 播放过程中粒子的实时 x 位置指示线 */}
          {isPlaying && (
            (() => {
              // 寻找粒子在 x 轴上的电势，画点
              const pPart = chartPhysToCanvas(particlePhysicsPos.x, particlePhysics.phi)
              return (
                <g>
                  <line
                    x1={pPart.cx}
                    y1={chartPadding.top}
                    x2={pPart.cx}
                    y2={chartPadding.top + chartHeight}
                    stroke={PHYSICS_COLORS.kineticEnergy}
                    strokeWidth={1.5}
                    strokeDasharray="3,2"
                  />
                  <circle cx={pPart.cx} cy={pPart.cy} r={6} fill={PHYSICS_COLORS.kineticEnergy} stroke="white" strokeWidth={1.5} className="drop-shadow-sm animate-pulse" />
                </g>
              )
            })()
          )}
        </svg>

        {/* 标题与操作提示 */}
        <div className="absolute left-4 top-2 pointer-events-none bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs flex items-center gap-2 border border-neutral-200/50 shadow-sm">
          <span className="font-bold text-neutral-600">φ - x 关系图线 (一维水平路径)</span>
          <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/40 animate-pulse">
            ↔ 左右移动鼠标滑动求导
          </span>
        </div>
      </div>

      {/* ==================== 下半屏：动画展示区域 ==================== */}
      <div className="w-full flex-1 relative bg-white border-t border-neutral-100">
        <svg
          ref={animSvgRef}
          width={w}
          height={hAnim}
          className={`w-full h-full block ${drawMode === 1 && !isPlaying ? 'cursor-crosshair' : 'cursor-default'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* 定义箭头和渐变 */}
          <defs>
            {/* 场强黄色箭头 Marker */}
            <marker id="arrow-efield" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 2.5 L 7 5 L 0 7.5 z" fill={PHYSICS_COLORS.electricField} />
            </marker>
            {/* 粒子受力橙色箭头 Marker */}
            <marker id="arrow-force" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={PHYSICS_COLORS.electricForce} />
            </marker>
            {/* 接地符号 Marker */}
            <marker id="ground-symbol" viewBox="0 0 10 10" refX="5" refY="0" markerWidth="10" markerHeight="10" orient="auto">
              <line x1={5} y1={0} x2={5} y2={6} stroke={colors.neutral[400]} strokeWidth={1.5} />
              <line x1={1} y1={6} x2={9} y2={6} stroke={colors.neutral[400]} strokeWidth={1.5} />
              <line x1={2.5} y1={8} x2={7.5} y2={8} stroke={colors.neutral[400]} strokeWidth={1.5} />
              <line x1={4} y1={10} x2={6} y2={10} stroke={colors.neutral[400]} strokeWidth={1.5} />
            </marker>
            {/* 场源正电荷光晕渐变 */}
            <radialGradient id="source-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={PHYSICS_COLORS.positiveCharge} stopOpacity="0.22" />
              <stop offset="100%" stopColor={PHYSICS_COLORS.positiveCharge} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 1. 地面 0V 刻画 (地线) */}
          <line
            x1={0}
            y1={hAnim}
            x2={w}
            y2={hAnim}
            stroke={colors.neutral[300]}
            strokeWidth={3}
          />
          {/* 接地引脚符号 */}
          <rect x={w / 2 - 2} y={hAnim - 1} width={4} height={1} fill="none" markerEnd="url(#ground-symbol)" opacity={0.65} />

          {/* 2. 背景非匀强矢量电场箭头网格 */}
          <g opacity={0.85}>
            {eFieldVectors.map((v, i) => (
              <line
                key={`ev-${i}`}
                x1={v.cx}
                y1={v.cy}
                x2={v.cx + v.dx}
                y2={v.cy + v.dy}
                stroke={PHYSICS_COLORS.electricField}
                strokeWidth={1.0}
                markerEnd="url(#arrow-efield)"
                opacity={v.opacity}
              />
            ))}
          </g>

          {/* 3. A、B 端点与水平辅助虚线 */}
          <line
            x1={posA.cx}
            y1={posA.cy}
            x2={posB.cx}
            y2={posB.cy}
            stroke={colors.neutral[200]}
            strokeWidth={1.5}
            strokeDasharray="4,6"
          />

          {/* A 锚点 */}
          {drawMode === 1 && !isPlaying && handPath.length === 0 && (
            <circle
              cx={posA.cx}
              cy={posA.cy}
              r={22}
              fill="none"
              stroke={colors.primary[500]}
              strokeWidth={2}
              className="animate-ping"
              opacity={0.65}
              style={{ pointerEvents: 'none' }}
            />
          )}
          <circle
            cx={posA.cx}
            cy={posA.cy}
            r={12}
            fill="white"
            stroke={drawMode === 1 && !isPlaying ? colors.primary[500] : colors.neutral[400]}
            strokeWidth={1.8}
            style={{ cursor: drawMode === 1 && !isPlaying ? 'crosshair' : 'default' }}
          />
          <circle cx={posA.cx} cy={posA.cy} r={4} fill={drawMode === 1 && !isPlaying ? colors.primary[600] : colors.neutral[500]} />
          <text
            x={posA.cx}
            y={posA.cy + 24}
            fontSize={10.5}
            fontWeight="black"
            fill={drawMode === 1 && !isPlaying ? colors.primary[700] : colors.neutral[600]}
            textAnchor="middle"
          >
            A (起点)
          </text>

          {/* B 锚点 */}
          <circle cx={posB.cx} cy={posB.cy} r={12} fill="white" stroke={colors.neutral[400]} strokeWidth={1.5} />
          <circle cx={posB.cx} cy={posB.cy} r={4} fill={colors.neutral[500]} />
          <text x={posB.cx} y={posB.cy + 24} fontSize={10.5} fontWeight="black" fill={colors.neutral[600]} textAnchor="middle">
            B (终点)
          </text>

          {/* 4. 场源正电荷 */}
          <circle cx={posQ.cx} cy={posQ.cy} r={45} fill="url(#source-glow)" />
          <circle cx={posQ.cx} cy={posQ.cy} r={18} fill={PHYSICS_COLORS.positiveCharge} stroke="white" strokeWidth={1.8} className="drop-shadow-md" />
          <text x={posQ.cx} y={posQ.cy} fontSize={16} fontWeight="bold" fill="white" textAnchor="middle" dominantBaseline="middle">
            +Q
          </text>
          <text x={posQ.cx} y={posQ.cy - 24} fontSize={9.5} fontWeight="bold" fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
            固电荷场源 (+2μC)
          </text>

          {/* 5. 轨道路径渲染 */}
          {/* 如果是直线路径 */}
          {drawMode === 0 && (
            <line
              x1={posA.cx}
              y1={posA.cy}
              x2={posB.cx}
              y2={posB.cy}
              stroke={colors.primary[400]}
              strokeWidth={3}
              opacity={0.8}
              strokeLinecap="round"
            />
          )}

          {/* 如果是手绘路径 */}
          {drawMode === 1 && handPathD && (
            <path
              d={handPathD}
              fill="none"
              stroke={colors.primary[500]}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          )}

          {/* 如果开启手绘且还没有画，给出浅灰色连线提示 */}
          {drawMode === 1 && handPath.length === 0 && (
            <g opacity={0.5}>
              <path
                d={`M ${posA.cx},${posA.cy} C ${(posA.cx + posB.cx)/2},${posA.cy - 120} ${(posA.cx + posB.cx)/2},${posA.cy - 120} ${posB.cx},${posB.cy}`}
                fill="none"
                stroke={colors.neutral[400]}
                strokeWidth={2}
                strokeDasharray="4,4"
              />
              <text x={(posA.cx + posB.cx)/2} y={posA.cy - 70} fontSize={11} fill={colors.neutral[500]} textAnchor="middle" fontWeight="bold">
                ✍️ 按住 A 拖动鼠标绘制自定义轨迹至 B
              </text>
            </g>
          )}

          {/* 6. Hover 图像时，在动画直线上显示的高亮黄色场强矢量 */}
          {!isPlaying && (
            <g>
              {/* 垂直指示线虚线段 */}
              <line
                x1={hoverIndicator.cx}
                y1={0}
                x2={hoverIndicator.cx}
                y2={hAnim}
                stroke={PHYSICS_COLORS.tangentLine}
                strokeWidth={1}
                strokeDasharray="2,4"
                opacity={0.5}
              />
              {/* 场强指示矢量箭头 */}
              <line
                x1={hoverIndicator.cx}
                y1={hoverIndicator.cy}
                x2={hoverIndicator.cx + hoverIndicator.dx}
                y2={hoverIndicator.cy + hoverIndicator.dy}
                stroke={PHYSICS_COLORS.electricField}
                strokeWidth={hoverIndicator.thickness}
                strokeLinecap="round"
                markerEnd="url(#arrow-efield)"
              />
              <text
                x={hoverIndicator.cx + hoverIndicator.dx + (hoverIndicator.dx >= 0 ? 12 : -12)}
                y={hoverIndicator.cy + hoverIndicator.dy - 6}
                fontSize={11.5}
                fontWeight="black"
                fill={PHYSICS_COLORS.electricField}
                textAnchor="middle"
              >
                Eₓ
              </text>
              <circle cx={hoverIndicator.cx} cy={hoverIndicator.cy} r={4} fill={PHYSICS_COLORS.electricField} />
            </g>
          )}

          {/* 7. 粒子主体 (带虚线交互外圈) */}
          {(isPlaying || runProgress > 0) && (
            <g>
              {/* 受力橙色箭头 */}
              {particleForceArrow && (
                <g>
                  <line
                    x1={particleCanvasPos.cx}
                    y1={particleCanvasPos.cy}
                    x2={particleCanvasPos.cx + particleForceArrow.dx}
                    y2={particleCanvasPos.cy + particleForceArrow.dy}
                    stroke={PHYSICS_COLORS.electricForce}
                    strokeWidth={2.8}
                    strokeLinecap="round"
                    markerEnd="url(#arrow-force)"
                  />
                  <text
                    x={particleCanvasPos.cx + particleForceArrow.dx + (particleForceArrow.dx >= 0 ? 12 : -12)}
                    y={particleCanvasPos.cy + particleForceArrow.dy + 4}
                    fontSize={11}
                    fontWeight="black"
                    fill={PHYSICS_COLORS.electricForce}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    F_电
                  </text>
                </g>
              )}

              {/* 粒子外环 */}
              <circle
                cx={particleCanvasPos.cx}
                cy={particleCanvasPos.cy}
                r={16}
                fill="none"
                stroke={PHYSICS_COLORS.electricForce}
                strokeWidth={1.2}
                strokeDasharray="3,3"
                opacity={0.8}
                className="animate-[spin_8s_linear_infinite]"
              />
              {/* 粒子白色衬底 */}
              <circle cx={particleCanvasPos.cx} cy={particleCanvasPos.cy} r={10} fill="white" opacity={0.85} />
              {/* 粒子实体球 */}
              <circle
                cx={particleCanvasPos.cx}
                cy={particleCanvasPos.cy}
                r={8.5}
                fill={qProbe >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
                stroke="white"
                strokeWidth={1.2}
                className="drop-shadow-md"
              />
              {/* 电性符号 */}
              <text
                x={particleCanvasPos.cx}
                y={particleCanvasPos.cy + 0.2}
                fontSize={12}
                fontWeight="black"
                fill="white"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {qProbe >= 0 ? '+' : '−'}
              </text>
              {/* 粒子标注 */}
              <text
                x={particleCanvasPos.cx}
                y={particleCanvasPos.cy - 18}
                fontSize={9.5}
                fontWeight="bold"
                fill={PHYSICS_COLORS.labelText}
                textAnchor="middle"
              >
                试探电荷 ({qProbe >= 0 ? '+' : ''}{qProbe.toFixed(1)}μC)
              </text>
            </g>
          )}
        </svg>

        {/* 玻璃拟态卡片：实时能量堆栈槽 */}
        <div
          className="absolute right-4 bottom-4 z-10 bg-white/80 backdrop-blur-md border border-neutral-200/50 rounded-xl p-3 flex flex-col items-center select-none"
          style={{
            boxShadow: shadow.md,
            borderRadius: radius.lg,
            width: '150px',
          }}
        >
          <span className="text-[10px] font-bold text-neutral-500 mb-2.5">实时能量变化 (守恒)</span>
          
          <div className="h-28 flex justify-around items-end w-full relative px-2">
            {/* 中间百分比虚线 */}
            <div className="absolute inset-x-0 top-0 border-t border-dashed border-neutral-200 flex justify-between text-[7.5px] text-neutral-300 font-mono pointer-events-none">
              <span>总能 E</span>
            </div>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-neutral-200 flex justify-between text-[7.5px] text-neutral-300 font-mono pointer-events-none">
              <span>50%</span>
            </div>

            {/* 动能柱 (青色) */}
            <div className="flex flex-col items-center h-full justify-end w-10">
              <div className="w-4.5 h-full bg-neutral-100/50 border border-neutral-200/30 rounded-full flex items-end overflow-hidden">
                <div
                  className="w-full rounded-full transition-all duration-150 ease-out"
                  style={{ height: `${isPlaying || runProgress > 0 ? particlePhysics.pctEk : 50}%`, backgroundColor: PHYSICS_COLORS.kineticEnergy }}
                />
              </div>
              <span className="text-[10px] font-bold mt-1 font-mono" style={{ color: PHYSICS_COLORS.kineticEnergy }}>Ek</span>
              <span className="text-[8px] font-medium" style={{ color: PHYSICS_COLORS.kineticEnergy }}>动能</span>
            </div>

            {/* 势能柱 (紫色) */}
            <div className="flex flex-col items-center h-full justify-end w-10">
              <div className="w-4.5 h-full bg-neutral-100/50 border border-neutral-200/30 rounded-full flex items-end overflow-hidden">
                <div
                  className="w-full rounded-full transition-all duration-150 ease-out"
                  style={{ height: `${isPlaying || runProgress > 0 ? particlePhysics.pctEp : 50}%`, backgroundColor: PHYSICS_COLORS.potentialEnergy }}
                />
              </div>
              <span className="text-[10px] font-bold mt-1 font-mono" style={{ color: PHYSICS_COLORS.potentialEnergy }}>Ep</span>
              <span className="text-[8px] font-medium" style={{ color: PHYSICS_COLORS.potentialEnergy }}>电势能</span>
            </div>
          </div>
        </div>

        {/* 标题与操作提示 */}
        <div className="absolute left-4 top-2 pointer-events-none bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs flex items-center gap-2 border border-neutral-200/50 shadow-sm">
          <span className="font-bold text-neutral-600">非匀强电场物理动画 (匀强场 + 点电荷)</span>
          {drawMode === 1 && !isPlaying && handPath.length === 0 && (
            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/40 animate-pulse">
              ✍️ 请按住 A 点拖拽画线至 B
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
