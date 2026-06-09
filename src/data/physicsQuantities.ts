/**
 * 动画物理量看板数据构建（数据层）。
 *
 * 统一调用 `src/physics/` 纯函数计算物理量，避免在页面层重复实现物理公式，
 * 并消除硬编码 g=9.8（改用 physics/constants 的 GRAVITY）。
 */
import {
  GRAVITY,
  GRAVITATIONAL_CONSTANT,
  EARTH_MASS,
  calculateAcceleratedMotion,
  calculateFreeFall,
  calculateEarthGravity,
  precomputeProjectileWithDrag,
  precomputeObliqueThrowWithDrag,
  calculateCircularMotion,
  calculateOrbitalSpeed,
  calculateKeplerOrbit,
  calculateRestitutionCollision,
  calculateCoulombForce,
  calculateElectricField,
  calculateElectricPotential,
  calculateCapacitor,
  calculateOhmLaw,
  calculateSeriesResistance,
  calculateParallelResistance,
  calculateClosedCircuit,
  calculateAmpereForce,
  calculateLorentzForce,
  calculateChargeInMagField,
  calculateFaradayEMF,
  calculateLenzsLaw,
  calculateCuttingEMF,
  calculateACRMS,
  calculateTransformerWithLoad,
  calculatePowerTransmission,
  calculateAverageVelocity,
  calculateVariableAcceleration,
  calculateInstantaneousVelocity,
  calculateDualObjectComparison,
  determineMotionState,
  calculateVariableAccelerationMotion,
  calculateFrictionPullModel,
  calculateFrictionInclineModel,
  calculateNewtonSecondVariableMotion,
  calculateElevatorMotion,
  calculateConnectedBody,
  calculateVectorAddition,
  calculateOrthogonalDecomposition,
  calculateEquilibriumTension,
  calculateLaunchTrajectory,
  calculateWorkBasic,
  calculateWorkAdvanced,
  classifyWorkType,
  calculateConstantPowerParams,
  calculateConstantAccelParams,
  getPowerStateAtTime,
  precomputeConstantPowerTrajectory,
  precomputeConstantAccelTrajectory,
  precomputeConstantKETrajectory,
  precomputeCurvedTrackTrajectory,
  getKEStateAtTime,
  precomputeGravityTrajectory,
  precomputeSpringTrajectory,
  getPEStateAtTime,
  precomputePendulumTrajectory,
  precomputeValleyTrajectory,
  getECStateAtTime,
} from '../physics'
import type { VariableMotionModel, VariableMotionParams } from '../physics'

const COULOMB_K = 9e9
const VACUUM_PERMITTIVITY = 8.85e-12

export interface PhysicsQuantity {
  label: string
  value: number | string
  unit: string
  highlight?: 'positive' | 'negative' | 'zero' | 'extreme'
}

export interface GaokaoPoint {
  text: string
  importance: 'gaokao' | 'hard' | 'core' | 'basic' | 'extend'
}

export interface Formula {
  name: string
  latex: string
  /** 公式适用条件（如"仅斜向上拉时"） */
  condition?: string
  /** 补充说明（如"脱地时 FN=0"） */
  note?: string
  /** 重要性/高考频率 */
  level?: 'core' | 'important' | 'derived' | 'supplementary'
}

export interface PhysicsPanelData {
  quantities: PhysicsQuantity[]
  formulas?: Formula[]
  gaokaoPoints?: GaokaoPoint[]
}


export function buildPhysicsQuantities(
  animId: string,
  params: Record<string, number>,
  time: number
): PhysicsPanelData {
  const base: PhysicsQuantity[] = []

  switch (animId) {
    case 'anim-velocity': {
      const isAdvanced = (params.advancedMode ?? 0) === 1

      if (!isAdvanced) {
        // ── 基础版：生活场景，平均速度 vs 瞬时速度 ──
        const v = params.v ?? 8
        const deltaT = params.deltaT ?? 2
        const t0 = params.t0 ?? 0
        const t1 = t0
        const t2 = t0 + deltaT
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
        const t0 = params.t0 ?? 2
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
        // ── 进阶版：矢量方向与 v-t 图象联动 ──
        const v0 = params.v0 ?? 0
        const a = params.a ?? 2
        const motionMode = params.motionMode ?? 0
        let v: number
        let currentA: number
        if (motionMode === 0) {
          // 匀变速
          const result = calculateAcceleratedMotion(v0, a, time)
          v = result.v
          currentA = a
        } else {
          // 变加速：a(t) = a₀ - k·t，k 取 |a|/10 保证衰减可见
          const k = Math.abs(a) / 10
          const result = calculateVariableAccelerationMotion(v0, a, k, time)
          v = result.v
          currentA = result.a
        }
        const { direction, motion } = determineMotionState(v, currentA)
        const isAccelerating = motion === '加速'
        return {
          quantities: [
            ...base,
            { label: '矢量方向关系', value: `v⃗ 与 a⃗ ${direction}`, unit: '' },
            { label: '运动状态', value: motion, unit: '', highlight: isAccelerating ? 'positive' as const : motion === '减速' ? 'negative' as const : undefined },
            { label: '微积分映射', value: 'a = dv/dt = v\'(t)', unit: '' },
            { label: '核心结论', value: 'a 为负值，物体不一定做减速运动', unit: '', highlight: 'extreme' as const },
          ],
          gaokaoPoints: [
            { text: '加速度与速度同向则加速，反向则减速，不看正负号', importance: 'core' as const },
            { text: 'v-t 图象斜率绝对值表加速度大小，正负表方向', importance: 'gaokao' as const },
            { text: '加速度减小时若与速度同向，速度依然在增大', importance: 'hard' as const },
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
      const baseFormulas: Formula[] = [
        { name: '速度公式', latex: `v = v_0 - gt = ${v.toFixed(2)}\\;\\text{m/s}`, level: 'core', condition: '取向上为正方向' },
        { name: '速度-位移关系', latex: `v^2 - v_0^2 = -2gy`, level: 'important', condition: '取向上为正方向' },
      ]

      // 进阶公式
      const advancedFormulas: Formula[] = advancedMode ? [
        ...baseFormulas,
        { name: '位移方程', latex: `y = v_0 t - \\frac{1}{2}gt^2`, level: 'core', condition: '取向上为正方向' },
        { name: '求根公式', latex: `t = \\frac{v_0 \\pm \\sqrt{v_0^2 - 2gy}}{g}`, level: 'derived', note: '双解对应上升和下落两次经过同一高度' },
        { name: '相邻等时差', latex: `\\Delta y = gT^2`, level: 'important', condition: '匀变速直线运动' },
      ] : baseFormulas

      // 双解拦截索
      const targetGaokaoPoints: GaokaoPoint[] = []
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
    case 'anim-connected-bodies': {
      const m1 = params.m1 ?? 2
      const m2 = params.m2 ?? 3
      const F = params.F ?? 15
      const mu = params.mu ?? 0.1
      const advancedMode = params.advancedMode ?? 0
      const analysisView = params.analysisView ?? 0 // 0=普通, 1=整体, 2=隔离m1, 3=隔离m2

      // 1. 物理计算（单一来源：calculateConnectedBody）
      const physicsResult = calculateConnectedBody(m1, m2, F, mu, GRAVITY)
      const { isMoving: isMovingPhysically, a: acceleration, T: tension } = physicsResult

      // 2. 运动时间状态推算
      const tMax = 4.0
      const isStarted = time > 0
      const isEnded = advancedMode === 0
        ? false // 基础模式由组件层控制边界
        : time >= tMax

      const isMoving = isStarted && !isEnded && isMovingPhysically

      // 实时物理量
      const currentA = isMoving ? acceleration : 0
      const currentT = isMoving
        ? tension
        : physicsResult.displayTension

      const currentFf1 = physicsResult.f1Max
      const currentFf2 = physicsResult.f2Max

      // 实时物理量看板
      const quantities = [
        ...base,
        { label: '系统加速度 a', value: currentA.toFixed(2), unit: 'm/s²', highlight: currentA > 0 ? 'positive' as const : undefined },
        { label: '连接内力 T', value: currentT.toFixed(1), unit: 'N', highlight: currentT > 0 ? 'positive' as const : undefined },
        { label: 'm₁ 摩擦力 f₁', value: currentFf1.toFixed(1), unit: 'N' },
        { label: 'm₂ 摩擦力 f₂', value: currentFf2.toFixed(1), unit: 'N' },
      ]

      // 3. 动态公式高亮联动
      const formulas: Formula[] = []
      if (analysisView === 0) {
        formulas.push({ name: '① 整体方程', latex: 'F - f_1 - f_2 = (m_1 + m_2)a', level: 'core' })
        formulas.push({ name: '② 隔离 m₁', latex: 'T - f_1 = m_1 a', level: 'core' })
      } else if (analysisView === 1) {
        formulas.push({ name: '整体方程 (高亮)', latex: 'F - (f_1 + f_2) = (m_1 + m_2)a', level: 'core' })
      } else if (analysisView === 2) {
        formulas.push({ name: '隔离 m₁ (高亮)', latex: 'T - f_1 = m_1 a', level: 'core' })
        formulas.push({ name: '内力结论', latex: 'T = \\frac{m_1}{m_1 + m_2}F', level: 'important', condition: '同材质粗糙面上滑动时', note: '与摩擦系数μ无关' })
      } else if (analysisView === 3) {
        formulas.push({ name: '隔离 m₂ (高亮)', latex: 'F - T - f_2 = m_2 a', level: 'core' })
      }

      // 4. 高考要点
      const gaokaoPoints: GaokaoPoint[] = [
        { text: '整体法与隔离法：求解系统加速度优先用整体法，求解内力必须隔离。', importance: 'core' as const },
        { text: '秒杀结论：在同材质粗糙面上滑动时，绳/弹簧拉力 T = m₁F/(m₁+m₂)，与摩擦系数 μ 无关。', importance: 'gaokao' as const },
        { text: '临界起动条件：外拉力 F 必须大于最大静摩擦力之和 μ(m₁+m₂)g 才能使系统起动。', importance: 'hard' as const },
      ]

      return {
        quantities,
        formulas,
        gaokaoPoints,
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
      const pts = result.points
      const lastPt = pts[pts.length - 1]
      let currentPt = pts[0]
      if (effectiveTime > 0 && pts.length > 1) {
        if (effectiveTime >= lastPt.t) {
          currentPt = lastPt
        } else {
          const dt = pts[1]?.t - pts[0]?.t || 0.01
          const idx = Math.floor(effectiveTime / dt)
          const p1 = pts[Math.min(idx, pts.length - 1)]
          const p2 = pts[Math.min(idx + 1, pts.length - 1)]
          if (p1 && p2 && p1.t !== p2.t) {
            const frac = (effectiveTime - p1.t) / (p2.t - p1.t)
            currentPt = {
              t: effectiveTime,
              x: p1.x + (p2.x - p1.x) * frac,
              y: p1.y + (p2.y - p1.y) * frac,
              vx: p1.vx + (p2.vx - p1.vx) * frac,
              vy: p1.vy + (p2.vy - p1.vy) * frac,
              v: p1.v + (p2.v - p1.v) * frac,
              ax: p1.ax + (p2.ax - p1.ax) * frac,
              ay: p1.ay + (p2.ay - p1.ay) * frac,
            }
          }
        }
      }

      const angleDeg = (Math.atan2(Math.abs(currentPt.vy), currentPt.vx) * 180) / Math.PI

      const quantities = [
        ...base,
        { label: '水平位移 x', value: currentPt.x.toFixed(2), unit: 'm' },
        { label: '下落高度 y', value: Math.abs(currentPt.y).toFixed(2), unit: 'm' },
        { label: '实时速度 v', value: `${currentPt.v.toFixed(2)} m/s (偏角 ${angleDeg.toFixed(1)}°)`, unit: '' },
      ]

      const formulas: Formula[] = airResistance > 0 ? [
        { name: '水平方向阻力运动', latex: 'a_x = -\\frac{k}{m} v v_x', level: 'supplementary', condition: '二次阻力模型' },
        { name: '竖直方向阻力运动', latex: 'a_y = -g - \\frac{k}{m} v v_y', level: 'supplementary', condition: '二次阻力模型' },
      ] : [
        { name: '水平匀速运动', latex: 'x = v_{0x} t', level: 'core' },
        { name: '竖直自由落体', latex: 'y = \\frac{1}{2}gt^2', level: 'core', condition: '忽略空气阻力' },
        { name: '速度合成关系', latex: 'v = \\sqrt{v_x^2 + v_y^2}', level: 'important' },
      ]

      const gaokaoPoints: GaokaoPoint[] = [
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
      const pts = result.points
      const lastPt = pts[pts.length - 1]
      let currentPt = pts[0]
      if (effectiveTime > 0 && pts.length > 1) {
        if (effectiveTime >= lastPt.t) {
          currentPt = lastPt
        } else {
          const dt = pts[1]?.t - pts[0]?.t || 0.01
          const idx = Math.floor(effectiveTime / dt)
          const p1 = pts[Math.min(idx, pts.length - 1)]
          const p2 = pts[Math.min(idx + 1, pts.length - 1)]
          if (p1 && p2 && p1.t !== p2.t) {
            const frac = (effectiveTime - p1.t) / (p2.t - p1.t)
            currentPt = {
              t: effectiveTime,
              x: p1.x + (p2.x - p1.x) * frac,
              y: p1.y + (p2.y - p1.y) * frac,
              vx: p1.vx + (p2.vx - p1.vx) * frac,
              vy: p1.vy + (p2.vy - p1.vy) * frac,
              v: p1.v + (p2.v - p1.v) * frac,
              ax: p1.ax + (p2.ax - p1.ax) * frac,
              ay: p1.ay + (p2.ay - p1.ay) * frac,
            }
          }
        }
      }

      const angleDeg = (Math.atan2(currentPt.vy, currentPt.vx) * 180) / Math.PI

      const quantities = [
        ...base,
        { label: '水平位移 x', value: currentPt.x.toFixed(2), unit: 'm' },
        { label: '竖直高度 y', value: currentPt.y.toFixed(2), unit: 'm' },
        { label: '实时速度 v', value: `${currentPt.v.toFixed(2)} m/s (偏角 ${angleDeg.toFixed(1)}°)`, unit: '' },
      ]

      const formulas: Formula[] = airResistance > 0 ? [
        { name: '水平方向阻力运动', latex: 'a_x = -\\frac{k}{m} v v_x', level: 'supplementary', condition: '二次阻力模型' },
        { name: '竖直方向阻力运动', latex: 'a_y = -g - \\frac{k}{m} v v_y', level: 'supplementary', condition: '二次阻力模型' },
      ] : [
        { name: '水平匀速运动', latex: 'x = v_0 \\cos\\theta \\cdot t', level: 'core' },
        { name: '竖直竖直上抛', latex: 'y = v_0 \\sin\\theta \\cdot t - \\frac{1}{2}gt^2', level: 'core', condition: '忽略空气阻力' },
        { name: '速度合成关系', latex: 'v = \\sqrt{v_x^2 + v_y^2}', level: 'important' },
      ]

      const gaokaoPoints: GaokaoPoint[] = [
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
    case 'anim-circular-motion': {
      const r = params.r ?? 2
      const omega = params.omega ?? 1
      const advancedMode = params.advancedMode ?? 0
      const { x, y, v, a_c, period } = calculateCircularMotion(r, omega, time)

      const isAdvanced = advancedMode === 1

      const quantities = [
        ...base,
        { label: '半径 r', value: r.toFixed(1), unit: 'm' },
        { label: '角速度 ω', value: omega.toFixed(2), unit: 'rad/s' },
        { label: '线速度 v', value: v.toFixed(2), unit: 'm/s' },
        ...(isAdvanced
          ? [
              { label: '水平坐标 x', value: x.toFixed(2), unit: 'm' },
              { label: '竖直坐标 y', value: y.toFixed(2), unit: 'm' },
              { label: '向心加速度 a_n', value: a_c.toFixed(2), unit: 'm/s²' },
            ]
          : []),
        { label: '周期 T', value: period.toFixed(2), unit: 's' },
      ]

      const formulas: Formula[] = isAdvanced
        ? [
            { name: '位置方程 x', latex: 'x = r \\cos(\\omega t)', level: 'important' },
            { name: '位置方程 y', latex: 'y = r \\sin(\\omega t)', level: 'important' },
            { name: '向心加速度', latex: 'a_n = \\omega^2 r = \\frac{v^2}{r}', level: 'core' },
          ]
        : [
            { name: '线速度与角速度', latex: 'v = \\omega r', level: 'core' },
            { name: '周期公式', latex: 'T = \\frac{2\\pi}{\\omega}', level: 'core' },
          ]

      const gaokaoPoints: GaokaoPoint[] = isAdvanced
        ? [
            { text: '简谐运动投影：匀速圆周运动在直径方向上的投影是标准的简谐运动。', importance: 'gaokao' as const },
            { text: '向心力做功：向心力与速度时刻垂直，因此向心力对旋转物体做功恒为零。', importance: 'hard' as const },
            { text: '速度与加速度的方向：线速度沿切线，向心加速度指向圆心，二者大小不变、方向改变。', importance: 'core' as const },
          ]
        : [
            { text: '非匀变速运动：匀速圆周运动的速度大小不变但方向时刻在变，因而它是变速运动。', importance: 'core' as const },
            { text: '向心力的作用：匀速圆周运动的合外力（向心力）只改变速度的方向，不改变速度的大小。', importance: 'basic' as const },
          ]

      return {
        quantities,
        formulas,
        gaokaoPoints,
      }
    }
    case 'anim-centripetal': {
      const r = params.r ?? 2
      const v = params.v ?? 3
      const m = params.m ?? 1
      const advancedMode = params.advancedMode ?? 0

      const omega = v / r
      const a_c = (v * v) / r
      const F_c = m * a_c
      const T = (2 * Math.PI * r) / v

      const isAdvanced = advancedMode === 1

      const quantities = [
        ...base,
        { label: '半径 r', value: r.toFixed(1), unit: 'm' },
        { label: '线速度 v', value: v.toFixed(1), unit: 'm/s' },
        { label: '质量 m', value: m.toFixed(1), unit: 'kg' },
        { label: '角速度 ω', value: omega.toFixed(2), unit: 'rad/s' },
        { label: '向心加速度 a_n', value: a_c.toFixed(2), unit: 'm/s²' },
        ...(isAdvanced
          ? [
              { label: '向心力 F_n', value: F_c.toFixed(2), unit: 'N' },
            ]
          : []),
        { label: '周期 T', value: T.toFixed(2), unit: 's' },
      ]

      const formulas: Formula[] = isAdvanced
        ? [
            { name: '向心力大小', latex: 'F_n = m a_n = m \\frac{v^2}{r} = m \\omega^2 r', level: 'core' },
            { name: '向心力矢量', latex: '\\vec{F}_n = -m \\omega^2 \\vec{r}', level: 'derived' },
          ]
        : [
            { name: '向心加速度', latex: 'a_n = \\frac{v^2}{r} = \\omega^2 r', level: 'core' },
            { name: '线速度与周期', latex: 'v = \\frac{2\\pi r}{T}', level: 'core' },
          ]

      const gaokaoPoints: GaokaoPoint[] = isAdvanced
        ? [
            { text: '向心力来源：向心力是效果力，受力分析中绝对不能额外画出向心力，它只能由重力、弹力、摩擦力等其他力或它们的合力提供。', importance: 'gaokao' as const },
            { text: '做功特性：向心力由于方向与速度时刻垂直，因此对做圆周运动的物体做功恒为零（不做功）。', importance: 'hard' as const },
            { text: '动力学核心：向心加速度与向心力满足牛顿第二定律，即 F_n = m · a_n。', importance: 'core' as const },
          ]
        : [
            { text: '速度与加速度的方向：线速度沿轨迹切线，向心加速度指向圆心，二者大小不变、方向在时刻改变。', importance: 'core' as const },
            { text: '向心力的作用：向心力不改变速度的大小（不改变物体的动能），仅仅改变速度的方向。', importance: 'basic' as const },
          ]

      return {
        quantities,
        formulas,
        gaokaoPoints,
      }
    }
    case 'anim-kepler': {
      const mode = params.mode ?? 0 // 0=第一定律, 1=第二定律, 2=第三定律
      const a1 = params.a ?? 4.5
      const b1 = params.b ?? 3.0
      const T1 = params.period ?? 10

      const c1 = Math.sqrt(Math.max(0, a1 * a1 - b1 * b1))
      const e1 = a1 > 0 ? c1 / a1 : 0
      const rMin = a1 - c1
      const rMax = a1 + c1

      const orbitA = calculateKeplerOrbit(a1, b1, time, T1)

      const a2 = params.a2 ?? 7.5
      const T2 = T1 * Math.sqrt(Math.pow(a2 / a1, 3))

      const quantities: PhysicsQuantity[] = []
      const formulas: Formula[] = []
      const gaokaoPoints: GaokaoPoint[] = []

      if (mode !== 2) {
        // 第一和第二定律
        quantities.push(
          { label: '轨道几何 (a,b,e)', value: `a=${a1.toFixed(1)}, b=${b1.toFixed(1)}, e=${e1.toFixed(2)}`, unit: '' },
          { label: '极值距离 (近/远)', value: `r_min=${rMin.toFixed(2)}, r_max=${rMax.toFixed(2)}`, unit: '' },
          { label: '近日/远日速度比', value: (rMax / rMin).toFixed(2), unit: '' },
          { label: '当前距日距离 r', value: orbitA.r.toFixed(2), unit: '' },
          { label: '当前瞬时速度 v', value: orbitA.v.toFixed(2), unit: '(相对值)', highlight: 'positive' as const }
        )
      } else {
        // 第三定律
        quantities.push(
          { label: '内轨半径 & 周期 (A)', value: `a₁=${a1.toFixed(1)}, T₁=${T1.toFixed(1)}s`, unit: '' },
          { label: '外轨半径 & 周期 (B)', value: `a₂=${a2.toFixed(1)}, T₂=${T2.toFixed(1)}s`, unit: '' },
          { label: '内轨比值 a₁³/T₁²', value: (Math.pow(a1, 3) / Math.pow(T1, 2)).toFixed(4), unit: '', highlight: 'positive' as const },
          { label: '外轨比值 a₂³/T₂²', value: (Math.pow(a2, 3) / Math.pow(T2, 2)).toFixed(4), unit: '', highlight: 'positive' as const }
        )
      }

      if (mode === 0) {
        formulas.push(
          { name: '第一定律轨道方程', latex: '\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1 \\quad (c = \\sqrt{a^2-b^2})', level: 'important' },
          { name: '焦半径定义关系', latex: 'r_1 + r_2 = 2a \\quad (\\text{双焦点距离和恒定})', level: 'core' }
        )
        gaokaoPoints.push(
          { text: '恒星（如太阳）必然处于行星椭圆轨道的其中一个焦点上。', importance: 'core' as const },
          { text: '离心率 e=c/a 刻画椭圆轨道的扁平程度，0 <= e < 1，越接近 0 越圆。', importance: 'basic' as const },
          { text: '近日点距离为 a-c，远日点距离为 a+c。', importance: 'gaokao' as const }
        )
      } else if (mode === 1) {
        formulas.push(
          { name: '第二定律面积微分', latex: '\\Delta S = \\frac{1}{2} \\int r^2 d\\theta = \\text{常数}', level: 'important', condition: '同一轨道同一天体' },
          { name: '近日点远日点守恒', latex: 'r_{\\text{近日}} \\cdot v_{\\text{近日}} = r_{\\text{远日}} \\cdot v_{\\text{远日}} \\quad (\\text{角动量守恒})', level: 'core', condition: '椭圆轨道' }
        )
        gaokaoPoints.push(
          { text: '近日点（距恒星最近）速度最大，远日点（距恒星最远）速度最小。', importance: 'gaokao' as const },
          { text: '行星做椭圆轨道运动不是匀速运动，其线速度和角速度均在时刻变化。', importance: 'core' as const },
          { text: '近日速度与远日速度之比与近日距离和远日距离成反比。', importance: 'hard' as const }
        )
      } else {
        formulas.push(
          { name: '第三定律周期比值', latex: '\\frac{a_1^3}{T_1^2} = \\frac{a_2^3}{T_2^2} = k', level: 'core', condition: '同一中心天体' },
          { name: '常数决定式', latex: 'k = \\frac{G M_{\\text{中心天体}}}{4\\pi^2}', level: 'derived' }
        )
        gaokaoPoints.push(
          { text: '比值常数 k 的大小仅与中心天体的质量有关，与环绕的行星质量无关。', importance: 'gaokao' as const },
          { text: '第三定律适用于同一中心天体下的所有环绕星体（如八大行星绕日、所有卫星绕地）。', importance: 'core' as const },
          { text: '半长轴 a 是长轴的一半，对圆形轨道而言简化为轨道半径 R。', importance: 'basic' as const }
        )
      }

      return {
        quantities,
        formulas,
        gaokaoPoints,
      }
    }
    case 'anim-satellite': {
      const mode = params.mode ?? 0 // 0=多轨道对比, 1=宇宙速度发射
      const G = GRAVITATIONAL_CONSTANT
      const M_earth = EARTH_MASS
      const R_earth = 6.37e6

      const quantities: PhysicsQuantity[] = []
      const formulas: Formula[] = []
      const gaokaoPoints: GaokaoPoint[] = []

      if (mode === 0) {
        // ── 模式 0：多轨道圆周对比 ──
        const r = params.r ?? 7
        const rMeters = r * 1e6
        const { v, T, a_c } = calculateOrbitalSpeed(M_earth, rMeters, G)
        const THours = T / 3600

        quantities.push(
          { label: '轨道半径 r', value: rMeters.toExponential(2), unit: 'm' },
          { label: '线速度 v', value: (v / 1000).toFixed(2), unit: 'km/s', highlight: 'positive' as const },
          { label: '运行周期 T', value: THours.toFixed(2), unit: 'h' },
          { label: '向心加速度 a_n', value: a_c.toFixed(2), unit: 'm/s²' }
        )

        formulas.push(
          { name: '线速度公式', latex: 'v = \\sqrt{\\frac{GM}{r}}', level: 'core', condition: '圆形轨道' },
          { name: '周期公式', latex: 'T = 2\\pi \\sqrt{\\frac{r^3}{GM}}', level: 'core', condition: '圆形轨道' },
          { name: '向心加速度', latex: 'a_n = \\frac{GM}{r^2}', level: 'important', condition: '万有引力提供向心力' }
        )

        gaokaoPoints.push(
          { text: '高轨低速：轨道半径越大，线速度和向心加速度越小，周期越长。', importance: 'core' as const },
          { text: '同步轨道：轨道半径固定约 4.24万公里，周期固定为24小时。', importance: 'gaokao' as const },
          { text: '第一宇宙速度 7.9km/s 是近地圆轨道的最大环绕速度。', importance: 'hard' as const }
        )
      } else {
        // ── 模式 1：宇宙速度发射 ──
        const v0_km_s = params.v0 ?? 7.9
        const v0 = v0_km_s * 1000
        const isLaunched = params.isLaunched ?? 0
        const { orbitType, e } = calculateLaunchTrajectory(v0, M_earth, R_earth, G)

        let typeName = '椭圆轨道'
        if (orbitType === 'crash') typeName = '坠毁轨道 (未能环绕)'
        else if (orbitType === 'circular') typeName = '近地圆轨道'
        else if (orbitType === 'escape') typeName = '逃逸轨道 (脱离地球)'

        let phaseName = '待发射'
        let currentH = 0 // 米
        let currentV = 0 // m/s
        let crashed = false

        if (isLaunched === 1) {
          const t_animation = time
          if (t_animation < 3) {
            phaseName = '垂直起飞'
            const p = t_animation / 3
            currentH = R_earth * 0.15 * p
            currentV = v0 * (t_animation / 8)
          } else if (t_animation < 8) {
            phaseName = '重力转弯'
            const p = (t_animation - 3) / 5
            const eased = 1 - Math.pow(1 - p, 2)
            currentH = R_earth * (0.15 + 0.20 * eased)
            currentV = v0 * (t_animation / 8)
          } else {
            // 在轨阶段：重现极坐标积分
            const r0 = 1.35 * R_earth
            const v_c = Math.sqrt(G * M_earth / r0)
            const alpha = (r0 * v0 * v0) / (G * M_earth)
            const e_ecc = Math.abs(alpha - 1)
            const isFarOrigin = v0 < v_c
            const p_param = isFarOrigin ? r0 * (1 - e_ecc) : r0 * (1 + e_ecc)
            const h = r0 * v0

            let theta = 0.6
            const dt = 0.05
            const timeScale = 450 // mode1 的时间加速
            const targetT = (t_animation - 8) * timeScale
            const maxSteps = Math.min(10000, targetT / dt)

            for (let i = 0; i < maxSteps; i++) {
              const curR = isFarOrigin ? p_param / (1 - e_ecc * Math.cos(theta - 0.6)) : p_param / (1 + e_ecc * Math.cos(theta - 0.6))
              if (curR < R_earth * 0.99) {
                crashed = true
                break
              }
              const dTheta = (h / (curR * curR)) * dt
              theta += dTheta
            }

            if (crashed) {
              phaseName = '撞击坠毁'
              currentH = 0
              currentV = 0
            } else {
              phaseName = '在轨环绕'
              const currentR = isFarOrigin ? p_param / (1 - e_ecc * Math.cos(theta - 0.6)) : p_param / (1 + e_ecc * Math.cos(theta - 0.6))
              currentH = currentR - R_earth
              
              const v_sq = v0 * v0 + 2 * G * M_earth * (1 / currentR - 1 / r0)
              currentV = v_sq > 0 ? Math.sqrt(v_sq) : 0
            }
          }
        }

        quantities.push(
          { label: '发射速度 v₀', value: v0_km_s.toFixed(2), unit: 'km/s', highlight: 'extreme' as const },
          { label: '当前阶段', value: phaseName, unit: '', highlight: crashed ? 'negative' as const : isLaunched === 1 ? 'positive' as const : undefined },
          { label: '实时高度', value: (currentH / 1000).toFixed(2), unit: 'km' },
          { label: '实时线速度', value: (currentV / 1000).toFixed(2), unit: 'km/s', highlight: isLaunched === 1 && !crashed ? 'positive' as const : undefined },
          { label: '预定轨道类型', value: typeName, unit: '', highlight: orbitType === 'crash' ? 'negative' as const : 'positive' as const },
          { label: '预定偏心率 e', value: e.toFixed(3), unit: '' }
        )

        formulas.push(
          { name: '二体轨道方程', latex: 'r(\\theta) = \\frac{p}{1 + e \\cos \\theta}', level: 'important', condition: '二体问题' },
          { name: '总机械能守恒', latex: 'E = \\frac{1}{2}m v^2 - G\\frac{Mm}{r} = \\text{常数}', level: 'core', condition: '仅受万有引力' }
        )

        gaokaoPoints.push(
          { text: '第一宇宙速度 7.9km/s 是地球卫星的最小发射速度。', importance: 'core' as const },
          { text: '第二宇宙速度 11.2km/s 是卫星脱离地球引力束缚的最小速度。', importance: 'gaokao' as const },
          { text: '发射速度小于第一宇宙速度时，卫星必将落回地表坠毁。', importance: 'hard' as const }
        )
      }

      return {
        quantities,
        formulas,
        gaokaoPoints,
      }
    }
    case 'anim-momentum': {
      const advancedMode = params.advancedMode ?? 0
      const isAdvanced = advancedMode === 1

      if (!isAdvanced) {
        // ── 基础模式：单球 ──
        const m = params.m ?? 3
        const v = params.v ?? 4
        const p = m * v

        return {
          quantities: [
            ...base,
            { label: '质量 m', value: m.toFixed(1), unit: 'kg' },
            { label: '速度 v', value: v.toFixed(1), unit: 'm/s' },
            { label: '动量 p', value: p.toFixed(1), unit: 'kg·m/s', highlight: 'positive' as const },
          ],
          formulas: [
            { name: '动量定义', latex: 'p = mv', level: 'core' as const },
            { name: '动量与动能关系', latex: 'E_k = \\frac{p^2}{2m}', level: 'important' as const, condition: '仅适用于动能与动量的数值关系' },
          ],
          gaokaoPoints: [
            { text: '动量是状态量，求某时刻动量须用该时刻的瞬时速度', importance: 'core' as const },
          ],
        }
      } else {
        // ── 进阶模式：双球一维 ──
        const mA = params.mA ?? 3
        const vA = params.vA ?? 5
        const mB = params.mB ?? 2
        const vB = params.vB ?? -3

        const pA = mA * vA
        const pB = mB * vB
        const pTotal = pA + pB
        const EkA = (pA * pA) / (2 * mA)
        const EkB = (pB * pB) / (2 * mB)

        return {
          quantities: [
            ...base,
            { label: 'A球动量 p_A', value: pA.toFixed(1), unit: 'kg·m/s', highlight: pA >= 0 ? 'positive' as const : 'negative' as const },
            { label: 'B球动量 p_B', value: pB.toFixed(1), unit: 'kg·m/s', highlight: pB >= 0 ? 'positive' as const : 'negative' as const },
            { label: '系统总动量 p_总', value: pTotal.toFixed(1), unit: 'kg·m/s', highlight: pTotal === 0 ? 'zero' as const : 'extreme' as const },
            { label: 'A球动能 E_kA', value: EkA.toFixed(1), unit: 'J' },
            { label: 'B球动能 E_kB', value: EkB.toFixed(1), unit: 'J' },
          ],
          formulas: [
            { name: '动量定义（一维）', latex: 'p = mv', level: 'core' as const, condition: '一维计算必须先规定正方向，用正负号表示方向' },
            { name: '系统总动量', latex: 'p_{\\text{总}} = p_A + p_B', level: 'core' as const },
            { name: '动量与动能转化', latex: 'E_k = \\frac{p^2}{2m}', level: 'important' as const, note: 'p 不变时，m↑ 则 E_k↓，动量大不代表动能一定大' },
          ],
          gaokaoPoints: [
            { text: '动量是矢量，一维计算必须先规定正方向，用正负号表示', importance: 'gaokao' as const },
            { text: '熟记 E_k = p²/(2m)，高考高频使用', importance: 'gaokao' as const },
            { text: '动量大则动能一定大？错！p 相同时 m 越大 E_k 越小', importance: 'hard' as const },
          ],
        }
      }
    }
    case 'anim-impulse-concept': {
      const advancedMode = params.advancedMode ?? 0
      const isAdvanced = advancedMode === 1

      if (!isAdvanced) {
        // ── 基础模式：恒力 ──
        const F = params.F ?? 10
        const t_duration = params.t_duration ?? 3
        const I = F * t_duration

        return {
          quantities: [
            ...base,
            { label: '恒力大小', value: F.toFixed(1), unit: 'N' },
            { label: '作用时间', value: t_duration.toFixed(1), unit: 's' },
            { label: '冲量大小', value: I.toFixed(1), unit: 'N·s', highlight: 'positive' as const },
          ],
          formulas: [
            { name: '冲量定义', latex: 'I = Ft', level: 'core' as const },
          ],
          gaokaoPoints: [
            { text: '冲量是过程量，描述力在时间上的累积效应', importance: 'core' as const },
          ],
        }
      } else {
        // ── 进阶模式：变力 ──
        const FMax = params.FMax ?? 10
        const t_total = params.t_total ?? 3
        const forceType = params.forceType === 1 ? 'sine' : 'linear'
        // 解析积分
        const totalI = forceType === 'sine'
          ? (FMax * t_total) / Math.PI * 2
          : FMax * t_total / 2
        const avgF = totalI / t_total

        return {
          quantities: [
            ...base,
            { label: '瞬时外力 F(t)', value: '—', unit: 'N' },
            { label: '平均外力 F̄', value: avgF.toFixed(1), unit: 'N' },
            { label: '微元面积积聚', value: '∑FΔt', unit: 'N·s' },
            { label: '总积分冲量', value: totalI.toFixed(1), unit: 'N·s', highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '微元法', latex: '\\Delta I = F\\Delta t', level: 'important' as const },
            { name: '积分冲量', latex: 'I = \\int F\\,dt', level: 'core' as const },
          ],
          gaokaoPoints: [
            { text: 'F-t 图像与时间轴所围面积等于该力在这段时间内的冲量', importance: 'gaokao' as const },
            { text: '变力冲量无法直接用 Ft 计算，高考常通过微元面积或动量定理求解', importance: 'gaokao' as const },
          ],
        }
      }
    }
    case 'anim-momentum-conservation': {
      const m1 = params.m1 ?? 2
      const m2 = params.m2 ?? 3
      const v1 = params.v1 ?? 5
      const v2 = params.v2 ?? 0
      const e = params.e ?? 0.8
      const { pBefore, pAfter } = calculateRestitutionCollision(m1, v1, m2, v2, e)
      return {
        quantities: [
          ...base,
          { label: '碰前总动量', value: pBefore, unit: 'kg·m/s' },
          { label: '碰后总动量', value: pAfter, unit: 'kg·m/s' },
        ],
      }
    }
    case 'anim-coulomb-law': {
      const q1 = params.q1 ?? 2
      const q2 = params.q2 ?? -3
      const r = params.r ?? 4
      const { F } = calculateCoulombForce(COULOMB_K, Math.abs(q1 * 1e-6), Math.abs(q2 * 1e-6), (r || 0.01) * 0.01)
      return {
        quantities: [
          ...base,
          { label: '库仑力 F', value: F, unit: 'N' },
          { label: '作用', value: q1 * q2 < 0 ? '相互吸引' : '相互排斥', unit: '' },
        ],
      }
    }
    case 'anim-electric-field': {
      const q = params.q ?? 5
      const rTest = params.rTest ?? 3
      const { E } = calculateElectricField(COULOMB_K, Math.abs(q * 1e-6), (rTest || 0.01) * 0.01)
      return {
        quantities: [
          ...base,
          { label: '场强 E', value: E, unit: 'N/C' },
        ],
      }
    }
    case 'anim-charge-in-efield': {
      // 偏转电场（示波管）模型：板长 L、板间距 D，单位 E ×10³N/C、q μC、m mg
      const PLATE_LENGTH = 0.4
      const HALF_GAP = 0.1
      const E = (params.E ?? 10) * 1e3
      const q = (params.q ?? 5) * 1e-6
      const m = (params.m ?? 200) * 1e-6
      const v0 = params.v0 ?? 20
      const a = m > 0 ? (q * E) / m : 0
      const tExit = v0 > 0 ? PLATE_LENGTH / v0 : 0
      const tHit = a > 0 ? Math.sqrt((2 * HALF_GAP) / a) : Infinity
      return {
        quantities: [
          ...base,
          { label: '结局', value: tHit < tExit ? '打在极板上' : '射出电场', unit: '' },
        ],
      }
    }
    case 'anim-capacitor': {
      const S = params.S ?? 100
      const d = params.d ?? 5
      const epsilon_r = params.epsilon_r ?? 1
      const U = params.U ?? 12
      const isConnected = (params.connected ?? 1) >= 0.5
      // 断开电源时保持的电荷基准（默认状态充电后断开）
      const Q_FIXED = VACUUM_PERMITTIVITY * (100 * 1e-4) / (5 * 1e-3) * 12
      const { C } = calculateCapacitor(VACUUM_PERMITTIVITY * epsilon_r, S * 1e-4, d * 1e-3)
      const voltage = isConnected ? U : Q_FIXED / C
      const field = voltage / (d * 1e-3)
      return {
        quantities: [
          ...base,
          { label: '电容 C', value: C * 1e12, unit: 'pF' },
          { label: '场强 E', value: field, unit: 'V/m' },
        ],
      }
    }
    case 'anim-field-lines': {
      const q1 = params.q1 ?? 5
      const q2 = params.q2 ?? -5
      const positive1 = q1 > 0
      const positive2 = q2 > 0
      const negative1 = q1 < 0
      const negative2 = q2 < 0
      const isOpposite = (positive1 && negative2) || (negative1 && positive2)
      const isSame = (positive1 && positive2) || (negative1 && negative2)
      let chargeType = ''
      if (q1 === 0 && q2 === 0) chargeType = '无电场'
      else if (q1 === 0 || q2 === 0) chargeType = '单电荷'
      else if (isOpposite) chargeType = '异种电荷'
      else chargeType = '同种电荷'
      let fieldLineDir = ''
      if (isOpposite) fieldLineDir = '从正电荷→负电荷'
      else if (isSame) fieldLineDir = '从两电荷向外辐射（或指向两电荷）'
      else fieldLineDir = '从非零电荷向外辐射（或指向非零电荷）'
      return {
        quantities: [
          ...base,
          { label: '电荷类型', value: chargeType, unit: '' },
          { label: '电场线方向', value: fieldLineDir, unit: '' },
        ],
      }
    }
    case 'anim-electric-potential': {
      const q = params.q ?? 5
      const rTest = params.rTest ?? 5
      const k = 9e9
      const qSI = Math.abs(q) * 1e-6
      const rTestSI = rTest * 0.01
      const { V } = calculateElectricPotential(k, qSI, rTestSI)
      const { E } = calculateElectricField(k, qSI, rTestSI)
      return {
        quantities: [
          ...base,
          { label: '电势 V', value: V, unit: 'V' },
          { label: '场强 E', value: E, unit: 'N/C' },
        ],
      }
    }
    case 'anim-ohm-law': {
      const U = params.U ?? 6
      const R = params.R ?? 3
      const { I } = calculateOhmLaw(U, R)
      return {
        quantities: [
          ...base,
          { label: '电流 I', value: I, unit: 'A' },
        ],
      }
    }
    case 'anim-circuit-analysis': {
      const U = params.U ?? 12
      const R1 = params.R1 ?? 4
      const R2 = params.R2 ?? 2
      const series = (params.mode ?? 0) < 0.5
      const Rtotal = series
        ? calculateSeriesResistance([R1, R2]).R_total
        : calculateParallelResistance([R1, R2]).R_total
      const Itotal = Rtotal > 0 ? calculateOhmLaw(U, Rtotal).I : 0
      return {
        quantities: [
          ...base,
          { label: '总电流 I总', value: Itotal, unit: 'A' },
        ],
      }
    }
    case 'anim-closed-circuit': {
      const EMF = params.EMF ?? 6
      const r = params.r ?? 1
      const R = params.R ?? 5
      const { P_output, eta } = calculateClosedCircuit(EMF, r, R)
      return {
        quantities: [
          ...base,
          { label: '输出功率 P出', value: P_output, unit: 'W' },
          { label: '效率 η', value: eta * 100, unit: '%' },
        ],
      }
    }
    case 'anim-ampere-force': {
      const B = params.B ?? 1
      const I = params.I ?? 2
      const L = params.L ?? 5
      const angle = params.angle ?? 90
      const { F } = calculateAmpereForce(B, I, L, angle)
      return {
        quantities: [
          ...base,
          { label: '安培力 F', value: F, unit: 'N' },
        ],
      }
    }
    case 'anim-lorentz-force': {
      const q = params.q ?? 1
      const v = params.v ?? 10
      const B = params.B ?? 1
      const angle = params.angle ?? 90
      const { F } = calculateLorentzForce(Math.abs(q), Math.abs(v), B, angle)
      return {
        quantities: [
          ...base,
          { label: '洛伦兹力 F', value: F, unit: 'N' },
        ],
      }
    }
    case 'anim-charge-in-bfield': {
      const q = params.q ?? 1
      const m = params.m ?? 1
      const v = params.v ?? 10
      const B = params.B ?? 1
      const { r, T, omega } = calculateChargeInMagField(Math.abs(q), m, Math.abs(v), B)
      return {
        quantities: [
          ...base,
          { label: '轨道半径 r', value: r, unit: 'm' },
          { label: '周期 T', value: T, unit: 's' },
          { label: '角速度 ω', value: omega, unit: 'rad/s' },
        ],
      }
    }
    case 'anim-faraday-law': {
      const N = params.N ?? 5
      const B = params.B ?? 1.2
      const PHI0 = 0.45
      const COIL_X_PX = 380
      const MAGNET_LEN_PX = 110
      const SCALE = 500
      const COIL_RADIUS_M = 72 / SCALE
      const MAGNET_MIN = 60
      const magnetLeftPx = params.magnetX ?? MAGNET_MIN
      const magnetVPx = params.magnetV ?? 0
      const magnetCenterPx = magnetLeftPx + MAGNET_LEN_PX / 2
      const dist = (COIL_X_PX - magnetCenterPx) / SCALE
      const R = COIL_RADIUS_M
      const halfLen = MAGNET_LEN_PX / 2 / SCALE
      const uN = dist + halfLen
      const uS = dist - halfLen
      const termN = uN / Math.sqrt(uN * uN + R * R)
      const termS = uS / Math.sqrt(uS * uS + R * R)
      const phi = PHI0 * B * (termN - termS)
      const v_m = magnetVPx / SCALE
      const dx = 1 / SCALE
      const dist2 = dist - dx
      const uN2 = dist2 + halfLen
      const uS2 = dist2 - halfLen
      const termN2 = uN2 / Math.sqrt(uN2 * uN2 + R * R)
      const termS2 = uS2 / Math.sqrt(uS2 * uS2 + R * R)
      const phi2 = PHI0 * B * (termN2 - termS2)
      const dPhi_dx = (phi2 - phi) / dx
      const dPhi_dt = dPhi_dx * v_m
      const { EMF } = calculateFaradayEMF(N, dPhi_dt)
      return {
        quantities: [
          ...base,
          { label: 'dΦ/dt', value: dPhi_dt, unit: 'Wb/s' },
          { label: '感应电动势 E', value: Math.abs(EMF), unit: 'V' },
        ],
      }
    }
    case 'anim-lenzs-law': {
      const {
        currentAction,
        fluxChange,
        inducedFieldDirection,
        equivalentPole,
        forceType,
      } = calculateLenzsLaw(params.magnetPole ?? 1, params.velocity ?? 0)

      return {
        quantities: [
          ...base,
          { label: '当前动作', value: currentAction, unit: '' },
          {
            label: '磁通量变化',
            value: fluxChange === 'increasing' ? '增加' : fluxChange === 'decreasing' ? '减少' : '稳定',
            unit: '',
            highlight: fluxChange === 'increasing' ? 'positive' : 'negative',
          },
          { label: '感应磁场方向', value: inducedFieldDirection === 'down' ? '向下' : '向上', unit: '' },
          { label: '等效磁极', value: equivalentPole ? `上端 ${equivalentPole}极` : '无', unit: '' },
          {
            label: '洛伦兹力表现',
            value: forceType === 'repulsion' ? '排斥(阻碍靠近)' : forceType === 'attraction' ? '吸引(阻碍远离)' : '无',
            unit: '',
          },
        ],
      }
    }
    case 'anim-cutting-emf': {
      // 导体切割磁感线：EMF=BLv·sinθ，I=EMF/(R+r)，F_安=BIL·sinθ
      const B = params.B ?? 1
      const L = params.L ?? 0.5
      const v = params.v ?? 2
      const R = params.R ?? 2
      const theta = params.theta ?? 90
      const r = params.r ?? 0
      const B_out = params.B_out ?? 0
      const { EMF, I, F_ampere } = calculateCuttingEMF(B, L, v, R, theta, r, B_out)
      return {
        quantities: [
          ...base,
          { label: '感应电动势 EMF', value: Math.abs(EMF), unit: 'V' },
          { label: '感应电流 I', value: Math.abs(I), unit: 'A' },
          { label: '安培力 F安', value: F_ampere, unit: 'N' },
        ],
      }
    }

    // ===== 电磁学 · 交变电流（[M4-1]）=====
    case 'anim-ac-generation': {
      const B = params.B ?? 0.5
      const S = params.S ?? 0.04
      const omega = params.omega ?? 2
      const N = params.N ?? 100
      // 峰值电动势 Em = NBSω
      const Em = N * B * S * omega
      const { V_rms } = calculateACRMS(Em)
      const freq = omega / (2 * Math.PI)
      return {
        quantities: [
          ...base,
          { label: '峰值电动势 Em', value: Em, unit: 'V' },
          { label: '有效值 Erms', value: V_rms, unit: 'V' },
          { label: '频率 f', value: freq, unit: 'Hz' },
        ],
      }
    }

    case 'anim-ac-values': {
      const V_peak = params.V_peak ?? 311
      const R = params.R ?? 100
      const U_dc = params.U_dc ?? 220
      const I_peak = V_peak / R
      const { V_rms, I_rms } = calculateACRMS(V_peak, I_peak)
      const P_avg = V_rms * I_rms
      const errorPercent = Math.abs((U_dc - V_rms) / V_rms) * 100
      return {
        quantities: [
          ...base,
          { label: '有效电压 Vrms', value: V_rms, unit: 'V' },
          { label: '有效电流 Irms', value: I_rms, unit: 'A' },
          { label: '平均功率 P', value: P_avg, unit: 'W' },
          { label: '误差', value: errorPercent.toFixed(1), unit: '%', highlight: errorPercent <= 5 ? 'positive' : 'negative' },
        ],
      }
    }

    case 'anim-transformer': {
      const n1 = params.n1 ?? 100
      const n2 = params.n2 ?? 200
      const U1 = params.U1 ?? 220
      const R = params.R ?? 50
      const { U2, I2, I1, P_output } = calculateTransformerWithLoad(n1, n2, U1, R)
      const turnsRatio = n1 === 0 ? 0 : n2 / n1
      return {
        quantities: [
          ...base,
          { label: '匝数比 n₂/n₁', value: turnsRatio, unit: '' },
          { label: '输出电压 U₂', value: U2, unit: 'V' },
          { label: '原线圈电流 I₁', value: I1, unit: 'A' },
          { label: '副线圈电流 I₂', value: I2, unit: 'A' },
          { label: '输出功率 P₂', value: P_output, unit: 'W' },
        ],
      }
    }

    case 'anim-power-transmission': {
      const P_send = params.P_send ?? 100000
      const U_trans = params.U_trans ?? 10000
      const R_line = params.R_line ?? 10
      // 使用默认匝数比：升压 1:10，降压 10:1
      const n1_step_up = 100
      const n2_step_up = 1000
      const n1_step_down = 1000
      const n2_step_down = 100
      const { I_line, P_loss, U_user, eta } = calculatePowerTransmission(
        P_send, U_trans, R_line, n1_step_up, n2_step_up, n1_step_down, n2_step_down
      )
      return {
        quantities: [
          ...base,
          { label: '输电线电流 I', value: I_line, unit: 'A' },
          { label: '损耗功率 ΔP', value: P_loss / 1000, unit: 'kW' },
          { label: '用户电压 U', value: U_user, unit: 'V' },
          { label: '输电效率 η', value: eta * 100, unit: '%' },
        ],
      }
    }

    case 'anim-gravity-basic': {
      const mode = params.mode ?? 0

      if (mode === 0) {
        // 地球自转模式
        const latitude = params.latitude ?? 45
        const omegaScale = params.omegaScale ?? 80
        const m = 1.0
        const F_gravitation = 100 // 相对基准大小
        const { F_grav, F_centripetal, G_force, angleDeviation } = calculateEarthGravity(
          latitude, m, F_gravitation, omegaScale
        )
        return {
          quantities: [
            ...base,
            { label: '引力 F_引 (相对)', value: F_grav.toFixed(1), unit: 'N' },
            { label: '向心力 F_向 (相对)', value: F_centripetal.toFixed(1), unit: 'N', highlight: F_centripetal > 1.5 ? 'positive' : undefined },
            { label: '实际重力 G (相对)', value: G_force.toFixed(1), unit: 'N', highlight: 'positive' as const },
            { label: '重力偏角 θ', value: angleDeviation.toFixed(2), unit: '°', highlight: angleDeviation > 0.5 ? 'extreme' : undefined }
          ],
          formulas: [
            { name: '引力分解关系', latex: '\\vec{F}_{\\text{引}} = \\vec{G} + \\vec{F}_{\\text{向}}', level: 'core' },
            { name: '极点状态(向心力=0)', latex: 'G = F_{\\text{引}}', level: 'important', condition: '两极处' },
            { name: '赤道状态(向心力最大)', latex: 'G = F_{\\text{引}} - F_{\\text{向}}', level: 'important', condition: '赤道处' }
          ],
          gaokaoPoints: [
            { text: '重力是万有引力的一个分力，方向竖直向下不指向地心。', importance: 'core' as const },
            { text: '重力加速度 g 随纬度升高而增大，赤道最小、两极最大。', importance: 'core' as const }
          ]
        }
      }
      break
    }
    case 'anim-gravity': {
      const mode = params.mode ?? 0 // 0=相对单位, 1=真实尺度
      const preset = params.preset ?? 0 // 0=自定义, 1=地月, 2=日地, 3=同步卫星, 4=宇航员
      const G = 6.674e-11

      let m1 = params.m1 ?? 1000
      let m2 = params.m2 ?? 10
      let r = params.r ?? 5
      let F_val = 0

      if (mode === 1) {
        // 真实尺度模式
        let realM1 = 5.97e24
        let realM2 = 7.35e22
        let realR = 3.84e8
        let name1 = '地球'
        let name2 = '月球'

        switch (preset) {
          case 1:
            realM1 = 5.97e24
            realM2 = 7.35e22
            realR = 3.84e8
            name1 = '地球'
            name2 = '月球'
            break
          case 2:
            realM1 = 1.99e30
            realM2 = 5.97e24
            realR = 1.50e11
            name1 = '太阳'
            name2 = '地球'
            break
          case 3:
            realM1 = 5.97e24
            realM2 = 1.00e3
            realR = 4.22e7
            name1 = '地球'
            name2 = '同步卫星'
            break
          case 4:
            realM1 = 5.97e24
            realM2 = 80
            realR = 6.77e6
            name1 = '地球'
            name2 = '宇航员'
            break
          default:
            // 自定义：用 params 的滑块相对放大作为真实尺度
            realM1 = (params.m1 ?? 1000) * 1e21
            realM2 = (params.m2 ?? 10) * 1e20
            realR = (params.r ?? 5) * 1e7
            name1 = '天体 1'
            name2 = '天体 2'
            break
        }

        F_val = (G * realM1 * realM2) / (realR * realR)

        return {
          quantities: [
            ...base,
            { label: `${name1}质量 m₁`, value: realM1.toExponential(2), unit: 'kg' },
            { label: `${name2}质量 m₂`, value: realM2.toExponential(2), unit: 'kg' },
            { label: '天体间距 r', value: realR.toExponential(2), unit: 'm' },
            { label: '万有引力 F', value: F_val.toExponential(2), unit: 'N', highlight: 'positive' as const },
            { label: '引力常数 G', value: '6.674×10⁻¹¹', unit: 'N·m²/kg²' }
          ],
          formulas: [
            { name: '万有引力定律', latex: 'F = G \\frac{m_1 m_2}{r^2}', level: 'core', condition: '质点或均匀球体' }
          ],
          gaokaoPoints: [
            { text: '万有引力是重力的本源，重力通常是引力的分力。', importance: 'core' as const },
            { text: '天体间距远大于自身半径时，天体才能简化为质点。', importance: 'basic' as const },
            { text: '引力常数 G 由卡文迪什通过扭秤实验测得，被誉为“称量地球第一人”。', importance: 'gaokao' as const }
          ]
        }
      } else {
        // 相对单位模式
        F_val = (m1 * m2) / (r * r)
        return {
          quantities: [
            ...base,
            { label: '天体 1 质量 m₁', value: m1, unit: '相对单位' },
            { label: '天体 2 质量 m₂', value: m2, unit: '相对单位' },
            { label: '天体间距 r', value: r.toFixed(1), unit: '相对单位' },
            { label: '万有引力 F_引', value: F_val.toFixed(2), unit: '相对单位', highlight: 'positive' as const },
            { label: '比例关系占比', value: 'F ∝ m₁m₂/r²', unit: '' }
          ],
          formulas: [
            { name: '比例变化关系', latex: 'F \\propto \\frac{m_1 m_2}{r^2}', level: 'core' }
          ],
          gaokaoPoints: [
            { text: '引力大小与物体质量乘积成正比，与距离平方成反比。', importance: 'core' as const },
            { text: '万有引力具有相互性，天体1对2的引力等于天体2对1的引力。', importance: 'core' as const },
            { text: '在轨道运动中，万有引力提供环绕天体所需的向心力。', importance: 'gaokao' as const }
          ]
        }
      }
    }
    case 'anim-spring-force': {
      const k = params.k ?? 100
      const m = params.m ?? 1
      const omega = Math.sqrt(k / m)
      const amplitude = 0.5
      const displacement = amplitude * Math.sin(omega * time)
      const potentialEnergy = 0.5 * k * displacement * displacement
      return {
        quantities: [
          ...base,
          { label: '弹性势能 E_p', value: potentialEnergy.toFixed(2), unit: 'J', highlight: potentialEnergy > 0.05 ? 'extreme' : undefined },
          { label: '固有角频率 ω', value: omega.toFixed(2), unit: 'rad/s' }
        ],
        formulas: [
          { name: '胡克定律', latex: 'F = -kx', level: 'core', condition: '弹性限度内' },
          { name: '弹性势能', latex: 'E_p = \\frac{1}{2}kx^2', level: 'important', condition: '弹簧处于自然长度时Ep=0' }
        ],
        gaokaoPoints: [
          { text: '胡克定律中的 x 是形变量（拉伸或压缩量），非弹簧长度。', importance: 'core' as const },
          { text: '弹力方向总是指向弹簧形变恢复的方向，与形变方向相反。', importance: 'core' as const },
          { text: 'F-x图像的斜率代表劲度系数k，图线围成的面积表弹性势能。', importance: 'gaokao' as const }
        ]
      }
    }
    case 'anim-friction': {
      const mode = params.mode ?? 0
      const m = params.m ?? 5
      const mu = params.mu ?? 0.3
      const g = params.g ?? GRAVITY

      if (mode === 0) {
        // 水平外力模型 (f-F)
        const F_applied = params.F_applied ?? 15
        const { a, F_net, isSliding } = calculateFrictionPullModel(m, mu, F_applied, g)

        return {
          quantities: [
            ...base,
            { label: '运动状态', value: isSliding ? '匀加速滑动' : '静止', unit: '', highlight: isSliding ? 'positive' as const : 'zero' as const },
            { label: '合外力 F_合', value: F_net.toFixed(2), unit: 'N', highlight: F_net > 0.05 ? 'positive' as const : 'zero' as const },
            { label: '加速度 a', value: a.toFixed(2), unit: 'm/s²', highlight: a > 0.05 ? 'positive' as const : 'zero' as const },
          ],
          formulas: [
            { name: '最大静摩擦力', latex: 'f_{\\text{max}} = \\mu_s F_N = 1.12\\mu mg', level: 'important', note: '1.12为静动摩擦系数比' },
            { name: '滑动摩擦力', latex: 'f_{\\text{slip}} = \\mu F_N = \\mu mg', level: 'core', condition: '水平面上' },
            { name: '滑动状态', latex: 'f = f_{\\text{slip}},\\quad a = \\frac{F - f_{\\text{slip}}}{m}', level: 'core' }
          ],
          gaokaoPoints: [
            { text: '静摩擦力是被动力，范围为 0 至最大静摩擦力。', importance: 'core' as const },
            { text: '滑动摩擦力仅取决于正压力和动摩擦因数，与速度、接触面积均无关。', importance: 'core' as const },
            { text: '最大静摩擦力略大于滑动摩擦力（1.12 倍），临界时摩擦力会突跳。', importance: 'gaokao' as const },
            { text: '解答摩擦力问题必须先判定：静摩擦还是滑动摩擦。', importance: 'gaokao' as const }
          ]
        }
      } else {
        // 斜面倾角模型 (f-θ)
        const angle = params.angle ?? 15
        const { a, criticalAngle, isSliding } = calculateFrictionInclineModel(m, mu, angle, g)

        return {
          quantities: [
            ...base,
            { label: '运动状态', value: isSliding ? '匀加速下滑' : '静止平衡', unit: '', highlight: isSliding ? 'positive' as const : 'zero' as const },
            { label: '临界下滑角 θ_c', value: criticalAngle.toFixed(1), unit: '°', highlight: 'extreme' as const },
            { label: '加速度 a', value: a.toFixed(2), unit: 'm/s²', highlight: a > 0.05 ? 'positive' as const : 'zero' as const },
          ],
          formulas: [
            { name: '斜面支持力', latex: 'F_N = mg\\cos\\theta', level: 'core' },
            { name: '下滑重力分力', latex: 'G_x = mg\\sin\\theta', level: 'core' },
            { name: '静止平衡', latex: 'f = G_x = mg\\sin\\theta', level: 'important', condition: '静止时' },
            { name: '下滑滑动', latex: 'f = \\mu F_N = \\mu mg\\cos\\theta', level: 'important', condition: '滑动时' }
          ],
          gaokaoPoints: [
            { text: '临界条件 tan θ_c = μ_s，超过后摩擦力突跳减小。', importance: 'gaokao' as const },
            { text: '静止时 f 随 θ 增大（正弦）；滑动时 f 随 θ 增大而减小（余弦）。', importance: 'hard' as const },
            { text: '若 μ ≥ tan θ，物体无论如何释放均不下滑。', importance: 'hard' as const }
          ]
        }
      }
    }
    case 'anim-equilibrium': {
      const m = params.m ?? 2.0
      const theta1 = params.theta1 ?? 45
      const theta2 = params.theta2 ?? 45
      const mode = params.mode ?? 0 // 0 = 基础悬挂, 1 = 平行四边形, 2 = 正交分解, 3 = 封闭三角形
      const g = GRAVITY
      const gravity = m * g

      const { t1, t2 } = calculateEquilibriumTension(m, theta1, theta2, g)
      
      const isOverloaded = t1 > 35 || t2 > 35
      const isBroken = t1 > 50 || t2 > 50

      const quantities: PhysicsQuantity[] = [
        ...base,
      ]

      if (isBroken) {
        quantities.push(
          { label: '绳 1 状态', value: t1 > 50 ? '已拉断' : '受力中', unit: '' },
          { label: '绳 2 状态', value: t2 > 50 ? '已拉断' : '受力中', unit: '' },
          { label: '拉力 T₁', value: t1 > 50 ? 0 : t1.toFixed(1), unit: 'N' },
          { label: '拉力 T₂', value: t2 > 50 ? 0 : t2.toFixed(1), unit: 'N' }
        )
      } else {
        if (mode === 2) {
          const { fx: t1x, fy: t1y } = calculateOrthogonalDecomposition(t1, theta1)
          const { fx: t2x, fy: t2y } = calculateOrthogonalDecomposition(t2, theta2)
          quantities.push(
            { label: 'T₁ 水平分力 T1x', value: t1x.toFixed(1), unit: 'N' },
            { label: 'T₂ 水平分量 T2x', value: t2x.toFixed(1), unit: 'N' },
            { label: 'T₁ 竖直分量 T1y', value: t1y.toFixed(1), unit: 'N' },
            { label: 'T₂ 竖直分量 T2y', value: t2y.toFixed(1), unit: 'N' },
            { label: 'x轴合力 ΣFx', value: (t2x - t1x).toFixed(2), unit: 'N', highlight: 'zero' as const },
            { label: 'y轴合力 ΣFy', value: (t1y + t2y - gravity).toFixed(2), unit: 'N', highlight: 'zero' as const }
          )
        } else if (mode === 1) {
          quantities.push(
            { label: '拉力 T₁', value: t1.toFixed(1), unit: 'N', highlight: isOverloaded ? 'extreme' as const : undefined },
            { label: '拉力 T₂', value: t2.toFixed(1), unit: 'N', highlight: isOverloaded ? 'extreme' as const : undefined },
            { label: '等效合力 F合', value: gravity.toFixed(1), unit: 'N', highlight: 'positive' as const }
          )
        } else {
          quantities.push(
            { label: '拉力 T₁', value: t1.toFixed(1), unit: 'N', highlight: isOverloaded ? 'extreme' as const : undefined },
            { label: '拉力 T₂', value: t2.toFixed(1), unit: 'N', highlight: isOverloaded ? 'extreme' as const : undefined }
          )
        }
      }

      let formulas: Formula[] = [
        { name: '水平方向平衡', latex: 'T_1 \\cos\\theta_1 = T_2 \\cos\\theta_2', level: 'core', condition: '共点力平衡' },
        { name: '竖直方向平衡', latex: 'T_1 \\sin\\theta_1 + T_2 \\sin\\theta_2 = mg', level: 'core', condition: '共点力平衡' }
      ]
      let gaokaoPoints: GaokaoPoint[] = [
        { text: '共点力平衡条件为物体所受合外力为零，即 ΣFx = 0, ΣFy = 0。', importance: 'core' as const },
        { text: '两挂绳夹角趋近于 180° 时，张力趋于无穷大，极易拉断。', importance: 'hard' as const }
      ]

      if (isBroken) {
        formulas = [
          { name: '单摆阻尼方程', latex: '\\theta\'\' + \\gamma \\theta\' + \\frac{g}{L}\\sin\\theta = 0', level: 'supplementary' }
        ]
        gaokaoPoints = [
          { text: '轻绳的最大耐受拉力即为高考受力分析中的临界平衡条件。', importance: 'hard' as const },
          { text: '一绳断裂后，重物做单摆阻尼运动，最终平衡点移至挂点正下方。', importance: 'core' as const }
        ]
      } else if (mode === 1) {
        formulas = [
          { name: '力的平行四边形定则', latex: 'F_{\\text{合}} = \\sqrt{T_1^2 + T_2^2 + 2T_1T_2\\cos(\\theta_1+\\theta_2)}', level: 'core' }
        ]
        gaokaoPoints = [
          { text: '平行四边形定则是矢量运算规律，合力随两力夹角增大而减小。', importance: 'gaokao' as const },
          { text: '合力与分力为“等效替代”关系，大小范围为 |T₁-T₂| ≤ F ≤ T₁+T₂。', importance: 'core' as const }
        ]
      } else if (mode === 2) {
        formulas = [
          { name: '正交分解水平分量', latex: 'T_x = T \\cos\\theta', level: 'core' },
          { name: '正交分解竖直分量', latex: 'T_y = T \\sin\\theta', level: 'core' }
        ]
        gaokaoPoints = [
          { text: '正交分解法常用于复杂受力，可将矢量运算化为代数运算。', importance: 'gaokao' as const },
          { text: '建系原则：应使尽可能多的力落在轴上，以简化正交方程。', importance: 'core' as const }
        ]
      } else if (mode === 3) {
        formulas = [
          { name: '正弦定理形式', latex: '\\frac{T_1}{\\sin(90^\\circ-\\theta_2)} = \\frac{T_2}{\\sin(90^\\circ-\\theta_1)} = \\frac{mg}{\\sin(\\theta_1+\\theta_2)}', level: 'important', condition: '三力平衡' }
        ]
        gaokaoPoints = [
          { text: '三力平衡首尾相接必构成封闭三角形，常用于力的定性分析。', importance: 'hard' as const },
          { text: '高考动态平衡压轴题中，力的封闭三角形图解法是突破核心。', importance: 'gaokao' as const }
        ]
      }

      return {
        quantities,
        formulas,
        gaokaoPoints
      }
    }
    case 'anim-vector-addition': {
      const quantities: PhysicsQuantity[] = [...base]
      const f1 = params.f1 ?? 10
      const f2 = params.f2 ?? 8
      const angle = params.angle ?? 60
      const mode = params.mode ?? 0 // 0=平行四边形, 1=三角形, 2=正交分解

      if (mode === 2) {
        const { fx, fy } = calculateOrthogonalDecomposition(f1, angle)
        quantities.push(
          { label: '水平分量 Fx', value: fx.toFixed(2), unit: 'N' },
          { label: '竖直分量 Fy', value: fy.toFixed(2), unit: 'N' }
        )
      } else {
        const { fResultant, resultAngleDeg } = calculateVectorAddition(f1, f2, angle)

        quantities.push(
          { label: '合力 F', value: fResultant.toFixed(2), unit: 'N', highlight: 'positive' as const },
          { label: '合力偏角 α', value: resultAngleDeg.toFixed(1), unit: '°' }
        )
      }

      let formulas: Formula[] = []
      let gaokaoPoints: GaokaoPoint[] = []

      if (mode === 2) {
        formulas = [
          { name: '水平分量', latex: 'F_x = F \\cos\\theta', level: 'core' },
          { name: '竖直分量', latex: 'F_y = F \\sin\\theta', level: 'core' }
        ]
        gaokaoPoints = [
          { text: '正交分解法是力学最核心的分析工具。', importance: 'gaokao' as const },
          { text: '建系时通常使尽可能多的力落在轴上。', importance: 'core' as const }
        ]
      } else {
        formulas = [
          { name: '合力大小', latex: 'F = \\sqrt{F_1^2 + F_2^2 + 2F_1F_2\\cos\\theta}', level: 'core' },
          { name: '偏角正切', latex: '\\tan\\alpha = \\frac{F_2\\sin\\theta}{F_1 + F_2\\cos\\theta}', level: 'derived' }
        ]
        gaokaoPoints = [
          { text: '力的合成遵循平行四边形与三角形定则。', importance: 'core' as const },
          { text: '合力随两力夹角增大而单调减小。', importance: 'gaokao' as const }
        ]
      }

      return {
        quantities,
        formulas,
        gaokaoPoints
      }
    }
    case 'anim-newton-second': {
      const F = params.F ?? 10
      const m = params.m ?? 2
      const mu = params.mu ?? 0
      const advancedMode = params.advancedMode ?? 0
      
      let F_applied = F
      let f = 0
      let F_net = 0
      let a = 0
      let v = 0
      let s = 0

      if (advancedMode === 1) {
        // 进阶模式：变力运动
        const modelIdx = (params.modelIdx ?? 0) as 0 | 1
        const k = params.k ?? 2
        const F0 = params.F0 ?? 15
        const omega = params.omega ?? 1.5
        const motion = calculateNewtonSecondVariableMotion(modelIdx, { m, mu, k, F0, omega }, time)
        F_applied = motion.F_applied
        f = motion.f
        F_net = motion.F_net
        a = motion.a
        v = motion.v
        s = motion.s
      } else {
        // 普通模式：匀加速直线运动
        const g = 9.8
        const N = m * g
        f = mu * N
        F_applied = F
        F_net = Math.max(0, F_applied - f)
        a = F_net / m
        v = a * time
        s = 0.5 * a * time * time
      }

      return {
        quantities: [
          ...base,
          { label: '合外力 F_合', value: F_net, unit: 'N', highlight: F_net > 0.05 ? 'positive' as const : 'zero' as const },
          { label: '加速度 a', value: a, unit: 'm/s²', highlight: a > 0.05 ? 'positive' as const : 'zero' as const },
          { label: '瞬时速度 v', value: v, unit: 'm/s', highlight: v > 0.05 ? 'positive' as const : 'zero' as const },
          { label: '当前位移 s', value: s, unit: 'm' },
        ],
        formulas: [
          { name: '牛顿第二定律', latex: 'F_{\\text{合}} = ma', level: 'core' },
          { name: '合外力计算', latex: 'F_{\\text{合}} = F - f', level: 'core', condition: '水平面上，拉力与摩擦力方向相反' },
          { name: '滑动摩擦力', latex: 'f = \\mu N = \\mu mg', level: 'core', condition: '水平面上滑动时' }
        ],
        gaokaoPoints: [
          { text: '加速度 a 与合外力 F_合 瞬时对应，力变则 a 变。', importance: 'gaokao' as const },
          { text: 'a 的方向始终与合外力 F_合 的方向相同。', importance: 'core' as const },
          { text: '合外力、质量与加速度必须对应同一个研究对象（小车）。', importance: 'core' as const }
        ]
      }
    }
    case 'anim-weightlessness': {
      const m = params.m ?? 50
      const g = params.g ?? 9.8
      const a_param = params.a ?? 2
      const advancedMode = params.advancedMode ?? 0
      
      let a = a_param
      let v = 0
      let N = m * (g + a)
      let stateName = '正常平衡'

      if (advancedMode === 1) {
        const modelIdx = (params.modelIdx ?? 0) as 0 | 1
        const motion = calculateElevatorMotion(modelIdx, m, g, time)
        a = motion.a
        v = motion.v
        N = motion.N
        
        if (motion.state === 'overweight') stateName = '超重'
        else if (motion.state === 'underweight') stateName = '失重'
        else if (motion.state === 'weightless') stateName = '完全失重'
        else stateName = '正常平衡'
      } else {
        // 普通模式，恒定加速度：使用 calculateElevatorMotion 统一计算
        const motion = calculateElevatorMotion(2, m, g, time, a_param)
        a = a_param
        v = motion.v
        N = m * (g + a)
        if (N < 0) N = 0
        
        if (Math.abs(a) < 0.01) stateName = '正常平衡'
        else if (Math.abs(a + g) < 0.1) stateName = '完全失重'
        else if (a > 0) stateName = '超重'
        else stateName = '失重'
      }

      return {
        quantities: [
          ...base,
          { label: '电梯加速度 a', value: a.toFixed(2), unit: 'm/s²', highlight: a > 0.05 ? 'positive' as const : a < -0.05 ? 'negative' as const : 'zero' as const },
          { label: '支持力/视重 N', value: N.toFixed(1), unit: 'N', highlight: N > m * g + 0.1 ? 'positive' as const : N < 0.1 ? 'zero' as const : N < m * g - 0.1 ? 'negative' as const : undefined },
          { label: '真实重力 G', value: (m * g).toFixed(1), unit: 'N' },
          { label: '电梯速度 v', value: v.toFixed(2), unit: 'm/s' },
          { label: '超失重状态', value: stateName, unit: '', highlight: stateName === '超重' ? 'positive' as const : stateName === '完全失重' ? 'extreme' as const : stateName === '失重' ? 'negative' as const : undefined }
        ],
        formulas: [
          { name: '视重计算公式', latex: 'N = m(g + a)', level: 'core', condition: '取向上为正方向' },
          { name: '牛顿第二定律', latex: 'N - mg = ma', level: 'core', condition: '取向上为正方向' }
        ],
        gaokaoPoints: [
          { text: '【实重与视重】物体的真实重力 mg 保持不变，改变的仅是支持力（视重）。', importance: 'core' as const },
          { text: '【加速度决定态】状态仅由 a 的方向决定：a 向上则超重，a 向下则失重，与速度方向无关。', importance: 'gaokao' as const },
          { text: '【完全失重】当 a = -g 时，支持力 N = 0，物体在空中处于漂浮态。', importance: 'core' as const }
        ]
      }
    }
    case 'anim-power': {
      const mode = params.mode ?? 0
      const P_rated = params.P ?? 60000
      const m = params.m ?? 2000
      const f = params.f ?? 2000
      const a_target = params.a ?? 1.5

      if (mode === 0) {
        // ── 基础模式：恒定功率起动 ──
        const cpParams = calculateConstantPowerParams(P_rated, m, f)
        const trajectory = precomputeConstantPowerTrajectory(P_rated, m, f, 30)
        const state = getPowerStateAtTime(trajectory, time)

        return {
          quantities: [
            ...base,
            { label: '速度 v', value: state.v.toFixed(1), unit: 'm/s' },
            { label: '牵引力 F', value: state.F.toFixed(0), unit: 'N' },
            { label: '加速度 a', value: state.a.toFixed(2), unit: 'm/s²' },
            { label: '实际功率 P', value: (state.P / 1000).toFixed(1), unit: 'kW' },
            { label: '最大速度 vmax', value: cpParams.v_max.toFixed(1), unit: 'm/s', highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '牵引力', latex: 'F = \\frac{P}{v}', note: '低速时限流 F_max = 3f' },
            { name: '加速度', latex: 'a = \\frac{F - f}{m}' },
            { name: '最大速度', latex: 'v_{\\max} = \\frac{P}{f}' },
          ],
          gaokaoPoints: [
            { text: '恒定功率起动：F=P/v，随速度增大牵引力减小，加速度减小，最终匀速。', importance: 'core' as const },
            { text: 'v=0 时 F 理论上无穷大，实际存在最大牵引力限制（低速限流）。', importance: 'gaokao' as const },
            { text: 'v-t 图为一条先陡后缓的曲线，渐近线为 vmax=P/f。', importance: 'hard' as const },
          ],
        }
      } else {
        // ── 进阶模式：恒定加速度起动 ──
        const caParams = calculateConstantAccelParams(P_rated, m, f, a_target)
        const { points: trajectory } = precomputeConstantAccelTrajectory(P_rated, m, f, a_target, 30)
        const state = getPowerStateAtTime(trajectory, time)

        return {
          quantities: [
            ...base,
            { label: '当前阶段', value: state.phase === 0 ? '匀加速' : state.phase === 1 ? '变加速' : '匀速', unit: '', highlight: state.phase === 0 ? 'positive' as const : state.phase === 1 ? 'negative' as const : 'zero' as const },
            { label: '速度 v', value: state.v.toFixed(1), unit: 'm/s' },
            { label: '牵引力 F', value: state.F.toFixed(0), unit: 'N' },
            { label: '加速度 a', value: state.a.toFixed(2), unit: 'm/s²' },
            { label: '实际功率 P', value: (state.P / 1000).toFixed(1), unit: 'kW' },
            { label: '临界速度 vc', value: caParams.v_c.toFixed(1), unit: 'm/s', highlight: 'extreme' as const },
            { label: '最大速度 vmax', value: caParams.v_max.toFixed(1), unit: 'm/s', highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '匀加速牵引力', latex: 'F = ma + f', condition: '第一阶段（匀加速），F 恒定' },
            { name: '临界速度', latex: 'v_c = \\frac{P_{\\text{rated}}}{ma + f}', note: '匀加速阶段结束时的速度' },
            { name: '变加速牵引力', latex: 'F = \\frac{P_{\\text{rated}}}{v}', condition: '第二阶段（恒功率），F 随 v 增大而减小' },
            { name: '最大速度', latex: 'v_{\\max} = \\frac{P_{\\text{rated}}}{f}' },
          ],
          gaokaoPoints: [
            { text: '恒定加速度起动分两阶段：先匀加速（F 恒定，P 递增），达到额定功率后变加速（P 恒定，F 递减）。', importance: 'core' as const },
            { text: '拐点 vc=Prated/(ma+f) 是高考高频考点，v-t 图在此处由直线变为曲线。', importance: 'gaokao' as const },
            { text: '两种起动模型最终都达到 vmax=Prated/f，区别在于到达的方式不同。', importance: 'hard' as const },
          ],
        }
      }
    }
    case 'anim-kinetic-energy': {
      const mode = params.mode ?? 0
      const m = params.m ?? 2
      const v0 = params.v0 ?? 0
      const F_pull = params.F ?? 15
      const s_target = params.s ?? 6
      const R = params.R ?? 5
      const mu = params.mu ?? 0.15
      if (mode === 0) {
        // ── 基础普通模式：恒力拉物块（撤去拉力） ──
        const x_end = s_target * 1.6
        const { points: trajectory } = precomputeConstantKETrajectory(m, v0, F_pull, s_target, x_end)
        const state = getKEStateAtTime(trajectory, time)
        const initialEk = 0.5 * m * v0 * v0
        const deltaEk = state.Ek - initialEk

        return {
          quantities: [
            ...base,
            { label: '运动状态', value: state.phase === 0 ? '受力加速中' : '拉力已撤去(匀速)', unit: '', highlight: state.phase === 0 ? 'positive' as const : undefined },
            { label: '实时速度 v', value: state.v.toFixed(2), unit: 'm/s' },
            { label: '拉力功 W_拉', value: state.W.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '动能变化量 ΔEk', value: deltaEk.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '实时动能 Ek', value: state.Ek.toFixed(1), unit: 'J' },
          ],
          formulas: [
            { name: '拉力功', latex: 'W = F \\cdot s', level: 'core', condition: '拉力作用阶段' },
            { name: '动能定义', latex: 'E_k = \\frac{1}{2}mv^2', level: 'core' },
            { name: '动能定理', latex: 'W = \\Delta E_k = E_{k\\text{末}} - E_{k\\text{初}}', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '动能是状态量，功是过程量。动能定理是状态变化与过程做功的纽带。', importance: 'core' as const },
            { text: '动能定理 W = ΔEk 适用于任何外力（包括恒力与变力）。', importance: 'gaokao' as const },
            { text: '合外力做的总功等于物体动能的变化量，注意正负号相加。', importance: 'basic' as const },
          ],
        }
      } else {
        // ── 进阶模式：物块圆弧曲面轨道下滑（变力做功） ──
        const x_end = (519 / 102) * R
        const { points: trajectory } = precomputeCurvedTrackTrajectory(m, v0, R, mu, x_end)
        const state = getKEStateAtTime(trajectory, time)
        const initialEk = 0.5 * m * v0 * v0
        const deltaEk = state.Ek - initialEk

        // 重力做功 W_G 存放在 state.Ep 中，合力功存放在 state.W 中
        const WG = state.Ep
        const Wf = state.W - WG // 摩擦力负功

        return {
          quantities: [
            ...base,
            { label: '运动状态', value: state.phase === 0 ? '曲面下滑中' : '已至水平面(匀速)', unit: '', highlight: state.phase === 0 ? 'positive' as const : undefined },
            { label: '下滑高度 y', value: state.y.toFixed(2), unit: 'm' },
            { label: '重力正功 W_重', value: `+${WG.toFixed(1)}`, unit: 'J', highlight: 'positive' as const },
            { label: '摩擦力功 W_摩', value: Wf.toFixed(1), unit: 'J', highlight: 'negative' as const },
            { label: '合外力总功 W_总', value: state.W.toFixed(1), unit: 'J', highlight: state.W >= 0 ? 'positive' as const : 'negative' as const },
            { label: '动能变化量 ΔEk', value: (deltaEk >= 0 ? '+' : '') + deltaEk.toFixed(1), unit: 'J', highlight: deltaEk >= 0 ? 'positive' as const : 'negative' as const },
            { label: '实时速度 v', value: state.v.toFixed(2), unit: 'm/s' },
          ],
          formulas: [
            { name: '重力做正功', latex: 'W_{\\text{重}} = mgh', level: 'core', condition: '与曲面路径无关' },
            { name: '摩擦变力做功', latex: 'W_{\\text{摩}} = \\int -f \\, ds', level: 'important', note: '切向摩擦力 f = \\mu N 随速度与角度变化' },
            { name: '动能定理', latex: 'W_{\\text{总}} = W_{\\text{重}} + W_{\\text{摩}} = \\Delta E_k', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '重力是恒力，在曲面下滑时位移方向时刻改变，但功只与垂直高度差相关：W_重 = mgh。', importance: 'core' as const },
            { text: '摩擦力是典型的变力，大小随支持力 N = mg·cosθ + mv²/R 实时变大。求变摩擦力功通常优先使用动能定理：W_摩 = ΔEk - W_重。', importance: 'gaokao' as const },
            { text: '在变加速度曲线运动中，应用动能定理直接跳过了向心力公式与牛二定律复杂的非线性积分，是高考解答题的首选法则。', importance: 'hard' as const },
          ],
        }
      }
    }
    case 'anim-potential-energy': {
      const mode = params.mode ?? 0
      const m = params.m ?? 2
      const g = params.g ?? 9.8
      const y0 = params.y0 ?? 8
      const y_ref = params.y_ref ?? 3
      const k = params.k ?? 100
      const x0 = params.x0 ?? 2.0

      if (mode === 0) {
        // ── 重力势能模式 ──
        const trajectory = precomputeGravityTrajectory(m, g, y0, y_ref, 0.7, 15)
        const state = getPEStateAtTime(trajectory, time)
        
        return {
          quantities: [
            ...base,
            { label: '相对零势能高度 h', value: (state.pos - y_ref).toFixed(2), unit: 'm' },
            { label: '实时高度 y', value: state.pos.toFixed(2), unit: 'm' },
            { label: '重力做功 W_重', value: state.W.toFixed(1), unit: 'J', highlight: state.W >= 0 ? 'positive' as const : 'negative' as const },
            { label: '重力势能 Ep', value: state.Ep.toFixed(1), unit: 'J', highlight: state.Ep >= 0 ? 'positive' as const : 'negative' as const },
            { label: '势能变化量 ΔEp', value: (state.deltaEp >= 0 ? '+' : '') + state.deltaEp.toFixed(1), unit: 'J', highlight: state.deltaEp >= 0 ? 'positive' as const : 'negative' as const },
            { label: '实时速度 v', value: state.v.toFixed(2), unit: 'm/s' },
          ],
          formulas: [
            { name: '重力势能', latex: 'E_p = mg(y - y_{\\text{ref}})', note: '零势能面下方为负值', level: 'core' },
            { name: '重力做功与能变', latex: 'W_G = -\\Delta E_p = E_{p1} - E_{p2}', note: '重力做功只与初末高度差有关', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '重力势能 Ep = mgh 中的 h 是相对于零势能面的高度。势能的正负仅代表比参考面高还是低。', importance: 'core' as const },
            { text: '重力势能是物体和地球系统共有的，不能脱离地球谈物体的重力势能。', importance: 'basic' as const },
            { text: '重力做正功势能减少，克服重力做功势能增加，且 WG = -ΔEp 严格成立。', importance: 'gaokao' as const },
            { text: '零势能面的选择是任意的，不同参考面下物体的势能值不同，但下落时的功与势能变化量 ΔEp 恒定。', importance: 'hard' as const },
          ],
        }
      } else {
        // ── 弹性势能模式 ──
        const trajectory = precomputeSpringTrajectory(m, k, x0, 15)
        const state = getPEStateAtTime(trajectory, time)

        return {
          quantities: [
            ...base,
            { label: '弹簧形变量 x', value: state.pos.toFixed(2), unit: 'm' },
            { label: '实时弹力 F_弹', value: state.F.toFixed(1), unit: 'N', highlight: Math.abs(state.F) > 0.05 ? 'positive' as const : undefined },
            { label: '弹性势能 E_p弹', value: state.Ep.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '弹力做功 W_弹', value: state.W.toFixed(1), unit: 'J', highlight: state.W >= 0 ? 'positive' as const : 'negative' as const },
            { label: '动能 E_k', value: state.Ek.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '实时速度 v', value: state.v.toFixed(2), unit: 'm/s' },
          ],
          formulas: [
            { name: '胡克定律', latex: 'F_s = -kx', note: '恢复力方向与形变方向相反', level: 'core' },
            { name: '弹性势能', latex: 'E_{pe} = \\frac{1}{2}kx^2', note: '拉伸或压缩相同位移弹性势能相等', level: 'core' },
            { name: '弹力功与能变', latex: 'W_s = -\\Delta E_{pe} = \\frac{1}{2}kx_1^2 - \\frac{1}{2}kx_2^2', level: 'important' },
          ],
          gaokaoPoints: [
            { text: '弹性势能的零点通常规定在弹簧处于自然原长处，拉伸和压缩时势能均非负（Epe ∝ x²）。', importance: 'core' as const },
            { text: '弹力是典型的随位移线性改变的变力。求弹力功可使用 F-x 面积积分或弹性势能公式。', importance: 'gaokao' as const },
            { text: '弹力做正功弹性势能减少，弹力做负功（克服弹力）弹性势能增加：Ws = -ΔEpe。', importance: 'core' as const },
          ],
        }
      }
    }
    case 'anim-energy-conservation': {
      const mode = params.mode ?? 0
      const m = params.m ?? 2
      const g = params.g ?? 9.8
      const theta0 = params.theta0 ?? 45
      const L = params.L ?? 5
      const R = params.R ?? 5
      const mu = params.mu ?? 0.1

      if (mode === 0) {
        // ── 单摆模式 ──
        const trajectory = precomputePendulumTrajectory(m, L, theta0, g, 15)
        const state = getECStateAtTime(trajectory, time)
        const thetaDeg = (state.theta * 180) / Math.PI

        return {
          quantities: [
            ...base,
            { label: '摆角 θ', value: `${thetaDeg.toFixed(1)}°`, unit: '' },
            { label: '重力势能 Ep', value: state.Ep.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '实时动能 Ek', value: state.Ek.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '总机械能 E', value: state.Etot.toFixed(1), unit: 'J', highlight: 'extreme' as const },
            { label: '实时速度 v', value: state.v.toFixed(2), unit: 'm/s' },
          ],
          formulas: [
            { name: '摆球高度', latex: 'h = L(1 - \\cos\\theta)', note: '以最低点为零参考面', level: 'important' },
            { name: '重力势能', latex: 'E_p = mgh', level: 'core' },
            { name: '机械能守恒', latex: 'E_k + E_p = \\text{常量}', level: 'core', condition: '无空气阻力下' },
          ],
          gaokaoPoints: [
            { text: '单摆振动过程中重力与拉力的合力提供回复力，仅有重力做功，系统机械能严格守恒。', importance: 'core' as const },
            { text: '在最高点小球速度为0，动能为0，重力势能达到最大值；在最低点高度为0，势能为0，速度达到最大值。', importance: 'basic' as const },
            { text: '动能和重力势能随着往复摆动进行此消彼长的正弦转化，总和恒定不变。', importance: 'gaokao' as const },
          ],
        }
      } else {
        // ── 山谷过山车阻尼模式 ──
        const trajectory = precomputeValleyTrajectory(m, R, mu, theta0, g, 15)
        const state = getECStateAtTime(trajectory, time)
        const thetaDeg = (state.theta * 180) / Math.PI

        return {
          quantities: [
            ...base,
            { label: '当前位置 θ', value: `${thetaDeg.toFixed(1)}°`, unit: '' },
            { label: '重力势能 Ep', value: state.Ep.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '实时动能 Ek', value: state.Ek.toFixed(1), unit: 'J', highlight: 'positive' as const },
            { label: '机械能 E_机', value: (state.Ep + state.Ek).toFixed(1), unit: 'J' },
            { label: '内能(生热) Q', value: state.Q.toFixed(1), unit: 'J', highlight: 'negative' as const },
            { label: '总能量 E_总', value: state.Etot.toFixed(1), unit: 'J', highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '支持力', latex: 'F_N = mg\\cos\\theta + \\frac{mv^2}{R}', note: '凹轨道底部滑块压力最大', level: 'important' },
            { name: '摩擦力', latex: 'f = \\mu F_N', level: 'core' },
            { name: '摩擦产热', latex: 'Q = \\int f \\, ds', note: '摩擦生热内能，属于过程量', level: 'core' },
            { name: '能量守恒', latex: 'E_k + E_p + Q = E_0', level: 'core', condition: '机械能不守恒，但总能量守恒' },
          ],
          gaokaoPoints: [
            { text: '在有摩擦阻力的情况下，滑块受阻力做负功，系统机械能不断耗散减少。', importance: 'core' as const },
            { text: '摩擦力做负功，使机械能转化为等量的内能（摩擦生热 Q），系统总能量严格守恒。', importance: 'gaokao' as const },
            { text: '滑块在往复摆动幅度逐渐变小后，若滑到最高点时重力切向分力小于最大静摩擦力（|tanθ| ≤ μ），将卡死停在坡上。', importance: 'hard' as const },
          ],
        }
      }
    }
    case 'anim-work': {
      const mode = params.mode ?? 0
      const F = params.F ?? 10
      const angleDeg = params.angleDeg ?? 30
      const s = params.s ?? 5
      const m = params.m ?? 2
      const mu = params.mu ?? 0.3
      const g = params.g ?? GRAVITY

      const workType = classifyWorkType(angleDeg)

      if (mode === 0) {
        // ── 基础模式：理想恒力与方向投影 ──
        const { W, Fx, Fy } = calculateWorkBasic(F, s, angleDeg)
        const workLabel = workType === 'positive' ? '正功' : workType === 'negative' ? '负功' : '不做功'

        return {
          quantities: [
            ...base,
            { label: '做功类型', value: workLabel, unit: '', highlight: workType === 'positive' ? 'positive' as const : workType === 'negative' ? 'negative' as const : 'zero' as const },
            { label: '拉力做功 W', value: W.toFixed(1), unit: 'J', highlight: workType === 'positive' ? 'positive' as const : workType === 'negative' ? 'negative' as const : 'zero' as const },
            { label: '水平分力 Fx', value: Fx.toFixed(1), unit: 'N' },
            { label: '竖直分力 Fy', value: Fy.toFixed(1), unit: 'N' },
          ],
          formulas: [
            { name: '恒力做功', latex: 'W = Fs\\cos\\theta', note: 'θ 为力与位移方向的夹角', level: 'core' },
            { name: '水平分力', latex: 'F_x = F\\cos\\theta', level: 'important' },
            { name: '竖直分力', latex: 'F_y = F\\sin\\theta', level: 'important' },
          ],
          gaokaoPoints: [
            { text: 'W = Fscosθ，θ 为力与位移方向的夹角，cosθ 本质是力在位移方向上的投影系数。', importance: 'core' as const },
            { text: 'θ<90° 做正功，θ>90° 做负功，θ=90° 不做功——做功正负由力与位移的夹角决定。', importance: 'gaokao' as const },
            { text: '功是标量，正负不代表方向，代表力对物体运动是促进还是阻碍。', importance: 'hard' as const },
          ],
        }
      } else {
        // ── 进阶模式：摩擦力做功与脱地临界 ──
        const result = calculateWorkAdvanced(F, s, angleDeg, m, mu, g)

        return {
          quantities: [
            ...base,
            { label: '支持力 FN', value: result.F_N.toFixed(1), unit: 'N', highlight: result.isLiftedOff ? 'zero' as const : undefined },
            { label: '摩擦力 f', value: result.f.toFixed(1), unit: 'N' },
            { label: '拉力功 WF', value: result.W_F.toFixed(1), unit: 'J', highlight: result.W_F > 0.05 ? 'positive' as const : result.W_F < -0.05 ? 'negative' as const : 'zero' as const },
            { label: '摩擦力功 Wf', value: result.W_f.toFixed(1), unit: 'J', highlight: 'negative' as const },
            { label: '合力功 Wnet', value: result.W_net.toFixed(1), unit: 'J', highlight: result.W_net > 0.05 ? 'positive' as const : result.W_net < -0.05 ? 'negative' as const : 'zero' as const },
            ...(result.isLiftedOff
              ? [{ label: '脱地警告', value: 'FN=0, f=0', unit: '', highlight: 'extreme' as const }]
              : []),
          ],
          formulas: [
            { name: '支持力', latex: 'F_N = mg - F\\sin\\theta', condition: '斜向上拉时；斜向下推时 FN=mg+Fsinθ', level: 'important' },
            { name: '滑动摩擦力', latex: 'f = \\mu F_N', note: '脱地时 FN=0，摩擦力消失', level: 'core' },
            { name: '拉力做功', latex: 'W_F = Fs\\cos\\theta', level: 'core' },
            { name: '摩擦力做功', latex: 'W_f = -fs', level: 'important', note: '负号表示摩擦力做负功' },
            { name: '合力做功', latex: 'W_{\\text{net}} = W_F + W_f', note: '合力功即动能定理的左边', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '斜向上拉时 FN=mg−Fsinθ，摩擦力减小；斜向下推时 FN=mg+Fsinθ，摩擦力增大。', importance: 'core' as const },
            { text: '脱地临界条件：Fsinθ≥mg 时，FN=0，滑动摩擦力消失——这是高考受力分析的高频陷阱。', importance: 'gaokao' as const },
            { text: '合力功等于各力做功的代数和，Wnet = WF + Wf，正负号直接代入计算。', importance: 'hard' as const },
          ],
        }
      }
    }
    default:
      return {
        quantities: [
          ...base,
          ...Object.entries(params).map(([key, value]) => ({ label: key, value, unit: '' })),
        ],
      }
  }

  // 兜底返回，消除 TS2366
  return {
    quantities: base,
  }
}
