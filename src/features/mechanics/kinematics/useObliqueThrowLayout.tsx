import { useMemo, useCallback, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, STROKE, DASH } from '@/theme/physics'
import { clientToContainerPoint } from '@/utils'
import type { ObliqueThrowResult } from '@/physics'
import type React from 'react'

interface ViewportInfo {
  visibleX: number
  visibleY: number
  visibleW: number
  visibleH: number
}

interface LayoutConstants {
  originX: number
  rightPadding: number
}

/**
 * 斜抛运动 v-t 图数据、网格线与时间游标拖拽逻辑。
 * 从 ObliqueThrowAnimation 中拆出以控制主文件行数。
 */
export function useObliqueThrowLayout(
  trajectory: ObliqueThrowResult,
  vp: ViewportInfo,
  layout: LayoutConstants,
  v0: number,
  g: number,
  effectiveTime: number,
  groundTime: number,
  groundTimeVac: number,
  stageHeight: number,
  originX: number,
  groundY: number,
  showGrid: boolean,
) {
  const setTime = useAnimationStore((s) => s.setTime)
  const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)

  const maxTime = Math.max(groundTime, groundTimeVac)
  const activeT = Math.min(effectiveTime, groundTime)

  // ── v-t 图区域定位 ──
  const vtWidth = Math.max(220, vp.visibleW * 0.35)
  const vtHeight = Math.max(150, vp.visibleH * 0.34)
  const vtX = vp.visibleX + vp.visibleW - vtWidth - 20
  const vtY = 20
  const vtXMax = maxTime * 1.15
  const vtVMax = Math.max(v0, g * maxTime) * 1.15

  // ── v-t 图数据 ──
  const vtPointsVx = useMemo(
    () => trajectory.points.filter(pt => pt.t <= activeT + 1e-5).map(pt => ({ t: pt.t, v: pt.vx })),
    [trajectory.points, activeT]
  )
  const vtDomainVx = useMemo(
    () => trajectory.points.map(pt => ({ t: pt.t, v: pt.vx })),
    [trajectory.points]
  )
  const vtPointsVy = useMemo(
    () => trajectory.points.filter(pt => pt.t <= activeT + 1e-5).map(pt => ({ t: pt.t, v: pt.vy })),
    [trajectory.points, activeT]
  )
  const vtDomainVy = useMemo(
    () => trajectory.points.map(pt => ({ t: pt.t, v: pt.vy })),
    [trajectory.points]
  )

  // ── 时间游标拖拽 ──
  const isDraggingRef = useRef(false)

  const handleDragTime = useCallback(
    (clientX: number, svgRect: DOMRect) => {
      const { x: containerX } = clientToContainerPoint(clientX, 0, svgRect)
      const clickX = containerX - vtX - 4
      const tClick = (clickX / (vtWidth - 8)) * vtXMax
      if (tClick >= 0 && tClick <= maxTime) {
        setTime(tClick)
        setIsPlaying(false)
      }
    },
    [vtX, vtWidth, vtXMax, maxTime, setTime, setIsPlaying]
  )

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      if (!isDraggingRef.current) return
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      handleDragTime(e.clientX, rect)
    },
    [handleDragTime]
  )

  const handleSvgMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const handleChartMouseDown = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      isDraggingRef.current = true
      const svg = e.currentTarget.closest('svg')
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      handleDragTime(e.clientX, rect)
    },
    [handleDragTime]
  )

  // ── 网格线 ──
  const gridLines = useMemo(() => {
    if (!showGrid) return []
    const lines: React.ReactElement[] = []
    const gridCols = 12
    const gridRows = 8
    const gridStageWidth = vp.visibleW - layout.originX - layout.rightPadding
    for (let i = 1; i < gridRows; i++) {
      const yPos = groundY - (i * stageHeight) / gridRows
      lines.push(
        <line key={`h-grid-${i}`} x1={originX} y1={yPos} x2={vp.visibleX + vp.visibleW - 20} y2={yPos}
          stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid} strokeDasharray={DASH.axis.join(' ')} />
      )
    }
    for (let i = 1; i < gridCols; i++) {
      const xPos = originX + (i * gridStageWidth) / gridCols
      lines.push(
        <line key={`v-grid-${i}`} x1={xPos} y1={groundY - stageHeight} x2={xPos} y2={groundY}
          stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid} strokeDasharray={DASH.axis.join(' ')} />
      )
    }
    return lines
  }, [showGrid, groundY, stageHeight, vp.visibleW, vp.visibleX, originX, layout.originX, layout.rightPadding])

  return {
    vtWidth,
    vtHeight,
    vtX,
    vtY,
    vtXMax,
    vtVMax,
    vtPointsVx,
    vtDomainVx,
    vtPointsVy,
    vtDomainVy,
    handleSvgMouseMove,
    handleSvgMouseUp,
    handleChartMouseDown,
    gridLines,
  }
}
