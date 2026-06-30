import { useEffect } from 'react'
import { calculateElevatorMotion } from '@/physics'
import type { ViewportInfo } from '@/utils/useViewport'

interface WeightlessnessParams {
  a?: number
  g?: number
  m?: number
  advancedMode?: number
  modelIdx?: number
}

export const LAYOUT = {
  shaftTopOffset: 30,
  shaftBottomOffset: 30,
  elevatorMaxWidth: 150,
  elevatorWidthPadding: 40,
  elevatorMaxHeight: 180,
  elevatorHeightRatio: 0.45,
  travelPadding: 10,
  floorThickness: 15,
  floorSidePadding: 5,
  floorHeight: 10,
  scaleWidthRatio: 0.55,
  scaleMaxHeight: 22,
  scaleHeightRatio: 0.12,
  dialMaxRadius: 9,
  dialRadiusRatio: 0.45,
  objWidthRatio: 0.55,
  objMaxHeight: 32,
  objHeightRatio: 0.16,
  ceilingPadding: 20,
  pointerMaxAngle: 90,
  fs: 11,
  sfs: 9,
}

export function useWeightlessnessLayout(vp: ViewportInfo, params: WeightlessnessParams, time: number, isPlaying: boolean, setIsPlaying: (val: boolean) => void) {
  const { a = 2, g = 9.8, m = 50, advancedMode = 0, modelIdx = 0 } = params

  const isWide = advancedMode !== 1 && vp.visibleW >= 500
  const animWidth = isWide ? vp.visibleW * 0.42 : vp.visibleW
  const chartWidth = isWide ? vp.visibleW * 0.52 : 0
  const chartX = isWide ? vp.visibleW * 0.46 : 0

  let currentA = a
  let actualA = 0
  let currentV = 0
  let currentY = 0
  let currentN = m * (g + a)

  const tMax = advancedMode === 1 ? (modelIdx === 1 ? 6 : 10) : Infinity

  const shaftTop = LAYOUT.shaftTopOffset
  const shaftBottom = vp.visibleH - LAYOUT.shaftBottomOffset
  const shaftHeight = shaftBottom - shaftTop

  const elevatorWidth = Math.min(LAYOUT.elevatorMaxWidth, animWidth - LAYOUT.elevatorWidthPadding)
  const elevatorHeight = Math.min(LAYOUT.elevatorMaxHeight, shaftHeight * LAYOUT.elevatorHeightRatio)
  const maxTravel = (shaftHeight - elevatorHeight) / 2 - LAYOUT.travelPadding
  const elevatorStartY = shaftTop + shaftHeight / 2 - elevatorHeight / 2

  const maxDisplacementTime = maxTravel > 0 && Math.abs(a) > 0.01
    ? Math.sqrt((2 * maxTravel) / Math.abs(a))
    : Infinity

  let effectiveTime = time
  let isMoving = false

  if (advancedMode === 1) {
    effectiveTime = Math.min(time, tMax)
    const motion = calculateElevatorMotion(modelIdx as 0 | 1, m, g, effectiveTime)
    currentA = motion.a
    actualA = motion.a
    currentV = motion.v
    currentY = motion.y
    currentN = motion.N
  } else {
    effectiveTime = maxDisplacementTime !== Infinity && time >= maxDisplacementTime ? maxDisplacementTime : time
    isMoving = isPlaying && time > 0 && time < maxDisplacementTime
    const hasReachedEnd = maxDisplacementTime !== Infinity && time >= maxDisplacementTime

    currentA = a
    currentN = m * (g + a)
    if (currentN < 0) currentN = 0

    if (isMoving) {
      const motion = calculateElevatorMotion(2, m, g, effectiveTime, a)
      actualA = motion.a
      currentV = motion.v
      currentY = motion.y
    } else if (hasReachedEnd) {
      actualA = 0
      currentV = 0
      currentY = 0.5 * a * effectiveTime * effectiveTime
    } else {
      actualA = 0
      currentV = 0
      currentY = 0
    }
  }

  useEffect(() => {
    if (!isPlaying) return

    if (advancedMode === 1) {
      if (time >= tMax) {
        setIsPlaying(false)
      }
    } else {
      if (maxDisplacementTime !== Infinity && time >= maxDisplacementTime) {
        setIsPlaying(false)
      }
    }
  }, [time, tMax, maxDisplacementTime, isPlaying, advancedMode, setIsPlaying])

  let dispY = 0
  if (advancedMode === 1) {
    if (modelIdx === 0) {
      dispY = - (currentY / 20) * maxTravel
    } else {
      dispY = - (currentY / -43) * -maxTravel
    }
  } else {
    const maxPhysicalS = Math.max(0.1, 0.5 * Math.abs(a) * maxDisplacementTime * maxDisplacementTime)
    dispY = - (currentY / maxPhysicalS) * maxTravel
    dispY = Math.min(Math.max(dispY, -maxTravel), maxTravel)
  }

  const elevatorY = elevatorStartY + dispY

  const centerX = animWidth / 2
  const floorY = elevatorY + elevatorHeight - LAYOUT.floorThickness

  const scaleWidth = elevatorWidth * LAYOUT.scaleWidthRatio
  const scaleHeight = Math.min(LAYOUT.scaleMaxHeight, elevatorHeight * LAYOUT.scaleHeightRatio)
  const scaleX = centerX - scaleWidth / 2
  const scaleY = floorY - scaleHeight

  const dialCx = centerX
  const dialCy = scaleY + scaleHeight / 2 + 1.5
  const dialR = Math.min(LAYOUT.dialMaxRadius, scaleHeight * LAYOUT.dialRadiusRatio)

  const objWidth = scaleWidth * LAYOUT.objWidthRatio
  const objHeight = Math.min(LAYOUT.objMaxHeight, elevatorHeight * LAYOUT.objHeightRatio)
  const objX = centerX - objWidth / 2
  const objectBaseY = scaleY

  let floatOffset = 0
  const isWeightless = actualA <= -g + 0.1

  if (isWeightless) {
    if (advancedMode === 1) {
      if (modelIdx === 1) {
        if (effectiveTime > 1.5) {
          const tFloat = Math.min(2.5, effectiveTime - 1.5)
          const baseFloat = (elevatorHeight * 0.25) * (1 - Math.exp(-tFloat * 2))
          const waveFloat = (elevatorHeight * 0.06) * Math.sin(tFloat * 3)
          floatOffset = baseFloat + waveFloat
        }
      }
    } else {
      if (isMoving) {
        if (Math.abs(a + g) < 0.1) {
          const baseFloat = (elevatorHeight * 0.25) * (1 - Math.exp(-effectiveTime * 2))
          const waveFloat = (elevatorHeight * 0.06) * Math.sin(effectiveTime * 3)
          floatOffset = baseFloat + waveFloat
        } else if (a < -g) {
          const relA = Math.abs(a) - g
          const disp = 0.5 * relA * effectiveTime * effectiveTime
          const maxFloatLimit = elevatorHeight - scaleHeight - objHeight - LAYOUT.ceilingPadding
          floatOffset = Math.min(maxFloatLimit, disp * 25)
        }
      }
    }
  } else {
    if (advancedMode === 1 && modelIdx === 1 && effectiveTime >= 4.0) {
      const peakFloat = (elevatorHeight * 0.25) + (elevatorHeight * 0.06) * Math.sin(7.5)
      floatOffset = Math.max(0, peakFloat * Math.exp(-(effectiveTime - 4.0) * 12))
    }
  }

  const objY = objectBaseY - objHeight - floatOffset
  const objCx = centerX
  const objCy = objY + objHeight / 2

  const weight = m * g
  const pointerAngle = Math.min(Math.max(((currentN - weight) / weight) * LAYOUT.pointerMaxAngle, -LAYOUT.pointerMaxAngle), LAYOUT.pointerMaxAngle)

  const aMin = -12
  const aMax = 12
  const nMin = 0
  const nMax = m * 22

  const margin = { left: 45, right: 15, top: vp.visibleH < 320 ? 25 : 40, bottom: vp.visibleH < 320 ? 25 : 40 }
  const plotW = Math.max(10, chartWidth - margin.left - margin.right)
  const plotH = Math.max(10, vp.visibleH - margin.top - margin.bottom)

  const toChartX = (valA: number) => chartX + margin.left + ((valA - aMin) / (aMax - aMin)) * plotW
  const toChartY = (valN: number) => margin.top + plotH - ((valN - nMin) / (nMax - nMin)) * plotH

  return {
    isWide, chartWidth, chartX,
    currentA, actualA, currentV, currentN, weight,
    shaftTop, shaftBottom,
    elevatorWidth, elevatorHeight, elevatorY, centerX, floorY,
    scaleWidth, scaleHeight, scaleX, scaleY,
    dialCx, dialCy, dialR,
    objWidth, objHeight, objX, objY, objCx, objCy,
    pointerAngle,
    aMin, aMax, nMin, nMax,
    margin, plotW, plotH, toChartX, toChartY,
    fs: LAYOUT.fs, sfs: LAYOUT.sfs
  }
}
