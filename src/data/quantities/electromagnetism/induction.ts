import {
  calculateLenzsLaw,
  calculateCuttingEMF,
  computeRodStateAtTime,
  computeFaradayMagnetFlux,
  computeInductionMode0,
  computeInductionMode1,
  computeInductionMode2,
  computeDualRodsStateAtTime,
  evaluateLoopSegment,
  getSingleRodState,
} from '../../../physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { PhysicsPanelData, PhysicsQuantity } from '../types'

export function handleInduction(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[]
): PhysicsPanelData | null {
  switch (animId) {
    case 'anim-faraday-law': {
      const mode = params.mode ?? 0
      const N = params.N ?? 50
      const B_magnet = params.B ?? 1.2
      const magnetV = params.magnetV ?? 140
      const dBdt = params.dBdt ?? 0.5
      const B0 = -dBdt * 5
      const tNow = time % 10
      const COIL_AREA_M2 = 0.02

      let phi = 0
      let emf = 0
      let directionText = '无'

      if (mode === 0) {
        // 基础模式下的往返插值
        const range = 300 // MAGNET_MAX_X - MAGNET_MIN_X
        const cycle = 2 * range
        const dist = (magnetV * tNow) % cycle
        const goingForward = dist < range
        const x = goingForward ? 60 + dist : 360 - (dist - range)
        phi = computeFaradayMagnetFlux(x, B_magnet)

        // 数值微元导数
        const dt = 0.001
        const nextDist = (magnetV * (tNow + dt)) % cycle
        const nextGoingForward = nextDist < range
        const nextX = nextGoingForward ? 60 + nextDist : 360 - (nextDist - range)
        const nextPhi = computeFaradayMagnetFlux(nextX, B_magnet)
        const dPhi_dt = (nextPhi - phi) / dt
        emf = -N * dPhi_dt
      } else {
        // 进阶模式下的解析值
        phi = (B0 + dBdt * tNow) * COIL_AREA_M2
        emf = -N * dBdt * COIL_AREA_M2
      }

      if (emf > 0.001) {
        directionText = '正向 (顺时针)'
      } else if (emf < -0.001) {
        directionText = '反向 (逆时针)'
      } else {
        directionText = '无'
      }

      const dPhi_dt_val = -emf / N

      return {
        quantities: [
          ...base,
          {
            label: '磁通量变化率 dΦ/dt',
            symbol: '\\frac{\\Delta\\Phi}{\\Delta t}',
            value: dPhi_dt_val,
            unit: 'Wb/s',
            highlight: Math.abs(dPhi_dt_val) > 1e-5 ? 'extreme' as const : 'zero' as const
          },
          {
            label: '感应电动势 E',
            symbol: 'E',
            value: Math.abs(emf),
            unit: 'V',
            color: PHYSICS_COLORS.emf,
            highlight: Math.abs(emf) > 1e-4 ? 'extreme' as const : 'zero' as const
          },
          {
            label: '感应电动势方向',
            value: directionText,
            unit: '',
            highlight: emf > 0.001 ? 'positive' as const : (emf < -0.001 ? 'negative' as const : undefined)
          },
        ],
        formulas: [
          {
            name: '法拉第电磁感应定律',
            latex: 'E = n \\frac{\\Delta\\Phi}{\\Delta t}',
            level: 'core',
            condition: '电路中产生感应电动势的普适定律',
          },
          {
            name: '匀变磁场电动势式',
            latex: 'E = n S \\frac{\\Delta B}{\\Delta t}',
            level: 'core',
            condition: '适用于回路面积恒定且磁场匀速变化的场景',
          },
        ],
        gaokaoPoints: [
          {
            text: '【法拉第定律定量计算】感应电动势的大小由磁通量变化率 dΦ/dt 和线圈匝数 n 共同决定。高考常与闭合电路欧姆定律联立考查通过电荷量 q = n·ΔΦ / R_总。',
            importance: 'gaokao',
          },
          {
            text: '【易错点：混淆值与变化率】磁通量最大时，其变化率可能为 0（如条形磁铁到达线圈中心瞬间，Φ 最大，但 ΔΦ/Δt = 0，感应电动势 E = 0）。',
            importance: 'gaokao',
          },
          {
            text: '【方向与斜率关系】感应电动势的方向由磁通量的变化趋势决定。在 Φ-t 图像中，斜率为正和斜率为负代表的变化趋势相反，其感应电动势方向相反。',
            importance: 'core',
          },
        ],
        warnings: [
          {
            text: '方向易错防坑：感应电动势的方向并不是由磁通量的正负值决定，而是由磁通量随时间的导数（即变化率）的符号与楞次定律决定的！',
            level: 'warning',
          },
        ],
        mnemonic: '大不一定快，快不一定大；斜率定电动势，阻碍定方向',
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
        formulas: [
          {
            name: '法拉第电磁感应定律',
            latex: 'E = n \\frac{\\Delta \\Phi}{\\Delta t}',
            level: 'core',
            note: '感应电动势大小由磁通量变化率决定',
          },
          {
            name: '闭合电路欧姆定律',
            latex: 'I = \\frac{E}{R}',
            level: 'important',
            note: '感应电流与感应电动势成正比',
          },
        ],
        gaokaoPoints: [
          {
            text: '利用“增反减同”规律判断感应电流的磁场方向',
            importance: 'gaokao',
          },
          {
            text: '使用右手定则/安培定则判定感应电流的绕行方向',
            importance: 'gaokao',
          },
          {
            text: '理解“来拒去留”在电磁感应力学效果中的具体表现',
            importance: 'core',
          },
        ],
        warnings: [
          {
            text: '感应磁场并非总与原磁场方向相反。原磁通量减少时，两者方向相同。阻碍的是“变化”，而非阻碍“原磁场本身”。',
            level: 'warning',
          },
        ],
        mnemonic: '增反减同，来拒去留；增缩减扩，力图阻碍。',
      }
    }
    case 'anim-cutting-emf': {
      // 导体切割磁感线：仅展示因变量，彻底禁绝自变量 B, L, R, m, F_ext
      const B = params.B ?? 1.5
      const absB = Math.abs(B)
      // 磁场方向由 B 的符号决定：B > 0 → 向里 ⊗ (B_out=0)；B < 0 → 向外 ⊙ (B_out=1)
      const B_out = B < 0 ? 1 : 0
      const L = params.L ?? 1.0
      const R = params.R ?? 2.0
      const m = params.m ?? 0.2
      const F_ext = params.F_ext ?? 2.0
      const mode = params.mode ?? 0 // 0=基础: 恒速, 1=进阶: 自由释放
      const showForceAnalysis = params.showForceAnalysis ?? 1

      let v = 0
      let a = 0
      let F_amp = 0
      let P_heat = 0
      let EMF = 0
      let I = 0

      if (mode === 0) {
        // 基础模式：恒速切割，速度 v 是参数，加速度 a 为 0
        v = params.v ?? 2.0
        a = 0
        const res = calculateCuttingEMF(absB, L, v, R, 90, 0, B_out)
        EMF = res.EMF
        I = res.I
        F_amp = res.F_ampere
        P_heat = F_amp * Math.abs(v)
      } else {
        // 进阶模式：自由释放，采用解析解计算
        const res = computeRodStateAtTime(time, absB, L, R, m, F_ext)
        v = res.v
        a = res.a
        F_amp = res.F_amp
        P_heat = res.P_heat
        const dirFactor = B_out === 0 ? 1 : -1
        EMF = absB * L * v * dirFactor
        I = R > 0 ? EMF / R : 0
      }

      const quantities = [
        ...base,
        { label: '感应电动势 E', value: Math.abs(EMF).toFixed(3), unit: 'V', color: PHYSICS_COLORS.emf },
        { label: '感应电流 I', value: Math.abs(I).toFixed(3), unit: 'A', color: PHYSICS_COLORS.electricCurrent },
        { label: '瞬时安培力 F_安', symbol: 'F_{安}', value: F_amp.toFixed(3), unit: 'N', color: PHYSICS_COLORS.lorentzForce, highlight: 'extreme' as const },
        { label: '回路发热功率 P_热', symbol: 'P_{热}', value: P_heat.toFixed(3), unit: 'W', color: PHYSICS_COLORS.heatLoss },
      ]

      if (mode === 1 || showForceAnalysis === 1) {
        quantities.push({
          label: '瞬时加速度 a',
          symbol: 'a',
          value: a.toFixed(3),
          unit: 'm/s²',
          color: PHYSICS_COLORS.acceleration,
          highlight: 'extreme' as const,
        })
      }

      return {
        quantities,
        formulas: [
          { name: '法拉第电磁感应', latex: 'E = BLv', level: 'core' },
          { name: '瞬时安培力', latex: 'F_{安} = \\frac{B^2 L^2 v}{R}', level: 'core' },
          { name: '单棒动力学加速度', latex: 'a = \\frac{F_{外} - F_{安}}{m}', level: 'core', condition: '自由释放模式下' },
        ],
        gaokaoPoints: [
          { text: '电磁感应中的单棒动力学平衡与能量转化：随着速度增加，电动势与安培力增大，合力和加速度逐渐减小。', importance: 'gaokao' },
          { text: '动态分析链条：v↑ ⇒ E↑ ⇒ F_安↑ ⇒ a↓。当 a=0 时，达到收尾速度 v_m。此时外力做功功率等于电路电热功率（P_外 = P_热）。', importance: 'gaokao' },
        ],
        warnings: [
          { text: '易错点：不知道安培力随速度动态变化，错误地将此过程当成匀变速运动去套公式。', level: 'danger' },
          { text: '模型说明：本节默认导轨光滑、磁场匀强、回路总电阻恒定，并忽略自感效应。', level: 'info' },
        ],
        mnemonic: '安培力阻碍相对运动，速度大则阻力大，最终合力为零达收尾',
      }
    }
    case 'anim-electromagnetic-induction': {
      const mode = params.mode ?? 0 // 0=切割, 1=穿过, 2=双线圈
      const coilX = 420

      if (mode === 0) {
        // ── 模式一：导体切割磁感线 ──
        const rodX = params.rodX ?? 200
        const rodSpeed = params.rodSpeed ?? 0
        const { phi, dPhi, currentI } = computeInductionMode0(rodX, rodSpeed, 1)
        const theta = Math.max(-1, Math.min(1, currentI * 1.5))

        let currentDirectionText = '无感应电流'
        if (Math.abs(theta) > 0.05) {
          currentDirectionText = theta > 0 ? '向右偏转 (+)' : '向左偏转 (-)'
        }

        return {
          quantities: [
            ...base,
            { label: '导体棒位置 x', value: rodX.toFixed(0), unit: 'px' },
            { label: '导体棒速度 v', value: rodSpeed.toFixed(1), unit: 'px/s', color: PHYSICS_COLORS.velocity },
            { label: '回路磁通量 Φ', value: phi.toFixed(3), unit: 'Wb', color: PHYSICS_COLORS.magneticField },
            { label: '磁通量变化率 dΦ/dt', value: dPhi.toFixed(3), unit: 'Wb/s', color: PHYSICS_COLORS.magneticField, highlight: Math.abs(dPhi) > 0.002 ? 'extreme' : 'zero' },
            { label: '电流计指针偏转', value: currentDirectionText, unit: '', color: PHYSICS_COLORS.kineticEnergy, highlight: Math.abs(theta) > 0.05 ? 'extreme' : 'zero' },
          ],
          formulas: [
            { name: '法拉第电磁感应定律 (动生)', latex: 'E = BLv', level: 'core' },
            { name: '闭合电路欧姆定律', latex: 'I = \\frac{E}{R}', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '导体切割磁感线是产生感应电动势的经典动生形式，电动势大小由 E=BLv 决定。', importance: 'gaokao' },
            { text: '感应回路中是否产生感应电流，除了要有感应电动势之外，还必须使回路处于闭合状态。', importance: 'gaokao' },
          ],
          warnings: [
            { text: '易错防坑：若感应回路断开（如副开关断开），即使金属棒高速切割，也只产生电动势而无电流，电流计指针不会偏转。', level: 'danger' }
          ],
        }
      } else if (mode === 1) {
        // ── 模式二：磁铁穿过线圈 ──
        const magnetX = params.magnetX ?? 160
        const magnetSpeed = params.magnetSpeed ?? 0
        const magnetPole = params.magnetPole ?? 1
        const { phi, dPhi, currentI } = computeInductionMode1(magnetX, magnetSpeed, magnetPole, coilX, 1)
        const theta = Math.max(-1, Math.min(1, currentI * 1.5))

        let currentDirectionText = '无感应电流'
        if (Math.abs(theta) > 0.05) {
          currentDirectionText = theta > 0 ? '向右偏转 (+)' : '向左偏转 (-)'
        }

        return {
          quantities: [
            ...base,
            { label: '磁铁位置 x', value: magnetX.toFixed(0), unit: 'px' },
            { label: '磁铁速度 v', value: magnetSpeed.toFixed(1), unit: 'px/s', color: PHYSICS_COLORS.velocity },
            { label: '穿过线圈磁通量 Φ', value: phi.toFixed(3), unit: 'Wb', color: PHYSICS_COLORS.magneticField },
            { label: '磁通量变化率 dΦ/dt', value: dPhi.toFixed(3), unit: 'Wb/s', color: PHYSICS_COLORS.magneticField, highlight: Math.abs(dPhi) > 0.002 ? 'extreme' : 'zero' },
            { label: '电流计指针偏转', value: currentDirectionText, unit: '', color: PHYSICS_COLORS.kineticEnergy, highlight: Math.abs(theta) > 0.05 ? 'extreme' : 'zero' },
          ],
          formulas: [
            { name: '磁通量变化量定义', latex: '\\Delta\\Phi = \\Phi_{末} - \\Phi_{初}', level: 'core' },
            { name: '法拉第电磁感应定律', latex: 'E = N \\frac{\\Delta\\Phi}{\\Delta t}', level: 'core', condition: '计算平均感应电动势' },
          ],
          gaokaoPoints: [
            { text: '闭合回路内磁通量发生变化（ΔΦ ≠ 0）是产生感应电流的充要条件。', importance: 'gaokao' },
            { text: '磁通量变化率 dΦ/dt 决定了感应电动势的大小，即决定了电流计指针偏转的幅度。', importance: 'core' },
          ],
          warnings: [
            { text: '易错防坑：误认为有磁通量 Φ 就有感应电流。记住，磁铁静止在线圈中时，虽然 Φ 达到最大，但 ΔΦ = 0，此时感应电流为零，指针不偏转！', level: 'danger' }
          ],
        }
      } else {
        // ── 模式三：双线圈互感 ──
        const primaryCoilX = params.primaryCoilX ?? 220
        const primaryCoilSpeed = params.primaryCoilSpeed ?? 0
        const resistance = params.resistance ?? 50
        const dR_dt = params.dR_dt ?? 0
        const circuitSwitch = params.circuitSwitch ?? 1
        const hasIronCore = params.hasIronCore ?? 1
        const { phi, dPhi, currentI } = computeInductionMode2(
          primaryCoilX, resistance, circuitSwitch, hasIronCore,
          primaryCoilSpeed, dR_dt, 0, coilX, 1
        )
        const effectiveR = circuitSwitch ? resistance : 99999
        const I1 = circuitSwitch ? 10 / effectiveR : 0
        const theta = Math.max(-1, Math.min(1, currentI * 1.5))

        let currentDirectionText = '无感应电流'
        if (Math.abs(theta) > 0.05) {
          currentDirectionText = theta > 0 ? '向右偏转 (+)' : '向左偏转 (-)'
        }

        return {
          quantities: [
            ...base,
            { label: '原线圈电流 I₁', value: I1.toFixed(2), unit: 'A', color: PHYSICS_COLORS.electricCurrent },
            { label: '穿过副线圈磁通量 Φ', value: phi.toFixed(3), unit: 'Wb', color: PHYSICS_COLORS.magneticField },
            { label: '磁通量变化率 dΦ/dt', value: dPhi.toFixed(3), unit: 'Wb/s', color: PHYSICS_COLORS.magneticField, highlight: Math.abs(dPhi) > 0.002 ? 'extreme' : 'zero' },
            { label: '电流计指针偏转', value: currentDirectionText, unit: '', color: PHYSICS_COLORS.kineticEnergy, highlight: Math.abs(theta) > 0.05 ? 'extreme' : 'zero' },
          ],
          formulas: [
            { name: '互感磁通量关系', latex: '\\Phi = M I_1', level: 'core', condition: 'M为互感系数' },
            { name: '法拉第电磁感应定律', latex: 'E = -N \\frac{d\\Phi}{dt}', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '双线圈互感：原回路中电阻变化或位置移动导致原线圈磁场变化，从而在副线圈中产生感应电流。', importance: 'gaokao' },
            { text: '只要变阻器停止拖动且原线圈静止，由于电流恒定，磁通量变化率为零，副线圈就没有感应电流。', importance: 'gaokao' },
          ],
          warnings: [
            { text: '易错防坑：在变阻器滑动过程中，电阻变化（dR/dt）决定了电流的变化速度，进而决定了副线圈中的磁通量变化率和电流强弱。', level: 'warning' }
          ],
        }
      }
    }
    case 'anim-induction-single-rod': {
      const mode = (params.startMechanism ?? 0) === 0 ? 'constantForce' : 'initialVelocity'
      const state = getSingleRodState({
        mode,
        driveForce: params.driveForce ?? 1.2,
        initialVelocity: params.initialVelocity ?? 5,
        magneticB: params.magneticB ?? 1.2,
        railSpacing: params.railSpacing ?? 0.8,
        resistance: params.resistance ?? 1.5,
        rodMass: params.rodMass ?? 0.2,
      }, time)

      return {
        quantities: [
          ...base,
          // v, I, F_A, q 已在动画中以矢量箭头/柱状图视觉呈现，此处只保留不可见的量
          { label: '感应电动势 E', value: state.emf.toFixed(2), unit: 'V', color: PHYSICS_COLORS.emf },
          { label: '焦耳热 Q', value: state.jouleHeat.toFixed(2), unit: 'J', color: PHYSICS_COLORS.heatLoss },
          ...(mode === 'constantForce'
            ? [{ label: '收尾速度 v_m', value: state.terminalVelocity.toFixed(2), unit: 'm/s', color: PHYSICS_COLORS.velocity }]
            : []),
        ],
        formulas: [
          { name: '动生电动势', latex: 'E = BLv', level: 'core' },
          { name: '感应电流', latex: 'I = \\frac{E}{R}', level: 'core' },
          { name: '安培力阻尼', latex: 'F_A = BIL = \\frac{B^2L^2v}{R}', level: 'core' },
          ...(mode === 'constantForce'
            ? [
                { name: '单杆动力学', latex: 'F - \\frac{B^2L^2v}{R} = ma', level: 'core' as const },
                { name: '收尾速度', latex: 'v_m = \\frac{FR}{B^2L^2}', level: 'important' as const },
              ]
            : [
                { name: '电磁阻尼释放', latex: '-\\frac{B^2L^2v}{R} = ma', level: 'core' as const },
                { name: '速度衰减', latex: 'v(t)=v_0 e^{-kt/m},\\quad k=\\frac{B^2L^2}{R}', level: 'important' as const },
              ]),
          { name: '电荷量秒杀式', latex: 'q = \\frac{m\\Delta v}{BL}', level: 'important', condition: '由 -BLq = \\Delta p 得出' },
        ],
        gaokaoPoints: [
          { text: '动态链条：v 变化 ⇒ E=BLv 变化 ⇒ I=E/R 变化 ⇒ F_A=BIL 变化。', importance: 'gaokao' },
          { text: '单杆收尾不是匀变速。恒力启动抓 v_m，初速度释放抓指数衰减。', importance: 'gaokao' },
          { text: '求电荷量常用动量定理 q=mΔv/(BL)，不必先求完整时间函数。', importance: 'hard' },
        ],
        warnings: [
          { text: '易错点：安培力随速度改变，不能套匀加速直线运动公式。', level: 'danger' },
          { text: '模型默认导轨光滑、磁场匀强、回路总电阻恒定，忽略自感。', level: 'info' },
        ],
        mnemonic: '速度生电，电流生力；力阻速度，恒力收尾。',
      }
    }
    case 'anim-induction-dual-rods': {
      const scenario = params.scenario ?? 0 // 0=自由双杆, 1=恒力驱动
      const mA = params.massA ?? 0.2
      const mB = params.massB ?? 0.4
      const B = params.fieldB ?? 1.0
      const L = params.railL ?? 0.5
      const R = params.resSum ?? 1.0
      const v0 = params.initialV0 ?? 6.0
      const F_ext = params.appliedForce ?? 2.0

      const state = computeDualRodsStateAtTime(time, scenario, v0, F_ext, B, L, R, mA, mB)

      const quantities = [
        ...base,
        { label: 'a 棒速度 v_a', symbol: 'v_a', value: state.vA.toFixed(2), unit: 'm/s', color: PHYSICS_COLORS.velocity },
        { label: 'b 棒速度 v_b', symbol: 'v_b', value: state.vB.toFixed(2), unit: 'm/s', color: PHYSICS_COLORS.velocity },
        { label: '瞬时速度差 Δv', symbol: '\\Delta v', value: Math.abs(state.deltaV).toFixed(2), unit: 'm/s', color: PHYSICS_COLORS.velocity },
        { label: '回路感应电动势 E', symbol: 'E_{\\text{合}}', value: Math.abs(state.emf).toFixed(2), unit: 'V', color: PHYSICS_COLORS.emf },
        { label: '回路感应电流 I', symbol: 'I', value: Math.abs(state.currentI).toFixed(2), unit: 'A', color: PHYSICS_COLORS.electricCurrent },
        { label: '相互安培力 F_安', symbol: 'F_{\\text{安}}', value: state.forceAmpere.toFixed(2), unit: 'N', color: PHYSICS_COLORS.lorentzForce, highlight: 'extreme' as const },
        { label: '系统总动量 P_总', symbol: 'P_{\\text{总}}', value: state.totalMomentum.toFixed(2), unit: 'kg·m/s', color: PHYSICS_COLORS.momentum },
      ]

      if (scenario === 0) {
        return {
          quantities,
          formulas: [
            { name: '差分反电动势', latex: 'E_{\\text{合}} = BL(v_a - v_b)', level: 'core' },
            { name: '回路感应电流', latex: 'I = \\frac{BL(v_a - v_b)}{R_a + R_b}', level: 'core' },
            { name: '系统动量守恒铁律', latex: 'm_a v_0 = (m_a + m_b) v_{\\text{共}}', level: 'core', condition: '外力之和为零' },
          ],
          gaokaoPoints: [
            { text: '自由双杆动量守恒：两棒所受的安培力等大反向，系统合外力为零，无论两棒质量或电阻大小，系统动量恒定。', importance: 'gaokao' },
            { text: '速度收敛与能量耗散：由于速度差 Δv 衰减，安培力减弱，两棒最终共同收尾于同一速度 v_共，动能损失转化为焦耳热。', importance: 'gaokao' },
          ],
          warnings: [
            { text: '易错防坑：安培力随相对速度衰减而指数递减，两棒均做变加速运动，切记不可套用匀加速直线运动公式！', level: 'danger' },
          ],
          mnemonic: '安培力为一对系统内力；自由运动共速收尾，动量严格守恒。',
        }
      } else {
        const deltaVInf = (F_ext * R * mB) / (B * B * L * L * (mA + mB))
        return {
          quantities: [
            ...quantities,
            { label: '稳定收尾速度差 Δv_∞', symbol: '\\Delta v_\\infty', value: deltaVInf.toFixed(2), unit: 'm/s', color: PHYSICS_COLORS.velocity },
            { label: '稳定质心加速度 a_共', symbol: 'a_{\\text{共}}', value: state.aCommon.toFixed(2), unit: 'm/s²', color: PHYSICS_COLORS.acceleration },
          ],
          formulas: [
            { name: '动力学耦合关系', latex: 'm_a a_a = F - F_{\\text{安}}, \\quad m_b a_b = F_{\\text{安}}', level: 'core' },
            { name: '稳定收尾等加速度', latex: 'a_a = a_b = a_{\\text{共}} = \\frac{F}{m_a + m_b}', level: 'core' },
            { name: '恒定死锁速度差', latex: '\\Delta v_\\infty = \\frac{F(R_a+R_b)m_b}{B^2 L^2 (m_a+m_b)}', level: 'derived' },
          ],
          gaokaoPoints: [
            { text: '等加恒差死锁警告：当外恒力作用在 a 棒时，两棒最终不会共速！而是收尾于加速度完全相等、维持恒定速度差的加速状态。', importance: 'gaokao' },
            { text: '解题突破口：将两棒视为整体得 a_共 = F/(mA+mB)，隔离无外力的 b 棒得安培力 F_安 = mB * a_共，再由 F_安 = B^2 L^2 Δv / R 求解 Δv！', importance: 'gaokao' },
          ],
          warnings: [
            { text: '易错警示：切勿想当然认为拉动两棒最终都会速度完全相同！外力驱动下必有恒定速度差才会有安培力给另一棒产生相同的加速度。', level: 'danger' },
          ],
          mnemonic: '恒力拉动不共速，稳定等加速度恒速度差；整体隔离求加速度和力。',
        }
      }
    }
    case 'anim-induction-loop-field': {
      const dimensionPreset = params.dimensionPreset ?? 0
      let loopWidth = params.loopWidth ?? 4.0
      let fieldWidth = params.fieldWidth ?? 8.0
      const constantSpeed = params.constantSpeed ?? 1.0
      const magneticB = params.magneticB ?? 1.0

      // 与 useLoopPassFieldPhysics 同步：根据 dimensionPreset 适配 d/D
      if (dimensionPreset === 0 && loopWidth >= fieldWidth) {
        loopWidth = 4.0
        fieldWidth = 8.0
      } else if (dimensionPreset === 1 && loopWidth <= fieldWidth) {
        loopWidth = 8.0
        fieldWidth = 4.0
      }

      const d = loopWidth / 100
      const D = fieldWidth / 100
      const v_real = Math.max(0.1, constantSpeed)
      const v_anim = v_real / 50
      const B = magneticB
      const L = 0.05
      const R = 0.5

      const xMin = -0.02
      const xMax = D + d + 0.02
      const totalDist = xMax - xMin
      const T_max = totalDist / v_anim
      const frontX = xMin + v_anim * (time % T_max)

      const res = evaluateLoopSegment(frontX, d, D, B, L, R, v_real)
      
      const isNarrow = d <= D
      let stateText = '进场前'
      let activeNote = ''
      if (res.state === 'ENTERING') {
        stateText = '前边切割进场'
        activeNote = isNarrow ? `0 ≤ x < ${loopWidth.toFixed(0)}cm (前边切割，电流逆时针)` : `0 ≤ x < ${fieldWidth.toFixed(0)}cm (前边切割，电流逆时针)`
      } else if (res.state === 'TOTALLY_IN') {
        stateText = isNarrow ? '完全处于磁场内' : '磁场完全包围在线框内'
        activeNote = isNarrow ? `${loopWidth.toFixed(0)}cm ≤ x < ${fieldWidth.toFixed(0)}cm (双边切割电动势抵消，I=0)` : `${fieldWidth.toFixed(0)}cm ≤ x < ${loopWidth.toFixed(0)}cm (无切割，I=0)`
      } else if (res.state === 'LEAVING') {
        stateText = '后边切割出场'
        activeNote = isNarrow ? `${fieldWidth.toFixed(0)}cm ≤ x < ${(fieldWidth + loopWidth).toFixed(0)}cm (后边切割，电流顺时针)` : `${loopWidth.toFixed(0)}cm ≤ x < ${(fieldWidth + loopWidth).toFixed(0)}cm (后边切割，电流顺时针)`
      } else if (res.state === 'AFTER') {
        stateText = '已穿出离场'
        activeNote = `x ≥ ${(fieldWidth + loopWidth).toFixed(0)}cm (无切割，I=0)`
      }

      const qMax = isNarrow ? (B * L * d) / R : (B * L * D) / R

      return {
        quantities: [
          ...base,
          { label: '线框前端位移 x', symbol: 'x', value: (frontX * 100).toFixed(1), unit: 'cm' },
          { label: '穿场运动状态', symbol: 'S', value: stateText, unit: '', color: PHYSICS_COLORS.velocity },
          { label: '瞬时磁通量 Φ', symbol: '\\Phi', value: res.phi.toFixed(4), unit: 'Wb', color: PHYSICS_COLORS.magneticField },
          { label: '感应电流 I', symbol: 'I', value: res.currentI.toFixed(3), unit: 'A', color: PHYSICS_COLORS.electricCurrent, highlight: Math.abs(res.currentI) > 0 ? 'extreme' : 'zero' },
          { label: '阻碍安培力 F_A', symbol: 'F_A', value: res.forceAmpere.toFixed(3), unit: 'N', color: PHYSICS_COLORS.lorentzForce, highlight: res.forceAmpere > 0 ? 'extreme' : 'zero' },
          { label: '焦耳发热功率 P', symbol: 'P_{\\text{热}}', value: res.powerHeat.toFixed(3), unit: 'W', color: PHYSICS_COLORS.heatLoss },
        ],
        formulas: [
          {
            name: isNarrow ? '分段磁通量函数 (窄线框 d ≤ D)' : '分段磁通量函数 (宽线框 d > D)',
            latex: isNarrow
              ? '\\Phi(x) = \\begin{cases} BLx & (0 \\le x < d) \\\\ BLd & (d \\le x < D) \\\\ BL(D+d-x) & (D \\le x \\le D+d) \\end{cases}'
              : '\\Phi(x) = \\begin{cases} BLx & (0 \\le x < D) \\\\ BLD & (D \\le x < d) \\\\ BL(D+d-x) & (d \\le x \\le D+d) \\end{cases}',
            level: 'core',
            note: res.state !== 'BEFORE' && res.state !== 'AFTER' ? `当前激活区间: ${activeNote}` : undefined
          },
          {
            name: '切割电动势与欧姆定律',
            latex: 'E = BLv, \\quad I = \\frac{E}{R} = \\frac{BLv}{R}',
            level: 'core',
            note: (res.state === 'ENTERING' || res.state === 'LEAVING') ? '【当前生效】单竖边切割磁感线，产生感应电流' : '【当前抵消/无切割】回路总电动势为零'
          },
          {
            name: '安培力公式',
            latex: 'F_A = BIL = \\frac{B^2L^2v}{R}',
            level: 'important',
            note: (res.state === 'ENTERING' || res.state === 'LEAVING') ? '【当前生效】安培力方向水平向左，阻碍线框相对运动' : '【当前无电流】不受安培力'
          },
          {
            name: '过线关键临界坐标',
            latex: isNarrow
              ? 'x_1 = 0, \\ x_2 = d, \\ x_3 = D, \\ x_4 = D+d'
              : 'x_1 = 0, \\ x_2 = D, \\ x_3 = d, \\ x_4 = D+d',
            level: 'derived'
          },
          {
            name: '单阶段通过电量 (高考高频)',
            latex: `q = \\frac{\\Delta \\Phi}{R} = ${isNarrow ? '\\frac{BLd}{R}' : '\\frac{BLD}{R}'} = ${qMax.toFixed(4)}\\text{ C}`,
            level: 'derived',
            note: isNarrow ? '窄线框单次进/出电量仅由线框宽 d 决定' : '宽线框单次进/出电量仅由磁场宽 D 决定（易错点！）'
          }
        ],
        gaokaoPoints: [
          { text: '一法拉第二欧姆三牛顿：高考大题万能解题步法！先求 E = BLv，再算 I = E/R，最后由受力分析（安培力 F_A = BIL）和能量守恒定律（W_外 = Q_焦耳热）解题！', importance: 'gaokao' },
          { text: '四点过线时空状态机：线框波形图折转必定对应 x₁=0, x₂=d, x₃=D, x₄=D+d 四个临界坐标点！波形选择题只需代入这四个边界点即可秒杀！', importance: 'gaokao' },
          { text: '零电流平台成因：窄线框完全处于磁场内部 (d ≤ x < D) 或宽线框完全包围磁场 (D ≤ x < d) 时，回路没有磁通量变化，或两侧竖边切割电动势相互抵消，无感应电流和安培力！', importance: 'core' },
        ],
        warnings: [
          { text: '避坑提示：拉力做功只在进场阶段 (0 ≤ x < d) 和出场阶段 (D ≤ x < D+d) 才等于焦耳热，因为只有在这两阶段才有安培阻力做负功！全在场内时无安培力，拉力不做功（或做功为零）。', level: 'danger' },
          { text: '电量易错点：计算通过截面电荷量 q = ΔΦ/R 时，切不可直接代入线框总面积！窄线框进场 ΔΦ = BLd，宽线框进场 ΔΦ = BLD，注意区分公式中的特征长度！', level: 'warning' }
        ],
        mnemonic: '进出磁场受阻力，电流反向产焦热；完全进入无电动势，匀速穿场零阻力。',
      }
    }
    default:
      return null
  }
}
