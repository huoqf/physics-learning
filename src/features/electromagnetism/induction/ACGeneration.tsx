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
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { PHYSICS_COLORS, SCENE_COLORS, CHART_COLORS, CANVAS_STYLE, FONT } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { MagneticPoles, RotatingCoil } from '@/components/Physics'

type Point2D = { x: number; y: number }

// ─────────────────────────────────────────────────────────────────────────────
export default function ACGeneration() {
    const {params, isPlaying, speed} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    isPlaying: s.isPlaying,
    speed: s.speed,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 820, height: 480 })
  const { font } = canvasSize

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

  // ═══════════════════════════════════════════════════════════════════════════
  // 磁感线（立体多排分布）
  // ═══════════════════════════════════════════════════════════════════════════
  const fieldLines: { p1: Point2D; p2: Point2D }[] = []
  const lineConfigs = [
    { y: 1.1, z: 0.8 },
    { y: 0.3, z: 0.8 },
    { y: -0.5, z: 0.8 },

    { y: 0.7, z: 0.0 },
    { y: -0.1, z: 0.0 },
    { y: -0.9, z: 0.0 },

    { y: 1.0, z: -0.8 },
    { y: 0.2, z: -0.8 },
    { y: -0.6, z: -0.8 },
  ]
  lineConfigs.forEach(cfg => {
    fieldLines.push({
      p1: project3D(-1.55, cfg.y, cfg.z),
      p2: project3D(1.55, cfg.y, cfg.z)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 转轴和旋转箭头
  // ═══════════════════════════════════════════════════════════════════════════
  const axisStart = project3D(0, 0, 3.2)
  const axisEnd = project3D(0, 0, -2.6)
  const omegaPos = project3D(0.8, -0.5, -2.5)

  // 计算旋转箭头路径
  const rx = 22, ry = 12
  const arrowX1 = omegaPos.x - rx * Math.cos(Z_ANGLE)
  const arrowY1 = omegaPos.y - 10 + rx * Math.sin(Z_ANGLE)
  const arrowX2 = omegaPos.x + rx * Math.cos(Z_ANGLE)
  const arrowY2 = omegaPos.y - 10 - rx * Math.sin(Z_ANGLE)
  const rotationArrowPath = `M ${arrowX1} ${arrowY1} A ${rx} ${ry} ${-Z_ANGLE * 180 / Math.PI} 0 1 ${arrowX2} ${arrowY2}`

  // ═══════════════════════════════════════════════════════════════════════════
  // 状态判定
  // ═══════════════════════════════════════════════════════════════════════════
  const cosT = Math.cos(theta)
  const sinT = Math.sin(theta)
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
            <polygon points="0 0,7 2.5,0 5" fill={SCENE_COLORS.coil.enamelBase} />
          </marker>
        </defs>

        {/* 左右分界线 */}
        <line x1={SIMW} y1={0} x2={SIMW} y2={H} stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid} />

        {/* ═══════════ 左侧仿真区 ═══════════ */}
        <g>
          {/* 磁场标注 */}
          <text x={OX} y={13} textAnchor="middle"
            fontSize={FONT.subtickSize} fill={PHYSICS_COLORS.magnetSouth} fontWeight="bold">
            {'匀强磁场 B = ' + B.toFixed(1) + ' T'}
          </text>

          {/* 1. 转轴（置于最底层，因为它是轴心穿过线圈，线圈在它外面旋转） */}
          <g id="layer-shaft">
            {/* 转轴底层粗实线阴影/描边 */}
            <line x1={axisStart.x} y1={axisStart.y} x2={axisEnd.x} y2={axisEnd.y}
              stroke={SCENE_COLORS.pendulum.rodStroke} strokeWidth={6} strokeLinecap="round" />
            {/* 转轴亮色金属骨架线 */}
            <line x1={axisStart.x} y1={axisStart.y} x2={axisEnd.x} y2={axisEnd.y}
              stroke={SCENE_COLORS.pendulum.rodFill} strokeWidth={3.5} strokeLinecap="round" />
            {/* 轴心分段虚线点缀以表现 3D 立体旋转感 */}
            <line x1={axisStart.x} y1={axisStart.y} x2={axisEnd.x} y2={axisEnd.y}
              stroke={SCENE_COLORS.pendulum.pivotFill} strokeWidth={1.5} strokeDasharray="8,12" strokeLinecap="round" />
          </g>

          {/* 2. 后层磁铁 */}
          <MagneticPoles project3D={project3D} layer="back" />

          {/* 3. 磁感线层 */}
          <g id="layer-field-lines">
            {fieldLines.map((line, i) => (
              <g key={i}>
                {/* 磁感线发光底色线 */}
                <line x1={line.p1.x} y1={line.p1.y} x2={line.p2.x} y2={line.p2.y}
                  stroke="rgba(96, 165, 250, 0.18)" strokeWidth={7} strokeLinecap="round" />
                {/* 磁感线背景线 */}
                <line x1={line.p1.x} y1={line.p1.y} x2={line.p2.x} y2={line.p2.y}
                  stroke="rgba(96, 165, 250, 0.45)" strokeWidth={3} strokeLinecap="round" />
                {/* 动态流动光斑 */}
                <line x1={line.p1.x} y1={line.p1.y} x2={line.p2.x} y2={line.p2.y}
                  stroke="rgba(255, 255, 255, 0.85)" strokeWidth={1.5} strokeLinecap="round"
                  strokeDasharray="12, 36" strokeDashoffset={-t * 50} style={{ filter: 'blur(0.5px)' }} />
                {/* 精致的箭头 */}
                <polygon
                  points={`${line.p2.x},${line.p2.y} ${line.p2.x - 12},${line.p2.y - 6} ${line.p2.x - 12},${line.p2.y + 6}`}
                  fill="rgba(96, 165, 250, 0.9)" />
              </g>
            ))}
          </g>

          {/* 4. 旋转线圈组件 (包含滑环、碳刷与电流流动箭头) */}
          <RotatingCoil
            project3D={project3D}
            theta={theta}
            t={t}
            emf={emf}
            maxEmf={Em}
            colorMode="split"
            showSlipRings={true}
            showBrushes={true}
          />

          {/* 5. 前层磁铁 (包含 N/S 标签面，遮挡后面的线圈) */}
          <MagneticPoles project3D={project3D} layer="front" />

          {/* 6. ω 旋转指示层 (置于最前层) */}
          <g id="layer-rotation-indicator">
            {/* ω 符号 */}
            <text x={omegaPos.x - 35} y={omegaPos.y + 10}
              className="omega-text" fontWeight="bold" fontStyle="italic"
              fontSize={font(28)} fill={SCENE_COLORS.pendulum.axisDecor} fontFamily="Times New Roman">ω</text>

            {/* 旋转箭头残影底色 */}
            <path d={rotationArrowPath} fill="none" stroke={SCENE_COLORS.pendulum.axisDecor} strokeWidth={8} strokeLinecap="round" opacity={0.08} />
            <path d={rotationArrowPath} fill="none" stroke={SCENE_COLORS.pendulum.axisDecor} strokeWidth={5} strokeLinecap="round" opacity={0.15} />
            
            {/* 旋转箭头主线 */}
            <path d={rotationArrowPath} fill="none" stroke={SCENE_COLORS.pendulum.axisDecor} strokeWidth={2.5} strokeLinecap="round" />
            
            {/* 旋转箭头尖端 */}
            <polygon
              points={`${omegaPos.x - 22},${omegaPos.y - 25} ${omegaPos.x - 10},${omegaPos.y - 24} ${omegaPos.x - 25},${omegaPos.y - 13}`}
              fill={SCENE_COLORS.pendulum.axisDecor} />
          </g>

          {/* ── 状态标注 ── */}
          {isNeutral && (
            <text x={OX} y={H - 52} textAnchor="middle"
              fontSize={FONT.subtickSize} fill={PHYSICS_COLORS.magnetSouth} fontWeight="bold">
              中性面：线圈面 ⊥ B，dΦ/dt = 0，e = 0
            </text>
          )}
          {isMaxEmf && (
            <text x={OX} y={H - 52} textAnchor="middle"
              fontSize={FONT.subtickSize} fill={PHYSICS_COLORS.magnetNorth} fontWeight="bold">
              线圈面 ∥ B，|dΦ/dt| 最大，|e| = Em
            </text>
          )}
          {!isNeutral && !isMaxEmf && (
            <text x={OX} y={H - 52} textAnchor="middle"
              fontSize={CANVAS_STYLE.font.smallSize} fill={CHART_COLORS.compareC}>
              {'线圈切割磁感线，e = ' + emfTxt + ' V'}
            </text>
          )}

          {/* ── 底部公式栏 ── */}
          <g transform={fmTr}>
            <rect width={SIMW - 12} height={36} rx={5}
              fill={colors.neutral[50]} opacity={0.95} stroke={PHYSICS_COLORS.grid} strokeWidth={1} />
            <text x={8} y={14} fontSize={CANVAS_STYLE.font.smallSize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
              e = NBSω · sin(ωt)（中性面 θ=0 时线圈⊥B，e=0）
            </text>
            <text x={8} y={28} fontSize={font(9.5)} fill={colors.neutral[500]}>
              {'Em = ' + EmTxt + ' V   f = ' + fHz + ' Hz   θ = ' + degTxt + '°   e = ' + emfTxt + ' V'}
            </text>
          </g>
        </g>

        {/* ═══════════ 右侧 e-t 波形图（右上区域）═══════════ */}
        <g>
          <text x={CHARTL + 4} y={ctTop + 16}
            fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.electricForce} fontWeight="bold">
            e − t 图（电动势随时间变化）
          </text>

          {/* 坐标轴 */}
          <line x1={CHARTL + 8} y1={ctMY} x2={W - 6} y2={ctMY}
            stroke={CHART_COLORS.axisArrow} strokeWidth={CANVAS_STYLE.stroke.axisBold} />
          <line x1={CHARTL + 8} y1={ctTop + 24} x2={CHARTL + 8} y2={ctBottom}
            stroke={CHART_COLORS.axisArrow} strokeWidth={CANVAS_STYLE.stroke.axisBold} />

          {/* 参考虚线 */}
          <line x1={CHARTL + 8} y1={ctMY - ctHH} x2={W - 6} y2={ctMY - ctHH}
            stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.chartRef} strokeDasharray={CANVAS_STYLE.dash.axis.join(' ')} />
          <line x1={CHARTL + 8} y1={ctMY + ctHH} x2={W - 6} y2={ctMY + ctHH}
            stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.chartRef} strokeDasharray={CANVAS_STYLE.dash.axis.join(' ')} />

          {/* 轴标签 */}
          <text x={CHARTL + 4} y={ctMY - ctHH + 6} fontSize={FONT.subtickSize} fill={CHART_COLORS.tickLabel} textAnchor="end">+Em</text>
          <text x={CHARTL + 4} y={ctMY + 6} fontSize={FONT.subtickSize} fill={CHART_COLORS.tickLabel} textAnchor="end">0</text>
          <text x={CHARTL + 4} y={ctMY + ctHH + 6} fontSize={FONT.subtickSize} fill={CHART_COLORS.tickLabel} textAnchor="end">−Em</text>
          <text x={W - 6} y={ctMY + 18} fontSize={FONT.subtickSize} fill={CHART_COLORS.labelText} textAnchor="end">t/s</text>
          <text x={CHARTL + 16} y={ctTop + 34} fontSize={CANVAS_STYLE.font.smallSize} fill={CHART_COLORS.labelText}>e/V</text>

          {/* 波形曲线 */}
          {hist.length > 1 && (
            <path d={makePath()} fill="none"
              stroke={PHYSICS_COLORS.electricForce} strokeWidth={CANVAS_STYLE.stroke.chartMain}
              strokeLinejoin="round" strokeLinecap="round" />
          )}

          {/* 当前时刻线 */}
          {hist.length > 0 && (
            <line x1={nowX} y1={ctTop + 24} x2={nowX} y2={ctBottom}
              stroke={PHYSICS_COLORS.trackHistory} strokeWidth={CANVAS_STYLE.stroke.vectorSub} strokeDasharray={CANVAS_STYLE.dash.guide.join(' ')} />
          )}

          {/* 当前值圆点 */}
          {hist.length > 0 && (
            <circle cx={nowX} cy={nowY} r={6}
              fill={PHYSICS_COLORS.electricForce} stroke="white" strokeWidth={2.2} />
          )}

          {/* 当前值文字 */}
          {hist.length > 0 && (
            <text x={nowX + 10}
              y={Math.max(ctTop + 30, Math.min(ctBottom - 10, nowY - 6))}
              fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.electricForce} fontWeight="bold">
              {emfTxt + ' V'}
            </text>
          )}
        </g>
      </svg>
    </div>
  )
}
