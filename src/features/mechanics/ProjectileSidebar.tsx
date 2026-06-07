import type { SidebarExtraProps } from '@/data/types'

export default function ProjectileSidebar({
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
          {/* Air Resistance */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-600">空气阻力 k</span>
              <span className="font-mono text-neutral-700">{(params.airResistance ?? 0).toFixed(2)} kg/m</span>
            </div>
            <input
              type="range" min={0} max={0.2} step={0.01}
              value={params.airResistance ?? 0}
              onChange={(e) => updateParam('airResistance', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
            />
          </div>

          {/* Vacuum Compare Switch */}
          {(params.airResistance ?? 0) > 0 && (
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-neutral-600">对比真空参考轨道</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => updateParam('showVacuumCompare', (params.showVacuumCompare ?? 1) === 1 ? 0 : 1)}
                className={[
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  (params.showVacuumCompare ?? 1) === 1 ? 'bg-primary-600' : 'bg-neutral-200',
                  disabled && 'opacity-40 pointer-events-none'
                ].join(' ')}
              >
                <span
                  className={[
                    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    (params.showVacuumCompare ?? 1) === 1 ? 'translate-x-4' : 'translate-x-0'
                  ].join(' ')}
                />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
