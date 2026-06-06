import { useAnimationStore } from '@/stores'
import type { SidebarExtraProps } from '@/data/types'

/**
 * 匀变速直线运动侧边栏扩展
 *
 * 基础模式：位移面积展现（合并梯形/拆分公式/等效割补） + 微元切割份数控制
 * 进阶模式：频闪周期 T 控制 + 经典物理教学预设一键应用
 */
export default function UniformAccelerationSidebar({
  params,
  updateParam,
  disabled,
}: SidebarExtraProps) {
  const { setParams, setTime, setIsPlaying } = useAnimationStore()
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  // 基础模式参数默认值
  const splitN = params.splitN ?? 0
  const showEquivRect = params.showEquivRect ?? 0
  const showSplit = params.showSplit ?? 1

  const toggleAdvanced = () => {
    // 切换模式时清空时间并暂停
    updateParam('advancedMode', isAdvanced ? 0 : 1)
    setTime(0)
    setIsPlaying(false)
  }

  // 快捷教学预设应用
  const applyPreset = (v0Val: number, aVal: number, TVal: number) => {
    setParams({
      ...params,
      v0: v0Val,
      a: aVal,
      flashPeriod: TVal,
    })
    setTime(0)
    setIsPlaying(false)
  }

  // 映射微元分割滑块刻度索引与实际等份数值
  const splitNOptions = [0, 4, 8, 16, 32]
  const splitNIndex = splitNOptions.indexOf(splitN) !== -1 ? splitNOptions.indexOf(splitN) : 0

  return (
    <>
      {/* ── 基础模式控件 ── */}
      {!isAdvanced && (
        <div className="mt-4 pt-3 border-t border-neutral-200 space-y-4">
          {/* A. 面积展示类型单选组 */}
          <div>
            <p className="text-xs font-semibold text-neutral-600 mb-2">v-t 图位移面积展示</p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => {
                  setParams({
                    ...params,
                    splitN: 0,
                    showEquivRect: 0,
                    showSplit: 0,
                  })
                }}
                disabled={disabled}
                className={`py-1.5 text-[11px] rounded-md font-medium border transition-all active:scale-95 ${
                  splitN === 0 && showEquivRect === 0 && showSplit === 0
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                合并梯形
              </button>
              <button
                onClick={() => {
                  setParams({
                    ...params,
                    splitN: 0,
                    showEquivRect: 0,
                    showSplit: 1,
                  })
                }}
                disabled={disabled}
                className={`py-1.5 text-[11px] rounded-md font-medium border transition-all active:scale-95 ${
                  splitN === 0 && showEquivRect === 0 && showSplit === 1
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                拆分公式
              </button>
              <button
                onClick={() => {
                  setParams({
                    ...params,
                    splitN: 0,
                    showEquivRect: 1,
                    showSplit: 0,
                  })
                }}
                disabled={disabled}
                className={`py-1.5 text-[11px] rounded-md font-medium border transition-all active:scale-95 ${
                  splitN === 0 && showEquivRect === 1
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                等效割补
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-neutral-400 leading-tight">
              {showEquivRect === 1
                ? '等效割补：利用中间时刻速度 v(t/2) 围成的等效矩形替代原梯形面积，突出互补三角形。'
                : showSplit === 1
                ? '拆分公式：将面积拆分为矩形位移 v₀t (匀速) 与三角形位移 ½at² (加速)。'
                : '合并梯形：以整体梯形面积 S = ½(v₀+v_t)t 直接代表总位移。'}
            </p>
          </div>

          {/* B. 微元分割份数滑块 */}
          <div className="pt-2 border-t border-neutral-100">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-600 font-semibold">微元切割份数 N</span>
              <span className="font-mono text-neutral-700 font-bold">
                {splitN === 0 ? '连续不分割' : `${splitN} 份`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={splitNOptions.length - 1}
              step={1}
              value={splitNIndex}
              onChange={(e) => {
                const val = splitNOptions[parseInt(e.target.value)]
                updateParam('splitN', val)
              }}
              disabled={disabled}
              className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
            />
            <p className="mt-1.5 text-[10px] text-neutral-400 leading-tight">
              拖动滑块将运动过程切割为 N 个微元段，在 v-t 图和赛道位移带同步展示微积分求和思想。
            </p>
            {splitN > 0 && (
              <p className="mt-1 text-[9px] text-amber-600 font-medium leading-none">
                * 开启微元分割时，会优先覆盖普通面积图形展示
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 进阶模式切换按钮 ── */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <button
          onClick={toggleAdvanced}
          disabled={disabled}
          className={[
            'w-full px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-98',
            isAdvanced
              ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
            disabled && 'opacity-40 pointer-events-none',
          ].join(' ')}
        >
          {isAdvanced ? '✓ 当前为进阶模式' : '进入进阶模式 (频闪实验)'}
        </button>
        <p className="mt-1.5 text-[10px] text-neutral-400 leading-tight">
          {isAdvanced
            ? '频闪实验模式：聚焦打点计时器频闪现象，三屏联动处理逐差法数据。'
            : '基础理论模式：聚焦 v-t 图物理意义的理论公式推导和几何面积证明。'}
        </p>

        {/* ── 进阶控件展开 ── */}
        {isAdvanced && (
          <div className="mt-4 space-y-4 border-t border-neutral-100 pt-3">
            {/* A. 频闪周期控制 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-600 font-semibold">频闪周期 T</span>
                <span className="font-mono text-neutral-700 font-bold">
                  {(params.flashPeriod ?? 1).toFixed(1)} s
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={params.flashPeriod ?? 1}
                onChange={(e) => updateParam('flashPeriod', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-600"
              />
              <p className="mt-1 text-[10px] text-neutral-400 leading-tight">
                调整频闪相机的快门间隔时间，可实时计算并推导逐差法。
              </p>
            </div>

            {/* B. 经典教学快捷预设 */}
            <div className="pt-2 border-t border-neutral-100">
              <p className="text-xs font-semibold text-neutral-600 mb-2">教学场景预设</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => applyPreset(2, 2, 1.0)}
                  disabled={disabled}
                  className="w-full py-1.5 px-2.5 text-xs text-left rounded-md font-medium transition-all active:scale-95 bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300 flex justify-between items-center"
                >
                  <span>经典逐差验证</span>
                  <span className="font-mono text-[9px] text-neutral-400">v₀=2, a=2, T=1.0s</span>
                </button>
                <button
                  onClick={() => applyPreset(0, 4, 0.5)}
                  disabled={disabled}
                  className="w-full py-1.5 px-2.5 text-xs text-left rounded-md font-medium transition-all active:scale-95 bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300 flex justify-between items-center"
                >
                  <span>高频打点计时</span>
                  <span className="font-mono text-[9px] text-neutral-400">v₀=0, a=4, T=0.5s</span>
                </button>
                <button
                  onClick={() => applyPreset(8, -2, 1.0)}
                  disabled={disabled}
                  className="w-full py-1.5 px-2.5 text-xs text-left rounded-md font-medium transition-all active:scale-95 bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300 flex justify-between items-center"
                >
                  <span>减速折返频闪</span>
                  <span className="font-mono text-[9px] text-neutral-400">v₀=8, a=-2, T=1.0s</span>
                </button>
              </div>
              <p className="mt-2 text-[10px] text-neutral-400 leading-tight">
                点击预设将自动配置物理参数，并将重置播放进度。
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

