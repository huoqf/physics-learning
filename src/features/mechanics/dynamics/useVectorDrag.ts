import { useState, useEffect, useCallback, type RefObject } from 'react'
import { clientToContainerPoint, snapAngle, snapForce, normalizeAngle180 } from '@/utils'
import type { ViewportInfo } from '@/utils'

interface UseVectorDragProps {
  svgRef: RefObject<SVGSVGElement | null>
  vp: ViewportInfo
  designW: number
  designH: number
  scale: number
  phi: number
  mode: number
  updateParam: (key: string, value: number) => void
}

export function useVectorDrag({ svgRef, vp, designW, designH, scale, phi, mode: _mode, updateParam }: UseVectorDragProps) {
  const [activeDrag, setActiveDrag] = useState<'f1' | 'f2' | 'f' | null>(null)

  const handleDragStart = useCallback(
    (target: 'f1' | 'f2' | 'f', e: React.PointerEvent) => {
      e.preventDefault()
      setActiveDrag(target)
    },
    []
  )

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!activeDrag || !svgRef.current || vp.visibleW === 0 || vp.scale === 0) return

      const { x: cx, y: cy } = clientToContainerPoint(clientX, clientY, svgRef.current.getBoundingClientRect())
      // 容器像素 → 设计坐标
      const designX = (cx - vp.tx) / vp.scale
      const designY = (cy - vp.ty) / vp.scale
      // canvasToPhysics 内联：设计坐标 → 物理坐标（原点在画布中心）
      const px = (designX - designW / 2) / scale
      const py = (designH / 2 - designY) / scale

      const rawMag = Math.sqrt(px * px + py * py)
      const rawDir = (Math.atan2(py, px) * 180) / Math.PI

      const newMag = Math.max(1, Math.min(20, snapForce(rawMag)))

      if (activeDrag === 'f1') {
        const newPhi = Math.max(-180, Math.min(180, snapAngle(rawDir)))
        updateParam('f1', newMag)
        updateParam('phi', newPhi)
      } else if (activeDrag === 'f2') {
        const newAngle = Math.max(0, Math.min(180, snapAngle(normalizeAngle180(rawDir - phi))))
        updateParam('f2', newMag)
        updateParam('angle', newAngle)
      } else {
        updateParam('f1', newMag)
        updateParam('angle', snapAngle(rawDir))
      }
    },
    [activeDrag, svgRef, vp, designW, designH, scale, phi, updateParam]
  )

  useEffect(() => {
    if (!activeDrag) return
    const up = () => setActiveDrag(null)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => { window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up) }
  }, [activeDrag])

  return { activeDrag, handleDragStart, handleDragMove }
}
