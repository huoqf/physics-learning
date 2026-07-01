import { SegmentedControl, OptionButton, LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function WeightlessnessSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {

  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1
  const modelIdx = params.modelIdx ?? 0

  // ── 模式切换 ──
  const handleModeChange = (value: number | string) => {
    updateParam('advancedMode', value as number)
    animationActions.resetAnimation()
  }

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      {/* 观察模式切换 */}
      <SegmentedControl
        label="观察模式"
        options={[
          { label: '基础', value: 0 },
          { label: '进阶', value: 1 },
        ]}
        value={advancedMode}
        onChange={handleModeChange}
        disabled={disabled}
      />

      {/* 进阶版：电梯运行情景 */}
      {isAdvanced && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-neutral-600">电梯运行情景</p>
          <div className="flex flex-col gap-2">
            <OptionButton
              label="升降变速电梯 (启动-匀速-制动)"
              selected={modelIdx === 0}
              disabled={disabled}
              onClick={() => {
                updateParam('modelIdx', 0)
                animationActions.resetAnimation()
              }}
            />
            <OptionButton
              label="钢索突然断裂 (静止-坠落-缓冲)"
              selected={modelIdx === 1}
              disabled={disabled}
              onClick={() => {
                updateParam('modelIdx', 1)
                animationActions.resetAnimation()
              }}
            />
          </div>
        </div>
      )}
    </LeftPanelSection>
  )
}
