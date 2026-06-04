import type { SidebarExtraProps } from '@/data/types'

export default function VerticalThrowSidebar({
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
          {/* Slice Density */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-600">微元切片密度</span>
              <span className="font-mono text-neutral-700">{(params.sliceDensity ?? 0).toFixed(2)} s</span>
            </div>
            <input
              type="range" min={0} max={0.5} step={0.05}
              value={params.sliceDensity ?? 0}
              onChange={(e) => updateParam('sliceDensity', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
            />
          </div>

          {/* Air Resistance */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-600">空气阻力 k</span>
              <span className="font-mono text-neutral-700">{(params.airResistance ?? 0).toFixed(1)} kg/s</span>
            </div>
            <input
              type="range" min={0} max={2} step={0.1}
              value={params.airResistance ?? 0}
              onChange={(e) => updateParam('airResistance', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
            />
          </div>

          {/* Target Height */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-600">目标高度线</span>
              <span className="font-mono text-neutral-700">{(params.targetHeight ?? 0).toFixed(1)} m</span>
            </div>
            <input
              type="range" min={0} max={50} step={0.5}
              value={params.targetHeight ?? 0}
              onChange={(e) => updateParam('targetHeight', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
            />
          </div>
        </div>
      )}
    </div>
  )
}
