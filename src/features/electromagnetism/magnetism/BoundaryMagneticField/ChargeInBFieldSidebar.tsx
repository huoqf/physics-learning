import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, ToggleSwitch, TipCard } from '@/components/UI'

export default function ChargeInBFieldSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const showArc = params.showArc === 1
  const showEnvelope = params.showEnvelope === 1

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      {/* 演示模式选择 */}
      <SegmentedControl
        label="演示模式"
        options={[
          { value: 0, label: '基础：匀速圆周运动' },
          { value: 1, label: '进阶：旋转圆极值' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />

      {mode === 0 ? (
        // ─── 基础模式控制 ───
        <div className="flex flex-col gap-4">
          <ToggleSwitch
            label="显示圆心角扇形"
            checked={showArc}
            onChange={(checked) => updateParam('showArc', checked ? 1 : 0)}
            disabled={disabled}
          />
          <TipCard>
            💡 调节速度 v 和磁场强度 B，观察粒子的回旋半径 R 的变化。注意：不论速度多快，只要偏转角度（圆心角）一定，粒子在磁场中的运动时间都是固定的。
          </TipCard>
        </div>
      ) : (
        // ─── 进阶模式控制 ───
        <div className="flex flex-col gap-4">
          <ToggleSwitch
            label="显示包络区与临界边界"
            checked={showEnvelope}
            onChange={(checked) => updateParam('showEnvelope', checked ? 1 : 0)}
            disabled={disabled}
          />

          <TipCard>
            💡 高考压轴常见模型：速度大小不变、射入方向连续变化时，粒子的轨迹将形成一个动态的“旋转圆”。打开“显示包络区”开关可观察到绿色阴影覆盖的危险/安全区域，找寻最大弦长对应的临界切点。
          </TipCard>
        </div>
      )}
    </div>
  )
}
