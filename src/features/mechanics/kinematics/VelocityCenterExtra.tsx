import { useMemo, useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS } from '@/theme/physics'
import {
  calculateInstantaneousVelocity,
} from '@/physics'
import type { VariableMotionModel, VariableMotionParams } from '@/physics'
import { VelocityXTChart } from './VelocityXTChart'
import { VelocityVTChart } from './VelocityVTChart'
import VelocityAnimationStrip from './VelocityAnimationStrip'
import { AnimationControls } from '@/components/UI'

/**
 * 速度进阶版 CenterExtra — 三合一布局容器
 *
 * 根据运动模型的 aspectRatio 动态选择布局：
 * - landscape (宽高比 > 1): 图表左右并列在上，动画在下
 * - portrait (宽高比 <= 1): 动画在左，图表上下并列在右
 */
export default function VelocityCenterExtra() {
  const { params, time, isPlaying, speed, setIsPlaying, setTime, setSpeed } = useAnimationStore()

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

  // ── 当前物理状态 ──
  const { vBar, vInst, residual } = calculateInstantaneousVelocity(model, modelParams, t0, deltaT)

  // SHM 模式下到达 chartTMax 自动暂停，展示完整波形
  useEffect(() => {
    if (model === 'shm' && isPlaying && time >= chartTMax) {
      setIsPlaying(false)
    }
  }, [model, isPlaying, time, chartTMax, setIsPlaying])

  const modelNames = ['变加速（F递增）', '简谐振动', '往返多阶段']

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* ── 信息条 ── */}
      <div className="w-full shrink-0 bg-white rounded-xl shadow-sm border border-neutral-100 px-4 py-2 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 rounded shrink-0" style={{ backgroundColor: PHYSICS_COLORS.secantLine }} />
          <span className="text-neutral-600">v̄ = {vBar.toFixed(3)} m/s</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 rounded shrink-0" style={{ backgroundColor: PHYSICS_COLORS.tangentLine }} />
          <span className="text-neutral-600">v = {vInst.toFixed(3)} m/s</span>
        </div>
        <span className="text-neutral-500">残差 = {residual.toFixed(4)}</span>
        <div className="ml-auto text-neutral-400 shrink-0">
          {modelNames[modelIdx]}
        </div>
      </div>

      {/* ── 横向布局：图表左右并列在上，动画在下 ── */}
      {/* Row 1: x-t 图 + v-t 图 左右并列 */}
      <div className="w-full flex-[2] flex flex-row gap-3">
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
          <VelocityXTChart
            model={model}
            modelParams={modelParams}
            t0={t0}
            deltaT={deltaT}
            tMax={chartTMax}
          />
        </div>
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
          <VelocityVTChart
            model={model}
            modelParams={modelParams}
            t0={t0}
            deltaT={deltaT}
            tMax={chartTMax}
          />
        </div>
      </div>
      {/* Row 2: 运动动画带 */}
      <div className="w-full flex-1 bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
        <VelocityAnimationStrip
          model={model}
          modelParams={modelParams}
          tMax={chartTMax}
        />
      </div>

      {/* ── 动画控制栏 ── */}
      <div className="w-full shrink-0 bg-white rounded-xl shadow-sm border border-neutral-100 p-2">
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
      </div>
    </div>
  )
}
