import type { SidebarExtraProps } from '@/data/types'
import { LeftPanelSection } from '@/components/UI'
import { TipCard } from '@/components/UI'

/** 气压语义标签 */
function pressureLabel(p: number): string {
  if (p <= 0.01) return '真空'
  if (p >= 0.99) return '标准大气压'
  return `${p.toFixed(2)} atm`
}

export default function FreeFallSidebar({
  params,
}: SidebarExtraProps) {
  const advancedMode = params.advancedMode ?? 0
  const isAdvanced = advancedMode === 1
  const pressure = params.pressure ?? 0

  return (
    <>
      {/* 基础模式：气压状态提示 */}
      {!isAdvanced && (
        <LeftPanelSection>
          <TipCard variant="info">
            <span className="font-semibold block mb-1">当前环境</span>
            <span>{pressureLabel(pressure)} — {pressure <= 0.01 ? '物体仅受重力' : '存在空气阻力'}</span>
          </TipCard>
        </LeftPanelSection>
      )}

      {/* 进阶模式：g 值显示 */}
      {isAdvanced && (
        <LeftPanelSection>
          <div className="flex justify-between text-xs">
            <span className="text-neutral-600">重力加速度 g</span>
            <span className="font-mono text-neutral-500 italic">{(params.g ?? 9.8).toFixed(3)} m/s²</span>
          </div>
          <TipCard variant="info" className="mt-2">
            由纬度和海拔自动计算
          </TipCard>
        </LeftPanelSection>
      )}
    </>
  )
}
