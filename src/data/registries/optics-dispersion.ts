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
          { label: '白光色散', value: 0 },
          { label: '红紫双色光路', value: 1 },
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
        type: 'tip',
        content:
          '白光经三棱镜后按 红→橙→黄→绿→蓝→靛→紫 展开为连续光谱：红光偏折最小（落最上方），紫光偏折最大（落最下方）。',
      },
      {
        type: 'tip',
        // 原「λ→ν→n→v→C→Δx→E」七连因果链属考点总结（§2.6.5 C3），右屏 gaokaoPoints 已给；
        // 左屏改为可观察的对比任务，只留一句"差别都源于折射率"的判据（B 档）。
        content:
          '锁定一束单色光，从红换到紫：看它在棱镜里偏折多少、出射后的条纹间距怎么变——差别都源于折射率不同。',
      },
      {
        type: 'tip',
        // 原 δ_min 公式与对称条件属公式搬运（§2.6.5 C2），右屏 FormulaSection 已给出
        content: '慢慢改入射角：偏向角先变小后变大，在光路左右对称的那一刻取到最小值——找到那个位置再看两侧角度。',
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
