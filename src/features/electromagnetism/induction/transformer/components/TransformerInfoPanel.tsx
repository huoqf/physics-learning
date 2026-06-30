import { Card } from '@/components/UI'
import { FONT, PHYSICS_COLORS } from '@/theme/physics'
import { HIGHLIGHT_ALPHA, type ChainStep } from '../model/transformerModel'

type TransformerResult = {
  P_input: number
  P_output: number
  isShortCircuit: boolean
}

function PowerBar({
  label,
  value,
  width,
  font,
}: {
  label: string
  value: number
  width: number
  font: (v: number) => number
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1" style={{ fontSize: font(FONT.smallSize + 2) }}>
        <span className="text-neutral-500">{label}</span>
        <span className="font-mono font-bold" style={{ color: PHYSICS_COLORS.power }}>
          {Number.isFinite(value) ? `${value.toFixed(1)} W` : '∞ W'}
        </span>
      </div>
      <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${width}%`, backgroundColor: PHYSICS_COLORS.power }} />
      </div>
    </div>
  )
}

export function TransformerInfoPanel({
  width,
  result,
  pBarW,
  powerBalanced,
  chainSteps,
  dominoStep,
  font,
}: {
  width: number
  result: TransformerResult
  pBarW: number
  powerBalanced: boolean
  chainSteps: ChainStep[]
  dominoStep: number
  font: (v: number) => number
}) {
  return (
    <div
      className="absolute right-0 top-0 h-full bg-white/95 rounded-l-xl shadow-xl z-10 overflow-y-auto flex flex-col gap-2"
      style={{ width }}
    >
      <Card className="p-4">
        <div className="font-semibold text-neutral-600 mb-3" style={{ fontSize: font(FONT.axisSize + 1) }}>功率配平</div>
        <PowerBar label="P_in（输入）" value={result.P_input} width={pBarW} font={font} />
        <PowerBar label="P_out（输出）" value={result.P_output} width={pBarW} font={font} />
        <div className="text-emerald-600 font-semibold" style={{ fontSize: font(FONT.smallSize + 2) }}>
          {result.isShortCircuit ? '⚠ 短路：电流超出理想模型有限范围' : powerBalanced ? '✓ P_in = P_out 严格守恒' : '计算中…'}
        </div>
      </Card>

      <Card className="p-4 flex-1 min-h-0">
        <div className="font-semibold text-neutral-600 mb-3" style={{ fontSize: font(FONT.axisSize + 1) }}>动态因果链</div>
        <div className="flex flex-col gap-2">
          {chainSteps.map((step, i) => {
            const isLit = dominoStep === -1 || i <= dominoStep
            const isActive = dominoStep === i
            return (
              <div key={step.key} className="flex items-center gap-2">
                <div
                  className="flex-1 flex items-center justify-between rounded-md px-3 py-2 transition-all duration-200 border"
                  style={{
                    backgroundColor: isLit ? `${step.color}${HIGHLIGHT_ALPHA}` : 'transparent',
                    borderColor: isActive ? step.color : 'transparent',
                    transform: isActive ? 'scale(1.04)' : 'scale(1)',
                    opacity: isLit ? 1 : 0.35,
                  }}
                >
                  <span className="font-bold" style={{ fontSize: font(FONT.axisSize), color: isLit ? step.color : PHYSICS_COLORS.labelTextLight }}>
                    {step.label}
                  </span>
                  <span className="font-mono" style={{ fontSize: font(FONT.smallSize + 2), color: isLit ? step.color : PHYSICS_COLORS.labelTextLight }}>
                    {step.value.toFixed(2)} {step.unit}
                  </span>
                </div>
                {i < chainSteps.length - 1 && <span className="text-neutral-300" style={{ fontSize: font(FONT.smallSize + 2) }}>↓</span>}
              </div>
            )
          })}
        </div>
        <div className="mt-3 text-neutral-400 leading-relaxed" style={{ fontSize: font(FONT.smallSize + 2) }}>
          铁律：U₁→U₂→I₂→P_out→P_in→I₁
          <br />
          改变 R 触发多米诺高亮
        </div>
      </Card>
    </div>
  )
}
