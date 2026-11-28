import { FC, useMemo } from 'react'
import { Card } from '@/components/UI'
import { RelationChart } from '@/components/Chart'
import { useAnimationStore } from '@/stores'
import {
  calculateMotorCircuit,
  generateMotorPowerCurve,
  MOTOR_CIRCUIT_CONSTANTS,
} from '@/physics'
import { CHART_COLORS, PHYSICS_COLORS } from '@/theme/physics'

export const NonPureCircuitCenterExtra: FC = () => {
  const params = useAnimationStore((s) => s.params)

  const motorState = params.motorState ?? 1
  const chartMode = params.chartMode ?? 0
  const U = params.U ?? MOTOR_CIRCUIT_CONSTANTS.defaultU
  const mass = params.mass ?? MOTOR_CIRCUIT_CONSTANTS.defaultMass
  const r_M = params.r_M ?? MOTOR_CIRCUIT_CONSTANTS.defaultRM
  const R_protect = params.R_protect ?? MOTOR_CIRCUIT_CONSTANTS.defaultRProtect

  const res = useMemo(
    () =>
      calculateMotorCircuit({
        U,
        R_protect,
        r_M,
        motorState,
        mass,
      }),
    [U, R_protect, r_M, motorState, mass],
  )

  const powerCurve = useMemo(
    () => generateMotorPowerCurve(U, R_protect, r_M, 80),
    [U, R_protect, r_M],
  )

  const pMechPoints = useMemo(
    () => powerCurve.map((pt) => ({ x: pt.I, y: pt.P_mech })),
    [powerCurve],
  )

  const additionalSeries = useMemo(
    () => [
      {
        points: powerCurve.map((pt) => ({ x: pt.I, y: pt.P_total })),
        label: '电源总功率 P总',
        color: PHYSICS_COLORS.power,
        strokeDasharray: [5, 4],
        strokeWidth: 1.8,
      },
      {
        points: powerCurve.map((pt) => ({ x: pt.I, y: pt.P_heat_total })),
        label: '回路总热功率 P热',
        color: PHYSICS_COLORS.internalEnergy,
        strokeWidth: 1.8,
      },
    ],
    [powerCurve],
  )

  if (chartMode === 1) {
    const xMax = Math.max(1, res.I_stall * 1.18)
    const yMax = Math.max(12, U * res.I_stall * 1.42)
    const nearOpt = Math.abs(res.I - res.I_opt) < res.I_stall * 0.15
    const nearStall = Math.abs(res.I - res.I_stall) < res.I_stall * 0.15

    return (
      <div className="w-full h-full px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50 min-h-0 select-none">
        <Card className="w-full h-full p-2 bg-white overflow-hidden">
          <RelationChart
            title={`回路功率 - 电流特性图像（U = ${U.toFixed(1)} V, R保+rM = ${(R_protect + r_M).toFixed(1)} Ω）`}
            xLabel="I (A)"
            yLabel="P (W)"
            points={pMechPoints}
            mainLabel="输出机械功率 P机"
            color={PHYSICS_COLORS.work}
            strokeWidth={2.5}
            additionalSeries={additionalSeries}
            xDomain={[0, xMax]}
            yDomain={[0, yMax]}
            cursorX={res.I}
            cursorLabel={(iVal) =>
              nearOpt || nearStall ? null : `(${iVal.toFixed(2)}A, ${res.P_mech.toFixed(1)}W)`
            }
            markers={[
              {
                axis: 'point',
                x: res.I_opt,
                y: res.P_mech_max,
                label: nearOpt
                  ? `峰值(${res.I_opt.toFixed(2)}A, ${res.P_mech_max.toFixed(1)}W)`
                  : `Pmax=${res.P_mech_max.toFixed(1)}W`,
                color: CHART_COLORS.criticalPt,
                labelSide: 'top-left',
              },
              {
                axis: 'point',
                x: res.I_stall,
                y: 0,
                label: `I卡=${res.I_stall.toFixed(2)}A`,
                color: PHYSICS_COLORS.electricCurrent,
                labelSide: 'top-right',
              },
            ]}
          />
        </Card>
      </div>
    )
  }

  const rProtectPct = res.P_total > 0 ? (res.P_heat_R / res.P_total) * 100 : 0
  const motorInPct = res.P_total > 0 ? (res.P_in_motor / res.P_total) * 100 : 0
  const motorHeatInMotorPct = res.P_in_motor > 0 ? (res.P_heat_M / res.P_in_motor) * 100 : 0
  const motorMechInMotorPct = res.P_in_motor > 0 ? (res.P_mech / res.P_in_motor) * 100 : 0

  return (
    <div className="w-full h-full px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50 min-h-0 select-none">
      <Card className="w-full h-full p-3 flex flex-col justify-between bg-white min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-600">
              全回路电功率层级分配（同一功率标尺）
            </span>
            {res.isStalled && (
              <span className="px-2 py-0.5 rounded bg-danger-100 text-danger-700 text-[11px] font-semibold">
                {res.stallReason === 'overload' ? '重物过重 · 退化纯电阻' : '转轴卡住 · 退化纯电阻'}
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-neutral-700">
            总功率 P总 = {res.P_total.toFixed(2)} W
          </span>
        </div>

        {res.P_total > 0 ? (
          <div className="space-y-2.5 my-auto">
            {/* 第一层：P总 = P_R保 + P_入 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span>全回路电功分配：UI = I²R保 + U_M·I</span>
                <span>电机效率 η = {(res.efficiency * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full flex h-7 rounded-lg overflow-hidden border border-neutral-200/80 shadow-inner bg-neutral-100">
                {rProtectPct > 0 && (
                  <div
                    style={{
                      width: `${rProtectPct}%`,
                      backgroundColor: PHYSICS_COLORS.heatLoss,
                    }}
                    className="h-full flex items-center justify-center text-[10px] font-semibold text-white truncate px-1"
                    title={`保护电阻发热: ${res.P_heat_R.toFixed(2)} W`}
                  >
                    {rProtectPct > 14 ? `R保发热 ${res.P_heat_R.toFixed(1)}W` : ''}
                  </div>
                )}
                <div
                  style={{
                    width: `${motorInPct}%`,
                    backgroundColor: PHYSICS_COLORS.power,
                  }}
                  className="h-full flex items-center justify-center text-[10px] font-semibold text-white truncate px-1"
                  title={`电动机输入功率: ${res.P_in_motor.toFixed(2)} W`}
                >
                  {motorInPct > 14 ? `电机输入 ${res.P_in_motor.toFixed(1)}W` : ''}
                </div>
              </div>
            </div>

            {/* 第二层：在“电机输入”下方严格对齐拆分为 I²rM + P机 */}
            <div className="space-y-1">
              <div className="text-[11px] text-neutral-500">
                电动机内部能量转化（对齐上方「电机输入」）：U_M·I = I²rM + P机
              </div>
              <div className="w-full flex h-7">
                {rProtectPct > 0 && (
                  <div
                    style={{ width: `${rProtectPct}%` }}
                    className="h-full flex items-center justify-end pr-1.5 text-[10px] text-neutral-400 shrink-0"
                  >
                    {rProtectPct > 18 ? '↳ 仅分压发热' : ''}
                  </div>
                )}
                <div
                  style={{ width: `${motorInPct}%` }}
                  className="h-full flex rounded-lg overflow-hidden border border-neutral-200/80 shadow-inner bg-neutral-100"
                >
                  <div
                    style={{
                      width: `${motorHeatInMotorPct}%`,
                      backgroundColor: PHYSICS_COLORS.internalEnergy,
                    }}
                    className="h-full flex items-center justify-center text-[10px] font-semibold text-white truncate px-1"
                    title={`线圈内阻发热: ${res.P_heat_M.toFixed(2)} W`}
                  >
                    {motorHeatInMotorPct > 18 ? `线圈发热 ${res.P_heat_M.toFixed(1)}W` : ''}
                  </div>
                  {motorMechInMotorPct > 0 && (
                    <div
                      style={{
                        width: `${motorMechInMotorPct}%`,
                        backgroundColor: PHYSICS_COLORS.work,
                      }}
                      className="h-full flex items-center justify-center text-[10px] font-semibold text-white truncate px-1"
                      title={`输出机械功率: ${res.P_mech.toFixed(2)} W`}
                    >
                      {motorMechInMotorPct > 18 ? `机械输出 ${res.P_mech.toFixed(1)}W` : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-16 rounded flex items-center justify-center text-xs text-neutral-400 bg-neutral-100">
            电源未输出有效功率
          </div>
        )}

        {/* 底部数值摘要 */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-neutral-600 pt-1 border-t border-neutral-100">
          <span>R保发热：{res.P_heat_R.toFixed(2)} W ({rProtectPct.toFixed(0)}%)</span>
          <span>电机输入：{res.P_in_motor.toFixed(2)} W ({motorInPct.toFixed(0)}%)</span>
          <span>线圈发热：{res.P_heat_M.toFixed(2)} W</span>
          <span className="font-semibold text-neutral-800">
            输出机械：{res.P_mech.toFixed(2)} W
          </span>
        </div>
      </Card>
    </div>
  )
}

export default NonPureCircuitCenterExtra
