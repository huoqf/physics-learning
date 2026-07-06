import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateCapacitor } from '@/physics'
import { EnergyBars, EnergyBarItem } from '@/components/Physics/EnergyBars'
import { PHYSICS_COLORS } from '@/theme/physics'

// 物理常数定义 (SI)
const EPS0 = 8.854e-12

// 断开电源时保持的电荷基准
const Q_FIXED = EPS0 * (100 * 1e-4) / (5 * 1e-3) * 12

// 联动柱状图的最大参考值（用于折算 0% - 100% 柱高）
const C_MAX = EPS0 * 5 * (200 * 1e-4) / (2 * 1e-3) * 1e12  // 约 442.7 pF
const Q_MAX = C_MAX * 12                                   // 约 5312.4 pC
const U_MAX = 48.0                                         // 约 48 V
const E_MAX = 12.0 / (2 * 1e-3)                             // 6000 V/m

/**
 * 平行板电容器 — 物理量相对百分比联动柱状图
 * 使用 EnergyBars 通用组件渲染
 */
export default function CapacitorChart() {
  const params = useAnimationStore(
    useShallow((s) => s.params)
  )

  const { S = 100, d = 5, epsilon_r = 1, U = 12, connected = 1 } = params
  const isConnected = connected >= 0.5

  // 物理计算
  const { C } = calculateCapacitor(EPS0 * epsilon_r, S * 1e-4, d * 1e-3)
  const voltage = isConnected ? U : Q_FIXED / C
  const charge = isConnected ? C * voltage : Q_FIXED
  const field = voltage / (d * 1e-3)

  // 转换成 pF, pC
  const cPF = C * 1e12
  const qPC = charge * 1e12

  // 归一化到 0-100 范围（相对于各自最大参考值的百分比）
  const normC = Math.max(2, Math.min(100, (cPF / C_MAX) * 100))
  const normQ = Math.max(2, Math.min(100, (qPC / Q_MAX) * 100))
  const normU = Math.max(2, Math.min(100, (voltage / U_MAX) * 100))
  const normE = Math.max(2, Math.min(100, (field / E_MAX) * 100))

  const items: EnergyBarItem[] = [
    { 
      key: 'C', 
      label: "C\n电容", 
      value: normC, 
      color: PHYSICS_COLORS.capacitor,
      textColor: PHYSICS_COLORS.capacitor,
      displayValue: `${cPF.toFixed(1)} pF`
    },
    { 
      key: 'Q', 
      label: "Q\n电量", 
      value: normQ, 
      color: PHYSICS_COLORS.positiveCharge,
      textColor: PHYSICS_COLORS.positiveCharge,
      displayValue: `${qPC.toFixed(1)} pC`
    },
    { 
      key: 'U', 
      label: "U\n电压", 
      value: normU, 
      color: PHYSICS_COLORS.electricPotential,
      textColor: PHYSICS_COLORS.electricPotential,
      displayValue: `${voltage.toFixed(1)} V`
    },
    { 
      key: 'E', 
      label: "E\n场强", 
      value: normE, 
      color: PHYSICS_COLORS.electricField,
      textColor: PHYSICS_COLORS.electricField,
      displayValue: `${Math.round(field)} V/m`
    },
  ]

  const title = `S = ${S} cm² | d = ${d.toFixed(1)} mm | ${epsilon_r > 1.5 ? '电介质 (εᵣ=5.0)' : '真空环境 (εᵣ=1.0)'}`

  return (
    <EnergyBars
      items={items}
      title={title}
      compact
    />
  )
}
