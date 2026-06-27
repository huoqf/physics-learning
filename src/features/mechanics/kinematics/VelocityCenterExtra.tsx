import { useMemo, useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import type { VariableMotionModel, VariableMotionParams } from '@/physics'
import { VelocityXTChart } from './VelocityXTChart'
import { VelocityVTChart } from './VelocityVTChart'
import VelocityAnimationStrip from './VelocityAnimationStrip'
import { AnimationControls, Card } from '@/components/UI'

/**
 * 速度进阶版 CenterExtra — 三合一布局容器
 *
 * 根据运动模型的 aspectRatio 动态选择布局：
 * - landscape (宽高比 > 1): 图表左右并列在上，动画在下
 * - portrait (宽高比 <= 1): 动画在左，图表上下并列在右
 */
export default function VelocityCenterExtra() {
    const {params, time, isPlaying, speed, setIsPlaying, setTime, setSpeed} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    isPlaying: s.isPlaying,
    speed: s.speed,
    setIsPlaying: s.setIsPlaying,
    setTime: s.setTime,
    setSpeed: s.setSpeed,
    }))
  )

  // ── 参数 ──
  const modelIdx = params.modelIdx ?? 0
  const model: VariableMotionModel = ['force-increasing', 'shm', 'multi-stage'][modelIdx] as VariableMotionModel
  const modelParams: VariableMotionParams = {
    k: params.modelK ?? 1,
    v0: params.modelV0 ?? 0,
    A: params.modelA ?? 5,
    omega: params.modelOmega ?? 2,
    a1: params.modelA1 ?? 2,
    vMax: params.modelVMax ?? 6,
    a3: params.modelA3 ?? 3,
    t1: params.modelT1 ?? 3,
    t2Duration: params.modelT2Dur ?? 2,
    tStop: params.modelTStop ?? 2,
    a5: params.modelA5 ?? 3,
  }
  // t0 使用动画时间，使图表随动画实时更新
  const t0 = time
  const deltaT = params.deltaT ?? 0.5
  // 图表显示时间范围：SHM 只显示2个周期，避免曲线过于密集
  const chartTMax = useMemo(() => {
    if (model === 'shm') {
      const omega = modelParams.omega ?? 2
      return (2 * Math.PI / omega) * 2 // 2个周期
    }
    return 30
  }, [model, modelParams.omega])

  // SHM 模式下到达 chartTMax 自动暂停，展示完整波形
  useEffect(() => {
    if (model === 'shm' && isPlaying && time >= chartTMax) {
      setIsPlaying(false)
    }
  }, [model, isPlaying, time, chartTMax, setIsPlaying])

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* ── 横向布局：图表左右并列在上，动画在下 ── */}
      {/* Row 1: x-t 图 + v-t 图 左右并列 */}
      <div className="w-full flex-[2] flex flex-row gap-3">
        <Card className="flex-1 overflow-hidden">
          <VelocityXTChart
            model={model}
            modelParams={modelParams}
            t0={t0}
            deltaT={deltaT}
            tMax={chartTMax}
          />
        </Card>
        <Card className="flex-1 overflow-hidden">
          <VelocityVTChart
            model={model}
            modelParams={modelParams}
            t0={t0}
            deltaT={deltaT}
            tMax={chartTMax}
          />
        </Card>
      </div>
      {/* Row 2: 运动动画带 */}
      <Card className="w-full flex-1 overflow-hidden">
        <VelocityAnimationStrip
          model={model}
          modelParams={modelParams}
          tMax={chartTMax}
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
          onReset={() => setTime(0)}
          onSpeedChange={setSpeed}
          onTimeChange={setTime}
        />
      </Card>
    </div>
  )
}
