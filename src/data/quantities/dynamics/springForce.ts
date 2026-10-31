import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import {
  calculateCutRopeState,
  calculateElasticNormalForceState,
  calculateElasticTensionState,
  CUT_ROPE_ANCHORS,
} from '@/physics/dynamics/spring-force'

interface Params {
  k: number
  m: number
  mode: number
  isCut: number
  kAtoms: number
  kRope: number
}

const DEFAULTS: ParamDefs<Params> = {
  k: { default: 100 },
  m: { default: 1 },
  mode: { default: 0 },
  isCut: { default: 0 },
  kAtoms: { default: 120 },
  kRope: { default: 150 },
}

/** 带方向箭头的加速度显示：↑ 向上、↓ 向下、未达阈值不标方向 */
const showAccel = (v: number) => `${v > 0.05 ? '↑ ' : v < -0.05 ? '↓ ' : ''}${Math.abs(v).toFixed(2)}`
/** 与静止无区别时不做高亮，避免「0.00 却标红」 */
const litAccel = (v: number) => Math.abs(v) > 0.1

/**
 * 弹力类动画的右侧看板。
 *
 * ⚠ 分派顺序必须是「先 animId、后 mode」。
 * 两个动画的 `mode` 参数**语义完全不同**。历史上这里只判 `mode === 0 / 否则`，
 * 把 `anim-spring-force` 的 mode 1（支持力与桌面形变）、mode 2（绳子拉力与拉伸量）
 * 一起吞进「绳与弹簧瞬时切断」分支，于是左屏选「支持力」时，右屏却输出
 * 四球加速度全 0.00 与四条「剪断瞬间」公式 —— 左中右三屏互相矛盾。
 *
 *  · anim-light-weight-mutation：整条时间轴从「已剪断」起算（物理层把
 *    isCut=1、tCutStart=0 写死），没有 mode 语义，直接出剪断后逐帧结果。
 *  · anim-spring-force：mode 0 胡克定律 / 1 支持力与桌面形变 / 2 绳拉力与拉伸量，
 *    三者物理模型不同，右屏物理量与公式体系各自独立。
 */
export function handleSpringForce(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-spring-force' && animId !== 'anim-light-weight-mutation') return null
  const p = normalizeParams(params, DEFAULTS)

  const k = p.k ?? 100
  const m = p.m ?? 1

  if (animId === 'anim-light-weight-mutation') {
    return cutRopePanel(k, m, time, base)
  }

  switch (p.mode ?? 0) {
    case 1:
      return normalForcePanel(m, p.kAtoms ?? 120, base)
    case 2:
      return tensionPanel(m, p.kRope ?? 150, base)
    default:
      return hookeLawPanel(k, m, time, base)
  }
}

// ─── mode 0：弹簧与胡克定律 ────────────────────────────────────────────

function hookeLawPanel(
  k: number,
  m: number,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData {
  const omega = Math.sqrt(k / m)
  const amplitude = 0.5
  const displacement = amplitude * Math.sin(omega * time)
  const potentialEnergy = 0.5 * k * displacement * displacement
  const force = -k * displacement

  return {
    quantities: [
      ...base,
      { label: '实时形变 x', value: `${displacement > 0 ? '+' : ''}${displacement.toFixed(2)}`, unit: 'm', highlight: Math.abs(displacement) > 0.05 ? 'positive' : undefined },
      { label: '实时弹力 F', value: `${force > 0 ? '+' : ''}${force.toFixed(1)}`, unit: 'N', highlight: Math.abs(force) > 0.5 ? 'extreme' : undefined },
      { label: '弹性势能 E_p', value: potentialEnergy.toFixed(2), unit: 'J', highlight: potentialEnergy > 0.05 ? 'extreme' : undefined },
      { label: '固有角频率 ω', value: omega.toFixed(2), unit: 'rad/s' },
    ],
    formulas: [
      { name: '胡克定律', latex: 'F = -kx', level: 'core', condition: '弹性限度内' },
      { name: '弹性势能', latex: 'E_p = \\frac{1}{2}kx^2', level: 'important', condition: '自然长度处 Ep=0' },
    ],
    gaokaoPoints: [
      { text: '胡克定律中的 x 是形变量（拉伸或压缩量），非弹簧长度。', importance: 'core' as const },
      { text: '弹力方向总是指向弹簧形变恢复的方向，与形变方向相反。', importance: 'core' as const },
      { text: 'F-x图像的斜率代表劲度系数k，图线围成的面积表弹性势能。', importance: 'gaokao' as const },
    ],
  }
}

// ─── mode 1：支持力与桌面形变 ──────────────────────────────────────────

/**
 * 中屏画的是桌面被压薄 + FN-x 关系图（ElasticNormalForceScene / NormalForceChart），
 * 右屏必须给同一组量。压缩量换算成 cm，与中屏「压缩量 x = ?.?? cm」的标注口径一致。
 */
function normalForcePanel(
  m: number,
  kAtoms: number,
  base: PhysicsQuantity[],
): PhysicsPanelData {
  const { normalForce, gravityForce, displacement } = calculateElasticNormalForceState(m, kAtoms)

  return {
    quantities: [
      ...base,
      { label: '重力 G', value: gravityForce.toFixed(1), unit: 'N' },
      { label: '支持力 F_N', value: normalForce.toFixed(1), unit: 'N', highlight: 'positive' },
      { label: '桌面压缩量 x', value: (displacement * 100).toFixed(2), unit: 'cm', highlight: 'extreme' },
      { label: '等效晶格刚度 k_e', value: kAtoms.toFixed(0), unit: 'N/m' },
    ],
    formulas: [
      { name: '竖直方向平衡', latex: 'F_N = mg', level: 'core', condition: '物体静置于水平支撑面' },
      { name: '支持力的弹力本质', latex: 'F_N = k_e x', level: 'important', condition: '桌面微观弹性形变，弹性限度内' },
    ],
    gaokaoPoints: [
      { text: '支持力的性质是弹力：桌面受压后发生微小弹性形变，要恢复原状而对物体产生垂直于支撑面朝上的推力。', importance: 'core' as const },
      { text: 'FN 与 G 大小相等、方向相反，但一个是弹力、一个是引力，性质不同，不构成作用力与反作用力。', importance: 'gaokao' as const },
      { text: '桌面压缩量 x = FN / k_e 极小（真实桌面远小于 1 mm），肉眼完全不可见；本动画为了让形变看得见，把 k_e 取到 50~300 N/m 并放大 200 倍。', importance: 'hard' as const },
    ],
  }
}

// ─── mode 2：绳拉力与拉伸量 ────────────────────────────────────────────

/** 中屏画的是绳被拉长 + T-x 关系图（ElasticTensionForceScene / TensionForceChart）。 */
function tensionPanel(
  m: number,
  kRope: number,
  base: PhysicsQuantity[],
): PhysicsPanelData {
  const { tensionForce, gravityForce, displacement } = calculateElasticTensionState(m, kRope)

  return {
    quantities: [
      ...base,
      { label: '重力 G', value: gravityForce.toFixed(1), unit: 'N' },
      { label: '绳拉力 T', value: tensionForce.toFixed(1), unit: 'N', highlight: 'positive' },
      { label: '绳伸长量 Δx', value: (displacement * 100).toFixed(2), unit: 'cm', highlight: 'extreme' },
      { label: '等效绳刚度 k_e', value: kRope.toFixed(0), unit: 'N/m' },
    ],
    formulas: [
      { name: '竖直方向平衡', latex: 'T = mg', level: 'core', condition: '重物静止悬挂' },
      { name: '拉力的弹力本质', latex: 'T = k_e \\Delta x', level: 'important', condition: '绳在弹性限度内' },
    ],
    gaokaoPoints: [
      { text: '绳的拉力同样是弹力：绳被拉伸后要收缩，从而对物体产生沿绳指向绳内部的拉力。', importance: 'core' as const },
      { text: '绳只能拉、不能压，所以绳对物体的力一定沿绳指向绳的固定端，方向不可能反过来。', importance: 'gaokao' as const },
      { text: '绳伸长量 Δx = T / k_e 极小（真实细绳远小于 1 mm），「绳不可伸长」只是把这段形变近似成零；动画把 k_e 取到 50~300 N/m 并放大 200 倍，伸长才看得见。', importance: 'hard' as const },
    ],
  }
}

// ─── 轻质物体突变模型：剪断瞬间与之后 ──────────────────────────────────

/**
 * `anim-light-weight-mutation` 恒走这里：它的整条时间轴从「已剪断」起算。
 *
 * ⚠ 不能用 params.isCut —— 该动画的 params 里根本没有 isCut 这个参数。
 * 若照 DEFAULTS 取 0，四球加速度会**全程恒为 0.00**，而右屏公式写的却是
 * 剪断后的值（a_A=g、a_C=2g…），两边自相矛盾，学生看右屏等于看一片 0。
 *
 * 逐帧给真实加速度：a_A、a_C、a_D 都会随弹簧恢复而振荡，
 * 所以 formula 标题统一写明「剪断瞬间」，与逐帧值区分开。
 */
function cutRopePanel(
  k: number,
  m: number,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData {
  const { forces: live } = calculateCutRopeState(
    k, m, time, 1, 0, CUT_ROPE_ANCHORS.ceilY, CUT_ROPE_ANCHORS.groundY,
  )

  const { a_A: aA, a_B: aB, a_C: aC, a_D: aD } = live

  return {
    quantities: [
      ...base,
      { label: '球 A 加速度 a_A', value: showAccel(aA), unit: 'm/s²', highlight: litAccel(aA) ? 'positive' : undefined },
      { label: '球 B 加速度 a_B', value: showAccel(aB), unit: 'm/s²', highlight: litAccel(aB) ? 'extreme' : undefined },
      { label: '球 C 加速度 a_C', value: showAccel(aC), unit: 'm/s²', highlight: litAccel(aC) ? 'extreme' : undefined },
      { label: '球 D 加速度 a_D', value: showAccel(aD), unit: 'm/s²', highlight: litAccel(aD) ? 'positive' : undefined },
    ],
    formulas: [
      { name: '剪断瞬间：A 球向上加速', latex: 'a_A = \\frac{F_{s1} - mg}{m} = \\frac{2mg - mg}{m} = g', level: 'core' },
      { name: '剪断瞬间：B 球自由落体', latex: 'a_B = \\frac{mg - T_1}{m} = \\frac{mg - 0}{m} = g', level: 'core' },
      { name: '剪断瞬间：C 球向下加速', latex: 'a_C = \\frac{mg + F_{s2}}{m} = \\frac{mg + mg}{m} = 2g', level: 'core' },
      { name: '剪断瞬间：D 球瞬时静止', latex: 'a_D = \\frac{mg - F_{s2}}{m} = \\frac{mg - mg}{m} = 0', level: 'core' },
    ],
    gaokaoPoints: [
      { text: '切断瞬间细绳弹力可突变为 0，因为细绳形变量极小、微元质量可忽略。', importance: 'core' as const },
      { text: '弹簧的弹力取决于两端的形变量，由于物体位移在瞬时不能突变，故弹簧弹力在瞬间保持不变。', importance: 'core' as const },
      { text: '高考解题切入点：先分析剪断前各连接体受力（求出弹簧力），再分析剪断瞬时，保持弹簧力不变而将绳子拉力置为 0，对各个物体进行隔离分析。', importance: 'gaokao' as const },
    ],
  }
}
