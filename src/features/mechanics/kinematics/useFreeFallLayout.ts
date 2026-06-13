/**
 * src/features/mechanics/kinematics/useFreeFallLayout.ts
 * 自由落体动画布局计算 Hook
 */
import { useCallback } from 'react'
import { FREE_FALL_LAYOUT } from './freeFallConfig'

export function useFreeFallLayout(canvasSize: { width: number; height: number }) {
  const L = FREE_FALL_LAYOUT

  // ── 分区 ──
  const stageWidth = canvasSize.width * L.stageRatio
  const gapWidth   = canvasSize.width * L.gapRatio
  const dataX      = stageWidth + gapWidth
  const dataWidth  = canvasSize.width - dataX

  // ── 牛顿管 ──
  const tubePadX  = stageWidth * L.tube.paddingXRatio
  const tubeLeft  = tubePadX
  const tubeRight = stageWidth - tubePadX
  const tubeWidth = tubeRight - tubeLeft
  const tubeTop    = canvasSize.height * L.tube.topRatio
  const tubeBottom = canvasSize.height * L.tube.bottomRatio
  const tubeHeight = tubeBottom - tubeTop

  // ── 物理舞台 ──
  const originY    = tubeTop + L.tube.originOffset
  const groundY    = tubeBottom - L.tube.groundOffset
  const stageHeight = groundY - originY

  // ── 物体 X ──
  const ballX    = tubeLeft + tubeWidth * L.ball.ballXRatio
  const featherX = tubeLeft + tubeWidth * L.ball.featherXRatio

  // ── v-t 图布局 ──
  const vtChartTop    = canvasSize.height * L.chart.vtChartTopRatio
  const vtChartHeight = canvasSize.height * L.chart.vtChartHeightRatio
  const vtInnerPad    = { left: 50, right: 40, top: 35, bottom: 40 } as const
  const vtInnerW      = dataWidth - vtInnerPad.left - vtInnerPad.right
  const vtInnerH      = vtChartHeight - vtInnerPad.top - vtInnerPad.bottom

  // ── 坐标变换 ──
  const vtToX = useCallback(
    (t: number, xMax: number, innerW: number) =>
      vtInnerPad.left + (t / xMax) * innerW,
    [vtInnerPad.left]
  )

  const vtToY = useCallback(
    (v: number, vtVMax: number, innerH: number) => {
      const clampedV = Math.max(0, Math.min(v, vtVMax))
      return vtInnerPad.top + innerH - (clampedV / vtVMax) * innerH
    },
    [vtInnerPad.top]
  )

  return {
    stageWidth, dataX, dataWidth,
    tubeLeft, tubeRight, tubeWidth,
    tubeTop, tubeBottom, tubeHeight,
    originY, groundY, stageHeight,
    ballX, featherX,
    vtChartTop, vtChartHeight,
    vtInnerPad, vtInnerW, vtInnerH,
    vtToX, vtToY,
  }
}
