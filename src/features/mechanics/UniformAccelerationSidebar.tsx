import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, OptionButton, TipCard } from '@/components/UI'

/**
 * 匀变速直线运动侧边栏扩展
 *
 * 基础模式：位移面积展现（合并梯形/拆分公式/等效割补） + 微元切割份数控制
 * 进阶模式：频闪周期 T 控制 + 经典物理教学预设一键应用
 */
export default function UniformAccelerationSidebar({
  params,
  updateParam,
  setParams,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  // 基础模式参数默认值
  const splitN = params.splitN ?? 0
  const showEquivRect = params.showEquivRect ?? 0
  const showSplit = params.showSplit ?? 1

  // 快捷教学预设应用
  const applyPreset = (v0Val: number, aVal: number, TVal: number) => {
    setParams({
      ...params,
      v0: v0Val,
      a: aVal,
      flashPeriod: TVal,
    })
    animationActions.resetAnimation()
  }

  // 映射微元分割滑块刻度索引与实际等份数值
  const splitNOptions = [0, 4, 8, 16, 32]
  const splitNIndex = splitNOptions.indexOf(splitN) !== -1 ? splitNOptions.indexOf(splitN) : 0

  // 面积展示模式计算
  const areaMode = splitN === 0 && showEquivRect === 0 && showSplit === 0 ? 0
    : splitN === 0 && showEquivRect === 0 && showSplit === 1 ? 1
    : 2

  return (
    <>
      {/* ── 基础模式控件 ── */}
      {!isAdvanced && (
        <div className="mt-4 pt-3 border-t border-neutral-200 space-y-4">
          {/* A. 面积展示类型单选组 */}
          <SegmentedControl
            label="v-t 图位移面积展示"
            options={[
              { label: '合并梯形', value: 0 },
              { label: '拆分公式', value: 1 },
              { label: '等效割补', value: 2 },
            ]}
            value={areaMode}
            onChange={(v) => {
              if (v === 0) setParams({ ...params, splitN: 0, showEquivRect: 0, showSplit: 0 })
              else if (v === 1) setParams({ ...params, splitN: 0, showEquivRect: 0, showSplit: 1 })
              else setParams({ ...params, splitN: 0, showEquivRect: 1, showSplit: 0 })
            }}
            disabled={disabled}
          />
          <TipCard>
            {showEquivRect === 1
              ? '等效割补：利用中间时刻速度 v(t/2) 围成的等效矩形替代原梯形面积，突出互补三角形。'
              : showSplit === 1
              ? '拆分公式：将面积拆分为矩形位移 v₀t (匀速) 与三角形位移 ½at² (加速)。'
              : '合并梯形：以整体梯形面积 S = ½(v₀+v_t)t 直接代表总位移。'}
          </TipCard>

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
            <TipCard>拖动滑块将运动过程切割为 N 个微元段，在 v-t 图和赛道位移带同步展示微积分求和思想。</TipCard>
            {splitN > 0 && (
              <TipCard variant="warning">* 开启微元分割时，会优先覆盖普通面积图形展示</TipCard>
            )}
          </div>
        </div>
      )}

      {/* ── 进阶模式切换 ── */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <SegmentedControl
          label="观察模式"
          options={[
            { label: '基础模式', value: 0 },
            { label: '进阶模式', value: 1 },
          ]}
          value={advancedMode}
          onChange={(v) => {
            updateParam('advancedMode', v as number)
            animationActions.resetAnimation()
          }}
          disabled={disabled}
        />
        <TipCard>
          {isAdvanced
            ? '频闪实验模式：聚焦打点计时器频闪现象，三屏联动处理逐差法数据。'
            : '基础理论模式：聚焦 v-t 图物理意义的理论公式推导和几何面积证明。'}
        </TipCard>

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
              <TipCard>调整频闪相机的快门间隔时间，可实时计算并推导逐差法。</TipCard>
            </div>

            {/* B. 经典教学快捷预设 */}
            <div className="pt-2 border-t border-neutral-100">
              <p className="text-xs font-semibold text-neutral-600 mb-2">教学场景预设</p>
              <div className="flex flex-col gap-2">
                <OptionButton
                  label="经典逐差验证"
                  variant="preset"
                  description="v₀=2, a=2, T=1.0s"
                  onClick={() => applyPreset(2, 2, 1.0)}
                  disabled={disabled}
                />
                <OptionButton
                  label="高频打点计时"
                  variant="preset"
                  description="v₀=0, a=4, T=0.5s"
                  onClick={() => applyPreset(0, 4, 0.5)}
                  disabled={disabled}
                />
                <OptionButton
                  label="减速折返频闪"
                  variant="preset"
                  description="v₀=8, a=-2, T=1.0s"
                  onClick={() => applyPreset(8, -2, 1.0)}
                  disabled={disabled}
                />
              </div>
              <TipCard>点击预设将自动配置物理参数，并将重置播放进度。</TipCard>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
