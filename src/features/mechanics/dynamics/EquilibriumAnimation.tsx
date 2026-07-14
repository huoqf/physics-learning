import { VectorArrow, VectorDefs, DragHandle } from '@/components/Physics'
import { useEffect, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_STYLE, SCENE_COLORS } from '@/theme/physics'
import { useEquilibriumPhysics } from './useEquilibriumPhysics'
import { useEquilibriumLayout } from './hooks/useEquilibriumLayout'

import { Button } from '@/components/UI'
import { useTimedPulse } from '@/hooks/useTimedPulse'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'

export default function EquilibriumAnimation() {
  const { params, showVectors, showFormulas, showGrid, isPlaying, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      showVectors: s.showVectors,
      showFormulas: s.showFormulas,
      showGrid: s.showGrid,
      isPlaying: s.isPlaying,
      time: s.time,
    }))
  )

  const m = params.m ?? 2.0
  const theta1 = params.theta1 ?? 45
  const theta2 = params.theta2 ?? 45
  const mode = params.mode ?? 0

  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.full, presetCompensation: 1.2 })
  const svgRef = useRef<SVGSVGElement>(null)

  const physicsData = useEquilibriumPhysics({
    m, theta1, theta2, mode,
    canvasWidth: vp.visibleW,
    canvasHeight: vp.visibleH,
    isPlaying, time,
  })

  const {
    leftAnchor, rightAnchor, ballCenter, t1, t2, gravity,
    isOverloaded, brokenLine,
    gStart, gEnd, t1Start, t1End, t2Start, t2End, fNetEnd,
    triOrigin, triGEnd, triT1End, triT2End,
    leftArcPath, rightArcPath, leftTextPos, rightTextPos,
    startDrag, updateDragMouse, endDrag, resetPhysics,
  } = physicsData

  const layout = useEquilibriumLayout(
    { m, brokenLine, ballCenter, triOrigin, gEnd, t1End, t2End, fNetEnd, triGEnd, triT1End, triT2End },
    leftAnchor, rightAnchor, vp, canvasSize,
  )

  const {
    font, eqSceneScale,
    centerX, centerY,
    gDisplayEnd, t1DisplayEnd, t2DisplayEnd, fNetDisplayEnd,
    t1xDisplayEnd, t1yDisplayEnd, t2xDisplayEnd, t2yDisplayEnd,
    triGDisplayEnd, triT1DisplayEnd, triT2DisplayEnd,
    t1Mid, t2Mid,
    hasRope, chartW, chartH, chartX0, chartY0, thetaToX, tToY, secantPathD,
  } = layout

  const showOverloadPulse = useTimedPulse(isOverloaded && brokenLine === 'none', 3000)
  const showBreak1Pulse = useTimedPulse(brokenLine !== 'none' && brokenLine !== 'right', 3000)
  const showBreak2Pulse = useTimedPulse(brokenLine !== 'none' && brokenLine !== 'left', 3000)

  useEffect(() => {
    const handleGlobalPointerUp = () => endDrag()
    window.addEventListener('pointerup', handleGlobalPointerUp)
    window.addEventListener('pointercancel', handleGlobalPointerUp)
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp)
      window.removeEventListener('pointercancel', handleGlobalPointerUp)
    }
  }, [endDrag])

  const gridLines = []
  if (showGrid && vp.visibleW > 0) {
    for (let i = -6; i <= 6; i++) {
      const xPos = centerX + i * 50
      gridLines.push(
        <line key={`grid-x-${i}`} x1={xPos} y1={10} x2={xPos} y2={vp.visibleH - 10}
          stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid}
          opacity={CANVAS_STYLE.opacity.grid} strokeDasharray="4,4" />
      )
    }
    for (let i = -4; i <= 4; i++) {
      const yPos = centerY + i * 50
      gridLines.push(
        <line key={`grid-y-${i}`} x1={10} y1={yPos} x2={vp.visibleW - 10} y2={yPos}
          stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid}
          opacity={CANVAS_STYLE.opacity.grid} strokeDasharray="4,4" />
      )
    }
  }

  const protractorTicks = []
  if (brokenLine === 'none' && vp.visibleW > 0) {
    for (let deg = 15; deg < 90; deg += 15) {
      const rad = (deg * Math.PI) / 180
      protractorTicks.push(
        <line key={`tick-l-${deg}`}
          x1={ballCenter.cx - 30 * Math.cos(rad)} y1={ballCenter.cy - 30 * Math.sin(rad)}
          x2={ballCenter.cx - 36 * Math.cos(rad)} y2={ballCenter.cy - 36 * Math.sin(rad)}
          stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={0.75} opacity={0.25} />,
        <line key={`tick-r-${deg}`}
          x1={ballCenter.cx + 30 * Math.cos(rad)} y1={ballCenter.cy - 30 * Math.sin(rad)}
          x2={ballCenter.cx + 36 * Math.cos(rad)} y2={ballCenter.cy - 36 * Math.sin(rad)}
          stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={0.75} opacity={0.25} />
      )
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full relative select-none">
      {brokenLine !== 'none' && (
        <Button onClick={resetPhysics} variant="danger" className="absolute top-4 right-4">
          <span>⚠ 绳子断裂！重置细绳</span>
        </Button>
      )}

      <svg ref={svgRef} width={vp.visibleW} height={vp.visibleH}
        className="bg-neutral-50 rounded-xl shadow-inner border border-neutral-200"
        onPointerMove={(e) => updateDragMouse(e.clientX, e.clientY, svgRef.current)}
      >
        {gridLines}

        {/* 天花板固定梁 */}
        <rect x={centerX - 220} y={leftAnchor.cy - 12} width={440} height={12}
          fill="url(#ceilingMetalGradient)" stroke={PHYSICS_COLORS.axis} strokeWidth={1.5} />
        <circle cx={leftAnchor.cx} cy={leftAnchor.cy} r={4.5} fill={PHYSICS_COLORS.labelText} />
        <circle cx={rightAnchor.cx} cy={rightAnchor.cy} r={4.5} fill={PHYSICS_COLORS.labelText} />

        {/* 量角器底纹 */}
        {brokenLine === 'none' && (
          <g>
            <circle cx={ballCenter.cx} cy={ballCenter.cy} r={35} fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth={1} opacity={0.35} />
            <path d={`M ${ballCenter.cx - 35} ${ballCenter.cy} A 35 35 0 0 1 ${ballCenter.cx + 35} ${ballCenter.cy}`}
              fill="none" stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={0.75} strokeDasharray="2,2" opacity={0.35} />
            {protractorTicks}
          </g>
        )}

        {/* 挂绳 */}
        {(brokenLine === 'none' || brokenLine === 'right') && (
          <line x1={leftAnchor.cx} y1={leftAnchor.cy} x2={ballCenter.cx} y2={ballCenter.cy}
            stroke={isOverloaded && t1 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.axis}
            strokeWidth={CANVAS_STYLE.stroke.objectThin}
            className={isOverloaded && t1 > 35 ? "animate-pulse" : ""} />
        )}
        {(brokenLine === 'none' || brokenLine === 'left') && (
          <line x1={rightAnchor.cx} y1={rightAnchor.cy} x2={ballCenter.cx} y2={ballCenter.cy}
            stroke={isOverloaded && t2 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.axis}
            strokeWidth={CANVAS_STYLE.stroke.objectThin}
            className={isOverloaded && t2 > 35 ? "animate-pulse" : ""} />
        )}

        {/* 受力矢量 */}
        {showVectors && (
          <g>
            <VectorArrow originDesign={{ x: gStart.cx, y: gStart.cy }}
              vector={{ x: gDisplayEnd.cx - gStart.cx, y: -(gDisplayEnd.cy - gStart.cy) }}
              type="gravity" arrowType="physical-schematic" sceneScale={eqSceneScale} strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              pixelLength={Math.hypot(gDisplayEnd.cx - gStart.cx, gDisplayEnd.cy - gStart.cy)} />
            <text x={gDisplayEnd.cx - 14} y={gDisplayEnd.cy + 4} fontSize={CANVAS_STYLE.font.label}
              fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.gravity} fontWeight="bold">G</text>

            {(brokenLine === 'none' || brokenLine === 'right') && (
              <g>
                <VectorArrow originDesign={{ x: t1Start.cx, y: t1Start.cy }}
                  vector={{ x: t1DisplayEnd.cx - t1Start.cx, y: -(t1DisplayEnd.cy - t1Start.cy) }}
                  type="tension" arrowType="physical-schematic" sceneScale={eqSceneScale}
                  color={isOverloaded && t1 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  pixelLength={Math.hypot(t1DisplayEnd.cx - t1Start.cx, t1DisplayEnd.cy - t1Start.cy)} />
                <text x={t1DisplayEnd.cx - 16} y={t1DisplayEnd.cy - 6} fontSize={CANVAS_STYLE.font.label}
                  fontFamily={CANVAS_STYLE.font.family}
                  fill={isOverloaded && t1 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension}
                  fontWeight="bold">T₁</text>
              </g>
            )}

            {(brokenLine === 'none' || brokenLine === 'left') && (
              <g>
                <VectorArrow originDesign={{ x: t2Start.cx, y: t2Start.cy }}
                  vector={{ x: t2DisplayEnd.cx - t2Start.cx, y: -(t2DisplayEnd.cy - t2Start.cy) }}
                  type="tension" arrowType="physical-schematic" sceneScale={eqSceneScale}
                  color={isOverloaded && t2 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  pixelLength={Math.hypot(t2DisplayEnd.cx - t2Start.cx, t2DisplayEnd.cy - t2Start.cy)} />
                <text x={t2DisplayEnd.cx + 8} y={t2DisplayEnd.cy - 6} fontSize={CANVAS_STYLE.font.label}
                  fontFamily={CANVAS_STYLE.font.family}
                  fill={isOverloaded && t2 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension}
                  fontWeight="bold">T₂</text>
              </g>
            )}

            {/* 模式 1：平行四边形 */}
            {mode === 1 && brokenLine === 'none' && (
              <g>
                <line x1={t1DisplayEnd.cx} y1={t1DisplayEnd.cy} x2={fNetDisplayEnd.cx} y2={fNetDisplayEnd.cy}
                  stroke={PHYSICS_COLORS.forceComponent} strokeWidth={1} strokeDasharray="3,3" />
                <line x1={t2DisplayEnd.cx} y1={t2DisplayEnd.cy} x2={fNetDisplayEnd.cx} y2={fNetDisplayEnd.cy}
                  stroke={PHYSICS_COLORS.forceComponent} strokeWidth={1} strokeDasharray="3,3" />
                <VectorArrow originDesign={{ x: ballCenter.cx, y: ballCenter.cy }}
                  vector={{ x: fNetDisplayEnd.cx - ballCenter.cx, y: -(fNetDisplayEnd.cy - ballCenter.cy) }}
                  type="force" arrowType="physical-schematic" sceneScale={eqSceneScale} strokeWidth={CANVAS_STYLE.stroke.vectorMain + 0.5}
                  pixelLength={Math.hypot(fNetDisplayEnd.cx - ballCenter.cx, fNetDisplayEnd.cy - ballCenter.cy)} />
                <text x={fNetDisplayEnd.cx + 8} y={fNetDisplayEnd.cy + 12} fontSize={CANVAS_STYLE.font.annotation}
                  fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">F合</text>
              </g>
            )}

            {/* 模式 2：正交分解 */}
            {mode === 2 && brokenLine === 'none' && (
              <g>
                <line x1={ballCenter.cx - 100} y1={ballCenter.cy} x2={ballCenter.cx + 100} y2={ballCenter.cy}
                  stroke={PHYSICS_COLORS.axis} strokeWidth={1} strokeDasharray="4,4" />
                <line x1={ballCenter.cx} y1={ballCenter.cy - 100} x2={ballCenter.cx} y2={ballCenter.cy + 100}
                  stroke={PHYSICS_COLORS.axis} strokeWidth={1} strokeDasharray="4,4" />
                <text x={ballCenter.cx + 104} y={ballCenter.cy + 4} fontSize={font(10)} fill={PHYSICS_COLORS.labelTextLight}>+x</text>
                <text x={ballCenter.cx - 4} y={ballCenter.cy - 104} fontSize={font(10)} fill={PHYSICS_COLORS.labelTextLight}>+y</text>

                <line x1={t1DisplayEnd.cx} y1={t1DisplayEnd.cy} x2={t1xDisplayEnd.cx} y2={t1xDisplayEnd.cy}
                  stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={0.75} strokeDasharray="2,2" opacity={0.5} />
                <line x1={t1DisplayEnd.cx} y1={t1DisplayEnd.cy} x2={t1yDisplayEnd.cx} y2={t1yDisplayEnd.cy}
                  stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={0.75} strokeDasharray="2,2" opacity={0.5} />
                <VectorArrow originDesign={{ x: ballCenter.cx, y: ballCenter.cy }}
                  vector={{ x: t1xDisplayEnd.cx - ballCenter.cx, y: -(t1xDisplayEnd.cy - ballCenter.cy) }}
                  type="forceComponent" arrowType="physical-schematic" sceneScale={eqSceneScale} strokeWidth={1.5}
                  pixelLength={Math.hypot(t1xDisplayEnd.cx - ballCenter.cx, t1xDisplayEnd.cy - ballCenter.cy)} />
                <VectorArrow originDesign={{ x: ballCenter.cx, y: ballCenter.cy }}
                  vector={{ x: t1yDisplayEnd.cx - ballCenter.cx, y: -(t1yDisplayEnd.cy - ballCenter.cy) }}
                  type="forceComponent" arrowType="physical-schematic" sceneScale={eqSceneScale} strokeWidth={1.5}
                  pixelLength={Math.hypot(t1yDisplayEnd.cx - ballCenter.cx, t1yDisplayEnd.cy - ballCenter.cy)} />
                <text x={t1xDisplayEnd.cx - 18} y={t1xDisplayEnd.cy + 12} fontSize={font(10)} fill={PHYSICS_COLORS.forceComponent} fontWeight="bold">T1x</text>
                <text x={t1yDisplayEnd.cx - 20} y={t1yDisplayEnd.cy - 6} fontSize={font(10)} fill={PHYSICS_COLORS.forceComponent} fontWeight="bold">T1y</text>

                <line x1={t2DisplayEnd.cx} y1={t2DisplayEnd.cy} x2={t2xDisplayEnd.cx} y2={t2xDisplayEnd.cy}
                  stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={0.75} strokeDasharray="2,2" opacity={0.5} />
                <line x1={t2DisplayEnd.cx} y1={t2DisplayEnd.cy} x2={t2yDisplayEnd.cx} y2={t2yDisplayEnd.cy}
                  stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={0.75} strokeDasharray="2,2" opacity={0.5} />
                <VectorArrow originDesign={{ x: ballCenter.cx, y: ballCenter.cy }}
                  vector={{ x: t2xDisplayEnd.cx - ballCenter.cx, y: -(t2xDisplayEnd.cy - ballCenter.cy) }}
                  type="forceComponent" arrowType="physical-schematic" sceneScale={eqSceneScale} strokeWidth={1.5}
                  pixelLength={Math.hypot(t2xDisplayEnd.cx - ballCenter.cx, t2xDisplayEnd.cy - ballCenter.cy)} />
                <VectorArrow originDesign={{ x: ballCenter.cx, y: ballCenter.cy }}
                  vector={{ x: t2yDisplayEnd.cx - ballCenter.cx, y: -(t2yDisplayEnd.cy - ballCenter.cy) }}
                  type="forceComponent" arrowType="physical-schematic" sceneScale={eqSceneScale} strokeWidth={1.5}
                  pixelLength={Math.hypot(t2yDisplayEnd.cx - ballCenter.cx, t2yDisplayEnd.cy - ballCenter.cy)} />
                <text x={t2xDisplayEnd.cx + 2} y={t2xDisplayEnd.cy + 12} fontSize={font(10)} fill={PHYSICS_COLORS.forceComponent} fontWeight="bold">T2x</text>
                <text x={t2yDisplayEnd.cx + 6} y={t2yDisplayEnd.cy - 6} fontSize={font(10)} fill={PHYSICS_COLORS.forceComponent} fontWeight="bold">T2y</text>
              </g>
            )}
          </g>
        )}

        {/* 拉力气泡 */}
        {(brokenLine === 'none' || brokenLine === 'right') && (
          <g>
            <rect x={t1Mid.cx - 28} y={t1Mid.cy - 22} width={56} height={18} fill="white" fillOpacity={0.88}
              stroke={PHYSICS_COLORS.grid} strokeWidth={1} rx={4} />
            <text x={t1Mid.cx} y={t1Mid.cy - 9} fontSize={font(10)} fontFamily={CANVAS_STYLE.font.family}
              fill={PHYSICS_COLORS.tension} fontWeight="bold" textAnchor="middle">{t1.toFixed(1)} N</text>
          </g>
        )}
        {(brokenLine === 'none' || brokenLine === 'left') && (
          <g>
            <rect x={t2Mid.cx - 28} y={t2Mid.cy - 22} width={56} height={18} fill="white" fillOpacity={0.88}
              stroke={PHYSICS_COLORS.grid} strokeWidth={1} rx={4} />
            <text x={t2Mid.cx} y={t2Mid.cy - 9} fontSize={font(10)} fontFamily={CANVAS_STYLE.font.family}
              fill={PHYSICS_COLORS.tension} fontWeight="bold" textAnchor="middle">{t2.toFixed(1)} N</text>
          </g>
        )}

        {/* 重物 */}
        <line x1={ballCenter.cx - 60} y1={ballCenter.cy} x2={ballCenter.cx + 60} y2={ballCenter.cy}
          stroke={PHYSICS_COLORS.axis} strokeWidth={1} strokeDasharray="3,3" />
        <line x1={ballCenter.cx} y1={ballCenter.cy - 20} x2={ballCenter.cx} y2={ballCenter.cy + 50}
          stroke={PHYSICS_COLORS.axis} strokeWidth={1} strokeDasharray="3,3" />
        <circle cx={ballCenter.cx} cy={ballCenter.cy} r={CANVAS_STYLE.object.ball}
          fill="url(#steelSphereGradient)" stroke={SCENE_COLORS.sphere.brassWeight.stroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        <circle cx={ballCenter.cx} cy={ballCenter.cy} r={6} fill="none" stroke={PHYSICS_COLORS.labelText} strokeWidth={1} />
        <line x1={ballCenter.cx - 10} y1={ballCenter.cy} x2={ballCenter.cx + 10} y2={ballCenter.cy}
          stroke={PHYSICS_COLORS.labelText} strokeWidth={0.75} opacity={0.6} />
        <line x1={ballCenter.cx} y1={ballCenter.cy - 10} x2={ballCenter.cx} y2={ballCenter.cy + 10}
          stroke={PHYSICS_COLORS.labelText} strokeWidth={0.75} opacity={0.6} />
        <DragHandle cx={ballCenter.cx} cy={ballCenter.cy} color="transparent"
          cursor="grab" onPointerDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY, svgRef.current) }} />

        {/* 模式 3：三力封闭三角形 */}
        {mode === 3 && vp.visibleW > 0 && (
          <g>
            <rect x={centerX + 65} y={centerY + 30} width={185} height={140} fill="white" fillOpacity={0.85}
              stroke={PHYSICS_COLORS.grid} strokeWidth={1} rx={6} />
            <text x={centerX + 157} y={centerY + 48} fontSize={CANVAS_STYLE.font.annotation}
              fill={PHYSICS_COLORS.labelTextLight} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family} textAnchor="middle">
              三力封闭三角形
            </text>
            <VectorArrow originDesign={{ x: triOrigin.cx, y: triOrigin.cy }}
              vector={{ x: triGDisplayEnd.cx - triOrigin.cx, y: -(triGDisplayEnd.cy - triOrigin.cy) }}
              type="gravity" arrowType="physical-schematic" sceneScale={eqSceneScale} strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              pixelLength={Math.hypot(triGDisplayEnd.cx - triOrigin.cx, triGDisplayEnd.cy - triOrigin.cy)} />
            <text x={triOrigin.cx - 14} y={(triOrigin.cy + triGDisplayEnd.cy) / 2 + 4}
              fontSize={CANVAS_STYLE.font.annotation} fontFamily={CANVAS_STYLE.font.family}
              fill={PHYSICS_COLORS.gravity} fontWeight="bold">G</text>
            {(brokenLine === 'none' || brokenLine === 'right') && (
              <g>
                <VectorArrow originDesign={{ x: triGDisplayEnd.cx, y: triGDisplayEnd.cy }}
                  vector={{ x: triT1DisplayEnd.cx - triGDisplayEnd.cx, y: -(triT1DisplayEnd.cy - triGDisplayEnd.cy) }}
                  type="tension" arrowType="physical-schematic" sceneScale={eqSceneScale}
                  color={isOverloaded && t1 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  pixelLength={Math.hypot(triT1DisplayEnd.cx - triGDisplayEnd.cx, triT1DisplayEnd.cy - triGDisplayEnd.cy)} />
                <text x={(triGDisplayEnd.cx + triT1DisplayEnd.cx) / 2 - 16}
                  y={(triGDisplayEnd.cy + triT1DisplayEnd.cy) / 2 - 6}
                  fontSize={CANVAS_STYLE.font.annotation} fontFamily={CANVAS_STYLE.font.family}
                  fill={isOverloaded && t1 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension}
                  fontWeight="bold">T₁</text>
              </g>
            )}
            {(brokenLine === 'none' || brokenLine === 'left') && (
              <g>
                <VectorArrow originDesign={{ x: triT1DisplayEnd.cx, y: triT1DisplayEnd.cy }}
                  vector={{ x: triT2DisplayEnd.cx - triT1DisplayEnd.cx, y: -(triT2DisplayEnd.cy - triT1DisplayEnd.cy) }}
                  type="tension" arrowType="physical-schematic" sceneScale={eqSceneScale}
                  color={isOverloaded && t2 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  pixelLength={Math.hypot(triT2DisplayEnd.cx - triT1DisplayEnd.cx, triT2DisplayEnd.cy - triT1DisplayEnd.cy)} />
                <text x={(triT1DisplayEnd.cx + triT2DisplayEnd.cx) / 2 + 10}
                  y={(triT1DisplayEnd.cy + triT2DisplayEnd.cy) / 2 + 10}
                  fontSize={CANVAS_STYLE.font.annotation} fontFamily={CANVAS_STYLE.font.family}
                  fill={isOverloaded && t2 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension}
                  fontWeight="bold">T₂</text>
              </g>
            )}
            {brokenLine === 'none' && <circle cx={triOrigin.cx} cy={triOrigin.cy} r={3} fill={PHYSICS_COLORS.forceNet} />}
          </g>
        )}

        {/* 弧线与度数 */}
        {brokenLine === 'none' && leftArcPath && (
          <g>
            <path d={leftArcPath} fill="none" stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} strokeDasharray="1,1" />
            <rect x={leftTextPos.cx - 15} y={leftTextPos.cy - 8} width={30} height={14} fill="white" fillOpacity={0.8} rx={2} />
            <text x={leftTextPos.cx} y={leftTextPos.cy + 3} fontSize={font(11)} fontFamily={CANVAS_STYLE.font.family}
              fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">{theta1.toFixed(0)}°</text>
          </g>
        )}
        {brokenLine === 'none' && rightArcPath && (
          <g>
            <path d={rightArcPath} fill="none" stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} strokeDasharray="1,1" />
            <rect x={rightTextPos.cx - 15} y={rightTextPos.cy - 8} width={30} height={14} fill="white" fillOpacity={0.8} rx={2} />
            <text x={rightTextPos.cx} y={rightTextPos.cy + 3} fontSize={font(11)} fontFamily={CANVAS_STYLE.font.family}
              fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">{theta2.toFixed(0)}°</text>
          </g>
        )}

        {/* 公式面板 */}
        {showFormulas && (
          <g transform="translate(20, 30)">
            <text fontSize={CANVAS_STYLE.font.title} fill={PHYSICS_COLORS.labelText} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
              共点力平衡实验
            </text>
            <g transform="translate(0, 15)">
              <text x={0} y={15} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.labelTextLight} fontFamily={CANVAS_STYLE.font.family}>
                砝码质量 m = {m.toFixed(1)} kg
              </text>
              <text x={0} y={35} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.labelTextLight} fontFamily={CANVAS_STYLE.font.family}>
                重力大小 G = {gravity.toFixed(1)} N
              </text>
              {brokenLine === 'none' || brokenLine === 'right' ? (
                <text x={0} y={60} fontSize={CANVAS_STYLE.font.bodySize} fill={t1 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
                  绳 1 张力 T₁ = {t1.toFixed(1)} N
                </text>
              ) : (
                <text x={0} y={60} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.forceArrowRed} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family} className={showBreak1Pulse ? 'animate-pulse' : ''}>
                  绳 1 已断裂！
                </text>
              )}
              {brokenLine === 'none' || brokenLine === 'left' ? (
                <text x={0} y={80} fontSize={CANVAS_STYLE.font.bodySize} fill={t2 > 35 ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.tension} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
                  绳 2 张力 T₂ = {t2.toFixed(1)} N
                </text>
              ) : (
                <text x={0} y={80} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.forceArrowRed} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family} className={showBreak2Pulse ? 'animate-pulse' : ''}>
                  绳 2 已断裂！
                </text>
              )}
              {isOverloaded && brokenLine === 'none' && (
                <text x={0} y={105} fontSize={font(12)} fill={PHYSICS_COLORS.forceArrowRed} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family} className={showOverloadPulse ? 'animate-pulse' : ''}>
                  ⚠ 过载警示：拉力超过安全阈值！
                </text>
              )}
            </g>
          </g>
        )}

        {/* T-θ 图表 */}
        {hasRope && vp.visibleW > 0 && (
          <g>
            <rect x={chartX0 - 10} y={chartY0 - chartH - 10} width={chartW + 20} height={chartH + 20}
              fill="white" fillOpacity={0.9} stroke={PHYSICS_COLORS.grid} strokeWidth={1} rx={4} />
            <text x={chartX0 + chartW / 2} y={chartY0 - chartH - 2} fontSize={font(9)}
              fill={PHYSICS_COLORS.labelTextLight} fontWeight="bold" textAnchor="middle">
              T - θ 关系图像 (G={gravity.toFixed(1)}N)
            </text>
            <line x1={chartX0} y1={tToY(50)} x2={chartX0 + chartW} y2={tToY(50)}
              stroke={PHYSICS_COLORS.forceArrowRed} strokeWidth={1} strokeDasharray="2,2" />
            <text x={chartX0 + chartW - 2} y={tToY(50) - 3} fontSize={font(8)}
              fill={PHYSICS_COLORS.forceArrowRed} fontWeight="bold" textAnchor="end">极限 50N</text>
            <line x1={chartX0} y1={chartY0} x2={chartX0 + chartW + 5} y2={chartY0}
              stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} />
            <line x1={chartX0} y1={chartY0} x2={chartX0} y2={chartY0 - chartH - 5}
              stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={1} />
            <text x={chartX0 + chartW + 2} y={chartY0 + 9} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">θ(°)</text>
            <text x={chartX0 - 4} y={chartY0 - chartH} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight}>T(N)</text>
            <text x={thetaToX(10)} y={chartY0 + 9} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">10°</text>
            <text x={thetaToX(90)} y={chartY0 + 9} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">90°</text>
            <text x={chartX0 - 4} y={tToY(60) + 3} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">60</text>
            <text x={chartX0 - 4} y={tToY(30) + 3} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">30</text>
            {secantPathD && (
              <path d={secantPathD} fill="none" stroke={PHYSICS_COLORS.tension} strokeWidth={1.5} opacity={0.65} />
            )}
            {(brokenLine === 'none' || brokenLine === 'right') && (
              <g>
                <circle cx={thetaToX(theta1)} cy={tToY(t1)} r={3.5} fill={PHYSICS_COLORS.tension} />
                <circle cx={thetaToX(theta1)} cy={tToY(t1)} r={7} fill="none" stroke={PHYSICS_COLORS.tension}
                  strokeWidth={0.5} opacity={0.5} className="animate-ping" />
                <text x={thetaToX(theta1) + 5} y={tToY(t1) - 2} fontSize={font(7)}
                  fill={PHYSICS_COLORS.tension} fontWeight="bold">T₁</text>
              </g>
            )}
            {(brokenLine === 'none' || brokenLine === 'left') && (
              <g>
                <circle cx={thetaToX(theta2)} cy={tToY(t2)} r={3.5} fill={PHYSICS_COLORS.tension} />
                <circle cx={thetaToX(theta2)} cy={tToY(t2)} r={7} fill="none" stroke={PHYSICS_COLORS.tension}
                  strokeWidth={0.5} opacity={0.5} className="animate-ping" />
                <text x={thetaToX(theta2) - 5} y={tToY(t2) - 2} fontSize={font(7)}
                  fill={PHYSICS_COLORS.tension} fontWeight="bold" textAnchor="end">T₂</text>
              </g>
            )}
          </g>
        )}

        <defs>
          <linearGradient id="ceilingMetalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[0]} />
            <stop offset="30%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[1]} />
            <stop offset="70%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[3]} />
          </linearGradient>
          <radialGradient id="steelSphereGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.brassWeight.gradient[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.sphere.brassWeight.gradient[1]} />
            <stop offset="85%" stopColor={SCENE_COLORS.sphere.brassWeight.gradient[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.brassWeight.gradient[3]} />
          </radialGradient>
          <VectorDefs colors={[PHYSICS_COLORS.gravity, PHYSICS_COLORS.tension, PHYSICS_COLORS.forceArrowRed, PHYSICS_COLORS.forceNet, PHYSICS_COLORS.forceComponent]} />
        </defs>
      </svg>
    </div>
  )
}
