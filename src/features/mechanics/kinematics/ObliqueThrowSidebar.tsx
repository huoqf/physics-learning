import { SegmentedControl, ToggleSwitch, Slider, OptionButton } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

const GRAVITY_PRESETS = [
  { label: '🌍 地球', g: 9.8 },
  { label: '🌙 月球', g: 1.63 },
  { label: '🔴 火星', g: 3.72 },
  { label: '🪐 木星', g: 24.79 },
] as const

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

      {/* 星球重力场预设 */}
      <div className="mt-4 pt-3 border-t border-neutral-200">
        <p className="text-xs font-semibold text-neutral-600 mb-2">环境重力场</p>
        <div className="flex gap-2 flex-wrap">
          {GRAVITY_PRESETS.map((preset) => (
            <OptionButton
              key={preset.g}
              label={preset.label}
              selected={params.g === preset.g}
              disabled={disabled}
              onClick={() => updateParam('g', preset.g)}
            />
          ))}
        </div>
      </div>

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
              checked={(params.showVacuumCompare ?? 1) === 1}
              onChange={(checked) => updateParam('showVacuumCompare', checked ? 1 : 0)}
              label="对比真空参考轨道"
              disabled={disabled}
            />
          )}
        </div>
      )}
    </div>
  )
}
