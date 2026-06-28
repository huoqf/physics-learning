import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useState } from 'react'
import { useUniformAccelerationPhysics } from './useUniformAccelerationPhysics'
import { AnimationControls, Card } from '@/components/UI'
import { StroboscopicAnimation } from './StroboscopicAnimation'
import { VtChartWithArea } from './VtChartWithArea'
import { FlashDataTable } from './FlashDataTable'

/**
 * 匀变速直线运动 · 进阶模式 CenterExtra
 *
 * 遵循 project_rules.md 规范：冷白背景、工程线框风格、可见元素 ≤ 7、精密三屏联动。
 */
export default function UniformAccelerationCenterExtra() {
    const {params, time, isPlaying, speed, showVectors, setIsPlaying, setTime, setSpeed} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    isPlaying: s.isPlaying,
    speed: s.speed,
    showVectors: s.showVectors,
    setIsPlaying: s.setIsPlaying,
    setTime: s.setTime,
    setSpeed: s.setSpeed,
    }))
  )

  const { v0 = 0, a = 1.5, flashPeriod = 1 } = params
  const physics = useUniformAccelerationPhysics(v0, a, time, flashPeriod)

  // 三屏联动：当前悬停高亮的频闪位移段索引 (globalIndex)
  const [hoveredFlashIdx, setHoveredFlashIdx] = useState<number | null>(null)

  const T = flashPeriod

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* ── 上半部分：数据表 + v-t图(含公式推导) 并列 ── */}
      <div className="w-full flex-[3] flex flex-row gap-2">
        {/* 左侧：频闪数据表 */}
        <Card className="w-[35%] overflow-hidden">
          <FlashDataTable
            flashPoints={physics.flashPoints}
            a={a}
            T={T}
            hoveredFlashIdx={hoveredFlashIdx}
            setHoveredFlashIdx={setHoveredFlashIdx}
          />
        </Card>
        {/* 右侧：v-t 图 + 公式推导 */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-[3]">
            <VtChartWithArea
              v0={v0}
              a={a}
              time={time}
              physics={physics}
              T={T}
              hoveredFlashIdx={hoveredFlashIdx}
            />
          </div>
        </Card>
      </div>

      {/* ── 下半部分：频闪虚影动画（精密对比槽） ── */}
      <Card className="w-full flex-[2] overflow-hidden">
        <StroboscopicAnimation
          v0={v0}
          a={a}
          time={time}
          physics={physics}
          showVectors={showVectors}
          hoveredFlashIdx={hoveredFlashIdx}
        />
      </Card>

      {/* ── 动画控制栏 ── */}
      <Card className="w-full shrink-0 p-2">
        <AnimationControls
          isPlaying={isPlaying}
          speed={speed}
          time={time}
          maxTime={30}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onReset={() => { setTime(0); setIsPlaying(false) }}
          onSpeedChange={setSpeed}
          onTimeChange={setTime}
        />
      </Card>
    </div>
  )
}