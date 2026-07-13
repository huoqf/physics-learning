import { FC } from 'react'
import { Card } from '@/components/UI'
import { useAnimationStore } from '@/stores'
import { calculateMotorCircuit } from '@/physics'

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
  const showWarning = res.I > 3.0

  return (
    <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50 animate-fade-in">
      <Card className="flex-[3] p-3 flex flex-col justify-center min-w-0 bg-neutral-900 text-white rounded-lg shadow-inner">
        <span className="text-xs font-semibold text-neutral-400 mb-3 block">
          能量分配与流向图表 (总输入功率 P_总 = {res.P_total.toFixed(2)} W)
        </span>

        {res.P_total > 0 ? (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                <span>第一层：全回路电功分配 (P_总 = P_保 + P_电动机)</span>
                <span>效率 (机/总): {((res.P_mech / res.P_total) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full flex h-6 rounded overflow-hidden border border-neutral-800 shadow-inner">
                <div
                  style={{ width: `${(P_heat_protect / res.P_total) * 100}%` }}
                  className="h-full bg-amber-600 flex items-center justify-center text-[9px] font-semibold text-white truncate"
                  title={`保护电阻发热功率: ${P_heat_protect.toFixed(2)} W`}
                >
                  {(P_heat_protect / res.P_total) > 0.1 ? `R保发热: ${P_heat_protect.toFixed(1)}W` : ''}
                </div>
                <div
                  style={{ width: `${(P_in_motor / res.P_total) * 100}%` }}
                  className="h-full bg-blue-600 flex items-center justify-center text-[9px] font-semibold text-white truncate"
                  title={`电动机输入电功率: ${P_in_motor.toFixed(2)} W`}
                >
                  {(P_in_motor / res.P_total) > 0.1 ? `电机输入: ${P_in_motor.toFixed(1)}W` : ''}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                <span>第二层：电动机内功消耗转换 (P_电动机 = P_热损 + P_机)</span>
                <span>电机内部机械转换率: {P_in_motor > 0 ? ((res.P_mech / P_in_motor) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="w-full flex h-6 rounded overflow-hidden border border-neutral-800 shadow-inner">
                <div
                  style={{ width: `${(res.P_heat_M / P_in_motor) * 100}%` }}
                  className="h-full bg-red-600 flex items-center justify-center text-[9px] font-semibold text-white truncate"
                  title={`电机内阻热耗: ${res.P_heat_M.toFixed(2)} W`}
                >
                  {(res.P_heat_M / P_in_motor) > 0.1 ? `电机内阻热: ${res.P_heat_M.toFixed(1)}W` : ''}
                </div>
                <div
                  style={{ width: `${(res.P_mech / P_in_motor) * 100}%` }}
                  className="h-full bg-emerald-600 flex items-center justify-center text-[9px] font-semibold text-white truncate"
                  title={`输出有用机械功率: ${res.P_mech.toFixed(2)} W`}
                >
                  {(res.P_mech / P_in_motor) > 0.1 ? `机械输出: ${res.P_mech.toFixed(1)}W` : ''}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-20 bg-neutral-950 rounded flex items-center justify-center text-xs text-neutral-500">
            无电流通过 (电源电压为 0V)
          </div>
        )}
      </Card>

      <Card className="flex-[2] p-3 flex flex-col justify-between min-w-0 bg-white border border-neutral-200/50">
        <div>
          <span className="text-xs font-bold text-neutral-700 block mb-2">
            非纯电阻电路能量特点
          </span>
          <div className="text-[10px] text-neutral-600 space-y-1.5 leading-relaxed">
            <p>
              <strong>① 纯电阻部分</strong>
              {"：保护电阻 R_保 纯发热，电功等于电热 (P = I²R_保)。适用于欧姆定律。"}
            </p>
            <p>
              <strong>② 非纯电阻部分</strong>
              {"：电机电能主要转换为重物的机械能，少部分由于线圈电阻发热流失。"}
            </p>
            {motorState === 0 ? (
              <p className="bg-red-50 text-red-700 p-1.5 rounded border border-red-100 font-semibold animate-pulse text-[9.5px]">
                {"【堵转预警】电动机被卡死，反电动势消失，等效为纯电阻 (r_M)。由于总电阻暴跌，电流激增，发热量飙升至最大，极易烧毁绕组。"}
              </p>
            ) : (
              <p className="bg-emerald-50 text-emerald-800 p-1.5 rounded border border-emerald-100 text-[9.5px]">
                {"【正常旋转】电功 W 大于焦耳热 Q。可用功率关系为：UI = I²r_M + P_机。欧姆定律不适用于电机整体。"}
              </p>
            )}
          </div>
        </div>

        {showWarning && motorState === 0 && (
          <div className="text-[8.5px] text-red-500 font-bold animate-pulse text-right">
            * 警告：检测到干路电流过载 ({res.I.toFixed(2)} A)！
          </div>
        )}
      </Card>
    </div>
  )
}

export default NonPureCircuitCenterExtra
