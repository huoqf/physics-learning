import type { SidebarExtraProps } from '@/data/types'
import { duration, easing } from '@/theme/motion'
import { SegmentedControl, OptionButton, ToggleSwitch, TipCard } from '@/components/UI'

export default function SatelliteSidebar({ params, updateParam, setParams, animationActions, disabled }: SidebarExtraProps) {
  const mode = params.mode ?? 0
  const v0 = params.v0 ?? 7.9
  const isLaunched = params.isLaunched ?? 0
  const showChart = params.showChart ?? 1
  const showCompare = params.showCompare ?? 1

  const handleModeChange = (newMode: number) => {
    setParams({
      ...params,
      mode: newMode,
      isLaunched: 0,
      r: 7.0,
      v0: 7.9
    })
    animationActions.resetAnimation()
  }

  const handleLaunch = () => {
    updateParam('isLaunched', 1)
    animationActions.restartAnimation()
  }

  const handleReset = () => {
    updateParam('isLaunched', 0)
    animationActions.resetAnimation()
  }

  const handlePresetV0 = (speed: number) => {
    if (isLaunched === 1) return
    updateParam('v0', speed)
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      {/* 演示模式选择 */}
      <SegmentedControl
        label="演示模式"
        options={[
          { label: '多圆轨道对比', value: 0 },
          { label: '宇宙速度发射', value: 1 },
        ]}
        value={mode}
        onChange={(v) => handleModeChange(v as number)}
        disabled={disabled}
      />

      {mode === 0 && (
        <div className="flex flex-col gap-3" style={{ animation: `fadeIn ${duration.fast}ms ${easing.standard}` }}>
          <ToggleSwitch
            checked={showCompare === 1}
            onChange={(checked) => updateParam('showCompare', checked ? 1 : 0)}
            label="同屏显示对比轨道"
          />

          <TipCard variant="info">
            💡 <strong>提示：</strong>同屏显示包含近地轨道、中轨道 (GPS) 和同步轨道。可以通过调节左侧轨道半径 r 或直接在右上角画中画拖拽来进行距离调节。
          </TipCard>
        </div>
      )}

      {mode === 1 && (
        <div className="flex flex-col gap-4" style={{ animation: `fadeIn ${duration.fast}ms ${easing.standard}` }}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-600">发射速度快捷选择</label>
            <div className="grid grid-cols-3 gap-2">
              <OptionButton
                label="7.9 km/s"
                selected={v0 === 7.9}
                disabled={isLaunched === 1}
                onClick={() => handlePresetV0(7.9)}
              />
              <OptionButton
                label="10.0 km/s"
                selected={v0 === 10.0}
                disabled={isLaunched === 1}
                onClick={() => handlePresetV0(10.0)}
              />
              <OptionButton
                label="11.2 km/s"
                selected={v0 === 11.2}
                disabled={isLaunched === 1}
                onClick={() => handlePresetV0(11.2)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={handleLaunch} disabled={isLaunched === 1} className={`py-2.5 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer border text-center ${isLaunched === 1 ? 'bg-neutral-100 border-neutral-200 text-neutral-400' : 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700 active:scale-[0.97]'}`}>
              🚀 点击发射
            </button>
            <button onClick={handleReset} className="py-2.5 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 active:scale-[0.97]">
              🔄 重置轨道
            </button>
          </div>

          <TipCard>
            <div>
              🚀 <strong>发射三阶段演示：</strong>
              <br />• <strong>垂直起飞 (0~3s)</strong>：火箭从文昌发射场径向垂直升空。
              <br />• <strong>重力转弯 (3~8s)</strong>：姿态逐渐偏转，并入预定高度切向。
              <br />• <strong>理想入轨 (≥8s)</strong>：火箭关机分离，卫星切入在轨运行。
            </div>
            <div className="pt-1.5 border-t border-primary-100/50">
              💡 <strong>理想初速度模型 (入轨点切向速度)：</strong>
              <br />• <strong>7.9 km/s</strong>：第一宇宙速度，刚好环绕地球做圆周运动
              <br />• <strong>10.0 km/s</strong>：介于一、二宇宙速度之间，运行于椭圆轨道
              <br />• <strong>11.2 km/s</strong>：第二宇宙速度，脱离地球引力束缚（逃逸轨道）
            </div>
          </TipCard>
        </div>
      )}

      <ToggleSwitch
        checked={showChart === 1}
        onChange={(checked) => updateParam('showChart', checked ? 1 : 0)}
        label="显示画中画曲线"
      />
    </div>
  )
}
