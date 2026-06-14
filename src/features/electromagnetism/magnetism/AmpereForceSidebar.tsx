import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, ToggleSwitch, TipCard } from '@/components/UI'

export default function AmpereForceSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const showLeftHand = params.showLeftHand === 1
  const showForceComponents = params.showForceComponents === 1

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      <SegmentedControl
        label="演示模式"
        options={[
          { value: 0, label: '基础：直交规律' },
          { value: 1, label: '进阶：斜面平衡' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />

      {mode === 0 ? (
        <div className="flex flex-col gap-3">
          <ToggleSwitch
            label="显示左手定则坐标系"
            checked={showLeftHand}
            onChange={(checked) => updateParam('showLeftHand', checked ? 1 : 0)}
            disabled={disabled}
          />
          <TipCard>
            💡 调节电流 I 或磁感应强度 B，可以改变安培力的大小与方向。开启左手定则坐标轴，能更直观地建立空间直交图景。
          </TipCard>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ToggleSwitch
            label="受力正交分解辅助线"
            checked={showForceComponents}
            onChange={(checked) => updateParam('showForceComponents', checked ? 1 : 0)}
            disabled={disabled}
          />
          <TipCard>
            💡 进阶模式下，调节倾角 θ 或摩擦因数 μ，观察导体棒在斜坡上的平衡状态。右侧的受力矢量多边形会实时展现合力是否为零。
          </TipCard>
        </div>
      )}
    </div>
  )
}
