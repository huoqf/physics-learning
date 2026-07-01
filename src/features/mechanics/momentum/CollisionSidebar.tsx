import { SegmentedControl, LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function CollisionSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0

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

      {!advancedMode && (
        <div className="mt-3 space-y-3">
          <SegmentedControl
            label="碰撞类型"
            options={[
              { label: '完全弹性', value: 1 },
              { label: '完全非弹性', value: 0 },
            ]}
            value={params.isElastic ?? 1}
            onChange={(v) => {
              updateParam('isElastic', v as number)
              animationActions.resetAnimation()
            }}
            disabled={disabled}
          />
        </div>
      )}
    </LeftPanelSection>
  )
}
