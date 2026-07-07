import { useAnimationStore } from '@/stores'
import { usePhotoelectricSimulation } from './hooks/usePhotoelectricSimulation'
import { computePhotoelectricDerived } from './model/photoelectricViewModel'
import PhototubeCanvas from './components/PhototubeCanvas'
import IUCurveChart from './components/IUCurveChart'

export default function PhotoelectricAnimation() {
  const params = useAnimationStore((s) => s.params)

  const frequency = params.frequency ?? 6.0
  const intensity = params.intensity ?? 50
  const voltage = params.voltage ?? 0
  const mode = params.mode ?? 0
  const showPhotonModel = params.showPhotonModel ?? 0

  const derived = computePhotoelectricDerived({
    frequency,
    intensity,
    voltage,
    mode,
    showPhotonModel,
  })

  // Canvas 尺寸 (使用 full preset，中屏独占)
  const canvasWidth = 700
  const canvasHeight = 650

  const sim = usePhotoelectricSimulation(
    { frequency, intensity, voltage, mode, showPhotonModel },
    canvasWidth,
    canvasHeight,
  )

  return (
    <div className="flex-1 w-full min-h-0 flex flex-col gap-2 p-2 bg-neutral-50 rounded-xl overflow-hidden">
      {/* Canvas 动画区 */}
      <div className="flex-[2.8] min-h-0 relative">
        <PhototubeCanvas
          photoelectrons={sim.getPhotoelectrons()}
          photonParticles={sim.getPhotonParticles()}
          beamColor={derived.beamColor}
          isPE={derived.isPE}
          I={derived.I}
          voltage={voltage}
          mode={mode}
          showPhotonModel={showPhotonModel}
          frequency={frequency}
        />
      </div>

      {/* I-U 伏安特性曲线（通关模式显示） */}
      {mode === 1 && (
        <div className="flex-[1.2] min-h-0 w-full bg-white rounded-lg border border-neutral-100 p-2 overflow-hidden shrink-0">
          <IUCurveChart
            Uc={derived.Uc}
            Imax={derived.Imax}
            currentVoltage={voltage}
            isPE={derived.isPE}
          />
        </div>
      )}
    </div>
  )
}
