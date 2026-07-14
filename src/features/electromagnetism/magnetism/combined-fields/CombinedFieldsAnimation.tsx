import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useCombinedFieldsPhysics } from './hooks/useCombinedFieldsPhysics'
import { useFieldGridPoints } from './hooks/useFieldGridPoints'
import { SpectrometerScene } from './components/SpectrometerScene'
import { CyclotronScene } from './components/CyclotronScene'
import { DeflectScene } from './components/DeflectScene'

export default function CombinedFieldsAnimation() {
  const { showVectors, time } = useAnimationStore(
    useShallow((s) => ({
      showVectors: s.showVectors,
      time: s.time,
    })),
  )

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize
  const smallFs = font(11)

  const physics = useCombinedFieldsPhysics()
  const { b1Points, b2DotPoints, b2CrossPoints, cyclotronBFieldPoints } = useFieldGridPoints()

  const {
    activeStage,
    E, B1, B2, U,
    showAngles,
    p, omegaAC,
    spectrometer, cyclotron, deflect,
    sim, timeSec, pos,
    visibleTrajectory, predictedPoints, tailPoints, historyPoints,
  } = physics

  // ───────────── 场景渲染 ─────────────

  // 1. 模式 0：质谱仪
  const spectrometerScene = (
    <SpectrometerScene
      pos={pos}
      spectrometer={spectrometer}
      p={p}
      E={E}
      B1={B1}
      B2={B2}
      showVectors={showVectors}
      time={time}
      visibleTrajectory={visibleTrajectory}
      predictedPoints={predictedPoints}
      tailPoints={tailPoints}
      historyPoints={historyPoints}
      b1Points={b1Points}
      b2DotPoints={b2DotPoints}
      font={font}
      smallFs={smallFs}
    />
  )

  // 2. 模式 1：回旋加速器
  const cyclotronScene = (
    <CyclotronScene
      pos={pos}
      cyclotron={cyclotron}
      p={p}
      omegaAC={omegaAC}
      U={U}
      timeSec={timeSec}
      visibleTrajectory={visibleTrajectory}
      predictedPoints={predictedPoints}
      tailPoints={tailPoints}
      historyPoints={historyPoints}
      cyclotronBFieldPoints={cyclotronBFieldPoints}
      font={font}
    />
  )

  // 3. 模式 2：电偏转 + 磁偏转级联
  const deflectScene = (
    <DeflectScene
      pos={pos}
      deflect={deflect}
      p={p}
      E={E}
      B2={B2}
      showVectors={showVectors}
      showAngles={showAngles}
      time={time}
      timeSec={timeSec}
      visibleTrajectory={visibleTrajectory}
      predictedPoints={predictedPoints}
      tailPoints={tailPoints}
      historyPoints={historyPoints}
      b2CrossPoints={b2CrossPoints}
      sim={sim}
      font={font}
      smallFs={smallFs}
    />
  )

  // 根据当前 mode 激活相应场景
  const activeScene = activeStage === 0
    ? spectrometerScene
    : activeStage === 1
      ? cyclotronScene
      : deflectScene

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      className="bg-white"
    >
      {activeScene}
    </AnimationSvgCanvas>
  )
}
