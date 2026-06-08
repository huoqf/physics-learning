import { SegmentedControl, ToggleSwitch } from '@/components/UI'
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
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-600">空气阻力 k</span>
              <span className="font-mono text-neutral-700">{(params.airResistance ?? 0).toFixed(2)} kg/m</span>
            </div>
            <input
              type="range" min={0} max={0.2} step={0.01}
              value={params.airResistance ?? 0}
              onChange={(e) => updateParam('airResistance', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
            />
          </div>

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
