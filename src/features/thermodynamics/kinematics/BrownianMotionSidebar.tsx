import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, ToggleSwitch } from '@/components/UI'

export default function BrownianMotionSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const showTrajectory = params.showTrajectory ?? 1
  const showMolecules = params.showMolecules ?? 1

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      <ToggleSwitch
        label="显示追踪轨迹"
        checked={showTrajectory === 1}
        onChange={(v) => updateParam('showTrajectory', v ? 1 : 0)}
        disabled={disabled}
      />

      {mode === 1 && (
        <ToggleSwitch
          label="显示微观分子"
          checked={showMolecules === 1}
          onChange={(v) => updateParam('showMolecules', v ? 1 : 0)}
          disabled={disabled}
        />
      )}

      <SegmentedControl
        label="演示模式"
        options={[
          { value: 0, label: '基础：宏观布朗运动' },
          { value: 1, label: '进阶：微观碰撞机制' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />

      {mode === 1 && (
        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700 font-medium">
            进阶模式展示微观碰撞机制
          </p>
          <p className="text-xs text-amber-600 mt-1">
            蓝色小球为液体分子，橙色箭头为瞬时合力
          </p>
        </div>
      )}
    </div>
  )
}
