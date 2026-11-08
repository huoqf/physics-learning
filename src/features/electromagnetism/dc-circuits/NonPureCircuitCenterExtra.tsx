import { FC } from 'react'
import { Card } from '@/components/UI'
import { useAnimationStore } from '@/stores'
import { calculateMotorCircuit } from '@/physics'
import { PHYSICS_COLORS } from '@/theme/physics'

export const NonPureCircuitCenterExtra: FC = () => {
  const params = useAnimationStore((s) => s.params)

  const motorState = params.motorState ?? 1
  const U = params.U ?? 10
  const mass = params.mass ?? 0.5
  const R_protect = 2.0
  const r_M = 1.0
  const E_back = 5.0

  const res = calculateMotorCircuit(U, R_protect, r_M, motorState, E_back, mass)

  const P_in_motor = res.U_M * res.I
  const P_heat_protect = res.I * res.I * R_protect

  return (
    <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50 min-h-0 select-none">
      {/* 左侧：全回路电功分配 */}
      <Card className="flex-1 p-3 flex flex-col justify-between min-w-0 bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neutral-600">
            全回路电功分配
          </span>
          <span className="text-[11px] font-medium text-neutral-500">
            P_总 = {res.P_total.toFixed(2)} W
          </span>
        </div>

        {res.P_total > 0 ? (
          <div className="space-y-3 my-auto">
            <div className="w-full flex h-7 rounded-lg overflow-hidden border border-neutral-200/80 shadow-inner">
              <div
                style={{
                  width: `${(P_heat_protect / res.P_total) * 100}%`,
                  backgroundColor: PHYSICS_COLORS.heatLoss,
                }}
                className="h-full flex items-center justify-center text-[10px] font-semibold text-white truncate px-1"
                title={`保护电阻发热功率: ${P_heat_protect.toFixed(2)} W`}
              >
                {(P_heat_protect / res.P_total) > 0.15 ? `R保发热: ${P_heat_protect.toFixed(1)}W` : ''}
              </div>
              <div
                style={{
                  width: `${(P_in_motor / res.P_total) * 100}%`,
                  backgroundColor: PHYSICS_COLORS.power,
                }}
                className="h-full flex items-center justify-center text-[10px] font-semibold text-white truncate px-1"
                title={`电动机输入电功率: ${P_in_motor.toFixed(2)} W`}
              >
                {(P_in_motor / res.P_total) > 0.15 ? `电机输入: ${P_in_motor.toFixed(1)}W` : ''}
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-neutral-500 px-0.5">
              <span>保护电阻损耗: {((P_heat_protect / res.P_total) * 100).toFixed(1)}%</span>
              <span>电机总输入: {((P_in_motor / res.P_total) * 100).toFixed(1)}%</span>
            </div>
          </div>
        ) : (
          <div className="h-16 rounded flex items-center justify-center text-xs text-neutral-400 bg-neutral-100">
            无电流通过 (电源电压为 0V)
          </div>
        )}
      </Card>

      {/* 右侧：电动机内部能量转换 */}
      <Card className="flex-1 p-3 flex flex-col justify-between min-w-0 bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-neutral-600">
            电动机内部能量转换
          </span>
          <span className="text-[11px] font-medium text-neutral-500">
            内部机械转换率: {P_in_motor > 0 ? ((res.P_mech / P_in_motor) * 100).toFixed(1) : 0}%
          </span>
        </div>

        {P_in_motor > 0 ? (
          <div className="space-y-3 my-auto">
            <div className="w-full flex h-7 rounded-lg overflow-hidden border border-neutral-200/80 shadow-inner">
              <div
                style={{
                  width: `${(res.P_heat_M / P_in_motor) * 100}%`,
                  backgroundColor: PHYSICS_COLORS.internalEnergy,
                }}
                className="h-full flex items-center justify-center text-[10px] font-semibold text-white truncate px-1"
                title={`线圈内阻热耗: ${res.P_heat_M.toFixed(2)} W`}
              >
                {(res.P_heat_M / P_in_motor) > 0.15 ? `内阻发热: ${res.P_heat_M.toFixed(1)}W` : ''}
              </div>
              <div
                style={{
                  width: `${(res.P_mech / P_in_motor) * 100}%`,
                  backgroundColor: PHYSICS_COLORS.work,
                }}
                className="h-full flex items-center justify-center text-[10px] font-semibold text-white truncate px-1"
                title={`有用机械输出: ${res.P_mech.toFixed(2)} W`}
              >
                {(res.P_mech / P_in_motor) > 0.15 ? `机械输出: ${res.P_mech.toFixed(1)}W` : ''}
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-neutral-500 px-0.5">
              <span>线圈内阻热耗: {((res.P_heat_M / P_in_motor) * 100).toFixed(1)}%</span>
              <span className="font-semibold text-neutral-700">有用机械做功: {((res.P_mech / P_in_motor) * 100).toFixed(1)}%</span>
            </div>
          </div>
        ) : (
          <div className="h-16 rounded flex items-center justify-center text-xs text-neutral-400 bg-neutral-100">
            {motorState === 0 ? '电动机堵转 (有用输出为 0W)' : '电动机未输入功率'}
          </div>
        )}
      </Card>
    </div>
  )
}

export default NonPureCircuitCenterExtra
