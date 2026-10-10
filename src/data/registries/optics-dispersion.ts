import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const opticsDispersionAnimations = defineAnimations({
  'anim-dispersion': {
    title: '光的色散与光谱综合',
    knowledgeId: 'wave-optics-1-6',
    Component: lazy(() => import('@/features/optics/dispersion/DispersionAnimation')),
    // 色散是麦克斯韦定态空间分布（稳定的出射光谱扇形与偏折角），无时间轴，
    // 由用户拖动「入射角 i」即时重绘光路，故严格使用 param 模式（OPTICS_RULES 铁律）。
    controlsMode: 'param' as const,
    defaultParams: {
      mode: 0,
      incidenceAngle: 50,
      showAngleMarks: 1,
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'mode',
        label: '演示模式',
        group: '模式选择',
        resetOnChange: true,
        options: [
          { label: '白光连续色散（彩带）', value: 0 },
          { label: '红-紫双色光路对比', value: 1 },
        ],
      },
      {
        type: 'toggle',
        key: 'showAngleMarks',
        label: '显示 r₁ / r₂ / i₂ 角度标注',
        group: '教学提示',
      },
      {
        type: 'preset',
        label: '最小偏向角对称光路',
        group: '典型光路预设',
        params: { mode: 1, incidenceAngle: 49 },
      },
      {
        type: 'preset',
        label: '大入射角极限光路',
        group: '典型光路预设',
        params: { mode: 1, incidenceAngle: 70 },
      },
      {
        type: 'preset',
        label: '经典白光色散演示',
        group: '典型光路预设',
        params: { mode: 0, incidenceAngle: 50 },
      },
      {
        type: 'tip',
        content:
          '白光经三棱镜后按 红→橙→黄→绿→蓝→靛→紫 展开为连续光谱：红光偏折最小（落最上方），紫光偏折最大（落最下方）。',
      },
      {
        type: 'tip',
        content:
          '同一介质中 λ 越小 → 频率 ν 越大 → 折射率 n 越大 → 光速 v 越小 → 临界角 C 越小 → 双缝条纹间距 Δx 越小 → 光子能量 E 越大。',
      },
      {
        type: 'tip',
        content:
          '偏向角 δ 随入射角 i 先减小后增大。光路左右对称时 δ 最小：δ_min = 2arcsin(n·sin(A/2)) − A，此时 i = (A + δ_min)/2。',
      },
    ],
    paramMeta: [
      {
        key: 'incidenceAngle',
        label: '入射角 i',
        min: 45,
        max: 70,
        step: 1,
        unit: '°',
        description: '等边三棱镜在 i ≈ 49° 时光路左右对称，偏向角取最小值',
        marks: [{ value: 49, label: '最小偏向角', variant: 'recommended' }],
      },
    ],
  },
})
