import React, { useId } from 'react'
import { SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

/**
 * 原线圈组件 Props（互感实验中原边线圈）
 */
export interface PrimaryCoilProps {
  /** 中心 x 坐标 (px) */
  x?: number
  /** 中心 y 坐标 (px) */
  y?: number
  /** 总宽度 (px)，默认 120 */
  width?: number
  /** 总高度 (px)，默认 66 */
  height?: number
  /** 椭圆 x 半径（管径方向），默认按 height 的 21% 计算 */
  rx?: number
  /** 线圈匝数，默认 4 */
  turns?: number
  /** 原线圈电流（决定流光点流速和方向） */
  current?: number
  /** 动画时间，用于流光粒子移动 */
  time?: number
  /** 是否显示铁芯，默认 true */
  showIronCore?: boolean
  /** 自定义 CSS 类名 */
  className?: string
  /** 是否启用流光粒子动画，默认为 true。关闭后不仅停止时间动画，而且停止渲染 any 粒子类装饰元素以减轻 DOM 开销 */
  animated?: boolean
}

/**
 * 原线圈组件（互感实验原边）
 *
 * 绘制带铁芯的原线圈，用于互感/变压器等场景：
 * - 铁芯：拟物金属渐变
 * - 漆包绿线绕线，前后两层绘制 + 高光
 * - 左右引出绿色皮导线
 * - 电流流光粒子（绿色荧光光点），表示回路中有稳恒电流
 */
export const PrimaryCoil: React.FC<PrimaryCoilProps> = ({
  x = 0,
  y = 0,
  width = 120,
  height = 66,
  rx: rxProp,
  turns = 4,
  current = 0,
  time = 0,
  showIronCore = true,
  className = '',
  animated = true,
}) => {
  const c = SCENE_COLORS.coil
  const uniqueId = useId().replace(/:/g, '-')
  const ironCoreGradId = `primaryIronCoreGrad-${uniqueId}`
  // rx 参数化：默认按 height 的 21% 计算，保持管径比例
  const rx = rxProp ?? height * 0.21
  const ry = height / 2 // 椭圆 y 半径

  // 计算每一匝的中心位置
  const step = width / (turns + 1)
  const startX = -width / 2 + step
  const turnCenters = Array.from({ length: turns }).map((_, i) => startX + i * step)

  const displayTurns = turns
  // 动态缩减线宽，防止线圈线条重合叠在一块
  const baseStrokeWidth = 5
  const strokeW = Math.max(1.5, baseStrokeWidth * Math.min(1, 6 / displayTurns))
  const highlightW = Math.max(0.5, 1.5 * Math.min(1, 6 / displayTurns))
  const backStrokeW = Math.max(1.0, 3.5 * Math.min(1, 6 / displayTurns))
  
  // 粒子半径随匝数增加自适应变细，避免大匝数下粒子体积过于庞大
  const particleR = Math.max(2.0, 4.5 * Math.min(1, 6 / displayTurns))

  // 粒子流动
  const hasCurrent = Math.abs(current) > 0.01
  const flowSpeed = current * 4 // 流动速度

  // 流光粒子仅在 animated = true 且有电流时渲染，实现静态回退
  const showParticles = hasCurrent && animated

  return (
    <g transform={`translate(${x}, ${y})`} className={className}>
      {/* 1. 铁芯 (拟物金属渐变) */}
      {showIronCore && (
        <>
          <defs>
            <linearGradient id={ironCoreGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.neutral[700]} />
              <stop offset="30%" stopColor={colors.neutral[500]} />
              <stop offset="50%" stopColor={colors.neutral[300]} />
              <stop offset="70%" stopColor={colors.neutral[500]} />
              <stop offset="100%" stopColor={colors.neutral[800]} />
            </linearGradient>
          </defs>
          <rect
            x={-width / 2 - 12}
            y={-ry + 6}
            width={width + 24}
            height={height - 12}
            rx="3"
            fill={`url(#${ironCoreGradId})`}
            stroke={colors.neutral[900]}
            strokeWidth="1.5"
          />
        </>
      )}

      {/* 2. 后半部分绕线 */}
      {turnCenters.map((cx, idx) => (
        <path
          key={`pri-back-${idx}`}
          d={`M ${cx} ${-ry} A ${rx} ${ry} 0 0 0 ${cx} ${ry}`}
          fill="none"
          stroke={c.enamelStroke}
          strokeWidth={backStrokeW}
          opacity="0.3"
        />
      ))}

      {/* 3. 引出导线 (绿色皮导线，引接到变阻器回路中) */}
      {/* 左引出线 */}
      <path
        d={`M ${turnCenters[0]} ${ry} C ${turnCenters[0] - 15} ${ry + 25}, ${-width / 2} ${ry + 40}, ${-width / 2} 120`}
        fill="none"
        stroke={c.enamelBase}
        strokeWidth="2.5"
      />
      {/* 右引出线 */}
      <path
        d={`M ${turnCenters[turns - 1]} ${-ry} C ${turnCenters[turns - 1] + 25} ${-ry - 10}, ${width / 2} ${ry + 40}, ${width / 2} 120`}
        fill="none"
        stroke={c.enamelBase}
        strokeWidth="2.5"
      />

      {/* 4. 前半部分绕线 (漆包绿线) */}
      {turnCenters.map((cx, idx) => (
        <g key={`pri-front-group-${idx}`}>
          <path
            d={`M ${cx} ${ry} A ${rx} ${ry} 0 0 0 ${cx} ${-ry}`}
            fill="none"
            stroke={c.enamelBase}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
          {/* 高光 (统一白色半透明 0.6) */}
          <path
            d={`M ${cx - 0.8} ${ry - 1.8} A ${rx - 0.8} ${ry - 1.8} 0 0 0 ${cx - 0.8} ${-ry + 1.8}`}
            fill="none"
            stroke={SCENE_COLORS.materials.specularWhite} 
            strokeWidth={highlightW}
            opacity="0.6"
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* 5. 绘制原电流流动粒子 (绿色荧光光点) */}
      {showParticles &&
        turnCenters.map((cx, idx) => {
          // 精简粒子数量 50%，每个匝仅渲染 1 个流光粒子
          return [0].map((pIdx) => {
            const phase = pIdx * Math.PI
            const t = ((time * flowSpeed + phase) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)

            if (t > Math.PI) return null

            const px = cx - rx * Math.sin(t)
            const py = ry * Math.cos(t)

            return (
              <circle
                key={`pri-glow-${idx}-${pIdx}`}
                cx={px}
                cy={py}
                r={particleR}
                fill={SCENE_COLORS.coil.activeGlow || '#059669'} 
                filter={`drop-shadow(0 0 2px ${SCENE_COLORS.coil.activeGlow || '#059669'})`}
              />
            )
          })
        })}

      {/* 导线端点 */}
      <circle cx={-width / 2} cy="120" r="2.5" fill={colors.neutral[800]} />
      <circle cx={width / 2} cy="120" r="2.5" fill={colors.neutral[800]} />
    </g>
  )
}

export default PrimaryCoil
