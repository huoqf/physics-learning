import { SegmentedControl, ToggleSwitch } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function OhmLawSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const showChart = params.showChart ?? 1
  const isBulb = mode === 1

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200 space-y-4">
      {/* 模式选择 */}
      <SegmentedControl
        label="观察模式"
        options={[
          { label: '基础：定值电阻', value: 0 },
          { label: '进阶：小灯泡伏安特性', value: 1 },
        ]}
        value={mode}
        onChange={(v) => {
          updateParam('mode', v as number)
          // 切换模式时，如果触发了动作，可以重置动画或清空打点（打点历史由图表组件自己监听并重置）
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />

      {/* 电源电压 U 控制 */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-neutral-600 font-medium">电源电压 U</span>
          <span className="font-mono text-primary-600 font-bold">
            {(params.U ?? 2).toFixed(1)} V
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={params.U ?? 2}
          onChange={(e) => updateParam('U', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
        />
        <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
          <span>0 V</span>
          <span>5 V</span>
          <span>10 V</span>
        </div>
      </div>

      {/* 定值电阻 R 控制（仅基础模式激活） */}
      {!isBulb && (
        <div className="animate-fade-in">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-neutral-600 font-medium">定值电阻 R</span>
            <span className="font-mono text-primary-600 font-bold">
              {(params.R ?? 10).toFixed(0)} Ω
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={params.R ?? 10}
            onChange={(e) => updateParam('R', parseInt(e.target.value, 10))}
            disabled={disabled}
            className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
            <span>5 Ω</span>
            <span>25 Ω</span>
            <span>50 Ω</span>
          </div>
        </div>
      )}

      {/* 图表显示控制 */}
      <div className="pt-2">
        <ToggleSwitch
          label="显示 U-I 实时图表"
          checked={showChart === 1}
          onChange={(checked) => updateParam('showChart', checked ? 1 : 0)}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
