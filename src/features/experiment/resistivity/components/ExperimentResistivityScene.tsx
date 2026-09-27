import React from 'react'
import {
  PHYSICS_COLORS,
  CANVAS_COLORS,
  SCENE_COLORS,
  CIRCUIT_COLORS,
  withAlpha,
} from '@/theme/physics'
import {
  DialMeter,
  Rheostat,
  CircuitSwitch,
  DCSource,
  getDCSourceTerminals,
  LabRuler,
  Micrometer,
} from '@/components/Physics'
import { useExperimentResistivityPhysics } from '../hooks/useExperimentResistivityPhysics'

interface ExperimentResistivitySceneProps {
  physics: ReturnType<typeof useExperimentResistivityPhysics>
  font: (size: number) => number
}

export const ExperimentResistivityScene: React.FC<ExperimentResistivitySceneProps> = ({
  physics,
  font,
}) => {
  const {
    L,
    d_mm,
    wiring,
    R_slider,
    Rx_real,
    currentA,
    voltageV,
  } = physics

  // ────────────────── 左半区：标准伏安法电路原理图 ──────────────────
  // 矩形干路骨架：左竖干线 x=65，右竖干线 x=425，顶横干线 y=95，底横干线 y=255
  const busLeft = 65
  const busRight = 425
  const busTop = 95
  const busBottom = 255

  // 1. 电源 DCSource（垂直放置于左竖干线，长正极在上，短粗负极在下）
  const posDC = { x: busLeft, y: 175 }
  const dcTerms = getDCSourceTerminals(posDC.x, posDC.y, 'right-positive')
  const dcTopTerm = dcTerms.posTerm // 正极引线端子（顶端）
  const dcBottomTerm = dcTerms.negTerm // 负极引线端子（底端）

  // 2. 开关 CircuitSwitch（置于底横干线左段）
  const posSW = { x: 160, y: busBottom }
  const swLeftTerm = { x: posSW.x - 18, y: busBottom }
  const swRightTerm = { x: posSW.x + 18, y: busBottom }

  // 3. 滑动变阻器 Rheostat（限流式置于底横干线右段，水平连接）
  const posRh = { x: 310, y: busBottom, w: 110 }
  const rhScale = posRh.w / 140
  const rhLeftTerm = { x: posRh.x - 73 * rhScale, y: busBottom } // 约 252.6
  const rhRightTerm = { x: posRh.x + 73 * rhScale, y: busBottom } // 约 367.4

  // 4. 测量支路元器件（顶横干线与中间电压表）
  const vmY = 175
  const vmR = 26

  return (
    <g className="experiment-resistivity-scene select-none">
      {/* ────────────────── 左半区：标准伏安法电路原理图工位 ────────────────── */}
      <g className="left-circuit-area">
        {/* 底盘背景卡片 */}
        <rect
          x={15}
          y={12}
          width={470}
          height={302}
          rx={8}
          fill={withAlpha(CANVAS_COLORS.axis, 0.03)}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1}
        />
        {/* 区域标题 */}
        <text
          x={28}
          y={34}
          fill={CANVAS_COLORS.labelText}
          fontSize={font(12)}
          fontWeight="bold"
        >
          伏安法测电阻标准电路原理图
        </text>

        {/* 接法指示徽章（与标题间距充足） */}
        <g transform="translate(305, 18)">
          <rect
            x={0}
            y={0}
            width={165}
            height={22}
            rx={4}
            fill={withAlpha(CIRCUIT_COLORS.wire, 0.08)}
            stroke={CIRCUIT_COLORS.wire}
            strokeWidth={1}
          />
          <text
            x={82.5}
            y={15}
            textAnchor="middle"
            fill={CANVAS_COLORS.labelText}
            fontSize={font(10)}
            fontWeight="bold"
          >
            {wiring === 0 ? '电流表外接法 (测小电阻推荐)' : '电流表内接法 (电表分压)'}
          </text>
        </g>

        {/* ── 核心供电回路导线（横平竖直） ── */}
        {/* 1. 电源负极 -> 左下拐角 (65, 255) -> 开关 S 左端 */}
        <path
          d={`M ${dcBottomTerm.x} ${dcBottomTerm.y} L ${busLeft} ${busBottom} L ${swLeftTerm.x} ${busBottom}`}
          fill="none"
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />

        {/* 2. 开关 S 右端 -> 滑动变阻器滑杆输入端 */}
        <line
          x1={swRightTerm.x}
          y1={busBottom}
          x2={rhLeftTerm.x}
          y2={busBottom}
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={2.2}
        />

        {/* 3. 滑动变阻器电阻输出端 -> 右下拐角 (425, 255) -> 右上拐角 (425, 95) */}
        <path
          d={`M ${rhRightTerm.x} ${busBottom} L ${busRight} ${busBottom} L ${busRight} ${busTop}`}
          fill="none"
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />

        {/* 4. 电源正极 -> 左上拐角 (65, 95) */}
        <line
          x1={dcTopTerm.x}
          y1={dcTopTerm.y}
          x2={busLeft}
          y2={busTop}
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={2.2}
        />

        {/* ── 电源组件 DCSource（垂直标准长正短负符号） ── */}
        <DCSource
          x={posDC.x}
          y={posDC.y}
          voltage={4.0}
          type="symbol"
          label="E=4V, r=0.5Ω"
          polarity="right-positive"
        />

        {/* ── 开关组件 CircuitSwitch ── */}
        <CircuitSwitch
          x={posSW.x}
          y={posSW.y}
          closed={true}
          variant="symbolic"
          font={font}
          label="S"
        />

        {/* ── 滑动变阻器组件 Rheostat ── */}
        <Rheostat
          x={posRh.x}
          y={posRh.y}
          width={posRh.w}
          value={R_slider}
          min={5}
          max={50}
          variant="symbolic"
          font={font}
          label="变阻器 R"
          showLabel
        />

        {/* ── 顶层测量拓扑（外接法 vs 内接法） ── */}
        {wiring === 0 ? (
          /* ──────── 外接法（标准教科书电路） ────────
             干路：左上拐角 (65, 95) -> 电流表 A -> 节点 1 (205, 95) -> 待测电阻 Rx (275, 95) -> 节点 2 (345, 95) -> 右上拐角 (425, 95)
             电压表并联跨接在 节点 1 与 节点 2 之间
          */
          <g className="wiring-outer-standard">
            {/* 左上拐角 -> 电流表 A 左端 */}
            <line x1={busLeft} y1={busTop} x2={110} y2={busTop} stroke={CIRCUIT_COLORS.wire} strokeWidth={2.2} />

            {/* 电流表 A (中心 x=140, y=95) */}
            <DialMeter type="A" variant="symbolic" value={currentA} max={1.5} x={140} y={busTop} r={vmR} font={font} showLabel={false} />
            <text x={140} y={busTop - vmR - 6} textAnchor="middle" fill={PHYSICS_COLORS.electricCurrent} fontSize={font(10.5)} fontWeight="bold">
              I = {currentA.toFixed(3)} A
            </text>
            <text x={140 - vmR - 6} y={busTop - 4} fill={PHYSICS_COLORS.acceleration} fontSize={font(9)} fontWeight="bold">+</text>
            <text x={140 + vmR + 6} y={busTop - 4} fill={CANVAS_COLORS.textMuted} fontSize={font(9)} fontWeight="bold">-</text>

            {/* 电流表 A 右端 -> 节点 1 (205, 95) */}
            <line x1={170} y1={busTop} x2={205} y2={busTop} stroke={CIRCUIT_COLORS.wire} strokeWidth={2.2} />
            <circle cx={205} cy={busTop} r={3.5} fill={CIRCUIT_COLORS.node} />

            {/* 节点 1 -> 待测电阻 Rx 左端 (245, 95) */}
            <line x1={205} y1={busTop} x2={245} y2={busTop} stroke={CIRCUIT_COLORS.wire} strokeWidth={2.2} />

            {/* 待测金属丝电阻框符号 (中心 x=275, y=95, 宽 60, 高 22) */}
            <rect x={245} y={busTop - 11} width={60} height={22} fill={CANVAS_COLORS.white} stroke={PHYSICS_COLORS.emf} strokeWidth={2.2} />
            <text x={275} y={busTop - 16} textAnchor="middle" fill={PHYSICS_COLORS.emf} fontSize={font(10.5)} fontWeight="bold">
              金属丝 Rx (L={L.toFixed(2)}m)
            </text>
            <text x={275} y={busTop + 5} textAnchor="middle" fill={CANVAS_COLORS.labelText} fontSize={font(9.5)} fontWeight="bold">
              Rx(真)={Rx_real.toFixed(2)}Ω
            </text>

            {/* 待测电阻 Rx 右端 (305, 95) -> 节点 2 (345, 95) -> 右上拐角 */}
            <line x1={305} y1={busTop} x2={345} y2={busTop} stroke={CIRCUIT_COLORS.wire} strokeWidth={2.2} />
            <circle cx={345} cy={busTop} r={3.5} fill={CIRCUIT_COLORS.node} />
            <line x1={345} y1={busTop} x2={busRight} y2={busTop} stroke={CIRCUIT_COLORS.wire} strokeWidth={2.2} />

            {/* 电压表支路：节点 1 (205, 95) -> 电压表 V -> 节点 2 (345, 95) */}
            <path
              d={`M 205 ${busTop} L 205 ${vmY} L ${275 - vmR} ${vmY}`}
              fill="none"
              stroke={PHYSICS_COLORS.electricPotential}
              strokeWidth={1.8}
              strokeDasharray="4,3"
              strokeLinejoin="round"
            />
            <path
              d={`M ${275 + vmR} ${vmY} L 345 ${vmY} L 345 ${busTop}`}
              fill="none"
              stroke={PHYSICS_COLORS.electricPotential}
              strokeWidth={1.8}
              strokeDasharray="4,3"
              strokeLinejoin="round"
            />

            {/* 电压表 V (中心 x=275, y=175) */}
            <DialMeter type="V" variant="symbolic" value={voltageV} max={4} x={275} y={vmY} r={vmR} font={font} showLabel={false} />
            <text x={275} y={vmY + vmR + 15} textAnchor="middle" fill={PHYSICS_COLORS.electricPotential} fontSize={font(10.5)} fontWeight="bold">
              U = {voltageV.toFixed(2)} V
            </text>
            <text x={275 - vmR - 6} y={vmY - 4} fill={PHYSICS_COLORS.acceleration} fontSize={font(9)} fontWeight="bold">+</text>
            <text x={275 + vmR + 6} y={vmY - 4} fill={CANVAS_COLORS.textMuted} fontSize={font(9)} fontWeight="bold">-</text>
          </g>
        ) : (
          /* ──────── 内接法（标准教科书电路） ────────
             干路：左上拐角 (65, 95) -> 节点 1 (115, 95) -> 电流表 A (160) -> 待测电阻 Rx (275) -> 节点 2 (365, 95) -> 右上拐角
             电压表并联跨接在 节点 1 与 节点 2 两端 (把电流表与 Rx 整体包入)
          */
          <g className="wiring-inner-standard">
            {/* 左上拐角 -> 节点 1 (115, 95) */}
            <line x1={busLeft} y1={busTop} x2={115} y2={busTop} stroke={CIRCUIT_COLORS.wire} strokeWidth={2.2} />
            <circle cx={115} cy={busTop} r={3.5} fill={CIRCUIT_COLORS.node} />

            {/* 节点 1 -> 电流表 A 左端 (135, 95) */}
            <line x1={115} y1={busTop} x2={135} y2={busTop} stroke={CIRCUIT_COLORS.wire} strokeWidth={2.2} />

            {/* 电流表 A (中心 x=165, y=95) */}
            <DialMeter type="A" variant="symbolic" value={currentA} max={1.5} x={165} y={busTop} r={vmR} font={font} showLabel={false} />
            <text x={165} y={busTop - vmR - 6} textAnchor="middle" fill={PHYSICS_COLORS.electricCurrent} fontSize={font(10.5)} fontWeight="bold">
              I = {currentA.toFixed(3)} A
            </text>
            <text x={165 - vmR - 6} y={busTop - 4} fill={PHYSICS_COLORS.acceleration} fontSize={font(9)} fontWeight="bold">+</text>
            <text x={165 + vmR + 6} y={busTop - 4} fill={CANVAS_COLORS.textMuted} fontSize={font(9)} fontWeight="bold">-</text>

            {/* 电流表 A 右端 -> 待测电阻 Rx 左端 (245, 95) */}
            <line x1={195} y1={busTop} x2={245} y2={busTop} stroke={CIRCUIT_COLORS.wire} strokeWidth={2.2} />

            {/* 待测金属丝电阻框符号 (中心 x=275, y=95, 宽 60, 高 22) */}
            <rect x={245} y={busTop - 11} width={60} height={22} fill={CANVAS_COLORS.white} stroke={PHYSICS_COLORS.emf} strokeWidth={2.2} />
            <text x={275} y={busTop - 16} textAnchor="middle" fill={PHYSICS_COLORS.emf} fontSize={font(10.5)} fontWeight="bold">
              金属丝 Rx (L={L.toFixed(2)}m)
            </text>
            <text x={275} y={busTop + 5} textAnchor="middle" fill={CANVAS_COLORS.labelText} fontSize={font(9.5)} fontWeight="bold">
              Rx(真)={Rx_real.toFixed(2)}Ω
            </text>

            {/* 待测电阻 Rx 右端 (305, 95) -> 节点 2 (365, 95) -> 右上拐角 */}
            <line x1={305} y1={busTop} x2={365} y2={busTop} stroke={CIRCUIT_COLORS.wire} strokeWidth={2.2} />
            <circle cx={365} cy={busTop} r={3.5} fill={CIRCUIT_COLORS.node} />
            <line x1={365} y1={busTop} x2={busRight} y2={busTop} stroke={CIRCUIT_COLORS.wire} strokeWidth={2.2} />

            {/* 电压表支路：跨接在 节点 1 (115, 95) 与 节点 2 (365, 95) 两端 */}
            <path
              d={`M 115 ${busTop} L 115 ${vmY} L ${240 - vmR} ${vmY}`}
              fill="none"
              stroke={PHYSICS_COLORS.electricPotential}
              strokeWidth={1.8}
              strokeDasharray="4,3"
              strokeLinejoin="round"
            />
            <path
              d={`M ${240 + vmR} ${vmY} L 365 ${vmY} L 365 ${busTop}`}
              fill="none"
              stroke={PHYSICS_COLORS.electricPotential}
              strokeWidth={1.8}
              strokeDasharray="4,3"
              strokeLinejoin="round"
            />

            {/* 电压表 V (中心 x=240, y=175) */}
            <DialMeter type="V" variant="symbolic" value={voltageV} max={4} x={240} y={vmY} r={vmR} font={font} showLabel={false} />
            <text x={240} y={vmY + vmR + 15} textAnchor="middle" fill={PHYSICS_COLORS.electricPotential} fontSize={font(10.5)} fontWeight="bold">
              U = {voltageV.toFixed(2)} V
            </text>
            <text x={240 - vmR - 6} y={vmY - 4} fill={PHYSICS_COLORS.acceleration} fontSize={font(9)} fontWeight="bold">+</text>
            <text x={240 + vmR + 6} y={vmY - 4} fill={CANVAS_COLORS.textMuted} fontSize={font(9)} fontWeight="bold">-</text>
          </g>
        )}
      </g>

      {/* ────────────────── 右半区：核心测量工具真实工位 ────────────────── */}
      <g className="right-tools-area" transform="translate(500, 12)">
        {/* 背景托盘卡片 */}
        <rect
          x={0}
          y={0}
          width={325}
          height={302}
          rx={8}
          fill={withAlpha(CANVAS_COLORS.axis, 0.03)}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1}
        />

        {/* ── 环节 1：刻度尺测量金属丝有效长度 L ── */}
        <g className="ruler-station" transform="translate(15, 14)">
          <text x={0} y={14} fill={CANVAS_COLORS.labelText} fontSize={font(11)} fontWeight="bold">
            ① 毫米刻度尺：测金属丝接入有效长度 L
          </text>

          {/* 金属丝导轨与刻度尺 */}
          <g transform="translate(15, 30)">
            {/* 金属丝安装底座 */}
            <line x1={0} y1={-4} x2={260} y2={-4} stroke={SCENE_COLORS.surface.groundStroke} strokeWidth={2.5} strokeLinecap="round" />
            {/* 有效接入导电段高亮 */}
            <line x1={0} y1={-4} x2={(L / 0.8) * 260} y2={-4} stroke={PHYSICS_COLORS.emf} strokeWidth={3.5} strokeLinecap="round" />

            {/* 端点 A 固定接线夹 */}
            <circle cx={0} cy={-4} r={4.5} fill={CIRCUIT_COLORS.node} />
            <text x={0} y={-10} textAnchor="middle" fill={CANVAS_COLORS.labelText} fontSize={font(9)} fontWeight="bold">
              A
            </text>

            {/* 滑动接线夹 B */}
            <g transform={`translate(${(L / 0.8) * 260}, -4)`}>
              <polygon points="0,-4 -4,-12 4,-12" fill={PHYSICS_COLORS.emf} />
              <circle cx={0} cy={0} r={4.5} fill={PHYSICS_COLORS.emf} />
              <text x={0} y={-16} textAnchor="middle" fill={PHYSICS_COLORS.emf} fontSize={font(9.5)} fontWeight="bold">
                B ({L.toFixed(2)}m)
              </text>
            </g>

            {/* 复用标准 LabRuler 刻度尺组件 */}
            <LabRuler x={0} y={4} length={260} height={24} domain={[0, 80]} styleType="steel" />
          </g>
        </g>

        {/* 分割线 */}
        <line x1={15} y1={120} x2={310} y2={120} stroke={CANVAS_COLORS.axis} strokeWidth={1} strokeDasharray="4,4" opacity={0.5} />

        {/* ── 环节 2：螺旋测微器精确测量金属丝直径 d ── */}
        <g className="micrometer-station" transform="translate(15, 132)">
          <text x={0} y={14} fill={CANVAS_COLORS.labelText} fontSize={font(11)} fontWeight="bold">
            ② 螺旋测微器：测金属丝直径 d
          </text>

          {/* 纵向穿过测微螺杆与测砧之间的金属丝样本 */}
          <line
            x1={48}
            y1={28}
            x2={48}
            y2={110}
            stroke={SCENE_COLORS.surface.groundStroke}
            strokeWidth={Math.max(2.5, d_mm * 4)}
            strokeLinecap="round"
          />

          {/* 复用标准 Micrometer 组件（带读数放大镜特写） */}
          <g transform="translate(22, 68)">
            <Micrometer
              x={10}
              y={0}
              measuredValue={d_mm}
              scale={0.78}
              showMagnifier={true}
            />
          </g>

          {/* 极简读数示数牌 */}
          <g transform="translate(0, 126)">
            <rect x={0} y={0} width={295} height={32} rx={4} fill={CANVAS_COLORS.white} stroke={CANVAS_COLORS.axis} strokeWidth={1} />
            <text x={12} y={20} fill={PHYSICS_COLORS.displacement} fontSize={font(11.5)} fontWeight="bold">
              直径 d = {d_mm.toFixed(3)} mm
            </text>
            <text x={145} y={20} fill={CANVAS_COLORS.textMuted} fontSize={font(9.5)}>
              固定 {Math.floor(d_mm)}mm + 半刻度 + 可动估读
            </text>
          </g>
        </g>
      </g>
    </g>
  )
}
