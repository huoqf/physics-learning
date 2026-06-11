import { GRAVITY } from '@/physics/constants'
import type { ForceMotionModeOption, ForceMotionParamConfig } from './ForceMotionTypes'

// ═══════════════════════════════════════════════════════════════════════════════
// 10大运动模式定义
// ═══════════════════════════════════════════════════════════════════════════════

export const FORCE_MOTION_MODES: ForceMotionModeOption[] = [
  { value: 0, label: '平衡状态', description: 'F合=0，a=0，v恒定', category: 'basic' },
  { value: 1, label: '匀加速直线', description: '恒力，a恒定，v-t直线', category: 'basic' },
  { value: 2, label: '匀减速直线', description: '恒力反向，刹车陷阱', category: 'basic' },
  { value: 3, label: '匀变速曲线', description: '定角力，如斜抛', category: 'curve' },
  { value: 4, label: '类平抛运动', description: '初速垂直于恒力', category: 'curve' },
  { value: 5, label: '匀速圆周运动', description: '向心力，v大小不变', category: 'circular' },
  { value: 6, label: '变速圆周运动', description: '竖直面内，绳/杆模型', category: 'circular' },
  { value: 7, label: '简谐运动', description: 'F=-kx，弹簧振子', category: 'variable' },
  { value: 8, label: '线性变力运动', description: 'F=κt，动量定理', category: 'variable' },
  { value: 9, label: '收尾变力运动', description: 'P/v或kv，收尾速度', category: 'terminal' },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 各模式参数配置（每模式不超过5个参数）
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_PARAMS: ForceMotionParamConfig[] = [
  { key: 'v0', label: '初速度 v₀', min: 0, max: 10, step: 0.5, unit: 'm/s', defaultValue: 5 },
  { key: 'theta', label: '力与速度夹角 θ', min: 0, max: 180, step: 1, unit: '°', defaultValue: 0 },
  { key: 'm', label: '质量 m', min: 0.5, max: 20, step: 0.5, unit: 'kg', defaultValue: 2 },
]

export const FORCE_MOTION_PARAM_CONFIGS: Record<number, ForceMotionParamConfig[]> = {
  0: [
    { key: 'v0', label: '初速度 v₀', min: 0, max: 10, step: 0.5, unit: 'm/s', defaultValue: 5 },
    { key: 'theta', label: '速度方向 θ', min: 0, max: 360, step: 1, unit: '°', defaultValue: 0 },
    { key: 'm', label: '质量 m', min: 0.5, max: 20, step: 0.5, unit: 'kg', defaultValue: 2 },
  ],
  1: [
    ...BASE_PARAMS,
    { key: 'env1', label: '合外力大小 F', min: 1, max: 50, step: 1, unit: 'N', defaultValue: 10 },
  ],
  2: [
    ...BASE_PARAMS,
    { key: 'env1', label: '阻力大小 F', min: 1, max: 50, step: 1, unit: 'N', defaultValue: 10 },
  ],
  3: [
    ...BASE_PARAMS,
    { key: 'env1', label: '重力加速度 g', min: 1, max: 20, step: 0.1, unit: 'm/s²', defaultValue: GRAVITY },
  ],
  4: [
    { key: 'v0', label: '初速度 v₀', min: 0, max: 10, step: 0.5, unit: 'm/s', defaultValue: 5 },
    { key: 'theta', label: '力与速度夹角 θ', min: 0, max: 180, step: 1, unit: '°', defaultValue: 90 },
    { key: 'm', label: '质量 m', min: 0.5, max: 20, step: 0.5, unit: 'kg', defaultValue: 2 },
    { key: 'env1', label: '电场力 F', min: 1, max: 50, step: 1, unit: 'N', defaultValue: 10 },
  ],
  5: [
    { key: 'v0', label: '线速度 v', min: 1, max: 10, step: 0.5, unit: 'm/s', defaultValue: 5 },
    { key: 'm', label: '质量 m', min: 0.5, max: 20, step: 0.5, unit: 'kg', defaultValue: 2 },
    { key: 'env1', label: '圆周半径 R', min: 1, max: 10, step: 0.5, unit: 'm', defaultValue: 5 },
  ],
  6: [
    { key: 'v0', label: '最低点速度 v₀', min: 1, max: 15, step: 0.5, unit: 'm/s', defaultValue: 8 },
    { key: 'm', label: '质量 m', min: 0.5, max: 20, step: 0.5, unit: 'kg', defaultValue: 2 },
    { key: 'env1', label: '圆周半径 R', min: 1, max: 10, step: 0.5, unit: 'm', defaultValue: 5 },
    { key: 'env2', label: '约束模型', min: 0, max: 1, step: 1, unit: '(0绳/1杆)', defaultValue: 0 },
  ],
  7: [
    { key: 'v0', label: '初速度 v₀', min: 0, max: 10, step: 0.5, unit: 'm/s', defaultValue: 5 },
    { key: 'm', label: '质量 m', min: 0.5, max: 20, step: 0.5, unit: 'kg', defaultValue: 2 },
    { key: 'env1', label: '劲度系数 k', min: 10, max: 200, step: 5, unit: 'N/m', defaultValue: 60 },
  ],
  8: [
    ...BASE_PARAMS,
    { key: 'env1', label: '力增长率 κ', min: 1, max: 50, step: 1, unit: 'N/s', defaultValue: 8 },
  ],
  9: [
    { key: 'v0', label: '初速度 v₀', min: 0, max: 10, step: 0.5, unit: 'm/s', defaultValue: 2 },
    { key: 'm', label: '质量 m', min: 0.5, max: 20, step: 0.5, unit: 'kg', defaultValue: 2 },
    { key: 'env1', label: '功率 P 或 驱动力 F_drive', min: 10, max: 500, step: 10, unit: 'W 或 N', defaultValue: 100 },
    { key: 'env2', label: '阻力 f 或 kf', min: 0.5, max: 50, step: 0.5, unit: 'N 或 N·s/m', defaultValue: 10 },
    { key: 'env3', label: '子模式', min: 0, max: 1, step: 1, unit: '(0功率/1阻力)', defaultValue: 0 },
  ],
}

// ═══════════════════════════════════════════════════════════════════════════════
// 布局常量
// ═══════════════════════════════════════════════════════════════════════════════

export const FORCE_MOTION_SAMPLE_COUNT = 120
export const FORCE_MOTION_VECTOR_MAX_RATIO = 0.18
export const FORCE_MOTION_SANDBOX_ORIGIN_X_RATIO = 0.5
export const FORCE_MOTION_SANDBOX_ORIGIN_Y_RATIO = 0.5
export const FORCE_MOTION_CHART_PADDING_RATIO = 0.12
export const FORCE_MOTION_OBJECT_SIZE_RATIO = 0.075

// 边界检测阈值
export const FORCE_MOTION_BOUNDARY_X = 50
export const FORCE_MOTION_BOUNDARY_Y = 50
export const FORCE_MOTION_TERMINAL_EPSILON = 0.05
