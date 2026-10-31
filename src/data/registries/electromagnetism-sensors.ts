import { lazyWithPreload as lazy } from '@/utils/lazyWithPreload'
import { defineAnimations } from '../defineAnimations'

export const electromagnetismSensorsAnimations = defineAnimations({
  'anim-sensors': {
    title: '常见传感器及其工作原理与应用',
    knowledgeId: 'electricity-7-1',
    Component: lazy(() => import('@/features/electromagnetism/sensors/SensorAnimation')),
    CenterExtra: lazy(() => import('@/features/electromagnetism/sensors/SensorCenterExtra')),
    centerExtraHeight: 'h-1/2',
    controlsMode: 'param' as const,
    defaultParams: {
      sensorType: 0,
      illuminance: 100,
      temperature: 25,
      magneticB: 1.0,
      currentI: 0.8,
      carrierType: 0,
      capacitorGap: 3.0,
      rFixed: 5000,
    } as const,
    controlMeta: [
      {
        type: 'segmented',
        key: 'sensorType',
        label: '传感器类型',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '光敏电阻' },
          { value: 1, label: '热敏电阻' },
          { value: 2, label: '霍尔元件' },
          { value: 3, label: '电容传感器' },
        ],
      },
      {
        type: 'preset',
        label: '💡 光控路灯 (常闭继电器)',
        description: '天黑阻值大、回路电流小，弹簧拉回衔铁闭合常闭触点点亮路灯',
        params: { sensorType: 0, illuminance: 30, rFixed: 5000 },
        showIf: 'sensorType',
        showIfValue: 0,
      },
      {
        type: 'preset',
        label: '🔥 火警报警 (NTC热敏)',
        description: '超温(>60℃)阻值剧降电流增大，电磁铁吸合常开触点接通电铃',
        params: { sensorType: 1, temperature: 75, rFixed: 3000 },
        showIf: 'sensorType',
        showIfValue: 1,
      },
      {
        type: 'preset',
        label: '🧭 霍尔效应 (极性判定)',
        description: 'N型电子导电上表面为负极；P型空穴导电上表面为正极',
        params: { sensorType: 2, magneticB: 1.2, currentI: 1.0, carrierType: 0 },
        showIf: 'sensorType',
        showIfValue: 2,
      },
      {
        type: 'preset',
        label: '📏 压力位移 (电容传感器)',
        description: '极板受压间距 d 减小，电容 C 反比增大，用于测微位移与加速度',
        params: { sensorType: 3, capacitorGap: 1.4 },
        showIf: 'sensorType',
        showIfValue: 3,
      },
      {
        type: 'segmented',
        key: 'carrierType',
        label: '半导体载流子类型',
        group: '微观属性',
        showIf: 'sensorType',
        showIfValue: 2,
        options: [
          { value: 0, label: 'N型·电子导电' },
          { value: 1, label: 'P型·空穴导电' },
        ],
      },
      {
        type: 'tip',
        group: '教学提示',
        variant: 'info',
        // 原四条「观察重点/易错点」含公式搬运与结论（C=εrS/(4πkd)、上表面电势高低），
        // 已改写为观察任务：右屏 formulas/gaokaoPoints 给出关系式与结论，左屏只留"看哪里"（§2.6.5）。
        content: (p) => {
          if (p.sensorType === 0) {
            return '打开日照模拟：看阻值曲线怎么塌下去，再看继电器的触点有没有被吸合——路灯白天灭、晚上亮。'
          }
          if (p.sensorType === 1) {
            return '把温度往上拖：阻值骤降、电流变大、继电器吸合。盯住报警灯亮起的那一刻对应多少度。'
          }
          if (p.sensorType === 2) {
            return '切换 N 型与 P 型，只盯电压表的正负号：两种载流子受力方向相同，为什么上下表面的电势高低会反过来？'
          }
          return '压紧极板，盯 d 与 C 两条曲线：间距减半时电容变成几倍？再继续压到极限间距，看报警何时触发。'
        },
      },
    ],
    paramMeta: [
      { key: 'illuminance', label: '光照强度 E', min: 10, max: 600, step: 10, unit: 'lx', showIf: 'sensorType', showIfValue: 0 },
      { key: 'temperature', label: '环境温度 T', min: 0, max: 90, step: 2, unit: '℃', showIf: 'sensorType', showIfValue: 1 },
      { key: 'magneticB', label: '磁感应强度 B', min: 0.1, max: 2.0, step: 0.05, unit: 'T', showIf: 'sensorType', showIfValue: 2 },
      { key: 'currentI', label: '控制电流 I', min: 0.2, max: 2.0, step: 0.1, unit: 'A', showIf: 'sensorType', showIfValue: 2 },
      { key: 'capacitorGap', label: '极板间距 d', min: 1.0, max: 10.0, step: 0.2, unit: 'mm', showIf: 'sensorType', showIfValue: 3 },
      { key: 'rFixed', label: '变阻器阻值 R₀', min: 1000, max: 20000, step: 500, unit: 'Ω', showIf: 'sensorType', showIfValue: [0, 1] },
    ],
  },
})
