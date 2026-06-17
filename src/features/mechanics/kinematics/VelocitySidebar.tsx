import type { SidebarExtraProps } from '@/data/types'
import { SegmentedControl, OptionButton, TipCard, Slider } from '@/components/UI'

/**
 * 速度动画侧边栏扩展
 */
export default function VelocitySidebar({
  params,
  updateParam,
  animationActions,
  disabled,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  // ── Δt 档位选项（基础版） ──
  const deltaTSteps = [
    { label: '2s', value: 2 },
    { label: '1s', value: 1 },
    { label: '0.2s', value: 0.2 },
    { label: '0.02s', value: 0.02 },
  ]

  // ── 运动模型选项（进阶版） ──
  const motionModels = [
    { label: '变加速（F递增）', idx: 0 },
    { label: '简谐振动', idx: 1 },
    { label: '往返多阶段', idx: 2 },
  ]

  return (
    <>
      {/* ── 场景切换（仅基础版显示）── */}
      {!isAdvanced && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <SegmentedControl
            label="生活场景"
            options={[
              { label: '公交车进站', value: 0 },
              { label: '百米短跑', value: 1 },
            ]}
            value={params.scene ?? 0}
            onChange={(v) => updateParam('scene', v as number)}
            disabled={disabled}
          />
        </div>
      )}

      {/* ── Δt 步进器（基础版显示）── */}
      {!isAdvanced && (
        <div className="mt-4 pt-3 border-t border-neutral-200">
          <p className="text-xs font-semibold text-neutral-600 mb-2">时间间隔 Δt</p>
          <div className="grid grid-cols-2 gap-2">
            {deltaTSteps.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={Math.abs((params.deltaT ?? 2) - opt.value) < 0.001}
                disabled={disabled}
                onClick={() => updateParam('deltaT', opt.value)}
              />
            ))}
          </div>
          <TipCard>调小 Δt 观察平均速度如何趋近瞬时速度</TipCard>
        </div>
      )}

      {/* ── 进阶模式切换按钮 ── */}
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

        {/* ── 进阶控件展开 ── */}
        {isAdvanced && (
          <div className="mt-3 space-y-3">
            {/* 运动模型切换 */}
            <div>
              <p className="text-xs font-semibold text-neutral-600 mb-2">运动模型</p>
              <div className="flex flex-col gap-2">
                {motionModels.map((opt) => (
                  <OptionButton
                    key={opt.idx}
                    label={opt.label}
                    selected={(params.modelIdx ?? 0) === opt.idx}
                    disabled={disabled}
                    onClick={() => {
                      updateParam('modelIdx', opt.idx)
                      animationActions.resetAnimation()
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Δt 连续滑条 */}
            <div>
              <Slider
                label="时间微元 Δt"
                value={params.deltaT ?? 0.5}
                min={0.001}
                max={1}
                step={0.001}
                unit="s"
                formatValue={(v) => v.toFixed(3)}
                onChange={(v) => updateParam('deltaT', v)}
                disabled={disabled}
              />
              <TipCard>拖拽 Δt→0 观察割线与切线重合</TipCard>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
