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
  const bFieldDir = params.bFieldDir ?? 0

  const handleBFieldDirChange = (value: number | string) => {
    updateParam('bFieldDir', value as number)
    animationActions.resetAnimation()
  }

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
            💡 调节 <strong>电流 I</strong>、<strong>磁感应强度 B</strong> 或 <strong>夹角 θ_IB</strong>。公式 $F = BIL\sin\theta$ 表明，只有垂直于电流的磁场分量产生安培力。
          </TipCard>
        </div>
      ) : (
        // ─── 进阶模式控制 ───
        <div className="flex flex-col gap-3">
          <SegmentedControl
            label="磁场方向"
            options={[
              { value: 0, label: '竖直' },
              { value: 1, label: '垂直斜面' },
              { value: 2, label: '水平' },
            ]}
            value={bFieldDir}
            onChange={handleBFieldDirChange}
            disabled={disabled}
          />
          <ToggleSwitch
            label="显示受力正交分解"
            checked={showForceComponents}
            onChange={(checked) => updateParam('showForceComponents', checked ? 1 : 0)}
            disabled={disabled}
          />
          <TipCard>
            💡 调节 <strong>磁场方向</strong>、<strong>倾角 θ</strong> 或 <strong>摩擦因数 μ</strong>，分析通电导体棒的动态平衡。系统将自动算出静止电流区间 {"$[I_{min}, I_{max}]$"}。
          </TipCard>
        </div>
      )}
    </div>
  )
}
