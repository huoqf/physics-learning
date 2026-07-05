import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useCanvasSize, useViewport, clientToContainerPoint } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateOrbitalSpeed } from '@/physics'
import { GRAVITATIONAL_CONSTANT, EARTH_MASS, EARTH_RADIUS } from '@/physics/constants'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { RelationChart, VelocityTimeChart } from '@/components/Chart'
import type { RelationDataSeries, VTStage } from '@/components/Chart'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'
import { PHYSICS_COLORS, SCENE_COLORS, CHART_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { LAYOUT, VTCARD } from './satelliteLayout'
import { SatelliteSvg, RocketSvg, EarthSvg } from './SatelliteShapes'
import { useLaunchPhysics, useVtSampling } from './useSatellitePhysics'
import { useOrbitCurves } from './useOrbitCurves'

export default function SatelliteAnimation() {
  const { params, updateParam, showVectors, time, isPlaying, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params, updateParam: s.updateParam, showVectors: s.showVectors,
      time: s.time, isPlaying: s.isPlaying, setIsPlaying: s.setIsPlaying,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.tall)
  const { font } = canvasSize
  const vp = useViewport(canvasSize, { designWidth: LAYOUT.designWidth, designHeight: LAYOUT.designHeight })

  const { r = 7.0, mode = 0, v0 = 7.7, isLaunched = 0, showChart = 1, showCompare = 1 } = params

  useEffect(() => {
    if (mode === 1 && isPlaying && isLaunched === 0) updateParam('isLaunched', 1)
  }, [mode, isPlaying, isLaunched, updateParam])

  const centerX = vp.centerX
  const centerY = vp.centerY

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: centerX, originY: centerY,
    worldWidth: canvasSize.width, worldHeight: canvasSize.height,
  }), [canvasSize.width, canvasSize.height, centerX, centerY])
  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig])

  const launchData = useLaunchPhysics({ mode, v0, isLaunched, time })
  const vtSamplePoints = useVtSampling({ mode, v0 })

  if (launchData?.crashed && isLaunched === 1) setIsPlaying(false)

  const earthRadiusPx = LAYOUT.earth.radiusPx * vp.scale
  const scale = earthRadiusPx / EARTH_RADIUS

  // Mode 0 轨道坐标
  const r_meters = r * 1e6
  const orbitRadiusPx = r_meters * scale
  const { T: T_圆 } = calculateOrbitalSpeed(EARTH_MASS, r_meters, GRAVITATIONAL_CONSTANT)
  const omega_圆 = (2 * Math.PI) / T_圆
  const angle_圆 = omega_圆 * time * LAYOUT.mode0.timeScale
  const sat0X = centerX + orbitRadiusPx * Math.cos(angle_圆)
  const sat0Y = centerY - orbitRadiusPx * Math.sin(angle_圆)

  const r_近 = LAYOUT.mode0.rNear
  const { T: T_近 } = calculateOrbitalSpeed(EARTH_MASS, r_近, GRAVITATIONAL_CONSTANT)
  const angle_近 = ((2 * Math.PI) / T_近) * time * LAYOUT.mode0.timeScale
  const sat近X = centerX + r_近 * scale * Math.cos(angle_近)
  const sat近Y = centerY - r_近 * scale * Math.sin(angle_近)

  const r_中 = LAYOUT.mode0.rMedium
  const { T: T_中 } = calculateOrbitalSpeed(EARTH_MASS, r_中, GRAVITATIONAL_CONSTANT)
  const angle_中 = ((2 * Math.PI) / T_中) * time * LAYOUT.mode0.timeScale
  const sat中X = centerX + r_中 * scale * Math.cos(angle_中)
  const sat中Y = centerY - r_中 * scale * Math.sin(angle_中)

  const r_同步 = LAYOUT.mode0.rSync
  const { T: T_同步 } = calculateOrbitalSpeed(EARTH_MASS, r_同步, GRAVITATIONAL_CONSTANT)
  const angle_同步 = ((2 * Math.PI) / T_同步) * time * LAYOUT.mode0.timeScale
  const sat同步X = centerX + r_同步 * scale * Math.cos(angle_同步)
  const sat同步Y = centerY - r_同步 * scale * Math.sin(angle_同步)

  // Mode 1 卫星位置
  let satLaunchX = centerX
  let satLaunchY = centerY
  let satAngle = 0
  let isRocket = false
  if (mode === 1 && launchData) {
    const { theta, r_phys, phase } = launchData
    satLaunchX = centerX + r_phys * scale * Math.cos(theta)
    satLaunchY = centerY - r_phys * scale * Math.sin(theta)
    satAngle = launchData.satAngle
    isRocket = phase === 'liftoff' || phase === 'gravityTurn'
  }

  // 拖拽交互
  const [dragTarget, setDragTarget] = useState<'none' | 'sat'>('none')
  const isDraggingChartRef = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const cardScale = LAYOUT.card.scaleFactor
  const cardWidth = Math.max(LAYOUT.card.base.width * cardScale, canvasSize.width * LAYOUT.card.canvasRatio)
  const cardHeight = Math.max(LAYOUT.card.base.height * cardScale, canvasSize.height * LAYOUT.card.canvasRatioH)
  const cardX = canvasSize.width - cardWidth - LAYOUT.card.x
  const cardY = LAYOUT.card.y
  const padLeft = LAYOUT.card.base.padLeft * cardScale
  const innerW = cardWidth - padLeft - LAYOUT.card.base.padRight * cardScale

  const handleDragChart = useCallback((clientX: number, svgRect: DOMRect) => {
    const { x: containerX } = clientToContainerPoint(clientX, 0, svgRect)
    const clickX = containerX - cardX - padLeft
    const rRatio = clickX / innerW
    const targetR = LAYOUT.mode0.rMin + rRatio * (LAYOUT.mode0.rMax - LAYOUT.mode0.rMin)
    updateParam('r', Math.max(LAYOUT.mode0.rMin, Math.min(LAYOUT.mode0.rMax, targetR)))
  }, [cardX, padLeft, innerW, updateParam])

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    if (dragTarget === 'sat' && mode === 0) {
      const { x: mouseX, y: mouseY } = clientToContainerPoint(e.clientX, e.clientY, rect)
      const distPx = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2)
      const distKM = distPx / scale / 1e6
      updateParam('r', Math.max(LAYOUT.mode0.rMin, Math.min(LAYOUT.mode0.rMax, distKM)))
    } else if (isDraggingChartRef.current && mode === 0) {
      handleDragChart(e.clientX, rect)
    }
  }

  const handleSvgMouseUp = () => { setDragTarget('none'); isDraggingChartRef.current = false }

  const handleChartMouseDown = (e: React.MouseEvent<SVGElement>) => {
    if (mode !== 0) return
    isDraggingChartRef.current = true
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect) handleDragChart(e.clientX, rect)
  }

  const { vrPoints, trPoints } = useOrbitCurves()
  const trSeries: RelationDataSeries[] = useMemo(() => [{ points: trPoints, label: '周期 T(r)', color: CHART_COLORS.compareD, strokeWidth: 1.4 }], [trPoints])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg ref={svgRef} width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner select-none" onMouseMove={handleSvgMouseMove} onMouseUp={handleSvgMouseUp} onMouseLeave={handleSvgMouseUp}>
        <defs>
          <radialGradient id="earth-ocean-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[0]} />
            <stop offset="60%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[2]} />
          </radialGradient>
          <linearGradient id="rocket-fire-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={PHYSICS_COLORS.heatLoss} stopOpacity={0.8} />
            <stop offset="50%" stopColor={PHYSICS_COLORS.internalEnergy} stopOpacity={0.9} />
            <stop offset="100%" stopColor={PHYSICS_COLORS.internalEnergy} stopOpacity={0.6} />
          </linearGradient>
          <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={SCENE_COLORS.materials.structStrokeDark} floodOpacity="0.12" />
          </filter>
        </defs>

        <EarthSvg centerX={centerX} centerY={centerY} earthRadiusPx={earthRadiusPx} />

        {/* Mode 0 */}
        {mode === 0 && (
          <g>
            {showCompare === 1 && (
              <g>
                <circle cx={centerX} cy={centerY} r={r_近 * scale} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={LAYOUT.orbit.background.strokeWidth} strokeDasharray={LAYOUT.orbit.background.strokeDasharray} opacity={LAYOUT.orbit.background.opacity} />
                <circle cx={centerX} cy={centerY} r={r_中 * scale} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={LAYOUT.orbit.background.strokeWidth} strokeDasharray={LAYOUT.orbit.background.strokeDasharray} opacity={LAYOUT.orbit.background.opacity} />
                <circle cx={centerX} cy={centerY} r={r_同步 * scale} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={LAYOUT.orbit.background.strokeWidth} strokeDasharray={LAYOUT.orbit.background.strokeDasharray} opacity={LAYOUT.orbit.background.opacity} />
              </g>
            )}
            <circle cx={centerX} cy={centerY} r={orbitRadiusPx} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={LAYOUT.orbit.active.strokeWidth} strokeDasharray={LAYOUT.orbit.active.strokeDasharray} opacity={LAYOUT.orbit.active.opacity} />

            {showCompare === 1 && (
              <g>
                <g transform={`translate(${sat近X}, ${sat近Y})`}><SatelliteSvg angleRad={angle_近} /></g>
                <text x={sat近X} y={sat近Y - 14} fontSize="9" fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">近地</text>
                <g transform={`translate(${sat中X}, ${sat中Y})`}><SatelliteSvg angleRad={angle_中} /></g>
                <text x={sat中X} y={sat中Y - 14} fontSize="9" fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">GPS</text>
                <g transform={`translate(${sat同步X}, ${sat同步Y})`}><SatelliteSvg angleRad={angle_同步} /></g>
                <text x={sat同步X} y={sat同步Y - 14} fontSize="9" fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">同步</text>
              </g>
            )}

            <g transform={`translate(${sat0X}, ${sat0Y})`} onMouseDown={() => setDragTarget('sat')} style={{ cursor: dragTarget === 'sat' ? 'grabbing' : 'grab' }}>
              <SatelliteSvg angleRad={angle_圆} />
              <circle cx={0} cy={0} r={12} fill="none" stroke={PHYSICS_COLORS.velocity} strokeWidth={1} strokeDasharray="2,2" opacity={0.7} />
            </g>
            <text x={sat0X} y={sat0Y - 18} fontSize="11" fill={PHYSICS_COLORS.velocity} fontWeight="bold" textAnchor="middle">研究星 (r = {r.toFixed(1)})</text>

            {showVectors && (
              <g>
                <VectorArrow origin={{ x: sat0X - centerX, y: centerY - sat0Y }} vector={{ x: centerX - sat0X, y: sat0Y - centerY }} type="gravity" sceneScale={sceneScale} pixelLength={0.45 * Math.sqrt((sat0X - centerX) ** 2 + (sat0Y - centerY) ** 2)} />
                <text x={sat0X - (sat0X - centerX) * 0.25 - 12} y={sat0Y - (sat0Y - centerY) * 0.25 - 4} fontSize="10" fill={PHYSICS_COLORS.gravity} fontWeight="bold">F引</text>
                <VectorArrow origin={{ x: sat0X - centerX, y: centerY - sat0Y }} vector={{ x: sat0Y - centerY, y: sat0X - centerX }} type="velocity" sceneScale={sceneScale} pixelLength={0.45 * Math.sqrt((sat0X - centerX) ** 2 + (sat0Y - centerY) ** 2)} />
                <text x={sat0X + (sat0Y - centerY) * 0.45 + 5} y={sat0Y - (sat0X - centerX) * 0.45} fontSize="10" fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
              </g>
            )}
          </g>
        )}

        {/* Mode 1 */}
        {mode === 1 && launchData && (
          <g>
            <g transform={`translate(${centerX + earthRadiusPx}, ${centerY})`}>
              <path d="M 0 0 L 6 -10 L 10 -10 L 4 0 Z" fill="none" stroke={CANVAS_COLORS.labelTextLight} strokeWidth={1} />
              <path d="M 4 -10 L 1 -15 L 4 -15 L 7 -10 Z" fill="none" stroke={CANVAS_COLORS.labelTextLight} strokeWidth={1} />
              <line x1={0} y1={0} x2={0} y2={-15} stroke={CANVAS_COLORS.labelTextLight} strokeWidth={1.2} />
              <circle cx={0} cy={0} r={1.5} fill={CANVAS_COLORS.strokeDark} />
            </g>
            <text x={centerX + earthRadiusPx + 10} y={centerY + 12} fontSize="9" fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">文昌发射场</text>

            {(() => {
              const targetOrbitRadiusPx = launchData.r0 * scale
              const targetAngle = LAYOUT.mode1.orbitEndAngle
              const targetX = centerX + targetOrbitRadiusPx * Math.cos(targetAngle)
              const targetY = centerY - targetOrbitRadiusPx * Math.sin(targetAngle)
              return (
                <g>
                  <line x1={centerX} y1={centerY} x2={targetX} y2={targetY} stroke={PHYSICS_COLORS.trackHistory} strokeWidth={0.8} strokeDasharray="2,2" opacity={0.3} />
                  <circle cx={targetX} cy={targetY} r={3.5} fill={CANVAS_COLORS.referencePoint} />
                  <text x={targetX + 8} y={targetY - 5} fontSize="9" fill={CANVAS_COLORS.referencePoint} fontWeight="bold" textAnchor="start">预定入轨点</text>
                </g>
              )
            })()}

            {launchData.orbitPoints.length > 1 && (
              <path d={`M ${launchData.orbitPoints.map(([thetaVal, rPhys]) => `${centerX + rPhys * scale * Math.cos(thetaVal)},${centerY - rPhys * scale * Math.sin(thetaVal)}`).join(' L ')}`} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={LAYOUT.orbit.predict.strokeWidth} strokeDasharray={LAYOUT.orbit.predict.strokeDasharray} opacity={LAYOUT.orbit.predict.opacity} />
            )}

            <g transform={`translate(${satLaunchX}, ${satLaunchY})`}>
              {isRocket ? <RocketSvg angleRad={satAngle} scale={0.65} time={time} /> : <SatelliteSvg angleRad={satAngle} scale={0.65} />}
            </g>

            {launchData.crashed && (
              <g transform={`translate(${satLaunchX}, ${satLaunchY})`}>
                <circle cx={0} cy={0} r={12} fill={CHART_COLORS.criticalPt} opacity={0.4} />
                <circle cx={0} cy={0} r={6} fill={CHART_COLORS.criticalPt} opacity={0.8} />
                <text x={15} y={15} fontSize="11" fill={CHART_COLORS.criticalPt} fontWeight="bold">撞击坠毁</text>
              </g>
            )}

            {showVectors && !launchData.crashed && isLaunched === 1 && !isRocket && (
              <g>
                <VectorArrow origin={{ x: satLaunchX - centerX, y: centerY - satLaunchY }} vector={{ x: centerX - satLaunchX, y: satLaunchY - centerY }} type="gravity" sceneScale={sceneScale} pixelLength={0.45 * Math.sqrt((satLaunchX - centerX) ** 2 + (satLaunchY - centerY) ** 2)} />
                <VectorArrow origin={{ x: satLaunchX - centerX, y: centerY - satLaunchY }} vector={launchData.velocityDir ?? { x: 0, y: 1 }} type="velocity" sceneScale={sceneScale} pixelLength={0.45 * Math.sqrt((satLaunchX - centerX) ** 2 + (satLaunchY - centerY) ** 2)} />
              </g>
            )}
          </g>
        )}

        {/* Mode 0 PiP chart */}
        {showChart === 1 && mode === 0 && (
          <g transform={`translate(${cardX}, ${cardY})`}>
            <rect width={cardWidth} height={cardHeight} fill={SCENE_COLORS.labels.glassPanelBg} rx={8} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} filter="url(#card-shadow)" />
            <foreignObject x={4} y={4} width={cardWidth - 8} height={cardHeight - 8} style={{ pointerEvents: 'none' }}>
              <div style={{ width: '100%', height: '100%' }}>
                <RelationChart points={vrPoints} additionalSeries={trSeries} xLabel="半径 r" yLabel="v / T (归一化)" title="轨道物理量-半径关系曲线 (v-r / T-r)" xDomain={[LAYOUT.mode0.rMin, LAYOUT.mode0.rMax]} yDomain={[0, 1]} cursorX={r} cursorLabel={(_x, y) => y.toFixed(2)} color={PHYSICS_COLORS.velocity} strokeWidth={1.4} series="primary" />
              </div>
            </foreignObject>
            <rect x={0} y={0} width={cardWidth} height={cardHeight} fill="transparent" className="cursor-ew-resize" onMouseDown={handleChartMouseDown} />
          </g>
        )}

        {/* Mode 1 PiP cards */}
        {showChart === 1 && mode === 1 && launchData && (
          <g>
            {/* CAM-01 特写 */}
            <g transform={`translate(${canvasSize.width - 240 - 15}, 20)`}>
              <rect width={240} height={160} fill={SCENE_COLORS.labels.glassPanelBg} rx={8} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} filter="url(#card-shadow)" />
              <text x={120} y={18} fontSize={font(9)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold" fontFamily="PingFang SC, sans-serif">CAM-01: 发射与并轨特写监控</text>
              <g transform="translate(10, 28)">
                <rect width={220} height={120} fill={SCENE_COLORS.environment.spaceBg} rx={4} />
                <g style={{ clipPath: 'inset(0px round 4px)' }}>
                  {(() => {
                    const zoomLevel = 4.0
                    const dx = 110 - satLaunchX * zoomLevel
                    const dy = 60 - satLaunchY * zoomLevel
                    return (
                      <g transform={`translate(${dx}, ${dy}) scale(${zoomLevel})`}>
                        <g transform={`translate(${-centerX}, ${-centerY})`}><EarthSvg centerX={centerX} centerY={centerY} earthRadiusPx={earthRadiusPx} /></g>
                        <g transform={`translate(${centerX + earthRadiusPx}, ${centerY})`}>
                          <path d="M 0 0 L 6 -10 L 10 -10 L 4 0 Z" fill="none" stroke={CANVAS_COLORS.axis} strokeWidth={0.8} opacity={0.6} />
                          <path d="M 4 -10 L 1 -15 L 4 -15 L 7 -10 Z" fill="none" stroke={CANVAS_COLORS.axis} strokeWidth={0.8} opacity={0.6} />
                          <line x1={0} y1={0} x2={0} y2={-15} stroke={CANVAS_COLORS.axis} strokeWidth={1.0} opacity={0.6} />
                        </g>
                        {(() => {
                          const targetOrbitRadiusPx = launchData.r0 * scale
                          const targetAngle = LAYOUT.mode1.orbitEndAngle
                          const targetX = centerX + targetOrbitRadiusPx * Math.cos(targetAngle)
                          const targetY = centerY - targetOrbitRadiusPx * Math.sin(targetAngle)
                          return <circle cx={targetX} cy={targetY} r={3.5} fill={colors.success[500]} />
                        })()}
                        {launchData.orbitPoints.length > 1 && (
                          <path d={`M ${launchData.orbitPoints.map(([thetaVal, rPhys]) => `${centerX + rPhys * scale * Math.cos(thetaVal)},${centerY - rPhys * scale * Math.sin(thetaVal)}`).join(' L ')}`} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={0.6} strokeDasharray="2,2" opacity={0.3} />
                        )}
                        <g transform={`translate(${satLaunchX}, ${satLaunchY})`}>
                          {isRocket ? <RocketSvg angleRad={satAngle} scale={0.6} time={time} /> : <SatelliteSvg angleRad={satAngle} scale={0.6} />}
                        </g>
                        {launchData.crashed && <circle cx={satLaunchX} cy={satLaunchY} r={6} fill={CHART_COLORS.criticalPt} opacity={0.6} />}
                      </g>
                    )
                  })()}
                </g>
                <rect width={220} height={120} fill="none" stroke={CANVAS_COLORS.strokeDark} strokeWidth={1} rx={4} pointerEvents="none" />
                <text x={8} y={14} fontSize={font(6)} fill={CANVAS_COLORS.labelTextLight} fontFamily="monospace" opacity={0.85}>ZOOM: 4.0X</text>
                <text x={212} y={14} fontSize={font(6)} fill={CANVAS_COLORS.labelTextLight} fontFamily="monospace" textAnchor="end" opacity={0.85}>
                  {launchData.phase === 'liftoff' ? 'LIFTOFF' : launchData.phase === 'gravityTurn' ? 'G-TURN' : 'IN_ORBIT'}
                </text>
              </g>
            </g>

            {/* v-t 速度曲线 */}
            {(() => {
              const vtScale = VTCARD.scaleFactor
              const vtCardWidth = Math.max(VTCARD.base.width * vtScale, canvasSize.width * VTCARD.canvasRatio)
              const vtCardHeight = Math.max(VTCARD.base.height * vtScale, canvasSize.height * VTCARD.canvasRatioH)
              const vtCardX = canvasSize.width - vtCardWidth - 15
              const vtCardY = canvasSize.height - vtCardHeight - 20
              const vtPoints = vtSamplePoints.map(([t, v]) => ({ t, v }))
              const launchT = LAYOUT.mode1.launchDuration
              const entryT = LAYOUT.mode1.orbitEntryTime
              const stages: VTStage[] = [
                { from: 0, to: launchT, color: CANVAS_COLORS.grid, opacity: 0.35, label: '发射示意', labelColor: CANVAS_COLORS.labelTextLight },
                { from: launchT, to: entryT, color: CHART_COLORS.areaFill, opacity: 0.35, label: '转弯示意', labelColor: CHART_COLORS.primary },
                { from: entryT, to: 15, color: CHART_COLORS.areaFillAlt, opacity: 0.35, label: '轨道运动', labelColor: CHART_COLORS.compareA },
              ]
              return (
                <g transform={`translate(${vtCardX}, ${vtCardY})`}>
                  <rect width={vtCardWidth} height={vtCardHeight} fill={SCENE_COLORS.labels.glassPanelBg} rx={8} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} filter="url(#card-shadow)" />
                  <foreignObject x={4} y={4} width={vtCardWidth - 8} height={vtCardHeight - 8}>
                    <div style={{ width: '100%', height: '100%' }}>
                      <VelocityTimeChart points={vtPoints} currentTime={isLaunched === 1 ? Math.min(15, time) : 0} tMax={15} title="线速度-时间变化曲线 (v-t)" stages={stages} series="primary" showGrid showCursor={isLaunched === 1} />
                    </div>
                  </foreignObject>
                </g>
              )
            })()}
          </g>
        )}
      </svg>
    </div>
  )
}
