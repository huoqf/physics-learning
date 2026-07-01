import type { FC } from 'react'
import { SegmentedControl, Button, LeftPanelSection } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

interface PendulumPreset {
  name: string
  icon: string
  m: number
  g: number
  L: number
  theta0: number
  mode: number
}

interface ValleyPreset {
  name: string
  icon: string
  m: number
  g: number
  R: number
  mu: number
  theta0: number
  mode: number
}

const PENDULUM_PRESETS: PendulumPreset[] = [
  { name: '地球经典摆', icon: '', m: 2.0, g: 9.8, L: 5.0, theta0: 45, mode: 0 },
  { name: '月球慢速摆', icon: '', m: 2.0, g: 1.63, L: 5.0, theta0: 45, mode: 0 },
  { name: '火星中速摆', icon: '', m: 2.0, g: 3.72, L: 5.0, theta0: 45, mode: 0 },
  { name: '木星快速摆', icon: '', m: 2.0, g: 24.79, L: 5.0, theta0: 45, mode: 0 },
]

const VALLEY_PRESETS: ValleyPreset[] = [
  { name: '理想光滑山谷', icon: '', m: 2.0, g: 9.8, R: 5.0, mu: 0.00, theta0: 55, mode: 1 },
  { name: '阻尼耗减山谷', icon: '', m: 2.0, g: 9.8, R: 5.0, mu: 0.12, theta0: 55, mode: 1 },
  { name: '月球光滑山谷', icon: '', m: 2.0, g: 1.63, R: 5.0, mu: 0.00, theta0: 55, mode: 1 },
]

/**
 * 机械能守恒侧边栏扩展
 */
const EnergyConservationSidebar: FC<SidebarExtraProps> = ({
  params,
  updateParam,
  animationActions,
  disabled,
}) => {
  const mode = params.mode ?? 0

  const handleModeChange = (value: number | string) => {
    const nextMode = value as number
    updateParam('mode', nextMode)
    // 切换模式，重置安全默认值
    if (nextMode === 0) {
      updateParam('m', 2.0)
      updateParam('g', 9.8)
      updateParam('L', 5.0)
      updateParam('theta0', 45)
    } else {
      updateParam('m', 2.0)
      updateParam('g', 9.8)
      updateParam('R', 5.0)
      updateParam('mu', 0.10)
      updateParam('theta0', 55)
    }
    updateParam('hRef', 0.0)
    animationActions.resetAnimation()
  }

  const applyPendulumPreset = (preset: PendulumPreset) => {
    updateParam('mode', 0)
    updateParam('m', preset.m)
    updateParam('g', preset.g)
    updateParam('L', preset.L)
    updateParam('theta0', preset.theta0)
    updateParam('hRef', 0.0)
    animationActions.resetAnimation()
  }

  const applyValleyPreset = (preset: ValleyPreset) => {
    updateParam('mode', 1)
    updateParam('m', preset.m)
    updateParam('g', preset.g)
    updateParam('R', preset.R)
    updateParam('mu', preset.mu)
    updateParam('theta0', preset.theta0)
    updateParam('hRef', 0.0)
    animationActions.resetAnimation()
  }

  return (
    <LeftPanelSection bodyClassName="flex flex-col gap-4">
      <SegmentedControl
        label="演示物理场景"
        options={[
          { value: 0, label: '经典单摆' },
          { value: 1, label: '山谷滑道' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />
      
      <p className="text-ui-base text-neutral-400 leading-tight">
        {mode === 0
          ? '经典单摆：在没有空气阻力时，摆球在摆动过程中重力势能与动能进行无损的往复转化，系统的总机械能保持严格守恒。支持在暂停时拖拉小球改变初始角。'
          : '山谷滑道：滑块在双向对称凹山谷轨道上阻尼滑行。摩擦做功使机械能不断耗散，但在任何时刻机械能与摩擦产生的内能之总和始终严格守恒。支持拖拽滑块位置。'}
      </p>

      {mode === 0 ? (
        <div className="flex flex-col gap-2 mt-2">
          <h4 className="text-xs font-semibold text-neutral-700">引力场环境预设</h4>
          <div className="grid grid-cols-2 gap-2">
            {PENDULUM_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() => applyPendulumPreset(preset)}
                className="flex items-center gap-1 justify-start font-normal text-ui-md"
              >
                <span>{preset.icon}</span>
                <span>{preset.name}</span>
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-2">
          <h4 className="text-xs font-semibold text-neutral-700">轨道阻尼环境预设</h4>
          <div className="grid grid-cols-2 gap-2">
            {VALLEY_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() => applyValleyPreset(preset)}
                className="flex items-center gap-1 justify-start font-normal text-ui-md"
              >
                <span>{preset.icon}</span>
                <span>{preset.name}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </LeftPanelSection>
  )
}

export default EnergyConservationSidebar
