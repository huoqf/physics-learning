import { useMemo, useCallback, useRef, useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { CANVAS_COLORS, STROKE, DASH } from '@/theme/physics'
import type { ObliqueThrowResult } from '@/physics'
import type React from 'react'
import { CANVAS_PRESETS } from '@/theme/spacing'

const OBLIQUE_DESIGN = CANVAS_PRESETS.full

interface LayoutConstants {
  originX: number
  rightPadding: number
  topPadding: number
  groundYRatio: number
}

/**
 * 斜抛运动 v-t 图数据、网格线与时间游标拖拽逻辑。
 * 基于 Design 坐标系输出，配合 AnimationSvgCanvas 使用。
 */
export function useObliqueThrowLayout(
  trajectory: ObliqueThrowResult,
  layout: LayoutConstants,
  v0: number,
  g: number,
  effectiveTime: number,
  groundTime: number,
  groundTimeVac: number,
  showGrid: boolean,
) {
  const setTime = useAnimationStore((s) => s.setTime)
  const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)

  const maxTime = Math.max(groundTime, groundTimeVac)
  const activeT = Math.min(effectiveTime, groundTime)

  // ── v-t 图区域定位（Design 坐标） ──
  const vtWidth = Math.max(260, OBLIQUE_DESIGN.width * 0.35)
  const vtHeight = Math.max(180, OBLIQUE_DESIGN.height * 0.32)
  const vtX = OBLIQUE_DESIGN.width - vtWidth - 20
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

  // ── 时间游标拖拽（HTML 层图表） ──
  const isDraggingRef = useRef(false)

  const handleDragTime = useCallback(
    (clientX: number, chartRect: DOMRect) => {
      const clickX = clientX - chartRect.left
      const tClick = (clickX / chartRect.width) * vtXMax
      if (tClick >= 0 && tClick <= maxTime) {
        setTime(tClick)
        setIsPlaying(false)
      }
    },
    [vtXMax, maxTime, setTime, setIsPlaying]
  )

  const handleChartMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      isDraggingRef.current = true
      const rect = e.currentTarget.getBoundingClientRect()
      handleDragTime(e.clientX, rect)
    },
    [handleDragTime]
  )

  const handleWindowMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const div = document.elementFromPoint(e.clientX, e.clientY)
      if (!div) return
      const chartDiv = div.closest('[data-vt-chart]') as HTMLDivElement | null
      if (chartDiv) {
        const rect = chartDiv.getBoundingClientRect()
        handleDragTime(e.clientX, rect)
      }
    },
    [handleDragTime]
  )

  const handleWindowMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [handleWindowMouseMove, handleWindowMouseUp])

  // ── 设计坐标系下的网格线 ──
  const designOriginX = layout.originX
  const designGroundY = OBLIQUE_DESIGN.height * layout.groundYRatio
  const designTopY = layout.topPadding
  const stageHeight = designGroundY - designTopY
  const stageWidth = OBLIQUE_DESIGN.width - layout.originX - layout.rightPadding

  const gridLines = useMemo(() => {
    if (!showGrid) return []
    const lines: React.ReactElement[] = []
    const gridCols = 12
    const gridRows = 8
    for (let i = 1; i < gridRows; i++) {
      const yPos = designGroundY - (i * stageHeight) / gridRows
      lines.push(
        <line
          key={`h-grid-${i}`}
          x1={designOriginX}
          y1={yPos}
          x2={OBLIQUE_DESIGN.width - 20}
          y2={yPos}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
    for (let i = 1; i < gridCols; i++) {
      const xPos = designOriginX + (i * stageWidth) / gridCols
      lines.push(
        <line
          key={`v-grid-${i}`}
          x1={xPos}
          y1={designTopY}
          x2={xPos}
          y2={designGroundY}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
    return lines
  }, [showGrid, designGroundY, stageHeight, designOriginX, stageWidth, designTopY])

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
    handleChartMouseDown,
    gridLines,
    designOriginX,
    designGroundY,
    designTopY,
    stageHeight,
    stageWidth,
  }
}
