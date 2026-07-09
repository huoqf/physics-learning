import { LightBulb } from '@/components/Physics'
import React, { useMemo } from 'react'
import { PHYSICS_COLORS, CANVAS_STYLE, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'

import { tempToColor } from '../utils'

interface HeatingBoxProps {
  type: 'ac' | 'dc'
  halfW: number
  chamberH: number
  font: (size: number) => number
  power: number
  time: number
  R: number
  Q: number
  temperature: number
  gaugeMax: number
  isSuccess: boolean
  atPeriodEnd: boolean
  flashStyle: React.CSSProperties | undefined
  colorQ: string
  colorSuccess: string
}

export const HeatingBox = React.memo(function HeatingBox({
  type,
  halfW,
  chamberH,
  font,
  power,
  time,
  R,
  Q,
  temperature,
  gaugeMax,
  isSuccess,
  atPeriodEnd,
  flashStyle,
  colorQ,
  colorSuccess,
}: HeatingBoxProps) {
  const isAC = type === 'ac'
  const colorAC = PHYSICS_COLORS.velocity

  const electrons = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      phase: isAC ? (i / 6) * Math.PI * 2 : (i / 6) * 1.0,
    }))
  }, [isAC])

  const slotW = font(12)
  const slotH = chamberH * 0.52
  const slotX = halfW - font(20)
  const slotY = chamberH * 0.19
  const fillRatio = Math.min(1, Q / gaugeMax)
  const fillH = slotH * fillRatio
  const fillY = slotY + slotH - fillH
  const isActive = power > 0.01
  const ripple = isAC && isActive ? Math.sin(time * 8) * font(1.5) : 0

  return (
    <g>
      <rect
        x={0} y={0}
        width={halfW}
        height={chamberH}
        fill={CANVAS_COLORS.white}
        stroke={isSuccess ? colorSuccess : CANVAS_COLORS.grid}
        strokeWidth={isSuccess ? 2 : CANVAS_STYLE.stroke.grid}
        rx={8}
      />
      <rect
        x={0} y={0}
        width={halfW}
        height={chamberH}
        fill={tempToColor(temperature)}
        opacity={0.07}
        rx={8}
        pointerEvents="none"
      />

      <text
        x={halfW * 0.45}
        y={font(18)}
        fontSize={font(12)}
        fontWeight="bold"
        textAnchor="middle"
        fill={PHYSICS_COLORS.labelText}
      >
        {isAC ? 'AC' : 'DC'} 加热盒
      </text>

      <g transform={`translate(${halfW * 0.12}, ${chamberH * 0.2})`}>
        <rect
          x={0} y={0}
          width={halfW * 0.68}
          height={chamberH * 0.45}
          fill="none"
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          rx={4}
        />

        {isAC ? (
          <g transform={`translate(${halfW * 0.05}, ${chamberH * 0.225})`}>
            <circle r={font(14)} fill={CANVAS_COLORS.white} stroke={colorAC} strokeWidth={1.5} />
            <path
              d={`M ${-font(8)} 0 Q ${-font(4)} ${-font(5)} 0 0 Q ${font(4)} ${font(5)} ${font(8)} 0`}
              fill="none"
              stroke={colorAC}
              strokeWidth={1.5}
            />
          </g>
        ) : (
          <g transform={`translate(${halfW * 0.05}, ${chamberH * 0.225})`}>
            <line x1={-font(12)} y1={0} x2={-font(3)} y2={0} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2} />
            <line x1={font(3)} y1={0} x2={font(12)} y2={0} stroke={SCENE_COLORS.circuit.wire} strokeWidth={2} />
            <line x1={-font(3)} y1={-font(8)} x2={-font(3)} y2={font(8)} stroke={SCENE_COLORS.circuit.batteryPos} strokeWidth={1.5} />
            <line x1={font(3)} y1={-font(4)} x2={font(3)} y2={font(4)} stroke={SCENE_COLORS.circuit.batteryNeg} strokeWidth={3} />
          </g>
        )}

        <LightBulb
          x={halfW * 0.53}
          y={chamberH * 0.225}
          power={power}
          time={time}
          scale={0.7}
          showLabel={false}
        />

        <text
          x={halfW * 0.32}
          y={chamberH * 0.42}
          fontSize={font(9)}
          textAnchor="middle"
          fill={PHYSICS_COLORS.labelText}
        >
          R={R}Ω
        </text>

        {electrons.map((p) => {
          if (isAC) {
            const phase = ((2 * Math.PI) / 2) * time + p.phase
            const nPos = Math.sin(phase)
            const ex = halfW * 0.1 + halfW * 0.56 * ((nPos + 1) / 2)
            const brightness = 0.3 + 0.7 * Math.abs(Math.cos(phase))
            const eR = font(3)
            return (
              <g key={p.id}>
                <circle cx={ex} cy={chamberH * 0.12} r={eR + brightness * eR * 0.5}
                  fill={PHYSICS_COLORS.negativeCharge} opacity={brightness * 0.15} />
                <circle cx={ex} cy={chamberH * 0.12} r={eR}
                  fill={PHYSICS_COLORS.negativeCharge} opacity={brightness} />
              </g>
            )
          } else {
            const speed = 30
            const circuitW = halfW * 0.56
            const pos = ((time * speed + p.phase * 50) % circuitW + circuitW) % circuitW
            const ex = halfW * 0.1 + pos
            const eR = font(3)
            return (
              <g key={p.id}>
                <circle cx={ex} cy={chamberH * 0.12} r={eR}
                  fill={PHYSICS_COLORS.negativeCharge} opacity={0.9} />
              </g>
            )
          }
        })}
      </g>

      <g style={isSuccess && atPeriodEnd ? flashStyle : undefined}>
        <rect x={slotX} y={slotY} width={slotW} height={slotH}
          fill={CANVAS_COLORS.gridSubtle} stroke={CANVAS_COLORS.axis}
          strokeWidth={1} rx={font(4)} />
        <clipPath id={`${type}-gauge-clip`}>
          <rect x={slotX} y={slotY} width={slotW} height={slotH} rx={font(4)} />
        </clipPath>
        <rect
          x={slotX} y={fillY} width={slotW} height={fillH}
          fill={colorQ} opacity={0.75}
          clipPath={`url(#${type}-gauge-clip)`}
        />
        {fillH > 2 && (
          <line
            x1={slotX} y1={fillY + ripple}
            x2={slotX + slotW} y2={fillY + ripple}
            stroke={CANVAS_COLORS.white} strokeWidth={2} opacity={0.7}
          />
        )}
        {!isAC && isSuccess && atPeriodEnd && (
          <text x={slotX + slotW / 2} y={fillY - font(3)}
            fontSize={font(9)} textAnchor="middle" fill={colorSuccess} fontWeight="bold">
            ✓
          </text>
        )}
        <text x={slotX + slotW / 2} y={slotY - font(3)}
          fontSize={font(7.5)} textAnchor="middle" fill={colorQ} fontWeight="600">
          Q_{type}
        </text>
        <text x={slotX + slotW / 2} y={slotY + slotH + font(10)}
          fontSize={font(7)} textAnchor="middle" fill={PHYSICS_COLORS.labelTextLight}>
          {(fillRatio * 100).toFixed(0)}%
        </text>
      </g>

      <g transform={`translate(${halfW - font(36)}, ${chamberH * 0.72})`}>
        <rect x={-font(4)} y={0} width={font(8)} height={chamberH * 0.22}
          fill={CANVAS_COLORS.grid} rx={font(3)} />
        <rect
          x={-font(4)}
          y={chamberH * 0.22 * (1 - Math.min(1, (temperature - 20) / 60))}
          width={font(8)}
          height={chamberH * 0.22 * Math.min(1, (temperature - 20) / 60)}
          fill={tempToColor(temperature)} rx={font(3)}
        />
        <text x={font(10)} y={chamberH * 0.12} fontSize={font(8.5)} fill={PHYSICS_COLORS.labelText}>
          {temperature.toFixed(1)}°C
        </text>
      </g>

      <text
        x={halfW * 0.45}
        y={chamberH - font(8)}
        fontSize={font(10)}
        textAnchor="middle"
        fill={colorQ}
        fontWeight="bold"
      >
        Q_{type} = {Q.toFixed(2)} J
      </text>
    </g>
  )
})
