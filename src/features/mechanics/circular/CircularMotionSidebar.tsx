import { SegmentedControl, ToggleSwitch, LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function CircularMotionSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  return (
    <LeftPanelSection>
      <SegmentedControl
        label="观察模式"
        options={[
          { label: '基础', value: 0 },
          { label: '进阶', value: 1 },
        ]}
        value={advancedMode}
        onChange={(v) => {
          updateParam('advancedMode', v as number)
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />

      {isAdvanced && (
        <div className="mt-3 space-y-3">
          {/* SHM Projection Switch */}
          <ToggleSwitch
            label="简谐运动投影对比"
            checked={(params.showProjection ?? 1) === 1}
            onChange={(checked) => updateParam('showProjection', checked ? 1 : 0)}
            disabled={disabled}
          />

          {/* Show Waveform Switch */}
          <ToggleSwitch
            label="显示联动波形图"
            checked={(params.showWaveform ?? 1) === 1}
            onChange={(checked) => updateParam('showWaveform', checked ? 1 : 0)}
            disabled={disabled}
          />
        </div>
      )}
    </LeftPanelSection>
  )
}
