import React from 'react'
import { Rheostat, DialMeter, CircuitSwitch } from '@/components/Physics'
import { PHYSICS_COLORS, CANVAS_COLORS, CIRCUIT_COLORS, withAlpha } from '@/theme/physics'
import type { UseExperimentErPhysicsResult } from '../hooks/useExperimentErPhysics'

export interface ExperimentErSceneProps {
  physics: UseExperimentErPhysicsResult
  font: (size: number) => number
}

/**
 * 测定电源电动势与内阻 SVG 场景渲染组件
 * - 纯正、典雅的高中物理教科书标准电路原理图
 * - 全面复用标准组件库（Rheostat variant="symbolic", DialMeter variant="symbolic", CircuitSwitch variant="symbolic"）
 * - 真实端子级点对点导线系统，零伪遮罩，零多余杂乱标注
 */
export const ExperimentErScene: React.FC<ExperimentErSceneProps> = ({ physics, font }) => {
  const {
    switchClosed,
    toggleSwitch,
    wiring,
    R_slider,
    showEquivalent,
    E_real,
    r_real,
    res,
    E_meas,
    r_meas,
    topology,
  } = physics

  const { bounds, source, switchS, rheostat, ammeter, voltmeter0, voltmeter1 } = topology

  return (
    <g className="experiment-er-scene select-none">
      {/* ===== 1. 高考核心模型：等效电源虚线框高亮 ===== */}
      {showEquivalent && (
        wiring === 0 ? (
          // 电路甲等效电源：电源盒 + 路端电压表
          <g>
            <rect
              x={bounds.left - 10}
              y={voltmeter0.center.y - 35}
              width={bounds.right - bounds.left + 20}
              height={bounds.bottom - voltmeter0.center.y + 55}
              fill={withAlpha(PHYSICS_COLORS.velocity, 0.05)}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={2}
              strokeDasharray="6,4"
              rx={10}
            />
            <rect x={bounds.left + 5} y={voltmeter0.center.y - 47} width={255} height={22} fill={PHYSICS_COLORS.velocity} rx={4} />
            <text x={bounds.left + 132} y={voltmeter0.center.y - 32} fill={CANVAS_COLORS.white} fontSize={font(11)} fontWeight="bold" textAnchor="middle">
              戴维南等效电源：E' = {E_meas.toFixed(2)}V, r' = {r_meas.toFixed(2)}Ω
            </text>
          </g>
        ) : (
          // 电路乙等效电源：电源盒 + 串联在干路的电流表
          <g>
            <rect
              x={bounds.left - 10}
              y={bounds.top - 30}
              width={bounds.right - bounds.left + 20}
              height={bounds.bottom - bounds.top + 50}
              fill={withAlpha(PHYSICS_COLORS.acceleration, 0.04)}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={2}
              strokeDasharray="6,4"
              rx={10}
            />
            <rect x={bounds.left + 5} y={bounds.top - 42} width={255} height={22} fill={PHYSICS_COLORS.acceleration} rx={4} />
            <text x={bounds.left + 132} y={bounds.top - 27} fill={CANVAS_COLORS.white} fontSize={font(11)} fontWeight="bold" textAnchor="middle">
              串联等效电源：E' = {E_meas.toFixed(2)}V, r' = {r_meas.toFixed(2)}Ω
            </text>
          </g>
        )
      )}

      {/* ===== 2. 真实端子级点对点导线系统（标准电气原理图实线，零伪遮罩） ===== */}
      <g stroke={CIRCUIT_COLORS.wire} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        {/* 底边导线 1：左下拐角 -> 待测电源负极输入端 */}
        <line x1={bounds.left} y1={bounds.bottom} x2={source.in.x} y2={bounds.bottom} />
        {/* 底边导线 2：待测电源正极输出端 -> 开关左触点 */}
        <line x1={source.out.x} y1={bounds.bottom} x2={switchS.in.x} y2={bounds.bottom} />
        {/* 底边导线 3：开关右触点 -> 右下拐角 */}
        <line x1={switchS.out.x} y1={bounds.bottom} x2={bounds.right} y2={bounds.bottom} />

        {/* 右竖导线：右下拐角 -> 右上拐角 */}
        <line x1={bounds.right} y1={bounds.bottom} x2={bounds.right} y2={bounds.top} />

        {/* 顶边导线 1：右上拐角 -> 电流表右端子 */}
        <line x1={bounds.right} y1={bounds.top} x2={ammeter.out.x} y2={bounds.top} />
        {/* 顶边导线 2：电流表左端子 -> 滑动变阻器右端子 */}
        <line x1={ammeter.in.x} y1={bounds.top} x2={rheostat.out.x} y2={bounds.top} />
        {/* 顶边导线 3：滑动变阻器左端子 -> 左上拐角 */}
        <line x1={rheostat.in.x} y1={bounds.top} x2={bounds.left} y2={bounds.top} />

        {/* 左竖导线：左上拐角 -> 左下拐角 */}
        <line x1={bounds.left} y1={bounds.top} x2={bounds.left} y2={bounds.bottom} />
      </g>

      {/* ===== 3. 底层器件：待测电源盒 (E=6.0V, r=2.0Ω) ===== */}
      <g transform={`translate(${source.in.x}, ${bounds.bottom})`}>
        {/* 待测电源整体虚线框 */}
        <rect
          x={0}
          y={-30}
          width={source.out.x - source.in.x}
          height={60}
          fill="none"
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1.5}
          strokeDasharray="4,3"
          rx={6}
        />
        <text
          x={(source.out.x - source.in.x) / 2}
          y={-36}
          fill={PHYSICS_COLORS.labelText}
          fontSize={font(11)}
          fontWeight="bold"
          textAnchor="middle"
        >
          待测电源 (E={E_real.toFixed(1)}V, r={r_real.toFixed(1)}Ω)
        </text>

        {/* 负极：短而粗 */}
        <line x1={25} y1={0} x2={40} y2={0} stroke={CIRCUIT_COLORS.wire} strokeWidth={3} />
        <line x1={40} y1={-12} x2={40} y2={12} stroke={CIRCUIT_COLORS.batteryNeg} strokeWidth={4} strokeLinecap="round" />
        <text x={30} y={-14} fill={CIRCUIT_COLORS.batteryNeg} fontSize={font(12)} fontWeight="bold">-</text>

        {/* 正极：长而细 */}
        <line x1={50} y1={-20} x2={50} y2={20} stroke={CIRCUIT_COLORS.batteryPos} strokeWidth={2.5} strokeLinecap="round" />
        <text x={58} y={-14} fill={CIRCUIT_COLORS.batteryPos} fontSize={font(12)} fontWeight="bold">+</text>

        {/* 串联内阻 r 标准矩形 */}
        <line x1={50} y1={0} x2={80} y2={0} stroke={CIRCUIT_COLORS.wire} strokeWidth={3} />
        <rect
          x={80}
          y={-10}
          width={36}
          height={20}
          fill={CIRCUIT_COLORS.resistorFill}
          stroke={CIRCUIT_COLORS.resistorStroke}
          strokeWidth={2}
          rx={2}
        />
        <text x={98} y={5} fill={CIRCUIT_COLORS.resistorStroke} fontSize={font(11)} fontWeight="bold" textAnchor="middle">r</text>
        <line x1={116} y1={0} x2={source.out.x - source.in.x} y2={0} stroke={CIRCUIT_COLORS.wire} strokeWidth={3} />
      </g>

      {/* ===== 4. 底层器件：开关 S (全面复用标准 CircuitSwitch 组件，variant="symbolic") ===== */}
      <CircuitSwitch
        x={switchS.center.x}
        y={bounds.bottom}
        closed={switchClosed}
        onToggle={toggleSwitch}
        label="S"
        variant="symbolic"
        font={font}
      />

      {/* ===== 5. 顶层器件：滑动变阻器（严格复用标准 Rheostat 组件，variant="symbolic"） ===== */}
      <Rheostat
        x={rheostat.center.x}
        y={rheostat.center.y}
        value={R_slider}
        min={1.0}
        max={50}
        width={rheostat.width}
        variant="symbolic"
        showLabel={true}
        font={font}
      />

      {/* ===== 6. 顶层器件：电流表 A（全面复用标准 DialMeter 组件，variant="symbolic"） ===== */}
      <DialMeter
        type="A"
        variant="symbolic"
        x={ammeter.center.x}
        y={ammeter.center.y}
        r={ammeter.radius}
        value={res.I_meas}
        font={font}
        showLabel={true}
      />

      {/* ===== 7. 电压表 V 及其支路（全面复用标准 DialMeter 组件，variant="symbolic"） ===== */}
      {wiring === 0 ? (
        // 【电路甲：电流表外接法】电压表清晰横跨在路端总外电路上
        <g>
          {/* 中层水平跨接导线 */}
          <line x1={bounds.left} y1={voltmeter0.center.y} x2={voltmeter0.in.x} y2={voltmeter0.center.y} stroke={CIRCUIT_COLORS.wire} strokeWidth={2.5} />
          <line x1={voltmeter0.out.x} y1={voltmeter0.center.y} x2={bounds.right} y2={voltmeter0.center.y} stroke={CIRCUIT_COLORS.wire} strokeWidth={2.5} />
          {/* 并联节点圆点 */}
          <circle cx={bounds.left} cy={voltmeter0.center.y} r={4.5} fill={CIRCUIT_COLORS.node} />
          <circle cx={bounds.right} cy={voltmeter0.center.y} r={4.5} fill={CIRCUIT_COLORS.node} />

          {/* 电压表标准原理图符号组件 */}
          <DialMeter
            type="V"
            variant="symbolic"
            x={voltmeter0.center.x}
            y={voltmeter0.center.y}
            r={voltmeter0.radius}
            value={res.U_meas}
            font={font}
            showLabel={true}
          />

          {/* 规范接法说明横幅 */}
          <rect x={290} y={15} width={260} height={24} rx={4} fill={withAlpha(PHYSICS_COLORS.velocity, 0.1)} stroke={PHYSICS_COLORS.velocity} strokeWidth={1} />
          <text x={420} y={31} fill={PHYSICS_COLORS.velocity} fontSize={font(11)} fontWeight="bold" textAnchor="middle">
            电路甲：电流表相对电源外接 (测路端总电压)
          </text>
        </g>
      ) : (
        // 【电路乙：电流表内接法】电压表直接并联在滑动变阻器两端
        <g>
          {/* 下凹并联支路导线 */}
          <path
            d={`M ${rheostat.out.x} ${bounds.top} L ${rheostat.out.x} ${voltmeter1.center.y} L ${voltmeter1.out.x} ${voltmeter1.center.y}`}
            fill="none"
            stroke={CIRCUIT_COLORS.wire}
            strokeWidth={2.5}
          />
          <path
            d={`M ${voltmeter1.in.x} ${voltmeter1.center.y} L ${rheostat.in.x} ${voltmeter1.center.y} L ${rheostat.in.x} ${bounds.top}`}
            fill="none"
            stroke={CIRCUIT_COLORS.wire}
            strokeWidth={2.5}
          />
          {/* 并联节点圆点 */}
          <circle cx={rheostat.in.x} cy={bounds.top} r={4.5} fill={CIRCUIT_COLORS.node} />
          <circle cx={rheostat.out.x} cy={bounds.top} r={4.5} fill={CIRCUIT_COLORS.node} />

          {/* 电压表标准原理图符号组件 */}
          <DialMeter
            type="V"
            variant="symbolic"
            x={voltmeter1.center.x}
            y={voltmeter1.center.y}
            r={voltmeter1.radius}
            value={res.U_meas}
            font={font}
            showLabel={true}
          />

          {/* 规范接法说明横幅 */}
          <rect x={290} y={15} width={260} height={24} rx={4} fill={withAlpha(PHYSICS_COLORS.acceleration, 0.1)} stroke={PHYSICS_COLORS.acceleration} strokeWidth={1} />
          <text x={420} y={31} fill={PHYSICS_COLORS.acceleration} fontSize={font(11)} fontWeight="bold" textAnchor="middle">
            电路乙：电流表相对电源内接 (测变阻器两端分压)
          </text>
        </g>
      )}
    </g>
  )
}
