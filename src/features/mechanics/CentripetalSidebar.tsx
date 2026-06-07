import type { SidebarExtraProps } from '@/data/types'

export default function CentripetalSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  const toggleAdvanced = () => {
    updateParam('advancedMode', isAdvanced ? 0 : 1)
  }

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200">
      <button
        onClick={toggleAdvanced}
        disabled={disabled}
        className={[
          'w-full px-3 py-2 rounded-lg text-sm font-medium transition-all',
          isAdvanced
            ? 'bg-primary-600 text-white shadow-sm'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
          disabled && 'opacity-40 pointer-events-none',
        ].join(' ')}
      >
        {isAdvanced ? '✓ 进阶模式' : '进阶模式'}
      </button>

      {isAdvanced && (
        <div className="mt-3 space-y-3">
          {/* Show Waveform (F-a chart) Switch */}
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-neutral-600">显示 F-a 联动图表</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => updateParam('showWaveform', (params.showWaveform ?? 1) === 1 ? 0 : 1)}
              className={[
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                (params.showWaveform ?? 1) === 1 ? 'bg-primary-600' : 'bg-neutral-200',
                disabled && 'opacity-40 pointer-events-none'
              ].join(' ')}
            >
              <span
                className={[
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  (params.showWaveform ?? 1) === 1 ? 'translate-x-4' : 'translate-x-0'
                ].join(' ')}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
