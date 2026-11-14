import {
  calculateCoulombForce,
  calculateContactCharges,
  calculateChargingProcess,
  calculateMillikanOilDrop,
  calculateElectricField,
  calculateCapacitor,
  calculateChargeInEFieldTrajectory,
  getChargeInEFieldTimeScale,
  computeRCTransient,
  rcTauFromParams,
  rcWindowFromParams,
  type RCPhase,
  TWO_CHARGE_SEPARATION_M,
  COULOMB_CONSTANT,
  GRAVITY,
} from '../../../physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { CANVAS_PRESETS } from '@/theme/spacing'
import type { PhysicsPanelData, PhysicsQuantity } from '../types'

const VACUUM_PERMITTIVITY = 8.85e-12

export function handleElectrostatics(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  switch (animId) {
    case 'anim-coulomb-law': {
      const q1 = params.q1 ?? 2
      const q2 = params.q2 ?? -3
      const r = params.r ?? 4
      const mode = params.mode ?? 0
      const attractive = q1 * q2 < 0
      const k = COULOMB_CONSTANT
      const q1SI = Math.abs(q1 * 1e-6)
      const q2SI = Math.abs(q2 * 1e-6)

      if (mode === 0) {
        const rSI = (r || 0.01) * 0.01
        const { F } = calculateCoulombForce(k, q1SI, q2SI, rSI)
        const { q1New } = calculateContactCharges(q1, q2)
        return {
          quantities: [
            ...base,
            { label: 'q₁', value: `${q1 > 0 ? '+' : ''}${q1.toFixed(1)}`, unit: 'μC', highlight: q1 > 0 ? 'positive' as const : 'negative' as const },
            { label: 'q₂', value: `${q2 > 0 ? '+' : ''}${q2.toFixed(1)}`, unit: 'μC', highlight: q2 > 0 ? 'positive' as const : 'negative' as const },
            { label: '间距 r', value: r.toFixed(1), unit: 'cm' },
            { label: '库仑力 F', value: F.toExponential(2), unit: 'N', highlight: 'extreme' as const },
            { label: '作用类型', value: attractive ? '相互吸引' : '相互排斥', unit: '', highlight: attractive ? 'negative' as const : 'positive' as const },
            { label: '接触均分后单球电量', symbol: "q'", value: `${q1New > 0 ? '+' : ''}${q1New.toFixed(2)}`, unit: 'μC' },
          ],
          formulas: [
            { name: '库仑定律', latex: 'F = k \\frac{q_1 q_2}{r^2}', level: 'core', condition: '仅适用于点电荷与真空' },
            { name: '静电力常量', latex: 'k = 9 \\times 10^9 \\;\\text{N·m}^2\\text{/C}^2', level: 'core' },
            { name: '接触起电电荷均分', latex: "q_1' = q_2' = \\frac{q_1 + q_2}{2}", level: 'core', condition: '两个完全相同的金属球接触后再分开' },
          ],
          gaokaoPoints: [
            { text: '库仑定律仅适用于点电荷与真空（或空气近似）。', importance: 'gaokao' as const },
            { text: '相同金属球接触起电：异种电荷先中和再平分，同种电荷总电量平分，总电荷量始终守恒。', importance: 'gaokao' as const },
            { text: '库仑力与万有引力具有相似形式（都与距离平方成反比），但本质不同。', importance: 'core' as const },
            { text: '同号电荷相斥，异号电荷相吸——方向由符号决定。', importance: 'basic' as const },
          ],
        }
      } else {
        const q3 = params.q3 ?? 1
        return {
          quantities: [
            ...base,
            { label: 'Q₁', value: `${q1 > 0 ? '+' : ''}${q1.toFixed(1)}`, unit: 'μC', highlight: q1 > 0 ? 'positive' as const : 'negative' as const },
            { label: 'Q₂', value: `${q2 > 0 ? '+' : ''}${q2.toFixed(1)}`, unit: 'μC', highlight: q2 > 0 ? 'positive' as const : 'negative' as const },
            { label: 'Q₃', value: `${q3 > 0 ? '+' : ''}${q3.toFixed(1)}`, unit: 'μC', highlight: q3 > 0 ? 'positive' as const : 'negative' as const },
          ],
          formulas: [
            { name: '库仑定律', latex: 'F = k \\frac{q_1 q_2}{r^2}', level: 'core', condition: '仅适用于点电荷与真空' },
            { name: '平衡条件', latex: '\\sum \\vec{F} = 0', level: 'core', condition: '三电荷平衡时各电荷合力为零' },
          ],
          gaokaoPoints: [
            { text: '库仑定律仅适用于点电荷与真空。', importance: 'gaokao' as const },
            { text: '三个点电荷平衡条件：两大夹小、两同夹异、远小近大。', importance: 'gaokao' as const },
            { text: '中间电荷一定与两侧电荷电性相反。', importance: 'core' as const },
            { text: '中间电荷的电荷量一定小于两侧电荷。', importance: 'core' as const },
          ],
        }
      }
    }
    case 'anim-electric-field': {
      const mode = params.mode ?? 0
      const qTest = params.qTest ?? 1.0
      const rTest = params.rTest ?? 3.0
      const rSI = (rTest || 0.01) * 0.01

      if (mode === 0) {
        const q = params.q ?? 5.0
        const qSI = q * 1e-6
        const qTestSI = qTest * 1e-6

        const { E } = calculateElectricField(COULOMB_CONSTANT, Math.abs(qSI), rSI)
        const F = Math.abs(qTestSI * E)

        return {
          quantities: [
            ...base,
            { label: '场强 E', value: E.toExponential(2), unit: 'N/C', highlight: 'extreme' as const },
            { label: '静电力 F', value: F.toExponential(2), unit: 'N', highlight: 'extreme' as const },
            { label: '力与场强方向', value: qTest === 0 ? '无作用力' : (qTest > 0 ? '两者同向' : '两者反向'), unit: '', highlight: qTest >= 0 ? 'positive' as const : 'negative' as const },
          ],
          formulas: [
            { name: '电场强度定义式', latex: 'E = \\frac{F}{|q|}', level: 'core', condition: '适用于一切电场，比值定义法' },
            { name: '点电荷场强决定式', latex: 'E = k \\frac{|Q|}{r^2}', level: 'core', condition: '真空中点电荷场强' },
          ],
          gaokaoPoints: [
            { text: '电场强度 E 是描述电场自身力性质的物理量，与试探电荷 q 的电性及大小无关。', importance: 'gaokao' as const },
            { text: '正试探电荷受到的电场力方向与 E 同向；负试探电荷受到的电场力方向与 E 反向。', importance: 'gaokao' as const },
            { text: '场强大小由场源电荷及位置决定，与距离的平方成反比。', importance: 'core' as const },
          ],
        }
      } else {
        const chargeConfig = params.chargeConfig ?? 0
        let q1 = 5.0
        let q2 = -5.0
        let configName = '等量异种电荷'

        if (chargeConfig === 1) {
          q1 = 5.0
          q2 = 5.0
          configName = '等量同种正电荷'
        } else if (chargeConfig === 2) {
          q1 = -5.0
          q2 = -5.0
          configName = '等量同种负电荷'
        }

        // 半间距必须与中屏同源：中屏把两点电荷放在相距 6cm 处（见 ElectricField.tsx），
        // 这里写死 5.25cm 会让合场强在中点差 3 倍、远端差近 4 倍。
        const d_half = TWO_CHARGE_SEPARATION_M / 2
        const xp = rTest * 0.01

        const r1 = Math.abs(xp + d_half)
        const r2 = Math.abs(xp - d_half)

        const E1 = calculateElectricField(COULOMB_CONSTANT, Math.abs(q1 * 1e-6), Math.max(0.005, r1)).E * (q1 >= 0 ? 1 : -1) * (xp >= -d_half ? 1 : -1)
        const E2 = calculateElectricField(COULOMB_CONSTANT, Math.abs(q2 * 1e-6), Math.max(0.005, r2)).E * (q2 >= 0 ? 1 : -1) * (xp >= d_half ? 1 : -1)

        const Enet = Math.abs(E1 + E2)
        const Fnet = Enet * Math.abs(qTest * 1e-6)

        return {
          quantities: [
            ...base,
            { label: '电荷配置', value: configName, unit: '' },
            { label: '合场强 E', value: Enet.toExponential(2), unit: 'N/C', highlight: 'extreme' as const },
            { label: '合力 F', value: Fnet.toExponential(2), unit: 'N', highlight: 'extreme' as const },
            { label: '力与场强方向', value: qTest === 0 ? '无作用力' : (qTest > 0 ? '两者同向' : '两者反向'), unit: '', highlight: qTest >= 0 ? 'positive' as const : 'negative' as const },
          ],
          formulas: [
            { name: '电场叠加原理', latex: '\\vec{E} = \\vec{E}_1 + \\vec{E}_2', level: 'core', condition: '多个点电荷电场强度的矢量合成' },
            { name: '平行四边形定则', latex: 'E = \\sqrt{E_1^2 + E_2^2 + 2E_1E_2\\cos\\theta}', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '空间中某点的合场强等于各场源电荷在该点产生分场强的矢量和（遵循平行四边形定则）。', importance: 'gaokao' as const },
            { text: '等量异种电荷中垂线上场强方向处处相同（均与连线平行且指向负电荷一侧），中点场强最大，向两侧递减。', importance: 'gaokao' as const },
            { text: '等量同种正电荷中垂线上，中点合场强为零，从中心向外侧中垂线场强先增大后减小。', importance: 'gaokao' as const },
          ],
        }
      }
    }
    case 'anim-charge-in-efield': {
      const U = params.U ?? 150
      const v0 = params.v0 ?? 15
      const q = params.q ?? 2
      const freq = params.freq ?? 30
      const isAC = params.isAC ?? 0
      const useGravity = params.useGravity ?? 0
      const phi0 = params.phi0 ?? 0

      const PLATE_LENGTH = 0.4
      const PLATE_GAP = 0.2
      const m = 10 * 1e-6 // 10 mg

      const simResult = calculateChargeInEFieldTrajectory({
        U,
        d: PLATE_GAP,
        L: PLATE_LENGTH,
        q: q * 1e-6,
        m,
        v0,
        g: useGravity === 1 ? GRAVITY : 0,
        isAC: isAC === 1,
        freq,
        phi0,
      })

      const TIME_SCALE = getChargeInEFieldTimeScale(simResult.tEnd, isAC === 1)
      const tSim = Math.min(time * TIME_SCALE, simResult.tEnd)

      const pts = simResult.points
      let curState = { t: tSim, x: 0, y: 0, vx: v0, vy: 0, ax: 0, ay: 0 }
      if (pts.length > 0) {
        const lastPt = pts[pts.length - 1]
        if (tSim <= 0) {
          curState = pts[0]
        } else if (tSim >= lastPt.t) {
          curState = lastPt
        } else {
          const dt = pts[1].t - pts[0].t || 0.0001
          const idx = Math.floor(tSim / dt)
          const p1 = pts[Math.min(idx, pts.length - 1)]
          const p2 = pts[Math.min(idx + 1, pts.length - 1)]
          if (p1 && p2 && p1.t !== p2.t) {
            const frac = (tSim - p1.t) / (p2.t - p1.t)
            curState = {
              t: tSim,
              x: p1.x + (p2.x - p1.x) * frac,
              y: p1.y + (p2.y - p1.y) * frac,
              vx: p1.vx + (p2.vx - p1.vx) * frac,
              vy: p1.vy + (p2.vy - p1.vy) * frac,
              ax: p1.ax + (p2.ax - p1.ax) * frac,
              ay: p1.ay + (p2.ay - p1.ay) * frac,
            }
          }
        }
      }

      const vTotal = Math.sqrt(curState.vx * curState.vx + curState.vy * curState.vy)

      const quantitiesList = [
        ...base,
        { label: '加速度 ay', value: curState.ay.toFixed(2), unit: 'm/s²', color: PHYSICS_COLORS.acceleration, highlight: 'extreme' as const },
        { label: '偏转距离 y', value: Math.abs(curState.y * 100).toFixed(2), unit: 'cm' },
        { label: '竖直速度 vy', value: curState.vy.toFixed(2), unit: 'm/s', color: PHYSICS_COLORS.velocityY },
        { label: '末速度 v', value: vTotal.toFixed(2), unit: 'm/s', color: PHYSICS_COLORS.velocity },
      ]

      if (isAC === 0) {
        // 直流类平抛模式：加入偏角比验证
        const tanTheta = Math.abs(curState.vy) / curState.vx
        const tanAlpha = curState.x > 0 ? Math.abs(curState.y) / curState.x : 0
        const ratio = tanAlpha > 0 ? tanTheta / tanAlpha : 2.00
        quantitiesList.push({
          label: '偏角比 tanθ/tanα',
          value: curState.x > 0.01 && Math.abs(curState.vy) > 0.05 ? ratio.toFixed(2) : '2.00',
          unit: ' (恒为 2)',
          color: PHYSICS_COLORS.work,
          highlight: 'extreme' as const
        })
      } else {
        // 交变方形波模式：加入功与动能增量验证
        const dEk = 0.5 * m * (vTotal * vTotal - v0 * v0) * 1e6 // μJ
        const W_g = m * (useGravity === 1 ? GRAVITY : 0) * curState.y * 1e6 // μJ
        const W_E = dEk - W_g // W_E + W_g = dEk => W_E = dEk - W_g
        quantitiesList.push(
          {
            label: '电场力功 W_E',
            value: W_E.toFixed(3),
            unit: ' μJ',
            color: PHYSICS_COLORS.electricForce,
          },
          {
            label: '动能变化 ΔEk',
            value: dEk.toFixed(3),
            unit: ' μJ',
            color: PHYSICS_COLORS.kineticEnergy,
            highlight: 'extreme' as const
          }
        )
      }

      return {
        quantities: quantitiesList,
        formulas: [
          {
            name: '类平抛偏转位移',
            latex: 'y = \\frac{1}{2}at^2 = \\frac{q U l^2}{2 m d v_0^2}',
            level: 'core',
            condition: '仅适用于恒定匀强偏转电场（忽略重力）'
          },
          {
            name: '速度偏转角',
            latex: '\\tan\\theta = \\frac{v_y}{v_0}',
            level: 'core'
          }
        ],
        gaokaoPoints: [
          {
            text: '运动的合成与分解：平抛/类平抛运动是将复杂的曲线运动分解为水平方向的匀速直线运动和竖直方向的变速运动。',
            importance: 'gaokao'
          },
          {
            text: '交变电场分析：交变电场中粒子在竖直方向所受电场力周期性改变方向，速度-时间图像为"折线图"。其轨迹呈锯齿状复杂周期运动。',
            importance: 'hard'
          },
          {
            text: '临界逃逸大题：若飞出电场所需时间 t_exit = L/v₀ 大于撞板临界时间，则粒子无法逃逸直接撞击极板。',
            importance: 'core'
          }
        ],
        warnings: [
          {
            text: '易错点：粒子飞出极板后进入无场区，将以飞出瞬间的末速度做匀速直线运动，误认为其继续做曲线运动。',
            level: 'warning'
          }
        ]
      }
    }
    case 'anim-capacitor': {
      const capMode = params.mode ?? 0

      // ── 模式 1：RC 充放电暂态 ──────────────────────────────────
      // 与中屏场景、上方 i–t / u_C–t 曲线共用 computeRCTransient 与同一套 τ，
      // 右屏所有读数都是"当前 time 的函数"，不存在独立累积的状态。
      if (capMode === 1) {
        const emf = params.emf ?? 6
        const R = (params.R_t ?? 10) * 1e3
        const C = (params.C_t ?? 200) * 1e-6
        const phase: RCPhase = (params.phase ?? 0) === 1 ? 'discharge' : 'charge'
        const isCharge = phase === 'charge'

        const windowSec = rcWindowFromParams(params)
        const tau = rcTauFromParams(params)
        const t = Math.min(Math.max(time, 0), windowSec)
        const st = computeRCTransient(emf, R, C, t, phase)

        const energyFull = 0.5 * C * emf * emf // 充满时储能 ½CE²
        // 充电全过程电源做功 W = qE = CE²，其中恰好一半进电场、一半在 R 上生热
        const sourceWork = C * emf * emf

        return {
          quantities: [
            ...base,
            {
              label: '时间常数',
              symbol: 'τ',
              value: tau,
              unit: 's',
              color: PHYSICS_COLORS.capacitor,
              highlight: 'extreme' as const,
            },
            { label: '当前时刻', symbol: 't', value: t, unit: 's' },
            { label: 't / τ', value: t / tau, unit: '' },
            {
              label: '电容电压',
              symbol: 'u_C',
              value: st.uC,
              unit: 'V',
              color: PHYSICS_COLORS.electricPotential,
              highlight: 'extreme' as const,
            },
            {
              label: '回路电流',
              symbol: 'i',
              value: Math.abs(st.i) * 1e3,
              unit: 'mA',
              color: PHYSICS_COLORS.velocity,
            },
            {
              label: '极板电量',
              symbol: 'q',
              value: st.q * 1e6,
              unit: 'μC',
              color: PHYSICS_COLORS.positiveCharge,
            },
            {
              label: '∫i dt（面积）',
              value: st.areaCharge * 1e6,
              unit: 'μC',
              color: PHYSICS_COLORS.work,
              highlight: 'extreme' as const,
            },
            {
              label: '电场储能',
              symbol: 'E_C',
              value: st.storedEnergy * 1e3,
              unit: 'mJ',
              color: PHYSICS_COLORS.kineticEnergy,
            },
            { label: '电阻热功率', symbol: 'P', value: st.heatPower * 1e3, unit: 'mW' },
          ],
          formulas: [
            {
              name: isCharge ? '充电电压方程' : '放电电压方程',
              latex: isCharge ? 'u_C = E\\left(1 - e^{-t/RC}\\right)' : 'u_C = E\\,e^{-t/RC}',
              level: 'core',
              condition: isCharge ? 'S 闭合，电容器从零开始充电' : 'S 断开，电容经 R 放电',
            },
            {
              name: '电流方程',
              latex: isCharge
                ? 'i = \\frac{E}{R}\\,e^{-t/RC}'
                : 'i = -\\frac{E}{R}\\,e^{-t/RC}',
              level: 'core',
              condition: isCharge
                ? '闭合瞬间电流最大 i₀ = E/R，随后按 e 指数衰减'
                : '负号表示放电电流方向与充电时相反',
            },
            {
              name: '时间常数',
              latex: '\\tau = RC',
              level: 'core',
              note: `本题 τ = ${tau.toFixed(2)} s，t = τ 时 ${isCharge ? 'u_C 升至 63.2%' : 'u_C 降至 36.8%'}`,
            },
            {
              name: '面积即电量',
              // 充电：面积 = 已充入的电量 C·u_C；放电：面积 = 已放出的电量 CE − C·u_C。
              // 两种情形公式不同，写同一个会在放电模式下把 758 μC 错读成 441 μC。
              latex: isCharge
                ? '\\int_0^t i\\,\\mathrm{d}t = \\Delta Q = C\\,u_C'
                : '\\int_0^t |i|\\,\\mathrm{d}t = CE - C\\,u_C',
              level: 'important',
              condition: isCharge
                ? 'i–t 图线与时间轴围成的面积'
                : '放电时面积为"已放出的电量"，与 q 互补',
            },
            {
              name: isCharge ? '充电能量分配（电源做功 / 电场储能 / 电阻生热）' : '放电能量转化',
              latex: isCharge
                ? 'W_{E} = CE^{2}, \\quad E_C = \\tfrac{1}{2}CE^{2}, \\quad Q_{R} = \\tfrac{1}{2}CE^{2}'
                : 'Q_{R} = \\tfrac{1}{2}CE^{2}',
              level: 'important',
              condition: isCharge
                ? '无论 R 多大，电源做功总有一半变成电阻内能'
                : '放电：储存的 ½CE² 全部在电阻上转为内能',
              note: isCharge
                ? `本题 W源 = ${sourceWork.toExponential(2)} J，其中一半（${energyFull.toExponential(2)} J）储存在电场中`
                : `本题初态储能 ${energyFull.toExponential(2)} J，放完后全部在电阻上变为内能`,
            },
          ],
          gaokaoPoints: [
            {
              text: `【τ 只由 R、C 决定】τ = RC = ${tau.toFixed(2)} s，与电源电动势 E 无关。改变 E 只改变曲线高度（i₀ = E/R），不改变衰减快慢。`,
              importance: 'gaokao',
            },
            {
              text: '【三个特征时刻】t = τ 时 u_C 达 63.2%、i 剩 36.8%；t = 3τ 时约 95%；t = 5τ 时约 99.3%，可视作"充满/放完"。',
              importance: 'core',
            },
            {
              text: '【面积 = 电量】i–t 图线下的面积 ∫|i| dt 就是这段时间内流过导线截面的电荷量：充电时等于极板电荷的增量，放电时等于减少量。',
              importance: 'gaokao',
            },
            {
              text: '【充电效率恒为 50%】电源做功 W = CE²，电场只储存 ½CE²，另一半无论 R 多大都在电阻上转为内能——R 只决定快慢，不决定分配比例。',
              importance: 'hard',
            },
          ],
          warnings: [
            {
              text: `易错点：误以为 R 越大越"容易充满"。实际上 R 越大 τ = RC 越大，充电越慢；但最终稳定电压仍是 u_C = E，与 R 无关。`,
              level: 'warning',
            },
            {
              text: '注意：i–t 图线的面积是电荷量 ΔQ（单位 C），不是功或功率，切勿与 P–t 图的面积混淆。',
              level: 'info',
            },
          ],
        }
      }

      const S = params.S ?? 100
      const d = params.d ?? 5
      const epsilon_r = params.epsilon_r ?? 1
      const U = params.U ?? 12
      const isConnected = (params.connected ?? 1) >= 0.5

      const { C } = calculateCapacitor(VACUUM_PERMITTIVITY * epsilon_r, S * 1e-4, d * 1e-3)
      const currentQ = C * U
      const defaultQ = calculateCapacitor(VACUUM_PERMITTIVITY, 100 * 1e-4, 5 * 1e-3).C * 12
      // 断开电源时 Q 不变，以 store 中的 savedQ 为单真源（无 savedQ 独立调用时回退到默认基准电荷）
      const charge = isConnected ? currentQ : (params.savedQ ?? defaultQ)
      const voltage = isConnected ? U : (C > 0 ? charge / C : 0)
      const field = voltage / (d * 1e-3)

      return {
        quantities: [
          ...base,
          {
            label: '电容',
            symbol: 'C',
            value: C * 1e12,
            unit: 'pF',
            color: PHYSICS_COLORS.capacitor,
          },
          {
            label: '电荷量',
            symbol: 'Q',
            value: charge * 1e12,
            unit: 'pC',
            color: PHYSICS_COLORS.positiveCharge,
            highlight: !isConnected ? 'extreme' : undefined,
          },
          {
            label: '电势差',
            symbol: 'U',
            value: voltage,
            unit: 'V',
            color: PHYSICS_COLORS.electricPotential,
            highlight: isConnected ? 'extreme' : undefined,
          },
          {
            label: '板间场强',
            symbol: 'E',
            value: field,
            unit: 'V/m',
            color: PHYSICS_COLORS.electricField,
          },
        ],
        formulas: [
          {
            name: '电容定义式',
            latex: 'C = \\frac{Q}{U}',
            level: 'core',
            condition: '适用于一切电容器',
          },
          {
            name: '平行板电容决定式',
            latex: 'C = \\frac{\\varepsilon_r S}{4\\pi kd}',
            level: 'core',
            condition: '真空或介质中的平行金属板',
            note: 'ε₀ = 8.85×10⁻¹² F/m，k = 9×10⁹ N·m²/C²',
          },
          {
            name: '板间匀强电场强度',
            latex: 'E = \\frac{U}{d}',
            level: 'core',
            condition: '仅限板间匀强电场',
          },
        ],
        gaokaoPoints: [
          {
            text: '【电容器动态分析两大边界】连接电源时电压 U 保持恒定；断开电源时极板电量 Q 保持恒定。',
            importance: 'gaokao',
          },
          {
            text: '【断开电源拉大板距 d】由于 Q 恒定，电场强度 E = Q/(εS) 与 d 无关，板间场强 E 保持绝对恒定，但板间电压 U 随 d 增加而变大（静电计指针张开）。',
            importance: 'gaokao',
          },
          {
            text: '【插入电介质】相对介电常数 εᵣ 变大，电容 C 变大。若断开电源，则板间电压 U 下降（静电计指针张角收拢）。',
            importance: 'core',
          },
        ],
        warnings: [
          {
            text: '误区：误认为只要板间距 d 拉大，场强 E 就必定减小。注意在断开电源时，E 是恒定不变的。',
            level: 'danger',
          },
          {
            text: '提醒：公式中的 S 为两极板正对的有效面积。若极板发生错位，正对面积 S 减小，会导致电容 C 减小。',
            level: 'info',
          },
        ],
      }
    }
    case 'anim-field-lines': {
      const topology = params.topology ?? 2
      const qSource = params.qSource ?? 5
      // 电荷坐标必须与中屏同一套：中屏按 full 画布的中心摆放（cx=w/2, cy=h/2），
      // 探针电势又按"探针到各电荷的距离"计算。这里原先写死 350/240，
      // 与中屏的 420/325 差 (70, 85)，导致探针读数与图上取点位置对不上。
      const FIELD_LINES_W = CANVAS_PRESETS.full.width
      const FIELD_LINES_H = CANVAS_PRESETS.full.height
      const probeX = params.probeX ?? FIELD_LINES_W / 2
      const probeY = params.probeY ?? 150
      const probeStartX = params.probeStartX ?? FIELD_LINES_W / 2
      const probeStartY = params.probeStartY ?? 150

      const cx = FIELD_LINES_W / 2
      const cy = FIELD_LINES_H / 2
      const separation = 160

      interface ChargeConfig {
        x: number
        y: number
        q: number
      }
      let charges: ChargeConfig[] = []
      let topologyName = ''
      if (topology === 0) {
        charges = [{ x: cx, y: cy, q: qSource }]
        topologyName = '单正电荷'
      } else if (topology === 1) {
        charges = [{ x: cx, y: cy, q: -qSource }]
        topologyName = '单负电荷'
      } else if (topology === 2) {
        charges = [
          { x: cx - separation / 2, y: cy, q: qSource },
          { x: cx + separation / 2, y: cy, q: -qSource },
        ]
        topologyName = '等量异种电荷'
      } else {
        charges = [
          { x: cx - separation / 2, y: cy, q: qSource },
          { x: cx + separation / 2, y: cy, q: qSource },
        ]
        topologyName = '等量同种正电荷'
      }

      const getPotentialAt = (px: number, py: number) => {
        let v = 0
        const k = COULOMB_CONSTANT
        const mPerPx = 0.005
        for (const c of charges) {
          const dx = px - c.x
          const dy = py - c.y
          const rPx = Math.sqrt(dx * dx + dy * dy)
          const rM = Math.max(0.05, rPx * mPerPx)
          v += (k * c.q * 1e-6) / rM
        }
        return v
      }

      const phiCurrent = getPotentialAt(probeX, probeY)
      const phiStart = getPotentialAt(probeStartX, probeStartY)

      const qProbe = 1.0 * 1e-6
      const W_electric = qProbe * (phiStart - phiCurrent)

      return {
        quantities: [
          ...base,
          { label: '拓扑场景', value: topologyName, unit: '' },
          { label: '源电电量 Q', value: `${qSource.toFixed(1)}`, unit: 'μC', highlight: 'extreme' as const },
          { label: '当前点电势 φ', value: (phiCurrent / 1000).toFixed(2), unit: 'kV', highlight: 'positive' as const },
          { label: '电场力做功 W', value: W_electric.toFixed(4), unit: 'J', highlight: 'extreme' as const },
        ],
        formulas: [
          { name: '电势叠加原理', latex: '\\varphi = \\sum k \\frac{Q_i}{r_i}', level: 'core', condition: '点电荷电场的代数叠加' },
          { name: '电场力做功', latex: 'W_e = q(\\varphi_{start} - \\varphi_{current})', level: 'core' },
        ],
        gaokaoPoints: [
          { text: '电场线与等势面在空间任意位置绝对垂直；顺着电场线方向，电势降低最快。', importance: 'gaokao' as const },
          { text: '根据电场线与等势面的拓扑网格，定性分析粒子做曲线运动时的动能与电势能转化。', importance: 'gaokao' as const },
          { text: '等势面上各点的电势相等，但电场强度 E 的大小不一定相等（其大小取决于等势面的疏密）。', importance: 'core' as const },
        ],
        warnings: [
          { text: '易错点：误认为等势面上各点的场强 E 也一定相等。', level: 'warning' as const },
        ],
      }
    }
    case 'anim-electric-potential': {
      const phiA = params.phiA ?? 0
      const phiB = params.phiB ?? 0
      const qProbe = params.qProbe ?? 1.0
      const slopeK = params.slopeK ?? 0

      const U_AB = phiA - phiB
      const delta_Ep = (qProbe * 1e-6) * (phiB - phiA)

      return {
        quantities: [
          ...base,
          { label: 'A点电势 φ_A', value: phiA.toFixed(1), unit: 'V', color: PHYSICS_COLORS.electricPotential },
          { label: 'B点电势 φ_B', value: phiB.toFixed(1), unit: 'V', color: PHYSICS_COLORS.electricPotential },
          { label: '两点电势差 U_AB', value: U_AB.toFixed(1), unit: 'V', highlight: 'extreme' as const },
          { label: '电势能变化 ΔEp', value: delta_Ep.toExponential(4), unit: 'J', color: PHYSICS_COLORS.potentialEnergy, highlight: 'extreme' as const },
          { label: '图像切线斜率 |k|', value: slopeK.toFixed(1), unit: 'V/m', color: colors.accent[500], highlight: 'extreme' as const },
        ],
        formulas: [
          { name: '两点电势差', latex: 'U_{AB} = \\varphi_A - \\varphi_B', level: 'core' },
          { name: '电场力做功与电势能', latex: 'W_{AB} = q U_{AB} = E_{pA} - E_{pB} = -\\Delta E_p', level: 'core' },
          { name: '图像斜率与场强', latex: 'E = \\left|\\frac{d\\varphi}{dx}\\right|', level: 'core', condition: '沿位移方向' }
        ],
        gaokaoPoints: [
          { text: '【功与路径无关】电荷在非匀强电场中沿任意手绘扭曲路径从 A 移动到 B，电场力所做的功及电势能的变化量仅由起点和终点的位置决定，与路径的几何形态或长度完全无关。', importance: 'gaokao' as const },
          { text: '【φ-x 图像破题神技】φ-x 图像切线斜率的绝对值在物理上等于该处的电场强度大小 E = |dφ/dx|。斜率为零处场强为零；斜率越陡峭，表示该处场强越大。', importance: 'gaokao' as const },
          { text: '【电势高低判定】顺着电场线方向，电势逐步降低；逆着电场线方向，电势逐步升高。', importance: 'core' as const }
        ],
        warnings: [
          { text: '易错点：在计算负电荷做功与电势能变化时，极易忽略电量 q 的负号，导致做功的正负符号判定错误。请注意带入 q 符号进行代数计算。', level: 'danger' as const }
        ]
      }
    }
    case 'anim-charge-elementary': {
      const mode = params.mode ?? 0
      if (mode === 0) {
        const ch = calculateChargingProcess({
          method: params.method ?? 1,
          step: params.step ?? 0,
          qAInit: params.qAInit ?? 4,
          qBInit: params.qBInit ?? -2,
          inducerQ: params.inducerQ ?? 6,
          isGrounded: params.isGrounded ?? 0,
        })
        return {
          quantities: [
            ...base,
            { label: '物体 A 当前电量', symbol: 'q_A', value: `${ch.qA > 0 ? '+' : ''}${ch.qA.toFixed(1)}`, unit: 'nC', highlight: ch.qA > 0 ? 'positive' as const : ch.qA < 0 ? 'negative' as const : undefined },
            { label: '物体 B 当前电量', symbol: 'q_B', value: `${ch.qB > 0 ? '+' : ''}${ch.qB.toFixed(1)}`, unit: 'nC', highlight: ch.qB > 0 ? 'positive' as const : ch.qB < 0 ? 'negative' as const : undefined },
            { label: '系统总电量', symbol: 'Q_总', value: `${ch.qTotalAfter > 0 ? '+' : ''}${ch.qTotalAfter.toFixed(1)}`, unit: 'nC', highlight: 'extreme' as const },
            { label: '转移电荷量', symbol: '|Δq|', value: ch.deltaQ.toFixed(1), unit: 'nC' },
            { label: '转移电子数', symbol: 'N', value: `${ch.transferredElectronsIn1e10.toFixed(2)}×10¹⁰`, unit: '个' },
            { label: '验电器金箔张角', symbol: 'θ', value: ch.foilAngleDeg.toFixed(1), unit: '°' },
            { label: '元电荷常量', symbol: 'e', value: '1.60×10⁻¹⁹', unit: 'C' },
          ],
          formulas: [
            { name: '电荷守恒定律', latex: '\\sum q_{\\text{初}} = \\sum q_{\\text{末}}', level: 'core', condition: '与外界无电荷交换的孤立系统' },
            { name: '接触起电电荷均分', latex: "q_1' = q_2' = \\frac{q_1 + q_2}{2}", level: 'core', condition: '两个完全相同的金属球接触后再分开' },
            { name: '电荷量子化规律', latex: 'Q = N \\cdot e \\quad (e = 1.60\\times 10^{-19}\\;\\text{C})', level: 'core', condition: '任何带电体电荷量均为元电荷的整数倍' },
          ],
          gaokaoPoints: [
            { text: '三种起电方式（摩擦、接触、感应）均不是创造了电荷，本质都是电子从一个物体转移到另一个物体，或从物体一部分转移到另一部分。', importance: 'gaokao' as const },
            { text: '感应起电中靠近施感电荷的一端感应异号电荷，远离一端感应同号电荷；手触接地时永远引走远端电荷，断开接地再移走带电体后导体带与施感电荷相反的电性。', importance: 'gaokao' as const },
            { text: '元电荷 e = 1.60×10⁻¹⁹ C 是电荷量的最小单元数值（不是点电荷，也不是实物粒子），所有带电体所带电荷量均为 e 的整数倍。', importance: 'gaokao' as const },
          ],
        }
      } else {
        const m = calculateMillikanOilDrop({
          voltageU: params.voltageU ?? 490,
          plateGapMm: params.plateGapMm ?? 5,
          chargeMultipleN: params.chargeMultipleN ?? 2,
          dropMass1e15: params.dropMass1e15 ?? 3.2,
        })
        return {
          quantities: [
            ...base,
            { label: '板间匀强场强', symbol: 'E', value: (m.electricField / 1000).toFixed(1), unit: 'kV/m', color: PHYSICS_COLORS.electricField },
            { label: '所受电场力', symbol: 'F_e', value: m.electricForce.toExponential(2), unit: 'N', color: PHYSICS_COLORS.electricForce },
            { label: '所受重力', symbol: 'G', value: m.gravityForce.toExponential(2), unit: 'N', color: PHYSICS_COLORS.gravity },
            { label: '悬浮平衡电压', symbol: 'U_平', value: m.balanceVoltage.toFixed(1), unit: 'V', highlight: m.isBalanced ? 'positive' as const : 'extreme' as const },
            { label: '油滴带电量', symbol: 'q', value: `${m.chargeQIn1e19.toFixed(1)}×10⁻¹⁹`, unit: 'C', highlight: 'extreme' as const },
            { label: '元电荷整数倍', symbol: 'n', value: `${m.n}`, unit: '个' },
            { label: '油滴比荷', symbol: 'q/m', value: m.specificChargeDrop.toFixed(2), unit: 'C/kg' },
            { label: '电子比荷', symbol: 'e/m_e', value: m.specificChargeElectron.toExponential(2), unit: 'C/kg' },
          ],
          formulas: [
            { name: '油滴受力平衡', latex: 'q \\frac{U}{d} = mg \\implies q = \\frac{mgd}{U}', level: 'core', condition: '带电油滴在平行板间静止或匀速竖直运动' },
            { name: '电荷量子化与元电荷', latex: 'q = n e \\quad (n \\in \\mathbb{Z}^+)', level: 'core', condition: '密立根通过测量大量油滴电荷量的最大公约数求得 e' },
            { name: '比荷（荷质比）定义', latex: '\\text{比荷} = \\frac{q}{m}', level: 'core', condition: '电子比荷约为 1.76×10¹¹ C/kg（汤姆孙测定）' },
          ],
          gaokaoPoints: [
            { text: '密立根油滴实验首次精确测定了元电荷数值 e ≈ 1.60×10⁻¹⁹ C，并证实了电荷量是量子化的（只能取 e 的整数倍）。', importance: 'gaokao' as const },
            { text: '电子的比荷（e/m_e ≈ 1.76×10¹¹ C/kg）远大于氢离子（质子）的比荷（e/m_p ≈ 9.58×10⁷ C/kg），最早由汤姆孙通过阴极射线偏转实验测得。', importance: 'gaokao' as const },
            { text: '油滴平衡法解题关键：由 qU/d = mg 计算电荷量，注意区分质量 m、密度 ρ 与球体积 V = (4/3)πr³ 的换算关系。', importance: 'core' as const },
          ],
        }
      }
    }
    default:
      return null
  }
}
