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
      rFixed: 5000,
      vThreshold: 2.5,
    } as const,
    controlMeta: [
      {
        type: 'preset',
        label: '📋 高考真题：光敏电阻光控路灯',
        description: '暗环境阻值大，分压输出升高触发继电器开启路灯',
        params: { sensorType: 0, illuminance: 30, rFixed: 5000, vThreshold: 2.5 },
      },
      {
        type: 'preset',
        label: '📋 高考真题：NTC火警报警电路',
        description: '常温10kΩ，超温(>60℃)阻值降至门限以下触发电铃',
        params: { sensorType: 1, temperature: 70, rFixed: 3000, vThreshold: 2.5 },
      },
      {
        type: 'preset',
        label: '📋 高考压轴：霍尔元件极性判定',
        description: 'N型电子导电上表面为负极；P型空穴导电上表面为正极',
        params: { sensorType: 2, magneticB: 1.2, currentI: 1.0, carrierType: 0 },
      },
      {
        type: 'segmented',
        key: 'sensorType',
        label: '传感器类型',
        group: '模型选择',
        resetOnChange: true,
        options: [
          { value: 0, label: '光敏电阻 (光控路灯)' },
          { value: 1, label: 'NTC热敏电阻 (火警报警)' },
          { value: 2, label: '霍尔元件 (磁电转换)' },
        ],
      },
      {
        type: 'segmented',
        key: 'carrierType',
        label: '半导体载流子类型',
        group: '微观属性',
        showIf: 'sensorType',
        showIfValue: 2,
        options: [
          { value: 0, label: 'N型 (电子导电, q<0)' },
          { value: 1, label: 'P型 (空穴导电, q>0)' },
        ],
      },
      {
        type: 'tip',
        group: '教学提示',
        variant: 'info',
        content: (p) => {
          if (p.sensorType === 0) {
            return '【光敏电阻规律】：光照越强，光生载流子越多，电阻越小。调节滑动变阻器可改变路灯在黄昏或深夜动作的灵敏度。'
          }
          if (p.sensorType === 1) {
            return '【NTC热敏规律】：温度升高电阻急剧减小（指数关系）。注意区分PTC（正温度系数）与NTC（负温度系数）。'
          }
          return '【霍尔效应关键考点】：自由电子与正空穴均受向上的洛伦兹力偏转，但电子积聚使上表面电势低，空穴积聚使上表面电势高！'
        },
      },
    ],
    paramMeta: [
      { key: 'illuminance', label: '光照强度 E', min: 10, max: 600, step: 10, unit: 'lx', showIf: 'sensorType', showIfValue: 0 },
      { key: 'temperature', label: '环境温度 T', min: 0, max: 90, step: 2, unit: '℃', showIf: 'sensorType', showIfValue: 1 },
      { key: 'magneticB', label: '磁感应强度 B', min: 0.1, max: 2.0, step: 0.05, unit: 'T', showIf: 'sensorType', showIfValue: 2 },
      { key: 'currentI', label: '控制电流 I', min: 0.2, max: 2.0, step: 0.1, unit: 'A', showIf: 'sensorType', showIfValue: 2 },
      { key: 'rFixed', label: '分压定值电阻 R0', min: 1000, max: 20000, step: 500, unit: 'Ω', hideIf: 'sensorType', hideIfValue: 2 },
    ],
  },
})
