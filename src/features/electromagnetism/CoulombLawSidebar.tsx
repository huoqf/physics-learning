import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl } from '@/components/UI'

export default function CoulombLawSidebar({ params, updateParam, animationActions, disabled }: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const showForceAnalysis = (params.showForceAnalysis ?? 0) === 1

  const handleModeChange = (value: number | string) => {
    updateParam('mode', value as number)
    animationActions.resetAnimation()
  }

  const handleForceAnalysisToggle = () => {
    updateParam('showForceAnalysis', showForceAnalysis ? 0 : 1)
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      <SegmentedControl
        label="演示模式"
        options={[
          { value: 0, label: '基础' },
          { value: 1, label: '双球悬挂' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />

      {mode === 1 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-neutral-500">受力分析</label>
          <button
            onClick={handleForceAnalysisToggle}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all active:scale-[0.97] ${
              showForceAnalysis
                ? 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
                : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {showForceAnalysis ? '✓ 受力分析 开启' : '受力分析 关闭'}
          </button>
          <p className="text-xs text-neutral-400 mt-1">
            开启后显示隔离法受力分解图（重力 mg、绳拉力 T、库仑力 F）
          </p>
        </div>
      )}
    </div>
  )
}
