import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, ToggleSwitch, TipCard } from '@/components/UI'

export default function AmpereForceSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const showLeftHand = params.showLeftHand !== 0
  const showForceComponents = params.showForceComponents !== 0

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      {/* 演示模式 */}
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
        // ─── 基础模式控制 ───
        <div className="flex flex-col gap-3">
          <ToggleSwitch
            label="显示左手定则"
            checked={showLeftHand}
            onChange={(checked) => updateParam('showLeftHand', checked ? 1 : 0)}
            disabled={disabled}
          />
          <TipCard>
            💡 调节 <strong>电流 I</strong> 或 <strong>磁感应强度 B</strong>，改变安培力的大小与方向。利用左手定则（大拇指指受力，四指指电流，磁感线穿手心）判定直交受力。
          </TipCard>
        </div>
      ) : (
        // ─── 进阶模式控制 ───
        <div className="flex flex-col gap-3">
          <ToggleSwitch
            label="显示受力正交分解"
            checked={showForceComponents}
            onChange={(checked) => updateParam('showForceComponents', checked ? 1 : 0)}
            disabled={disabled}
          />
          <TipCard>
            💡 调节 <strong>倾角 θ</strong> 或 <strong>摩擦因数 μ</strong>，分析斜面上通电导体棒的动态平衡。安培力为水平方向，摩擦力会根据导体棒下滑/上滑趋势自适应改变。
          </TipCard>
        </div>
      )}
    </div>
  )
}
