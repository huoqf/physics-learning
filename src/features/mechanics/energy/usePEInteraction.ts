import { useRef, useState, useCallback } from 'react'
import type { MutableRefObject } from 'react'
import { clientToContainerPoint } from '@/utils'

export interface DragState {
  isDragging: boolean
  type: 'y0' | 'y_ref' | 'x0' | null
  startY: number
  startX: number
  startVal: number
}

const INITIAL_DRAG: DragState = { isDragging: false, type: null, startY: 0, startX: 0, startVal: 0 }

interface PEInteractionOptions {
  mode: number
  isPlaying: boolean
  svgRef: MutableRefObject<SVGSVGElement | null>
  toPixelY: (y: number) => number
  toPixelX: (x: number) => number
  groundY: number
  objW: number
  ballR: number
  animLeft: number
  animRight: number
  animCenterX: number
  scaleY: number
  scaleX: number
  state: { pos: number; v: number }
  y_ref: number
  y0: number
  x0: number
  updateParam: (key: string, value: number) => void
  setTime: (t: number) => void
  setIsPlaying: (p: boolean) => void
}

export function usePEInteraction({
  mode, isPlaying, svgRef,
  toPixelY, toPixelX, groundY, objW, ballR,
  animLeft, animRight, animCenterX,
  scaleY, scaleX,
  state, y_ref, y0, x0,
  updateParam, setTime, setIsPlaying,
}: PEInteractionOptions) {
  const dragRef = useRef<DragState>(INITIAL_DRAG)
  const [hoveredTarget, setHoveredTarget] = useState<'y0' | 'y_ref' | 'x0' | null>(null)

  const getHitTarget = useCallback((mouseX: number, mouseY: number) => {
    if (mode === 0) {
      const refYPix = toPixelY(y_ref)
      if (Math.abs(mouseY - refYPix) <= 8 && mouseX >= animLeft && mouseX <= animRight) return 'y_ref'
      const ballCX = animCenterX
      const ballCY = toPixelY(state.pos) - ballR
      if (
        mouseX >= ballCX - ballR - 10 && mouseX <= ballCX + ballR + 10 &&
        mouseY >= ballCY - ballR - 10 && mouseY <= ballCY + ballR + 10
      ) return 'y0'
    } else {
      const blockX = toPixelX(state.pos) + objW * 0.5
      const blockYPix = groundY - objW * 0.45
      const r = objW * 0.45
      if (
        mouseX >= blockX - r - 10 && mouseX <= blockX + r + 10 &&
        mouseY >= blockYPix - r - 10 && mouseY <= blockYPix + r + 10
      ) return 'x0'
    }
    return null
  }, [mode, toPixelY, toPixelX, groundY, objW, ballR, animLeft, animRight, animCenterX, state.pos, y_ref])

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isPlaying) return
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const { x: mouseX, y: mouseY } = clientToContainerPoint(e.clientX, e.clientY, rect)
    const hit = getHitTarget(mouseX, mouseY)
    if (!hit) return
    const startVal = hit === 'y_ref' ? y_ref : hit === 'y0' ? y0 : x0
    dragRef.current = { isDragging: true, type: hit, startY: mouseY, startX: mouseX, startVal }
  }, [isPlaying, svgRef, getHitTarget, y_ref, y0, x0])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const { x: mouseX, y: mouseY } = clientToContainerPoint(e.clientX, e.clientY, rect)

    if (dragRef.current.isDragging && dragRef.current.type) {
      const { type, startY, startX, startVal } = dragRef.current
      if (type === 'y_ref') {
        updateParam('y_ref', Math.max(0, Math.min(8.0, startVal - (mouseY - startY) / scaleY)))
      } else if (type === 'y0') {
        updateParam('y0', Math.max(2.0, Math.min(10.0, startVal - (mouseY - startY) / scaleY)))
        setTime(0); setIsPlaying(false)
      } else if (type === 'x0') {
        updateParam('x0', Math.max(-2.8, Math.min(2.8, startVal + (mouseX - startX) / scaleX)))
        setTime(0); setIsPlaying(false)
      }
      return
    }

    if (isPlaying) { setHoveredTarget(null); return }
    setHoveredTarget(getHitTarget(mouseX, mouseY))
  }, [svgRef, isPlaying, scaleY, scaleX, updateParam, setTime, setIsPlaying, getHitTarget])

  const handleMouseUpOrLeave = useCallback(() => {
    dragRef.current = INITIAL_DRAG
  }, [])

  const cursor = hoveredTarget === 'y_ref' || hoveredTarget === 'y0' ? 'ns-resize'
    : hoveredTarget === 'x0' ? 'ew-resize' : 'default'

  return {
    hoveredTarget,
    cursor,
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
  }
}
