import { useRef, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { Card, MiniChart } from '@/components/UI'
import { SECOND_LAW_COLORS } from '@/theme/physics/secondLawColors'

const MAX_POINTS = 200

export default function SecondLawCenterExtra() {
  const { time, isPlaying, params } = useAnimationStore(
    useShallow((s) => ({
      time: s.time,
      isPlaying: s.isPlaying,
      params: s.params,
    })),
  )

  const entropyHistoryRef = useRef<Record<string, number>[]>([])
  const lastSampleTimeRef = useRef(-1)

  // 每 0.15 秒采样一个熵值点
  useMemo(() => {
    if (!isPlaying) return
    const interval = 0.15
    if (time - lastSampleTimeRef.current >= interval) {
      lastSampleTimeRef.current = time
      const scene = params.scene ?? 0
      // 逻辑斯蒂曲线：S(t) = 1 / (1 + e^(-k(t - t0)))
      const k = scene === 0 ? 0.8 : 1.2
      const t0 = scene === 0 ? 8 : 5
      const S = 1 / (1 + Math.exp(-k * (time - t0)))
      const S_clamped = Math.max(0, Math.min(1, S))

      entropyHistoryRef.current.push({ t: time, S: S_clamped })
      if (entropyHistoryRef.current.length > MAX_POINTS) {
        entropyHistoryRef.current.shift()
      }
    }
  }, [time, isPlaying, params.scene])

  const currentS = useMemo(() => {
    const scene = params.scene ?? 0
    const k = scene === 0 ? 0.8 : 1.2
    const t0 = scene === 0 ? 8 : 5
    return Math.max(0, Math.min(1, 1 / (1 + Math.exp(-k * (time - t0)))))
  }, [time, params.scene])

  const history = entropyHistoryRef.current

  return (
    <Card className="p-3">
      <MiniChart
        title="微观无序度 S 随时间变化"
        xMin={0}
        xMax={30}
        yMin={0}
        yMax={1.05}
        points={history}
        lines={[
          {
            key: 'S',
            color: SECOND_LAW_COLORS.entropyLine,
            strokeWidth: 2,
            name: '无序度 S',
          },
        ]}
        xKey="t"
        yLabel="S（无序度）"
        xLabel="t (s)"
        currentVals={{ S: currentS }}
        currentXVal={time}
        staticLines={[
          {
            value: 1,
            color: '#94A3B8',
            strokeDasharray: '4 2',
            name: '完全无序',
          },
        ]}
        minHeight={140}
      />
    </Card>
  )
}
