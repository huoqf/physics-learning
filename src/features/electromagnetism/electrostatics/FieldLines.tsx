import { VectorArrow, EnergyBars } from '@/components/Physics'
import React, { useRef } from 'react'
import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useSceneScale } from '@/hooks'

import { useFieldLinesPhysics, CHARGE_RADIUS } from './hooks/useFieldLinesPhysics'

export default function FieldLines() {
  const params = useAnimationStore((s) => s.params)
  const updateParam = useAnimationStore((s) => s.updateParam)
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
  const { font } = canvasSize
  const svgRef = useRef<SVGSVGElement>(null)

  const w = preset.width
  const h = preset.height

  // 从 params 获取控制参数
  const topology = params.topology ?? 2 // 0=单正, 1=单负, 2=等量异种, 3=等量同种
  const qSource = params.qSource ?? 5   // μC
  const showFieldLines = (params.showFieldLines ?? 1) === 1
  const showEquipotentials = (params.showEquipotentials ?? 1) === 1

  const probeX = params.probeX ?? w / 2
  const probeY = params.probeY ?? 150
  const isDragging = params.isDragging === 1

  // 物理计算 hook
  const { charges, fieldLinesPaths, equipotentialPaths, probePhysics } = useFieldLinesPhysics({
    topology,
    qSource,
    showFieldLines,
    showEquipotentials,
    probeX,
    probeY,
    w,
    h,
  })

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

  // 交互逻辑：将屏幕坐标映射到设计坐标
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
