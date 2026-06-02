/**
 * ACGeneration.tsx — 交变电流产生与图像 [M4-1]
 *
 * 优化版：基于 SVG 矢量动画实现 3D 效果
 *
 * @agent-rule 使用 useAnimationFrame 驱动动画
 * @agent-rule 遵循 useCanvasSize + PHYSICS_COLORS theme token
 */
import { useRef } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useAnimationFrame } from '@/utils/animation'

// 3D 点类型
type Point3D = { x: number; y: number; z: number }
type Point2D = { x: number; y: number }

// ─────────────────────────────────────────────────────────────────────────────
export default function ACGeneration() {
  const { params, isPlaying, speed } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 820, height: 480 })

  const B     = params.B     ?? 0.5
  const S     = params.S     ?? 0.04
  const omega = params.omega ?? 2
  const N     = params.N     ?? 100
  const Em    = N * B * S * omega

  // ── 动画时间 ──────────────────────────────────────────────────────────────
  const tRef = useRef(0)
  useAnimationFrame(
    (dt) => { tRef.current += (dt / 1000) * (speed ?? 1) },
    { playing: isPlaying, speed: speed ?? 1 }
  )
  const t     = tRef.current
  const theta = omega * t
  const emf   = Em * Math.sin(theta)   // e = Em·sin(θ)，中性面 θ=0 时 e=0

  // ── Canvas 尺寸 ───────────────────────────────────────────────────────────
  const W     = canvasSize.width
  const H     = canvasSize.height
  const SIMW  = Math.round(W * 0.48)  // 减小模型区域宽度
  const CHARTL = SIMW + 12
  const CHARTW = W - CHARTL - 6

  // ═══════════════════════════════════════════════════════════════════════════
  // 3D 投影系统
  // ═══════════════════════════════════════════════════════════════════════════
  const SCALE = 45  // 缩放比例，缩小模型使其更紧凑
  const Z_ANGLE = Math.PI / 6
  const Z_SCALE = 0.55
  const OX = SIMW * 0.5  // 投影原点 x
  const OY = H * 0.42     // 投影原点 y，稍微上移

  /** 3D 坐标 → 2D 屏幕坐标 */
  function project3D(x: number, y: number, z: number): Point2D {
    const sx = x + z * Z_SCALE * Math.cos(Z_ANGLE)
    const sy = -y - z * Z_SCALE * Math.sin(Z_ANGLE)
    return { x: OX + sx * SCALE, y: OY + sy * SCALE }
  }

  /** 生成圆弧点 */
  function getXYArc(xBase: number, yTop: number, yBottom: number, z: number, dipStrength: number, steps: number = 20): Point3D[] {
    const pts: Point3D[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const curY = yTop + (yBottom - yTop) * t
      const curX = xBase + dipStrength * 4 * t * (1 - t)
      pts.push({ x: curX, y: curY, z })
    }
    return pts
  }

  /** 3D 点数组 → SVG path 字符串 */
  function getPathString(points3D: Point3D[], close = true): string {
    let d = ''
    points3D.forEach((p, i) => {
      const p2d = project3D(p.x, p.y, p.z)
      d += (i === 0 ? `M ${p2d.x.toFixed(1)} ${p2d.y.toFixed(1)} ` : `L ${p2d.x.toFixed(1)} ${p2d.y.toFixed(1)} `)
    })
    if (close) d += 'Z'
    return d
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 磁极参数
  // ═══════════════════════════════════════════════════════════════════════════
  const zF = -1.6, zB = 1.6, yT = 1.7, yB = -1.7
  const nXLeft = -3.8, nXEdge = -1.3, nDip = -0.9
  const sXRight = 3.8, sXEdge = 1.3, sDip = 0.9

  const nFrontArc = getXYArc(nXEdge, yT, yB, zF, nDip)
  const nBackArc = getXYArc(nXEdge, yT, yB, zB, nDip)
  const sFrontArc = getXYArc(sXEdge, yT, yB, zF, sDip)
  const sBackArc = getXYArc(sXEdge, yT, yB, zB, sDip)

  // 磁极面
  const nFrontPoly: Point3D[] = [
    { x: nXLeft, y: yT, z: zF },
    ...nFrontArc,
    { x: nXLeft, y: yB, z: zF }
  ]
  const sFrontPoly: Point3D[] = [
    { x: sXRight, y: yT, z: zF },
    { x: sXRight, y: yB, z: zF },
    ...sFrontArc.slice().reverse()
  ]
  const nBackSurfacePath = getPathString([...nFrontArc, ...nBackArc.slice().reverse()])
  const sBackSurfacePath = getPathString([...sFrontArc, ...sBackArc.slice().reverse()])
  const nRightSidePath = getPathString([
    { x: sXRight, y: yT, z: zF },
    { x: sXRight, y: yB, z: zF },
    { x: sXRight, y: yB, z: zB },
    { x: sXRight, y: yT, z: zB }
  ])
  const nTopSurfacePath = getPathString([
    { x: nXLeft, y: yT, z: zF },
    { x: nXEdge, y: yT, z: zF },
    { x: nXEdge, y: yT, z: zB },
    { x: nXLeft, y: yT, z: zB }
  ])
  const sTopSurfacePath = getPathString([
    { x: sXEdge, y: yT, z: zF },
    { x: sXRight, y: yT, z: zF },
    { x: sXRight, y: yT, z: zB },
    { x: sXEdge, y: yT, z: zB }
  ])

  // 磁极文字位置
  const nTextPos = project3D(-2.9, -0.3, zF)
  const sTextPos = project3D(2.3, -0.3, zF)

  // ═══════════════════════════════════════════════════════════════════════════
  // 磁感线
  // ═══════════════════════════════════════════════════════════════════════════
  const fieldLines: { p1: Point2D; p2: Point2D }[] = []
  const lineYs = [1.1, 0.4, -0.3, -1.0]
  lineYs.forEach(y => {
    fieldLines.push({
      p1: project3D(-1.6, y, 0.5),
      p2: project3D(1.4, y, -0.5)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 转轴和旋转箭头
  // ═══════════════════════════════════════════════════════════════════════════
  const axisStart = project3D(0, 0, 3.2)
  const axisEnd = project3D(0, 0, -3.0)
  const omegaPos = project3D(0.8, -0.5, -2.5)

  // 计算旋转箭头路径
  const rx = 22, ry = 12
  const arrowX1 = omegaPos.x - rx * Math.cos(Z_ANGLE)
  const arrowY1 = omegaPos.y - 10 + rx * Math.sin(Z_ANGLE)
  const arrowX2 = omegaPos.x + rx * Math.cos(Z_ANGLE)
  const arrowY2 = omegaPos.y - 10 - rx * Math.sin(Z_ANGLE)
  const rotationArrowPath = `M ${arrowX1} ${arrowY1} A ${rx} ${ry} ${-Z_ANGLE * 180 / Math.PI} 0 1 ${arrowX2} ${arrowY2}`

  // ═══════════════════════════════════════════════════════════════════════════
  // 线圈（深度排序）
  // ═══════════════════════════════════════════════════════════════════════════
  const coilWidth = 1.05
  const coilLength = 1.4
  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)

  const p1 = { x: coilWidth * cosT, y: coilWidth * sinT, z: coilLength }
  const p2 = { x: -coilWidth * cosT, y: -coilWidth * sinT, z: coilLength }
  const p3 = { x: -coilWidth * cosT, y: -coilWidth * sinT, z: -coilLength }
  const p4 = { x: coilWidth * cosT, y: coilWidth * sinT, z: -coilLength }

  const pMidBack = { x: 0, y: 0, z: coilLength }
  const pMidFront = { x: 0, y: 0, z: -coilLength }
  const bOut1 = { x: -0.2 * cosT, y: -0.2 * sinT, z: -coilLength }
  const bOut2 = { x: -0.2 * cosT, y: -0.2 * sinT, z: -coilLength - 0.7 }
  const rOut1 = { x: 0.2 * cosT, y: 0.2 * sinT, z: -coilLength }
  const rOut2 = { x: 0.2 * cosT, y: 0.2 * sinT, z: -coilLength - 0.7 }

  // 线圈线段数据
  const coilSegments = [
    { pA: pMidBack, pB: p2, color: '#0055a4' },
    { pA: p2, pB: p3, color: '#0055a4' },
    { pA: p3, pB: pMidFront, color: '#0055a4' },
    { pA: pMidFront, pB: bOut1, color: '#0055a4' },
    { pA: bOut1, pB: bOut2, color: '#0055a4' },
    { pA: pMidBack, pB: p1, color: '#cc1111' },
    { pA: p1, pB: p4, color: '#cc1111' },
    { pA: p4, pB: pMidFront, color: '#cc1111' },
    { pA: pMidFront, pB: rOut1, color: '#cc1111' },
    { pA: rOut1, pB: rOut2, color: '#cc1111' }
  ]

  // 深度排序
  coilSegments.forEach(seg => {
    seg['zAvg'] = (seg.pA.z + seg.pB.z) / 2
    seg['zAvg'] += (Math.abs(seg.pA.x) + Math.abs(seg.pB.x)) * 0.0001
  })
  coilSegments.sort((a, b) => b['zAvg'] - a['zAvg'])

  // 预计算线圈线段的 SVG path
  const coilPathElements = coilSegments.map((seg, i) => {
    const pStart = project3D(seg.pA.x, seg.pA.y, seg.pA.z)
    const pEnd = project3D(seg.pB.x, seg.pB.y, seg.pB.z)
    const d = `M ${pStart.x.toFixed(1)} ${pStart.y.toFixed(1)} L ${pEnd.x.toFixed(1)} ${pEnd.y.toFixed(1)}`
    return { d, color: seg.color, key: i }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 状态判定
  // ═══════════════════════════════════════════════════════════════════════════
  const isNeutral = Math.abs(sinT) < 0.09
  const isMaxEmf = Math.abs(cosT) < 0.09

  // ═══════════════════════════════════════════════════════════════════════════
  // 右侧 e-t 波形图（右上区域，更大显示）
  // ═══════════════════════════════════════════════════════════════════════════
  const CP = 16
  const CHIST = 8
  const ctTop = 20  // 图的上边缘
  const ctBottom = H - CP  // 图的下边缘
  const ctH = ctBottom - ctTop
  const ctMY = ctTop + ctH / 2
  const ctHH = ctH * 0.42  // 增加波形振幅

  const histRef = useRef<{ t: number; e: number }[]>([])
  if (isPlaying) {
    histRef.current.push({ t, e: emf })
    const cut = t - CHIST
    histRef.current = histRef.current.filter((p) => p.t >= cut)
  }
  const hist = histRef.current
  const tMin = Math.max(0, t - CHIST)
  const tMax = t > CHIST ? t : CHIST

  function tx(tv: number) { return CHARTL + 8 + ((tv - tMin) / (tMax - tMin)) * (CHARTW - 12) }
  function ty(e: number) { return ctMY - (e / (Em || 1)) * ctHH * 0.85 }

  function makePath(): string {
    if (hist.length < 2) return ''
    let d = ''
    for (let i = 0; i < hist.length; i++) {
      const sx = tx(hist[i].t).toFixed(1)
      const raw = ty(hist[i].e)
      const sy = Math.max(ctTop + 2, Math.min(ctBottom - 2, raw)).toFixed(1)
      d += (i === 0 ? 'M ' : 'L ') + sx + ' ' + sy + ' '
    }
    return d.trim()
  }

  const nowX = hist.length > 0 ? tx(t) : CHARTL + 8
  const nowY = Math.max(ctTop + 8, Math.min(ctBottom - 8, ty(emf)))

  // ═══════════════════════════════════════════════════════════════════════════
  // 预计算文本值
  // ═══════════════════════════════════════════════════════════════════════════
  const emfTxt = emf.toFixed(1)
  const EmTxt = Em.toFixed(1)
  const fHz = (omega / (2 * Math.PI)).toFixed(2)
  const degTxt = ((theta * 180 / Math.PI) % 360).toFixed(0)
  const fmTr = 'translate(6,' + (H - 44).toFixed(0) + ')'

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={W} height={H}
        className="bg-white rounded-lg shadow-inner select-none"
        style={{ display: 'block' }}>
        <defs>
          {/* 磁感线箭头 */}
          <marker id="aB" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
            <polygon points="0 0,7 2.5,0 5" fill="#7c9a22" />
          </marker>
        </defs>

        {/* 左右分界线 */}
        <line x1={SIMW} y1={0} x2={SIMW} y2={H} stroke="#e2e8f0" strokeWidth={1} />

        {/* ═══════════ 左侧仿真区 ═══════════ */}
        <g>
          {/* 磁场标注 */}
          <text x={OX} y={13} textAnchor="middle"
            fontSize={11} fill="#2563eb" fontWeight="bold">
            {'匀强磁场 B = ' + B.toFixed(1) + ' T'}
          </text>

          {/* ── 后层磁铁 ── */}
          <g id="layer-back-magnets">
            <path d={nRightSidePath} fill="#0c3873" stroke="#000" strokeWidth={1.5} />
            <path d={nBackSurfacePath} fill="#8c0b0b" stroke="#000" strokeWidth={1.5} />
            <path d={sBackSurfacePath} fill="#0d4082" stroke="#000" strokeWidth={1.5} />
            <path d={nTopSurfacePath} fill="#b51111" stroke="#000" strokeWidth={1.5} />
            <path d={sTopSurfacePath} fill="#1150a3" stroke="#000" strokeWidth={1.5} />
          </g>

          {/* ── 磁感线层 ── */}
          <g id="layer-field-lines">
            {fieldLines.map((line, i) => (
              <g key={i}>
                <line x1={line.p1.x} y1={line.p1.y} x2={line.p2.x} y2={line.p2.y}
                  stroke="#7c9a22" strokeWidth={3} />
                <polygon
                  points={`${line.p2.x},${line.p2.y} ${line.p2.x - 14},${line.p2.y - 8} ${line.p2.x - 14},${line.p2.y + 8}`}
                  fill="#7c9a22" />
              </g>
            ))}

            {/* 转轴 */}
            <line x1={axisStart.x} y1={axisStart.y} x2={axisEnd.x} y2={axisEnd.y}
              stroke="#3a2010" strokeWidth={2.5} strokeDasharray="12,10" />

            {/* ω 符号 */}
            <text x={omegaPos.x - 35} y={omegaPos.y + 10}
              className="omega-text" fontWeight="bold" fontStyle="italic"
              fontSize={28} fill="#3a2010" fontFamily="Times New Roman">ω</text>

            {/* 旋转箭头 */}
            <path d={rotationArrowPath} fill="none" stroke="#3a2010" strokeWidth={3} />
            <polygon
              points={`${omegaPos.x - 22},${omegaPos.y - 25} ${omegaPos.x - 10},${omegaPos.y - 24} ${omegaPos.x - 25},${omegaPos.y - 13}`}
              fill="#3a2010" />
          </g>

          {/* ── 前层磁铁 ── */}
          <g id="layer-front-magnets">
            <path d={getPathString(nFrontPoly)} fill="#d81515" stroke="#000" strokeWidth={1.5} />
            <path d={getPathString(sFrontPoly)} fill="#1565cc" stroke="#000" strokeWidth={1.5} />
            <text x={nTextPos.x} y={nTextPos.y}
              fontWeight="bold" fontSize={36} fill="#ffffff" fontFamily="Times New Roman">N</text>
            <text x={sTextPos.x} y={sTextPos.y}
              fontWeight="bold" fontSize={36} fill="#ffffff" fontFamily="Times New Roman">S</text>
          </g>

          {/* ── 动态线圈层 ── */}
          <g id="layer-coil">
            {coilPathElements.map(seg => (
              <path key={seg.key} d={seg.d} fill="none"
                stroke={seg.color} strokeWidth={4.5}
                strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </g>

          {/* ── 状态标注 ── */}
          {isNeutral && (
            <text x={OX} y={H - 52} textAnchor="middle"
              fontSize={11} fill="#2563eb" fontWeight="bold">
              中性面：线圈面 ⊥ B，dΦ/dt = 0，e = 0
            </text>
          )}
          {isMaxEmf && (
            <text x={OX} y={H - 52} textAnchor="middle"
              fontSize={11} fill="#dc2626" fontWeight="bold">
              线圈面 ∥ B，|dΦ/dt| 最大，|e| = Em
            </text>
          )}
          {!isNeutral && !isMaxEmf && (
            <text x={OX} y={H - 52} textAnchor="middle"
              fontSize={10} fill="#d97706">
              {'线圈切割磁感线，e = ' + emfTxt + ' V'}
            </text>
          )}

          {/* ── 底部公式栏 ── */}
          <g transform={fmTr}>
            <rect width={SIMW - 12} height={36} rx={5}
              fill="#f8fafc" opacity={0.95} stroke="#e2e8f0" strokeWidth={1} />
            <text x={8} y={14} fontSize={10} fill="#1e293b" fontWeight="bold">
              e = NBSω · sin(ωt)（中性面 θ=0 时线圈⊥B，e=0）
            </text>
            <text x={8} y={28} fontSize={9.5} fill="#64748b">
              {'Em = ' + EmTxt + ' V   f = ' + fHz + ' Hz   θ = ' + degTxt + '°   e = ' + emfTxt + ' V'}
            </text>
          </g>
        </g>

        {/* ═══════════ 右侧 e-t 波形图（右上区域）═══════════ */}
        <g>
          <text x={CHARTL + 4} y={ctTop + 16}
            fontSize={12} fill="#f97316" fontWeight="bold">
            e − t 图（电动势随时间变化）
          </text>

          {/* 坐标轴 */}
          <line x1={CHARTL + 8} y1={ctMY} x2={W - 6} y2={ctMY}
            stroke="#374151" strokeWidth={2} />
          <line x1={CHARTL + 8} y1={ctTop + 24} x2={CHARTL + 8} y2={ctBottom}
            stroke="#374151" strokeWidth={2} />

          {/* 参考虚线 */}
          <line x1={CHARTL + 8} y1={ctMY - ctHH} x2={W - 6} y2={ctMY - ctHH}
            stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4,4" />
          <line x1={CHARTL + 8} y1={ctMY + ctHH} x2={W - 6} y2={ctMY + ctHH}
            stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4,4" />

          {/* 轴标签 */}
          <text x={CHARTL + 4} y={ctMY - ctHH + 6} fontSize={11} fill="#9ca3af" textAnchor="end">+Em</text>
          <text x={CHARTL + 4} y={ctMY + 6} fontSize={11} fill="#9ca3af" textAnchor="end">0</text>
          <text x={CHARTL + 4} y={ctMY + ctHH + 6} fontSize={11} fill="#9ca3af" textAnchor="end">−Em</text>
          <text x={W - 6} y={ctMY + 18} fontSize={11} fill="#374151" textAnchor="end">t/s</text>
          <text x={CHARTL + 16} y={ctTop + 34} fontSize={10} fill="#374151">e/V</text>

          {/* 波形曲线 */}
          {hist.length > 1 && (
            <path d={makePath()} fill="none"
              stroke="#f97316" strokeWidth={2.5}
              strokeLinejoin="round" strokeLinecap="round" />
          )}

          {/* 当前时刻线 */}
          {hist.length > 0 && (
            <line x1={nowX} y1={ctTop + 24} x2={nowX} y2={ctBottom}
              stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3,3" />
          )}

          {/* 当前值圆点 */}
          {hist.length > 0 && (
            <circle cx={nowX} cy={nowY} r={6}
              fill="#f97316" stroke="white" strokeWidth={2.2} />
          )}

          {/* 当前值文字 */}
          {hist.length > 0 && (
            <text x={nowX + 10}
              y={Math.max(ctTop + 30, Math.min(ctBottom - 10, nowY - 6))}
              fontSize={13} fill="#f97316" fontWeight="bold">
              {emfTxt + ' V'}
            </text>
          )}
        </g>
      </svg>
    </div>
  )
}
