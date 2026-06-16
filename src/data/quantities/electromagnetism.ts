/**
 * 电磁学动画物理量看板数据构建。
 */
import {
  calculateCoulombForce,
  calculateElectricField,
  calculateCapacitor,
  calculateOhmLaw,
  calculateClosedCircuit,
  calculateLenzsLaw,
  calculateCuttingEMF,
  calculateACRMS,
  calculateTransformerWithLoad,
  calculatePowerTransmission,
  calculateChargeInEFieldTrajectory,
  getChargeInEFieldTimeScale,
  solveBasicAmpere,
  solveAdvancedAmpere,
  calculateMagnetInduction,
  calculateCoilInduction,
  computeFaradayMagnetFlux,
} from '../../physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import type { PhysicsPanelData, PhysicsQuantity } from './types'

const COULOMB_K = 9e9
const VACUUM_PERMITTIVITY = 8.85e-12

export function buildElectromagnetismQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  const base: PhysicsQuantity[] = []

  switch (animId) {
    case 'anim-coulomb-law': {
      const q1 = params.q1 ?? 2
      const q2 = params.q2 ?? -3
      const r = params.r ?? 4
      const mode = params.mode ?? 0
      const attractive = q1 * q2 < 0
      const k = 9e9
      const q1SI = Math.abs(q1 * 1e-6)
      const q2SI = Math.abs(q2 * 1e-6)

      if (mode === 0) {
        // ── 基础模式：两点电荷 ──
        const rSI = (r || 0.01) * 0.01
        const { F } = calculateCoulombForce(k, q1SI, q2SI, rSI)
        return {
          quantities: [
            ...base,
            { label: 'q₁', value: `${q1 > 0 ? '+' : ''}${q1.toFixed(1)}`, unit: 'μC', highlight: q1 > 0 ? 'positive' as const : 'negative' as const },
            { label: 'q₂', value: `${q2 > 0 ? '+' : ''}${q2.toFixed(1)}`, unit: 'μC', highlight: q2 > 0 ? 'positive' as const : 'negative' as const },
            { label: '间距 r', value: r.toFixed(1), unit: 'cm' },
            { label: '库仑力 F', value: F.toExponential(2), unit: 'N', highlight: 'extreme' as const },
            { label: '作用类型', value: attractive ? '相互吸引' : '相互排斥', unit: '', highlight: attractive ? 'negative' as const : 'positive' as const },
          ],
          formulas: [
            { name: '库仑定律', latex: 'F = k \\frac{q_1 q_2}{r^2}', level: 'core', condition: '仅适用于点电荷与真空' },
            { name: '静电力常量', latex: 'k = 9 \\times 10^9 \\;\\text{N·m}^2\\text{/C}^2', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '库仑定律仅适用于点电荷与真空（或空气近似）。', importance: 'gaokao' as const },
            { text: '库仑力与万有引力具有相似形式（都与距离平方成反比），但本质不同。', importance: 'core' as const },
            { text: '同号电荷相斥，异号电荷相吸——方向由符号决定。', importance: 'basic' as const },
          ],
        }
      } else {
        // ── 进阶模式：三个点电荷平衡 ──
        const q3 = params.q3 ?? 1
        // 注：实际位置由动画组件管理，此处仅显示电荷量信息
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
      const qTest = params.qTest ?? 1.0 // μC
      const rTest = params.rTest ?? 3.0 // cm
      const rSI = (rTest || 0.01) * 0.01

      if (mode === 0) {
        // ── 基础模式：单电荷 ──
        const q = params.q ?? 5.0 // μC
        const qSI = q * 1e-6
        const qTestSI = qTest * 1e-6

        const { E } = calculateElectricField(COULOMB_K, Math.abs(qSI), rSI)
        const F = Math.abs(qTestSI * E) // 力的大小

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
        // ── 进阶模式：等量双电荷场强叠加 ──
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

        // 计算水平连线上（以中点为原点，位置为 rTest cm）的合场强与力
        // 设两电荷间距为 10.5 cm (由 cx1=22%, cx2=52% 得出真实比例约为 10.5cm)
        const d_half = 5.25 * 0.01 // 5.25 cm to m
        const xp = rTest * 0.01 // P 点 x 坐标 m
        
        const r1 = Math.abs(xp + d_half) // 到左电荷的距离
        const r2 = Math.abs(xp - d_half) // 到右电荷的距离

        const E1 = calculateElectricField(COULOMB_K, Math.abs(q1 * 1e-6), Math.max(0.005, r1)).E * (q1 >= 0 ? 1 : -1) * (xp >= -d_half ? 1 : -1)
        const E2 = calculateElectricField(COULOMB_K, Math.abs(q2 * 1e-6), Math.max(0.005, r2)).E * (q2 >= 0 ? 1 : -1) * (xp >= d_half ? 1 : -1)
        
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
      const U = params.U ?? 200
      const v0 = params.v0 ?? 20
      const q = params.q ?? 5
      const freq = params.freq ?? 50
      const isAC = params.isAC ?? 0
      const useGravity = params.useGravity ?? 0

      // 仿真参数常量
      const PLATE_LENGTH = 0.4
      const PLATE_GAP = 0.2

      // 进行轨迹仿真
      const simResult = calculateChargeInEFieldTrajectory({
        U,
        d: PLATE_GAP,
        L: PLATE_LENGTH,
        q: q * 1e-6,
        m: 50 * 1e-6, // 50 mg
        v0,
        g: useGravity === 1 ? 9.8 : 0,
        isAC: isAC === 1,
        freq,
      })

      // 插值获取当前时刻的值：根据模式动态计算时间慢放比例
      const TIME_SCALE = getChargeInEFieldTimeScale(simResult.tEnd, isAC === 1)
      const tSim = Math.min(time * TIME_SCALE, simResult.tEnd)
      
      // 线性插值
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

      return {
        quantities: [
          ...base,
          { label: '加速度 ay', value: curState.ay.toFixed(2), unit: 'm/s²', color: '#DC2626', highlight: 'extreme' },
          { label: '偏转距离 y', value: Math.abs(curState.y * 100).toFixed(2), unit: 'cm' },
          { label: '竖直速度 vy', value: curState.vy.toFixed(2), unit: 'm/s', color: '#60A5FA' },
          { label: '末速度 v', value: vTotal.toFixed(2), unit: 'm/s', color: '#2563EB', highlight: 'extreme' },
        ],
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
            text: '交变电场分析：交变电场中粒子在竖直方向所受电场力周期性改变方向，速度-时间图像为“折线图”。其轨迹呈锯齿状复杂周期运动。',
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
      const S = params.S ?? 100
      const d = params.d ?? 5
      const epsilon_r = params.epsilon_r ?? 1
      const U = params.U ?? 12
      const isConnected = (params.connected ?? 1) >= 0.5

      // 断开电源时保持的电荷基准（取默认状态 S=100cm² d=5mm εᵣ=1 U=12V 充电后的电荷量）
      const Q_FIXED = VACUUM_PERMITTIVITY * (100 * 1e-4) / (5 * 1e-3) * 12
      const { C } = calculateCapacitor(VACUUM_PERMITTIVITY * epsilon_r, S * 1e-4, d * 1e-3)
      
      const voltage = isConnected ? U : Q_FIXED / C
      const charge = isConnected ? C * voltage : Q_FIXED
      const field = voltage / (d * 1e-3)

      return {
        quantities: [
          ...base,
          {
            label: '电容',
            symbol: 'C',
            value: C * 1e12,
            unit: 'pF',
            color: '#0284C7', // sky-600 (PHYSICS_COLORS.capacitor)
          },
          {
            label: '电荷量',
            symbol: 'Q',
            value: charge * 1e12,
            unit: 'pC',
            color: '#EF4444', // red-500 (PHYSICS_COLORS.positiveCharge)
            highlight: !isConnected ? 'extreme' : undefined,
          },
          {
            label: '电势差',
            symbol: 'U',
            value: voltage,
            unit: 'V',
            color: '#A16207', // 棕黄 (PHYSICS_COLORS.electricPotential)
            highlight: isConnected ? 'extreme' : undefined,
          },
          {
            label: '板间场强',
            symbol: 'E',
            value: field,
            unit: 'V/m',
            color: '#D97706', // amber-600 (PHYSICS_COLORS.electricField)
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
      const topology = params.topology ?? 2 // 0=单正, 1=单负, 2=等量异种, 3=等量同种
      const qSource = params.qSource ?? 5   // μC
      const probeX = params.probeX ?? 350
      const probeY = params.probeY ?? 150
      const probeStartX = params.probeStartX ?? 350
      const probeStartY = params.probeStartY ?? 150

      const cx = 350
      const cy = 240
      const separation = 160 // 像素

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
        const k = 9e9
        const mPerPx = 0.005
        for (const c of charges) {
          const dx = px - c.x
          const dy = py - c.y
          const rPx = Math.sqrt(dx * dx + dy * dy)
          const rM = Math.max(0.05, rPx * mPerPx) // 限幅 0.05m
          v += (k * c.q * 1e-6) / rM
        }
        return v
      }

      const phiCurrent = getPotentialAt(probeX, probeY)
      const phiStart = getPotentialAt(probeStartX, probeStartY)

      const qProbe = 1.0 * 1e-6 // 1 μC
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
      const qProbe = params.qProbe ?? 1.0 // μC
      const slopeK = params.slopeK ?? 0 // V/m
      
      const U_AB = phiA - phiB
      const delta_Ep = (qProbe * 1e-6) * (phiB - phiA) // J
      
      return {
        quantities: [
          ...base,
          { label: 'A点电势 φ_A', value: phiA.toFixed(1), unit: 'V', color: '#8B5CF6' },
          { label: 'B点电势 φ_B', value: phiB.toFixed(1), unit: 'V', color: '#8B5CF6' },
          { label: '两点电势差 U_AB', value: U_AB.toFixed(1), unit: 'V', highlight: 'extreme' as const },
          { label: '电势能变化 ΔEp', value: delta_Ep.toExponential(4), unit: 'J', color: '#8B5CF6', highlight: 'extreme' as const },
          { label: '图像切线斜率 |k|', value: slopeK.toFixed(1), unit: 'V/m', color: '#EAB308', highlight: 'extreme' as const },
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
    case 'anim-ohm-law': {
      const mode = params.mode ?? 0 // 0=定值电阻, 1=小灯泡
      const U = params.U ?? 2
      const R = params.R ?? 10 // 仅在定值电阻模式有效

      let I = 0
      let P = 0
      let R_eff = R

      if (mode === 0) {
        // 定值电阻模式
        const res = calculateOhmLaw(U, R)
        I = res.I
        P = U * I
        R_eff = R
      } else {
        // 小灯泡模式：R = 5 + 2 * U
        R_eff = 5 + 2 * U
        I = U / R_eff
        P = U * I
      }

      return {
        quantities: [
          ...base,
          {
            label: '瞬时电流 I',
            symbol: 'I',
            value: I.toFixed(3),
            unit: 'A',
            color: '#DC2626', // 电流红 (PHYSICS_COLORS.electricCurrent)
            highlight: 'extreme',
          },
          {
            label: '元件电功率 P',
            symbol: 'P',
            value: P.toFixed(3),
            unit: 'W',
            color: '#D97706', // 功率黄 (PHYSICS_COLORS.power)
            highlight: 'extreme',
          },
        ],
        formulas: [
          {
            name: '欧姆定律',
            latex: 'I = \\frac{U}{R}',
            level: 'core',
            condition: '适用于纯电阻电路',
          },
          {
            name: '电功率公式',
            latex: 'P = UI',
            level: 'core',
          },
        ],
        gaokaoPoints: [
          {
            text: '【斜率的物理意义】伏安特性曲线（U-I图）的斜率物理意义：在 U-I 图中（y轴为U，x轴为I），斜率 k = R；而在 I-U 图中（y轴为I，x轴为U），斜率 k = 1/R。在做题时务必看清坐标轴。',
            importance: 'gaokao',
          },
          {
            text: '【非线性元件分析】小灯泡是典型的非线性元件。随着电压升高，钨丝温度升高，其电阻值也随之增大。在 I-U 图中，图线会向电压轴弯曲（斜率减小，即阻值增大）。',
            importance: 'core',
          },
        ],
        warnings: [
          {
            text: '易错点：误认为小灯泡在电压为 0 时电阻为 0。实际上，灯泡在不通电时仍具有“冷态电阻”（本例中约为 5 Ω）。',
            level: 'warning',
          },
          {
            text: '易错点：混淆“工作点与原点连线的斜率”与“切线斜率”。对于非线性元件，某状态下的电阻值（静阻值） R = U/I 只能通过该点与原点的连线斜率计算，不能用切线斜率（动态电阻）代替。',
            level: 'danger',
          },
        ],
      }
    }
    case 'anim-circuit-analysis': {
      const U = params.U ?? 12
      const R1 = params.R1 ?? 20 // 定值电阻 R1
      const R2 = params.R2 ?? 10 // 滑动变阻器 R2
      const R3 = params.R3 ?? 30 // 并联定值电阻 R3 (仅混联有效)
      
      const mode = params.mode ?? 0 // 0=基础, 1=进阶
      const subMode = params.subMode ?? 0 // 0=串联, 1=并联 (仅基础有效)

      let Rtotal = 0
      let Itotal = 0
      let U1 = 0
      let U2 = 0 // 电压表测量 R2 两端电压
      let I1 = 0
      let I2 = 0
      let I3 = 0 // 混联模式下 R3 电流

      let topoName = ''

      if (mode === 0) {
        // ── 基础模式 ──
        if (subMode === 0) {
          // 串联电路
          topoName = '基础：串联电路'
          Rtotal = R1 + R2
          Itotal = Rtotal > 0 ? U / Rtotal : 0
          I1 = I2 = Itotal
          U1 = I1 * R1
          U2 = I2 * R2
        } else {
          // 并联电路
          topoName = '基础：并联电路'
          // 避免除以 0，当 R2 = 0 时视为短路 (用 0.01 欧姆近似)
          const R2_eff = R2 > 0 ? R2 : 0.01
          Rtotal = (R1 * R2_eff) / (R1 + R2_eff)
          Itotal = U / Rtotal
          I1 = U / R1
          I2 = U / R2_eff
          U1 = U2 = U
        }
      } else {
        // ── 进阶混联模式 ──
        // R1 串联在干路，R2 与 R3 并联
        topoName = '进阶：混联电路'
        const R2_eff = R2 > 0 ? R2 : 0.001
        const R_parallel = (R2_eff * R3) / (R2_eff + R3)
        Rtotal = R1 + R_parallel
        Itotal = U / Rtotal
        U1 = Itotal * R1
        U2 = U - U1 // 并联部分分压
        I3 = U2 / R3
        I2 = R2 > 0 ? U2 / R2 : Itotal // 短路时电流全过变阻器
        I1 = Itotal
      }

      return {
        quantities: [
          ...base,
          { label: '当前拓扑', value: topoName, unit: '' },
          { 
            label: '等效总电阻', 
            symbol: 'R_总', 
            value: Rtotal, 
            unit: 'Ω', 
            highlight: R2 === 100 ? 'extreme' : (R2 === 0 && mode === 0 && subMode === 1 ? 'zero' : undefined)
          },
          { 
            label: '干路总电流', 
            symbol: 'I_总', 
            value: Itotal, 
            unit: 'A', 
            color: '#DC2626',
            highlight: R2 === 0 ? 'extreme' : undefined
          },
          { 
            label: '电压表读数', 
            symbol: 'U_V', 
            value: U2, 
            unit: 'V', 
            color: '#A16207',
            highlight: R2 === 0 ? 'zero' : (R2 === 100 ? 'extreme' : undefined)
          },
          { label: 'R₁ 两端电压', symbol: 'U₁', value: U1, unit: 'V' },
          { label: 'R₁ 流经电流', symbol: 'I₁', value: I1, unit: 'A' },
          { label: 'R₂ 流经电流', symbol: 'I₂', value: I2, unit: 'A' },
          ...(mode === 1 ? [{ label: 'R₃ 流经电流', symbol: 'I₃', value: I3, unit: 'A' }] : []),
        ],
        formulas: [
          {
            name: '欧姆定律',
            latex: 'I = \\frac{U}{R}',
            level: 'core' as const,
            condition: '适用于纯电阻电路',
          },
          ...(mode === 0 && subMode === 0 ? [
            {
              name: '串联分压比例',
              latex: '\\frac{U_1}{U_2} = \\frac{R_1}{R_2}',
              level: 'core' as const,
              condition: '串联电路中电流相等',
            }
          ] : []),
          ...(mode === 0 && subMode === 1 ? [
            {
              name: '并联分流比例',
              latex: '\\frac{I_1}{I_2} = \\frac{R_2}{R_1}',
              level: 'core' as const,
              condition: '并联电路中电压相等',
            }
          ] : []),
          ...(mode === 1 ? [
            {
              name: '混联总电阻',
              latex: 'R_{总} = R_1 + \\frac{R_2 R_3}{R_2 + R_3}',
              level: 'core' as const,
              condition: 'R1与并联部分串联',
            }
          ] : []),
        ],
        gaokaoPoints: [
          {
            text: '【秒杀核心：串反并同】与变化的电阻串联的元件，其电流/电压变化相反；并联的元件则相同。',
            importance: 'gaokao',
          },
          {
            text: '【动态分析基本链条】局部电阻变化 → 总电阻变化 → 干路电流变化 → 定值电阻分压变化 → 支路分配变化。',
            importance: 'gaokao',
          },
          {
            text: '【极限思维法】将变阻器阻值置于两端（0 或 100Ω），可以快速推导电表读数的极值和定性偏转趋势。',
            importance: 'core',
          },
        ],
        warnings: [
          {
            text: '易错点：在并联或混联中，滑动变阻器电阻 R₂ 增大时，盲目认为总电阻减小。切记：任何一个电阻增大，总等效电阻必定增大。',
            level: 'danger',
          },
          {
            text: '易错点：孤立看待局部支路。混联中 R₂ 增大导致干路电流减小，使得 R₁ 分压减小，从而把更多的电压“让给”并联支路，导致电压表读数增大。',
            level: 'warning',
          },
        ],
        mnemonic: '串反并同，整体到局部，极限秒杀',
      }
    }
    case 'anim-closed-circuit': {
      const EMF = params.EMF ?? 6
      const r = params.r ?? 2
      const R = params.R ?? 10
      const { I, U_terminal, P_output, P_total, eta } = calculateClosedCircuit(EMF, r, R)
      const U_internal = I * r
      const P_internal = I * I * r

      return {
        quantities: [
          ...base,
          {
            label: '电动势',
            symbol: 'E',
            value: EMF.toFixed(1),
            unit: 'V',
            color: '#D97706', // emf (PHYSICS_COLORS.emf)
          },
          {
            label: '干路电流',
            symbol: 'I',
            value: I.toFixed(3),
            unit: 'A',
            color: '#DC2626', // electricCurrent
            highlight: 'extreme',
          },
          {
            label: '路端电压',
            symbol: 'U外',
            value: U_terminal.toFixed(2),
            unit: 'V',
            color: '#A16207', // electricPotential
          },
          {
            label: '内电压',
            symbol: 'U内',
            value: U_internal.toFixed(2),
            unit: 'V',
            color: '#EF4444', // positiveCharge
          },
          {
            label: '输出功率',
            symbol: 'P出',
            value: P_output.toFixed(2),
            unit: 'W',
            color: '#D97706', // power
            highlight: R === r ? 'extreme' : undefined,
          },
          {
            label: '内耗功率',
            symbol: 'P内',
            value: P_internal.toFixed(2),
            unit: 'W',
            color: '#B91C1C', // internalEnergy / heatLoss
          },
          {
            label: '总功率',
            symbol: 'P总',
            value: P_total.toFixed(2),
            unit: 'W',
            color: '#4F46E5', // mechanicalEnergy
          },
          {
            label: '电源效率',
            symbol: 'η',
            value: (eta * 100).toFixed(1),
            unit: '%',
            color: '#10B981', // work
            highlight: R === r ? 'extreme' : undefined,
          },
        ],
        formulas: [
          {
            name: '闭合电路欧姆定律',
            latex: 'I = \\frac{E}{R + r}',
            level: 'core',
            condition: '适用于含有内阻的闭合单回路纯电阻电路',
          },
          {
            name: '路端电压关系',
            latex: 'U_{\\text{外}} = E - Ir',
            level: 'core',
          },
          {
            name: '电源输出功率',
            latex: 'P_{\\text{出}} = I^2 R = \\frac{E^2 R}{(R + r)^2}',
            level: 'core',
          },
          {
            name: '能量分配守恒',
            latex: 'P_{\\text{总}} = P_{\\text{出}} + P_{\\text{内}} \\implies EI = UI + I^2r',
            level: 'core',
          },
        ],
        gaokaoPoints: [
          {
            text: '【U-I 图像几何性质】路端电压与电流关系图像中，纵轴截距为电动势 E，横轴截距为短路电流 I_短 = E/r，斜率绝对值即为电源内阻 r。',
            importance: 'gaokao',
          },
          {
            text: '【电源输出功率极值】当外电阻 R 等于内电阻 r 时，电源的输出功率达到最大值 P_max = E² / (4r)，此时电源的传输效率刚好为 50%。',
            importance: 'gaokao',
          },
          {
            text: '【波峰平移验证规律】当电源内阻 r 增大时，P_出-R 图像的最大输出功率波峰将向右移动且峰值变小；内阻 r 减小时波峰向左移动且峰值变大。',
            importance: 'core',
          },
        ],
        warnings: [
          {
            text: '易错点：极易混淆电源总功率（EI）、输出功率（UI）和内耗热功率（I²r）。分析功与能转化时，务必先分清是“电源内部”还是“外电路”。',
            level: 'danger',
          },
          {
            text: '易错点：误认为外电阻 R 越大，电源输出功率就越大。实际上，当 R > r 时，输出功率随 R 的增大而减小；只有在 R < r 时，输出功率才随 R 的增大而增大。',
            level: 'warning',
          },
        ],
      }
    }
    case 'anim-ampere-force': {
      const mode = params.mode ?? 0
      const B = params.B ?? 1.0
      const I = params.I ?? 2.0
      const L = 4.0 // 有效长度固定为 4.0m
      const m = 0.5 // 质量固定为 0.5kg

      if (mode === 0) {
        // ── 基础模式 ──
        const res = solveBasicAmpere(I, B, L, m, time)
        const fDirText = res.F > 1e-4 ? ' (向右)' : res.F < -1e-4 ? ' (向左)' : ' (为零)'
        
        return {
          quantities: [
            ...base,
            { label: '磁感应强度 B', value: `${Math.abs(B).toFixed(1)}`, unit: `T (${B > 0 ? '垂直纸面向里' : B < 0 ? '垂直纸面向外' : '无磁场'})`, color: PHYSICS_COLORS.magneticField },
            { label: '电流 I', value: `${Math.abs(I).toFixed(1)}`, unit: `A (${I > 0 ? '向上' : I < 0 ? '向下' : '无电流'})`, color: PHYSICS_COLORS.electricCurrent },
            { label: '有效长度 L', value: L.toFixed(1), unit: 'm', color: colors.neutral[500] },
            { label: '安培力 F', value: `${Math.abs(res.F).toFixed(2)}`, unit: `N${fDirText}`, color: PHYSICS_COLORS.forceNet, highlight: res.FAbs > 1e-4 ? 'extreme' : 'zero' },
          ],
          formulas: [
            { name: '安培力大小公式', latex: 'F = BIL \\quad (\\vec{B} \\perp \\vec{I})', level: 'core', condition: '当磁场与电流垂直时' },
            { name: '安培力方向判定', latex: '\\vec{F} = I\\vec{L} \\times \\vec{B}', level: 'core', condition: '遵循左手定则' },
          ],
          gaokaoPoints: [
            { text: '【左手定则三维空间判定】伸开左手，使大拇指与四指垂直且在同一平面内，让磁感线穿过手心（B入掌心），四指指向电流方向，大拇指所指即为安培力方向。', importance: 'gaokao' },
            { text: '【三者方向关系】安培力 F 垂直于磁场 B 和电流 I 决定的平面，但 B 和 I 不一定垂直。当 B 与 I 夹角为 θ 时，F = BIL sinθ。', importance: 'core' },
            { text: '【有效长度考点】公式中的 L 指的是“有效长度”，即在磁场中且通电的那段导线在垂直磁场方向的投影长度（对双轨即为导轨间距，而非导体棒总长）。', importance: 'gaokao' },
          ],
          warnings: [
            { text: '易错点：极易混淆左手定则（判定安培力/洛伦兹力方向）与右手定则（判定感应电流/感应电动势方向）。口诀：左力右感。', level: 'danger' },
            { text: '易错点：忽视电流或磁场方向反向时力的方向变化。电流单向反向，力反向；磁场单向反向，力反向；两者同时反向，力方向保持不变。', level: 'warning' },
          ],
        }
      } else {
        // ── 进阶模式 ──
        const theta = params.theta ?? 30
        const mu = params.mu ?? 0.2
        const res = solveAdvancedAmpere(I, B, theta, mu, L, m, time)
        
        let stateText = '静止平衡'
        if (res.state === 'sliding-up') stateText = '向上滑动'
        if (res.state === 'sliding-down') stateText = '向下滑动'

        let fText = `${Math.abs(res.f).toFixed(2)}`
        let fUnit = 'N'
        if (res.f > 1e-4) fUnit = 'N (沿斜面向上)'
        else if (res.f < -1e-4) fUnit = 'N (沿斜面向下)'
        else fUnit = 'N (为零)'

        return {
          quantities: [
            ...base,
            { label: '安培力 F_安', value: Math.abs(res.F_ampere).toFixed(2), unit: `N (${res.F_ampere > 1e-4 ? '水平向右' : res.F_ampere < -1e-4 ? '水平向左' : '为零'})`, color: PHYSICS_COLORS.forceNet },
            { label: '支持力 N', value: res.N.toFixed(2), unit: 'N', color: PHYSICS_COLORS.normalForce },
            { label: '摩擦力 f', value: fText, unit: fUnit, color: PHYSICS_COLORS.friction, highlight: res.state === 'equilibrium' ? undefined : 'extreme' },
            { label: '瞬时加速度 a', value: res.a.toFixed(2), unit: 'm/s²', color: PHYSICS_COLORS.acceleration, highlight: Math.abs(res.a) > 0.01 ? 'extreme' : 'zero' },
            { label: '导体棒状态', value: stateText, unit: '', highlight: res.state === 'equilibrium' ? 'positive' : 'negative' },
          ],
          formulas: [
            { name: '安培力大小', latex: 'F_{\\text{安}} = BIL', level: 'core' },
            { name: '沿斜面待平衡项', latex: 'R_{\\parallel} = F_{\\text{安}}\\cos\\theta - mg\\sin\\theta', level: 'core', condition: '向上为正' },
            { name: '斜面正压力', latex: 'N = mg\\cos\\theta + F_{\\text{安}}\\sin\\theta', level: 'core', condition: '安培力向右时' },
            { name: '静摩擦平衡条件', latex: '|R_{\\parallel}| \\le \\mu N \\implies f = -R_{\\parallel}', level: 'core' },
            { name: '滑动摩擦与加速度', latex: 'f = -\\mu N \\operatorname{sgn}(R_{\\parallel}) \\implies a = \\frac{R_{\\parallel} + f}{m}', level: 'core', condition: '滑动状态下' },
          ],
          gaokaoPoints: [
            { text: '【受力分析与分解】解决磁场力与斜面平衡问题时，必须画出二维侧视受力图。将各力沿平行于斜面和垂直于斜面两个方向进行正交分解。', importance: 'gaokao' },
            { text: '【静摩擦力的双向性与临界】静摩擦力的方向取决于导体棒的运动趋势。若安培力较小，棒有下滑趋势，摩擦力向上；若安培力较大，棒有上滑趋势，摩擦力向下。临界平衡状态满足 |f| = μN。', importance: 'gaokao' },
            { text: '【特殊临界公式】在无摩擦（μ = 0）或特定简化平衡条件下，常能推导得出简化临界公式 F_安 = mg tanθ，注意该公式不具有通用性，应从基本受力分析入手。', importance: 'core' },
          ],
          warnings: [
            { text: '易错点：极易把安培力的方向画错！当匀强磁场竖直向上/下时，安培力沿水平方向，而非沿斜面方向。务必注意安培力与磁场及电流两两垂直的几何约束。', level: 'danger' },
            { text: '易错点：漏掉正压力中安培力的分量！安培力不仅在沿斜面方向有分力，在垂直斜面方向也有分力，导致正压力 N 发生变化，从而改变了最大静摩擦力 μN。', level: 'danger' },
          ],
        }
      }
    }
    case 'anim-lorentz-force': {
      const mode = params.mode ?? 0
      const v0 = params.v0 ?? 10.0
      const B = params.B ?? 1.0
      const E = params.E ?? 10.0
      const qOverM = params.qOverM ?? 1.0
      const q = params.q ?? 1.0

      if (mode === 0) {
        // 基础模式
        const R = Math.abs(v0 / (q * B))
        const F_lorentz = q * v0 * B

        return {
          quantities: [
            ...base,
            { label: '电荷极性', value: q > 0 ? '正电荷 (+q)' : '负电荷 (-q)', unit: '', highlight: q > 0 ? 'positive' : 'negative' },
            { label: '入射速度 v', value: v0.toFixed(1), unit: 'm/s', color: '#2563EB' },
            { label: '磁场强度 B', value: B.toFixed(1), unit: 'T', color: '#10B981' },
            { label: '洛伦兹力 F_洛', value: Math.abs(F_lorentz).toFixed(2), unit: 'N', color: '#8B5CF6', highlight: F_lorentz === 0 ? 'zero' : 'extreme' },
            { label: '轨道半径 R', value: R.toFixed(2), unit: 'm', color: '#64748B' },
          ],
          formulas: [
            {
              name: '洛伦兹力大小',
              latex: 'F_{\\text{洛}} = qvB \\quad (\\vec{v} \\perp \\vec{B})',
              level: 'core',
              condition: '当速度与磁场垂直时',
            },
            {
              name: '向心力与半径公式',
              latex: 'qvB = m\\frac{v^2}{R} \\implies R = \\frac{mv}{qB}',
              level: 'core',
            }
          ],
          gaokaoPoints: [
            {
              text: '【洛伦兹力永远不做功】洛伦兹力的方向始终与带电粒子的瞬时速度方向垂直，因此它只改变速度的方向，而不改变速度的大小。',
              importance: 'gaokao',
            },
          ],
          warnings: [
            {
              text: '易错点：应用左手定则判断洛伦兹力方向时，四指指向正电荷的运动方向，对于负电荷，四指应指向运动的反方向（即电流的相反方向）。',
              level: 'danger',
            }
          ]
        }
      } else {
        // 进阶模式
        const v_filter = B > 0.01 ? E / B : 0
        const F_electric = qOverM * E
        const F_lorentz = qOverM * v0 * B
        const isBalanced = Math.abs(v0 - v_filter) < 1e-4

        return {
          quantities: [
            ...base,
            { label: '磁场强度 B', value: B.toFixed(1), unit: 'T', color: '#10B981' },
            { label: '电场强度 E', value: E.toFixed(1), unit: 'V/m', color: '#D97706' },
            { label: '粒子荷质比 q/m', value: qOverM.toFixed(1), unit: 'C/kg' },
            { label: '过滤速度 v_滤', value: v_filter.toFixed(2), unit: 'm/s', color: '#2563EB', highlight: 'extreme' },
            { label: '入射速度 v', value: v0.toFixed(1), unit: 'm/s', color: '#2563EB' },
            { label: '电场力/质量 FE/m', value: F_electric.toFixed(2), unit: 'N/kg', color: '#F97316' },
            { label: '洛伦兹力/质量 FL/m', value: F_lorentz.toFixed(2), unit: 'N/kg', color: '#8B5CF6' },
            { label: '偏转状态', value: isBalanced ? '匀速直线穿出' : (v0 > v_filter ? '洛力主导，向上偏转' : '电场力主导，向下偏转'), unit: '', highlight: isBalanced ? 'positive' : 'negative' }
          ],
          formulas: [
            {
              name: '复合场受力平衡',
              latex: 'F_{\\text{洛}} = F_{\\text{电}} \\implies qvB = qE',
              level: 'core',
              condition: '沿中轴直线穿出时',
            },
            {
              name: '过滤速度公式',
              latex: 'v = \\frac{E}{B}',
              level: 'core',
            }
          ],
          gaokaoPoints: [
            {
              text: '【速度选择器的物理本质】“只选速度，不选电性和质量”。从受力平衡方程 qvB = qE 可知，能够笔直穿出复合场的速度满足 v = E/B。无论是正电荷还是负电荷，无论是重离子还是轻电子，只要初速度等于 E/B，都在复合场中保持匀速直线运动穿出。',
              importance: 'gaokao',
            },
            {
              text: '【速度选择器的单向性】粒子必须从左侧水平向右入射才能发生选择。如果粒子从右侧入射，电场力与洛伦兹力将同向，粒子必然发生偏转而无法穿出。',
              importance: 'gaokao',
            }
          ],
          warnings: [
            {
              text: '易错点：误认为改变带电粒子的电量 q 会打破选择器的平衡。实际上 q 因子同时出现在两边并被消去，平衡状态不受影响。',
              level: 'danger',
            }
          ],
          mnemonic: '只选速度，不选质量，不选电性，单向选择。'
        }
      }
    }

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

    case 'anim-charge-in-bfield': {
      const mode = params.mode ?? 0 // 0=基础模式, 1=进阶模式
      const q = params.q ?? 1
      const m = params.m ?? 1
      const v = params.v ?? 10
      const B = params.B ?? 1
      const theta = params.theta ?? 90 // 射入夹角

      const R = Math.abs((m * v) / (q * B))
      const T = Math.abs((2 * Math.PI * m) / (q * B))
      
      // 基础模式下的停留时间 t（假设垂直射入，圆心角为 pi）
      const arcAngle = Math.PI // 这里简化为垂直射出
      const timeInB = (arcAngle / (2 * Math.PI)) * T
      
      // 进阶模式下的最大射出距离 x_max (直径)
      const xMax = 2 * R

      if (mode === 0) {
        return {
          quantities: [
            ...base,
            { label: '回旋半径 R', value: R.toFixed(2), unit: 'm', color: '#3B82F6' },
            { label: '运动周期 T', value: T.toFixed(2), unit: 's', color: '#8B5CF6' },
            { label: '停留时间 t', value: timeInB.toFixed(2), unit: 's', color: '#EF4444', highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '洛伦兹力提供向心力', latex: 'qvB = m\\frac{v^2}{R}', level: 'core' },
            { name: '回旋半径', latex: 'R = \\frac{mv}{qB}', level: 'core' },
            { name: '运动周期', latex: 'T = \\frac{2\\pi m}{qB}', level: 'core' },
            { name: '运动时间', latex: 't = \\frac{\\theta}{2\\pi}T', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '高考考点：粒子在磁场中的运行时间由圆心角决定，与速度无关。', importance: 'gaokao' as const },
            { text: '确定圆心是解决磁场问题的关键，通常利用两速度垂线的交点或一速度垂线与一条弦的中垂线交点来确定。', importance: 'core' as const },
          ],
          warnings: [
            { text: '易错防坑：错将运动半径与时间混淆，容易误认为速度越大、粒子在磁场中运动时间越长。实际上，在偏转角一定时，运动时间仅取决于周期，与速度大小完全无关！', level: 'danger' }
          ],
        }
      } else {
        return {
          quantities: [
            ...base,
            { label: '当前射入角 θ', value: theta.toFixed(0), unit: '°', color: '#10B981' },
            { label: '回旋半径 R', value: R.toFixed(2), unit: 'm', color: '#3B82F6' },
            { label: '最大射出距离 x_max', value: xMax.toFixed(2), unit: 'm', color: '#EF4444', highlight: 'extreme' as const },
          ],
          formulas: [
            { name: '弦长公式', latex: 'L = 2R\\sin\\frac{\\theta}{2}', level: 'core' },
            { name: '最大距离', latex: 'x_{\\max} = 2R = \\frac{2mv}{qB}', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '高考考点：高考压轴题常客。找圆心、求半径、定时间；旋转圆与放缩圆边界临界切点分析。', importance: 'gaokao' as const },
            { text: '旋转圆规律：当速度大小不变、方向改变时，粒子的轨迹圆大小不变，但圆心绕入射点旋转（圆心轨迹为以入射点为圆心、半径为R的圆弧）。', importance: 'core' as const },
            { text: '临界极值：在磁场边界上，当弦长恰好等于轨迹圆的直径（即 2R）时，粒子射出的距离达到最大值。', importance: 'gaokao' as const },
          ],
          warnings: [
            { text: '易错防坑：找不到动态圆圆心的运动轨迹（通常是以入射点为圆心、半径为R的圆弧），在画临界条件时切点找错导致漏解。', level: 'danger' }
          ],
        }
      }
    }

    case 'anim-electromagnetic-induction': {
      const mode = params.mode ?? 0 // 0=基础: 磁铁运动, 1=进阶: 双线圈回路
      const N = 10 // 固定线圈匝数

      if (mode === 0) {
        // ── 基础模式：磁铁插入线圈 ──
        const magnetX = params.magnetX ?? 200
        const magnetSpeed = params.magnetSpeed ?? 0
        const magnetPole = params.magnetPole ?? 1 // 1=左S右N, -1=左N右S
        const coilX = 400

        const { phi, dPhi, theta } = calculateMagnetInduction(magnetX, magnetSpeed, coilX, N, magnetPole)

        // 判断电流计偏转方向文字
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
            { label: '磁通量变化率 dΦ/dt', value: dPhi.toFixed(3), unit: 'Wb/s', color: PHYSICS_COLORS.magneticField, highlight: Math.abs(dPhi) > 0.01 ? 'extreme' : undefined },
            { label: '电流计指针偏转', value: currentDirectionText, unit: '', color: PHYSICS_COLORS.kineticEnergy, highlight: Math.abs(theta) > 0.05 ? 'extreme' : 'zero' },
          ],
          formulas: [
            { name: '磁通量变化量定义', latex: '\\Delta\\Phi = \\Phi_{末} - \\Phi_{初}', level: 'core' },
            { name: '法拉第电磁感应定律', latex: 'E = N \\frac{\\Delta\\Phi}{\\Delta t}', level: 'core', condition: '计算平均感应电动势' },
          ],
          gaokaoPoints: [
            { text: '闭合回路内磁通量发生变化（ΔΦ ≠ 0）是产生感应电流的充要条件。', importance: 'gaokao' },
            { text: '高考常在大题的第一问中以各种隐蔽几何变化（如线圈旋转、滑条移动、磁铁位移）考查对“变化”的判断。', importance: 'gaokao' },
            { text: '磁通量变化率 dΦ/dt 决定了感应电动势的大小，即决定了电流计指针偏转的幅度。', importance: 'core' },
          ],
          warnings: [
            { text: '易错防坑：误认为有磁通量 Φ 就有感应电流。记住，磁铁静止在线圈中时，虽然 Φ 达到最大，但 ΔΦ = 0，此时感应电流为零，指针不偏转！', level: 'danger' }
          ],
        }
      } else {
        // ── 进阶模式：双线圈回路 ──
        const R = params.resistance ?? 50
        const dR_dt = params.dR_dt ?? 0
        const E_source = 10 // 原回路电源电压

        const { phi, dPhi, theta } = calculateCoilInduction(R, dR_dt, E_source, N)
        const I1 = E_source / R

        let currentDirectionText = '无感应电流'
        if (Math.abs(theta) > 0.05) {
          currentDirectionText = theta > 0 ? '向右偏转 (+)' : '向左偏转 (-)'
        }

        return {
          quantities: [
            ...base,
            { label: '原线圈电流 I₁', value: I1.toFixed(2), unit: 'A', color: PHYSICS_COLORS.electricCurrent },
            { label: '穿过副线圈磁通量 Φ', value: phi.toFixed(3), unit: 'Wb', color: PHYSICS_COLORS.magneticField },
            { label: '磁通量变化率 dΦ/dt', value: dPhi.toFixed(3), unit: 'Wb/s', color: PHYSICS_COLORS.magneticField, highlight: Math.abs(dPhi) > 0.01 ? 'extreme' : undefined },
            { label: '电流计指针偏转', value: currentDirectionText, unit: '', color: PHYSICS_COLORS.kineticEnergy, highlight: Math.abs(theta) > 0.05 ? 'extreme' : 'zero' },
          ],
          formulas: [
            { name: '互感磁通量关系', latex: '\\Phi = M I_1', level: 'core', condition: 'M为互感系数' },
            { name: '法拉第电磁感应定律', latex: 'E = -N \\frac{d\\Phi}{dt}', level: 'core' },
          ],
          gaokaoPoints: [
            { text: '双线圈互感：原回路中电阻变化导致原电流变化，从而改变原线圈磁场，使得副线圈中磁通量发生变化。', importance: 'gaokao' },
            { text: '只要变阻器停止拖动，即使电阻很小（电流很大），由于电流恒定，磁通量变化率为零，副线圈就没有感应电流。', importance: 'gaokao' },
          ],
          warnings: [
            { text: '易错防坑：在变阻器滑动过程中，电阻变小导致电流增大，磁场增强，穿过副线圈的磁通量增大；电阻变大则相反。变阻器滑动的快慢（dR/dt）直接决定感应电流的强弱。', level: 'warning' }
          ],
        }
      }
    }

    default:
      return null
  }
}

