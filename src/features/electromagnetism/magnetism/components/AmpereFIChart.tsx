import React, { useMemo } from 'react'
import { RelationChart } from '@/components/Chart'
import { colors } from '@/theme/colors'
import { FONT, PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'

const AMPERE_FI_DOMAIN = {
  iMin: -10,
  iMax: 10,
  /** 参数面板允许 |B|≤2T、|I|≤10A、L≤5m，因此 |F|max = 100N。 */
  fLimit: 100,
} as const

interface AmpereFIChartProps {
  x: number
  y: number
  w: number
  h: number
  I: number
  B: number
  L?: number
  font?: (base: number) => number
}

/**
 * 安培力 F-I 关系图业务适配层。
 *
 * 保留 SVG 卡片式调用接口（x/y/w/h）以不改 AmpereForce 主场景布局；
 * 内部统一使用 RelationChart 渲染标准关系图。纵轴符号与 solveBasicAmpere
 * 保持一致：F = -BIL，+F 表示沿导轨向右，-F 表示沿导轨向左。
 */
export const AmpereFIChart: React.FC<AmpereFIChartProps> = ({
  x,
  y,
  w,
  h,
  I,
  B,
  L = 4.0,
  font = (base) => base,
}) => {
  const slopeK = -B * L
  const currentF = slopeK * I

  const points = useMemo(
    () => [
      { x: AMPERE_FI_DOMAIN.iMin, y: slopeK * AMPERE_FI_DOMAIN.iMin },
      { x: AMPERE_FI_DOMAIN.iMax, y: slopeK * AMPERE_FI_DOMAIN.iMax },
    ],
    [slopeK],
  )

  return (
    <foreignObject x={x} y={y} width={w} height={h}>
      <div
        style={{
          position: 'relative',
          width: w,
          height: h,
          boxSizing: 'border-box',
          borderRadius: 6,
          border: `1.2px solid ${CANVAS_COLORS.grid}`,
          background: CANVAS_COLORS.objectFillNeutral,
          overflow: 'hidden',
        }}
      >
        <RelationChart
          points={points}
          xDomain={[AMPERE_FI_DOMAIN.iMin, AMPERE_FI_DOMAIN.iMax]}
          yDomain={[-AMPERE_FI_DOMAIN.fLimit, AMPERE_FI_DOMAIN.fLimit]}
          xLabel="I (A)"
          yLabel="F (N)"
          title="F-I 关系图像"
          color={PHYSICS_COLORS.lorentzForce}
          strokeWidth={2}
          cursorX={I}
          cursorLabel={(_i, f) => `F=${f.toFixed(1)}N`}
          showZeroLine
          markers={[
            {
              axis: 'vertical',
              x: 0,
              label: 'I=0',
              color: CANVAS_COLORS.axis,
            },
          ]}
        />

        <div
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            padding: '3px 5px',
            borderRadius: 4,
            background: withAlpha(colors.neutral.white, 0.82),
            border: `1px solid ${CANVAS_COLORS.grid}`,
            fontSize: font(FONT.small),
            lineHeight: '12px',
            color: CANVAS_COLORS.labelTextLight,
            fontWeight: 700,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          k = -BL = {slopeK.toFixed(1)} N/A
          <br />
          F = {currentF.toFixed(1)} N
        </div>
      </div>
    </foreignObject>
  )
}

export default AmpereFIChart
