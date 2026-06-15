import React from 'react'
import { SCENE_COLORS, PHYSICS_COLORS } from '@/theme/physics'

export interface PrimaryCoilProps {
  x?: number // 中心 x
  y?: number // 中心 y
  width?: number // 总宽度
  height?: number // 总高度
  turns?: number // 匝数
  current?: number // 原线圈中的电流 (决定光点流速和方向，一般为 E/R，总是正的或者跟随电源极性)
  time?: number // 时间，用于粒子运动
  className?: string
}

export const PrimaryCoil: React.FC<PrimaryCoilProps> = ({
  x = 0,
  y = 0,
  width = 120,
  height = 66,
  turns = 4,
  current = 0,
  time = 0,
  className = '',
}) => {
  const c = SCENE_COLORS.coil
  const rx = 14 // 椭圆 x 半径
  const ry = height / 2 // 椭圆 y 半径

  // 计算每一匝的中心位置
  const step = width / (turns + 1)
  const startX = -width / 2 + step
  const turnCenters = Array.from({ length: turns }).map((_, i) => startX + i * step)

  // 粒子流动
  const hasCurrent = Math.abs(current) > 0.01
  const flowSpeed = current * 4 // 流动速度

  return (
    <g transform={`translate(${x}, ${y})`} className={className}>
      {/* 1. 铁芯 (拟物金属渐变) */}
      <defs>
        <linearGradient id="primaryIronCoreGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="30%" stopColor="#64748B" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="70%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
      </defs>
      <rect
        x={-width / 2 - 12}
        y={-ry + 6}
        width={width + 24}
        height={height - 12}
        rx="3"
        fill="url(#primaryIronCoreGrad)"
        stroke="#0F172A"
        strokeWidth="1.5"
      />

      {/* 2. 后半部分绕线 */}
      {turnCenters.map((cx, idx) => (
        <path
          key={`pri-back-${idx}`}
          d={`M ${cx} ${-ry} A ${rx} ${ry} 0 0 0 ${cx} ${ry}`}
          fill="none"
          stroke={c.enamelStroke}
          strokeWidth="3"
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
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          {/* 高光 */}
          <path
            d={`M ${cx - 0.8} ${ry - 1.8} A ${rx - 0.8} ${ry - 1.8} 0 0 0 ${cx - 0.8} ${-ry + 1.8}`}
            fill="none"
            stroke="#ADCE5A" // 绿高光色
            strokeWidth="1"
            opacity="0.6"
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* 5. 绘制原电流流动粒子 (红色光点，表示回路中有稳恒电流在流动) */}
      {hasCurrent &&
        turnCenters.map((cx, idx) => {
          return [0, 1].map((pIdx) => {
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
                r="3.5"
                fill={PHYSICS_COLORS.electricCurrent} // 电流红
                filter="drop-shadow(0 0 2px #EF4444)"
              />
            )
          })
        })}

      {/* 导线端点 */}
      <circle cx={-width / 2} cy="120" r="2.5" fill="#1E293B" />
      <circle cx={width / 2} cy="120" r="2.5" fill="#1E293B" />
    </g>
  )
}

export default PrimaryCoil
