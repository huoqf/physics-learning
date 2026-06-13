import { FC, useId } from 'react'
import { SCENE_COLORS } from '@/theme/physics'

/**
 * 物理电学实验公共器材组件：小灯泡
 * 
 * 动态视觉机制：
 * - 物理状态：断电态（冷灰、淡灰玻璃罩）与通电态（钨丝发热红亮、灯罩半透明淡黄填充、外围正弦呼吸光晕）。
 * - 亮度和光晕由传入的电功率 `power` 动态计算决定。
 * - 使用 React `useId` 隔离局域径向渐变，防止多灯泡同屏渲染时渐变冲突。
 * 
 * 颜色依赖：
 * - 采用 `SCENE_COLORS.bulb.*` 和 `SCENE_COLORS.circuit.*` 配色体系，严禁硬编码。
 */
interface LightBulbProps {
  /** 渲染中心 x 坐标 */
  x: number
  /** 渲染中心 y 坐标 */
  y: number
  /** 瞬时电功率 P (W)。大于 0.01W 时激活通电态，决定灯丝红热程度与呼吸光晕强度 */
  power: number
  /** 全局动画时间轴，用于正弦微幅抖动的呼吸暖光晕动效 */
  time: number
  /** 整体缩放比例，默认为 1.0 */
  scale?: number
  /** 是否显示标签字，默认为 true */
  showLabel?: boolean
  /** 标签文本内容，默认为 "小灯泡" */
  label?: string
}

export const LightBulb: FC<LightBulbProps> = ({
  x,
  y,
  power,
  time,
  scale = 1.0,
  showLabel = true,
  label = '小灯泡',
}) => {
  // 动态生成唯一的渐变 ID，防止同屏渲染多个灯泡时渐变冲突
  const uniqueId = useId().replace(/:/g, '')
  const glowGradientId = `bulb-glow-${uniqueId}`

  // 1. 发光外圈半径计算（加入正弦振荡形成呼吸效果）
  const oscillate = power > 0.01 ? Math.sin(time * 6) * 1.5 : 0
  const glowRadius = (Math.min(50, 12 + Math.sqrt(power) * 14) + oscillate) * scale
  const glowOpacity = Math.min(0.85, 0.15 + power * 0.18)

  // 2. 状态判断
  const isLit = power > 0.01

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <defs>
        {/* 动态 5 色阶拟物径向渐变 */}
        <radialGradient id={glowGradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={SCENE_COLORS.bulb.glowCenter} stopOpacity="1" />
          <stop offset="35%" stopColor={SCENE_COLORS.bulb.glowInner} stopOpacity="0.85" />
          <stop offset="70%" stopColor={SCENE_COLORS.bulb.glowMid} stopOpacity="0.5" />
          <stop offset="95%" stopColor={SCENE_COLORS.bulb.glowOuter} stopOpacity="0.2" />
          <stop offset="100%" stopColor={SCENE_COLORS.bulb.glowFade} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* A. 动态发光外罩光晕 */}
      {isLit && (
        <circle
          cx={0}
          cy={-10}
          r={glowRadius / scale} // 抵消外部 transform scale 造成的影响，维持物理半径的相对比例
          fill={`url(#${glowGradientId})`}
          opacity={glowOpacity}
        />
      )}

      {/* B. 灯座金属外壳 */}
      <rect
        x={-12}
        y={6}
        width={24}
        height={12}
        fill={SCENE_COLORS.circuit.bulbBase}
        stroke="#1F2937"
        strokeWidth={1}
      />
      <line x1={-12} y1={10} x2={12} y2={10} stroke="#1F2937" strokeWidth={1} />
      <line x1={-12} y1={14} x2={12} y2={14} stroke="#1F2937" strokeWidth={1} />

      {/* C. 玻璃灯罩（通电时填充淡黄色） */}
      <circle
        cx={0}
        cy={-10}
        r={18}
        fill={isLit ? `rgba(254, 249, 196, ${Math.min(0.35, 0.05 + power * 0.07)})` : SCENE_COLORS.circuit.bulbGlass}
        stroke={isLit ? SCENE_COLORS.bulb.normal : SCENE_COLORS.circuit.bulbGlassStroke}
        strokeWidth={1.8}
      />
      <path
        d="M -11 4 C -11 -2, -18 -8, -18 -10 C -18 -20, 18 -20, 18 -10 C 18 -8, 11 -2, 11 4 Z"
        fill={isLit ? `rgba(254, 249, 196, ${Math.min(0.2, 0.02 + power * 0.04)})` : 'rgba(255, 255, 255, 0.15)'}
        stroke={isLit ? SCENE_COLORS.bulb.normal : SCENE_COLORS.circuit.bulbGlassStroke}
        strokeWidth={1.5}
      />

      {/* D. 内部导线支架 */}
      <line x1={-6} y1={6} x2={-4} y2={-6} stroke="#475569" strokeWidth={1} />
      <line x1={6} y1={6} x2={4} y2={-6} stroke="#475569" strokeWidth={1} />

      {/* E. 发热钨丝 */}
      <path
        d="M -4 -6 Q 0 -14, 4 -6"
        fill="none"
        stroke={isLit ? SCENE_COLORS.bulb.overload : SCENE_COLORS.circuit.bulbFilament}
        strokeWidth={isLit ? 2.5 : 1.2}
        style={{
          filter: isLit ? `drop-shadow(0px 0px 2px ${SCENE_COLORS.bulb.overload})` : 'none',
        }}
      />

      {/* F. 文字标签 */}
      {showLabel && (
        <text
          x={0}
          y={32}
          fill="#475569"
          fontSize={11}
          fontWeight="bold"
          textAnchor="middle"
        >
          {label}
        </text>
      )}
    </g>
  )
}

export default LightBulb
