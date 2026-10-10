import { useState } from 'react'
import { useAnimationStore } from '@/stores'
import { DEFAULT_WORK_FUNCTION } from '@/physics/photoelectric'
import { usePhotoelectricSimulation } from './hooks/usePhotoelectricSimulation'
import { computePhotoelectricDerived } from './model/photoelectricViewModel'
import PhototubeCanvas from './components/PhototubeCanvas'
import IUCurveChart from './components/IUCurveChart'
import EkNuCurveChart from './components/EkNuCurveChart'
import { ComptonScatteringScene } from './components/ComptonScatteringScene'

export default function PhotoelectricAnimation() {
  const params = useAnimationStore((s) => s.params)
  const [activeChartTab, setActiveChartTab] = useState<'iu' | 'eknu'>('iu')

  const frequency = params.frequency ?? 6.0
  const intensity = params.intensity ?? 50
  const voltage = params.voltage ?? 0
  const mode = params.mode ?? 0
  const showPhotonModel = params.showPhotonModel ?? 0
  const theta = params.theta ?? 60
  const workFunction = params.workFunction ?? DEFAULT_WORK_FUNCTION

  const derived = computePhotoelectricDerived({
    frequency,
    intensity,
    voltage,
    mode,
    showPhotonModel,
    theta,
    workFunction,
  })

  // Canvas 尺寸 (使用 full preset，中屏独占)
  const canvasWidth = 700
  const canvasHeight = 650

  // workFunction 必须一并传给仿真：否则中屏光电子的初动能会按默认逸出功计算，
  // 与右屏物理量、Ekm-ν 图表所用金属脱节（换金属时画面不变）。
  const sim = usePhotoelectricSimulation(
    { frequency, intensity, voltage, mode, showPhotonModel, workFunction },
    canvasWidth,
    canvasHeight,
  )

  if (mode === 2) {
    return (
      <div className="flex-1 w-full min-h-0 flex flex-col p-2 bg-neutral-50 rounded-xl overflow-hidden">
        <ComptonScatteringScene derived={derived} />
      </div>
    )
  }

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

      {/* 高考双图像体系（通关模式显示） */}
      {mode === 1 && (
        <div className="flex-[1.4] min-h-0 w-full bg-white rounded-lg border border-neutral-100 p-2 overflow-hidden shrink-0 flex flex-col">
          <div className="flex items-center gap-2 mb-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveChartTab('iu')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                activeChartTab === 'iu'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              I-U 伏安特性曲线 (饱和电流与遏止电压)
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('eknu')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                activeChartTab === 'eknu'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              Ekm-ν 关系直线 (普朗克斜率 h 与截止频率)
            </button>
          </div>
          <div className="flex-1 min-h-0 w-full">
            {activeChartTab === 'iu' ? (
              <IUCurveChart
                Uc={derived.Uc}
                Imax={derived.Imax}
                currentVoltage={voltage}
                isPE={derived.isPE}
              />
            ) : (
              <EkNuCurveChart
                cutoffFreq={derived.cutoffFreq}
                currentFreq={frequency}
                currentEkm={derived.Ekm}
                W0={derived.W0}
                isPE={derived.isPE}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

