import {
  calculateCoulombForce,
  calculateElectricField,
  calculateCapacitor,
  calculateChargeInEFieldTrajectory,
  getChargeInEFieldTimeScale,
} from '../../../physics'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { PhysicsPanelData, PhysicsQuantity } from '../types'

const COULOMB_K = 9e9
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
      const k = 9e9
      const q1SI = Math.abs(q1 * 1e-6)
      const q2SI = Math.abs(q2 * 1e-6)

      if (mode === 0) {
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

        const { E } = calculateElectricField(COULOMB_K, Math.abs(qSI), rSI)
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

        const d_half = 5.25 * 0.01
        const xp = rTest * 0.01

        const r1 = Math.abs(xp + d_half)
        const r2 = Math.abs(xp - d_half)

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

      const PLATE_LENGTH = 0.4
      const PLATE_GAP = 0.2

      const simResult = calculateChargeInEFieldTrajectory({
        U,
        d: PLATE_GAP,
        L: PLATE_LENGTH,
        q: q * 1e-6,
        m: 50 * 1e-6,
        v0,
        g: useGravity === 1 ? 9.8 : 0,
        isAC: isAC === 1,
        freq,
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

      return {
        quantities: [
          ...base,
          { label: '加速度 ay', value: curState.ay.toFixed(2), unit: 'm/s²', color: PHYSICS_COLORS.acceleration, highlight: 'extreme' },
          { label: '偏转距离 y', value: Math.abs(curState.y * 100).toFixed(2), unit: 'cm' },
          { label: '竖直速度 vy', value: curState.vy.toFixed(2), unit: 'm/s', color: PHYSICS_COLORS.velocityY },
          { label: '末速度 v', value: vTotal.toFixed(2), unit: 'm/s', color: PHYSICS_COLORS.velocity, highlight: 'extreme' },
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
      const S = params.S ?? 100
      const d = params.d ?? 5
      const epsilon_r = params.epsilon_r ?? 1
      const U = params.U ?? 12
      const isConnected = (params.connected ?? 1) >= 0.5

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
      const probeX = params.probeX ?? 350
      const probeY = params.probeY ?? 150
      const probeStartX = params.probeStartX ?? 350
      const probeStartY = params.probeStartY ?? 150

      const cx = 350
      const cy = 240
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
        const k = 9e9
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
    default:
      return null
  }
}
