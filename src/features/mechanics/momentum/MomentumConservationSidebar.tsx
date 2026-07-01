import { SegmentedControl, Slider, LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function MomentumConservationSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0
  const collisionType = params.collisionType ?? 0
  const e_coefficient = params.e_coefficient ?? 0.5

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
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
      {advancedMode === 0 && (
        <>
          <SegmentedControl
            label="碰撞类型"
            options={[
              { label: '弹性', value: 0 },
              { label: '完全非弹性', value: 1 },
              { label: '恢复系数可调', value: 2 },
            ]}
            value={collisionType}
            onChange={(v) => {
              updateParam('collisionType', v as number)
              animationActions.resetAnimation()
            }}
            disabled={disabled}
          />
          {collisionType === 2 && (
            <Slider
              label="恢复系数 e"
              value={e_coefficient}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => {
                updateParam('e_coefficient', v)
                animationActions.resetAnimation()
              }}
              disabled={disabled}
            />
          )}
        </>
      )}
    </LeftPanelSection>
  )
}
