import { SegmentedControl, ToggleSwitch } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function MomentumSidebar({
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
          <ToggleSwitch
            label="显示 Ek-p 关系图"
            checked={(params.showEkChart ?? 1) === 1}
            onChange={(checked) => updateParam('showEkChart', checked ? 1 : 0)}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
