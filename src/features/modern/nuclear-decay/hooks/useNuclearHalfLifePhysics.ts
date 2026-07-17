import { useMemo } from 'react'

export interface DecayingNuclide {
  id: number
  x: number // 网格 X
  y: number // 网格 Y
  tDecay: number // 衰变发生时刻 (s)
  decayed: boolean
}

export interface UseNuclearHalfLifePhysicsParams {
  halfLife: number
  initCount: number
  temperature: number
  pressure: number
  resetTrigger: number
  time: number
}

export interface NuclearHalfLifePhysicsResult {
  nuclides: DecayingNuclide[]
  theoryPoints: { x: number; y: number }[]
  simPoints: { x: number; y: number }[]
  remainingCount: number
}

export function useNuclearHalfLifePhysics(params: UseNuclearHalfLifePhysicsParams): NuclearHalfLifePhysicsResult {
  const {
    halfLife,
    initCount,
    resetTrigger,
    time,
  } = params

  // 1. 生成原子核格点与其对应的随机衰变寿命 (在 resetTrigger 或 initCount 或 halfLife 改变时才重算，确保播放时不被 time 干扰)
  const lifetimes = useMemo(() => {
    const rows = Math.ceil(Math.sqrt(initCount))
    const cols = Math.ceil(initCount / rows)
    
    // 格点物理范围：x 从 -2.0 到 2.0，y 从 -1.2 到 1.2
    const xMin = -2.0
    const xMax = 2.0
    const yMin = -1.2
    const yMax = 1.2
    
    const xStep = cols > 1 ? (xMax - xMin) / (cols - 1) : 0
    const yStep = rows > 1 ? (yMax - yMin) / (rows - 1) : 0

    // 线性同余随机数发生器 (LCG)，确保同一 resetTrigger 种子生成的序列确定，且各触发器生成的序列随机
    let seed = resetTrigger * 12345 + 54321
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }

    const lambda = Math.log(2) / halfLife
    const temp: { id: number; x: number; y: number; tDecay: number }[] = []

    for (let i = 0; i < initCount; i++) {
      const cIdx = i % cols
      const rIdx = Math.floor(i / cols)

      const x = xMin + cIdx * xStep + (random() - 0.5) * 0.1 // 微微抖动微调位置
      const y = yMin + rIdx * yStep + (random() - 0.5) * 0.1

      // 泊松寿命概率公式: tDecay = -ln(1-u)/lambda
      const u = random()
      const tDecay = -Math.log(1 - Math.max(1e-6, u)) / lambda

      temp.push({
        id: i,
        x,
        y,
        tDecay,
      })
    }
    return temp
  }, [initCount, halfLife, resetTrigger])

  // 2. 根据当前的播放时间 time 计算原子核当前是否衰变
  const nuclides = useMemo(() => {
    return lifetimes.map(item => ({
      ...item,
      decayed: time >= item.tDecay,
    }))
  }, [lifetimes, time])

  // 3. 计算当前的剩余原子核个数
  const remainingCount = useMemo(() => {
    return nuclides.filter(n => !n.decayed).length
  }, [nuclides])

  // 4. 生成图表折线点数据 (最大时轴 15s)
  const theoryPoints = useMemo(() => {
    const tMax = 15.0
    const lambda = Math.log(2) / halfLife
    const pts: { x: number; y: number }[] = []
    for (let t = 0; t <= tMax; t += 0.2) {
      pts.push({
        x: t,
        y: initCount * Math.exp(-lambda * t),
      })
    }
    return pts
  }, [initCount, halfLife])

  // 实际模拟折线点数据 (随当前播放时间动态生成)
  const simPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const simSteps = Math.min(100, Math.floor(time / 0.15) + 1)
    for (let i = 0; i < simSteps; i++) {
      const t = i * 0.15
      const rem = lifetimes.filter(n => n.tDecay > t).length
      pts.push({ x: t, y: rem })
    }
    // 末尾点贴合当前帧数据
    if (pts.length > 0 && pts[pts.length - 1].x < time) {
      pts.push({ x: time, y: remainingCount })
    } else if (pts.length === 0) {
      pts.push({ x: 0, y: initCount })
    }
    return pts
  }, [lifetimes, time, remainingCount, initCount])

  return {
    nuclides,
    theoryPoints,
    simPoints,
    remainingCount,
  }
}
