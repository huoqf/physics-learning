import { useState, useEffect } from 'react'
import { BREAKPOINT } from '@/theme/spacing'

type Tier = 'mobile' | 'tablet' | 'compact' | 'standard'

function getTier(w: number): Tier {
  if (w >= BREAKPOINT.desktop) return 'standard'   // ≥1440
  if (w >= BREAKPOINT.tablet)  return 'compact'     // 1280–1439
  if (w >= BREAKPOINT.mobile)  return 'tablet'       // 1024–1279
  return 'mobile'                                    // < 1024
}

export function useBreakpoint(): Tier {
  const [tier, setTier] = useState<Tier>(() => getTier(window.innerWidth))
  useEffect(() => {
    const el = document.documentElement
    const ro = new ResizeObserver(() => setTier(getTier(el.clientWidth)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return tier
}
