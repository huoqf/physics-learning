import { useEffect, useRef, useState } from 'react'
import { useCanvasSize, useAnimationFrame } from '@/utils'
import { useAnimationStore, type MotionMode } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateCuttingEMF, simulateForceMotion } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { CuttingEMFHandRule } from './CuttingEMFHandRule'

const GRID_MARGIN = 40
const FONT = {
  title: 14,
  label: CANVAS_STYLE.font.labelSize,
  axis: CANVAS_STYLE.font.axisSize,
  magnetic: 16,
}

const TOOLBAR_HEIGHT = 44

type ForceMotionState = {
  v: number
  x: number
  F_ampere: number
  F_net: number
  a: number
  v_terminal: number
}

type DragState = {
  isDragging: boolean
  rodX: number
  v: number
  lastT: number
  lastRodX: number
}

const F_DRIVE_DEFAULT = 2
const MASS_DEFAULT = 0.1

interface ModeButtonProps {
  mode: MotionMode
  current: MotionMode
  label: string
  onClick: () => void
}

function ModeButton({ mode, current, label, onClick }: ModeButtonProps) {
  const active = mode === current
  return (
    <button
      onClick={onClick}
      className={
        'px-3 py-1.5 text-sm rounded-md font-medium transition-all duration-150 ' +
        (active
          ? 'bg-primary-600 text-white shadow-sm'
          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:scale-[0.97]')
      }
    >
      {label}
    </button>
  )
}

export default function CuttingEMF() {
    const {params, time, isPlaying, motionMode, setMotionMode} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    isPlaying: s.isPlaying,
    motionMode: s.motionMode,
    setMotionMode: s.setMotionMode,
    }))
  )
  const { B = 1, L = 0.5, v = 2, R = 2, theta = 90, r = 0, B_out = 0, handRule = 0 } = params
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 - TOOLBAR_HEIGHT })
  const { font } = canvasSize
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [, forceUpdate] = useState(0)

  const forceMotionRef = useRef<ForceMotionState>({
    v: 0, x: 0, F_ampere: 0, F_net: 0, a: 0, v_terminal: 0,
  })
  const dragRef = useRef<DragState>({
    isDragging: false, rodX: 0, v: 0, lastT: 0, lastRodX: 0,
  })

  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2 + 20
  const railW = 300
  const railH = 120
  const railLeft = cx - railW / 2
  const railRight = cx + railW / 2
  const railTop = cy - railH / 2
  const railBottom = cy + railH / 2

  const pxPerUnit = 30
  const maxTravel = railW / pxPerUnit

  const isAutoF = motionMode === 'auto-F'
  const isManual = motionMode === 'manual'

  useEffect(() => {
    if (motionMode === 'auto-F') {
      forceMotionRef.current = { v: 0, x: 0, F_ampere: 0, F_net: 0, a: 0, v_terminal: 0 }
      forceUpdate(n => n + 1)
    } else if (motionMode === 'manual') {
      dragRef.current = { isDragging: false, rodX: 0, v: 0, lastT: 0, lastRodX: 0 }
      forceUpdate(n => n + 1)
    }
  }, [motionMode])

  useAnimationFrame((deltaMs) => {
    if (!isAutoF || !isPlaying) return
    const dt = Math.min(deltaMs / 1000, 0.05)
    const prev = forceMotionRef.current
    const next = simulateForceMotion(B, L, prev.v, prev.x, R, theta, r, F_DRIVE_DEFAULT, MASS_DEFAULT, dt)
    if (next.x_new < 0) {
      next.x_new = 0
      next.v_new = Math.max(0, next.v_new)
    } else if (next.x_new > maxTravel) {
      next.x_new = maxTravel
      next.v_new = Math.min(0, next.v_new)
    }
    forceMotionRef.current = {
      v: next.v_new,
      x: next.x_new,
      F_ampere: next.F_ampere,
      F_net: next.F_net,
      a: next.a,
      v_terminal: next.v_terminal,
    }
    forceUpdate(n => n + 1)
  }, { playing: isPlaying && isAutoF })

  const effectiveV = isAutoF
    ? forceMotionRef.current.v
    : isManual
      ? dragRef.current.v
      : v

  const { EMF, I, F_ampere } = calculateCuttingEMF(B, L, effectiveV, R, theta, r, B_out)

  let rodX: number
  if (isAutoF) {
    const x = forceMotionRef.current.x
    rodX = railLeft + x * pxPerUnit
  } else if (isManual) {
    rodX = dragRef.current.rodX
    if (rodX === 0) rodX = railLeft
  } else {
    const rawDist = v * time * 0.3
    const travelDist = Math.max(0, Math.min(maxTravel, rawDist))
    rodX = railLeft + travelDist * pxPerUnit
  }

  const rodDirection = effectiveV > 0 ? 1 : effectiveV < 0 ? -1 : 0
  const fieldSymbol = B_out === 1 ? '⊙' : '⊗'
  const fieldDirectionText = B_out === 1 ? '向外' : '向里'

  const gridCols = 10
  const gridRows = 4
  const gridSpacingX = railW / (gridCols - 1)
  const gridSpacingY = railH / (gridRows - 1)

  const bSymbols = []
  for (let i = 0; i < gridCols; i++) {
    for (let j = 0; j < gridRows; j++) {
      bSymbols.push(
        <text key={`b-${i}-${j}`} x={railLeft + 10 + i * gridSpacingX} y={railTop + 20 + j * gridSpacingY}
          fontSize={FONT.magnetic} fill={PHYSICS_COLORS.magneticField} opacity={0.25} textAnchor="middle">
          {fieldSymbol}
        </text>
      )
    }
  }

  const rodW = 6
  const rodH = railH + 10
  const showVArrow = Math.abs(effectiveV) > 0.01 || isManual
  const emfArrowUp = EMF > 0

  const rodRotation = 90 - theta
  const thetaRad = (theta * Math.PI) / 180
  const arcRadius = 22
  const arcStartX = rodX + arcRadius
  const arcStartY = cy
  const arcEndX = rodX + arcRadius * Math.cos(thetaRad)
  const arcEndY = cy - arcRadius * Math.sin(thetaRad)
  const labelRadius = arcRadius + 10
  const labelArcX = rodX + labelRadius * Math.cos(thetaRad / 2)
  const labelArcY = cy - labelRadius * Math.sin(thetaRad / 2)

  const fAmpereVis = isAutoF ? forceMotionRef.current.F_ampere : F_ampere
  const showFAmpereArrow = Math.abs(fAmpereVis) > 0.001

  const handlePointerDown = (e: React.PointerEvent<SVGRectElement>) => {
    if (!isManual) return
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const svgX = e.clientX - rect.left
    dragRef.current.isDragging = true
    dragRef.current.lastT = performance.now()
    dragRef.current.lastRodX = rodX
    dragRef.current.rodX = Math.max(railLeft, Math.min(railRight, svgX))
    dragRef.current.v = 0
    e.currentTarget.setPointerCapture(e.pointerId)
    forceUpdate(n => n + 1)
  }

  const handlePointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (!isManual || !dragRef.current.isDragging) return
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const svgX = e.clientX - rect.left
    const newRodX = Math.max(railLeft, Math.min(railRight, svgX))
    const now = performance.now()
    const dt = (now - dragRef.current.lastT) / 1000
    if (dt > 0.001) {
      const dx = newRodX - dragRef.current.lastRodX
      dragRef.current.v = dx / dt / pxPerUnit
    }
    dragRef.current.rodX = newRodX
    dragRef.current.lastT = now
    dragRef.current.lastRodX = newRodX
    forceUpdate(n => n + 1)
  }

  const handlePointerUp = (e: React.PointerEvent<SVGRectElement>) => {
    if (!isManual) return
    if (!dragRef.current.isDragging) return
    dragRef.current.isDragging = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200 shrink-0" style={{ height: TOOLBAR_HEIGHT }}>
        <span className="text-xs text-neutral-500 mr-1">运动模式：</span>
        <ModeButton mode="auto-v" current={motionMode} label="匀速运动" onClick={() => setMotionMode('auto-v')} />
        <ModeButton mode="auto-F" current={motionMode} label="受力运动" onClick={() => setMotionMode('auto-F')} />
        <ModeButton mode="manual" current={motionMode} label="手动拖拽" onClick={() => setMotionMode('manual')} />
        {isAutoF && (
          <span className="text-xs text-neutral-500 ml-2">
            F驱 = {F_DRIVE_DEFAULT} N，m = {MASS_DEFAULT} kg（隐藏常量）
          </span>
        )}
        {isManual && (
          <span className="text-xs text-neutral-500 ml-2">
            在导体棒上按下并左右拖动
          </span>
        )}
      </div>

      <div ref={containerRef} className="flex-1 min-h-0">
        <svg ref={svgRef} width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-b-lg">
          <defs>
            <marker id="arrow-cut-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
            </marker>
            <marker id="arrow-cut-f" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
            </marker>
            <marker id="arrow-cut-fd" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
            </marker>
            <marker id="arrow-cut-emf" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.electricCurrent} />
            </marker>
            <marker id="arrow-cut-flor" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.magneticField} />
            </marker>
            <marker id="arrow-cut-pipv" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.velocity} />
            </marker>
          </defs>

          <text x={cx} y={GRID_MARGIN} fontSize={FONT.title} fill={PHYSICS_COLORS.magneticField} textAnchor="middle" fontWeight="bold">
            B = {B.toFixed(1)} T（垂直纸面{fieldDirectionText} {fieldSymbol}）
          </text>

          {bSymbols}

          <line x1={railLeft} y1={railTop} x2={railRight} y2={railTop}
            stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.axis} />
          <line x1={railLeft} y1={railBottom} x2={railRight} y2={railBottom}
            stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.axis} />

          <rect x={railRight + 4} y={railTop - 4} width={12} height={railH + 8}
            fill="none" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.objectLine} rx={2} />
          <text x={railRight + 24} y={cy} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText} textAnchor="start">
            R = {R.toFixed(1)} Ω
          </text>

          {theta < 90 && (
            <g>
              <path d={`M ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 0 0 ${arcEndX} ${arcEndY}`}
                stroke={PHYSICS_COLORS.labelText} strokeWidth={CANVAS_STYLE.stroke.objectThin} fill="none" strokeDasharray="3,2" opacity={0.7} />
              <text x={labelArcX} y={labelArcY + 4} fontSize={FONT.axis}
                fill={PHYSICS_COLORS.labelText} fontWeight="bold" textAnchor="middle">θ</text>
            </g>
          )}

          <g transform={`rotate(${rodRotation} ${rodX} ${cy})`}>
            <rect
              x={rodX - rodW / 2}
              y={cy - rodH / 2}
              width={rodW}
              height={rodH}
              fill={isManual ? PHYSICS_COLORS.electricCurrent : PHYSICS_COLORS.electricCurrent}
              rx={2}
              opacity={isManual ? 0.95 : 0.9}
              style={{ cursor: isManual ? 'grab' : 'default', touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            <text x={rodX} y={cy + 4} fontSize={FONT.axis} fill="white" textAnchor="middle" fontWeight="bold"
              transform={`rotate(${-rodRotation} ${rodX} ${cy + 4})`}>
              ab
            </text>

            {Math.abs(EMF) > 0.001 && (
              <g>
                <line
                  x1={rodX + 15}
                  y1={emfArrowUp ? railBottom - 10 : railTop + 10}
                  x2={rodX + 15}
                  y2={emfArrowUp ? railTop + 10 : railBottom - 10}
                  stroke={PHYSICS_COLORS.electricCurrent}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  markerEnd="url(#arrow-cut-emf)"
                  opacity={0.7}
                />
                <text x={rodX + 28} y={cy} fontSize={FONT.axis}
                  fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold"
                  transform={`rotate(${-rodRotation} ${rodX + 28} ${cy})`}>
                  EMF
                </text>
              </g>
            )}
          </g>

          {isAutoF && (
            <g>
              <line
                x1={rodX - 25}
                y1={railTop - 60}
                x2={rodX - 25 + 50}
                y2={railTop - 60}
                stroke={PHYSICS_COLORS.forceNet}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                strokeDasharray="6,3"
                markerEnd="url(#arrow-cut-fd)"
                opacity={0.85}
              />
              <text x={rodX - 25 + 25} y={railTop - 66} fontSize={FONT.label}
                fill={PHYSICS_COLORS.forceNet} fontWeight="bold" textAnchor="middle">
                F驱 = {F_DRIVE_DEFAULT} N
              </text>
            </g>
          )}

          {showVArrow && (
            <g>
              <line
                x1={rodX}
                y1={railTop - 30}
                x2={rodX + rodDirection * 40}
                y2={railTop - 30}
                stroke={PHYSICS_COLORS.velocity}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                markerEnd="url(#arrow-cut-v)"
              />
              <text x={rodX + rodDirection * 20} y={railTop - 36} fontSize={FONT.label}
                fill={PHYSICS_COLORS.velocity} fontWeight="bold" textAnchor="middle">
                v = {effectiveV.toFixed(2)} m/s
              </text>
            </g>
          )}

          {showFAmpereArrow && (
            <g>
              <line
                x1={rodX}
                y1={railBottom + 30}
                x2={rodX - rodDirection * Math.min(60, fAmpereVis * 20)}
                y2={railBottom + 30}
                stroke={PHYSICS_COLORS.forceNet}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                markerEnd="url(#arrow-cut-f)"
              />
              <text x={rodX - rodDirection * 20} y={railBottom + 48} fontSize={FONT.label}
                fill={PHYSICS_COLORS.forceNet} fontWeight="bold" textAnchor="middle">
                F安 = {Math.abs(fAmpereVis).toFixed(3)} N
              </text>
            </g>
          )}

          <text x={railLeft} y={railBottom + 20} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText}>
            L = {L.toFixed(2)} m
          </text>

          <text x={rodX} y={railBottom + 36} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
            {isAutoF ? `x = ${forceMotionRef.current.x.toFixed(2)} m` : `x = ${((rodX - railLeft) / pxPerUnit).toFixed(2)} m`}
          </text>

          {isAutoF && (
            <g transform={`translate(${canvasSize.width - 200}, ${GRID_MARGIN + 10})`}>
              <rect x={-4} y={-14} width={196} height={62} fill="white" stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid} rx={4} opacity={0.9} />
              <text fontSize={FONT.label} fill={PHYSICS_COLORS.labelText} fontWeight="bold">受力分析（受力模式）</text>
              <text x={0} y={14} fontSize={FONT.axis} fill={PHYSICS_COLORS.forceNet}>
                F驱 = {F_DRIVE_DEFAULT.toFixed(2)} N
              </text>
              <text x={0} y={28} fontSize={FONT.axis} fill={PHYSICS_COLORS.forceNet}>
                F安 = {forceMotionRef.current.F_ampere.toFixed(3)} N
              </text>
              <text x={0} y={42} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText}>
                F合 = {forceMotionRef.current.F_net.toFixed(3)} N，a = {forceMotionRef.current.a.toFixed(2)} m/s²
              </text>
            </g>
          )}

          {(() => {
            const pipX = canvasSize.width - 184
            const pipY = isAutoF ? GRID_MARGIN + 90 : GRID_MARGIN + 8
            const pipW = 172
            const pipH = 120
            const rodCx = pipX + pipW / 2
            const rodCy = pipY + 70
            const rodHalfH = 38
            const electronXs = [rodCx - 4, rodCx + 4, rodCx - 4, rodCx + 4]
            const electronYs = [rodCy - 22, rodCy - 8, rodCy + 8, rodCy + 22]
            const fLorDir = effectiveV * (B_out === 0 ? 1 : -1)
            const showFLor = Math.abs(fLorDir) > 0.001
            return (
              <g>
                <rect x={pipX} y={pipY} width={pipW} height={pipH}
                  fill="white" stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid} rx={6} opacity={0.95} />
                <text x={pipX + 8} y={pipY + 14} fontSize={CANVAS_STYLE.font.subtickSize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
                  放大镜：自由电子
                </text>
                <text x={pipX + pipW - 6} y={pipY + 14} fontSize={CANVAS_STYLE.font.smallSize} fill={PHYSICS_COLORS.axis} textAnchor="end">
                  v = {effectiveV.toFixed(2)} m/s
                </text>
                <line
                  x1={rodCx} y1={pipY + 24}
                  x2={rodCx + Math.sign(effectiveV || 1) * 12} y2={pipY + 24}
                  stroke={PHYSICS_COLORS.velocity} strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  markerEnd="url(#arrow-cut-pipv)" opacity={0.8}
                />
                <text x={rodCx + Math.sign(effectiveV || 1) * 18} y={pipY + 28} fontSize={CANVAS_STYLE.font.smallSize}
                  fill={PHYSICS_COLORS.velocity} fontWeight="bold" textAnchor="middle">
                  v
                </text>
                <text x={rodCx - 18} y={pipY + 28} fontSize={CANVAS_STYLE.font.smallSize}
                  fill={PHYSICS_COLORS.magneticField} fontWeight="bold" textAnchor="middle">
                  {fieldSymbol}
                </text>
                <rect x={rodCx - 6} y={rodCy - rodHalfH} width={12} height={rodHalfH * 2}
                  fill={PHYSICS_COLORS.electricCurrent} opacity={0.85} rx={1} />
                {electronXs.map((ex, idx) => (
                  <g key={`pip-e-${idx}`}>
                    <circle cx={ex} cy={electronYs[idx]} r={3.2}
                      fill={PHYSICS_COLORS.negativeCharge} stroke="white" strokeWidth={0.5} />
                    <text x={ex + 5} y={electronYs[idx] + 3} fontSize={font(8)}
                      fill={PHYSICS_COLORS.negativeCharge} fontWeight="bold">e⁻</text>
                    {showFLor && (
                      <line
                        x1={ex} y1={electronYs[idx]}
                        x2={ex} y2={electronYs[idx] + fLorDir * 12}
                        stroke={PHYSICS_COLORS.magneticField} strokeWidth={1.2}
                        markerEnd={fLorDir > 0 ? 'url(#arrow-cut-flor)' : 'url(#arrow-cut-flor)'}
                        opacity={0.85}
                      />
                    )}
                  </g>
                ))}
                <text x={pipX + 8} y={pipY + pipH - 6} fontSize={font(9.5)} fill={PHYSICS_COLORS.axis}>
                  F洛 = qv×B（q = −e）
                </text>
              </g>
            )
          })()}

          {(() => {
            const handX = 12
            const handY = 50
            const handW = 168
            const handH = 188
            
            // 自动联动逻辑：匀速运动/手动用右手定则(发电机)，受力分析用左手定则(电动机)
            let rule: 'right' | 'left' = motionMode === 'auto-F' ? 'left' : 'right'
            if (handRule === 1) rule = 'left'
            else if (handRule === 0) rule = 'right'
            
            const fist = handRule === 2
            return (
              <g>
                <rect
                  x={handX}
                  y={handY}
                  width={handW}
                  height={handH}
                  rx={8}
                  fill="white"
                  stroke={PHYSICS_COLORS.grid}
                  strokeWidth={CANVAS_STYLE.stroke.grid}
                  opacity={0.95}
                />
                <text
                  x={handX + handW / 2}
                  y={handY + 14}
                  fontSize={CANVAS_STYLE.font.subtickSize}
                  fontWeight="bold"
                  fill={PHYSICS_COLORS.labelText}
                  textAnchor="middle"
                >
                  {fist ? '握拳定则' : rule === 'right' ? '右手定则（拇·v 食·B 中·I）' : '左手定则（拇·F 食·B 中·I）'}
                </text>
                <CuttingEMFHandRule
                  svgRef={svgRef}
                  vDir={effectiveV > 0 ? 1 : effectiveV < 0 ? -1 : 0}
                  B_out={(B_out === 1 ? 1 : 0) as 0 | 1}
                  isBack={B_out === 1}
                  rule={rule}
                  fist={fist}
                  cx={handX + handW / 2}
                  cy={handY + 95}
                  scale={canvasSize.width / 900}
                />
                <text
                  x={handX + handW / 2}
                  y={handY + handH - 8}
                  fontSize={font(9.5)}
                  fill={PHYSICS_COLORS.axis}
                  textAnchor="middle"
                >
                  v×B = I（右手）/ F = BIL（左手）
                </text>
              </g>
            )
          })()}

          {useAnimationStore.getState().showFormulas && (
            <g transform={`translate(20, ${canvasSize.height - 180})`}>
              <text fontSize={FONT.title} fill={PHYSICS_COLORS.labelText} fontWeight="bold">导体切割磁感线</text>
              <text x={0} y={24} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>EMF = BLv·sinθ</text>
              <text x={0} y={42} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>I = EMF/(R+r) = BLv·sinθ/(R+r)</text>
              <text x={0} y={60} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>F安 = BIL = B²L²v·sinθ/(R+r)</text>
              <text x={0} y={84} fontSize={FONT.label} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold">
                EMF = {Math.abs(EMF).toFixed(3)} V
              </text>
              <text x={0} y={102} fontSize={FONT.label} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold">
                I = {Math.abs(I).toFixed(3)} A
              </text>
              <text x={0} y={120} fontSize={FONT.label} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
                F安 = {Math.abs(fAmpereVis).toFixed(3)} N
              </text>
              <text x={0} y={138} fontSize={FONT.label} fill={PHYSICS_COLORS.labelText}>
                θ = {theta.toFixed(0)}°，r = {r.toFixed(2)} Ω
                {isAutoF && `，v_terminal = ${forceMotionRef.current.v_terminal.toFixed(2)} m/s`}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}
