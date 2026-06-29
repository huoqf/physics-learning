import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import type { VariableMotionModel, VariableMotionParams } from '../../../physics'
import {
  calculateAverageVelocity,
  calculateVariableAcceleration,
  calculateInstantaneousVelocity,
} from '../../../physics'

interface Params {
  advancedMode: number
  v: number
  deltaT: number
  modelIdx: number
  modelK: number
  modelV0: number
  modelA: number
  modelOmega: number
  modelA1: number
  modelVMax: number
  modelA3: number
  modelT1: number
  modelT2Dur: number
  modelTStop: number
  modelA5: number
}

const DEFAULTS: ParamDefs<Params> = {
  advancedMode: { default: 0 },
  v: { default: 8 },
  deltaT: { default: 2 },
  modelIdx: { default: 0 },
  modelK: { default: 1 },
  modelV0: { default: 0 },
  modelA: { default: 5 },
  modelOmega: { default: 2 },
  modelA1: { default: 2 },
  modelVMax: { default: 6 },
  modelA3: { default: 3 },
  modelT1: { default: 3 },
  modelT2Dur: { default: 2 },
  modelTStop: { default: 2 },
  modelA5: { default: 3 },
}

export function handleVelocity(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-velocity') return null
  const p = normalizeParams(params, DEFAULTS)
  const isAdvanced = (p.advancedMode ?? 0) === 1

  if (!isAdvanced) {
    const v = p.v ?? 8
    const deltaT = p.deltaT ?? 2
    const t1 = time
    const t2 = time + deltaT
    const x1 = v * t1
    const x2 = v * t2
    const { vBar } = calculateAverageVelocity(x1, x2, t1, t2)
    const isDeltaTSmall = deltaT <= 0.05
    const conceptStatus = isDeltaTSmall
      ? 'Δt 极小，平均速度≈瞬时速度'
      : deltaT <= 0.5
        ? 'Δt 较小，平均速度接近瞬时速度'
        : 'Δt 较大，平均速度无法代表该瞬间'

    return {
      quantities: [
        ...base,
        { label: '平均速度 v̄', value: vBar, unit: 'm/s', highlight: 'positive' as const },
        { label: '概念状态', value: conceptStatus, unit: '' },
      ],
      gaokaoPoints: [
        { text: '速度是矢量，方向就是物体此时的运动方向', importance: 'core' as const },
        { text: '平均速度大小不一定等于平均速率', importance: 'hard' as const },
      ],
    }
  } else {
    const modelIdx = p.modelIdx ?? 0
    const model: VariableMotionModel = ['force-increasing', 'shm', 'multi-stage'][modelIdx] as VariableMotionModel
    const modelParams: VariableMotionParams = {
      k: p.modelK ?? 1,
      v0: p.modelV0 ?? 0,
      A: p.modelA ?? 5,
      omega: p.modelOmega ?? 2,
      a1: p.modelA1 ?? 2,
      vMax: p.modelVMax ?? 6,
      a3: p.modelA3 ?? 3,
      t1: p.modelT1 ?? 3,
      t2Duration: p.modelT2Dur ?? 2,
      tStop: p.modelTStop ?? 2,
      a5: p.modelA5 ?? 3,
    }
    const t0 = time
    const deltaT = p.deltaT ?? 0.5
    const { vBar, vInst, residual } = calculateInstantaneousVelocity(model, modelParams, t0, deltaT)

    if (model === 'multi-stage') {
      const currentState = calculateVariableAcceleration(model, modelParams, time)
      const vMax = modelParams.vMax ?? 6
      const t1 = modelParams.t1 ?? 3
      const t2Dur = modelParams.t2Duration ?? 2
      const a3 = modelParams.a3 ?? 3
      const tStop = modelParams.tStop ?? 2
      const t1End = t1
      const t2End = t1End + t2Dur
      const t3Dur = vMax / a3
      const t3End = t2End + t3Dur
      const t4End = t3End + tStop
      let stageName = '正向加速'
      if (time > t4End) stageName = '快速返回'
      else if (time > t3End) stageName = '卸货停留'
      else if (time > t2End) stageName = '正向减速'
      else if (time > t1End) stageName = '正向匀速'
      let totalDist = 0
      const pathSteps = 200
      let prevX = 0
      for (let i = 1; i <= pathSteps; i++) {
        const t = (time * i) / pathSteps
        const s = calculateVariableAcceleration(model, modelParams, t)
        totalDist += Math.abs(s.x - prevX)
        prevX = s.x
      }
      const avgSpeed = time > 0 ? currentState.x / time : 0
      const avgRate = time > 0 ? totalDist / time : 0

      return {
        quantities: [
          ...base,
          { label: '当前阶段', value: stageName, unit: '' },
          { label: '路程 s', value: totalDist, unit: 'm' },
          { label: '平均速度 v̄', value: avgSpeed, unit: 'm/s' },
          { label: '平均速率 v_率', value: avgRate, unit: 'm/s' },
          { label: '核心对比', value: '位移≠路程，平均速度≠平均速率', unit: '' },
        ],
        gaokaoPoints: [
          { text: '往返全程位移为0，平均速度即为0', importance: 'gaokao' as const },
          { text: '速度正负仅代表方向，不代表大小', importance: 'core' as const },
          { text: '多阶段运动求全程平均速度，必须用总位移÷总时间', importance: 'hard' as const },
        ],
      }
    }

    return {
      quantities: [
        ...base,
        { label: '割线斜率 v̄', value: vBar, unit: 'm/s' },
        { label: '切线斜率 v', value: vInst, unit: 'm/s', highlight: 'positive' as const },
        { label: '绝对残差 |v̄-v|', value: residual, unit: 'm/s', highlight: residual < 0.1 ? 'zero' as const : 'negative' as const },
        { label: '微积分映射', value: 'v = dx/dt = x\'(t)', unit: '' },
      ],
      gaokaoPoints: [
        { text: 'x-t 图线切线斜率表速度，拐点速度为零', importance: 'gaokao' as const },
        { text: '运动方向由斜率正负决定', importance: 'core' as const },
        { text: '纸带求瞬时速度，本质利用了中间时刻速度思想', importance: 'hard' as const },
      ],
    }
  }
}
