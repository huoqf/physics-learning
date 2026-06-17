import { SegmentedControl, ToggleSwitch, Slider } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function ObliqueThrowSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200">
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
          {/* Air Resistance */}
          <Slider
            label="空气阻力 k"
            value={params.airResistance ?? 0}
            min={0}
            max={0.2}
            step={0.01}
            unit="kg/m"
            onChange={(v) => updateParam('airResistance', v)}
            disabled={disabled}
          />

          {/* Vacuum Compare Switch */}
          {(params.airResistance ?? 0) > 0 && (
            <ToggleSwitch
              label="对比真空参考轨道"
              checked={(params.showVacuumCompare ?? 1) === 1}
              onChange={(checked) => updateParam('showVacuumCompare', checked ? 1 : 0)}
              disabled={disabled}
            />
          )}
        </div>
      )}
    </div>
  )
}
