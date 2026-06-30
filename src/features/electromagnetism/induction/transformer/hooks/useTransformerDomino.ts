import { useEffect, useRef, useState } from 'react'
import { duration } from '@/theme/motion'
import type { ChainStep } from '../model/transformerModel'

export function useTransformerDomino({
  mode,
  triggerValue,
  chainSteps,
}: {
  mode: number
  triggerValue: number
  chainSteps: ChainStep[]
}) {
  const [dominoStep, setDominoStep] = useState(-1)
  const firstRunRef = useRef(true)

  useEffect(() => {
    if (mode !== 1) {
      setDominoStep(-1)
      return
    }
    if (firstRunRef.current) {
      firstRunRef.current = false
      return
    }

    setDominoStep(0)
    const timers: ReturnType<typeof setTimeout>[] = []
    chainSteps.forEach((_, i) => {
      timers.push(setTimeout(() => setDominoStep(i), i * duration.normal))
    })
    timers.push(setTimeout(() => setDominoStep(-1), chainSteps.length * duration.normal + 1000))
    return () => timers.forEach(clearTimeout)
    // triggerValue 是明确动画触发源；chainSteps 随计算值更新但不应单独重触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerValue, mode])

  return dominoStep
}
