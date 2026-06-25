/**
 * 运动学物理量看板数据构建。
 *
 * 从 physicsQuantities.ts 拆分出的运动学相关动画物理量构建逻辑。
 */
import type { PhysicsPanelData } from './types'
import type { VariableMotionModel, VariableMotionParams } from '../../physics'
import {
  GRAVITY,
  calculateAcceleratedMotion,
  calculateFreeFall,
  precomputeProjectileWithDrag,
  precomputeObliqueThrowWithDrag,
  calculateAverageVelocity,
  calculateVariableAcceleration,
  calculateInstantaneousVelocity,
  calculateDualObjectComparison,
  calculatePoliceChase,
} from '../../physics'
import { interpolateTrajectoryPoint } from '../../utils/trajectory'

export function buildKinematicsQuantities(
  animId: string,
  params: Record<string, number>,
  time: number
): PhysicsPanelData | null {
  const base: PhysicsPanelData['quantities'] = []

  switch (animId) {
    case 'anim-velocity': {
      const isAdvanced = (params.advancedMode ?? 0) === 1

      if (!isAdvanced) {
        // ── 基础版：生活场景，平均速度 vs 瞬时速度 ──
        const v = params.v ?? 8
        const deltaT = params.deltaT ?? 2
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
        // ── 进阶版：图象极限逼近 ──
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
        const t0 = time
        const deltaT = params.deltaT ?? 0.5
        const { vBar, vInst, residual } = calculateInstantaneousVelocity(model, modelParams, t0, deltaT)

        if (model === 'multi-stage') {
          // ── 多阶段专属看板 ──
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
          // 路程近似计算
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
    case 'anim-acceleration': {
      const advancedMode = params.advancedMode ?? 0

      if (advancedMode === 0) {
        // ── 基础版：双物体赛跑 ──
        const vA = params.vA ?? 200
        const aB = params.aB ?? 5
        const deltaT = params.deltaT ?? 1
        const result = calculateDualObjectComparison(vA, aB, deltaT, time)
        return {
          quantities: [
            ...base,
            { label: '飞机 Δv_A', value: result.deltaVA, unit: 'm/s', highlight: 'zero' as const },
            { label: '跑车 Δv_B', value: result.deltaVB, unit: 'm/s', highlight: 'positive' as const },
            { label: '核心结论', value: result.conclusion, unit: '', highlight: 'extreme' as const },
          ],
          gaokaoPoints: [
            { text: '加速度大小反映速度变化的快慢，与速度大小无关', importance: 'core' as const },
            { text: '速度大加速度可以为零；速度为零加速度可以很大', importance: 'hard' as const },
            { text: '加速度由合外力决定，采用比值定义法', importance: 'basic' as const },
          ],
        }
      } else {
        // ── 进阶版：警车追击问题 ──
        const vA = params.vA ?? 30
        const deltaX0 = params.deltaX0 ?? 50
        const t0 = params.t0 ?? 1
        const aB = params.aB ?? 3
        const vMax = params.vMax ?? 40
        const state = calculatePoliceChase(vA, deltaX0, t0, aB, vMax, time)

        // 共速时刻
        const tEqual = t0 + vA / aB

        // 相遇时刻
        const tMeetText = state.tMeet !== null ? `${state.tMeet.toFixed(2)}` : '尚未相遇'

        return {
          quantities: [
            ...base,
            { label: '轿车位置 xₐ', value: state.xA.toFixed(2), unit: 'm' },
            { label: '警车位置 xᵦ', value: state.xB.toFixed(2), unit: 'm' },
            { label: '当前车距 Δx', value: state.deltaX.toFixed(2), unit: 'm' },
            { label: '共速时刻 t', value: tEqual.toFixed(2), unit: 's' },
            { label: '相遇时刻 t', value: tMeetText, unit: 's' },
          ],
          formulas: [
            { name: '轿车位移', latex: `x_A = v_A \\cdot t`, level: 'core' },
            { name: '共速时刻', latex: `t = t_0 + \\frac{v_A}{a_B}`, level: 'core', condition: '警车加速期内' },
          ],
          gaokaoPoints: [
            { text: 'x-t 图交点看相遇，斜率看速度；不可与 v-t 图混淆', importance: 'core' as const },
            { text: '速度相等是距离具有极值的临界点，此时两车间距最大', importance: 'gaokao' as const },
            { text: '警车做匀加速运动时，其 x-t 对应二次函数抛物线', importance: 'hard' as const },
          ],
        }
      }
    }
    case 'anim-uniform-acceleration': {
      const v0 = params.v0 ?? 0
      const a = params.a ?? 1.5
      const advancedMode = params.advancedMode ?? 0
      const { v, s } = calculateAcceleratedMotion(v0, a, time)

      if (advancedMode === 0) {
        // ── 基础模式：右侧看板只放中间屏幕没有的推论和验证 ──
        const avgV = (v0 + v) / 2
        const vAtHalfT = v0 + a * (time / 2)
        const vSquared = v * v
        const v0Squared = v0 * v0
        const twoAS = 2 * a * s

        return {
          quantities: [
            ...base,
            { label: 'v²-v₀²', value: vSquared - v0Squared, unit: 'm²/s²' },
            { label: '2ax', value: twoAS, unit: 'm²/s²', highlight: Math.abs(vSquared - v0Squared - twoAS) < 0.01 ? 'zero' as const : undefined },
            { label: '平均速度 v̄', value: avgV, unit: 'm/s' },
            { label: 'v(t/2)', value: vAtHalfT, unit: 'm/s' },
            { label: 'v̄=v(t/2)?', value: Math.abs(avgV - vAtHalfT) < 0.01 ? '✓ 成立' : '✗', unit: '' },
          ],
          formulas: [
            { name: '速度位移关系', latex: `v^2 - v_0^2 = 2ax`, level: 'important', condition: '仅适用于匀变速直线运动' },
          ],
          gaokaoPoints: [
            { text: 'v-t 图象面积代表位移，图象斜率代表加速度大小', importance: 'core' as const },
            { text: '刹车问题中 v=0 后物体停止，不能盲目代公式——这是审题陷阱', importance: 'gaokao' as const },
            { text: '熟记 1:3:5:7 比例，仅适用于 v₀=0 的匀加速直线运动', importance: 'hard' as const },
          ],
        }
      } else {
        // ── 进阶模式：逐差法与平均速度推论 ──
        const T = params.flashPeriod ?? 1
        const deltaX = a * T * T
        const vAtHalfS = Math.sqrt((v0 * v0 + v * v) / 2)
        const vAtHalfT = (v0 + v) / 2
        const isAccelerating = v0 * a >= 0 && a !== 0

        // 隔项逐差法：a = (x₃ - x₁) / (2T²)
        const s1 = v0 * T + 0.5 * a * T * T
        const s3 = v0 * 3 * T + 0.5 * a * 9 * T * T
        const skipDiffA = (s3 - s1) / (2 * T * T)

        return {
          quantities: [
            ...base,
            { label: 'Δx = aT²', value: deltaX, unit: 'm', highlight: 'positive' as const },
            { label: 'v(s/2)', value: isFinite(vAtHalfS) ? vAtHalfS : 0, unit: 'm/s' },
            { label: 'v(t/2)', value: vAtHalfT, unit: 'm/s' },
            { label: 'v(s/2) vs v(t/2)', value: isAccelerating ? 'v(s/2) > v(t/2)' : 'v(s/2) < v(t/2)', unit: '' },
            { label: '隔项逐差 a', value: skipDiffA, unit: 'm/s²' },
          ],
          formulas: [
            { name: '逐差法', latex: `\\Delta x = aT^2 = ${a} \\times ${T}^2 = ${deltaX.toFixed(3)}\\;\\text{m}`, level: 'important', condition: '连续相等时间间隔' },
            { name: '隔项逐差', latex: `a = \\frac{x_3 - x_1}{2T^2}`, level: 'derived', note: '减小实验误差的优化方法' },
            { name: '中间位置速度', latex: `v_{s/2} = \\sqrt{\\frac{v_0^2+v^2}{2}}`, level: 'derived', condition: '匀变速直线运动' },
          ],
          gaokaoPoints: [
            { text: '连续相等时间位移差恒定（Δx=aT²）是判断匀变速的依据', importance: 'core' as const },
            { text: '中间时刻瞬时速度必等于全程平均速度，用于求加速度', importance: 'gaokao' as const },
            { text: '计算加速度建议用隔项逐差法 a=(x₃-x₁)/(2T²)，减小误差', importance: 'hard' as const },
          ],
        }
      }
    }
    case 'anim-free-fall': {
      const advancedMode = params.advancedMode ?? 0

      if (advancedMode === 0) {
        // ── 基础模式：牛顿管实验 ──
        const v0 = params.v0 ?? 0
        const g = params.g ?? GRAVITY
        const pressure = params.pressure ?? 0
        const objectA = params.objectA ?? 0
        const objectB = params.objectB ?? 0
        const { v: vA } = calculateFreeFall(v0, g, time)
        const { v: vB } = calculateFreeFall(v0, g, time)
        // 阻力估算（简化：用当前速度估算阻力大小）
        const baseDragA = objectA === 0 ? 0.001 : 0.01
        const baseDragB = objectB === 0 ? 0.02 : 0.015
        const dragK_A = pressure * baseDragA
        const dragK_B = pressure * baseDragB
        const fAirA = dragK_A * vA * Math.abs(vA)
        const fAirB = dragK_B * vB * Math.abs(vB)
        const envStatus = pressure < 0.01 ? '趋近自由落体' : pressure < 0.3 ? '空气阻力较小' : '空气阻力显著'

        return {
          quantities: [
            ...base,
            { label: 'A 动力学方程', value: pressure < 0.01 ? 'a = g' : 'mg - f = ma', unit: '' },
            { label: 'B 动力学方程', value: pressure < 0.01 ? 'a = g' : 'mg - f = ma', unit: '' },
            { label: 'A 阻力 f_A', value: fAirA, unit: 'N', highlight: fAirA > 0.01 ? 'negative' as const : 'zero' as const },
            { label: 'B 阻力 f_B', value: fAirB, unit: 'N', highlight: fAirB > 0.01 ? 'negative' as const : 'zero' as const },
            { label: '环境状态', value: envStatus, unit: '', highlight: pressure < 0.01 ? 'positive' as const : undefined },
          ],
          formulas: [
            { name: '自由落体速度', latex: 'v = gt', level: 'core', condition: '初速度为零、仅受重力' },
            { name: '自由落体位移', latex: 'h = \\frac{1}{2}gt^2', level: 'core', condition: '初速度为零、仅受重力' },
            { name: '速度位移关系', latex: 'v^2 = 2gh', level: 'important', condition: '初速度为零、仅受重力' },
          ],
          gaokaoPoints: [
            { text: '自由落体是初速度为零、仅受重力、加速度为g的匀加速运动', importance: 'core' as const },
            { text: '伽利略用"微斜面实验+合理外推"证明了自由落体规律', importance: 'gaokao' as const },
            { text: '实际落体运动中，若重力远大于阻力，可近似看作自由落体', importance: 'hard' as const },
          ],
        }
      } else {
        // ── 进阶模式：滴水法测g ──
        const latitude = params.latitude ?? 45
        const altitude = params.altitude ?? 0
        const dripPeriod = params.dripPeriod ?? 0.5
        const R_EARTH = 6371e3
        // 纬度修正
        const gLat = 9.780 * (1 + 0.005302 * Math.sin(latitude * Math.PI / 180) ** 2)
        // 海拔修正
        const gAlt = gLat * (R_EARTH / (R_EARTH + altitude * 1000)) ** 2
        // 滴水法测g：h = 0.5g(2T)²
        const h2T = 0.5 * gAlt * (2 * dripPeriod) ** 2
        const gMeasured = (2 * h2T) / ((2 * dripPeriod) ** 2)

        return {
          quantities: [
            ...base,
            { label: '纬度修正 g', value: gLat, unit: 'm/s²' },
            { label: '海拔修正 g\'', value: gAlt, unit: 'm/s²' },
            { label: '2T内下落 h', value: h2T, unit: 'm' },
            { label: '测得 g', value: gMeasured, unit: 'm/s²', highlight: 'positive' as const },
          ],
          formulas: [
            { name: '滴水法核心', latex: 'h = \\frac{1}{2}g(2T)^2', level: 'important', condition: '第n滴与第n+2滴时间间隔为2T' },
            { name: '纬度影响', latex: 'g = 9.780(1 + 0.005302\\sin^2\\phi)', level: 'supplementary' },
            { name: '海拔影响', latex: "g' = g_0 \\left(\\frac{R}{R+H}\\right)^2", level: 'supplementary' },
            { name: '重力与万有引力', latex: 'mg = G\\frac{Mm}{R^2}', level: 'core', condition: '忽略自转时' },
          ],
          gaokaoPoints: [
            { text: '重力加速度g随纬度升高而增大，随高度增加而减小', importance: 'core' as const },
            { text: '滴水法测g相当于反向利用打点计时器，周期T的精度是关键', importance: 'gaokao' as const },
            { text: '在地球两极，物体受到的重力等于万有引力', importance: 'hard' as const },
          ],
        }
      }
    }
    case 'anim-vertical-throw': {
      const v0 = params.v0 ?? 15
      const g = params.g ?? GRAVITY
      const advancedMode = params.advancedMode ?? 0
      const targetHeight = params.targetHeight ?? 0
      const totalTime = (2 * v0) / g
      // 竖直上抛：取向上为正，等价于自由落体公式中 g 取负
      const { v } = calculateFreeFall(v0, -g, time)
      const isLanded = time >= totalTime && totalTime > 0
      const isAtPeak = !isLanded && Math.abs(v) < 0.3 && time > 0.05
      const phase = isLanded ? '落地' : isAtPeak ? '最高点' : v > 0 ? '上升' : v < 0 ? '下落' : '起抛'

      // 基础公式
      const baseFormulas: import('./types').Formula[] = [
        { name: '速度公式', latex: `v = v_0 - gt = ${v.toFixed(2)}\\;\\text{m/s}`, level: 'core', condition: '取向上为正方向' },
        { name: '速度-位移关系', latex: `v^2 - v_0^2 = -2gy`, level: 'important', condition: '取向上为正方向' },
      ]

      // 进阶公式
      const advancedFormulas: import('./types').Formula[] = advancedMode ? [
        ...baseFormulas,
        { name: '位移方程', latex: `y = v_0 t - \\frac{1}{2}gt^2`, level: 'core', condition: '取向上为正方向' },
        { name: '求根公式', latex: `t = \\frac{v_0 \\pm \\sqrt{v_0^2 - 2gy}}{g}`, level: 'derived', note: '双解对应上升和下落两次经过同一高度' },
        { name: '相邻等时差', latex: `\\Delta y = gT^2`, level: 'important', condition: '匀变速直线运动' },
      ] : baseFormulas

      // 双解拦截索
      const targetGaokaoPoints: import('./types').GaokaoPoint[] = []
      if (advancedMode && targetHeight > 0) {
        const discriminant = v0 * v0 - 2 * g * targetHeight
        if (discriminant >= 0) {
          const t1 = (v0 - Math.sqrt(discriminant)) / g
          const t2 = (v0 + Math.sqrt(discriminant)) / g
          targetGaokaoPoints.push({
            text: `目标高度 y=${targetHeight.toFixed(1)}m：t₁=${t1.toFixed(2)}s（上升经过），t₂=${t2.toFixed(2)}s（下落经过）`,
            importance: 'gaokao' as const,
          })
        } else {
          targetGaokaoPoints.push({
            text: `目标高度 y=${targetHeight.toFixed(1)}m：无法到达（超过最大高度）`,
            importance: 'basic' as const,
          })
        }
      }

      // 落地对称性结论
      if (isLanded) {
        targetGaokaoPoints.push({
          text: '对称性：上升时间 = 下落时间，落地速度 = 初速度（方向相反）',
          importance: 'core' as const,
        })
      }

      return {
        quantities: [
          ...base,
          { label: '运动阶段', value: phase, unit: '', highlight: isAtPeak ? 'extreme' : undefined },
        ],
        formulas: advancedFormulas,
        gaokaoPoints: [
          { text: '上升段与下落段关于最高点对称', importance: 'core' as const },
          ...(isAtPeak ? [{ text: '注意：v=0，但加速度 ≠ 0！', importance: 'hard' as const }] : []),
          ...targetGaokaoPoints,
        ],
      }
    }
    case 'anim-kinematics-advanced': {
      const v0 = params.v0 ?? 4.0
      const a = params.a ?? 2.0
      const chartMode = params.chartMode ?? 0
      const showAux = params.showAux ?? 1

      // 刹车拦截
      const isBraking = a < 0
      const tBrake = isBraking ? -v0 / a : Infinity
      const xMax = isBraking ? - (v0 * v0) / (2 * a) : Infinity

      const isStopped = time >= tBrake && isBraking
      const tEff = isStopped ? tBrake : time

      const x = v0 * tEff + 0.5 * a * tEff * tEff
      const v = v0 + a * tEff
      const v2 = v * v
      const xOverT = tEff > 0 ? x / tEff : v0

      const k = chartMode === 0 ? 2 * a : 0.5 * a

      const quantities = [
        { label: '速度平方 v²', value: v2, unit: 'm²/s²', color: '#2563EB' },
        { label: '比值 x/t', value: xOverT, unit: 'm/s', color: '#0284C7' },
        { label: '图象实时斜率 k', value: k, unit: 'm/s²', color: '#DC2626' }
      ]

      const formulas = chartMode === 0 ? [
        {
          name: 'v²-x 对应数学一次函数',
          latex: 'v^2 = v_0^2 + 2ax \\quad \\xrightarrow{} \\quad y = b + kx',
          level: 'core' as const,
          condition: '匀变速直线运动'
        },
        {
          name: '斜率与截距关系',
          latex: `\\text{斜率 } k = 2a = ${(2 * a).toFixed(2)} \\quad ; \\quad \\text{纵截距 } b = v_0^2 = ${(v0 * v0).toFixed(2)}`,
          level: 'important' as const
        }
      ] : [
        {
          name: 'x/t-t 对应数学一次函数',
          latex: '\\frac{x}{t} = v_0 + \\frac{1}{2}at \\quad \\xrightarrow{} \\quad y = b + kt',
          level: 'core' as const,
          condition: '匀变速直线运动'
        },
        {
          name: '斜率与截距关系',
          latex: `\\text{斜率 } k = \\frac{1}{2}a = ${(0.5 * a).toFixed(2)} \\quad ; \\quad \\text{纵截距 } b = v_0 = ${v0.toFixed(2)}`,
          level: 'important' as const
        }
      ]

      const warnings = []
      if (isBraking) {
        warnings.push({
          text: `刹车情境：在 t = ${tBrake.toFixed(2)}s 时滑块静止，此后图象发生无物理意义断点。`,
          level: (isStopped ? 'danger' : 'warning') as const
        })
      }

      return {
        quantities,
        formulas,
        warnings,
        gaokaoPoints: [
          { text: '⭐⭐⭐⭐ 图像信息逆推', importance: 'gaokao' as const },
          {
            text: '新高考核心方法：写出含有横纵轴物理量的原始公式 → 分离出因变量与自变量 → 对比一次函数 y=kx+b 求解。',
            importance: 'core' as const
          },
          ...(isStopped ? [{ text: '刹车死公式陷阱：速度减为零后不再反向运动，公式在 t > t_brake 后不再适用。', importance: 'hard' as const }] : [])
        ],
        isTerminal: isStopped,
        pauseReason: isStopped ? 'brake' as const : 'none' as const
      }
    }
    case 'anim-projectile': {
      const v0x = params.v0x ?? 10
      const g = params.g ?? GRAVITY
      const airResistance = params.airResistance ?? 0
      const PHYSICS_HEIGHT = 10.0

      // 预计算完整轨迹
      const result = precomputeProjectileWithDrag(v0x, g, airResistance, PHYSICS_HEIGHT)
      const isLanded = time >= result.groundTime && result.groundTime > 0
      const effectiveTime = isLanded ? result.groundTime : Math.max(time, 0)

      // 插值获取当前状态
      const currentPt = interpolateTrajectoryPoint(result.points, effectiveTime)

      const angleDeg = (Math.atan2(Math.abs(currentPt.vy), currentPt.vx) * 180) / Math.PI

      const quantities = [
        ...base,
        { label: '水平位移 x', value: currentPt.x.toFixed(2), unit: 'm' },
        { label: '下落高度 y', value: Math.abs(currentPt.y).toFixed(2), unit: 'm' },
        { label: '实时速度 v', value: `${currentPt.v.toFixed(2)} m/s (偏角 ${angleDeg.toFixed(1)}°)`, unit: '' },
      ]

      const formulas: import('./types').Formula[] = airResistance > 0 ? [
        { name: '水平方向阻力运动', latex: 'a_x = -\\frac{k}{m} v v_x', level: 'supplementary', condition: '二次阻力模型' },
        { name: '竖直方向阻力运动', latex: 'a_y = -g - \\frac{k}{m} v v_y', level: 'supplementary', condition: '二次阻力模型' },
      ] : [
        { name: '水平匀速运动', latex: 'x = v_{0x} t', level: 'core' },
        { name: '竖直自由落体', latex: 'y = \\frac{1}{2}gt^2', level: 'core', condition: '忽略空气阻力' },
        { name: '速度合成关系', latex: 'v = \\sqrt{v_x^2 + v_y^2}', level: 'important' },
      ]

      const gaokaoPoints: import('./types').GaokaoPoint[] = [
        { text: '运动的等时性：水平分运动与竖直分运动具有完全相同的运动时间。', importance: 'core' as const },
        { text: '速度偏角与位移偏角关系：在真空平抛中，\\tan\\theta = 2\\tan\\alpha（\\theta为速度与水平夹角，\\alpha为位移与水平夹角）。', importance: 'gaokao' as const },
        { text: '速度变化量：在真空平抛中，任意相等时间间隔内速度变化量 \\Delta\\vec{v} 恒等于 g\\Delta t，方向始终竖直向下。', importance: 'hard' as const },
      ]

      return {
        quantities,
        formulas,
        gaokaoPoints,
      }
    }
    case 'anim-oblique-throw': {
      const v0 = params.v0 ?? 15
      const angle = params.angle ?? 45
      const g = params.g ?? GRAVITY
      const airResistance = params.airResistance ?? 0

      // 预计算完整轨迹
      const result = precomputeObliqueThrowWithDrag(v0, angle, g, airResistance)
      const isLanded = time >= result.groundTime && result.groundTime > 0
      const effectiveTime = isLanded ? result.groundTime : Math.max(time, 0)

      // 插值获取当前状态
      const currentPt = interpolateTrajectoryPoint(result.points, effectiveTime)

      const angleDeg = (Math.atan2(currentPt.vy, currentPt.vx) * 180) / Math.PI

      const quantities = [
        ...base,
        { label: '水平位移 x', value: currentPt.x.toFixed(2), unit: 'm' },
        { label: '竖直高度 y', value: currentPt.y.toFixed(2), unit: 'm' },
        { label: '实时速度 v', value: `${currentPt.v.toFixed(2)} m/s (偏角 ${angleDeg.toFixed(1)}°)`, unit: '' },
      ]

      const formulas: import('./types').Formula[] = airResistance > 0 ? [
        { name: '水平方向阻力运动', latex: 'a_x = -\\frac{k}{m} v v_x', level: 'supplementary', condition: '二次阻力模型' },
        { name: '竖直方向阻力运动', latex: 'a_y = -g - \\frac{k}{m} v v_y', level: 'supplementary', condition: '二次阻力模型' },
      ] : [
        { name: '水平匀速运动', latex: 'x = v_0 \\cos\\theta \\cdot t', level: 'core' },
        { name: '竖直竖直上抛', latex: 'y = v_0 \\sin\\theta \\cdot t - \\frac{1}{2}gt^2', level: 'core', condition: '忽略空气阻力' },
        { name: '速度合成关系', latex: 'v = \\sqrt{v_x^2 + v_y^2}', level: 'important' },
      ]

      const gaokaoPoints: import('./types').GaokaoPoint[] = [
        { text: '最高点速度不为零：竖直分速度为零，合速度等于水平分速度，在真空斜抛中为 v₀ cosθ。', importance: 'core' as const },
        { text: '最大射程与射高：在真空斜抛中，当抛射角 θ = 45° 时水平射程最大；射高最大时需要 θ = 90°（即竖直上抛）。', importance: 'gaokao' as const },
        { text: '对称性：真空斜抛运动轨迹是抛物线，关于过最高点的竖直线对称；上升阶段和下落阶段通过同一高度处的速度大小相等。', importance: 'hard' as const },
      ]

      return {
        quantities,
        formulas,
        gaokaoPoints,
      }
    }
    default:
      return null
  }
}
