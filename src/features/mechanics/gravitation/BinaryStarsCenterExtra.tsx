import { EnergyBars } from '@/components/Physics/EnergyBars'
import { useBinaryStars } from './hooks/useBinaryStars'
import { PHYSICS_COLORS } from '@/theme/physics'

export default function BinaryStarsCenterExtra() {
  const state = useBinaryStars()

  if (!state) {
    return (
      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">
        数据计算中…
      </div>
    )
  }

  // 1. 双星模式下的图表数据
  if (state.mode === 0) {
    const { m1, m2, r1, r2, v1, v2, L } = state

    
    // 计算比值
    const rRatio = r1 / r2
    const vRatio = v1 / v2
    const mInverseRatio = m2 / m1 // 质量反比：m2 / m1

    // 计算向心加速度：a = v^2 / r = G * m_other / L^2
    const a1 = m2 / (L * L) // G = 1.0
    const a2 = m1 / (L * L)
    const aRatio = a1 / a2

    // 计算向心力大小：F = G * m1 * m2 / L^2
    const F_val = (m1 * m2) / (L * L)

    const ratioItems = [
      {
        key: 'rRatio',
        label: '轨道半径比\n(r₁/r₂)',
        value: rRatio,
        color: PHYSICS_COLORS.displacement,
        displayValue: rRatio.toFixed(2),
      },
      {
        key: 'vRatio',
        label: '线速度比\n(v₁/v₂)',
        value: vRatio,
        color: PHYSICS_COLORS.velocity,
        displayValue: vRatio.toFixed(2),
      },
      {
        key: 'aRatio',
        label: '向心加速度比\n(a₁/a₂)',
        value: aRatio,
        color: PHYSICS_COLORS.acceleration,
        displayValue: aRatio.toFixed(2),
      },
    ]

    const forceItems = [
      {
        key: 'F1',
        label: '星1向心力\n(F₁)',
        value: F_val,
        color: '#EA580C', // 橙色合力色
        displayValue: F_val.toFixed(2) + ' N',
      },
      {
        key: 'F2',
        label: '星2向心力\n(F₂)',
        value: F_val,
        color: '#EA580C',
        displayValue: F_val.toFixed(2) + ' N',
      },
    ]

    return (
      <div className="w-full h-full flex flex-col gap-3 p-3 bg-neutral-50/50 overflow-y-auto">
        <div className="flex-1 min-h-[220px]">
          <EnergyBars
            title="高考考点一：双星“三个反比”校验"
            items={ratioItems}
            initialEtot={mInverseRatio} // 借用 initialEtot 属性来绘制质量反比 m2/m1 的虚线参考线
            compact
          />
        </div>
        <div className="flex-1 min-h-[170px]">
          <EnergyBars
            title="高考考点二：向心力 F₁ 与 F₂ 大小对比 (N)"
            items={forceItems}
            compact
          />
        </div>
        {/* 底部文字解说 */}
        <div className="text-[11px] leading-relaxed text-neutral-500 bg-white rounded-lg p-2.5 border border-neutral-200/50 shadow-sm shrink-0">
          <span className="font-bold text-neutral-700 block mb-1">💡 实时规律总结：</span>
          1. <strong>三个反比</strong>：半径比、速度比、加速度比实时相等，且永远顶在“质量反比（虚线）”上。<br />
          2. <strong>受力相等</strong>：无论质量比滑块如何拉动，F₁ 与 F₂ 永远 1:1 相等，代表万有引力与向心力的守恒关系。
        </div>
      </div>
    )
  }

  // 2. 三星模式下的图表数据
  const { r, L } = state

  const starMass = 5.0
  const fNetVal = Math.sqrt(3) * starMass * starMass / (L * L)

  const tripleRatioItems = [
    {
      key: 'r1',
      label: '轨道半径 r₁\n(m)',
      value: r,
      color: PHYSICS_COLORS.displacement,
      displayValue: r.toFixed(2),
    },
    {
      key: 'r2',
      label: '轨道半径 r₂\n(m)',
      value: r,
      color: PHYSICS_COLORS.displacement,
      displayValue: r.toFixed(2),
    },
    {
      key: 'r3',
      label: '轨道半径 r₃\n(m)',
      value: r,
      color: PHYSICS_COLORS.displacement,
      displayValue: r.toFixed(2),
    },
  ]

  const tripleForceItems = [
    {
      key: 'F_net1',
      label: '星1合外力\n(F_合1)',
      value: fNetVal,
      color: '#EA580C',
      displayValue: fNetVal.toFixed(2) + ' N',
    },
    {
      key: 'F_net2',
      label: '星2合外力\n(F_合2)',
      value: fNetVal,
      color: '#EA580C',
      displayValue: fNetVal.toFixed(2) + ' N',
    },
    {
      key: 'F_net3',
      label: '星3合外力\n(F_合3)',
      value: fNetVal,
      color: '#EA580C',
      displayValue: fNetVal.toFixed(2) + ' N',
    },
  ]

  return (
    <div className="w-full h-full flex flex-col gap-3 p-3 bg-neutral-50/50 overflow-y-auto">
      <div className="flex-1 min-h-[220px]">
        <EnergyBars
          title="等边三星：轨道半径对比 (m)"
          items={tripleRatioItems}
          compact
        />
      </div>
      <div className="flex-1 min-h-[170px]">
        <EnergyBars
          title="等边三星：合向心力对比 (N)"
          items={tripleForceItems}
          compact
        />
      </div>
      {/* 底部文字解说 */}
      <div className="text-[11px] leading-relaxed text-neutral-500 bg-white rounded-lg p-2.5 border border-neutral-200/50 shadow-sm shrink-0">
        <span className="font-bold text-neutral-700 block mb-1">💡 三星运行规律：</span>
        1. 每颗星受另外两颗星引力夹角为 60°，合力实时指向三角形几何中心。<br />
        2. 三星对称分布，轨道半径与受到的合外力完全相等，保持完全稳定的旋转。
      </div>
    </div>
  )
}
