import React from 'react'
import { SegmentedControl, Slider } from '@/components/UI'

interface FaradaySidebarExtraProps {
  params: Record<string, number>
  updateParam: (key: string, value: number) => void
  setParams: (params: Record<string, number>) => void
  disabled?: boolean
}

export const FaradaySidebarExtra: React.FC<FaradaySidebarExtraProps> = ({
  params,
  updateParam,
  setParams,
  disabled = false,
}) => {
  const mode = params.mode ?? 0
  const N = params.N ?? 50
  const B = params.B ?? 1.2
  const magnetV = params.magnetV ?? 140
  const dBdt = params.dBdt ?? 0.5

  const handleModeChange = (val: number | string) => {
    const nextMode = Number(val)
    setParams({
      ...params,
      mode: nextMode,
      // 切换模式时保留部分通用参数，防止状态错乱
    })
  }

  const handleNChange = (val: number) => {
    updateParam('N', Math.max(1, Math.round(val)))
  }

  const handleBChange = (val: number) => {
    updateParam('B', val)
  }

  const handleVChange = (val: number) => {
    updateParam('magnetV', val)
  }

  const handleDBdtChange = (val: number) => {
    updateParam('dBdt', val)
  }

  return (
    <div className={`space-y-6 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* 模式选择 */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-800">实验模式</h3>
        <SegmentedControl
          options={[
            { label: '基础: 磁铁变速', value: 0 },
            { label: '进阶: 匀变磁场', value: 1 },
          ]}
          value={mode}
          onChange={handleModeChange}
        />
      </div>

      {/* 参数控制 */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 space-y-5">
        <h3 className="text-sm font-semibold text-neutral-800">参数控制</h3>

        {/* 匝数控制是通用的 */}
        <div className="space-y-2">
          <Slider
            label="线圈匝数 n"
            value={N}
            min={1}
            max={100}
            step={1}
            unit="匝"
            onChange={handleNChange}
          />
          <span className="text-[10px] text-neutral-400 block mt-1 leading-relaxed">
            匝数越多，单位磁通量变化产生的感应电动势越大。
          </span>
        </div>

        {mode === 0 ? (
          // 基础模式下的自变量控制
          <div className="space-y-4 pt-2 border-t border-neutral-100">
            <div className="space-y-2">
              <Slider
                label="磁铁强度 B"
                value={B}
                min={0.2}
                max={2.0}
                step={0.1}
                unit="T"
                onChange={handleBChange}
              />
            </div>

            <div className="space-y-2 pt-2">
              <Slider
                label="磁铁运动速度 v"
                value={magnetV}
                min={0}
                max={300}
                step={10}
                unit="px/s"
                onChange={handleVChange}
              />
              <span className="text-[10px] text-neutral-400 block mt-1 leading-relaxed">
                磁铁相对线圈移动的速度。速度越快，穿过线圈的磁通量变化越剧烈，感应电动势峰值越高。
              </span>
            </div>
          </div>
        ) : (
          // 进阶模式下的自变量控制
          <div className="space-y-4 pt-2 border-t border-neutral-100">
            <div className="space-y-2">
              <Slider
                label="磁场变化率 k = ΔB/Δt"
                value={dBdt}
                min={-1.5}
                max={1.5}
                step={0.1}
                unit="T/s"
                onChange={handleDBdtChange}
              />
              <span className="text-[10px] text-neutral-400 block mt-1 leading-relaxed">
                k &gt; 0：B 从 0 线性增强（产生逆时针感应电流）；k &lt; 0：B 从 0 线性减弱（产生顺时针感应电流）；k = 0：无感应电动势。
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FaradaySidebarExtra
