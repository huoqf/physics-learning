import { useMemo } from 'react'
import { SPECTROMETER, DEFLECT } from '../model/combinedFieldsModel'
import type { GridPoint } from '@/components/Physics/MagneticFieldGrid'

export interface FieldGridPointsResult {
  b1Points: GridPoint[]
  b2DotPoints: GridPoint[]
  b2CrossPoints: GridPoint[]
  cyclotronBFieldPoints: GridPoint[]
}

export function useFieldGridPoints(): FieldGridPointsResult {
  const b1Points = useMemo<GridPoint[]>(() => {
    const pts: GridPoint[] = []
    const startX = SPECTROMETER.xMid - SPECTROMETER.plateHalf + 18
    const startY = SPECTROMETER.y0 + 20
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        pts.push({ x: startX + i * 40, y: startY + j * 35 })
      }
    }
    return pts
  }, [])

  const b2DotPoints = useMemo<GridPoint[]>(() => {
    const pts: GridPoint[] = []
    const startY = SPECTROMETER.y1 + 30
    for (let i = 0; i < 10; i++) {
      const x = 80 + i * 50
      if (x >= 350) break
      for (let j = 0; j < 3; j++) {
        pts.push({ x, y: startY + j * 50 })
      }
    }
    return pts
  }, [])

  const b2CrossPoints = useMemo<GridPoint[]>(() => {
    const pts: GridPoint[] = []
    const startX = DEFLECT.magneticB2StartX + 30
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        pts.push({ x: startX + i * 55, y: 50 + j * 100 })
      }
    }
    return pts
  }, [])

  const cyclotronBFieldPoints = useMemo<GridPoint[]>(() => {
    const pts: GridPoint[] = []
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 3; j++) {
        pts.push({ x: 180 + i * 50, y: 50 + j * 100 })
      }
    }
    return pts
  }, [])

  return { b1Points, b2DotPoints, b2CrossPoints, cyclotronBFieldPoints }
}
