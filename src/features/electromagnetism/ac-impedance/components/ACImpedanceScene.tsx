import { FC } from 'react'
import {
  LightBulb,
  DialMeter,
  CoilBase,
  CapacitorPlates,
} from '@/components/Physics'
import {
  EM_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  STROKE,
  withAlpha,
} from '@/theme/physics'
import type { CanvasSize } from '@/utils'
import type { ACImpedancePhysicsResult, BranchState } from '../hooks/useACImpedancePhysics'

interface ACImpedanceSceneProps {
  physics: ACImpedancePhysicsResult
  canvasSize: CanvasSize
  time: number
}

export const ACImpedanceScene: FC<ACImpedanceSceneProps> = ({
  physics,
  canvasSize,
  time,
}) => {
  const { font } = canvasSize
  const { voltage, frequency, isDC, branchA, branchB } = physics

  // 坐标几何常数 (设计基准：840 × 325)
  const sourceX = 90
  const busLeftX = 170
  const busRightX = 750
  const branch1Y = 95
  const branch2Y = 225
  const deviceX = 330
  const meterX = 500
  const bulbX = 660

  // 渲染支路中的特定器件 (电阻、电感或电容)
  const renderDevice = (branch: BranchState, y: number) => {
    if (branch.deviceType === 'resistor') {
      const rw = 70
      const rh = 24
      return (
        <g>
          {/* 电阻线框 */}
          <rect
            x={deviceX - rw / 2}
            y={y - rh / 2}
            width={rw}
            height={rh}
            fill={SCENE_COLORS.circuit.resistorFill}
            stroke={SCENE_COLORS.circuit.resistorStroke}
            strokeWidth={STROKE.objectLine}
            rx={3}
          />
          <text
            x={deviceX}
            y={y + 4}
            textAnchor="middle"
            fontSize={font(10)}
            fill={CANVAS_COLORS.labelText}
            fontWeight="bold"
          >
            R = 15 Ω
          </text>
        </g>
      )
    }

    if (branch.deviceType === 'inductor') {
      return (
        <g>
          <CoilBase
            x={deviceX}
            y={y}
            width={75}
            height={36}
            turns={6}
            current={branch.current * branch.instantCurrentPhase}
            time={time}
            showIronCore
            animated
          />
          <text
            x={deviceX}
            y={y - 25}
            textAnchor="middle"
            fontSize={font(10)}
            fill={EM_COLORS.inductor}
            fontWeight="bold"
          >
            {`X_L = ${branch.reactance.toFixed(1)} Ω`}
          </text>
        </g>
      )
    }

    // 电容器
    return (
      <g>
        <CapacitorPlates
          x={deviceX - 25}
          y={y}
          width={50}
          gap={18}
          thickness={6}
          chargeSign={branch.instantCurrentPhase >= 0 ? '+' : '-'}
          showField={false}
        />
        <text
          x={deviceX}
          y={y - 25}
          textAnchor="middle"
          fontSize={font(10)}
          fill={EM_COLORS.capacitor}
          fontWeight="bold"
        >
          {Number.isFinite(branch.reactance)
            ? `X_C = ${branch.reactance.toFixed(1)} Ω`
            : 'X_C = ∞ (隔直)'}
        </text>
      </g>
    )
  }

  // 渲染支路导线与动态电流粒子流动
  const renderBranchParticles = (branch: BranchState, y: number) => {
    if (branch.current <= 0.01) return null
    // 依据瞬时电流相位计算流光粒子水平偏移
    const offset = ((time * 80 * branch.instantCurrentPhase) % 40 + 40) % 40
    const pointsX = [200, 260, 420, 580, 720]
    return (
      <g opacity={0.65}>
        {pointsX.map((px, i) => (
          <circle
            key={i}
            cx={px + offset - 20}
            cy={y}
            r={2.5}
            fill={EM_COLORS.electricCurrent}
          />
        ))}
      </g>
    )
  }

  return (
    <g>
      {/* ── 背景网格弱线 ── */}
      <line
        x1={40}
        y1={160}
        x2={800}
        y2={160}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={STROKE.grid}
        strokeDasharray="4,4"
      />

      {/* ── 1. 电源部分 ── */}
      <g>
        {/* 电源外圆 */}
        <circle
          cx={sourceX}
          cy={160}
          r={28}
          fill={withAlpha(EM_COLORS.electricPotential, 0.1)}
          stroke={EM_COLORS.electricPotential}
          strokeWidth={STROKE.objectLine}
        />
        {isDC ? (
          // 直流电源符号
          <g>
            <line x1={sourceX - 8} y1={148} x2={sourceX - 8} y2={172} stroke={EM_COLORS.electricPotential} strokeWidth={3} />
            <line x1={sourceX + 8} y1={154} x2={sourceX + 8} y2={166} stroke={EM_COLORS.electricPotential} strokeWidth={2} />
            <text x={sourceX - 16} y={150} fontSize={font(9)} fill={EM_COLORS.electricPotential} fontWeight="bold">+</text>
            <text x={sourceX + 14} y={150} fontSize={font(9)} fill={EM_COLORS.electricPotential} fontWeight="bold">-</text>
          </g>
        ) : (
          // 交流正弦波符号
          <path
            d={`M ${sourceX - 14} 160 Q ${sourceX - 7} 148, ${sourceX} 160 T ${sourceX + 14} 160`}
            fill="none"
            stroke={EM_COLORS.electricPotential}
            strokeWidth={2.5}
          />
        )}
        <text
          x={sourceX}
          y={204}
          textAnchor="middle"
          fontSize={font(11)}
          fill={CANVAS_COLORS.labelText}
          fontWeight="bold"
        >
          {isDC ? `恒定直流 ${voltage}V` : `正弦交流 ${voltage}V`}
        </text>
        {!isDC && (
          <text
            x={sourceX}
            y={218}
            textAnchor="middle"
            fontSize={font(10)}
            fill={CANVAS_COLORS.labelTextLight}
          >
            {`f = ${frequency} Hz`}
          </text>
        )}
      </g>

      {/* ── 2. 主干回路导线 ── */}
      <g stroke={SCENE_COLORS.circuit.wire} strokeWidth={STROKE.objectLine} fill="none">
        {/* 电源上引线 -> 节点 */}
        <path d={`M ${sourceX} 132 L ${sourceX} 95 L ${busLeftX} 95`} />
        {/* 电源下引线 -> 节点 */}
        <path d={`M ${sourceX} 188 L ${sourceX} 225 L ${busLeftX} 225`} />
        {/* 支路 1 导线 */}
        <path d={`M ${busLeftX} ${branch1Y} L ${deviceX - 45} ${branch1Y}`} />
        <path d={`M ${deviceX + 45} ${branch1Y} L ${meterX - 30} ${branch1Y}`} />
        <path d={`M ${meterX + 30} ${branch1Y} L ${bulbX - 25} ${branch1Y}`} />
        <path d={`M ${bulbX + 25} ${branch1Y} L ${busRightX} ${branch1Y} L ${busRightX} 160`} />

        {/* 支路 2 导线 */}
        <path d={`M ${busLeftX} ${branch2Y} L ${deviceX - 45} ${branch2Y}`} />
        <path d={`M ${deviceX + 45} ${branch2Y} L ${meterX - 30} ${branch2Y}`} />
        <path d={`M ${meterX + 30} ${branch2Y} L ${bulbX - 25} ${branch2Y}`} />
        <path d={`M ${bulbX + 25} ${branch2Y} L ${busRightX} ${branch2Y} L ${busRightX} 160`} />

        {/* 右侧回路线 */}
        <path d={`M ${busRightX} 160 L ${busRightX + 20} 160 L ${busRightX + 20} 290 L ${sourceX} 290 L ${sourceX} 225`} />
      </g>

      {/* 导线节点圆点 */}
      <circle cx={busLeftX} cy={branch1Y} r={3.5} fill={SCENE_COLORS.circuit.wire} />
      <circle cx={busLeftX} cy={branch2Y} r={3.5} fill={SCENE_COLORS.circuit.wire} />
      <circle cx={busRightX} cy={branch1Y} r={3.5} fill={SCENE_COLORS.circuit.wire} />
      <circle cx={busRightX} cy={branch2Y} r={3.5} fill={SCENE_COLORS.circuit.wire} />

      {/* ── 3. 动态电流流光粒子 ── */}
      {renderBranchParticles(branchA, branch1Y)}
      {renderBranchParticles(branchB, branch2Y)}

      {/* ── 4. 支路器件渲染 ── */}
      {renderDevice(branchA, branch1Y)}
      {renderDevice(branchB, branch2Y)}

      {/* ── 5. 支路电流表 ── */}
      <g>
        <DialMeter
          type="A"
          value={branchA.current}
          max={4}
          x={meterX}
          y={branch1Y}
          r={26}
          font={font}
        />
        <text
          x={meterX}
          y={branch1Y + 36}
          textAnchor="middle"
          fontSize={font(10)}
          fill={EM_COLORS.electricCurrent}
          fontWeight="bold"
        >
          {`I₁ = ${branchA.current.toFixed(2)} A`}
        </text>

        <DialMeter
          type="A"
          value={branchB.current}
          max={4}
          x={meterX}
          y={branch2Y}
          r={26}
          font={font}
        />
        <text
          x={meterX}
          y={branch2Y + 36}
          textAnchor="middle"
          fontSize={font(10)}
          fill={EM_COLORS.electricCurrent}
          fontWeight="bold"
        >
          {`I₂ = ${branchB.current.toFixed(2)} A`}
        </text>
      </g>

      {/* ── 6. 支路动态小灯泡 ── */}
      <g>
        <LightBulb
          x={bulbX}
          y={branch1Y}
          power={branchA.power}
          time={time}
          scale={0.9}
          label="灯泡 L₁"
          font={font}
        />
        <text
          x={bulbX}
          y={branch1Y + 40}
          textAnchor="middle"
          fontSize={font(9)}
          fill={CANVAS_COLORS.labelTextLight}
        >
          {`P₁ = ${branchA.power.toFixed(1)} W`}
        </text>

        <LightBulb
          x={bulbX}
          y={branch2Y}
          power={branchB.power}
          time={time}
          scale={0.9}
          label="灯泡 L₂"
          font={font}
        />
        <text
          x={bulbX}
          y={branch2Y + 40}
          textAnchor="middle"
          fontSize={font(9)}
          fill={CANVAS_COLORS.labelTextLight}
        >
          {`P₂ = ${branchB.power.toFixed(1)} W`}
        </text>
      </g>

      {/* 支路说明标签 */}
      <text
        x={busLeftX + 15}
        y={branch1Y - 12}
        fontSize={font(10)}
        fill={CANVAS_COLORS.labelText}
        fontWeight="bold"
      >
        {branchA.label}
      </text>
      <text
        x={busLeftX + 15}
        y={branch2Y - 12}
        fontSize={font(10)}
        fill={CANVAS_COLORS.labelText}
        fontWeight="bold"
      >
        {branchB.label}
      </text>
    </g>
  )
}
