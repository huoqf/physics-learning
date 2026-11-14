import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'
import {
  computeMomentumExperimentDuration,
  getExperimentMomentumCriticalTimes,
  momentumExperimentInputFromParams,
} from '@/physics/experimentMomentum'
import { getMomentumCriticalTimes } from '@/physics/momentum'
import { getImpulseConceptCriticalTimes } from '@/physics/impulse'
import { getMomentumTheoremCriticalTimes } from '@/physics/momentumTheorem'
import { getMomentumConservationCriticalTimes } from '@/physics/momentumConservation'
import { getCollisionCriticalTimes } from '@/physics/collision'
import { getCurvedSlotCriticalTimes } from '@/physics/momentumApplication/curvedSlot'
import { getSpringBlocksCriticalTimes } from '@/physics/momentumApplication/springBlocks'
import { getBulletBlockCriticalTimes } from '@/physics/bulletBlock'
import { getManBoatCriticalTimes } from '@/physics/momentumApplication/manBoat'

/**
 * 基础/进阶模式时间轴时长 (s)。
 * 两球碰撞与滑块-木板模型碰后即匀速，物理过程无自然终点，沿用历史全局默认值 30s。
 */
const MOMENTUM_BASE_MAX_TIME = 30

export const mechanicsMomentumAnimations = defineAnimations({
  'anim-momentum': {
    title: '动量',
    knowledgeId: 'mechanics-8-1',
    Component: lazy(() => import('@/features/mechanics/momentum/MomentumAnimation')),
    criticalTimes: (p) => getMomentumCriticalTimes(p, MOMENTUM_BASE_MAX_TIME),
    defaultParams: { m: 3, v: 4, mA: 3, vA: 5, mB: 2, vB: -3, advancedMode: 0, showEkChart: 1 } as const,
    paramMeta: [
      { key: 'm', label: '质量 m', min: 1, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'v', label: '速度 v', min: 1, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'mA', label: 'A球质量 m_A', min: 1, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'vA', label: 'A球速度 v_A', min: -10, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'mB', label: 'B球质量 m_B', min: 1, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'vB', label: 'B球速度 v_B', min: -10, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 1 },
    ],
    controlMeta: [
      { type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础' }, { value: 1, label: '进阶' }] },
      { type: 'toggle', key: 'showEkChart', label: '显示 Ek-p 关系图', group: '显示辅助',
        showIf: 'advancedMode', showIfValue: 1 },
    ],
  },
  'anim-impulse-concept': {
    title: '冲量',
    knowledgeId: 'mechanics-8-2',
    Component: lazy(() => import('@/features/mechanics/momentum/ImpulseAnimation')),
    criticalTimes: (p) => getImpulseConceptCriticalTimes(p, MOMENTUM_BASE_MAX_TIME),
    defaultParams: { F: 10, t_duration: 3, FMax: 10, t_total: 3, forceType: 0, advancedMode: 0 } as const,
    paramMeta: [
      { key: 'F', label: '恒力 F', min: 1, max: 20, step: 0.5, unit: 'N', showIf: 'advancedMode', showIfValue: 0 },
      { key: 't_duration', label: '作用时间 t', min: 1, max: 10, step: 0.5, unit: 's', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'FMax', label: '力最大值 F_max', min: 1, max: 20, step: 0.5, unit: 'N', showIf: 'advancedMode', showIfValue: 1 },
      { key: 't_total', label: '作用总时间 t', min: 1, max: 10, step: 0.5, unit: 's', showIf: 'advancedMode', showIfValue: 1 },
    ],
    controlMeta: [
      { type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础' }, { value: 1, label: '进阶' }] },
      { type: 'segmented', key: 'forceType', label: '力变化类型', group: '模型选择', resetOnChange: true,
        showIf: 'advancedMode', showIfValue: 1,
        options: [{ value: 0, label: '线性衰减' }, { value: 1, label: '正弦半波' }] },
    ],
  },
  'anim-impulse': {
    title: '动量定理',
    knowledgeId: 'mechanics-8-3',
    Component: lazy(() => import('@/features/mechanics/momentum/MomentumTheoremAnimation')),
    CenterExtra: lazy(() => import('@/features/mechanics/momentum/MomentumTheoremChartsExtra')),
    centerLayout: 'splitH',
    criticalTimes: (p) => getMomentumTheoremCriticalTimes(p, MOMENTUM_BASE_MAX_TIME),
    defaultParams: { m: 2, h: 2, k: 5, rho: 1000, S: 0.01, v_fluid: 5, alpha: 0, advancedMode: 0, showGravity: 1, showVelocity: 1, showNormalForce: 1 } as const,
    paramMeta: [
      { key: 'm', label: '物体质量 m', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'h', label: '下落高度 h', min: 0.5, max: 5, step: 0.5, unit: 'm', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'k', label: '缓冲垫阻尼系数 k', min: 1, max: 20, step: 1, unit: 'kg/s', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'rho', label: '流体密度 ρ', min: 500, max: 5000, step: 100, unit: 'kg/m³', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'S', label: '截面积 S', min: 0.005, max: 0.02, step: 0.001, unit: 'm²', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'v_fluid', label: '流速 v', min: 1, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'alpha', label: '反弹系数 α', min: 0, max: 1, step: 0.1, unit: '', showIf: 'advancedMode', showIfValue: 1 },
    ],
    controlMeta: [
      { type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础' }, { value: 1, label: '进阶' }] },
      { type: 'toggle', key: 'showGravity', label: '重力 mg', group: '矢量显示', showIf: 'advancedMode', showIfValue: 0 },
      { type: 'toggle', key: 'showVelocity', label: '速度 v', group: '矢量显示', showIf: 'advancedMode', showIfValue: 0 },
      { type: 'toggle', key: 'showNormalForce', label: '支持力 FN', group: '矢量显示', showIf: 'advancedMode', showIfValue: 0 },
      { type: 'tip', group: '教学提示', showIf: 'advancedMode', showIfValue: 0,
        // 公式（I_N − I_g = Δp、Δp = 2mv）右屏已给出，左屏只解释"调 k 会看到什么"。
        content: '把弹性垫调软（k 调小）再看峰值力：动量变化量不变，缓冲时间变长，冲击力就跟着变小。' },
    ],
  },
  'anim-momentum-conservation': {
    title: '动量守恒定律',
    knowledgeId: 'mechanics-8-4',
    Component: lazy(() => import('@/features/mechanics/momentum/MomentumConservationAnimation')),
    maxTime: MOMENTUM_BASE_MAX_TIME,
    criticalTimes: (p) => getMomentumConservationCriticalTimes(p, MOMENTUM_BASE_MAX_TIME),
    defaultParams: {
      m1: 3,
      v1: 5,
      m2: 2,
      v2: 0,
      m_slider: 1,
      M_board: 3,
      v0: 6,
      mu: 0.3,
      L: 2,
      advancedMode: 0,
      collisionType: 0,
      e_coefficient: 0.5,
    } as const,
    paramMeta: [
      { key: 'm1', label: 'A球质量 m₁', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'v1', label: 'A球速度 v₁', min: -10, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'm2', label: 'B球质量 m₂', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'v2', label: 'B球速度 v₂', min: -10, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'm_slider', label: '滑块质量 m', min: 0.5, max: 5, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'M_board', label: '木板质量 M', min: 1, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'v0', label: '滑块初速度 v₀', min: 1, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'mu', label: '动摩擦因数 μ', min: 0.1, max: 0.6, step: 0.05, unit: '', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'L', label: '木板长度 L', min: 0.5, max: 5, step: 0.5, unit: 'm', showIf: 'advancedMode', showIfValue: 1 },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'advancedMode',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '两球碰撞' },
          { value: 1, label: '滑块木板' },
        ],
      },
      {
        type: 'segmented',
        key: 'collisionType',
        label: '碰撞类型',
        group: '模型选择',
        resetOnChange: true,
        showIf: 'advancedMode',
        showIfValue: 0,
        options: [
          { value: 0, label: '弹性' },
          { value: 1, label: '完全非弹性' },
          { value: 2, label: '恢复系数可调' },
        ],
      },
      {
        type: 'number',
        key: 'e_coefficient',
        label: '恢复系数 e',
        min: 0,
        max: 1,
        step: 0.05,
        unit: '',
        showIf: 'collisionType',
        showIfValue: 2,
        resetOnChange: true,
      },
    ],
  },
  'anim-experiment-momentum': {
    title: '验证动量守恒定律（气轨光电门）',
    knowledgeId: 'experiment-2-3',
    Component: lazy(() => import('@/features/mechanics/momentum/ExperimentMomentumAnimation')),
    maxTime: (params) =>
      computeMomentumExperimentDuration(momentumExperimentInputFromParams(params)),
    criticalTimes: (p) => getExperimentMomentumCriticalTimes(p),
    defaultParams: {
      m1_exp: 0.4,
      m2_exp: 0.2,
      v1_exp: 0.8,
      plateWidth_mm: 20.0,
      collisionType_exp: 0,
      timing_err: 0.0,
    } as const,
    paramMeta: [
      { key: 'm1_exp', label: '滑块1质量 m₁', min: 0.1, max: 1.0, step: 0.01, unit: 'kg' },
      { key: 'm2_exp', label: '滑块2质量 m₂', min: 0.1, max: 1.0, step: 0.01, unit: 'kg' },
      { key: 'v1_exp', label: '碰前初速度 v₁', min: 0.2, max: 2.0, step: 0.1, unit: 'm/s' },
      { key: 'plateWidth_mm', label: '挡光片宽度 Δx', min: 10, max: 40, step: 2, unit: 'mm' },
      {
        key: 'timing_err',
        label: '计时误差 Δt_err',
        min: -2.0,
        max: 2.0,
        step: 0.1,
        unit: 'ms',
        marks: [{ value: 0.5, label: '+0.5ms偏差', variant: 'critical' }],
      },
    ],
    controlMeta: [
      {
        type: 'segmented',
        key: 'collisionType_exp',
        label: '碰撞端面',
        group: '实验设置',
        resetOnChange: true,
        options: [
          { value: 0, label: '弹性·弹簧片' },
          { value: 1, label: '完全非弹性' },
        ],
      },
      {
        type: 'preset',
        label: '🧲 完全非弹性碰（粘合成一体）',
        description: '碰后两滑块粘合成一体同速滑行，机械能损失达到理论最大',
        params: { m1_exp: 0.3, m2_exp: 0.3, v1_exp: 0.9, plateWidth_mm: 20.0, collisionType_exp: 1, timing_err: 0.0 },
        restartOnApply: true,
      },
      {
        type: 'preset',
        label: '💥 质量差反弹碰撞（m₁<m₂）',
        description: '轻滑块撞击静止重滑块后反向弹回，验证动量守恒与矢量负号',
        params: { m1_exp: 0.2, m2_exp: 0.6, v1_exp: 0.8, plateWidth_mm: 20.0, collisionType_exp: 0, timing_err: 0.0 },
        restartOnApply: true,
      },
    ],
  },
  'anim-collision': {
    title: '弹性碰撞与非弹性碰撞',
    knowledgeId: 'mechanics-8-5',
    Component: lazy(() => import('@/features/mechanics/momentum/CollisionAnimation')),
    criticalTimes: (p) => getCollisionCriticalTimes(p, MOMENTUM_BASE_MAX_TIME),
    defaultParams: { m1: 3, v1: 5, m2: 2, v2: 0, isElastic: 1, mA: 3, vA: 5, mB: 2, kLoss: 0, advancedMode: 0 } as const,
    paramMeta: [
      { key: 'm1', label: 'A球质量 m₁', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'v1', label: 'A球速度 v₁', min: -10, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'm2', label: 'B球质量 m₂', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 0 },
      { key: 'mA', label: 'A球质量 m_A', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'mB', label: 'B球质量 m_B', min: 0.5, max: 10, step: 0.5, unit: 'kg', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'vA', label: 'A球初速度 v_A', min: 1, max: 10, step: 0.5, unit: 'm/s', showIf: 'advancedMode', showIfValue: 1 },
      { key: 'kLoss', label: '非弹性程度 k', min: 0, max: 1, step: 0.1, unit: '', showIf: 'advancedMode', showIfValue: 1 },
    ],
    controlMeta: [
      { type: 'segmented', key: 'advancedMode', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '基础' }, { value: 1, label: '进阶' }] },
      { type: 'segmented', key: 'isElastic', label: '碰撞类型', group: '模型选择', resetOnChange: true,
        hideIf: 'advancedMode', hideIfValue: 1,
        options: [{ value: 1, label: '完全弹性' }, { value: 0, label: '完全非弹性' }] },
    ],
  },
  'anim-curved-slot': {
    title: '弧形槽与滑块模型',
    knowledgeId: 'mechanics-8-6-1',
    Component: lazy(() => import('@/features/mechanics/momentum/CurvedSlotAnimation')),
    criticalTimes: (p) => getCurvedSlotCriticalTimes(p, 6),
    defaultParams: {
      m_block: 2,
      M_slot: 5,
      R_slot: 1.5,
      isFixed: 0,
      slotShape: 0,
      showVectors: 1,
      showDisplacement: 0,
    } as const,
    paramMeta: [
      { key: 'm_block', label: '滑块质量 m', min: 0.5, max: 5, step: 0.1, unit: 'kg' },
      { key: 'M_slot', label: '弧形槽质量 M', min: 1, max: 10, step: 0.1, unit: 'kg' },
      { key: 'R_slot', label: '轨道半径 R', min: 0.8, max: 2.5, step: 0.1, unit: 'm' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'isFixed', label: '轨道约束状态', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '自由滑动' }, { value: 1, label: '固定在地面' }] },
      { type: 'segmented', key: 'slotShape', label: '轨道物理形状', group: '模型选择', resetOnChange: true,
        options: [{ value: 0, label: '四分之一滑出' }, { value: 1, label: '对称半圆轨道' }] },
      { type: 'toggle', key: 'showVectors', label: '显示受力分析', group: '显示辅助' },
      { type: 'toggle', key: 'showDisplacement', label: '显示位移标注', group: '显示辅助' },
    ],
  },
  'anim-spring-blocks': {
    title: '弹簧-双滑块模型',
    knowledgeId: 'mechanics-8-6-2',
    Component: lazy(() => import('@/features/mechanics/momentum/SpringBlocksAnimation')),
    criticalTimes: (p) => getSpringBlocksCriticalTimes(p, MOMENTUM_BASE_MAX_TIME),
    defaultParams: {
      mA_spring: 2,
      mB_spring: 3,
      v0_spring: 5,
      k_spring: 20,
      connectionMode_spring: 0,
    } as const,
    paramMeta: [
      { key: 'mA_spring', label: '滑块 A 质量 m_A', min: 0.5, max: 5, step: 0.1, unit: 'kg' },
      { key: 'mB_spring', label: '滑块 B 质量 m_B', min: 0.5, max: 5, step: 0.1, unit: 'kg' },
      { key: 'v0_spring', label: 'A 初速度 v₀', min: 2, max: 8, step: 0.2, unit: 'm/s' },
      { key: 'k_spring', label: '劲度系数 k', min: 5, max: 50, step: 1, unit: 'N/m' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'connectionMode_spring', label: '弹簧连接方式', group: '模型选择', resetOnChange: true,
        options: [{ label: '非固连·分离', value: 0 }, { label: '固连·往复', value: 1 }] },
      { type: 'preset', label: '等质交换速度', group: '典型工况',
        params: { mA_spring: 2, mB_spring: 2, v0_spring: 5, k_spring: 20, connectionMode_spring: 0 } },
      { type: 'preset', label: '小碰大 (反弹)', group: '典型工况',
        params: { mA_spring: 1.5, mB_spring: 4.5, v0_spring: 6, k_spring: 20, connectionMode_spring: 0 } },
      { type: 'preset', label: '大碰小 (同向)', group: '典型工况',
        params: { mA_spring: 4.5, mB_spring: 1.5, v0_spring: 5, k_spring: 20, connectionMode_spring: 0 } },
      { type: 'preset', label: '固连往复振动', group: '典型工况',
        params: { mA_spring: 2, mB_spring: 3, v0_spring: 5, k_spring: 25, connectionMode_spring: 1 } },
      { type: 'tip', group: '教学提示',
        content: '只盯那条黄色质心中轴线：改 m_A、m_B 与 v₀ 它动不动？再改劲度 k，看两条速度曲线的波幅怎么变。' },
    ],
  },
  'anim-bullet-block': {
    title: '子弹打木块模型',
    knowledgeId: 'mechanics-8-7',
    Component: lazy(() => import('@/features/mechanics/momentum/BulletBlockAnimation')),
    criticalTimes: (p) => getBulletBlockCriticalTimes(p, MOMENTUM_BASE_MAX_TIME),
    defaultParams: { m: 0.1, M: 0.4, v0: 30, f: 10, L: 0.5, showDeltaX: 1 } as const,
    paramMeta: [
      { key: 'm', label: '子弹质量 m', min: 0.05, max: 0.20, step: 0.01, unit: 'kg' },
      { key: 'M', label: '木块质量 M', min: 0.2, max: 1.0, step: 0.1, unit: 'kg' },
      { key: 'v0', label: '子弹初速度 v₀', min: 10, max: 50, step: 1, unit: 'm/s' },
      { key: 'f', label: '恒定阻力 f', min: 5, max: 25, step: 1, unit: 'N' },
      { key: 'L', label: '木块厚度 L', min: 0.1, max: 1.0, step: 0.05, unit: 'm' },
    ],
    controlMeta: [
      { type: 'toggle', key: 'showDeltaX', label: '相对位移指示器', group: '显示辅助' },
      {
        type: 'preset',
        label: '留存共速',
        group: '典型工况',
        params: { m: 0.1, M: 0.4, v0: 8, f: 10, L: 1 }
      },
      {
        type: 'preset',
        label: '临界穿透',
        group: '典型工况',
        params: { m: 0.1, M: 0.4, v0: 15, f: 10, L: 1 }
      },
      {
        type: 'preset',
        label: '完全穿透',
        group: '典型工况',
        params: { m: 0.1, M: 0.4, v0: 30, f: 10, L: 1 }
      },
      { type: 'tip', group: '教学提示',
        // 原 181 字把每个预设的 v_crit 与穿透深度都写出来了（等于直接给答案，§2.6.5 C1），
        // 且这些数值右屏看板已实时给出。左屏只留"该看什么"。
        content: '三个预设分别是"留存共速 / 恰好临界 / 完全穿透"三种结局；动画在共速或穿出后再走 1-2 秒即停。' },
    ],
  },
  'anim-man-boat': {
    title: '人船模型',
    knowledgeId: 'mechanics-8-6-3',
    Component: lazy(() => import('@/features/mechanics/momentum/ManBoatAnimation')),
    criticalTimes: (p) => getManBoatCriticalTimes(p, MOMENTUM_BASE_MAX_TIME),
    defaultParams: {
      m_person: 50,
      m_person2: 60,
      M_boat: 150,
      L_boat: 4,
      manBoatControl: 0,
      manBoatMode: 0,
    } as const,
    paramMeta: [
      { key: 'm_person', label: '人质量 m', min: 30, max: 100, step: 2, unit: 'kg' },
      { key: 'M_boat', label: '船质量 M', min: 50, max: 300, step: 10, unit: 'kg' },
      { key: 'L_boat', label: '船长 L', min: 3, max: 7, step: 0.2, unit: 'm' },
    ],
    controlMeta: [
      { type: 'segmented', key: 'manBoatControl', label: '控制方式', group: '模型选择',
        options: [{ label: '自动走动', value: 0 }, { label: '键盘互动', value: 1 }] },
      { type: 'segmented', key: 'manBoatMode', group: '模型选择', resetOnChange: true,
        showIf: 'manBoatControl', showIfValue: 0,
        options: [
          { label: '单人走动', value: 0 },
          { label: '双人交换', value: 1 },
          { label: '相向汇合', value: 2 },
          { label: '依次走动', value: 3 },
        ] },
      { type: 'number', key: 'm_person2', label: '人2质量 m₂', min: 30, max: 100, step: 2, unit: 'kg',
        showIf: 'manBoatControl', showIfValue: 0 },
      { type: 'preset', label: '等质交换 (船不移)', group: '典型工况',
        params: { m_person: 50, m_person2: 50, M_boat: 150, L_boat: 4, manBoatMode: 1, manBoatControl: 0 },
        showIf: 'manBoatControl', showIfValue: 0 },
      { type: 'preset', label: '不等质交换位置', group: '典型工况',
        params: { m_person: 50, m_person2: 80, M_boat: 150, L_boat: 4, manBoatMode: 1, manBoatControl: 0 },
        showIf: 'manBoatControl', showIfValue: 0 },
      { type: 'preset', label: '相向走向中央', group: '典型工况',
        params: { m_person: 50, m_person2: 70, M_boat: 150, L_boat: 4, manBoatMode: 2, manBoatControl: 0 },
        showIf: 'manBoatControl', showIfValue: 0 },
      { type: 'tip', group: '操作提示', showIf: 'manBoatControl', showIfValue: 1,
        content: '请点击主画面使其获取焦点，然后使用键盘 ←（左方向键）或 →（右方向键）即可操控小人在船上行走！' },
      { type: 'tip', group: '教学提示',
        // 质心守恒的结论与公式右屏已有（quantities/momentum/manBoat.ts 看板 x_cm + 公式 + gaokaoPoint），
        // 左屏改为"盯哪个点看"，避免同一句话在两侧各说一遍。
        content: '盯着那颗质心十字星：变速、中途停顿、先后走动，它都不动——再看四种模式下船的位移有何不同。' },
    ],
  },
})
