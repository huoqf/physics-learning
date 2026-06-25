import type { FC } from 'react'
import { SegmentedControl, Button, OptionButton } from '@/components/UI'
import type { SidebarExtraProps } from '@/data/types'

interface GravityPreset {
  name: string
  icon: string
  m: number
  g: number
  y0: number
  y_ref: number
  mode: number
}

interface SpringPreset {
  name: string
  icon: string
  m: number
  k: number
  x0: number
  mode: number
}

const GRAVITY_SCENE_PRESETS: GravityPreset[] = [
  { name: '地平参考面', icon: '🍏', m: 2.0, g: 9.8, y0: 8.0, y_ref: 0.0, mode: 0 },
  { name: '高台参考面', icon: '🌌', m: 2.0, g: 9.8, y0: 8.0, y_ref: 5.0, mode: 0 },
]

const GRAVITY_FIELD_PRESETS = [
  { label: '🌍 地球', g: 9.8 },
  { label: '🌙 月球', g: 1.63 },
  { label: '🔴 火星', g: 3.72 },
  { label: '🪐 木星', g: 24.79 },
] as const

const SPRING_PRESETS: SpringPreset[] = [
  { name: '强拉伸释放', icon: '🏹', m: 2.0, k: 150, x0: 2.5, mode: 1 },
  { name: '强压缩释放', icon: '📦', m: 2.0, k: 150, x0: -2.5, mode: 1 },
]

/**
 * 势能实验室侧边栏扩展
 */
const PotentialEnergySidebar: FC<SidebarExtraProps> = ({
  params,
  updateParam,
  animationActions,
  disabled,
}) => {
  const mode = params.mode ?? 0

  const handleModeChange = (value: number | string) => {
    const nextMode = value as number
    updateParam('mode', nextMode)
    if (nextMode === 0) {
      updateParam('m', 2.0)
      updateParam('g', 9.8)
      updateParam('y0', 8.0)
      updateParam('y_ref', 3.0)
    } else {
      updateParam('m', 2.0)
      updateParam('k', 100)
      updateParam('x0', 2.0)
    }
    animationActions.resetAnimation()
  }

  const applyGravityPreset = (preset: GravityPreset) => {
    updateParam('mode', 0)
    updateParam('m', preset.m)
    updateParam('g', preset.g)
    updateParam('y0', preset.y0)
    updateParam('y_ref', preset.y_ref)
    animationActions.resetAnimation()
  }

  const applySpringPreset = (preset: SpringPreset) => {
    updateParam('mode', 1)
    updateParam('m', preset.m)
    updateParam('k', preset.k)
    updateParam('x0', preset.x0)
    animationActions.resetAnimation()
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-neutral-200">
      <SegmentedControl
        label="势能实验场景"
        options={[
          { value: 0, label: '重力势能' },
          { value: 1, label: '弹性势能' },
        ]}
        value={mode}
        onChange={handleModeChange}
        disabled={disabled}
      />
      
      <p className="text-[10px] text-neutral-400 leading-tight">
        {mode === 0
          ? '重力势能：物体与地球共有。零势能参考面可自由调节，用来探究势能的相对性及 W_G = -ΔE_p。支持在暂停时用鼠标上下拉动物块或参考面。'
          : '弹性势能：弹簧形变所产生。无论拉伸（x>0）还是压缩（x<0），弹性势能均关于平衡位置对称且恒为正（E_p ∝ x²）。支持在暂停时左右拖动物块。'}
      </p>

      {mode === 0 ? (
        <div className="flex flex-col gap-3 mt-2">
          {/* 星球重力场预设 */}
          <div>
            <h4 className="text-xs font-semibold text-neutral-700 mb-2">环境重力场</h4>
            <div className="flex gap-2 flex-wrap">
              {GRAVITY_FIELD_PRESETS.map((preset) => (
                <OptionButton
                  key={preset.g}
                  label={preset.label}
                  selected={params.g === preset.g}
                  disabled={disabled}
                  onClick={() => updateParam('g', preset.g)}
                />
              ))}
            </div>
          </div>

          {/* 参考面经典预设 */}
          <div>
            <h4 className="text-xs font-semibold text-neutral-700">参考面经典预设</h4>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {GRAVITY_SCENE_PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="secondary"
                  size="sm"
                  disabled={disabled}
                  onClick={() => applyGravityPreset(preset)}
                  className="flex items-center gap-1 justify-start font-normal text-[11px]"
                >
                  <span>{preset.icon}</span>
                  <span>{preset.name}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-2">
          <h4 className="text-xs font-semibold text-neutral-700">简谐释放预设</h4>
          <div className="grid grid-cols-2 gap-2">
            {SPRING_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() => applySpringPreset(preset)}
                className="flex items-center gap-1 justify-start font-normal text-[11px]"
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

export default PotentialEnergySidebar
