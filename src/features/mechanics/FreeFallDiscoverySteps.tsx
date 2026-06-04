import type { DiscoveryStepData } from '@/components/UI/DiscoveryGuide'

const steps: DiscoveryStepData[] = [
  {
    title: '观察自由落体',
    description: '播放动画，观察铁球的下落过程。注意速度箭头动态伸长。',
    hint: '速度箭头的长度代表速度大小。',
  },
  {
    title: '发现速度规律',
    description: '计算相邻时间间隔的速度差，发现速度变化的规律。',
    hint: 'Δv/Δt = g（恒定）',
  },
  {
    title: '推导 v = v₀ + gt',
    description: '速度随时间均匀变化，由此推导速度公式。',
    hint: 'Δv = g·t',
  },
  {
    title: '推导 y = ½gt²',
    description: 'v-t 图像与时间轴围成的面积就是下落的高度。',
    hint: '三角形面积 = 底 × 高 / 2',
  },
  {
    title: '验证 Δy = gT²',
    description: '利用频闪数据，验证相邻相等时间内的位移差是常量。',
    hint: '频闪间隔 T = 0.1s',
  },
]

export default steps
