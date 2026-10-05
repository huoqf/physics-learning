import { FC } from 'react'
import {
  LightBulb,
  DialMeter,
  CoilBase,
  CapacitorPlates,
  VectorArrow,
} from '@/components/Physics'
import {
  EM_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  PHYSICS_COLORS,
  STROKE,
} from '@/theme/physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
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

  // 坐标几何系统（设计基准：840 × 325，标准阶梯双母线并联回路）
  // 左侧总供电母线 x=140，右侧总汇流母线 x=740
  // 支路1 y=85，支路2 y=175，底干路电源线 y=265
  const busLeftX = 140
  const busRightX = 740
  const branch1Y = 85
  const branch2Y = 175
  const busBottomY = 265

  const deviceX = 300
  const meterX = 480
  const bulbX = 640
  const sourceCenterX = 440

  // 渲染支路中的特定器件 (电阻、电感或电容)
  const renderDevice = (branch: BranchState, y: number) => {
    if (branch.deviceType === 'resistor') {
      const rw = 64
      const rh = 24
      return (
        <g>
          <rect
            x={deviceX - rw / 2}
            y={y - rh / 2}
            width={rw}
            height={rh}
            fill={SCENE_COLORS.circuit.resistorFill}
            stroke={SCENE_COLORS.circuit.resistorStroke}
            strokeWidth={STROKE.objectLine}
            rx={2}
          />
          <text
            x={deviceX}
            y={y + 4}
            textAnchor="middle"
            fontSize={font(10.5)}
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
            fontSize={font(10.5)}
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
          fontSize={font(10.5)}
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

  // 瞬时总电流估算（标量合成用于箭头展示）
  const totalCurrent = branchA.current + branchB.current

  return (
    <g className="ac-impedance-scene select-none">
      {/* ── 1. 标准双母线并联导线系统（端子级精准连接，横平竖直，零穿心，零多余拐弯） ── */}
      <g stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* 左母线（供电分流线）：从底干路(140, 265) 竖直到 顶支路(140, 85) */}
        <line x1={busLeftX} y1={busBottomY} x2={busLeftX} y2={branch1Y} />

        {/* 右母线（汇流总线）：从底干路(740, 265) 竖直到 顶支路(740, 85) */}
        <line x1={busRightX} y1={busBottomY} x2={busRightX} y2={branch1Y} />

        {/* ── 支路 1 (y=85) ── */}
        {/* 左母线节点 -> 器件A左端子 (300 - 35 = 265) */}
        <line x1={busLeftX} y1={branch1Y} x2={deviceX - 35} y2={branch1Y} />
        {/* 器件A右端子 (300 + 35 = 335) -> 电流表A1左端子 (480 - 24 = 456) */}
        <line x1={deviceX + 35} y1={branch1Y} x2={meterX - 24} y2={branch1Y} />
        {/* 电流表A1右端子 (480 + 24 = 504) -> 灯泡L1左端子 (640 - 24 = 616) */}
        <line x1={meterX + 24} y1={branch1Y} x2={bulbX - 24} y2={branch1Y} />
        {/* 灯泡L1右端子 (640 + 24 = 664) -> 右母线节点 (740, 85) */}
        <line x1={bulbX + 24} y1={branch1Y} x2={busRightX} y2={branch1Y} />

        {/* ── 支路 2 (y=175) ── */}
        {/* 左母线节点 -> 器件B左端子 */}
        <line x1={busLeftX} y1={branch2Y} x2={deviceX - 35} y2={branch2Y} />
        {/* 器件B右端子 -> 电流表A2左端子 */}
        <line x1={deviceX + 35} y1={branch2Y} x2={meterX - 24} y2={branch2Y} />
        {/* 电流表A2右端子 -> 灯泡L2左端子 */}
        <line x1={meterX + 24} y1={branch2Y} x2={bulbX - 24} y2={branch2Y} />
        {/* 灯泡L2右端子 -> 右母线节点 */}
        <line x1={bulbX + 24} y1={branch2Y} x2={busRightX} y2={branch2Y} />

        {/* ── 底部干路供电线 (y=265) ── */}
        {/* 左母线底端 -> 电源左端子 (440 - 55 = 385) */}
        <line x1={busLeftX} y1={busBottomY} x2={sourceCenterX - 55} y2={busBottomY} />
        {/* 电源右端子 (440 + 55 = 495) -> 右母线底端 */}
        <line x1={sourceCenterX + 55} y1={busBottomY} x2={busRightX} y2={busBottomY} />
      </g>

      {/* 并联/汇流关键节点实心圆点 */}
      <circle cx={busLeftX} cy={branch1Y} r={4.5} fill={PHYSICS_COLORS.labelText} />
      <circle cx={busLeftX} cy={branch2Y} r={4.5} fill={PHYSICS_COLORS.labelText} />
      <circle cx={busRightX} cy={branch1Y} r={4.5} fill={PHYSICS_COLORS.labelText} />
      <circle cx={busRightX} cy={branch2Y} r={4.5} fill={PHYSICS_COLORS.labelText} />

      {/* ── 2. 支路器件渲染 ── */}
      {renderDevice(branchA, branch1Y)}
      {renderDevice(branchB, branch2Y)}

      {/* ── 3. 支路电流表（教科书标准原理图符号模式 variant="symbolic"） ── */}
      <DialMeter
        type="A"
        variant="symbolic"
        value={branchA.current}
        max={4}
        x={meterX}
        y={branch1Y}
        r={24}
        font={font}
        showLabel={false}
      />
      <text
        x={meterX}
        y={branch1Y + 36}
        textAnchor="middle"
        fontSize={font(10.5)}
        fill={EM_COLORS.electricCurrent}
        fontWeight="bold"
      >
        {`I₁ = ${branchA.current.toFixed(2)} A`}
      </text>

      <DialMeter
        type="A"
        variant="symbolic"
        value={branchB.current}
        max={4}
        x={meterX}
        y={branch2Y}
        r={24}
        font={font}
        showLabel={false}
      />
      <text
        x={meterX}
        y={branch2Y + 36}
        textAnchor="middle"
        fontSize={font(10.5)}
        fill={EM_COLORS.electricCurrent}
        fontWeight="bold"
      >
        {`I₂ = ${branchB.current.toFixed(2)} A`}
      </text>

      {/* ── 4. 支路动态小灯泡 ── */}
      <LightBulb
        x={bulbX}
        y={branch1Y}
        power={branchA.power}
        time={time}
        scale={0.88}
        label="灯泡 L₁"
        font={font}
      />
      <text
        x={bulbX}
        y={branch1Y + 38}
        textAnchor="middle"
        fontSize={font(9.5)}
        fill={CANVAS_COLORS.labelTextLight}
      >
        {`P₁ = ${branchA.power.toFixed(1)} W`}
      </text>

      <LightBulb
        x={bulbX}
        y={branch2Y}
        power={branchB.power}
        time={time}
        scale={0.88}
        label="灯泡 L₂"
        font={font}
      />
      <text
        x={bulbX}
        y={branch2Y + 38}
        textAnchor="middle"
        fontSize={font(9.5)}
        fill={CANVAS_COLORS.labelTextLight}
      >
        {`P₂ = ${branchB.power.toFixed(1)} W`}
      </text>

      {/* 支路说明标签 */}
      <text
        x={busLeftX + 16}
        y={branch1Y - 14}
        fontSize={font(10.5)}
        fill={CANVAS_COLORS.labelText}
        fontWeight="bold"
      >
        {branchA.label}
      </text>
      <text
        x={busLeftX + 16}
        y={branch2Y - 14}
        fontSize={font(10.5)}
        fill={CANVAS_COLORS.labelText}
        fontWeight="bold"
      >
        {branchB.label}
      </text>

      {/* ── 5. 底部电源组件（标准高中物理原理图符号） ── */}
      <g transform={`translate(${sourceCenterX}, ${busBottomY})`}>
        {/* 电源圆圈基座 */}
        <circle
          cx={0}
          cy={0}
          r={26}
          fill={CANVAS_COLORS.white}
          stroke={EM_COLORS.electricPotential}
          strokeWidth={STROKE.objectLine}
        />
        {isDC ? (
          // 直流电源符号（左长右短：左正右负）
          <g>
            <line x1={-8} y1={-14} x2={-8} y2={14} stroke={EM_COLORS.electricPotential} strokeWidth={2.5} strokeLinecap="round" />
            <line x1={8} y1={-8} x2={8} y2={8} stroke={EM_COLORS.electricPotential} strokeWidth={4} strokeLinecap="round" />
            <text x={-17} y={-4} fontSize={font(10)} fill={EM_COLORS.electricPotential} fontWeight="bold">+</text>
            <text x={15} y={-4} fontSize={font(10)} fill={EM_COLORS.electricPotential} fontWeight="bold">-</text>
          </g>
        ) : (
          // 交流电源标准正弦波符号
          <path
            d="M -13 0 Q -6.5 -11, 0 0 T 13 0"
            fill="none"
            stroke={EM_COLORS.electricPotential}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}
        {/* 电源参数文本 */}
        <text
          x={0}
          y={39}
          textAnchor="middle"
          fontSize={font(11)}
          fill={CANVAS_COLORS.labelText}
          fontWeight="bold"
        >
          {isDC ? `稳压直流源 U = ${voltage}V` : `正弦交流源 U = ${voltage}V (f = ${frequency}Hz)`}
        </text>
      </g>

      {/* ── 6. 高中物理规范电流方向矢量指示（摒弃模糊粒子，采用清晰规范箭头） ── */}
      {totalCurrent > 0.02 && (
        <g>
          {/* 支路 1 电流箭头（向右流过器件与表头） */}
          {branchA.current > 0.01 && (
            <VectorArrow
              originDesign={{ x: 200, y: branch1Y }}
              vector={{ x: isDC ? 1 : branchA.instantCurrentPhase >= 0 ? 1 : -1, y: 0 }}
              type="currentDirection"
              arrowType="visual-only"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={22}
              label="I₁"
              font={font}
            />
          )}

          {/* 支路 2 电流箭头（向右流过器件与表头） */}
          {branchB.current > 0.01 && (
            <VectorArrow
              originDesign={{ x: 200, y: branch2Y }}
              vector={{ x: isDC ? 1 : branchB.instantCurrentPhase >= 0 ? 1 : -1, y: 0 }}
              type="currentDirection"
              arrowType="visual-only"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={22}
              label="I₂"
              font={font}
            />
          )}

          {/* 底部干路供电电流箭头（直流左出向左流入左母线；交流动态指示） */}
          <VectorArrow
            originDesign={{ x: 260, y: busBottomY }}
            vector={{ x: isDC ? -1 : branchA.instantCurrentPhase >= 0 ? -1 : 1, y: 0 }}
            type="currentDirection"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={26}
            label={`I总 = ${totalCurrent.toFixed(2)}A`}
            font={font}
          />
        </g>
      )}
    </g>
  )
}
