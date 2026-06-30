import { useState, useEffect, useCallback, type RefObject } from 'react'
import { canvasToPhysics } from '@/utils/coordinate'

const SNAP_ANGLES = [0, 30, 45, 60, 90, 120, 150, 180]
const SNAP_ANGLE_THRESHOLD = 2.5
const SNAP_FORCE_THRESHOLD = 0.15

interface UseVectorDragProps {
  svgRef: RefObject<SVGSVGElement | null>
  visibleW: number
  visibleH: number
  scale: number
  updateParam: (key: string, value: number) => void
}

export function useVectorDrag({ svgRef, visibleW, visibleH, scale, updateParam }: UseVectorDragProps) {
  const [activeDrag, setActiveDrag] = useState<'f1' | 'f2' | 'f' | null>(null)

  const handleDragStart = useCallback(
    (target: 'f1' | 'f2' | 'f', e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      setActiveDrag(target)
    },
    []
  )

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!activeDrag || !svgRef.current || visibleW === 0) return

      const rect = svgRef.current.getBoundingClientRect()
      const { x: px, y: py } = canvasToPhysics(clientX - rect.left, clientY - rect.top, visibleW, visibleH, scale)

      if (activeDrag === 'f1') {
        let newF1 = px
        const rounded = Math.round(newF1 * 2) / 2
        if (Math.abs(newF1 - rounded) < SNAP_FORCE_THRESHOLD) newF1 = rounded
        updateParam('f1', Math.max(1, Math.min(20, newF1)))
      } else {
        const raw = Math.sqrt(px * px + py * py)
        let rawAngle = Math.abs((Math.atan2(py, px) * 180) / Math.PI)
        rawAngle = Math.max(0, Math.min(180, rawAngle))

        for (const snapA of SNAP_ANGLES) {
          if (Math.abs(rawAngle - snapA) < SNAP_ANGLE_THRESHOLD) { rawAngle = snapA; break }
        }

        const rounded = Math.round(raw * 2) / 2
        const newMag = Math.max(1, Math.min(20, Math.abs(raw - rounded) < SNAP_FORCE_THRESHOLD ? rounded : raw))
        const newAngle = Math.max(0, Math.min(180, rawAngle))

        if (activeDrag === 'f2') {
          updateParam('f2', newMag)
          updateParam('angle', newAngle)
        } else {
          updateParam('f1', newMag)
          updateParam('angle', newAngle)
        }
      }
    },
    [activeDrag, svgRef, visibleW, visibleH, scale, updateParam]
  )

  useEffect(() => {
    if (!activeDrag) return
    const up = () => setActiveDrag(null)
    window.addEventListener('mouseup', up)
    window.addEventListener('touchend', up)
    return () => { window.removeEventListener('mouseup', up); window.removeEventListener('touchend', up) }
  }, [activeDrag])

  return { handleDragStart, handleDragMove }
}
