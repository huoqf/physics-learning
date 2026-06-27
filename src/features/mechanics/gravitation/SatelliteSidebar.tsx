import type { SidebarExtraProps } from '@/data/types'
import { duration, easing } from '@/theme/motion'
import { SegmentedControl, OptionButton, ToggleSwitch, TipCard, Button } from '@/components/UI'

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
            <Button onClick={handleLaunch} disabled={isLaunched === 1}>
              🚀 发射
            </Button>
            <Button onClick={handleReset} variant="secondary">
              🔄 重置
            </Button>
          </div>

          <TipCard>
            <div>
              🚀 <strong>发射三阶段演示（低轨 1.05R 水平入轨）：</strong>
              <br />• <strong>垂直起飞 (0~3s)</strong>：火箭从文昌发射场径向垂直升空至 320km 高度。
              <br />• <strong>重力转弯 (3~8s)</strong>：姿态从垂直逐步偏转至水平切向，完成入轨准备。
              <br />• <strong>在轨运行 (≥8s)</strong>：火箭关机分离，卫星沿预渲染轨道快速环绕，10s 内可见 1~2 圈。
            </div>
            <div className="pt-1.5 border-t border-primary-100/50">
              💡 <strong>理想初速度模型 (入轨点切向速度，低轨 1.05R)：</strong>
              <br />• <strong>7.9 km/s</strong>：第一宇宙速度（近圆轨道，e≈0.05）
              <br />• <strong>10.0 km/s</strong>：椭圆轨道，远地点显著抬升
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
