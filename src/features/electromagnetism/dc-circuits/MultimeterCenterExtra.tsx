import { FC, useMemo } from 'react'
import { Card } from '@/components/UI'
import { useAnimationStore } from '@/stores'
import { calculateOhmmeter } from '@/physics'
import { duration, easing } from '@/theme/motion'

export const MultimeterCenterExtra: FC = () => {
  const params = useAnimationStore((s) => s.params)

  const opMode = params.opMode ?? 0
  const multiplier = params.multiplier ?? 1
  const R_adjust = params.R_adjust ?? 199
  const Rx = params.Rx ?? 1500
  const E = 1.5
  const Rg = 100
  const r = 1
  const Ig = 0.001

  // 物理计算
  const res = calculateOhmmeter(E, Rg, r, R_adjust, Rx, multiplier, Ig)
  const ratio = res.ratio
  const R_mid = 15 * multiplier // 中值电阻，倍率折算 
  const pointerAngle = -60 + ratio * 120

  const CX = 420
  const CY = 180
  const R_arc = 120

  // 渲染非均匀刻度
  const ticks = useMemo(() => {
    const arr = [
      { ratioVal: 0, label: '0' },
      { ratioVal: 0.2, label: (R_mid * 0.2).toFixed(0) },
      { ratioVal: 0.5, label: (R_mid * 0.5).toFixed(0) },
      { ratioVal: 1.0, label: R_mid.toFixed(0) },
      { ratioVal: 2.0, label: (R_mid * 2.0).toFixed(0) },
      { ratioVal: 5.0, label: (R_mid * 5.0).toFixed(0) },
      { ratioVal: 10.0, label: (R_mid * 10.0).toFixed(0) },
      { ratioVal: 20.0, label: (R_mid * 20.0).toFixed(0) },
      { ratioVal: 50.0, label: (R_mid * 50.0).toFixed(0) },
      { ratioVal: Infinity, label: '∞' }
    ]
    return arr.map((item) => {
      let tickRatio = 0
      if (item.ratioVal !== Infinity) {
        tickRatio = 1 / (1 + item.ratioVal)
      }
      const angle = -60 + tickRatio * 120
      const rad = (angle - 90) * (Math.PI / 180)
      return {
        x1: CX + R_arc * Math.cos(rad),
        y1: CY + R_arc * Math.sin(rad),
        x2: CX + (R_arc - 8) * Math.cos(rad),
        y2: CY + (R_arc - 8) * Math.sin(rad),
        tx: CX + (R_arc - 18) * Math.cos(rad),
        ty: CY + (R_arc - 18) * Math.sin(rad),
        label: item.label,
        angle
      }
    })
  }, [R_mid])

  return (
    <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50">
      <Card className="flex-1 p-3 flex flex-col justify-center min-w-0 relative bg-neutral-900 text-white rounded-lg shadow-inner overflow-hidden animate-fade-in">
        <span className="absolute top-3 left-4 text-xs font-semibold text-neutral-400">非线性欧姆表盘 (表头满偏 Ig = 1.0mA)</span>
        
        <svg className="w-full h-full" viewBox="0 0 840 200">
          <defs>
            <radialGradient id="dial-backlight" cx="50%" cy="100%" r="80%">
              <stop offset="0%" stopColor="rgba(34, 197, 94, 0.15)" />
              <stop offset="50%" stopColor="rgba(34, 197, 94, 0.03)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
            </radialGradient>
            <filter id="pointer-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>

          <rect x={0} y={0} width={840} height={200} fill="url(#dial-backlight)" rx={8} />
          
          <path
            d={`M ${CX - R_arc * Math.cos(Math.PI/6)} ${CY - R_arc * Math.sin(Math.PI/6)} A ${R_arc} ${R_arc} 0 0 1 ${CX + R_arc * Math.cos(Math.PI/6)} ${CY - R_arc * Math.sin(Math.PI/6)}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth={2}
          />

          {ticks.map((t, idx) => (
            <g key={idx}>
              <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
              <text
                x={t.tx}
                y={t.ty + 3}
                fill={t.label === '∞' || t.label === '0' ? '#22c55e' : 'rgba(255, 255, 255, 0.7)'}
                fontSize={t.label.length > 3 ? 8 : 10}
                fontWeight={t.label === '∞' || t.label === '0' || t.label === R_mid.toFixed(0) ? 'bold' : 'normal'}
                textAnchor="middle"
                fontFamily="monospace"
              >
                {t.label}
              </text>
            </g>
          ))}

          <text x={CX} y={CY - 40} fill="rgba(255, 255, 255, 0.25)" fontSize={16} fontWeight="bold" textAnchor="middle" letterSpacing="4">
            OHM METER
          </text>
          <text x={CX} y={CY - 22} fill="#22c55e" fontSize={11} fontWeight="semibold" textAnchor="middle">
            中值电阻 R_中 = {R_mid.toFixed(0)} Ω
          </text>

          <circle cx={CX} cy={CY} r={6} fill="#ef4444" />
          <circle cx={CX} cy={CY} r={2} fill="#fff" />

          <g
            transform={`rotate(${pointerAngle}, ${CX}, ${CY})`}
            style={{
              transition: `transform ${duration.normal}ms ${easing.decelerate}`,
              transformOrigin: `${CX}px ${CY}px`,
            }}
            filter="url(#pointer-shadow)"
          >
            <line
              x1={CX}
              y1={CY}
              x2={CX}
              y2={CY - R_arc - 10}
              stroke="#ef4444"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>

          <text x={CX - 150} y={CY - 10} fill="rgba(255, 255, 255, 0.6)" fontSize={11}>
            指针偏转: {(ratio * 100).toFixed(1)}%
          </text>
          <text x={CX + 80} y={CY - 10} fill="rgba(255, 255, 255, 0.6)" fontSize={11}>
            当前读数: {opMode === 0 ? '0 Ω (已短接)' : (ratio <= 0.005 ? '∞ Ω' : `${Rx} Ω`)}
          </text>
        </svg>
      </Card>
    </div>
  )
}

export default MultimeterCenterExtra
