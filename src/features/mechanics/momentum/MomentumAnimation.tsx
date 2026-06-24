import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  calculateMomentumScalar,
  calculateMomentum1D,
  calculateTotalMomentum,
  calculateCenterOfMass,
  kineticEnergyFromMomentum,
  generateMomentumEnergyCurve,
  elasticCollision1D,
} from '@/physics/momentum'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'
import { MomentumScene } from './MomentumScene'

/** 动量动画参数范围 */
const MOMENTUM_PARAM_BOUNDS = {
  mMin: 1, mMax: 10,
  vMin: -10, vMax: 10,
} as const

/** 动量动画布局常量 */
export const MOMENTUM_LAYOUT = {
  steelBallBaseRadius: 14,
  massRadiusScale: 1.8,
  canvasPadding: 60,
  vectorMaxLength: 90,
  momentumBarMaxHeight: 80,
  momentumBarWidth: 30,
  directionScaleLen: 40,
  ekCardMinWidth: 220,
  ekCardMinHeight: 150,
  ekCardRightOffset: 20,
  ekCardPadding: { left: 40, right: 15, top: 25, bottom: 25 },
  groundOffset: 80,
  ballAboveGround: 40,
  momentumAxisY: 45,
  totalMomentumAxisY: 60,
  velocityScale: 25,
  cyclePeriod: 6,
} as const

export default function MomentumAnimation() {
  const { params, time, showVectors } = useAnimationStore(
    useShallow((s) => ({ params: s.params, time: s.time, showVectors: s.showVectors }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.tall)
  const vp = useViewport(canvasSize, { designWidth: 700, designHeight: 450 })

  const { m = 3, v = 4, mA = 3, vA = 5, mB = 2, vB = -3, advancedMode = 0, showEkChart = 1 } = params
  const isAdvanced = advancedMode === 1
  const groundY = canvasSize.height - MOMENTUM_LAYOUT.groundOffset
  const ballCenterY = groundY - MOMENTUM_LAYOUT.ballAboveGround

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: { x: vp.visibleX, y: 0, width: vp.visibleW - MOMENTUM_LAYOUT.canvasPadding * 2, height: canvasSize.height - MOMENTUM_LAYOUT.canvasPadding },
    originX: vp.visibleX, originY: groundY,
    worldWidth: vp.visibleW, worldHeight: canvasSize.height,
    refMagnitudes: { velocity: MOMENTUM_PARAM_BOUNDS.vMax, momentum: MOMENTUM_PARAM_BOUNDS.mMax * MOMENTUM_PARAM_BOUNDS.vMax },
  }), [vp.visibleX, vp.visibleW, canvasSize.height, groundY])
  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig])

  // 基础模式
  const p_basic = calculateMomentumScalar(m, v)
  const R_basic = MOMENTUM_LAYOUT.steelBallBaseRadius + m * MOMENTUM_LAYOUT.massRadiusScale
  const basicBallX = vp.visibleX + vp.visibleW * 0.35

  // 进阶模式
  const R_A = MOMENTUM_LAYOUT.steelBallBaseRadius + mA * MOMENTUM_LAYOUT.massRadiusScale
  const R_B = MOMENTUM_LAYOUT.steelBallBaseRadius + mB * MOMENTUM_LAYOUT.massRadiusScale
  const leftBound = vp.visibleX + MOMENTUM_LAYOUT.canvasPadding + R_A
  const rightBound = vp.visibleX + vp.visibleW - MOMENTUM_LAYOUT.canvasPadding - R_B
  const initPosAx = vp.visibleX + vp.visibleW * 0.25
  const initPosBx = vp.visibleX + vp.visibleW * 0.75

  const { collisionTime, posAx, posBx, currentVA, currentVB } = useMemo(() => {
    const scale = MOMENTUM_LAYOUT.velocityScale
    const relVA = vA * scale
    const relVB = vB * scale
    const gap = initPosBx - R_B - (initPosAx + R_A)
    const approachSpeed = relVA - relVB
    let tCollision = Infinity
    let vAf = vA, vBf = vB
    if (approachSpeed > 0 && gap > 0) {
      tCollision = gap / approachSpeed
      const [va, vb] = elasticCollision1D(mA, vA, mB, vB)
      vAf = va; vBf = vb
    }
    const t = time
    let curVA = vA, curVB = vB, curPosAx: number, curPosBx: number
    if (t < tCollision) {
      curPosAx = initPosAx + vA * t * scale
      curPosBx = initPosBx + vB * t * scale
    } else {
      const dt = t - tCollision
      const colPosAx = initPosAx + vA * tCollision * scale
      const colPosBx = initPosBx + vB * tCollision * scale
      curPosAx = colPosAx + vAf * dt * scale
      curPosBx = colPosBx + vBf * dt * scale
      curVA = vAf; curVB = vBf
    }
    return { collisionTime: tCollision, posAx: curPosAx, posBx: curPosBx, currentVA: curVA, currentVB: curVB }
  }, [time, vA, vB, mA, mB, R_A, R_B, initPosAx, initPosBx])

  const clampedPosAx = Math.max(leftBound, Math.min(rightBound + R_B - R_A, posAx))
  const clampedPosBx = Math.max(leftBound - R_A + R_B, Math.min(rightBound, posBx))

  const pA = calculateMomentum1D(mA, currentVA)
  const pB = calculateMomentum1D(mB, currentVB)
  const pTotal = calculateTotalMomentum(pA, pB)
  const EkA = kineticEnergyFromMomentum(Math.abs(pA), mA)
  const EkB = kineticEnergyFromMomentum(Math.abs(pB), mB)
  const xCm = calculateCenterOfMass(mA, clampedPosAx, mB, clampedPosBx)
  const hasCollided = time >= collisionTime

  // Ek-p 图
  const showEkCard = isAdvanced && showEkChart === 1
  const cardWidth = Math.max(MOMENTUM_LAYOUT.ekCardMinWidth, vp.visibleW * 0.32)
  const cardHeight = Math.max(MOMENTUM_LAYOUT.ekCardMinHeight, canvasSize.height * 0.35)
  const cardX = vp.visibleX + vp.visibleW - cardWidth - MOMENTUM_LAYOUT.ekCardRightOffset
  const cardY = 20

  const ekCurvePointsA = useMemo(() => {
    const fixedP = Math.abs(pA) || 0.1
    return generateMomentumEnergyCurve(fixedP, 0.5, 10, 30).map(d => ({ x: d.m, y: d.Ek }))
  }, [pA])
  const ekCurvePointsB = useMemo(() => {
    const fixedP = Math.abs(pB) || 0.1
    return generateMomentumEnergyCurve(fixedP, 0.5, 10, 30).map(d => ({ x: d.m, y: d.Ek }))
  }, [pB])
  const ekMax = useMemo(() => Math.max(...ekCurvePointsA.map(d => d.y), ...ekCurvePointsB.map(d => d.y), EkA, EkB, 1), [ekCurvePointsA, ekCurvePointsB, EkA, EkB])

  // 矢量映射
  const vMaxRef = MOMENTUM_PARAM_BOUNDS.vMax
  const mapArrowLen = (val: number) => (Math.abs(val) / vMaxRef) * MOMENTUM_LAYOUT.vectorMaxLength
  const mapMomentumBarH = (pVal: number) => (Math.abs(pVal) / (MOMENTUM_PARAM_BOUNDS.mMax * MOMENTUM_PARAM_BOUNDS.vMax)) * MOMENTUM_LAYOUT.momentumBarMaxHeight

  return (
    <div ref={containerRef} className="w-full h-full">
      <MomentumScene
        canvasSize={canvasSize} sceneScale={sceneScale}
        isAdvanced={isAdvanced} showVectors={showVectors}
        m={m} v={v} p_basic={p_basic} R_basic={R_basic} basicBallX={basicBallX}
        ballCenterY={ballCenterY} groundY={groundY}
        mapArrowLen={mapArrowLen} mapMomentumBarH={mapMomentumBarH}
        mA={mA} mB={mB} R_A={R_A} R_B={R_B}
        clampedPosAx={clampedPosAx} clampedPosBx={clampedPosBx}
        currentVA={currentVA} currentVB={currentVB}
        pA={pA} pB={pB} pTotal={pTotal} EkA={EkA} EkB={EkB}
        xCm={xCm} hasCollided={hasCollided} collisionTime={collisionTime} time={time}
        showEkCard={showEkCard} cardWidth={cardWidth} cardHeight={cardHeight}
        cardX={cardX} cardY={cardY}
        ekCurvePointsA={ekCurvePointsA} ekCurvePointsB={ekCurvePointsB} ekMax={ekMax}
      />
    </div>
  )
}
