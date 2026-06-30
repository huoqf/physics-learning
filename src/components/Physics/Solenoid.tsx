import React, { useId } from 'react'
import { SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

/**
 * 螺线管组件 Props
 */
export interface SolenoidProps {
  /** 中心 x 坐标 (px) */
  x?: number
  /** 中心 y 坐标 (px) */
  y?: number
  /** 总宽度 (px)，默认 160 */
  width?: number
  /** 总高度 (px)，默认 80 */
  height?: number
  /** 椭圆 x 半径（管径方向），默认按 height 的 20% 计算 */
  rx?: number
  /** 线圈匝数，默认 5（最大渲染 15 匝） */
  turns?: number
  /** 感应电流大小（含符号，决定流光点流速和方向） */
  current?: number
  /** 动画时间，用于流光点移动 */
  time?: number
  /** 自定义 CSS 类名 */
  className?: string
  /** 是否显示铁芯，默认 true */
  showIronCore?: boolean
  /** 是否启用流光粒子动画，默认为 true。关闭后不仅停止时间动画，而且停止渲染任何粒子类装饰元素以减轻 DOM 开销 */
  animated?: boolean
}

/**
 * 螺线管（线圈）组件
 *
 * 绘制带铁芯的螺线管，用于电磁感应等场景：
 * - 管状骨架/铁芯：拟物金属渐变
 * - 每一匝线圈分前后两层绘制，铜线受光面高光
 * - 左右引出导线
 * - 感应电流流光粒子：沿椭圆匝线流动，稀疏化防止高匝数重叠
 * - 支持自定义尺寸、匝数、铁芯显示
 */
export const Solenoid: React.FC<SolenoidProps> = ({
  x = 0,
  y = 0,
  width = 160,
  height = 80,
  rx: rxProp,
  turns = 5,
  current = 0,
  time = 0,
  className = '',
  showIronCore = true,
  animated = true,
}) => {
  const c = SCENE_COLORS.coil
  const uniqueId = useId().replace(/:/g, '-')
  const ironCoreGradId = `ironCoreGrad-${uniqueId}`
  // rx 参数化：默认按 height 的 20% 计算，保持管径比例
  const rx = rxProp ?? height * 0.2
  const ry = height / 2 // 椭圆 y 半径

  // 限制最大渲染匝数，防止在小尺寸下由于匝数过多挤成一坨
  const maxRenderTurns = 15
  const displayTurns = turns > maxRenderTurns ? maxRenderTurns : turns

  // 计算每一匝的间距
  const step = width / (displayTurns + 1)
  const startX = -width / 2 + step

  // 生成每一匝的中心 X 坐标
  const turnCenters = Array.from({ length: displayTurns }).map((_, i) => startX + i * step)

  // 动态缩减线宽，防止线圈线条重合叠在一块
  const baseStrokeWidth = 5
  const strokeW = Math.max(1.5, baseStrokeWidth * Math.min(1, 6 / displayTurns))
  const highlightW = Math.max(0.5, 1.5 * Math.min(1, 6 / displayTurns))
  const backStrokeW = Math.max(1.0, 3.5 * Math.min(1, 6 / displayTurns))

  // 流光点位置计算：当 current 绝对值大于一定阈值时才显示
  const hasCurrent = Math.abs(current) > 0.05
  const flowSpeed = current * 5 // 流动速度
  
  // 决定哪几匝可以渲染粒子，保证最多只有 5 匝同时渲染粒子，扩大横向粒子间距以防重叠
  const stepInterval = Math.max(1, Math.ceil(displayTurns / 5))
  // 粒子半径随匝数增加自适应变细，避免大匝数下粒子体积过于庞大
  const particleR = Math.max(2.0, 4.5 * Math.min(1, 6 / displayTurns))

  // 流光粒子仅在 animated = true 且有电流时渲染，实现静态回退
  const showParticles = hasCurrent && animated

  return (
    <g transform={`translate(${x}, ${y})`} className={className}>
      {/* 1. 绘制管状骨架/铁芯 (拟物金属渐变) */}
      <defs>
        <linearGradient id={ironCoreGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.neutral[700]} />
          <stop offset="30%" stopColor={colors.neutral[500]} />
          <stop offset="50%" stopColor={colors.neutral[300]} />
          <stop offset="70%" stopColor={colors.neutral[500]} />
          <stop offset="100%" stopColor={colors.neutral[800]} />
        </linearGradient>
      </defs>
      {/* 铁芯主体 */}
      {showIronCore && (
        <rect
          x={-width / 2 - 10}
          y={-ry + 6}
          width={width + 20}
          height={height - 12}
          rx="3"
          fill={`url(#${ironCoreGradId})`}
          stroke={colors.neutral[800]}
          strokeWidth="1.5"
        />
      )}

      {/* 2. 绘制每一匝的后半部分 */}
      {turnCenters.map((cx, idx) => (
        <path
          key={`back-${idx}`}
          d={`M ${cx} ${-ry} A ${rx} ${ry} 0 0 0 ${cx} ${ry}`}
          fill="none"
          stroke={c.copperDark}
          strokeWidth={backStrokeW}
          opacity="0.3"
        />
      ))}

      {/* 3. 绘制引出导线 */}
      {/* 左引出线 */}
      <path
        d={`M ${turnCenters[0]} ${ry} C ${turnCenters[0] - 20} ${ry + 30}, ${-width / 2} ${ry + 50}, ${-width / 2} 120`}
        fill="none"
        stroke={c.copperBase}
        strokeWidth="3"
      />
      {/* 右引出线 */}
      <path
        d={`M ${turnCenters[turnCenters.length - 1]} ${-ry} C ${turnCenters[turnCenters.length - 1] + 30} ${-ry - 10}, ${width / 2} ${ry + 50}, ${width / 2} 120`}
        fill="none"
        stroke={c.copperBase}
        strokeWidth="3"
      />

      {/* 4. 绘制每一匝的前半部分 */}
      {turnCenters.map((cx, idx) => (
        <g key={`front-group-${idx}`}>
          {/* 前半圈铜线 */}
          <path
            d={`M ${cx} ${ry} A ${rx} ${ry} 0 0 0 ${cx} ${-ry}`}
            fill="none"
            stroke={c.copperBase}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
          {/* 铜线受光面高光 (统一白色半透明 0.6) */}
          <path
            d={`M ${cx - 1} ${ry - 2} A ${rx - 1} ${ry - 2} 0 0 0 ${cx - 1} ${-ry + 2}`}
            fill="none"
            stroke={SCENE_COLORS.materials.specularWhite}
            strokeWidth={highlightW}
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>
      ))}

      {/* 5. 绘制感应电流流动粒子 */}
      {showParticles &&
        turnCenters.map((cx, idx) => {
          // 稀疏化：只在满足间隔的匝上画粒子，防止高匝数下挤成一列
          if (idx % stepInterval !== 0) return null

          // 精简粒子数量 50%，每个匝仅渲染 1 个流光粒子
          return [0].map((pIdx) => {
            // 错开相位：不同线圈匝的粒子引入 idx * 0.6 的相位偏差，呈现错落有致的流光效果
            const phase = pIdx * Math.PI + idx * 0.6
            const t = ((time * flowSpeed + phase) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
            
            if (t > Math.PI) return null

            const px = cx - rx * Math.sin(t)
            const py = ry * Math.cos(t)

            return (
              <circle
                key={`glow-${idx}-${pIdx}`}
                cx={px}
                cy={py}
                r={particleR}
                fill={SCENE_COLORS.coil.activeGlow || colors.success[600]}
                filter={`drop-shadow(0 0 2px ${SCENE_COLORS.coil.activeGlow || colors.success[600]})`}
              />
            )
          })
        })}

      {/* 导线连接点阴影 */}
      <circle cx={-width / 2} cy="120" r="3" fill={colors.neutral[800]} />
      <circle cx={width / 2} cy="120" r="3" fill={colors.neutral[800]} />
    </g>
  )
}

export default Solenoid
