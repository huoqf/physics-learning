import { SegmentedControl, ToggleSwitch } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

export default function ClosedCircuitSidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const mode = params.mode ?? 1
  const EMF = params.EMF ?? 6
  const r = params.r ?? 2
  const R = params.R ?? 10
  const highlightLoss = (params.highlightLoss ?? 0) === 1

  return (
    <div className="space-y-5">
      {/* 模式选择 */}
      <SegmentedControl
        label="观察模式"
        options={[
          { label: '基础：U - I 关系', value: 0 },
          { label: '进阶：输出功率与效率', value: 1 },
        ]}
        value={mode}
        onChange={(v) => {
          updateParam('mode', v as number)
          // 切换模式时可以重置动画状态以确保良好体验
          animationActions.resetAnimation()
        }}
        disabled={disabled}
      />

      {/* 参数调节区 */}
      <div className="bg-neutral-50/50 p-3 rounded-xl border border-neutral-200/60 space-y-4">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
          电路参数调节
        </h3>

        {/* 1. 外电阻 R 控制 */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-neutral-600 font-medium">外电阻 R (滑动变阻器)</span>
            <span className="font-mono text-primary-600 font-bold">
              {R.toFixed(1)} Ω
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={20}
            step={0.1}
            value={R}
            onChange={(e) => updateParam('R', parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600 focus:outline-none"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5 font-mono">
            <span>0.1 Ω</span>
            <span>10.0 Ω</span>
            <span>20.0 Ω</span>
          </div>
        </div>

        {/* 2. 内电阻 r 控制 */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-neutral-600 font-medium">电源内阻 r</span>
            <span className="font-mono text-primary-600 font-bold">
              {r.toFixed(1)} Ω
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={0.1}
            value={r}
            onChange={(e) => updateParam('r', parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600 focus:outline-none"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5 font-mono">
            <span>1.0 Ω</span>
            <span>3.0 Ω</span>
            <span>5.0 Ω</span>
          </div>
        </div>

        {/* 只读参数: 电动势 E */}
        <div className="pt-2 border-t border-neutral-100 flex justify-between items-center text-xs">
          <span className="text-neutral-500">电源恒定电动势 E</span>
          <span className="font-mono font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
            {EMF.toFixed(1)} V
          </span>
        </div>
      </div>

      {/* 显示辅助开关 */}
      <div className="bg-neutral-50/50 p-3 rounded-xl border border-neutral-200/60">
        <ToggleSwitch
          label="内能损耗视觉高亮"
          checked={highlightLoss}
          onChange={(checked) => updateParam('highlightLoss', checked ? 1 : 0)}
          disabled={disabled}
        />
        <p className="text-[10px] text-neutral-400 mt-1.5 leading-relaxed">
          激活后，电流增大时电源内部（内阻 r 区域）红光渐变加深，隐喻内阻产生的焦耳热能损耗。
        </p>
      </div>
    </div>
  )
}
