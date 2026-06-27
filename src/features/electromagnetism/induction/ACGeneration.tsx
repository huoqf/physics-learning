/**
 * ACGeneration.tsx — 交变电流产生与图像 [M4-1]
 *
 * 优化版：中间屏左右分区（左=SVG RotatingCoil，右=MiniChart 时序曲线）
 * 支持基础/进阶模式、速度分解矢量、线圈法线显示
 *
 * @agent-rule 使用 useAnimationFrame 驱动动画
 * @agent-rule 遵循 useCanvasSize + PHYSICS_COLORS theme token
 * @agent-rule 中间屏左右分区：左侧 SVG 仿真，右侧 MiniChart 时序曲线
 */
import { useRef, useMemo, useCallback } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, FONT } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { MagneticPoles, RotatingCoil } from '@/components/Physics'
import { MiniChart } from '@/components/UI'
import type { MiniChartLine, MiniChartStaticLine } from '@/components/UI/MiniChart'
import { computeACGenerationState } from '@/physics/acCircuit'

type Point2D = { x: number; y: number }

export default function ACGeneration() {
  const { params, isPlaying, speed } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      speed: s.speed,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.extraWide)
  const { font } = canvasSize

  const mode = params.mode ?? 0
  const B = params.B ?? 0.5
  const S = params.S ?? 0.04
  const omega = params.omega ?? 2
  const N = params.N ?? 100
  const initialPhase = params.initialPhase ?? 0
  const showVelocityDecomp = params.showVelocityDecomp ?? 0
  const showCoilNormal = params.showCoilNormal ?? 0

  // ── 动画时间 ──────────────────────────────────────────────────────────────
  const tRef = useRef(0)
  useAnimationFrame(
    (dt) => { tRef.current += (dt / 1000) * (speed ?? 1) },
    { playing: isPlaying, speed: speed ?? 1 }
  )
  const t = tRef.current

  // ── 物理状态计算（纯函数） ──────────────────────────────────────────────
  const state = useMemo(
    () => computeACGenerationState(B, S, omega, N, initialPhase, t),
    [B, S, omega, N, initialPhase, t]
  )
  const { phi, e, Em, theta, vTangential, vPerp, vPara, isNeutral, isMaxEmf } = state

  // ── Canvas 尺寸 ───────────────────────────────────────────────────────────
  const W = canvasSize.width
  const H = canvasSize.height
  const SIMW = Math.round(W * 0.48)
  const CHARTL = SIMW + font(12)
  const CHARTW = W - CHARTL - font(6)

  // ═══════════════════════════════════════════════════════════════════════════
  // 3D 投影系统
  // ═══════════════════════════════════════════════════════════════════════════
  const SCALE = 45
  const Z_ANGLE = Math.PI / 6
  const Z_SCALE = 0.55
  const OX = SIMW * 0.5
  const OY = H * 0.42

  const project3D = useCallback((x: number, y: number, z: number): Point2D => {
    const sx = x + z * Z_SCALE * Math.cos(Z_ANGLE)
    const sy = -y - z * Z_SCALE * Math.sin(Z_ANGLE)
    return { x: OX + sx * SCALE, y: OY + sy * SCALE }
  }, [OX, OY, SCALE, Z_ANGLE])

  // ═══════════════════════════════════════════════════════════════════════════
  // 磁感线（立体多排分布）
  // ═══════════════════════════════════════════════════════════════════════════
  const fieldLines = useMemo(() => {
    const lines: { p1: Point2D; p2: Point2D }[] = []
    const cfgs = [
      { y: 1.0, z: 0.8 }, { y: 0.0, z: 0.8 }, { y: -1.0, z: 0.8 },
      { y: 0.7, z: 0.0 }, { y: -0.3, z: 0.0 }, { y: -0.7, z: 0.0 },
      { y: 0.9, z: -0.8 }, { y: -0.1, z: -0.8 }, { y: -0.9, z: -0.8 },
    ]
    cfgs.forEach(cfg => {
      lines.push({
        p1: project3D(-1.55, cfg.y, cfg.z),
        p2: project3D(1.55, cfg.y, cfg.z)
      })
    })
    return lines
  }, [project3D])

  // ═══════════════════════════════════════════════════════════════════════════
  // 转轴和旋转箭头
  // ═══════════════════════════════════════════════════════════════════════════
  const axisStart = project3D(0, 0, 3.2)
  const axisEnd = project3D(0, 0, -2.6)
  const omegaPos = project3D(0.8, -0.5, -2.5)

  const rx = font(22), ry = font(12)
  const arrowX1 = omegaPos.x - rx * Math.cos(Z_ANGLE)
  const arrowY1 = omegaPos.y - font(10) + rx * Math.sin(Z_ANGLE)
  const arrowX2 = omegaPos.x + rx * Math.cos(Z_ANGLE)
  const arrowY2 = omegaPos.y - font(10) - rx * Math.sin(Z_ANGLE)
  const rotationArrowPath = `M ${arrowX1} ${arrowY1} A ${rx} ${ry} ${-Z_ANGLE * 180 / Math.PI} 0 1 ${arrowX2} ${arrowY2}`

  // ═══════════════════════════════════════════════════════════════════════════
  // 速度分解矢量（进阶可视化）
  // ═══════════════════════════════════════════════════════════════════════════
  const coilRadius = Math.sqrt(S / Math.PI)
  // 目标像素长度：速度矢量最大分量在屏幕上显示约 12% 画布宽度
  const maxVecPixels = Math.min(W, H) * 0.12
  const vTangentialSafe = Math.abs(vTangential) < 1e-6 ? 1 : vTangential
  // 3D 坐标缩放因子：使得 vTangential 对应的屏幕长度 ≈ maxVecPixels
  const vScale = maxVecPixels / (Math.abs(vTangentialSafe) * SCALE)

  // 线圈侧边中心点（用于绘制速度矢量起点）
  const sideCenter3D = {
    x: coilRadius * Math.sin(theta),
    y: coilRadius * Math.cos(theta),
    z: 0,
  }
  const sideCenter2D = project3D(sideCenter3D.x, sideCenter3D.y, sideCenter3D.z)

  // 速度矢量投影（总速度在屏幕上的偏移量）
  const vTotalVec = project3D(vPara * vScale, vPerp * vScale, 0)
  const origin2D = project3D(0, 0, 0)

  // 辅助函数：绘制带三角形箭头头部的矢量线段
  const renderArrow = (
    x1: number, y1: number, x2: number, y2: number,
    color: string, sw: number, dash?: string, headSize?: number,
  ) => {
    const dx = x2 - x1, dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1) return null
    const ux = dx / len, uy = dy / len
    const hs = headSize ?? Math.min(font(10), len * 0.3)
    const hw = hs * 0.55
    const lineEndX = x2 - ux * hs, lineEndY = y2 - uy * hs
    const perpX = -uy, perpY = ux
    return (
      <g>
        <line x1={x1} y1={y1} x2={lineEndX} y2={lineEndY}
          stroke={color} strokeWidth={sw} strokeDasharray={dash} strokeLinecap="round" />
        <polygon
          points={`${x2},${y2} ${lineEndX + perpX * hw},${lineEndY + perpY * hw} ${lineEndX - perpX * hw},${lineEndY - perpY * hw}`}
          fill={color} />
      </g>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 线圈法线轴显示
  // ═══════════════════════════════════════════════════════════════════════════
  const normalStart = project3D(0, 0, 0)
  const normalLen = 1.2
  const normalEnd = project3D(
    Math.sin(theta) * normalLen,
    Math.cos(theta) * normalLen,
    0
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // MiniChart 时序数据
  // ═══════════════════════════════════════════════════════════════════════════
  const CHART_WINDOW = 8
  const histRef = useRef<{ t: number; phi: number; e: number }[]>([])
  if (isPlaying) {
    histRef.current.push({ t, phi, e })
    const cut = t - CHART_WINDOW
    histRef.current = histRef.current.filter((p) => p.t >= cut)
  }
  const hist = histRef.current
  const tMin = Math.max(0, t - CHART_WINDOW)
  const tMax = t > CHART_WINDOW ? t : CHART_WINDOW

  const chartLines: MiniChartLine[] = useMemo(() => [
    { key: 'phi', color: PHYSICS_COLORS.magneticField, name: 'Φ (Wb)', strokeWidth: 2 },
    { key: 'e', color: PHYSICS_COLORS.emf, name: 'e (V)', strokeWidth: 2 },
  ], [])

  const chartStaticLines: MiniChartStaticLine[] = useMemo(() => [
    { value: Em, color: PHYSICS_COLORS.emf, strokeDasharray: '4,4', name: 'Em' },
    { value: -Em, color: PHYSICS_COLORS.emf, strokeDasharray: '4,4', name: '-Em' },
    { value: B * S, color: PHYSICS_COLORS.magneticField, strokeDasharray: '4,4', name: 'BS' },
    { value: -B * S, color: PHYSICS_COLORS.magneticField, strokeDasharray: '4,4', name: '-BS' },
  ], [Em, B, S])

  // ═══════════════════════════════════════════════════════════════════════════
  // 预计算文本值
  // ═══════════════════════════════════════════════════════════════════════════
  const emfTxt = e.toFixed(2)
  const EmTxt = Em.toFixed(2)
  const fHz = (omega / (2 * Math.PI)).toFixed(2)
  const degTxt = ((theta * 180 / Math.PI) % 360).toFixed(0)
  const statusY = H - font(52)
  const fmTr = 'translate(' + font(6) + ',' + (H - font(44)).toFixed(0) + ')'

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={W} height={H}
        className="bg-white rounded-lg shadow-inner select-none"
        style={{ display: 'block' }}>

        {/* 左右分界线 */}
        <line x1={SIMW} y1={0} x2={SIMW} y2={H} stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid} />

        {/* ═══════════ 左侧仿真区 ═══════════ */}
        <g>
          {/* 磁场标注 */}
          <text x={OX} y={13} textAnchor="middle"
            fontSize={FONT.subtickSize} fill={PHYSICS_COLORS.magnetSouth} fontWeight="bold">
            {'匀强磁场 B = ' + B.toFixed(1) + ' T'}
          </text>

          {/* 1. 转轴 */}
          <g id="layer-shaft">
            <line x1={axisStart.x} y1={axisStart.y} x2={axisEnd.x} y2={axisEnd.y}
              stroke={SCENE_COLORS.pendulum.rodStroke} strokeWidth={6} strokeLinecap="round" />
            <line x1={axisStart.x} y1={axisStart.y} x2={axisEnd.x} y2={axisEnd.y}
              stroke={SCENE_COLORS.pendulum.rodFill} strokeWidth={3.5} strokeLinecap="round" />
            <line x1={axisStart.x} y1={axisStart.y} x2={axisEnd.x} y2={axisEnd.y}
              stroke={SCENE_COLORS.pendulum.pivotFill} strokeWidth={1.5} strokeDasharray="8,12" strokeLinecap="round" />
          </g>

          {/* 2. 后层磁铁 */}
          <MagneticPoles project3D={project3D} layer="back" />

          {/* 3. 磁感线层 */}
          <g id="layer-field-lines">
            {fieldLines.map((line, i) => (
              <g key={i}>
                <line x1={line.p1.x} y1={line.p1.y} x2={line.p2.x} y2={line.p2.y}
                  stroke="rgba(96, 165, 250, 0.18)" strokeWidth={7} strokeLinecap="round" />
                <line x1={line.p1.x} y1={line.p1.y} x2={line.p2.x} y2={line.p2.y}
                  stroke="rgba(96, 165, 250, 0.45)" strokeWidth={3} strokeLinecap="round" />
                <line x1={line.p1.x} y1={line.p1.y} x2={line.p2.x} y2={line.p2.y}
                  stroke="rgba(255, 255, 255, 0.85)" strokeWidth={1.5} strokeLinecap="round"
                  strokeDasharray="12, 36" strokeDashoffset={-t * 50} style={{ filter: 'blur(0.5px)' }} />
                <polygon
                  points={`${line.p2.x},${line.p2.y} ${line.p2.x - font(12)},${line.p2.y - font(6)} ${line.p2.x - font(12)},${line.p2.y + font(6)}`}
                  fill="rgba(96, 165, 250, 0.9)" />
              </g>
            ))}
          </g>

          {/* 4. 线圈法线轴（可选） */}
          {showCoilNormal === 1 && (
            <g id="layer-coil-normal" opacity={0.7}>
              {renderArrow(
                normalStart.x, normalStart.y, normalEnd.x, normalEnd.y,
                PHYSICS_COLORS.labelText, font(2), '6,4',
              )}
              <text
                x={normalEnd.x + font(8)} y={normalEnd.y - font(4)}
                fontSize={font(11)} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
                n̂
              </text>
            </g>
          )}

          {/* 5. 速度分解矢量（可选） */}
          {showVelocityDecomp === 1 && Math.abs(vTangential) > 0.01 && (
            <g id="layer-velocity-decomp" opacity={0.85}>
              {/* 总速度 v */}
              {renderArrow(
                sideCenter2D.x, sideCenter2D.y,
                sideCenter2D.x + (vTotalVec.x - origin2D.x),
                sideCenter2D.y + (vTotalVec.y - origin2D.y),
                PHYSICS_COLORS.velocity, font(2.5),
              )}
              <text
                x={sideCenter2D.x + (vTotalVec.x - origin2D.x) + font(6)}
                y={sideCenter2D.y + (vTotalVec.y - origin2D.y) - font(4)}
                fontSize={font(10)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">
                v
              </text>

              {/* 垂直分量 v⊥（切割有效速度） */}
              {Math.abs(vPerp) > 0.01 && (() => {
                const vPerpPt = project3D(0, vPerp * vScale, 0)
                const endX = sideCenter2D.x + (vPerpPt.x - origin2D.x)
                const endY = sideCenter2D.y + (vPerpPt.y - origin2D.y)
                return (
                  <>
                    {renderArrow(sideCenter2D.x, sideCenter2D.y, endX, endY,
                      PHYSICS_COLORS.magneticField, font(2), '5,3')}
                    <text x={endX + font(6)} y={endY + font(12)}
                      fontSize={font(9)} fill={PHYSICS_COLORS.magneticField}>
                      v⊥
                    </text>
                  </>
                )
              })()}

              {/* 平行分量 v∥（不产生感应电动势） */}
              {Math.abs(vPara) > 0.01 && (() => {
                const vParaPt = project3D(vPara * vScale, 0, 0)
                const endX = sideCenter2D.x + (vParaPt.x - origin2D.x)
                const endY = sideCenter2D.y + (vParaPt.y - origin2D.y)
                return (
                  <>
                    {renderArrow(sideCenter2D.x, sideCenter2D.y, endX, endY,
                      PHYSICS_COLORS.labelTextLight, font(1.5), '3,3')}
                    <text x={endX + font(6)} y={endY + font(12)}
                      fontSize={font(9)} fill={PHYSICS_COLORS.labelTextLight}>
                      v∥
                    </text>
                  </>
                )
              })()}

              {/* 虚线矩形投影辅助线 */}
              {Math.abs(vPerp) > 0.01 && Math.abs(vPara) > 0.01 && (() => {
                const vPerpPt = project3D(0, vPerp * vScale, 0)
                const vParaPt = project3D(vPara * vScale, 0, 0)
                return (
                  <>
                    <line
                      x1={sideCenter2D.x + (vParaPt.x - origin2D.x)}
                      y1={sideCenter2D.y + (vParaPt.y - origin2D.y)}
                      x2={sideCenter2D.x + (vTotalVec.x - origin2D.x)}
                      y2={sideCenter2D.y + (vTotalVec.y - origin2D.y)}
                      stroke={PHYSICS_COLORS.labelTextLight}
                      strokeWidth={0.8}
                      strokeDasharray="2,3"
                      opacity={0.5}
                    />
                    <line
                      x1={sideCenter2D.x + (vPerpPt.x - origin2D.x)}
                      y1={sideCenter2D.y + (vPerpPt.y - origin2D.y)}
                      x2={sideCenter2D.x + (vTotalVec.x - origin2D.x)}
                      y2={sideCenter2D.y + (vTotalVec.y - origin2D.y)}
                      stroke={PHYSICS_COLORS.labelTextLight}
                      strokeWidth={0.8}
                      strokeDasharray="2,3"
                      opacity={0.5}
                    />
                  </>
                )
              })()}
            </g>
          )}

          {/* 6. 旋转线圈组件 */}
          <RotatingCoil
            project3D={project3D}
            theta={theta}
            t={t}
            emf={e}
            maxEmf={Em}
            colorMode="split"
            showSlipRings={true}
            showBrushes={true}
          />

          {/* 7. 前层磁铁 */}
          <MagneticPoles project3D={project3D} layer="front" />

          {/* 8. ω 旋转指示层 */}
          <g id="layer-rotation-indicator">
            <text x={omegaPos.x - font(35)} y={omegaPos.y + font(10)}
              className="omega-text" fontWeight="bold" fontStyle="italic"
              fontSize={font(28)} fill={SCENE_COLORS.pendulum.axisDecor} fontFamily="Times New Roman">ω</text>
            <path d={rotationArrowPath} fill="none" stroke={SCENE_COLORS.pendulum.axisDecor} strokeWidth={8} strokeLinecap="round" opacity={0.08} />
            <path d={rotationArrowPath} fill="none" stroke={SCENE_COLORS.pendulum.axisDecor} strokeWidth={5} strokeLinecap="round" opacity={0.15} />
            <path d={rotationArrowPath} fill="none" stroke={SCENE_COLORS.pendulum.axisDecor} strokeWidth={2.5} strokeLinecap="round" />
            <polygon
              points={`${omegaPos.x - rx},${omegaPos.y - font(25)} ${omegaPos.x - font(10)},${omegaPos.y - font(24)} ${omegaPos.x - font(25)},${omegaPos.y - font(13)}`}
              fill={SCENE_COLORS.pendulum.axisDecor} />
          </g>

          {/* ── 状态标注 ── */}
          {isNeutral && (
            <text x={OX} y={statusY} textAnchor="middle"
              fontSize={FONT.subtickSize} fill={PHYSICS_COLORS.magnetSouth} fontWeight="bold">
              中性面：线圈面 ⊥ B，dΦ/dt = 0，e = 0
            </text>
          )}
          {isMaxEmf && (
            <text x={OX} y={statusY} textAnchor="middle"
              fontSize={FONT.subtickSize} fill={PHYSICS_COLORS.magnetNorth} fontWeight="bold">
              线圈面 ∥ B，|dΦ/dt| 最大，|e| = Em
            </text>
          )}
          {!isNeutral && !isMaxEmf && (
            <text x={OX} y={statusY} textAnchor="middle"
              fontSize={CANVAS_STYLE.font.smallSize} fill={colors.neutral[500]}>
              {'线圈切割磁感线，e = ' + emfTxt + ' V'}
            </text>
          )}

          {/* ── 底部公式栏 ── */}
          <g transform={fmTr}>
            <rect width={SIMW - font(12)} height={font(36)} rx={font(5)}
              fill={colors.neutral[50]} opacity={0.95} stroke={PHYSICS_COLORS.grid} strokeWidth={1} />
            <text x={font(8)} y={font(14)} fontSize={CANVAS_STYLE.font.smallSize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
              {mode === 1
                ? 'e = NBSω · sin(ωt + θ₀)'
                : 'e = NBSω · sin(ωt)（中性面 θ=0 时线圈⊥B，e=0）'}
            </text>
            <text x={font(8)} y={font(28)} fontSize={font(9.5)} fill={colors.neutral[500]}>
              {'Em = ' + EmTxt + ' V   f = ' + fHz + ' Hz   θ = ' + degTxt + '°   e = ' + emfTxt + ' V'}
            </text>
          </g>
        </g>

        {/* ═══════════ 右侧 MiniChart 时序曲线 ════════════ */}
        <foreignObject x={CHARTL} y={0} width={CHARTW} height={H}>
          <div style={{ width: '100%', height: '100%', padding: font(8) }}>
            <MiniChart
              title="Φ − t 与 e − t 时序曲线"
              xMin={tMin}
              xMax={tMax}
              yMin={-(Em * 1.3 || 1)}
              yMax={Em * 1.3 || 1}
              points={hist}
              lines={chartLines}
              xKey="t"
              yLabel="Φ (Wb) / e (V)"
              xLabel="t / s"
              currentVals={{ phi, e }}
              currentXVal={t}
              staticLines={chartStaticLines}
              minWidth={200}
              minHeight={H - 20}
            />
          </div>
        </foreignObject>
      </svg>
    </div>
  )
}
