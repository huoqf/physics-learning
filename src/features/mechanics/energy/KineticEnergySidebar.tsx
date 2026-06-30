import type { FC } from 'react'
import { SegmentedControl, Button } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

interface Preset {
  name: string
  icon: string
  m: number
  v0: number
  R: number
  mu: number
  mode: number
}

const PRESETS: Preset[] = [
  { name: '光滑下滑', icon: '🎢', m: 2.0, v0: 0, R: 5.0, mu: 0.00, mode: 1 },
  { name: '粗糙下滑', icon: '🍂', m: 2.0, v0: 0, R: 5.0, mu: 0.35, mode: 1 },
]

/**
 * 动能定理侧边栏扩展 — 模式切换与教学预设
 *
 * 物理量看板、公式、高考要点由右侧 PhysicsPanel 展示
 */
const KineticEnergySidebar: FC<SidebarExtraProps> = ({
  params,
  updateParam,
  animationActions,
  disabled,
}) => {
  const mode = params.mode ?? 0

  const handleModeChange = (value: number | string) => {
    const nextMode = value as number
    updateParam('mode', nextMode)
    // 切换模型时，重置各参数至安全初始值
    if (nextMode === 0) {
      updateParam('F', 15)
      updateParam('s', 6)
      updateParam('v0', 0)
    } else {
      updateParam('v0', 0) // 进阶模式默认从静止释放
      updateParam('R', 5)
      updateParam('mu', 0.15)
    }
    animationActions.resetAnimation()
  }

  const applyPreset = (preset: Preset) => {
    updateParam('m', preset.m)
    updateParam('v0', preset.v0)
    updateParam('R', preset.R)
    updateParam('mu', preset.mu)
    updateParam('mode', preset.mode)
    animationActions.resetAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      <SegmentedControl
        label="起动模型"
        options={[
          { value: 0, label: '恒力做功' },
          { value: 1, label: '变力做功' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />
      
      <p className="text-ui-base text-neutral-400 leading-tight">
        {mode === 0
          ? '恒力做功：水平面光滑，恒力 F 在位移 s 区间内加速物块，随后撤力，物块匀速。'
          : '变力做功：滑块沿 1/4 凹型圆弧轨道（碗形内壁）下滑，受重力和变摩擦力作用，动能与功的变化相匹配，底端切线水平后匀速。底端满足高考标准：F_N − mg = mv²/R。'}
      </p>

      {mode === 1 && (
        <div className="flex flex-col gap-2 mt-2">
          <h4 className="text-xs font-semibold text-neutral-700">高考经典预设</h4>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.name}
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() => applyPreset(preset)}
                className="flex items-center gap-1 justify-start font-normal"
              >
                <span>{preset.icon}</span>
                <span>{preset.name}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default KineticEnergySidebar
