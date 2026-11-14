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
  w: number
  h: number
  I: number
  B: number
  L?: number
  thetaIB?: number
  font?: (base: number) => number
}

/**
 * 安培力 F-I 关系图业务适配层。
 *
 * 内部统一使用 RelationChart 渲染标准关系图。纵轴符号与 solveBasicAmpere
 * 保持一致：F = -B⊥IL = -BIL·sinθ_IB，+F 表示沿导轨向右，-F 表示沿导轨向左。
 */
export const AmpereFIChart: React.FC<AmpereFIChartProps> = ({
  w,
  h,
  I,
  B,
  L = 4.0,
  thetaIB = 90,
  font = (base) => base,
}) => {
  const radIB = (thetaIB * Math.PI) / 180
  const bPerp = B * Math.sin(radIB)
  const slopeK = -bPerp * L
  const currentF = slopeK * I
  const slopeExpr = Math.abs(thetaIB - 90) > 0.1 ? 'k = -B⊥L' : 'k = -BL'

  const points = useMemo(
    () => [
      { x: AMPERE_FI_DOMAIN.iMin, y: slopeK * AMPERE_FI_DOMAIN.iMin },
      { x: AMPERE_FI_DOMAIN.iMax, y: slopeK * AMPERE_FI_DOMAIN.iMax },
    ],
    [slopeK],
  )

  return (
    <div
      style={{
        position: 'relative',
        width: w,
        height: h,
        boxSizing: 'border-box',
        border: 'none',
        background: 'transparent',
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
        // 不再画 `I=0` 竖向参考线：横轴量程对称（-10..10），**y 轴本身就落在 I=0 上**，
        // 这条参考线和它逐像素重合；而它的标签被摆在刻度行、x=0 又正好是画面横向中心，
        // 于是必然压住居中的横轴名 `I (A)`。同一个量（I=0）标两遍属 §2.7 明令禁止，
        // 这里删掉参考线与标签，保留零线（F=0）——图线过原点已经说明 F ∝ I。
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
        {slopeExpr} = {slopeK.toFixed(1)} N/A
        <br />
        F = {currentF.toFixed(1)} N
      </div>
    </div>
  )
}

export default AmpereFIChart
