import type { SidebarExtraProps } from '@/data/types'
import { Slider, LeftPanelSection } from '@/components/UI'

export default function GasLawsSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const T = params.T ?? 300
  const V = params.V ?? 5e-3

  const handleSliderChange = (value: number) => {
    if (mode === 0) {
      updateParam('V', value)
    } else {
      updateParam('T', value)
    }
  }

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      {mode === 0 ? (
        <Slider
          label="体积 V"
          value={V}
          min={1e-4}
          max={1e-2}
          step={1e-4}
          unit="m³"
          onChange={handleSliderChange}
          disabled={disabled}
          formatValue={(v) => (v * 1000).toFixed(1)}
        />
      ) : (
        <Slider
          label="温度 T"
          value={T}
          min={200}
          max={600}
          step={1}
          unit="K"
          onChange={handleSliderChange}
          disabled={disabled}
        />
      )}
    </LeftPanelSection>
  )
}
