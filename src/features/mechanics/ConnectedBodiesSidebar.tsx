import { useAnimationStore } from '@/stores'
import type { SidebarExtraProps } from '@/data/types'

export default function ConnectedBodiesSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const { setTime, setIsPlaying } = useAnimationStore()

  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1
  const connectionType = params.connectionType ?? 0 // 0=细绳, 1=弹簧
  const analysisView = params.analysisView ?? 0 // 0=普通, 1=整体, 2=隔离m1, 3=隔离m2

  const toggleAdvanced = () => {
    updateParam('advancedMode', isAdvanced ? 0 : 1)
    setTime(0)
    setIsPlaying(false)
  }

  const handleConnectionTypeChange = (type: number) => {
    updateParam('connectionType', type)
    setTime(0)
    setIsPlaying(false)
  }

  const handleAnalysisViewChange = (view: number) => {
    updateParam('analysisView', view)
    // 切换分析视角时不重置时间，方便用户在运动中对比不同受力模式
  }

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200 flex flex-col gap-4">
      {/* 进阶工作台模式 */}
      <button
        onClick={toggleAdvanced}
        disabled={disabled}
        className={[
          'w-full px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.98]',
          isAdvanced
            ? 'bg-primary-600 text-white shadow-sm font-semibold'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
          disabled && 'opacity-40 pointer-events-none',
        ].join(' ')}
      >
        {isAdvanced ? '✓ 进阶模式 (连接体工作台)' : '进阶模式 (连接体工作台)'}
      </button>

      {/* 连接介质类型 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">连接传动介质</label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-lg">
          <button
            onClick={() => handleConnectionTypeChange(0)}
            disabled={disabled}
            className={`py-1 text-xs font-semibold rounded-md transition-all ${
              connectionType === 0
                ? 'bg-white text-primary-700 shadow-sm font-bold'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-white/40'
            }`}
          >
            编制细绳
          </button>
          <button
            onClick={() => handleConnectionTypeChange(1)}
            disabled={disabled}
            className={`py-1 text-xs font-semibold rounded-md transition-all ${
              connectionType === 1
                ? 'bg-white text-primary-700 shadow-sm font-bold'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-white/40'
            }`}
          >
            轻质弹簧
          </button>
        </div>
      </div>

      {/* 演示受力分析视图 */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">受力分析演示模式</label>
        <div className="flex flex-col gap-1.5">
          {[
            { value: 0, label: '普通受力视图' },
            { value: 1, label: '整体法分析系统' },
            { value: 2, label: '隔离法分析物体 m₁' },
            { value: 3, label: '隔离法分析物体 m₂' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => handleAnalysisViewChange(item.value)}
              disabled={disabled}
              className={`w-full py-2 px-3 text-left text-xs rounded-lg font-medium transition-all active:scale-[0.98] border ${
                analysisView === item.value
                  ? 'bg-primary-50 text-primary-700 border-primary-300 shadow-sm'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${analysisView === item.value ? 'bg-primary-600' : 'bg-transparent border border-neutral-300'}`} />
                <span>{item.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
