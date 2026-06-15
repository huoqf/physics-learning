import React from 'react'
import { SCENE_COLORS, PHYSICS_COLORS } from '@/theme/physics'

export interface RheostatProps {
  /** 中心 x 坐标 */
  x?: number
  /** 中心 y 坐标 */
  y?: number
  /** 当前电阻值 */
  value?: number
  /** 最小电阻值 */
  min?: number
  /** 最大电阻值 */
  max?: number
  /** 变阻器宽度 (基准大小为 140) */
  width?: number
  /** 是否显示阻值标签 */
  showLabel?: boolean
  /** 自定义标签名称（例如：'滑动变阻器 R'，或 'R₂ (变)'） */
  label?: string
  /** 阻值单位 (默认 'Ω') */
  unit?: string
  /** 是否禁用/不可见交互 */
  disabled?: boolean
  /** 其他 CSS 类名 */
  className?: string
}

export const Rheostat: React.FC<RheostatProps> = ({
  x = 0,
  y = 0,
  value = 50,
  min = 0,
  max = 100,
  width = 140,
  showLabel = true,
  label = '滑动变阻器 R',
  unit = 'Ω',
  disabled = false,
  className = '',
}) => {
  const c = SCENE_COLORS.circuit

  // 基本尺寸定义 (组件基于 w=140 进行内部矢量缩放)
  const baseW = 140
  const scale = width / baseW

  // 比例计算游标位置 [0, 1]
  const range = max - min
  const ratio = range > 0 ? Math.max(0, Math.min(1, (value - min) / range)) : 0

  // 游标滑片在 local 坐标系下的水平位置范围为 [-60, 60] (磁管半宽 70, 预留左右安全距离)
  const wiperX = -60 + ratio * 120

  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale})`}
      className={`${className} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
    >
      {/* 1. 陶瓷瓷管底座 */}
      <rect
        x={-70}
        y={-10}
        width={140}
        height={20}
        rx={2}
        fill="#F5F5F4"
        stroke={c.resistorStroke}
        strokeWidth={1.5}
      />

      {/* 2. 细密铜线螺线圈 (利用 Loop 渲染) */}
      {Array.from({ length: 36 }).map((_, i) => {
        const lx = -68 + i * (136 / 35)
        return (
          <line
            key={`coil-${i}`}
            x1={lx}
            y1={-10}
            x2={lx}
            y2={10}
            stroke={SCENE_COLORS.coil.copperBase}
            strokeWidth={0.8}
            opacity={0.7}
            pointerEvents="none"
          />
        )
      })}

      {/* 3. 变阻器金属支架与滑杆 */}
      {/* 左右两侧支撑架 */}
      <path
        d="M -73 12 L -73 -20 L -67 -20"
        fill="none"
        stroke="#57534E"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M 73 12 L 73 -20 L 67 -20"
        fill="none"
        stroke="#57534E"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* 上方水平金属导电滑杆 */}
      <line x1={-71} y1={-20} x2={71} y2={-20} stroke="#A8A29E" strokeWidth={3} strokeLinecap="round" />

      {/* 4. 四个物理接线柱 (用于课件导线连接示意) */}
      {/* 左下 (A) */}
      <circle cx={-73} cy={10} r={3.5} fill="#44403C" stroke="#292524" strokeWidth={0.5} />
      <circle cx={-73} cy={10} r={1.2} fill="#D6D3D1" />
      {/* 右下 (B) */}
      <circle cx={73} cy={10} r={3.5} fill="#44403C" stroke="#292524" strokeWidth={0.5} />
      <circle cx={73} cy={10} r={1.2} fill="#D6D3D1" />
      {/* 左上 (C1) */}
      <circle cx={-73} cy={-20} r={3.5} fill="#44403C" stroke="#292524" strokeWidth={0.5} />
      <circle cx={-73} cy={-20} r={1.2} fill="#D6D3D1" />
      {/* 右上 (C2) */}
      <circle cx={73} cy={-20} r={3.5} fill="#44403C" stroke="#292524" strokeWidth={0.5} />
      <circle cx={73} cy={-20} r={1.2} fill="#D6D3D1" />

      {/* 5. 动态滑片游标 */}
      <g transform={`translate(${wiperX}, 0)`}>
        {/* 上部滑套 (套在滑杆上) */}
        <rect x={-6} y={-24} width={12} height={8} fill="#D6D3D1" stroke="#44403C" strokeWidth={1} rx={1} />
        {/* 下垂弹簧片 (接触瓷管线圈) */}
        <path d="M -3 -16 L -3 10 L 3 10 L 3 -16 Z" fill="#D97706" opacity="0.95" />
        <line x1={-4} y1={10} x2={4} y2={10} stroke="#B45309" strokeWidth={1.5} />
        {/* 指示金属小接点 */}
        <circle cx={0} cy={10} r={2} fill="#FBBF24" />
        {/* 顶部红热塑料手柄 */}
        <circle cx={0} cy={-28} r={5} fill="#EF4444" stroke="#B91C1C" strokeWidth={1} />
        <circle cx={0} cy={-28} r={1.5} fill="#FCA5A5" />
      </g>

      {/* 6. 可选阻值文本标签 */}
      {showLabel && (
        <text
          x={0}
          y={26}
          fill={PHYSICS_COLORS.labelText}
          fontSize={10.5}
          fontWeight="bold"
          textAnchor="middle"
          style={{ userSelect: 'none' }}
        >
          {label} = {value.toFixed(1)} {unit}
        </text>
      )}
    </g>
  )
}

export default Rheostat
