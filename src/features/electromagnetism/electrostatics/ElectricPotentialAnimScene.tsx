import { VectorArrow, EnergyBars } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationViewport } from '@/hooks'
import { useViewportPointer } from '@/utils'
import React, { useRef, useState, useCallback } from 'react'
import { PHYSICS_COLORS, EM_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import type { ElectricPotentialPhysicsResult, PathPoint } from './hooks/useElectricPotentialPhysics'
import {
  X_A, Y_A, X_Q, Y_Q, X_B, Y_B,
  POTENTIAL_DESIGN_W, POTENTIAL_DESIGN_H,
} from './hooks/useElectricPotentialPhysics'

interface Props {
  physics: ElectricPotentialPhysicsResult
  drawMode: number
  isPlaying: boolean
  runProgress: number
  qProbe: number
  handPath: PathPoint[]
  handPathD: string
  onHandPathChange: (path: PathPoint[]) => void
}

export function ElectricPotentialAnimScene({
  physics,
  drawMode,
  isPlaying,
  runProgress,
  qProbe,
  handPath,
  handPathD,
  onHandPathChange,
}: Props) {
  const {
    posA,
    posB,
    posQ,
    particleCanvasPos,
    particlePhysics,
    eFieldVectors,
    hoverIndicator,
    particleForceArrow,
    designToPhysics,
  } = physics

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const svgRef = useRef<SVGSVGElement>(null)
  const getSvgPoint = useViewportPointer(svgRef)

  const [localDrawing, setLocalDrawing] = useState(false)
  const [localHandPath, setLocalHandPath] = useState<PathPoint[]>([])

  const toPhysics = useCallback(
    (clientX: number, clientY: number) => {
      const pt = getSvgPoint(clientX, clientY)
      if (!pt) return null
      const dx = (pt.x - vp.tx) / vp.scale
      const dy = (pt.y - vp.ty) / vp.scale
      return designToPhysics(dx, dy)
    },
    [getSvgPoint, vp.tx, vp.ty, vp.scale, designToPhysics]
  )

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (drawMode !== 1 || isPlaying) return
    const phys = toPhysics(e.clientX, e.clientY)
    if (!phys) return

    const distToA = Math.hypot(phys.xp - X_A, phys.yp - Y_A)
    if (distToA < 0.45) {
      setLocalDrawing(true)
      setLocalHandPath([{ x: X_A, y: Y_A }])
    }
  }, [drawMode, isPlaying, toPhysics])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!localDrawing) return
    const phys = toPhysics(e.clientX, e.clientY)
    if (!phys) return

    const xpClamped = Math.max(0.1, Math.min(6.9, phys.xp))
    const ypClamped = Math.max(0.1, Math.min(3.4, phys.yp))

    const distToQ = Math.hypot(xpClamped - X_Q, ypClamped - Y_Q)
    if (distToQ < 0.3) return

    const lastPt = localHandPath[localHandPath.length - 1]
    const distToLast = Math.hypot(xpClamped - lastPt.x, ypClamped - lastPt.y)
    if (distToLast > 0.08) {
      setLocalHandPath((prev) => [...prev, { x: xpClamped, y: ypClamped }])
    }
  }, [localDrawing, toPhysics, localHandPath])

  const handlePointerUp = useCallback((_e: React.PointerEvent<SVGSVGElement>) => {
    if (!localDrawing) return
    setLocalDrawing(false)

    if (localHandPath.length < 3) {
      setLocalHandPath([])
      return
    }
    const completedPath = [...localHandPath, { x: X_B, y: Y_B }]
    setLocalHandPath(completedPath)
    onHandPathChange(completedPath)
  }, [localDrawing, localHandPath, onHandPathChange])

  const activeHandPath = localDrawing ? localHandPath : handPath

  const activeHandPathD = activeHandPath.length >= 2
    ? activeHandPath
        .map((p, idx) => {
          const { cx, cy } = physics.physicsToDesign(p.x, p.y)
          return `${idx === 0 ? 'M' : 'L'} ${cx.toFixed(1)},${cy.toFixed(1)}`
        })
        .join(' ')
    : handPathD

  const groundY = POTENTIAL_DESIGN_H - 18

  return (
    <div className="w-full flex-1 min-h-0 relative bg-white border-t border-neutral-100">
      <AnimationSvgCanvas
        containerRef={containerRef}
        transform={vp.transform}
        svgRef={svgRef}
        className={drawMode === 1 && !isPlaying ? 'cursor-crosshair' : 'cursor-default'}
        onMouseDown={handleMouseDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <radialGradient id="source-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PHYSICS_COLORS.positiveCharge} stopOpacity="0.22" />
            <stop offset="100%" stopColor={PHYSICS_COLORS.positiveCharge} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. 底部大地 0V 参考线及标准接地符号 */}
        <line
          x1={0}
          y1={groundY}
          x2={POTENTIAL_DESIGN_W}
          y2={groundY}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={2.5}
        />
        <g opacity={0.75}>
          <line x1={POTENTIAL_DESIGN_W / 2} y1={groundY} x2={POTENTIAL_DESIGN_W / 2} y2={groundY + 7} stroke={CANVAS_COLORS.trackHistory} strokeWidth={1.8} />
          <line x1={POTENTIAL_DESIGN_W / 2 - 11} y1={groundY + 7} x2={POTENTIAL_DESIGN_W / 2 + 11} y2={groundY + 7} stroke={CANVAS_COLORS.trackHistory} strokeWidth={1.8} />
          <line x1={POTENTIAL_DESIGN_W / 2 - 7} y1={groundY + 11} x2={POTENTIAL_DESIGN_W / 2 + 7} y2={groundY + 11} stroke={CANVAS_COLORS.trackHistory} strokeWidth={1.5} />
          <line x1={POTENTIAL_DESIGN_W / 2 - 3} y1={groundY + 15} x2={POTENTIAL_DESIGN_W / 2 + 3} y2={groundY + 15} stroke={CANVAS_COLORS.trackHistory} strokeWidth={1.2} />
        </g>

        {/* 2. 背景非匀强矢量电场箭头网格 */}
        <g opacity={0.85}>
          {eFieldVectors.map((v, i) => {
            const len = Math.sqrt(v.dx * v.dx + v.dy * v.dy)
            return len > 0.1 ? (
              <VectorArrow
                key={`ev-${i}`}
                originDesign={{ x: v.cx, y: v.cy }}
                vector={{ x: v.dx, y: -v.dy }}
                type="electricField"
                arrowType="visual-only"
                sceneScale={IDENTITY_SCENE_SCALE}
                pixelLength={len}
                strokeWidth={1.0}
              />
            ) : null
          })}
        </g>

        {/* 3. A、B 端点与水平辅助虚线 */}
        <line
          x1={posA.cx}
          y1={posA.cy}
          x2={posB.cx}
          y2={posB.cy}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={1.5}
          strokeDasharray="4,6"
        />

        {/* A 锚点 */}
        {drawMode === 1 && !isPlaying && activeHandPath.length === 0 && (
          <circle
            cx={posA.cx}
            cy={posA.cy}
            r={22}
            fill="none"
            stroke={EM_COLORS.electricPotential}
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
          fill={CANVAS_COLORS.white}
          stroke={drawMode === 1 && !isPlaying ? EM_COLORS.electricPotential : colors.neutral[400]}
          strokeWidth={1.8}
          style={{ cursor: drawMode === 1 && !isPlaying ? 'crosshair' : 'default' }}
        />
        <circle cx={posA.cx} cy={posA.cy} r={4} fill={drawMode === 1 && !isPlaying ? EM_COLORS.electricPotential : colors.neutral[500]} />
        <text
          x={posA.cx}
          y={posA.cy + 24}
          fontSize={font(10.5)}
          fontWeight="black"
          fill={drawMode === 1 && !isPlaying ? EM_COLORS.electricPotential : colors.neutral[600]}
          textAnchor="middle"
        >
          A (起点)
        </text>

        {/* B 锚点 */}
        <circle cx={posB.cx} cy={posB.cy} r={12} fill={CANVAS_COLORS.white} stroke={colors.neutral[400]} strokeWidth={1.5} />
        <circle cx={posB.cx} cy={posB.cy} r={4} fill={colors.neutral[500]} />
        <text x={posB.cx} y={posB.cy + 24} fontSize={font(10.5)} fontWeight="black" fill={colors.neutral[600]} textAnchor="middle">
          B (终点)
        </text>

        {/* 4. 场源正电荷 */}
        <circle cx={posQ.cx} cy={posQ.cy} r={45} fill="url(#source-glow)" />
        <circle cx={posQ.cx} cy={posQ.cy} r={18} fill={PHYSICS_COLORS.positiveCharge} stroke={CANVAS_COLORS.white} strokeWidth={1.8} className="drop-shadow-md" />
        <text x={posQ.cx} y={posQ.cy} fontSize={font(16)} fontWeight="bold" fill={CANVAS_COLORS.white} textAnchor="middle" dominantBaseline="middle">
          +Q
        </text>
        <text x={posQ.cx} y={posQ.cy - 24} fontSize={font(9.5)} fontWeight="bold" fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
          固电荷场源 (+2μC)
        </text>

        {/* 5. 轨道路径渲染 */}
        {drawMode === 0 && (
          <line
            x1={posA.cx}
            y1={posA.cy}
            x2={posB.cx}
            y2={posB.cy}
            stroke={EM_COLORS.electricPotential}
            strokeWidth={3}
            opacity={0.8}
            strokeLinecap="round"
          />
        )}

        {drawMode === 1 && activeHandPathD && (
          <path
            d={activeHandPathD}
            fill="none"
            stroke={EM_COLORS.electricPotential}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
        )}

        {drawMode === 1 && activeHandPath.length === 0 && (
          <g opacity={0.5}>
            <path
              d={`M ${posA.cx},${posA.cy} C ${(posA.cx + posB.cx)/2},${posA.cy - 120} ${(posA.cx + posB.cx)/2},${posA.cy - 120} ${posB.cx},${posB.cy}`}
              fill="none"
              stroke={colors.neutral[400]}
              strokeWidth={2}
              strokeDasharray="4,4"
            />
            <text x={(posA.cx + posB.cx)/2} y={posA.cy - 70} fontSize={font(11)} fill={colors.neutral[500]} textAnchor="middle" fontWeight="bold">
              按住 A 拖动鼠标绘制自定义轨迹至 B
            </text>
          </g>
        )}

        {/* 6. Hover 图像时，在动画直线上显示的高亮合场强矢量 E */}
        {!isPlaying && (
          <g>
            <line
              x1={hoverIndicator.cx}
              y1={0}
              x2={hoverIndicator.cx}
              y2={POTENTIAL_DESIGN_H}
              stroke={PHYSICS_COLORS.tangentLine}
              strokeWidth={1}
              strokeDasharray="2,4"
              opacity={0.5}
            />
            <VectorArrow
              originDesign={{ x: hoverIndicator.cx, y: hoverIndicator.cy }}
              vector={{ x: hoverIndicator.dx, y: -hoverIndicator.dy }}
              type="electricField"
              arrowType="visual-only"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={Math.sqrt(hoverIndicator.dx * hoverIndicator.dx + hoverIndicator.dy * hoverIndicator.dy)}
              strokeWidth={hoverIndicator.thickness}
            />
            <text
              x={hoverIndicator.cx + hoverIndicator.dx + (hoverIndicator.dx >= 0 ? 12 : -12)}
              y={hoverIndicator.cy + hoverIndicator.dy - 6}
              fontSize={font(11.5)}
              fontWeight="black"
              fill={PHYSICS_COLORS.electricField}
              textAnchor="middle"
            >
              E
            </text>
            <circle cx={hoverIndicator.cx} cy={hoverIndicator.cy} r={4} fill={PHYSICS_COLORS.electricField} />
          </g>
        )}

        {/* 7. 粒子主体 (带虚线交互外圈) */}
        {(isPlaying || runProgress > 0) && (
          <g>
            {particleForceArrow && (
              <g>
                <VectorArrow
                  originDesign={{ x: particleCanvasPos.cx, y: particleCanvasPos.cy }}
                  vector={{ x: particleForceArrow.dx, y: -particleForceArrow.dy }}
                  type="electricForce"
                  arrowType="visual-only"
                  sceneScale={IDENTITY_SCENE_SCALE}
                  pixelLength={Math.sqrt(particleForceArrow.dx * particleForceArrow.dx + particleForceArrow.dy * particleForceArrow.dy)}
                  strokeWidth={2.8}
                />
                <text
                  x={particleCanvasPos.cx + particleForceArrow.dx + (particleForceArrow.dx >= 0 ? 12 : -12)}
                  y={particleCanvasPos.cy + particleForceArrow.dy + 4}
                  fontSize={font(11)}
                  fontWeight="black"
                  fill={PHYSICS_COLORS.electricForce}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  F_电
                </text>
              </g>
            )}

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
            <circle cx={particleCanvasPos.cx} cy={particleCanvasPos.cy} r={10} fill={CANVAS_COLORS.white} opacity={0.85} />
            <circle
              cx={particleCanvasPos.cx}
              cy={particleCanvasPos.cy}
              r={8.5}
              fill={qProbe > 0 ? PHYSICS_COLORS.positiveCharge : qProbe < 0 ? PHYSICS_COLORS.negativeCharge : colors.neutral[400]}
              stroke={CANVAS_COLORS.white}
              strokeWidth={1.2}
              className="drop-shadow-md"
            />
            <text
              x={particleCanvasPos.cx}
              y={particleCanvasPos.cy + 0.2}
              fontSize={font(12)}
              fontWeight="black"
              fill={CANVAS_COLORS.white}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {qProbe > 0 ? '+' : qProbe < 0 ? '−' : '0'}
            </text>
            <text
              x={particleCanvasPos.cx}
              y={particleCanvasPos.cy - 18}
              fontSize={font(9.5)}
              fontWeight="bold"
              fill={PHYSICS_COLORS.labelText}
              textAnchor="middle"
            >
              试探电荷 ({qProbe > 0 ? '+' : ''}{qProbe.toFixed(1)}μC)
            </text>
          </g>
        )}
      </AnimationSvgCanvas>

      {/* 复用通用能量分配组件 */}
      <div className="absolute right-4 bottom-4 z-10" style={{ width: '150px' }}>
        <EnergyBars
          items={[
            {
              key: 'Ek',
              label: 'Ek\n动能',
              value: isPlaying || runProgress > 0 ? particlePhysics.pctEk : 50,
              color: PHYSICS_COLORS.kineticEnergy,
            },
            {
              key: 'Ep',
              label: 'Ep\n电势能',
              value: isPlaying || runProgress > 0 ? particlePhysics.pctEp : 50,
              color: PHYSICS_COLORS.potentialEnergy,
            },
          ]}
          normalizeMax={100}
          title="实时能量变化 (守恒)"
          compact
          font={font}
        />
      </div>

      {/* 标题与操作提示 */}
      <div className="absolute left-4 top-2 pointer-events-none bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs flex items-center gap-2 border border-neutral-200/50 shadow-sm">
        <span className="font-bold text-neutral-600">非匀强电场物理动画 (匀强场 + 点电荷)</span>
        {drawMode === 1 && !isPlaying && activeHandPath.length === 0 && (
          <span className="alert-card-info py-0.5 px-2 font-bold" style={{ fontSize: font(10) }}>
            请按住 A 点拖拽画线至 B
          </span>
        )}
      </div>
    </div>
  )
}
