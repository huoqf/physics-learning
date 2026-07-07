import { useState, useEffect, useCallback, type RefObject } from 'react'
import { canvasToPhysics, clientToContainerPoint } from '@/utils'

const SNAP_ANGLES = [0, 30, 45, 60, 90, 120, 150, 180]
const SNAP_ANGLE_THRESHOLD = 2.5
const SNAP_FORCE_THRESHOLD = 0.15

interface UseVectorDragProps {
  svgRef: RefObject<SVGSVGElement | null>
  visibleW: number
  visibleH: number
  scale: number
  phi: number
  mode: number
  updateParam: (key: string, value: number) => void
}

function normalizeAngle360(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function normalizeAngle180(deg: number): number {
  const a = normalizeAngle360(deg)
  return a > 180 ? 360 - a : a
}

export function useVectorDrag({ svgRef, visibleW, visibleH, scale, phi, mode: _mode, updateParam }: UseVectorDragProps) {
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

      const { x: cx, y: cy } = clientToContainerPoint(clientX, clientY, svgRef.current.getBoundingClientRect())
      const { x: px, y: py } = canvasToPhysics(cx, cy, visibleW, visibleH, scale)

      const rawMag = Math.sqrt(px * px + py * py)
      const rawDir = (Math.atan2(py, px) * 180) / Math.PI

      const roundedMag = Math.round(rawMag * 2) / 2
      const newMag = Math.max(1, Math.min(20, Math.abs(rawMag - roundedMag) < SNAP_FORCE_THRESHOLD ? roundedMag : rawMag))

      if (activeDrag === 'f1') {
        // F1 拖拽：改变大小和方向 phi
        let newPhi = rawDir
        for (const snapA of SNAP_ANGLES) {
          if (Math.abs(newPhi - snapA) < SNAP_ANGLE_THRESHOLD) { newPhi = snapA; break }
          if (Math.abs(newPhi + snapA) < SNAP_ANGLE_THRESHOLD) { newPhi = -snapA; break }
        }
        updateParam('f1', newMag)
        updateParam('phi', Math.max(-180, Math.min(180, newPhi)))
      } else if (activeDrag === 'f2') {
        // F2 拖拽（合成模式）：夹角 θ 取最小角 [0, 180]
        let newAngle = normalizeAngle180(rawDir - phi)
        for (const snapA of SNAP_ANGLES) {
          if (Math.abs(newAngle - snapA) < SNAP_ANGLE_THRESHOLD) { newAngle = snapA; break }
        }
        updateParam('f2', newMag)
        updateParam('angle', Math.max(0, Math.min(180, newAngle)))
      } else {
        // 合力拖拽（正交分解模式）：偏角 0~360
        let newAngle = normalizeAngle360(rawDir)
        for (const snapA of SNAP_ANGLES) {
          if (Math.abs(newAngle - snapA) < SNAP_ANGLE_THRESHOLD) { newAngle = snapA; break }
        }
        updateParam('f1', newMag)
        updateParam('angle', newAngle)
      }
    },
    [activeDrag, svgRef, visibleW, visibleH, scale, phi, updateParam]
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
