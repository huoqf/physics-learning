import React from 'react'
import { SCENE_COLORS, PHYSICS_COLORS } from '@/theme/physics'

export interface SolenoidProps {
  x?: number // 中心 x 坐标
  y?: number // 中心 y 坐标
  width?: number // 总宽度
  height?: number // 总高度
  turns?: number // 匝数
  current?: number // 感应电流大小 (含符号，决定光点流速和方向)
  time?: number // 动画时间，用于流光点移动
  className?: string
}

export const Solenoid: React.FC<SolenoidProps> = ({
  x = 0,
  y = 0,
  width = 160,
  height = 80,
  turns = 5,
  current = 0,
  time = 0,
  className = '',
}) => {
  const c = SCENE_COLORS.coil
  const rx = 16 // 椭圆 x 半径 (管径方向)
  const ry = height / 2 // 椭圆 y 半径

  // 计算每一匝的间距
  const step = width / (turns + 1)
  const startX = -width / 2 + step

  // 生成每一匝的中心 X 坐标
  const turnCenters = Array.from({ length: turns }).map((_, i) => startX + i * step)

  // 流光点位置计算：当 current 绝对值大于一定阈值时才显示
  const hasCurrent = Math.abs(current) > 0.05
  const flowSpeed = current * 5 // 流动速度

  return (
    <g transform={`translate(${x}, ${y})`} className={className}>
      {/* 1. 绘制管状骨架/铁芯 (拟物金属渐变) */}
      <defs>
        <linearGradient id="ironCoreGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="30%" stopColor="#94A3B8" />
          <stop offset="50%" stopColor="#E2E8F0" />
          <stop offset="70%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>
      {/* 铁芯主体 */}
      <rect
        x={-width / 2 - 10}
        y={-ry + 6}
        width={width + 20}
        height={height - 12}
        rx="4"
        fill="url(#ironCoreGrad)"
        stroke="#1E293B"
        strokeWidth="1.5"
      />

      {/* 2. 绘制每一匝的后半部分 (被铁芯挡住的半圈弧线，使用虚线或暗色细线，表示空腔绕线) */}
      {turnCenters.map((cx, idx) => (
        <path
          key={`back-${idx}`}
          d={`M ${cx} ${-ry} A ${rx} ${ry} 0 0 0 ${cx} ${ry}`}
          fill="none"
          stroke={c.copperDark}
          strokeWidth="3.5"
          opacity="0.3"
        />
      ))}

      {/* 3. 绘制引出导线 (连接到下方的电流计接口，从两端绕组引出) */}
      {/* 左引出线 */}
      <path
        d={`M ${turnCenters[0]} ${ry} C ${turnCenters[0] - 20} ${ry + 30}, ${-width / 2} ${ry + 50}, ${-width / 2} 120`}
        fill="none"
        stroke={c.copperBase}
        strokeWidth="3"
      />
      {/* 右引出线 */}
      <path
        d={`M ${turnCenters[turns - 1]} ${-ry} C ${turnCenters[turns - 1] + 30} ${-ry - 10}, ${width / 2} ${ry + 50}, ${width / 2} 120`}
        fill="none"
        stroke={c.copperBase}
        strokeWidth="3"
      />

      {/* 4. 绘制每一匝的前半部分 (绕在铁芯前方的半圈，亮色铜导线) */}
      {turnCenters.map((cx, idx) => (
        <g key={`front-group-${idx}`}>
          {/* 前半圈铜线 */}
          <path
            d={`M ${cx} ${ry} A ${rx} ${ry} 0 0 0 ${cx} ${-ry}`}
            fill="none"
            stroke={c.copperBase}
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* 铜线受光面高光 */}
          <path
            d={`M ${cx - 1} ${ry - 2} A ${rx - 1} ${ry - 2} 0 0 0 ${cx - 1} ${-ry + 2}`}
            fill="none"
            stroke={c.copperLight}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>
      ))}

      {/* 5. 绘制感应电流流动粒子 (青色光点) */}
      {hasCurrent &&
        turnCenters.map((cx, idx) => {
          // 每一匝上前侧弧线流动 2 个粒子
          return [0, 1].map((pIdx) => {
            // 计算粒子当前的弧线参数 t (0 到 Math.PI，前侧半圆从 y = ry 绕到 y = -ry)
            // t 随时间流动，且不同粒子有相位差
            const phase = pIdx * Math.PI
            const t = ((time * flowSpeed + phase) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
            
            // 我们只在粒子处于前侧弧线 (0 <= t <= Math.PI) 时渲染，后侧就不渲染了，制造出前后环绕感
            if (t > Math.PI) return null

            // 椭圆参数方程计算粒子坐标
            const px = cx - rx * Math.sin(t) // 沿 x 摆动
            const py = ry * Math.cos(t)       // 沿 y 摆动

            return (
              <circle
                key={`glow-${idx}-${pIdx}`}
                cx={px}
                cy={py}
                r="4.5"
                fill={PHYSICS_COLORS.kineticEnergy} // 青色
                filter="drop-shadow(0 0 3px #06B6D4)"
              />
            )
          })
        })}

      {/* 导线连接点阴影 */}
      <circle cx={-width / 2} cy="120" r="3" fill="#1E293B" />
      <circle cx={width / 2} cy="120" r="3" fill="#1E293B" />
    </g>
  )
}

export default Solenoid
