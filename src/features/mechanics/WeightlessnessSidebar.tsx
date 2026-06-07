import { useAnimationStore } from '@/stores'
import type { SidebarExtraProps } from '@/data/types'

export default function WeightlessnessSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const { setTime, setIsPlaying } = useAnimationStore()

  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1
  const modelIdx = params.modelIdx ?? 0

  const toggleAdvanced = () => {
    updateParam('advancedMode', isAdvanced ? 0 : 1)
    setTime(0)
    setIsPlaying(false)
  }

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200">
      <button
        onClick={toggleAdvanced}
        disabled={disabled}
        className={[
          'w-full px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.98]',
          isAdvanced
            ? 'bg-primary-600 text-white shadow-sm'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
          disabled && 'opacity-40 pointer-events-none',
        ].join(' ')}
      >
        {isAdvanced ? '✓ 进阶模式（变速电梯）' : '进阶模式（变速电梯）'}
      </button>

      {isAdvanced && (
        <div className="mt-3 space-y-4">
          <div>
            <p className="text-xs font-semibold text-neutral-600 mb-2">电梯运行情景</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  updateParam('modelIdx', 0)
                  setTime(0)
                  setIsPlaying(false)
                }}
                disabled={disabled}
                className={`w-full py-2 text-xs rounded-md font-medium transition-all active:scale-95 text-center ${
                  modelIdx === 0
                    ? 'bg-primary-50 text-primary-700 border border-primary-300'
                    : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                升降变速电梯 (启动-匀速-制动)
              </button>
              <button
                onClick={() => {
                  updateParam('modelIdx', 1)
                  setTime(0)
                  setIsPlaying(false)
                }}
                disabled={disabled}
                className={`w-full py-2 text-xs rounded-md font-medium transition-all active:scale-95 text-center ${
                  modelIdx === 1
                    ? 'bg-primary-50 text-primary-700 border border-primary-300'
                    : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                钢索突然断裂 (静止-坠落-缓冲)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
