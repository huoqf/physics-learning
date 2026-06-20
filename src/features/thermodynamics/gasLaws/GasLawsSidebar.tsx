import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, TipCard } from '@/components/UI'
import { Slider } from '@/components/UI'

export default function GasLawsSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const T = params.T ?? 300
  const V = params.V ?? 5e-3

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  const handleSliderChange = (value: number) => {
    if (mode === 0) {
      updateParam('V', value)
    } else {
      updateParam('T', value)
    }
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      {/* 参数控制在上 */}
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

      {/* 模式切换在下 */}
      <SegmentedControl
        label="实验定律"
        options={[
          { value: 0, label: '等温（玻意耳）' },
          { value: 1, label: '等压（盖-吕萨克）' },
          { value: 2, label: '等容（查理）' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />

      {/* 提示信息 */}
      <TipCard>
        {mode === 0 && '锁定温度 T，拖动体积 V，观察压强 P 变化'}
        {mode === 1 && '锁定压强 P（恒定砝码），拖动温度 T，观察体积 V 变化'}
        {mode === 2 && '锁定体积 V（固定活塞），拖动温度 T，观察压强 P 变化'}
      </TipCard>
    </div>
  )
}
