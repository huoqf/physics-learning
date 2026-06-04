import type { SidebarExtraProps } from '@/data/types'

export default function FreeFallSidebar({
  params,
  updateParam,
  showTimeSlices,
  toggleTimeSlices,
  showDualObjects,
  toggleDualObjects,
  disabled,
}: SidebarExtraProps) {
  return (
    <>
      <div className="mt-4 pt-3 border-t border-neutral-200">
        <p className="text-xs font-semibold text-neutral-600 mb-2">环境预设</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { updateParam('g', 9.8); updateParam('dragK', 0); }}
            disabled={disabled}
            className={`px-3 py-1.5 text-xs rounded-md transition-all active:scale-95 ${
              params.g === 9.8 && params.dragK === 0
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            🌍 地球
          </button>
          <button
            onClick={() => { updateParam('g', 1.63); updateParam('dragK', 0); }}
            disabled={disabled}
            className={`px-3 py-1.5 text-xs rounded-md transition-all active:scale-95 ${
              params.g === 1.63 && params.dragK === 0
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            🌙 月球
          </button>
          <button
            onClick={() => { updateParam('g', 3.72); updateParam('dragK', 0); }}
            disabled={disabled}
            className={`px-3 py-1.5 text-xs rounded-md transition-all active:scale-95 ${
              params.g === 3.72 && params.dragK === 0
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            🔴 火星
          </button>
          <button
            onClick={() => { updateParam('g', 24.79); updateParam('dragK', 0); }}
            disabled={disabled}
            className={`px-3 py-1.5 text-xs rounded-md transition-all active:scale-95 ${
              params.g === 24.79 && params.dragK === 0
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            🪐 木星
          </button>
          <button
            onClick={() => { updateParam('g', 9.8); updateParam('dragK', 0.5); }}
            disabled={disabled}
            className={`px-3 py-1.5 text-xs rounded-md transition-all active:scale-95 ${
              params.g === 9.8 && params.dragK === 0.5
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            💨 空气阻力
          </button>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-neutral-200">
        <button
          onClick={toggleTimeSlices}
          disabled={disabled}
          className={`w-full py-2 rounded-md text-sm font-medium transition-all ${
            showTimeSlices
              ? 'bg-primary-100 text-primary-700 border border-primary-300'
              : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
          }`}
        >
          {showTimeSlices ? '隐藏' : '显示'} 1:3:5:7 时间切片
        </button>
      </div>
      <div className="mt-4 pt-3 border-t border-neutral-200">
        <button
          onClick={() => {
            toggleDualObjects()
            if (!showDualObjects) {
              updateParam('dragK', 0.5)
            }
          }}
          disabled={disabled}
          className={`w-full py-2 rounded-md text-sm font-medium transition-all ${
            showDualObjects
              ? 'bg-primary-100 text-primary-700 border border-primary-300'
              : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
          }`}
        >
          {showDualObjects ? '关闭' : '牛顿管'} 实验
        </button>
      </div>
    </>
  )
}
