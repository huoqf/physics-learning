import type { DiscoveryStepData } from '@/components/UI/DiscoveryGuide'

const steps: DiscoveryStepData[] = [
  {
    title: '观看运动过程',
    description: '点击播放，观察小车的运动过程。注意速度箭头和位置的变化。',
    hint: '速度箭头的长度代表速度大小，方向代表运动方向。',
  },
  {
    title: '分析频闪数据',
    description: '频闪点每隔 0.5s 记录一次小车的位置，观察数据变化规律。',
    hint: '查看动画区域的频闪数据表格。',
  },
  {
    title: '发现速度规律',
    description: '计算相邻时间间隔的速度差，发现速度变化的规律。',
    hint: 'Δv/Δt 的结果就是加速度 a',
  },
  {
    title: '推导 v = v₀ + at',
    description: '速度随时间均匀变化，由此推导速度公式。',
    hint: '由 Δv = a·t 推导',
  },
  {
    title: '推导 x = v₀t + ½at²',
    description: 'v-t 图像与时间轴围成的面积就是位移。',
    hint: '梯形面积 = (上底 + 下底) × 高 / 2',
  },
  {
    title: '验证 v²-v₀²=2ax',
    description: '消去时间 t，推导速度与位移的关系式。',
    hint: '注意刹车死区！',
  },
]

export default steps
