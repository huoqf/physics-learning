import React from 'react'
import { ChainCircuitBuilder, LightBulb, DialMeter } from '@/components/Physics'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import type { useBulbVAPhysics } from '../hooks/useBulbVAPhysics'

export interface BulbVASceneProps {
  physics: ReturnType<typeof useBulbVAPhysics>
  font: (size: number) => number
  time?: number
}

export const BulbVAScene: React.FC<BulbVASceneProps> = ({ physics, font, time = 0 }) => {
  const {
    circuitType,
    meterWiring,
    sliderRatio,
    bulbPower,
    R_slider_max,
    E,
  } = physics

  return (
    <g className="bulb-va-scene select-none">
      {/* 1. 核心电路拓扑基座：变阻器/电源/开关/电表已完全内建复用 */}
      <ChainCircuitBuilder
        circuitType={circuitType}
        meterWiring={meterWiring}
        sliderRatio={sliderRatio}
        E={E}
        R_slider_max={R_slider_max}
        font={font}
        renderLoad={(pos) => (
          <g>
            {/* 待测小灯泡：直接使用已有的 LightBulb 组件，零多余嵌套 */}
            <LightBulb
              x={pos.x}
              y={pos.y}
              power={bulbPower}
              time={time}
            />
            {/* 仅标注数值 */}
            <text
              x={pos.x}
              y={pos.y + 40}
              textAnchor="middle"
              fontSize={font(11)}
              fill={PHYSICS_COLORS.emf}
              fontWeight="bold"
            >
              {`P = ${bulbPower.toFixed(2)} W`}
            </text>
          </g>
        )}
        renderMeters={({ voltmeterPos, ammeterPos, U_val, I_val }) => (
          <>
            {/* 电流表：原生支持 x/y 属性 */}
            <DialMeter
              type="A"
              x={ammeterPos.x}
              y={ammeterPos.y}
              value={I_val}
              max={0.6}
              font={font}
            />
            <text
              x={ammeterPos.x}
              y={ammeterPos.y + 38}
              textAnchor="middle"
              fontSize={font(11)}
              fill={PHYSICS_COLORS.electricCurrent}
              fontWeight="bold"
            >
              {`I = ${I_val.toFixed(3)} A`}
            </text>

            {/* 电压表：原生支持 x/y 属性 */}
            <DialMeter
              type="V"
              x={voltmeterPos.x}
              y={voltmeterPos.y}
              value={U_val}
              max={5.0}
              font={font}
            />
            <text
              x={voltmeterPos.x}
              y={voltmeterPos.y + 38}
              textAnchor="middle"
              fontSize={font(11)}
              fill={PHYSICS_COLORS.emf}
              fontWeight="bold"
            >
              {`U = ${U_val.toFixed(2)} V`}
            </text>
          </>
        )}
      />

      {/* 2. 状态标签（仅标注接线模式，无大段教学文字） */}
      <g transform="translate(60, 30)">
        <rect
          x={0}
          y={0}
          width={200}
          height={26}
          rx={4}
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1}
        />
        <text x={100} y={17} textAnchor="middle" fontSize={font(11)} fill={CANVAS_COLORS.textMuted}>
          {circuitType === 'voltage-divider' ? '分压式接法 (0~E调压)' : '限流式接法'} ·{' '}
          {meterWiring === 'external' ? '外接法 (误差极小)' : '内接法'}
        </text>
      </g>
    </g>
  )
}
