import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, ToggleSwitch } from '@/components/UI'

export default function IntermolecularForcesSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const autoRelease = params.autoRelease ?? 0

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      <ToggleSwitch
        label="自动释放动画"
        checked={autoRelease === 1}
        onChange={(v) => updateParam('autoRelease', v ? 1 : 0)}
        disabled={disabled}
      />

      {autoRelease === 1 && (
        <div className="mt-2 alert-card-warning">
          <p className="font-semibold">
            自动释放模式
          </p>
          <p className="text-ui-md opacity-90 mt-1">
            分子将根据当前合力自主加速运动
          </p>
        </div>
      )}

      <SegmentedControl
        label="演示模式"
        options={[
          { value: 0, label: '基础：力的合成分解' },
          { value: 1, label: '进阶：力与势能关联' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />

      {mode === 1 && (
        <div className="mt-2 alert-card-info">
          <p className="font-semibold">
            进阶模式：力与势能关联
          </p>
          <p className="text-ui-md opacity-90 mt-1">
            右侧图表切换为 E_p-r 曲线，观察势阱
          </p>
        </div>
      )}
    </div>
  )
}
